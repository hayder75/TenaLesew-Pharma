import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../utils/errors';
import { authenticate, requireRole, effectiveLicense, type AuthedRequest } from '../middleware/auth';
import { hashPassword, signAccessToken, issueRefreshToken } from '../utils/auth';
import { config } from '../config';
import { audit } from '../utils/audit';
import { todayStart } from '../utils/helpers';

const router = Router();
router.use(authenticate, requireRole('SUPER_ADMIN'));

// ───────────────────────── Platform dashboard ─────────────────────────

router.get(
  '/overview',
  asyncHandler(async (_req: AuthedRequest, res) => {
    const [tenants, branches, todaySales, monthSales, expiringLicenses, recentTenants] = await Promise.all([
      prisma.tenant.findMany({ select: { status: true } }),
      prisma.branch.findMany({ include: { license: true } }),
      prisma.sale.aggregate({ where: { createdAt: { gte: todayStart() } }, _sum: { total: true }, _count: true }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.branch.findMany({
        where: {
          license: {
            OR: [
              { paidUntil: { lte: new Date(Date.now() + 7 * 24 * 3600 * 1000) } },
              { trialEndsAt: { lte: new Date(Date.now() + 7 * 24 * 3600 * 1000) } },
            ],
          },
        },
        include: { license: true, tenant: { select: { name: true } } },
      }),
      prisma.tenant.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, createdAt: true, status: true } }),
    ]);

    const branchStates = branches.map((b) => effectiveLicense(b.license).status);
    res.json({
      tenants: {
        total: tenants.length,
        active: tenants.filter((t) => t.status === 'ACTIVE').length,
        suspended: tenants.filter((t) => t.status === 'SUSPENDED').length,
      },
      branches: {
        total: branches.length,
        active: branchStates.filter((s) => s === 'ACTIVE').length,
        trial: branchStates.filter((s) => s === 'TRIAL').length,
        grace: branchStates.filter((s) => s === 'GRACE').length,
        expired: branchStates.filter((s) => s === 'EXPIRED').length,
      },
      sales: {
        todayTotal: todaySales._sum.total || 0,
        todayCount: todaySales._count,
        monthTotal: monthSales._sum.total || 0,
        monthCount: monthSales._count,
      },
      expiringLicenses: expiringLicenses.map((b) => ({
        branchId: b.id,
        branchName: b.name,
        tenantName: b.tenant.name,
        license: effectiveLicense(b.license),
      })),
      recentTenants,
    });
  })
);

// ───────────────────────── Tenants ─────────────────────────

const tenantSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const ownerSchema = z.object({
  username: z.string().min(3).regex(/^[a-zA-Z0-9_.-]+$/, 'Username: letters, numbers, . _ - only'),
  password: z.string().min(8, 'Owner password must be at least 8 characters'),
  fullName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

router.get(
  '/tenants',
  asyncHandler(async (req: AuthedRequest, res) => {
    const search = (req.query.search as string)?.toLowerCase() || '';
    const tenants = await prisma.tenant.findMany({
      where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : undefined,
      include: {
        branches: { include: { license: true } },
        users: { where: { role: 'OWNER' }, select: { username: true, fullName: true, phone: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const tenantIds = tenants.map((t) => t.id);
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const [salesAgg, lastActivity] = await Promise.all([
      prisma.sale.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds }, createdAt: { gte: monthAgo } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.sale.groupBy({ by: ['tenantId'], where: { tenantId: { in: tenantIds } }, _max: { createdAt: true } }),
    ]);
    const salesMap = new Map(salesAgg.map((s) => [s.tenantId, { total: s._sum.total || 0, count: s._count }]));
    const activityMap = new Map(lastActivity.map((s) => [s.tenantId, s._max.createdAt]));

    res.json(
      tenants.map((t) => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        address: t.address,
        status: t.status,
        createdAt: t.createdAt,
        owner: t.users[0] || null,
        userCount: t._count.users,
        branches: t.branches.map((b) => ({ id: b.id, name: b.name, license: effectiveLicense(b.license) })),
        monthSales: salesMap.get(t.id) || { total: 0, count: 0 },
        lastActivity: activityMap.get(t.id) || null,
      }))
    );
  })
);

router.post(
  '/tenants',
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = tenantSchema.parse(req.body);
    const owner = ownerSchema.parse(req.body.owner ?? req.body);

    const dup = await prisma.user.findFirst({ where: { username: owner.username } });
    if (dup) throw ApiError.conflict('Username already taken');

    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        users: {
          create: {
            username: owner.username,
            passwordHash: await hashPassword(owner.password),
            fullName: owner.fullName,
            email: owner.email || null,
            role: 'OWNER',
          },
        },
      },
    });

    await audit({
      req: req as never,
      action: 'platform.tenant_created',
      entityType: 'Tenant',
      entityId: tenant.id,
      tenantId: tenant.id,
      detail: { name: tenant.name },
    });
    res.status(201).json(tenant);
  })
);

