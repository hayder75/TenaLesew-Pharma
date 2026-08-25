import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../utils/errors';
import { tenantRouter, gateWrite, resolveBranch, type AuthedRequest, type Tx, recordMovement } from './helpers';
import { audit } from '../utils/audit';
import { getPagination, paged } from '../utils/helpers';

const router = tenantRouter();

const branchFilter = (req: AuthedRequest, branchId?: string) => {
  const allowed = req.tenantCtx!.branchIds;
  return {
    tenantId: req.tenantCtx!.tenantId,
    ...(branchId ? { branchId } : {}),
    ...(allowed ? { branchId: { in: allowed } } : {}),
  };
};

// ───────────────────────── Stock overview ─────────────────────────

/** Current stock per product for a branch (sums batches, FEFO-sorted details on demand) */
router.get(
  '/stock',
  asyncHandler(async (req: AuthedRequest, res) => {
    const branchId = req.query.branchId as string | undefined;
    if (!branchId) throw ApiError.badRequest('branchId is required');
    const branch = await resolveBranch(req.tenantCtx!, branchId);
    const search = (req.query.search as string)?.trim();

    const batches = await prisma.batch.findMany({
      where: {
        ...branchFilter(req, branch.id),
        qtyOnHand: { gt: 0 },
        ...(search
          ? { product: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { genericName: { contains: search, mode: 'insensitive' } }, { barcode: { contains: search } }] } }
          : {}),
      },
      include: { product: { include: { category: { select: { name: true } } } } },
      orderBy: [{ productId: 'asc' }, { expiryDate: 'asc' }],
    });

    // aggregate by product
    const byProduct = new Map<string, { product: typeof batches[number]['product']; totalQty: number; batches: { id: string; batchNo: string; expiryDate: Date; qtyOnHand: number; costPrice: number }[] }>();
    for (const b of batches) {
      const entry = byProduct.get(b.productId) || { product: b.product, totalQty: 0, batches: [] };
      entry.totalQty += b.qtyOnHand;
      entry.batches.push({ id: b.id, batchNo: b.batchNo, expiryDate: b.expiryDate, qtyOnHand: b.qtyOnHand, costPrice: b.costPrice });
      byProduct.set(b.productId, entry);
    }

    const items = Array.from(byProduct.values()).map((e) => ({
      productId: e.product.id,
      name: e.product.name,
      genericName: e.product.genericName,
      strength: e.product.strength,
      barcode: e.product.barcode,
      category: e.product.category?.name || null,
      unitPrice: e.product.unitPrice,
      reorderLevel: e.product.reorderLevel,
      totalQty: Math.round(e.totalQty * 100) / 100,
      stockState: e.totalQty <= 0 ? 'OUT' : e.totalQty <= e.product.reorderLevel ? 'LOW' : 'OK',
      batches: e.batches.map((b) => ({ ...b, qtyOnHand: Math.round(b.qtyOnHand * 100) / 100 })),
    }));

    // sort: low/out stock first, then name
    const stateOrder = { OUT: 0, LOW: 1, OK: 2 } as const;
    items.sort((a, b) => stateOrder[a.stockState as keyof typeof stateOrder] - stateOrder[b.stockState as keyof typeof stateOrder] || a.name.localeCompare(b.name));

    const page = getPagination(req, 200);
    res.json(paged(items, items.length, page));
  })
);

/** Movement ledger for a branch */
router.get(
  '/movements',
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = getPagination(req, 100);
    const branchId = req.query.branchId as string | undefined;
    const type = req.query.type as string | undefined;
    const productId = req.query.productId as string | undefined;
    if (branchId) await resolveBranch(req.tenantCtx!, branchId);
    const where = {
      ...branchFilter(req, branchId),
      ...(type ? { type: type as never } : {}),
      ...(productId ? { productId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { batch: { select: { batchNo: true } } },
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);
    res.json(paged(items, total, page));
  })
);

// ───────────────────────── Adjustments ─────────────────────────

const adjustmentSchema = z.object({
  branchId: z.string(),
  productId: z.string(),
  batchId: z.string(),
  newQty: z.number().min(0),
  reason: z.string().min(3, 'A reason is required for stock adjustments'),
  type: z.enum(['ADJUSTMENT', 'DAMAGE', 'RETURN_SUPPLIER']).default('ADJUSTMENT'),
});

