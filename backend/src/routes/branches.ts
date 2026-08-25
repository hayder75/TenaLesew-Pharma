import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../utils/errors';
import { tenantRouter, type AuthedRequest } from './helpers';
import { effectiveLicense } from '../middleware/auth';
import { audit } from '../utils/audit';

const router = tenantRouter();

/** Branches visible to the current user, with license state + today's sales */
router.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const ctx = req.tenantCtx!;
    const branches = await prisma.branch.findMany({
      where: {
        tenantId: ctx.tenantId,
        isActive: true,
        ...(ctx.branchIds ? { id: { in: ctx.branchIds } } : {}),
      },
      include: { license: true },
      orderBy: { name: 'asc' },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySales = await prisma.sale.groupBy({
      by: ['branchId'],
      where: { tenantId: ctx.tenantId, createdAt: { gte: todayStart }, status: { not: 'REFUNDED' } },
      _sum: { total: true },
      _count: true,
    });
    const salesMap = new Map(todaySales.map((s) => [s.branchId, s]));

    res.json(
      branches.map((b) => {
        const lic = effectiveLicense(b.license);
        return {
          id: b.id,
          name: b.name,
          location: b.location,
          phone: b.phone,
          license: { status: lic.status, paidUntil: lic.paidUntil, trialEndsAt: lic.trialEndsAt },
          todaySales: { total: salesMap.get(b.id)?._sum.total || 0, count: salesMap.get(b.id)?._count || 0 },
        };
      })
    );
  })
);

/** Owner/admin creates a branch (14-day trial license auto-attached) */
router.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const ctx = req.tenantCtx!;
    if (!['OWNER', 'ADMIN'].includes(ctx.user.role)) throw ApiError.forbidden('Only owners/admins can add branches');
    const data = z
      .object({ name: z.string().min(2), location: z.string().optional(), phone: z.string().optional() })
      .parse(req.body);

    const branch = await prisma.branch.create({
      data: {
        tenantId: ctx.tenantId,
        ...data,
        license: { create: { status: 'TRIAL', trialEndsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000) } },
      },
      include: { license: true },
    });
    await audit({ req: req as never, action: 'branch.created', entityType: 'Branch', entityId: branch.id, tenantId: ctx.tenantId, detail: { name: branch.name } });
    res.status(201).json(branch);
  })
);

export default router;
