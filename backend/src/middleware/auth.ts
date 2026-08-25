import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db';
import { verifyAccessToken, type Role, type TokenPayload } from '../utils/auth';
import { ApiError } from '../utils/errors';

export interface TenantCtx {
  tenantId: string;
  /** null = all branches allowed (owner-level roles) */
  branchIds: string[] | null;
  user: {
    id: string;
    username: string;
    fullName: string | null;
    role: Role;
  };
  impersonatedBy?: string;
}

export interface AuthedRequest extends Request {
  auth: TokenPayload & { username: string };
  user?: {
    id: string;
    username: string;
    fullName: string | null;
    role: Role;
    tenantId: string | null;
    isActive: boolean;
  };
  tenantCtx?: TenantCtx;
}

/** Roles that see every branch in their tenant */
const TENANT_WIDE_ROLES: Role[] = ['OWNER', 'ADMIN', 'WHOLESALE_MANAGER', 'ACCOUNTANT'];

/** Verifies the JWT and loads a fresh user record */
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const ar = req as AuthedRequest;
    const header = ar.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized();
    const payload = verifyAccessToken(header.slice(7));

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw ApiError.unauthorized('Account disabled or removed');

    ar.auth = { ...payload, username: user.username };
    ar.user = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
      isActive: user.isActive,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/** Requires one of the given roles (platform-level check) */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as AuthedRequest).user;
    if (!user) return next(ApiError.unauthorized());
    if (!roles.includes(user.role)) {
      return next(ApiError.forbidden('Your role does not have access to this resource'));
    }
    next();
  };

/** Loads tenant context: tenant must be active + resolves allowed branches */
export const requireTenant = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const ar = req as AuthedRequest;
    const user = ar.user!;
    if (!user.tenantId) throw ApiError.forbidden('This account is not part of a pharmacy');

    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant) throw ApiError.notFound('Pharmacy not found');

    const assignments = await prisma.userBranch.findMany({
      where: { userId: user.id },
      select: { branchId: true },
    });

    ar.tenantCtx = {
      tenantId: tenant.id,
      branchIds: TENANT_WIDE_ROLES.includes(user.role) ? null : assignments.map((a) => a.branchId),
      user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role },
      impersonatedBy: ar.auth?.impersonatedBy,
    };

    // Suspended tenants: reads allowed, writes blocked (gateWrite enforces too)
    if (tenant.status === 'SUSPENDED' && !['GET', 'HEAD', 'OPTIONS'].includes(ar.method)) {
      throw ApiError.forbidden('This pharmacy account is suspended — contact the platform', 'TENANT_SUSPENDED');
    }
    next();
  } catch (err) {
    next(err);
  }
};

/** Ensures the user may access the given branch (if branch-scoped) */
export const assertBranchAccess = (ctx: TenantCtx, branchId: string) => {
  if (ctx.branchIds !== null && !ctx.branchIds.includes(branchId)) {
    throw ApiError.forbidden('You do not have access to this branch');
  }
};

/** Extracts a branchId from body/params/query */
export const branchIdFrom = (req: AuthedRequest): string | undefined =>
  req.body?.branchId || req.params.branchId || (req.query.branchId as string) || undefined;

/** Computes effective license state for a branch (lazy DB sync) */
export const effectiveLicense = (
  license: { status: string; trialEndsAt: Date | null; paidUntil: Date | null } | null
): { status: 'TRIAL' | 'ACTIVE' | 'GRACE' | 'EXPIRED'; paidUntil: Date | null; trialEndsAt: Date | null } => {
  const now = new Date();
  if (!license) return { status: 'EXPIRED', paidUntil: null, trialEndsAt: null };
  if (license.paidUntil && license.paidUntil >= now) return { status: 'ACTIVE', paidUntil: license.paidUntil, trialEndsAt: license.trialEndsAt };
  if (license.trialEndsAt && license.trialEndsAt >= now) return { status: 'TRIAL', paidUntil: license.paidUntil, trialEndsAt: license.trialEndsAt };
  if (license.paidUntil) {
    const graceEnd = new Date(license.paidUntil);
    graceEnd.setDate(graceEnd.getDate() + 7);
    if (graceEnd >= now) return { status: 'GRACE', paidUntil: license.paidUntil, trialEndsAt: license.trialEndsAt };
  }
  return { status: 'EXPIRED', paidUntil: license.paidUntil, trialEndsAt: license.trialEndsAt };
};

/** Blocks writes when the branch license is expired */
export const gateWrite = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const ar = req as AuthedRequest;
    if (['GET', 'HEAD', 'OPTIONS'].includes(ar.method)) return next();
    const branchId = branchIdFrom(ar);
    if (!branchId) return next();

    assertBranchAccess(ar.tenantCtx!, branchId);

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId: ar.tenantCtx!.tenantId },
      include: { license: true },
    });
    if (!branch) throw ApiError.notFound('Branch not found');

    const state = effectiveLicense(branch.license);
    if (state.status === 'EXPIRED') {
      throw ApiError.licenseExpired();
    }
    // lazily persist status changes
    if (branch.license && branch.license.status !== state.status) {
      await prisma.branchLicense.update({
        where: { branchId },
        data: { status: state.status },
      }).catch(() => undefined);
    }
    next();
  } catch (err) {
    next(err);
  }
};