router.get(
  '/tenants/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        branches: { include: { license: true }, orderBy: { createdAt: 'asc' } },
        users: { orderBy: { createdAt: 'asc' }, select: { id: true, username: true, fullName: true, email: true, phone: true, role: true, isActive: true, createdAt: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!tenant) throw ApiError.notFound('Tenant not found');

    const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const [salesByBranch, topProducts, recentAudit, saleCount] = await Promise.all([
      prisma.sale.groupBy({
        by: ['branchId'],
        where: { tenantId: tenant.id, createdAt: { gte: monthAgo } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.saleItem.groupBy({
        by: ['productName'],
        where: { sale: { tenantId: tenant.id, createdAt: { gte: monthAgo } } },
        _sum: { qty: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 5,
      }),
      prisma.auditLog.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, action: true, actorLabel: true, entityType: true, createdAt: true },
      }),
      prisma.sale.count({ where: { tenantId: tenant.id, createdAt: { gte: monthAgo } } }),
    ]);

    const salesMap = new Map(salesByBranch.map((s) => [s.branchId, s]));
    res.json({
      ...tenant,
      branches: tenant.branches.map((b) => ({
        ...b,
        license: effectiveLicense(b.license),
        monthSales: { total: salesMap.get(b.id)?._sum.total || 0, count: salesMap.get(b.id)?._count || 0 },
      })),
      activity: {
        monthSaleCount: saleCount,
        topProducts: topProducts.map((p) => ({ name: p.productName, qty: p._sum.qty, total: p._sum.lineTotal })),
        recentEvents: recentAudit,
      },
    });
  })
);

router.patch(
  '/tenants/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = tenantSchema.partial().parse(req.body);
    const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data });
    await audit({ req: req as never, action: 'platform.tenant_updated', entityType: 'Tenant', entityId: tenant.id, tenantId: tenant.id, detail: data as Record<string, unknown> });
    res.json(tenant);
  })
);

router.post(
  '/tenants/:id/suspend',
  asyncHandler(async (req: AuthedRequest, res) => {
    const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data: { status: 'SUSPENDED' } });
    await audit({ req: req as never, action: 'platform.tenant_suspended', entityType: 'Tenant', entityId: tenant.id, tenantId: tenant.id });
    res.json(tenant);
  })
);

router.post(
  '/tenants/:id/reactivate',
  asyncHandler(async (req: AuthedRequest, res) => {
    const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' } });
    await audit({ req: req as never, action: 'platform.tenant_reactivated', entityType: 'Tenant', entityId: tenant.id, tenantId: tenant.id });
    res.json(tenant);
  })
);

// ───────────────────────── Branches & licenses ─────────────────────────

router.post(
  '/tenants/:id/branches',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { name, location, phone } = z
      .object({ name: z.string().min(2), location: z.string().optional(), phone: z.string().optional() })
      .parse(req.body);
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) throw ApiError.notFound('Tenant not found');

    const branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name,
        location,
        phone,
        license: { create: { status: 'TRIAL', trialEndsAt: new Date(Date.now() + config.trialDays * 24 * 3600 * 1000) } },
      },
      include: { license: true },
    });
    await audit({ req: req as never, action: 'platform.branch_created', entityType: 'Branch', entityId: branch.id, tenantId: tenant.id, detail: { name } });
    res.status(201).json(branch);
  })
);

router.patch(
  '/branches/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = z
      .object({ name: z.string().min(2).optional(), location: z.string().optional(), phone: z.string().optional(), isActive: z.boolean().optional() })
      .parse(req.body);
    const branch = await prisma.branch.update({ where: { id: req.params.id }, data });
    await audit({ req: req as never, action: 'platform.branch_updated', entityType: 'Branch', entityId: branch.id, tenantId: branch.tenantId, detail: data as Record<string, unknown> });
    res.json(branch);
  })
);

