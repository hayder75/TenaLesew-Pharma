import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../utils/errors';
import { tenantRouter, gateWrite, resolveBranch, requireTenantRole, type AuthedRequest, type Tx, recordMovement } from './helpers';
import { audit } from '../utils/audit';
import { getPagination, paged, round2, parseDate } from '../utils/helpers';

const router = tenantRouter();
const MANAGE_ROLES = ['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER'] as const;

// ───────────────────────── Purchase Orders ─────────────────────────

const poItemSchema = z.object({
  productId: z.string(),
  qtyExpected: z.number().positive(),
  unitCost: z.number().min(0),
});

const poSchema = z.object({
  branchId: z.string(),
  supplierId: z.string(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(poItemSchema).min(1, 'Add at least one item'),
});

router.get(
  '/pos',
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = getPagination(req, 50);
    const status = req.query.status as string | undefined;
    const branchId = req.query.branchId as string | undefined;
    const allowed = req.tenantCtx!.branchIds;
    const where = {
      tenantId: req.tenantCtx!.tenantId,
      ...(status ? { status: status as never } : {}),
      ...(branchId ? { branchId } : {}),
      ...(allowed ? { branchId: { in: allowed } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } }, items: true },
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);
    res.json(
      paged(
        items.map((po) => ({
          ...po,
          itemCount: po.items.length,
          totalQty: po.items.reduce((s, i) => s + i.qtyExpected, 0),
          receivedQty: po.items.reduce((s, i) => s + i.qtyReceived, 0),
        })),
        total,
        page
      )
    );
  })
);

router.get(
  '/pos/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId },
      include: {
        supplier: true,
        branch: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, unitPrice: true } } } },
        receipts: { include: { items: true } },
      },
    });
    if (!po) throw ApiError.notFound('Purchase order not found');
    res.json(po);
  })
);

router.post(
  '/pos',
  requireTenantRole(...MANAGE_ROLES),
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = poSchema.parse(req.body);
    await resolveBranch(req.tenantCtx!, data.branchId);
    const supplier = await prisma.supplier.findFirst({ where: { id: data.supplierId, tenantId: req.tenantCtx!.tenantId } });
    if (!supplier) throw ApiError.badRequest('Invalid supplier');

    for (const item of data.items) {
      const product = await prisma.product.findFirst({ where: { id: item.productId, tenantId: req.tenantCtx!.tenantId } });
      if (!product) throw ApiError.badRequest(`Invalid product in items: ${item.productId}`);
    }

    const total = round2(data.items.reduce((s, i) => s + i.qtyExpected * i.unitCost, 0));
    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId: req.tenantCtx!.tenantId,
        branchId: data.branchId,
        supplierId: data.supplierId,
        status: 'SUBMITTED',
        expectedDate: parseDate(data.expectedDate),
        notes: data.notes,
        total,
        createdBy: req.tenantCtx!.user.id,
        createdByName: req.tenantCtx!.user.username,
        items: { create: data.items },
      },
      include: { items: true, supplier: { select: { name: true } } },
    });
    await audit({ req: req as never, action: 'po.created', entityType: 'PurchaseOrder', entityId: po.id, tenantId: req.tenantCtx!.tenantId, branchId: data.branchId, detail: { total, items: data.items.length } });
    res.status(201).json(po);
  })
);

router.post(
  '/pos/:id/cancel',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const po = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!po) throw ApiError.notFound('Purchase order not found');
    if (po.status === 'RECEIVED') throw ApiError.badRequest('Cannot cancel a fully received order');
    const updated = await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: 'CANCELLED' } });
    await audit({ req: req as never, action: 'po.cancelled', entityType: 'PurchaseOrder', entityId: po.id, tenantId: req.tenantCtx!.tenantId });
    res.json(updated);
  })
);

// ───────────────────────── Goods Received Notes ─────────────────────────

const grnItemSchema = z.object({
  productId: z.string(),
  qtyReceived: z.number().positive(),
  unitCost: z.number().min(0),
  batchNo: z.string().min(1, 'Batch number is required for medicines'),
  expiryDate: z.string().min(4, 'Expiry date is required'),
});

const grnSchema = z.object({
  branchId: z.string(),
  poId: z.string().optional(),
  supplierId: z.string(),
  invoiceNo: z.string().optional(),
  items: z.array(grnItemSchema).min(1, 'Add at least one item'),
});