router.post(
  '/adjustments',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = adjustmentSchema.parse(req.body);
    const branch = await resolveBranch(req.tenantCtx!, data.branchId);

    // only managers+ can adjust
    if (!['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER'].includes(req.tenantCtx!.user.role)) {
      throw ApiError.forbidden('Only managers can adjust stock');
    }

    const result = await prisma.$transaction(async (trx) => {
      const tx = trx as unknown as Tx & typeof prisma;
      const batch = await tx.batch.findFirst({
        where: { id: data.batchId, tenantId: req.tenantCtx!.tenantId, branchId: branch.id },
      });
      if (!batch) throw ApiError.notFound('Batch not found');
      const delta = data.newQty - batch.qtyOnHand;
      await tx.batch.update({ where: { id: batch.id }, data: { qtyOnHand: data.newQty } });
      await recordMovement(tx, {
        tenantId: req.tenantCtx!.tenantId,
        branchId: branch.id,
        productId: data.productId,
        batchId: batch.id,
        type: data.type,
        qtyDelta: delta,
        qtyAfter: data.newQty,
        reason: data.reason,
        refType: 'Adjustment',
        userId: req.tenantCtx!.user.id,
        userName: req.tenantCtx!.user.username,
      });
      return { batchId: batch.id, delta };
    });

    await audit({
      req: req as never,
      action: `stock.${data.type.toLowerCase()}`,
      entityType: 'Batch',
      entityId: result.batchId,
      tenantId: req.tenantCtx!.tenantId,
      branchId: branch.id,
      detail: { delta: result.delta, reason: data.reason },
    });
    res.json(result);
  })
);

// ───────────────────────── Transfers ─────────────────────────

const transferSchema = z.object({
  fromBranchId: z.string(),
  toBranchId: z.string(),
  note: z.string().optional(),
  items: z.array(z.object({ productId: z.string(), qty: z.number().positive() })).min(1),
});

router.get(
  '/transfers',
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = getPagination(req, 50);
    const status = req.query.status as string | undefined;
    const allowed = req.tenantCtx!.branchIds;
    const where = {
      tenantId: req.tenantCtx!.tenantId,
      ...(status ? { status: status as never } : {}),
      ...(allowed ? { OR: [{ fromBranchId: { in: allowed } }, { toBranchId: { in: allowed } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.stockTransfer.findMany({
        where,
        include: {
          fromBranch: { select: { id: true, name: true } },
          toBranch: { select: { id: true, name: true } },
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.limit,
      }),
      prisma.stockTransfer.count({ where }),
    ]);
    res.json(paged(items, total, page));
  })
);

router.post(
  '/transfers',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = transferSchema.parse(req.body);
    if (data.fromBranchId === data.toBranchId) throw ApiError.badRequest('Source and destination must differ');
    const from = await resolveBranch(req.tenantCtx!, data.fromBranchId);
    await resolveBranch(req.tenantCtx!, data.toBranchId);

    // verify stock availability at source (FEFO will consume at receive time, but check now)
    for (const item of data.items) {
      const available = await prisma.batch.aggregate({
        where: { tenantId: req.tenantCtx!.tenantId, branchId: from.id, productId: item.productId, qtyOnHand: { gt: 0 } },
        _sum: { qtyOnHand: true },
      });
      if ((available._sum.qtyOnHand || 0) + 1e-9 < item.qty) {
        const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { name: true } });
        throw ApiError.badRequest(`Not enough stock for ${product?.name || item.productId} at ${from.name}`);
      }
    }

    const transfer = await prisma.stockTransfer.create({
      data: {
        tenantId: req.tenantCtx!.tenantId,
        fromBranchId: from.id,
        toBranchId: data.toBranchId,
        note: data.note,
        requestedBy: req.tenantCtx!.user.id,
        requestedByName: req.tenantCtx!.user.username,
        items: { create: data.items },
      },
      include: { items: { include: { product: { select: { name: true } } } }, fromBranch: { select: { name: true } }, toBranch: { select: { name: true } } },
    });
    await audit({ req: req as never, action: 'transfer.requested', entityType: 'StockTransfer', entityId: transfer.id, tenantId: req.tenantCtx!.tenantId, branchId: from.id, detail: { to: data.toBranchId, items: data.items.length } });
    res.status(201).json(transfer);
  })
);

