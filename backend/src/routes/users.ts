import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../utils/errors';
import { tenantRouter, type AuthedRequest } from './helpers';
import { hashPassword, randomToken, revokeAllUserTokens } from '../utils/auth';
import { audit } from '../utils/audit';

const router = tenantRouter();

const TENANT_ROLES = ['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER', 'WHOLESALE_MANAGER', 'ACCOUNTANT'] as const;

router.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const users = await prisma.user.findMany({
      where: { tenantId: req.tenantCtx!.tenantId },
      include: { branches: { include: { branch: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(
      users.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        branches: u.branches.map((ub) => ub.branch),
      }))
    );
  })
);

/** Create a user directly (owner/admin) */
router.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const ctx = req.tenantCtx!;
    if (!['OWNER', 'ADMIN'].includes(ctx.user.role)) throw ApiError.forbidden('Only owners/admins can add users');

    const data = z
      .object({
        username: z.string().min(3).regex(/^[a-zA-Z0-9_.-]+$/),
        password: z.string().min(8),
        fullName: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        role: z.enum(TENANT_ROLES),
        branchIds: z.array(z.string()).default([]),
      })
      .parse(req.body);

    if (data.role === 'OWNER' && ctx.user.role !== 'OWNER') throw ApiError.forbidden('Only an owner can create another owner');

    const dup = await prisma.user.findFirst({ where: { OR: [{ username: data.username }, ...(data.email ? [{ email: data.email }] : [])] } });
    if (dup) throw ApiError.conflict('Username or email already taken');

    if (data.branchIds.length) {
      const branches = await prisma.branch.findMany({ where: { id: { in: data.branchIds }, tenantId: ctx.tenantId } });
      if (branches.length !== data.branchIds.length) throw ApiError.badRequest('Invalid branch in list');
    }

    const user = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash: await hashPassword(data.password),
        fullName: data.fullName,
        email: data.email || undefined,
        phone: data.phone,
        role: data.role,
        tenantId: ctx.tenantId,
        branches: { create: data.branchIds.map((branchId) => ({ branchId })) },
      },
    });
    await audit({ req: req as never, action: 'user.created', entityType: 'User', entityId: user.id, tenantId: ctx.tenantId, detail: { role: data.role } });
    res.status(201).json({ id: user.id, username: user.username, role: user.role });
  })
);

/** Toggle active / change role / reassign branches / reset password */
router.patch(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const ctx = req.tenantCtx!;
    if (!['OWNER', 'ADMIN'].includes(ctx.user.role)) throw ApiError.forbidden('Only owners/admins can manage users');
    const data = z
      .object({
        isActive: z.boolean().optional(),
        role: z.enum(TENANT_ROLES).optional(),
        fullName: z.string().optional(),
        branchIds: z.array(z.string()).optional(),
        newPassword: z.string().min(8).optional(),
      })
      .parse(req.body);

    const user = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: ctx.tenantId } });
    if (!user) throw ApiError.notFound('User not found');
    if (user.role === 'OWNER' && ctx.user.role !== 'OWNER') throw ApiError.forbidden('Only an owner can modify an owner');

    await prisma.$transaction(async (trx) => {
      await trx.user.update({
        where: { id: user.id },
        data: {
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.role ? { role: data.role } : {}),
          ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
          ...(data.newPassword ? { passwordHash: await hashPassword(data.newPassword) } : {}),
        },
      });
      if (data.branchIds) {
        await trx.userBranch.deleteMany({ where: { userId: user.id } });
        if (data.branchIds.length) {
          await trx.userBranch.createMany({ data: data.branchIds.map((branchId) => ({ userId: user.id, branchId })) });
        }
      }
    });

    if (data.isActive === false || data.newPassword) await revokeAllUserTokens(user.id);
    await audit({ req: req as never, action: 'user.updated', entityType: 'User', entityId: user.id, tenantId: ctx.tenantId, detail: { fields: Object.keys(data) } });
    res.json({ ok: true });
  })
);

// ───────────────────────── Invites ─────────────────────────

router.get(
  '/invites',
  asyncHandler(async (req: AuthedRequest, res) => {
    const invites = await prisma.invite.findMany({
      where: { tenantId: req.tenantCtx!.tenantId, usedAt: null, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invites);
  })
);

router.post(
  '/invites',
  asyncHandler(async (req: AuthedRequest, res) => {
    const ctx = req.tenantCtx!;
    if (!['OWNER', 'ADMIN'].includes(ctx.user.role)) throw ApiError.forbidden('Only owners/admins can invite users');
    const data = z
      .object({
        username: z.string().min(3).regex(/^[a-zA-Z0-9_.-]+$/),
        fullName: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        role: z.enum(TENANT_ROLES),
        branchIds: z.array(z.string()).default([]),
        expiresInDays: z.number().int().min(1).max(30).default(7),
      })
      .parse(req.body);

    if (data.role === 'OWNER') throw ApiError.forbidden('Owners cannot be invited — transfer ownership instead');
    const dup = await prisma.user.findFirst({ where: { OR: [{ username: data.username }, ...(data.email ? [{ email: data.email }] : [])] } });
    if (dup) throw ApiError.conflict('Username or email already taken');

    const branches = await prisma.branch.findMany({ where: { id: { in: data.branchIds }, tenantId: ctx.tenantId } });
    if (branches.length !== data.branchIds.length) throw ApiError.badRequest('Invalid branch in list');

    const code = randomToken().slice(0, 12).toUpperCase();
    const invite = await prisma.invite.create({
      data: {
        tenantId: ctx.tenantId,
        code,
        role: data.role,
        branchIds: data.branchIds,
        fullName: data.fullName,
        username: data.username,
        email: data.email || undefined,
        phone: data.phone,
        invitedBy: ctx.user.id,
        expiresAt: new Date(Date.now() + data.expiresInDays * 24 * 3600 * 1000),
      },
    });
    await audit({ req: req as never, action: 'user.invited', entityType: 'Invite', entityId: invite.id, tenantId: ctx.tenantId, detail: { username: data.username, role: data.role } });
    res.status(201).json({ ...invite, inviteUrl: `/accept-invite?code=${code}` });
  })
);

router.delete(
  '/invites/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    await prisma.invite.updateMany({
      where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId },
      data: { expiresAt: new Date() },
    });
    res.json({ ok: true });
  })
);

export default router;