/** Receive goods: creates batches, updates PO, records movements — all atomic */
router.post(
  '/grns',
  requireTenantRole(...MANAGE_ROLES),
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = grnSchema.parse(req.body);
    const branch = await resolveBranch(req.tenantCtx!, data.branchId);
    const supplier = await prisma.supplier.findFirst({ where: { id: data.supplierId, tenantId: req.tenantCtx!.tenantId } });
    if (!supplier) throw ApiError.badRequest('Invalid supplier');

    if (data.poId) {
      const po = await prisma.purchaseOrder.findFirst({ where: { id: data.poId, tenantId: req.tenantCtx!.tenantId } });
      if (!po) throw ApiError.badRequest('Invalid purchase order');
      if (po.status === 'CANCELLED') throw ApiError.badRequest('This purchase order is cancelled');
      if (po.status === 'RECEIVED') throw ApiError.badRequest('This purchase order is already fully received');
    }

    for (const item of data.items) {
      const product = await prisma.product.findFirst({ where: { id: item.productId, tenantId: req.tenantCtx!.tenantId } });
      if (!product) throw ApiError.badRequest(`Invalid product: ${item.productId}`);
      if (new Date(item.expiryDate) < new Date()) {
        throw ApiError.badRequest(`Batch ${item.batchNo} is already expired`);
      }
    }

    const total = round2(data.items.reduce((s, i) => s + i.qtyReceived * i.unitCost, 0));

    const grn = await prisma.$transaction(async (trx) => {
      const tx = trx as unknown as Tx & typeof prisma;
      const receipt = await tx.goodsReceipt.create({
        data: {
          tenantId: req.tenantCtx!.tenantId,
          branchId: data.branchId,
          poId: data.poId,
          supplierId: data.supplierId,
          invoiceNo: data.invoiceNo,
          total,
          receivedBy: req.tenantCtx!.user.id,
          receivedByName: req.tenantCtx!.user.username,
        },
      });

      for (const item of data.items) {
        // find or create the batch (same product+branch+batchNo+expiry → same batch)
        let batch = await tx.batch.findFirst({
          where: {
            tenantId: req.tenantCtx!.tenantId,
            branchId: data.branchId,
            productId: item.productId,
            batchNo: item.batchNo,
          },
        });
        if (batch) {
          // top up existing batch, keep earliest expiry
          const expiry = new Date(item.expiryDate);
          const newQty = batch.qtyOnHand + item.qtyReceived;
          await tx.batch.update({
            where: { id: batch.id },
            data: { qtyOnHand: newQty, costPrice: item.unitCost, expiryDate: expiry < batch.expiryDate ? expiry : batch.expiryDate },
          });
          batch = { ...batch, qtyOnHand: newQty };
        } else {
          batch = (await tx.batch.create({
            data: {
              tenantId: req.tenantCtx!.tenantId,
              branchId: data.branchId,
              productId: item.productId,
              batchNo: item.batchNo,
              expiryDate: new Date(item.expiryDate),
              qtyOnHand: item.qtyReceived,
              costPrice: item.unitCost,
            },
          }));
        }

        await tx.gRNItem.create({
          data: {
            grnId: receipt.id,
            productId: item.productId,
            batchId: batch.id,
            qtyReceived: item.qtyReceived,
            unitCost: item.unitCost,
            batchNo: item.batchNo,
            expiryDate: new Date(item.expiryDate),
          },
        });

        await recordMovement(tx, {
          tenantId: req.tenantCtx!.tenantId,
          branchId: data.branchId,
          productId: item.productId,
          batchId: batch.id,
          type: 'PURCHASE',
          qtyDelta: item.qtyReceived,
          qtyAfter: batch.qtyOnHand,
          reason: data.invoiceNo ? `GRN invoice ${data.invoiceNo}` : 'Goods received',
          refType: 'GoodsReceipt',
          refId: receipt.id,
          userId: req.tenantCtx!.user.id,
          userName: req.tenantCtx!.user.username,
        });

        // update PO progress if receiving against one
        if (data.poId) {
          const poItem = await (trx as typeof prisma).pOItem.findFirst({
            where: { poId: data.poId, productId: item.productId },
          });
          if (poItem) {
            await (trx as typeof prisma).pOItem.update({
              where: { id: poItem.id },
              data: { qtyReceived: poItem.qtyReceived + item.qtyReceived },
            });
          }
        }
      }

      if (data.poId) {
        const poItems = await (trx as typeof prisma).pOItem.findMany({ where: { poId: data.poId } });
        const fullyReceived = poItems.every((i) => i.qtyReceived + 1e-9 >= i.qtyExpected);
        const anyReceived = poItems.some((i) => i.qtyReceived > 0);
        await (trx as typeof prisma).purchaseOrder.update({
          where: { id: data.poId },
          data: { status: fullyReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : undefined },
        });
      }

      return receipt;
    });

    await audit({
      req: req as never,
      action: 'grn.received',
      entityType: 'GoodsReceipt',
      entityId: grn.id,
      tenantId: req.tenantCtx!.tenantId,
      branchId: data.branchId,
      detail: { total, items: data.items.length, poId: data.poId },
    });

    const full = await prisma.goodsReceipt.findUnique({
      where: { id: grn.id },
      include: { items: { include: { product: { select: { name: true } } } }, supplier: { select: { name: true } } },
    });
    res.status(201).json(full);
  })
);

router.get(
  '/grns',
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = getPagination(req, 50);
    const branchId = req.query.branchId as string | undefined;
    const allowed = req.tenantCtx!.branchIds;
    const where = {
      tenantId: req.tenantCtx!.tenantId,
      ...(branchId ? { branchId } : {}),
      ...(allowed ? { branchId: { in: allowed } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.goodsReceipt.findMany({
        where,
        include: { supplier: { select: { name: true } }, branch: { select: { name: true } }, items: true },
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.limit,
      }),
      prisma.goodsReceipt.count({ where }),
    ]);
    res.json(paged(items, total, page));
  })
);

export default router;