/** Approve → IN_TRANSIT (stock leaves source immediately, FEFO) */
router.post(
  '/transfers/:id/approve',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId },
      include: { items: true },
    });
    if (!transfer) throw ApiError.notFound('Transfer not found');
    if (transfer.status !== 'REQUESTED') throw ApiError.badRequest(`Transfer is ${transfer.status}`);

    await prisma.$transaction(async (trx) => {
      const tx = trx as unknown as Tx & typeof prisma;
      for (const item of transfer.items) {
        const batches = await tx.batch.findMany({
          where: { tenantId: transfer.tenantId, branchId: transfer.fromBranchId, productId: item.productId, qtyOnHand: { gt: 0 } },
          orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
        });
        let remaining = item.qty;
        for (const batch of batches) {
          if (remaining <= 1e-9) break;
          const take = Math.min(batch.qtyOnHand, remaining);
          const newQty = batch.qtyOnHand - take;
          await tx.batch.update({ where: { id: batch.id }, data: { qtyOnHand: newQty } });
          await recordMovement(tx, {
            tenantId: transfer.tenantId,
            branchId: transfer.fromBranchId,
            productId: item.productId,
            batchId: batch.id,
            type: 'TRANSFER_OUT',
            qtyDelta: -take,
            qtyAfter: newQty,
            reason: 'Transfer out',
            refType: 'StockTransfer',
            refId: transfer.id,
            userId: req.tenantCtx!.user.id,
            userName: req.tenantCtx!.user.username,
          });
          remaining -= take;
        }
        if (remaining > 1e-9) throw ApiError.badRequest('Stock changed — not enough to transfer anymore');
      }
      await (trx as typeof prisma).stockTransfer.update({
        where: { id: transfer.id },
        data: { status: 'IN_TRANSIT', approvedBy: req.tenantCtx!.user.id },
      });
    });

    await audit({ req: req as never, action: 'transfer.approved', entityType: 'StockTransfer', entityId: transfer.id, tenantId: req.tenantCtx!.tenantId, branchId: transfer.fromBranchId });
    res.json({ ok: true });
  })
);

/** Receive → stock enters destination branch as a fresh batch */
router.post(
  '/transfers/:id/receive',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId },
      include: { items: { include: { product: true } }, fromBranch: true, toBranch: true },
    });
    if (!transfer) throw ApiError.notFound('Transfer not found');
    if (transfer.status !== 'IN_TRANSIT') throw ApiError.badRequest(`Transfer is ${transfer.status} — must be in transit`);
    await resolveBranch(req.tenantCtx!, transfer.toBranchId);

    await prisma.$transaction(async (trx) => {
      const tx = trx as unknown as Tx & typeof prisma;
      for (const item of transfer.items) {
        // carry the earliest-expiring source batches' info; create one merged batch at destination
        const srcMovements = await (trx as typeof prisma).stockMovement.findMany({
          where: { refType: 'StockTransfer', refId: transfer.id, productId: item.productId, type: 'TRANSFER_OUT' },
          include: { batch: true },
          orderBy: { createdAt: 'asc' },
        });
        const earliestExpiry = srcMovements.length
          ? srcMovements.reduce((min, m) => (m.batch && m.batch.expiryDate < min ? m.batch.expiryDate : min), srcMovements[0].batch?.expiryDate || new Date())
          : new Date();
        const cost = srcMovements[0]?.batch?.costPrice ?? item.product.costPrice;

        let destBatch = await tx.batch.findFirst({
          where: { tenantId: transfer.tenantId, branchId: transfer.toBranchId, productId: item.productId, batchNo: `TR-${transfer.id.slice(0, 6).toUpperCase()}` },
        });
        if (destBatch) {
          const newQty = destBatch.qtyOnHand + item.qty;
          await tx.batch.update({ where: { id: destBatch.id }, data: { qtyOnHand: newQty } });
          destBatch = { ...destBatch, qtyOnHand: newQty };
        } else {
          destBatch = (await tx.batch.create({
            data: {
              tenantId: transfer.tenantId,
              branchId: transfer.toBranchId,
              productId: item.productId,
              batchNo: `TR-${transfer.id.slice(0, 6).toUpperCase()}`,
              expiryDate: earliestExpiry,
              qtyOnHand: item.qty,
              costPrice: cost,
            },
          }));
        }
        await recordMovement(tx, {
          tenantId: transfer.tenantId,
          branchId: transfer.toBranchId,
          productId: item.productId,
          batchId: destBatch.id,
          type: 'TRANSFER_IN',
          qtyDelta: item.qty,
          qtyAfter: destBatch.qtyOnHand,
          reason: `Transfer from ${transfer.fromBranch.name}`,
          refType: 'StockTransfer',
          refId: transfer.id,
          userId: req.tenantCtx!.user.id,
          userName: req.tenantCtx!.user.username,
        });
      }
      await (trx as typeof prisma).stockTransfer.update({
        where: { id: transfer.id },
        data: { status: 'RECEIVED', receivedByName: req.tenantCtx!.user.username },
      });
    });

    await audit({ req: req as never, action: 'transfer.received', entityType: 'StockTransfer', entityId: transfer.id, tenantId: req.tenantCtx!.tenantId, branchId: transfer.toBranchId });
    res.json({ ok: true });
  })
);

