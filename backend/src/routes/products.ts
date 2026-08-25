import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../utils/errors';
import { tenantRouter, gateWrite, requireTenantRole, type AuthedRequest } from './helpers';
import { audit } from '../utils/audit';
import { getPagination, paged } from '../utils/helpers';

const router = tenantRouter();
const MANAGE_ROLES = ['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER'] as const;

// ───────────────────────── Categories ─────────────────────────

router.get(
  '/categories',
  asyncHandler(async (req: AuthedRequest, res) => {
    const categories = await prisma.category.findMany({
      where: { tenantId: req.tenantCtx!.tenantId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(categories.map((c) => ({ id: c.id, name: c.name, productCount: c._count.products })));
  })
);

router.post(
  '/categories',
  requireTenantRole(...MANAGE_ROLES),
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { name } = z.object({ name: z.string().min(1).max(60) }).parse(req.body);
    const exists = await prisma.category.findUnique({
      where: { tenantId_name: { tenantId: req.tenantCtx!.tenantId, name } },
    });
    if (exists) throw ApiError.conflict('Category already exists');
    const category = await prisma.category.create({ data: { tenantId: req.tenantCtx!.tenantId, name } });
    res.status(201).json(category);
  })
);

// ───────────────────────── Products ─────────────────────────

const productSchema = z.object({
  name: z.string().min(1).max(200),
  genericName: z.string().optional(),
  strength: z.string().optional(),
  manufacturer: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  packSize: z.number().int().positive().optional().nullable(),
  barcode: z.string().optional(),
  unitPrice: z.number().positive(),
  costPrice: z.number().min(0).default(0),
  wholesalePrice: z.number().positive().optional().nullable(),
  reorderLevel: z.number().int().min(0).default(10),
});

router.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = getPagination(req, 100);
    const search = (req.query.search as string)?.trim();
    const categoryId = req.query.categoryId as string | undefined;
    const where = {
      tenantId: req.tenantCtx!.tenantId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { genericName: { contains: search, mode: 'insensitive' as const } },
              { barcode: { contains: search } },
            ],
          }
        : {}),
      ...(categoryId ? { categoryId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { name: 'asc' },
        skip: page.skip,
        take: page.limit,
      }),
      prisma.product.count({ where }),
    ]);
    res.json(paged(items, total, page));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId },
      include: { category: true },
    });
    if (!product) throw ApiError.notFound('Product not found');

    // per-branch stock summary (only branches the user can see)
    const allowed = req.tenantCtx!.branchIds;
    const batches = await prisma.batch.groupBy({
      by: ['branchId'],
      where: {
        productId: product.id,
        tenantId: req.tenantCtx!.tenantId,
        qtyOnHand: { gt: 0 },
        ...(allowed ? { branchId: { in: allowed } } : {}),
      },
      _sum: { qtyOnHand: true },
    });
    res.json({ ...product, stockByBranch: batches.map((b) => ({ branchId: b.branchId, qty: b._sum.qtyOnHand || 0 })) });
  })
);

router.post(
  '/',
  requireTenantRole(...MANAGE_ROLES),
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = productSchema.parse(req.body);
    if (data.categoryId) {
      const cat = await prisma.category.findFirst({ where: { id: data.categoryId, tenantId: req.tenantCtx!.tenantId } });
      if (!cat) throw ApiError.badRequest('Invalid category');
    }
    const product = await prisma.product.create({ data: { ...data, tenantId: req.tenantCtx!.tenantId }, include: { category: true } });
    await audit({ req: req as never, action: 'product.created', entityType: 'Product', entityId: product.id, tenantId: req.tenantCtx!.tenantId, detail: { name: product.name } });
    res.status(201).json(product);
  })
);

router.patch(
  '/:id',
  requireTenantRole(...MANAGE_ROLES),
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = productSchema.partial().parse(req.body);
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!existing) throw ApiError.notFound('Product not found');
    const product = await prisma.product.update({ where: { id: existing.id }, data, include: { category: true } });
    await audit({ req: req as never, action: 'product.updated', entityType: 'Product', entityId: product.id, tenantId: req.tenantCtx!.tenantId, detail: { changes: Object.keys(data) } });
    res.json(product);
  })
);

router.delete(
  '/:id',
  requireTenantRole(...MANAGE_ROLES),
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!existing) throw ApiError.notFound('Product not found');
    // soft-delete to preserve history
    await prisma.product.update({ where: { id: existing.id }, data: { isActive: false } });
    await audit({ req: req as never, action: 'product.deactivated', entityType: 'Product', entityId: existing.id, tenantId: req.tenantCtx!.tenantId });
    res.json({ ok: true });
  })
);

/** Stock lookup across accessible branches for a product (batches) */
router.get(
  '/:id/batches',
  asyncHandler(async (req: AuthedRequest, res) => {
    const branchId = req.query.branchId as string | undefined;
    const allowed = req.tenantCtx!.branchIds;
    const product = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!product) throw ApiError.notFound('Product not found');
    const batches = await prisma.batch.findMany({
      where: {
        productId: product.id,
        tenantId: req.tenantCtx!.tenantId,
        qtyOnHand: { gt: 0 },
        ...(branchId ? { branchId } : {}),
        ...(allowed ? { branchId: { in: allowed } } : {}),
      },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
    res.json(batches);
  })
);

export default router;
