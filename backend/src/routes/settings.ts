import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler, ApiError } from '../utils/errors';
import { tenantRouter, gateWrite, type AuthedRequest } from './helpers';
import { audit } from '../utils/audit';

const router = tenantRouter();

router.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantCtx!.tenantId } });
    if (!tenant) throw ApiError.notFound('Tenant not found');
    res.json({ name: tenant.name, phone: tenant.phone, address: tenant.address, settings: tenant.settings });
  })
);

router.patch(
  '/',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!['OWNER', 'ADMIN'].includes(req.tenantCtx!.user.role)) {
      throw ApiError.forbidden('Only owners/admins can change settings');
    }
    const data = z
      .object({
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        settings: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    const current = await prisma.tenant.findUnique({ where: { id: req.tenantCtx!.tenantId } });
    const tenant = await prisma.tenant.update({
      where: { id: req.tenantCtx!.tenantId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.settings ? { settings: { ...(current?.settings as Record<string, unknown>), ...data.settings } as object } : {}),
      },
    });
    await audit({ req: req as never, action: 'settings.updated', entityType: 'Tenant', entityId: tenant.id, tenantId: tenant.id, detail: { fields: Object.keys(data) } });
    res.json({ name: tenant.name, phone: tenant.phone, address: tenant.address, settings: tenant.settings });
  })
);

export default router;
