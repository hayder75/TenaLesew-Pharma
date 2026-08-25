import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { asyncHandler, ApiError } from '../utils/errors';
import { tenantRouter, resolveBranch, type AuthedRequest } from './helpers';
import { round2, dateRangeFromQuery } from '../utils/helpers';

const router = tenantRouter();

const branchScope = (req: AuthedRequest, branchId?: string) => {
  const allowed = req.tenantCtx!.branchIds;
  return {
    tenantId: req.tenantCtx!.tenantId,
    ...(branchId ? { branchId } : {}),
    ...(allowed ? { branchId: { in: allowed } } : {}),
  };
};

/** Sales report: totals + by-day series + top products */
router.get(
  '/sales',
  asyncHandler(async (req: AuthedRequest, res) => {
    const range = dateRangeFromQuery(req.query.range as string);
    const branchId = req.query.branchId as string | undefined;
    if (branchId) await resolveBranch(req.tenantCtx!, branchId);
    const where = { ...branchScope(req, branchId), createdAt: { gte: range.start, lte: range.end }, status: { not: 'REFUNDED' as const } };
    const branchCond = branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty;
    const allowedCond = req.tenantCtx!.branchIds ? Prisma.sql`AND "branchId" IN (${Prisma.join(req.tenantCtx!.branchIds)})` : Prisma.empty;

    const [agg, byDay, topProducts, byCategory] = await Promise.all([
      prisma.sale.aggregate({ where, _sum: { total: true, discountTotal: true }, _count: true }),
      prisma.$queryRaw<{ day: Date; total: number; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") as day, SUM(total) as total, COUNT(*) as count
        FROM "Sale"
        WHERE "tenantId" = ${req.tenantCtx!.tenantId}
          AND "createdAt" >= ${range.start} AND "createdAt" <= ${range.end}
          AND status != 'REFUNDED'
          ${branchCond}
          ${allowedCond}
        GROUP BY 1 ORDER BY 1 ASC LIMIT 90`,
      prisma.saleItem.groupBy({
        by: ['productName'],
        where: { sale: where },
        _sum: { qty: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 10,
      }),
      prisma.$queryRaw<{ category: string | null; total: number }[]>`
        SELECT COALESCE(c.name, 'Uncategorized') as category, SUM(si."lineTotal") as total
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        LEFT JOIN "Product" p ON p.id = si."productId"
        LEFT JOIN "Category" c ON c.id = p."categoryId"
        WHERE s."tenantId" = ${req.tenantCtx!.tenantId}
          AND s."createdAt" >= ${range.start} AND s."createdAt" <= ${range.end}
          AND s.status != 'REFUNDED'
        GROUP BY 1 ORDER BY total DESC LIMIT 12`,
    ]);

    res.json({
      total: round2(agg._sum.total || 0),
      discounts: round2(agg._sum.discountTotal || 0),
      count: agg._count,
      average: agg._count ? round2((agg._sum.total || 0) / agg._count) : 0,
      byDay: byDay.map((d) => ({ day: d.day, total: round2(d.total), count: Number(d.count) })),
      topProducts: topProducts.map((p) => ({ name: p.productName, qty: p._sum.qty, total: round2(p._sum.lineTotal || 0) })),
      byCategory: byCategory.map((c) => ({ category: c.category, total: round2(c.total) })),
    });
  })
);

/** Inventory report: valuation per branch */
router.get(
  '/inventory',
  asyncHandler(async (req: AuthedRequest, res) => {
    const branchId = req.query.branchId as string | undefined;
    if (branchId) await resolveBranch(req.tenantCtx!, branchId);
    const scope = branchScope(req, branchId);
    const batches = await prisma.batch.findMany({
      where: { ...scope, qtyOnHand: { gt: 0 } },
      include: { product: { select: { name: true, unitPrice: true } } },
    });

    const totalUnits = batches.reduce((s, b) => s + b.qtyOnHand, 0);
    const totalCost = batches.reduce((s, b) => s + b.qtyOnHand * b.costPrice, 0);
    const totalRetail = batches.reduce((s, b) => s + b.qtyOnHand * (b.product?.unitPrice || 0), 0);

    const byBranch = new Map<string, { cost: number; retail: number; units: number }>();
    for (const b of batches) {
      const e = byBranch.get(b.branchId) || { cost: 0, retail: 0, units: 0 };
      e.cost += b.qtyOnHand * b.costPrice;
      e.retail += b.qtyOnHand * (b.product?.unitPrice || 0);
      e.units += b.qtyOnHand;
      byBranch.set(b.branchId, e);
    }

    res.json({
      totalUnits: Math.round(totalUnits * 100) / 100,
      totalCost: round2(totalCost),
      totalRetail: round2(totalRetail),
      expectedMargin: round2(totalRetail - totalCost),
      byBranch: Array.from(byBranch.entries()).map(([id, v]) => ({ branchId: id, ...v, cost: round2(v.cost), retail: round2(v.retail), units: Math.round(v.units * 100) / 100 })),
    });
  })
);

/** Expiry report */
router.get(
  '/expiry',
  asyncHandler(async (req: AuthedRequest, res) => {
    const branchId = req.query.branchId as string | undefined;
    if (branchId) await resolveBranch(req.tenantCtx!, branchId);
    const days = Math.min(365, parseInt(req.query.days as string) || 90);
    const batches = await prisma.batch.findMany({
      where: {
        ...branchScope(req, branchId),
        qtyOnHand: { gt: 0 },
        expiryDate: { lte: new Date(Date.now() + days * 24 * 3600 * 1000) },
      },
      include: {
        product: { select: { name: true, unitPrice: true } },
        branch: { select: { name: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
    const now = new Date();
    res.json({
      expired: batches.filter((b) => b.expiryDate < now).map(mapBatch),
      soon: batches.filter((b) => b.expiryDate >= now).map(mapBatch),
    });
    function mapBatch(b: (typeof batches)[number]) {
      return {
        batchId: b.id,
        product: b.product.name,
        branch: b.branch.name,
        batchNo: b.batchNo,
        expiryDate: b.expiryDate,
        qty: b.qtyOnHand,
        valueAtCost: round2(b.qtyOnHand * b.costPrice),
      };
    }
  })
);

/** Dead stock: no sales in the last N days */
router.get(
  '/dead-stock',
  asyncHandler(async (req: AuthedRequest, res) => {
    const branchId = req.query.branchId as string | undefined;
    if (branchId) await resolveBranch(req.tenantCtx!, branchId);
    const days = Math.min(365, parseInt(req.query.days as string) || 30);
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    const batches = await prisma.batch.findMany({
      where: { ...branchScope(req, branchId), qtyOnHand: { gt: 0 } },
      include: { product: { select: { name: true } }, branch: { select: { name: true } } },
    });
    const soldProductIds = new Set(
      (
        await prisma.saleItem.findMany({
          where: { sale: { tenantId: req.tenantCtx!.tenantId, createdAt: { gte: since } } },
          select: { productId: true },
          distinct: ['productId'],
        })
      ).map((s) => s.productId)
    );

    const dead = batches.filter((b) => !soldProductIds.has(b.productId));
    const byProduct = new Map<string, { name: string; branch: string; qty: number; value: number }>();
    for (const b of dead) {
      const key = `${b.productId}:${b.branchId}`;
      const e = byProduct.get(key) || { name: b.product.name, branch: b.branch.name, qty: 0, value: 0 };
      e.qty += b.qtyOnHand;
      e.value += b.qtyOnHand * b.costPrice;
      byProduct.set(key, e);
    }
    res.json(
      Array.from(byProduct.values())
        .map((e) => ({ ...e, qty: Math.round(e.qty * 100) / 100, value: round2(e.value) }))
        .sort((a, b) => b.value - a.value)
    );
  })
);

/** Shift / variance report */
router.get(
  '/shifts',
  asyncHandler(async (req: AuthedRequest, res) => {
    const range = dateRangeFromQuery(req.query.range as string);
    const shifts = await prisma.shift.findMany({
      where: {
        ...branchScope(req, req.query.branchId as string | undefined),
        status: 'CLOSED',
        closedAt: { gte: range.start, lte: range.end },
      },
      include: { cashier: { select: { username: true } }, branch: { select: { name: true } } },
      orderBy: { closedAt: 'desc' },
      take: 100,
    });
    res.json(
      shifts.map((s) => ({
        id: s.id,
        branch: s.branch.name,
        cashier: s.cashier.username,
        openedAt: s.openedAt,
        closedAt: s.closedAt,
        openingFloat: s.openingFloat,
        expectedCash: s.expectedCash,
        countedCash: s.countedCash,
        variance: s.variance,
      }))
    );
  })
);

export default router;