router.post(
  '/transfers/:id/cancel',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const transfer = await prisma.stockTransfer.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!transfer) throw ApiError.notFound('Transfer not found');
    if (!['REQUESTED', 'APPROVED'].includes(transfer.status)) throw ApiError.badRequest(`Cannot cancel a transfer that is ${transfer.status}`);
    // if it was approved (stock already left source), return stock
    if (transfer.status === 'APPROVED') {
      // stock only leaves on approve in our flow — we set IN_TRANSIT on approve, so APPROVED here means pre-transit cancel: nothing to restore
    }
    await prisma.stockTransfer.update({ where: { id: transfer.id }, data: { status: 'CANCELLED' } });
    await audit({ req: req as never, action: 'transfer.cancelled', entityType: 'StockTransfer', entityId: transfer.id, tenantId: req.tenantCtx!.tenantId });
    res.json({ ok: true });
  })
);

// ───────────────────────── Stock counts ─────────────────────────

router.get(
  '/counts',
  asyncHandler(async (req: AuthedRequest, res) => {
    const allowed = req.tenantCtx!.branchIds;
    const counts = await prisma.stockCount.findMany({
      where: {
        tenantId: req.tenantCtx!.tenantId,
        ...(allowed ? { branchId: { in: allowed } } : {}),
      },
      include: { branch: { select: { name: true } }, items: true, },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(
      counts.map((c) => ({
        id: c.id,
        branch: c.branch,
        status: c.status,
        note: c.note,
        startedByName: c.startedByName,
        createdAt: c.createdAt,
        itemCount: c.items.length,
        varianceCount: c.items.filter((i) => i.countedQty !== null && Math.abs(i.countedQty - i.systemQty) > 1e-9).length,
      }))
    );
  })
);

/** Start a count: snapshots all current batches at the branch */
router.post(
  '/counts',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { branchId, note } = z.object({ branchId: z.string(), note: z.string().optional() }).parse(req.body);
    const branch = await resolveBranch(req.tenantCtx!, branchId);

    const open = await prisma.stockCount.findFirst({
      where: { tenantId: req.tenantCtx!.tenantId, branchId: branch.id, status: { in: ['OPEN', 'COUNTING', 'REVIEW'] } },
    });
    if (open) throw ApiError.conflict('There is already a count in progress at this branch');

    const batches = await prisma.batch.findMany({
      where: { tenantId: req.tenantCtx!.tenantId, branchId: branch.id, qtyOnHand: { gt: 0 } },
    });

    const count = await prisma.stockCount.create({
      data: {
        tenantId: req.tenantCtx!.tenantId,
        branchId: branch.id,
        status: 'COUNTING',
        note,
        startedBy: req.tenantCtx!.user.id,
        startedByName: req.tenantCtx!.user.username,
        items: { create: batches.map((b) => ({ productId: b.productId, batchId: b.id, systemQty: b.qtyOnHand })) },
      },
      include: { items: true },
    });
    res.status(201).json(count);
  })
);

router.get(
  '/counts/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const count = await prisma.stockCount.findFirst({
      where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId },
      include: {
        branch: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } }, batch: { select: { batchNo: true, expiryDate: true } } } },
      },
    });
    if (!count) throw ApiError.notFound('Count not found');
    res.json(count);
  })
);

/** Submit counted quantities */
router.patch(
  '/counts/:id/items',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { items } = z
      .object({ items: z.array(z.object({ itemId: z.string(), countedQty: z.number().min(0) })).min(1) })
      .parse(req.body);
    const count = await prisma.stockCount.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!count) throw ApiError.notFound('Count not found');
    if (!['COUNTING', 'REVIEW'].includes(count.status)) throw ApiError.badRequest(`Count is ${count.status}`);

    for (const item of items) {
      await prisma.stockCountItem.updateMany({
        where: { id: item.itemId, countId: count.id },
        data: { countedQty: item.countedQty },
      });
    }
    res.json({ ok: true, updated: items.length });
  })
);

