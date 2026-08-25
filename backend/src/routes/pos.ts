import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../utils/errors';
import { tenantRouter, gateWrite, resolveBranch, type AuthedRequest, type Tx, consumeFEFO } from './helpers';
import { audit } from '../utils/audit';
import { getPagination, paged, round2, nextReceiptNo } from '../utils/helpers';

const router = tenantRouter();

// ───────────────────────── Shifts ─────────────────────────

router.get(
  '/shifts/current',
  asyncHandler(async (req: AuthedRequest, res) => {
    const branchId = req.query.branchId as string;
    if (!branchId) throw ApiError.badRequest('branchId is required');
    await resolveBranch(req.tenantCtx!, branchId);
    const shift = await prisma.shift.findFirst({
      where: { tenantId: req.tenantCtx!.tenantId, branchId, status: 'OPEN' },
      include: { cashier: { select: { id: true, username: true, fullName: true } } },
      orderBy: { openedAt: 'desc' },
    });
    if (!shift) return res.json(null);
    const cashSales = await prisma.sale.aggregate({
      where: { shiftId: shift.id, paymentMethod: { in: ['cash', 'mixed'] } },
      _sum: { total: true },
      _count: true,
    });
    res.json({ ...shift, cashSoFar: round2(cashSales._sum.total || 0), saleCount: cashSales._count });
  })
);

router.get(
  '/shifts',
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = getPagination(req, 50);
    const branchId = req.query.branchId as string | undefined;
    if (branchId) await resolveBranch(req.tenantCtx!, branchId);
    const allowed = req.tenantCtx!.branchIds;
    const where = {
      tenantId: req.tenantCtx!.tenantId,
      ...(branchId ? { branchId } : {}),
      ...(allowed ? { branchId: { in: allowed } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        include: { cashier: { select: { username: true, fullName: true } }, branch: { select: { name: true } }, _count: { select: { sales: true } } },
        orderBy: { openedAt: 'desc' },
        skip: page.skip,
        take: page.limit,
      }),
      prisma.shift.count({ where }),
    ]);
    res.json(paged(items, total, page));
  })
);

router.post(
  '/shifts/open',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { branchId, openingFloat } = z
      .object({ branchId: z.string(), openingFloat: z.number().min(0).default(0) })
      .parse(req.body);
    const branch = await resolveBranch(req.tenantCtx!, branchId);

    const existing = await prisma.shift.findFirst({
      where: { tenantId: req.tenantCtx!.tenantId, branchId: branch.id, status: 'OPEN', cashierId: req.tenantCtx!.user.id },
    });
    if (existing) throw ApiError.conflict('You already have an open shift at this branch');

    const shift = await prisma.shift.create({
      data: { tenantId: req.tenantCtx!.tenantId, branchId: branch.id, cashierId: req.tenantCtx!.user.id, openingFloat },
    });
    await audit({ req: req as never, action: 'shift.opened', entityType: 'Shift', entityId: shift.id, tenantId: req.tenantCtx!.tenantId, branchId: branch.id, detail: { openingFloat } });
    res.status(201).json(shift);
  })
);

/** Close shift: computes expected cash vs counted, produces Z-report */
router.post(
  '/shifts/:id/close',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { countedCash } = z.object({ countedCash: z.number().min(0) }).parse(req.body);
    const shift = await prisma.shift.findFirst({
      where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId },
      include: { sales: true },
    });
    if (!shift) throw ApiError.notFound('Shift not found');
    if (shift.status === 'CLOSED') throw ApiError.badRequest('Shift already closed');
    if (shift.cashierId !== req.tenantCtx!.user.id && !['OWNER', 'ADMIN', 'BRANCH_MANAGER'].includes(req.tenantCtx!.user.role)) {
      throw ApiError.forbidden('Only the shift cashier or a manager can close this shift');
    }

    const cashSales = shift.sales.filter((s) => s.paymentMethod === 'cash' || s.paymentMethod === 'mixed');
    const cashCollected = cashSales.reduce((s, sale) => s + (sale.paymentMethod === 'mixed' ? sale.amountPaid : sale.total), 0);
    const expected = round2(shift.openingFloat + cashCollected);
    const variance = round2(countedCash - expected);

    const byMethod: Record<string, { count: number; total: number }> = {};
    for (const sale of shift.sales) {
      const m = byMethod[sale.paymentMethod] || { count: 0, total: 0 };
      m.count += 1;
      m.total = round2(m.total + sale.total);
      byMethod[sale.paymentMethod] = m;
    }

    const updated = await prisma.shift.update({
      where: { id: shift.id },
      data: { closedAt: new Date(), status: 'CLOSED', countedCash, expectedCash: expected, variance },
    });

    await audit({
      req: req as never,
      action: 'shift.closed',
      entityType: 'Shift',
      entityId: shift.id,
      tenantId: req.tenantCtx!.tenantId,
      branchId: shift.branchId,
      detail: { expected, countedCash, variance, sales: shift.sales.length },
    });

    res.json({
      shift: updated,
      zReport: {
        openedAt: shift.openedAt,
        closedAt: updated.closedAt,
        openingFloat: shift.openingFloat,
        totalSales: round2(shift.sales.reduce((s, x) => s + x.total, 0)),
        saleCount: shift.sales.length,
        byMethod,
        cashCollected: round2(cashCollected),
        expectedCash: expected,
        countedCash,
        variance,
      },
    });
  })
);

