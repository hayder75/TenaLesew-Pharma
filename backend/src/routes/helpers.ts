import { Router, type Request } from 'express';
import { prisma } from '../db';
import { ApiError } from '../utils/errors';
import {
  authenticate,
  requireTenant,
  assertBranchAccess,
  gateWrite,
  type AuthedRequest,
  type TenantCtx,
} from '../middleware/auth';

export type { AuthedRequest };
import type { MovementType } from '@prisma/client';

/** Router pre-wired with authenticate + requireTenant */
export const tenantRouter = () => {
  const router = Router();
  router.use(authenticate, requireTenant);
  return router;
};

export { gateWrite, assertBranchAccess };

/** Role check inside a tenant (OWNER/ADMIN always allowed when included) */
export const requireTenantRole =
  (...roles: string[]) =>
  (req: Request, _res: unknown, next: (err?: unknown) => void) => {
    const role = (req as AuthedRequest).tenantCtx?.user.role;
    if (!role) return next(ApiError.forbidden('No tenant context'));
    if (!roles.includes(role)) return next(ApiError.forbidden('Your role cannot perform this action'));
    next();
  };

/** Validates a branch belongs to the tenant and the user can access it */
export const resolveBranch = async (ctx: TenantCtx, branchId: string | undefined) => {
  if (!branchId) throw ApiError.badRequest('branchId is required');
  assertBranchAccess(ctx, branchId);
  const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId: ctx.tenantId, isActive: true } });
  if (!branch) throw ApiError.notFound('Branch not found');
  return branch;
};

interface MovementInput {
  tenantId: string;
  branchId: string;
  productId: string;
  batchId?: string | null;
  type: MovementType;
  qtyDelta: number;
  qtyAfter: number;
  reason?: string;
  refType?: string;
  refId?: string;
  userId?: string;
  userName?: string;
}

/** Prisma transaction client type (loose — transaction code handles its own shapes) */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Tx = {
  batch: {
    findFirst: (args: object) => Promise<any>;
    findMany: (args: object) => Promise<any[]>;
    update: (args: object) => Promise<any>;
    create: (args: object) => Promise<any>;
  };
  stockMovement: { create: (args: object) => Promise<any> };
};

/** Records a stock movement row */
export const recordMovement = (tx: Tx, input: MovementInput) =>
  tx.stockMovement.create({
    data: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      productId: input.productId,
      batchId: input.batchId ?? null,
      type: input.type,
      qtyDelta: input.qtyDelta,
      qtyAfter: input.qtyAfter,
      reason: input.reason,
      refType: input.refType,
      refId: input.refId,
      userId: input.userId,
      userName: input.userName,
    },
  });

export interface FefoAllocation {
  batchId: string;
  qty: number;
  costPrice: number;
}

/**
 * Consumes `qty` of a product at a branch using FEFO (first-expired-first-out).
 * Throws if insufficient stock. Returns the batch allocations.
 */
export const consumeFEFO = async (
  tx: Tx,
  opts: {
    tenantId: string;
    branchId: string;
    productId: string;
    qty: number;
    userId?: string;
    userName?: string;
    refType?: string;
    refId?: string;
  }
): Promise<FefoAllocation[]> => {
  const batches = await tx.batch.findMany({
    where: { tenantId: opts.tenantId, branchId: opts.branchId, productId: opts.productId, qtyOnHand: { gt: 0 } },
    orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
  });

  const total = batches.reduce((s, b) => s + b.qtyOnHand, 0);
  if (total + 1e-9 < opts.qty) {
    throw ApiError.badRequest(`Insufficient stock — only ${roundQty(total)} left for this product at this branch`);
  }

  let remaining = opts.qty;
  const allocations: FefoAllocation[] = [];
  for (const batch of batches) {
    if (remaining <= 1e-9) break;
    const take = Math.min(batch.qtyOnHand, remaining);
    const newQty = batch.qtyOnHand - take;
    await tx.batch.update({ where: { id: batch.id }, data: { qtyOnHand: newQty } });
    await recordMovement(tx, {
      tenantId: opts.tenantId,
      branchId: opts.branchId,
      productId: opts.productId,
      batchId: batch.id,
      type: 'SALE',
      qtyDelta: -take,
      qtyAfter: newQty,
      refType: opts.refType,
      refId: opts.refId,
      userId: opts.userId,
      userName: opts.userName,
    });
    allocations.push({ batchId: batch.id, qty: take, costPrice: batch.costPrice });
    remaining -= take;
  }
  return allocations;
};

export const roundQty = (n: number) => Math.round(n * 100) / 100;
