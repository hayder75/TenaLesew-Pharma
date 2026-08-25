import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../utils/errors';
import { tenantRouter, gateWrite, type AuthedRequest } from './helpers';
import { audit } from '../utils/audit';
import { getPagination, paged, round2 } from '../utils/helpers';

const router = tenantRouter();

const customerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  dob: z.string().optional(),
  gender: z.string().optional(),
  allergies: z.string().optional(),
  conditions: z.string().optional(),
  notes: z.string().optional(),
  isWholesale: z.boolean().default(false),
  creditLimit: z.number().min(0).default(0),
});

router.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = getPagination(req, 100);
    const search = (req.query.search as string)?.trim();
    const type = req.query.type as string | undefined;
    const where = {
      tenantId: req.tenantCtx!.tenantId,
      isActive: true,
      ...(search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { phone: { contains: search } }] }
        : {}),
      ...(type === 'wholesale' ? { isWholesale: true } : {}),
      ...(type === 'retail' ? { isWholesale: false } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { _count: { select: { sales: true } } },
        orderBy: [{ createdAt: 'desc' }],
        skip: page.skip,
        take: page.limit,
      }),
      prisma.customer.count({ where }),
    ]);
    res.json(paged(items, total, page));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId },
      include: {
        sales: { orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, receiptNo: true, total: true, createdAt: true, status: true, paymentMethod: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { sales: true } },
      },
    });
    if (!customer) throw ApiError.notFound('Customer not found');
    const totals = await prisma.sale.aggregate({
      where: { customerId: customer.id, status: { not: 'REFUNDED' } },
      _sum: { total: true },
    });
    res.json({ ...customer, totalPurchases: round2(totals._sum.total || 0) });
  })
);

router.post(
  '/',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: { ...data, email: data.email || undefined, dob: data.dob ? new Date(data.dob) : undefined, tenantId: req.tenantCtx!.tenantId },
    });
    await audit({ req: req as never, action: 'customer.created', entityType: 'Customer', entityId: customer.id, tenantId: req.tenantCtx!.tenantId, detail: { name: customer.name } });
    res.status(201).json(customer);
  })
);

router.patch(
  '/:id',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = customerSchema.partial().parse(req.body);
    const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!existing) throw ApiError.notFound('Customer not found');
    const customer = await prisma.customer.update({
      where: { id: existing.id },
      data: { ...data, email: data.email || undefined, dob: data.dob ? new Date(data.dob) : undefined },
    });
    await audit({ req: req as never, action: 'customer.updated', entityType: 'Customer', entityId: customer.id, tenantId: req.tenantCtx!.tenantId });
    res.json(customer);
  })
);

router.delete(
  '/:id',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!existing) throw ApiError.notFound('Customer not found');
    await prisma.customer.update({ where: { id: existing.id }, data: { isActive: false } });
    res.json({ ok: true });
  })
);

/** Collect a credit payment */
router.post(
  '/:id/payments',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { amount, method, note, saleId } = z
      .object({ amount: z.number().positive(), method: z.string().default('cash'), note: z.string().optional(), saleId: z.string().optional() })
      .parse(req.body);
    const customer = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!customer) throw ApiError.notFound('Customer not found');
    if (amount > customer.creditBalance + 1e-9) {
      throw ApiError.badRequest(`Payment exceeds outstanding balance (${round2(customer.creditBalance)})`);
    }

    const payment = await prisma.$transaction(async (trx) => {
      const p = await trx.customerPayment.create({
        data: {
          tenantId: req.tenantCtx!.tenantId,
          customerId: customer.id,
          saleId,
          amount,
          method,
          note,
          collectedBy: req.tenantCtx!.user.id,
          collectedByName: req.tenantCtx!.user.username,
        },
      });
      await trx.customer.update({
        where: { id: customer.id },
        data: { creditBalance: round2(customer.creditBalance - amount) },
      });
      return p;
    });

    await audit({ req: req as never, action: 'customer.credit_collected', entityType: 'CustomerPayment', entityId: payment.id, tenantId: req.tenantCtx!.tenantId, detail: { amount, customerId: customer.id } });
    res.status(201).json(payment);
  })
);

export default router;
