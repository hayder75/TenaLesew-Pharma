import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../utils/errors';
import { tenantRouter, gateWrite, resolveBranch, type AuthedRequest } from './helpers';
import { audit } from '../utils/audit';
import { getPagination, paged, round2, dateRangeFromQuery, todayStart } from '../utils/helpers';

const router = tenantRouter();

const branchScope = (req: AuthedRequest) => {
  const allowed = req.tenantCtx!.branchIds;
  return allowed ? { in: allowed } : undefined;
};

router.get(
  '/summary',
  asyncHandler(async (req: AuthedRequest, res) => {
    const range = dateRangeFromQuery(req.query.range as string);
    const branchId = req.query.branchId as string | undefined;
    if (branchId) await resolveBranch(req.tenantCtx!, branchId);
    const saleWhere = {
      tenantId: req.tenantCtx!.tenantId,
      createdAt: { gte: range.start, lte: range.end },
      status: { not: 'REFUNDED' as const },
      ...(branchId ? { branchId } : {}),
      ...(req.tenantCtx!.branchIds ? { branchId: { in: req.tenantCtx!.branchIds } } : {}),
    };
    const expenseWhere = {
      tenantId: req.tenantCtx!.tenantId,
      spentAt: { gte: range.start, lte: range.end },
      ...(branchId ? { branchId } : {}),
      ...(req.tenantCtx!.branchIds ? { branchId: { in: req.tenantCtx!.branchIds } } : {}),
    };

    const [sales, refunds, expenses, creditOutstanding] = await Promise.all([
      prisma.sale.aggregate({ where: saleWhere, _sum: { total: true, discountTotal: true }, _count: true }),
      prisma.saleRefund.aggregate({
        where: { sale: { tenantId: req.tenantCtx!.tenantId, createdAt: { gte: range.start, lte: range.end }, ...(branchId ? { branchId } : {}) } },
        _sum: { total: true },
      }),
      prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
      prisma.customer.aggregate({ where: { tenantId: req.tenantCtx!.tenantId }, _sum: { creditBalance: true } }),
    ]);

    // income by payment method
    const byMethod = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: saleWhere,
      _sum: { total: true },
      _count: true,
    });

    const revenue = round2(sales._sum.total || 0);
    const expenseTotal = round2(expenses._sum.amount || 0);
    res.json({
      revenue,
      discounts: round2(sales._sum.discountTotal || 0),
      refunds: round2(refunds._sum.total || 0),
      expenses: expenseTotal,
      net: round2(revenue - (refunds._sum.total || 0) - expenseTotal),
      saleCount: sales._count,
      creditOutstanding: round2(creditOutstanding._sum.creditBalance || 0),
      byMethod: byMethod.map((m) => ({ method: m.paymentMethod, total: round2(m._sum.total || 0), count: m._count })),
    });
  })
);

// ───────────────────────── Expenses ─────────────────────────

router.get(
  '/expenses',
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = getPagination(req, 50);
    const branchId = req.query.branchId as string | undefined;
    const where = {
      tenantId: req.tenantCtx!.tenantId,
      ...(branchId ? { branchId } : {}),
      ...(req.tenantCtx!.branchIds ? { branchId: { in: req.tenantCtx!.branchIds } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: { spentAt: 'desc' }, skip: page.skip, take: page.limit }),
      prisma.expense.count({ where }),
    ]);
    res.json(paged(items, total, page));
  })
);

router.post(
  '/expenses',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT'].includes(req.tenantCtx!.user.role)) {
      throw ApiError.forbidden('Only admins/accountants can record expenses');
    }
    const data = z
      .object({
        branchId: z.string().optional().nullable(),
        category: z.string().min(1),
        amount: z.number().positive(),
        description: z.string().optional(),
        spentAt: z.string().optional(),
      })
      .parse(req.body);
    if (data.branchId) await resolveBranch(req.tenantCtx!, data.branchId);

    const expense = await prisma.expense.create({
      data: {
        tenantId: req.tenantCtx!.tenantId,
        branchId: data.branchId || undefined,
        category: data.category,
        amount: data.amount,
        description: data.description,
        spentAt: data.spentAt ? new Date(data.spentAt) : new Date(),
        recordedBy: req.tenantCtx!.user.id,
        recordedByName: req.tenantCtx!.user.username,
      },
    });
    await audit({ req: req as never, action: 'expense.created', entityType: 'Expense', entityId: expense.id, tenantId: req.tenantCtx!.tenantId, branchId: data.branchId || null, detail: { amount: data.amount, category: data.category } });
    res.status(201).json(expense);
  })
);

// ───────────────────────── Cashier report ─────────────────────────

router.get(
  '/cashiers',
  asyncHandler(async (req: AuthedRequest, res) => {
    const range = dateRangeFromQuery(req.query.range as string);
    const where = {
      tenantId: req.tenantCtx!.tenantId,
      createdAt: { gte: range.start, lte: range.end },
      ...(req.tenantCtx!.branchIds ? { branchId: { in: req.tenantCtx!.branchIds } } : {}),
    };
    const byCashier = await prisma.sale.groupBy({
      by: ['cashierId', 'cashierName'],
      where,
      _sum: { total: true },
      _count: true,
    });
    const total = byCashier.reduce((s, c) => s + (c._sum.total || 0), 0);
    res.json(
      byCashier
        .map((c) => ({
          cashierId: c.cashierId,
          name: c.cashierName || 'unknown',
          total: round2(c._sum.total || 0),
          count: c._count,
          share: total > 0 ? Math.round(((c._sum.total || 0) / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.total - a.total)
    );
  })
);

export default router;