/** Issue / renew a license by recording a manual payment (Telebirr etc.) */
router.post(
  '/branches/:id/license',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { months, amountEtb, method, referenceNo, note } = z
      .object({
        months: z.number().int().min(1).max(36),
        amountEtb: z.number().positive().optional(),
        method: z.string().default('telebirr'),
        referenceNo: z.string().optional(),
        note: z.string().optional(),
      })
      .parse(req.body);

    const branch = await prisma.branch.findUnique({ where: { id: req.params.id }, include: { license: true } });
    if (!branch) throw ApiError.notFound('Branch not found');

    const now = new Date();
    const current = branch.license?.paidUntil && branch.license.paidUntil > now ? branch.license.paidUntil : now;
    const periodStart = current;
    const periodEnd = new Date(current);
    periodEnd.setMonth(periodEnd.getMonth() + months);
    const amount = amountEtb ?? months * config.pricePerBranchPerMonth;

    const [payment, license] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          tenantId: branch.tenantId,
          branchId: branch.id,
          amountEtb: amount,
          method,
          referenceNo,
          monthsPaid: months,
          periodStart,
          periodEnd,
          note,
          recordedBy: req.user!.id,
          recordedByName: req.user!.username,
        },
      }),
      prisma.branchLicense.upsert({
        where: { branchId: branch.id },
        create: { branchId: branch.id, status: 'ACTIVE', paidUntil: periodEnd },
        update: { status: 'ACTIVE', paidUntil: periodEnd },
      }),
    ]);

    await audit({
      req: req as never,
      action: 'platform.license_issued',
      entityType: 'BranchLicense',
      entityId: license.id,
      tenantId: branch.tenantId,
      detail: { branchId: branch.id, months, amount, method },
    });
    res.status(201).json({ payment, license });
  })
);

router.delete(
  '/branches/:id/license',
  asyncHandler(async (req: AuthedRequest, res) => {
    const branch = await prisma.branch.findUnique({ where: { id: req.params.id } });
    if (!branch) throw ApiError.notFound('Branch not found');
    const license = await prisma.branchLicense.upsert({
      where: { branchId: branch.id },
      create: { branchId: branch.id, status: 'EXPIRED' },
      update: { status: 'EXPIRED', paidUntil: new Date(Date.now() - 8 * 24 * 3600 * 1000), trialEndsAt: null },
    });
    await audit({ req: req as never, action: 'platform.license_revoked', entityType: 'BranchLicense', entityId: license.id, tenantId: branch.tenantId });
    res.json(license);
  })
);

// ───────────────────────── Payments ─────────────────────────

router.get(
  '/payments',
  asyncHandler(async (req: AuthedRequest, res) => {
    const tenantId = req.query.tenantId as string | undefined;
    const payments = await prisma.payment.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: { tenant: { select: { name: true } }, branch: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(payments);
  })
);

// ───────────────────────── Audit ─────────────────────────

router.get(
  '/audit',
  asyncHandler(async (_req: AuthedRequest, res) => {
    const logs = await prisma.auditLog.findMany({
      where: { action: { startsWith: 'platform.' } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(logs);
  })
);

// ───────────────────────── Impersonation ─────────────────────────

router.post(
  '/tenants/:id/impersonate',
  asyncHandler(async (req: AuthedRequest, res) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) throw ApiError.notFound('Tenant not found');
    const owner = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: { in: ['OWNER', 'ADMIN'] }, isActive: true },
      orderBy: { role: 'asc' },
    });
    if (!owner) throw ApiError.notFound('This tenant has no active admin user');

    const accessToken = signAccessToken({
      sub: owner.id,
      role: owner.role,
      tenantId: owner.tenantId,
      impersonatedBy: req.user!.id,
    });
    const refresh = await issueRefreshToken(owner.id);

    await audit({
      req: req as never,
      action: 'platform.impersonate',
      entityType: 'Tenant',
      entityId: tenant.id,
      tenantId: tenant.id,
      detail: { asUser: owner.username },
    });

    res.json({
      accessToken,
      refreshToken: refresh,
      impersonated: true,
      user: { id: owner.id, username: owner.username, fullName: owner.fullName, role: owner.role, email: owner.email, phone: owner.phone },
      tenant: { id: tenant.id, name: tenant.name, status: tenant.status, settings: tenant.settings },
      branches: (await prisma.branch.findMany({ where: { tenantId: tenant.id, isActive: true }, include: { license: true }, orderBy: { name: 'asc' } })).map((b) => {
        const lic = effectiveLicense(b.license);
        return { id: b.id, name: b.name, location: b.location, license: { status: lic.status, paidUntil: lic.paidUntil, trialEndsAt: lic.trialEndsAt } };
      }),
    });
  })
);

export default router;