// ───────────────────────── Sales ─────────────────────────

const saleItemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
  discount: z.number().min(0).default(0),
});

const saleSchema = z.object({
  branchId: z.string(),
  shiftId: z.string().optional(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, 'Cart is empty'),
  paymentMethod: z.enum(['cash', 'card', 'telebirr', 'bank', 'mixed', 'credit']),
  paymentDetail: z.string().optional(),
  amountPaid: z.number().min(0).optional(),
  saleDiscount: z.number().min(0).default(0),
  isWholesale: z.boolean().default(false),
  deliveryNoteNo: z.string().optional(),
  prescriptionId: z.string().optional(),
  notes: z.string().optional(),
});

router.get(
  '/sales',
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = getPagination(req, 50);
    const branchId = req.query.branchId as string | undefined;
    const cashierId = req.query.cashierId as string | undefined;
    const allowed = req.tenantCtx!.branchIds;
    const where = {
      tenantId: req.tenantCtx!.tenantId,
      ...(branchId ? { branchId } : {}),
      ...(allowed ? { branchId: { in: allowed } } : {}),
      ...(cashierId ? { cashierId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { items: true, cashier: { select: { username: true } }, customer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.limit,
      }),
      prisma.sale.count({ where }),
    ]);
    res.json(paged(items, total, page));
  })
);

router.get(
  '/sales/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const sale = await prisma.sale.findFirst({
      where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId },
      include: {
        items: { include: { product: { select: { id: true, name: true } }, refunds: { include: { refund: true } } } },
        refunds: true,
        cashier: { select: { username: true, fullName: true } },
        customer: true,
        branch: { select: { name: true } },
      },
    });
    if (!sale) throw ApiError.notFound('Sale not found');
    res.json(sale);
  })
);

