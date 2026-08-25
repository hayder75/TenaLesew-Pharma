import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../utils/errors';
import { tenantRouter, gateWrite, requireTenantRole, type AuthedRequest } from './helpers';
import { audit } from '../utils/audit';

const router = tenantRouter();
const MANAGE_ROLES = ['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER'] as const;

const supplierSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  tin: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const search = (req.query.search as string)?.trim();
    const suppliers = await prisma.supplier.findMany({
      where: {
        tenantId: req.tenantCtx!.tenantId,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: {
        _count: { select: { pos: true } },
        grns: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });
    // outstanding payable = value received on GRNs (simplified: sum of GRN totals per supplier)
    const grnTotals = await prisma.goodsReceipt.groupBy({
      by: ['supplierId'],
      where: { tenantId: req.tenantCtx!.tenantId },
      _sum: { total: true },
    });
    const totalsMap = new Map(grnTotals.map((g) => [g.supplierId, g._sum.total || 0]));
    res.json(
      suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        email: s.email,
        address: s.address,
        tin: s.tin,
        isActive: s.isActive,
        poCount: s._count.pos,
        lastDelivery: s.grns[0]?.createdAt || null,
        totalPurchased: totalsMap.get(s.id) || 0,
      }))
    );
  })
);

router.post(
  '/',
  requireTenantRole(...MANAGE_ROLES),
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({ data: { ...data, email: data.email || undefined, tenantId: req.tenantCtx!.tenantId } });
    await audit({ req: req as never, action: 'supplier.created', entityType: 'Supplier', entityId: supplier.id, tenantId: req.tenantCtx!.tenantId, detail: { name: supplier.name } });
    res.status(201).json(supplier);
  })
);

router.patch(
  '/:id',
  requireTenantRole(...MANAGE_ROLES),
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = supplierSchema.partial().parse(req.body);
    const existing = await prisma.supplier.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!existing) throw ApiError.notFound('Supplier not found');
    const supplier = await prisma.supplier.update({ where: { id: existing.id }, data });
    await audit({ req: req as never, action: 'supplier.updated', entityType: 'Supplier', entityId: supplier.id, tenantId: req.tenantCtx!.tenantId });
    res.json(supplier);
  })
);

router.delete(
  '/:id',
  requireTenantRole(...MANAGE_ROLES),
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.supplier.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!existing) throw ApiError.notFound('Supplier not found');
    await prisma.supplier.update({ where: { id: existing.id }, data: { isActive: false } });
    await audit({ req: req as never, action: 'supplier.deactivated', entityType: 'Supplier', entityId: existing.id, tenantId: req.tenantCtx!.tenantId });
    res.json({ ok: true });
  })
);

export default router;
