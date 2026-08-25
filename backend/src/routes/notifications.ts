import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler } from '../utils/errors';
import { tenantRouter, type AuthedRequest } from './helpers';

const router = tenantRouter();

router.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const ctx = req.tenantCtx!;
    const notifications = await prisma.notification.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { branchId: null, role: null },
          { role: ctx.user.role, branchId: null },
          ...(ctx.branchIds ? [{ branchId: { in: ctx.branchIds } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unread = notifications.filter((n) => !n.readAt).length;
    res.json({ items: notifications, unread });
  })
);

router.post(
  '/read',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
    await prisma.notification.updateMany({
      where: { id: { in: ids }, tenantId: req.tenantCtx!.tenantId },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  })
);

export default router;
