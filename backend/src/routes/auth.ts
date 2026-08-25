import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../utils/errors';
import {
  hashPassword,
  issueRefreshToken,
  randomToken,
  revokeAllUserTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
  verifyPassword,
  hashToken,
} from '../utils/auth';
import { authenticate, effectiveLicense, type AuthedRequest } from '../middleware/auth';
import { audit } from '../utils/audit';
import { rateLimit } from '../middleware/error';

const router = Router();

// simple in-memory login lockout
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const loginUser = async (identifier: string, password: string, ip?: string) => {
  const key = identifier.toLowerCase();
  const attempt = loginAttempts.get(key);
  if (attempt && attempt.lockedUntil > Date.now()) {
    const mins = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
    throw new ApiError(429, 'LOCKED', `Too many failed attempts — try again in ${mins} min`);
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
    include: { tenant: true },
  });

  const valid = user?.isActive ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    const count = (attempt?.count || 0) + 1;
    loginAttempts.set(key, {
      count,
      lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCK_MINUTES * 60 * 1000 : 0,
    });
    throw ApiError.unauthorized('Invalid username or password');
  }
  loginAttempts.delete(key);

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId,
  });
  const refresh = await issueRefreshToken(user.id);

  await audit({
    req: { ip, user: { sub: user.id, username: user.username } } as never,
    action: 'auth.login',
    entityType: 'User',
    entityId: user.id,
    tenantId: user.tenantId,
  });

  return { user, accessToken, refresh };
};

const buildSessionResponse = async (userId: string, accessToken: string, refresh: string, impersonatedBy?: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenant: { include: { branches: { where: { isActive: true }, include: { license: true }, orderBy: { name: 'asc' } } } },
      branches: { select: { branchId: true } },
    },
  });
  if (!user) throw ApiError.notFound('User not found');

  const allBranches = user.tenant?.branches || [];
  const assignedIds = new Set(user.branches.map((b) => b.branchId));
  const tenantWide = ['OWNER', 'ADMIN', 'WHOLESALE_MANAGER', 'ACCOUNTANT'].includes(user.role);

  const branches = allBranches
    .filter((b) => tenantWide || assignedIds.has(b.id))
    .map((b) => {
      const lic = effectiveLicense(b.license);
      return {
        id: b.id,
        name: b.name,
        location: b.location,
        license: { status: lic.status, paidUntil: lic.paidUntil, trialEndsAt: lic.trialEndsAt },
      };
    });

  return {
    accessToken,
    refreshToken: refresh,
    impersonated: !!impersonatedBy,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    tenant: user.tenant
      ? {
          id: user.tenant.id,
          name: user.tenant.name,
          status: user.tenant.status,
          settings: user.tenant.settings,
        }
      : null,
    branches,
  };
};

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post(
  '/login',
  rateLimit(20, 60_000),
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const { user, accessToken, refresh } = await loginUser(username, password, req.ip);
    res.json(await buildSessionResponse(user.id, accessToken, refresh));
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(10) }).parse(req.body);
    const { user, refresh } = await rotateRefreshToken(refreshToken);
    const accessToken = signAccessToken({ sub: user.id, role: user.role, tenantId: user.tenantId });
    res.json(await buildSessionResponse(user.id, accessToken, refresh));
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(10) }).parse(req.body);
    await revokeRefreshToken(refreshToken).catch(() => undefined);
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw ApiError.notFound('User not found');
    const refresh = await issueRefreshToken(user.id);
    res.json(await buildSessionResponse(user.id, signAccessToken({ sub: user.id, role: user.role, tenantId: user.tenantId, impersonatedBy: req.auth.impersonatedBy }), refresh, req.auth.impersonatedBy));
  })
);

router.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = z
      .object({ currentPassword: z.string().min(1), newPassword: z.string().min(8, 'New password must be at least 8 characters') })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw ApiError.badRequest('Current password is incorrect');
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    await revokeAllUserTokens(user.id);
    const refresh = await issueRefreshToken(user.id);
    res.json(await buildSessionResponse(user.id, signAccessToken({ sub: user.id, role: user.role, tenantId: user.tenantId }), refresh));
  })
);

// No email service yet: the reset token is returned directly (dev-friendly, replaced by email later)
router.post(
  '/forgot-password',
  rateLimit(10, 60_000),
  asyncHandler(async (req, res) => {
    const { username } = z.object({ username: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findFirst({ where: { OR: [{ username }, { email: username }] } });
    if (!user) return res.json({ ok: true }); // don't reveal existence
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
    const raw = randomToken();
    await prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    res.json({ ok: true, resetToken: raw }); // TODO: email this instead
  })
);

router.post(
  '/reset-password',
  rateLimit(10, 60_000),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = z
      .object({ token: z.string().min(10), newPassword: z.string().min(8, 'Password must be at least 8 characters') })
      .parse(req.body);
    const record = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw ApiError.badRequest('Reset link is invalid or expired');
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(newPassword) } }),
      prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    await revokeAllUserTokens(record.userId);
    res.json({ ok: true });
  })
);

router.post(
  '/accept-invite',
  asyncHandler(async (req, res) => {
    const { code, password } = z
      .object({ code: z.string().min(6), password: z.string().min(8, 'Password must be at least 8 characters') })
      .parse(req.body);
    const invite = await prisma.invite.findUnique({ where: { code } });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      throw ApiError.badRequest('Invitation is invalid or expired');
    }
    const existing = await prisma.user.findFirst({ where: { OR: [{ username: invite.username }, invite.email ? { email: invite.email } : {}] } });
    if (existing) throw ApiError.conflict('An account with this username/email already exists');

    const user = await prisma.user.create({
      data: {
        username: invite.username,
        email: invite.email,
        phone: invite.phone,
        fullName: invite.fullName,
        passwordHash: await hashPassword(password),
        role: invite.role,
        tenantId: invite.tenantId,
        branches: { create: invite.branchIds.map((branchId) => ({ branchId })) },
      },
    });
    await prisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    await audit({
      req: req as never,
      action: 'user.accept_invite',
      entityType: 'User',
      entityId: user.id,
      tenantId: invite.tenantId,
      detail: { role: invite.role },
    });

    const accessToken = signAccessToken({ sub: user.id, role: user.role, tenantId: user.tenantId });
    const refresh = await issueRefreshToken(user.id);
    res.status(201).json(await buildSessionResponse(user.id, accessToken, refresh));
  })
);

export default router;