/** Approve count → applies variances as adjustments */
router.post(
  '/counts/:id/approve',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER'].includes(req.tenantCtx!.user.role)) {
      throw ApiError.forbidden('Only managers can approve stock counts');
    }
    const count = await prisma.stockCount.findFirst({
      where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId },
      include: { items: { include: { batch: true } } },
    });
    if (!count) throw ApiError.notFound('Count not found');
    if (count.status !== 'COUNTING' && count.status !== 'REVIEW') throw ApiError.badRequest(`Count is ${count.status}`);
    if (count.items.some((i) => i.countedQty === null)) throw ApiError.badRequest('All items must be counted before approval');

    await prisma.$transaction(async (trx) => {
      const tx = trx as unknown as Tx & typeof prisma;
      for (const item of count.items) {
        const counted = item.countedQty!;
        const delta = counted - item.batch.qtyOnHand;
        if (Math.abs(delta) < 1e-9) continue;
        await tx.batch.update({ where: { id: item.batchId }, data: { qtyOnHand: counted } });
        await recordMovement(tx, {
          tenantId: count.tenantId,
          branchId: count.branchId,
          productId: item.productId,
          batchId: item.batchId,
          type: 'COUNT',
          qtyDelta: delta,
          qtyAfter: counted,
          reason: `Stock count variance`,
          refType: 'StockCount',
          refId: count.id,
          userId: req.tenantCtx!.user.id,
          userName: req.tenantCtx!.user.username,
        });
      }
      await (trx as typeof prisma).stockCount.update({
        where: { id: count.id },
        data: { status: 'APPROVED', approvedBy: req.tenantCtx!.user.id },
      });
    });

    await audit({ req: req as never, action: 'stock.count_approved', entityType: 'StockCount', entityId: count.id, tenantId: req.tenantCtx!.tenantId, branchId: count.branchId });
    res.json({ ok: true });
  })
);

router.post(
  '/counts/:id/cancel',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const count = await prisma.stockCount.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!count) throw ApiError.notFound('Count not found');
    if (!['OPEN', 'COUNTING', 'REVIEW'].includes(count.status)) throw ApiError.badRequest(`Count is ${count.status}`);
    await prisma.stockCount.update({ where: { id: count.id }, data: { status: 'CANCELLED' } });
    res.json({ ok: true });
  })
);

// ───────────────────────── Alerts ─────────────────────────

/** Low stock + expiring batches for a branch (dashboard alerts) */
router.get(
  '/alerts',
  asyncHandler(async (req: AuthedRequest, res) => {
    const branchId = req.query.branchId as string | undefined;
    if (!branchId) throw ApiError.badRequest('branchId is required');
    const branch = await resolveBranch(req.tenantCtx!, branchId);

    const [products, expiringBatches] = await Promise.all([
      prisma.product.findMany({
        where: { tenantId: req.tenantCtx!.tenantId, isActive: true },
        include: { batches: { where: { branchId: branch.id, qtyOnHand: { gt: 0 } } } },
      }),
      prisma.batch.findMany({
        where: {
          tenantId: req.tenantCtx!.tenantId,
          branchId: branch.id,
          qtyOnHand: { gt: 0 },
          expiryDate: { lte: new Date(Date.now() + 90 * 24 * 3600 * 1000) },
        },
        include: { product: { select: { name: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);

    const lowStock = products
      .map((p) => ({ product: p, total: p.batches.reduce((s, b) => s + b.qtyOnHand, 0) }))
      .filter((e) => e.total <= p_reorder(e.product.reorderLevel))
      .map((e) => ({
        productId: e.product.id,
        name: e.product.name,
        totalQty: Math.round(e.total * 100) / 100,
        reorderLevel: e.product.reorderLevel,
        state: e.total <= 0 ? 'OUT' : 'LOW',
      }))
      .sort((a, b) => a.totalQty - b.totalQty)
      .slice(0, 50);

    const expired = expiringBatches.filter((b) => b.expiryDate < new Date());
    const expiringSoon = expiringBatches.filter((b) => b.expiryDate >= new Date());

    res.json({
      lowStock,
      expired: expired.map((b) => ({ batchId: b.id, name: b.product.name, batchNo: b.batchNo, expiryDate: b.expiryDate, qty: b.qtyOnHand })),
      expiringSoon: expiringSoon.map((b) => ({ batchId: b.id, name: b.product.name, batchNo: b.batchNo, expiryDate: b.expiryDate, qty: b.qtyOnHand })),
    });
  })
);

const p_reorder = (n: number) => n;
export default router;