/** Create a sale — atomic: validates stock, consumes FEFO batches, records movements, updates customer credit/loyalty */
router.post(
  '/sales',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = saleSchema.parse(req.body);
    const branch = await resolveBranch(req.tenantCtx!, data.branchId);
    const ctx = req.tenantCtx!;

    // cashiers can only sell on their own open shift
    let shift = null;
    if (data.shiftId) {
      shift = await prisma.shift.findFirst({ where: { id: data.shiftId, tenantId: ctx.tenantId, status: 'OPEN' } });
      if (!shift) throw ApiError.badRequest('Shift not found or already closed');
      if (shift.cashierId !== ctx.user.id) throw ApiError.forbidden('This shift belongs to another cashier');
    }

    // merge duplicate product lines
    const merged = new Map<string, number>();
    for (const item of data.items) {
      merged.set(item.productId, (merged.get(item.productId) || 0) + item.qty);
    }

    const customer = data.customerId
      ? await prisma.customer.findFirst({ where: { id: data.customerId, tenantId: ctx.tenantId } })
      : null;
    if (data.customerId && !customer) throw ApiError.badRequest('Customer not found');

    const sale = await prisma.$transaction(async (trx) => {
      const tx = trx as unknown as Tx & typeof prisma;

      // fetch products + compute totals
      const productIds = Array.from(merged.keys());
      const products = await tx.product.findMany({ where: { id: { in: productIds }, tenantId: ctx.tenantId } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      let lineDiscounts = 0;
      const lines: { productId: string; qty: number; unitPrice: number; discount: number; lineTotal: number }[] = [];
      for (const [productId, qty] of merged) {
        const product = productMap.get(productId);
        if (!product) throw ApiError.badRequest(`Product not found: ${productId}`);
        const unitPrice = data.isWholesale && product.wholesalePrice ? product.wholesalePrice : product.unitPrice;
        const itemDiscount = round2(data.items.filter((i) => i.productId === productId).reduce((s, i) => s + i.discount, 0));
        const lineTotal = round2(unitPrice * qty - itemDiscount);
        if (lineTotal < 0) throw ApiError.badRequest(`Discount exceeds line total for ${product.name}`);
        subtotal = round2(subtotal + unitPrice * qty);
        lineDiscounts = round2(lineDiscounts + itemDiscount);
        lines.push({ productId, qty, unitPrice, discount: itemDiscount, lineTotal });
      }

      const discountTotal = round2(lineDiscounts + data.saleDiscount);
      const total = round2(subtotal - discountTotal);
      if (total < 0) throw ApiError.badRequest('Discount exceeds sale total');

      const isCredit = data.paymentMethod === 'credit';
      const amountPaid = data.amountPaid ?? (isCredit ? 0 : total);
      if (!isCredit && data.paymentMethod !== 'mixed' && amountPaid + 1e-9 < total) {
        throw ApiError.badRequest('Amount paid is less than the total');
      }
      if (isCredit && !customer) throw ApiError.badRequest('Credit sales require a registered customer');
      if (isCredit && customer && customer.creditBalance + total > customer.creditLimit) {
        throw ApiError.badRequest(`Credit limit exceeded — outstanding would be ${round2(customer.creditBalance + total)} of ${customer.creditLimit} limit`);
      }

      const receiptNo = await nextReceiptNo(tx, ctx.tenantId, branch.id);

      const created = await tx.sale.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: branch.id,
          shiftId: shift?.id,
          cashierId: ctx.user.id,
          cashierName: ctx.user.fullName || ctx.user.username,
          customerId: customer?.id,
          customerName: customer?.name || data.customerName || null,
          subtotal,
          discountTotal,
          total,
          paymentMethod: data.paymentMethod,
          paymentDetail: data.paymentDetail,
          amountPaid: round2(amountPaid),
          changeDue: round2(Math.max(0, amountPaid - total)),
          receiptNo,
          isWholesale: data.isWholesale,
          deliveryNoteNo: data.deliveryNoteNo,
          notes: data.notes,
        },
      });

      // consume stock FEFO per line
      for (const line of lines) {
        const allocations = await consumeFEFO(tx, {
          tenantId: ctx.tenantId,
          branchId: branch.id,
          productId: line.productId,
          qty: line.qty,
          userId: ctx.user.id,
          userName: ctx.user.username,
          refType: 'Sale',
          refId: created.id,
        });
        // one sale item per allocation batch (keeps batch traceability)
        for (const alloc of allocations) {
          const product = productMap.get(line.productId)!;
          await tx.saleItem.create({
            data: {
              saleId: created.id,
              productId: line.productId,
              batchId: alloc.batchId,
              productName: product.name,
              qty: alloc.qty,
              unitPrice: line.unitPrice,
              discount: round2(line.discount * (alloc.qty / line.qty)),
              lineTotal: round2(line.unitPrice * alloc.qty - line.discount * (alloc.qty / line.qty)),
            },
          });
        }
      }

      // credit sale → customer balance
      if (isCredit && customer) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { creditBalance: round2(customer.creditBalance + total) },
        });
      }

      // loyalty: 1 point per 10 spent (retail only)
      if (customer && !data.isWholesale) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { loyaltyPoints: round2(customer.loyaltyPoints + Math.floor(total / 10)) },
        });
      }

      // link prescription if provided
      if (data.prescriptionId) {
        await tx.prescription.updateMany({
          where: { id: data.prescriptionId, tenantId: ctx.tenantId, status: { not: 'DISPENSED' } },
          data: { status: 'DISPENSED', saleId: created.id },
        });
      }

      return created;
    });

    await audit({
      req: req as never,
      action: 'sale.created',
      entityType: 'Sale',
      entityId: sale.id,
      tenantId: ctx.tenantId,
      branchId: branch.id,
      detail: { receiptNo: sale.receiptNo, total: sale.total, method: data.paymentMethod },
    });

    const full = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: { items: true, branch: { select: { name: true } }, cashier: { select: { username: true } } },
    });
    res.status(201).json(full);
  })
);

/** Refund lines from a sale — restocks good items back to their batch */
router.post(
  '/sales/:id/refund',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { reason, items } = z
      .object({
        reason: z.string().min(3, 'A reason is required for refunds'),
        items: z.array(z.object({ saleItemId: z.string(), qty: z.number().positive(), restock: z.boolean().default(true) })).min(1),
      })
      .parse(req.body);

    const sale = await prisma.sale.findFirst({
      where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId },
      include: { items: true },
    });
    if (!sale) throw ApiError.notFound('Sale not found');
    if (sale.status === 'REFUNDED') throw ApiError.badRequest('Sale already fully refunded');

    // permission: cashiers can't refund
    if (!['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'PHARMACIST', 'ACCOUNTANT'].includes(req.tenantCtx!.user.role)) {
      throw ApiError.forbidden('Your role cannot process refunds');
    }

    const refund = await prisma.$transaction(async (trx) => {
      const tx = trx as unknown as Tx & typeof prisma;
      let total = 0;
      const created = await tx.saleRefund.create({
        data: {
          saleId: sale.id,
          processedBy: req.tenantCtx!.user.id,
          processedByName: req.tenantCtx!.user.username,
          reason,
          total: 0,
        },
      });

      for (const line of items) {
        const saleItem = sale.items.find((i) => i.id === line.saleItemId);
        if (!saleItem) throw ApiError.badRequest('Refund item does not belong to this sale');
        const refundable = saleItem.qty - saleItem.refundedQty;
        if (line.qty > refundable + 1e-9) {
          throw ApiError.badRequest(`Cannot refund ${line.qty} of ${saleItem.productName} — only ${round2(refundable)} refundable`);
        }

        await tx.saleItem.update({ where: { id: saleItem.id }, data: { refundedQty: saleItem.refundedQty + line.qty } });

        if (line.restock) {
          const batch = await tx.batch.findFirst({ where: { id: saleItem.batchId } });
          if (batch) {
            const newQty = batch.qtyOnHand + line.qty;
            await tx.batch.update({ where: { id: batch.id }, data: { qtyOnHand: newQty } });
            await (tx as unknown as { stockMovement: { create: (args: object) => Promise<unknown> } }).stockMovement.create({
              data: {
                tenantId: sale.tenantId,
                branchId: sale.branchId,
                productId: saleItem.productId,
                batchId: batch.id,
                type: 'REFUND',
                qtyDelta: line.qty,
                qtyAfter: newQty,
                reason: `Refund: ${reason}`,
                refType: 'SaleRefund',
                refId: created.id,
                userId: req.tenantCtx!.user.id,
                userName: req.tenantCtx!.user.username,
              },
            });
          }
        }

        await tx.refundItem.create({
          data: { refundId: created.id, saleItemId: saleItem.id, qty: line.qty, restock: line.restock },
        });
        total = round2(total + saleItem.unitPrice * line.qty);
      }

      await tx.saleRefund.update({ where: { id: created.id }, data: { total } });

      const refreshed = await tx.sale.findUnique({ where: { id: sale.id }, include: { items: true } });
      const fullyRefunded = refreshed!.items.every((i) => i.qty - i.refundedQty <= 1e-9);
      await tx.sale.update({
        where: { id: sale.id },
        data: { status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
      });

      // reverse credit if the original sale was on credit
      if (sale.paymentMethod === 'credit' && sale.customerId) {
        const customer = await tx.customer.findFirst({ where: { id: sale.customerId } });
        if (customer) {
          await tx.customer.update({
            where: { id: customer.id },
            data: { creditBalance: round2(Math.max(0, customer.creditBalance - total)) },
          });
        }
      }

      return { ...created, total, fullyRefunded };
    });

    await audit({
      req: req as never,
      action: 'sale.refunded',
      entityType: 'Sale',
      entityId: sale.id,
      tenantId: req.tenantCtx!.tenantId,
      branchId: sale.branchId,
      detail: { refundTotal: refund.total, reason },
    });

    const full = await prisma.saleRefund.findUnique({ where: { id: refund.id }, include: { items: true } });
    res.status(201).json(full);
  })
);

export default router;
