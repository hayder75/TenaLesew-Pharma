import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../utils/errors';
import { tenantRouter, gateWrite, resolveBranch, type AuthedRequest } from './helpers';
import { audit } from '../utils/audit';
import { getPagination, paged } from '../utils/helpers';
import path from 'path';
import fs from 'fs';

const router = tenantRouter();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const rxSchema = z.object({
  branchId: z.string(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional(),
  phone: z.string().optional(),
  doctorName: z.string().optional(),
  notes: z.string().optional(),
  photoBase64: z.string().optional(), // data URL or raw base64 (small images)
});

router.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = getPagination(req, 50);
    const branchId = req.query.branchId as string | undefined;
    const status = req.query.status as string | undefined;
    const search = (req.query.search as string)?.trim();
    const allowed = req.tenantCtx!.branchIds;
    const where = {
      tenantId: req.tenantCtx!.tenantId,
      ...(branchId ? { branchId } : {}),
      ...(allowed ? { branchId: { in: allowed } } : {}),
      ...(status ? { status: status as never } : {}),
      ...(search ? { OR: [{ customerName: { contains: search, mode: 'insensitive' as const } }, { phone: { contains: search } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.prescription.findMany({ where, orderBy: { createdAt: 'desc' }, skip: page.skip, take: page.limit }),
      prisma.prescription.count({ where }),
    ]);
    res.json(paged(items, total, page));
  })
);

router.post(
  '/',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = rxSchema.parse(req.body);
    const branch = await resolveBranch(req.tenantCtx!, data.branchId);

    let photoPath: string | undefined;
    if (data.photoBase64) {
      const match = data.photoBase64.match(/^data:image\/(\w+);base64,(.+)$/);
      const ext = match ? match[1] : 'png';
      const b64 = match ? match[2] : data.photoBase64;
      if (b64.length > 8_000_000) throw ApiError.badRequest('Photo too large (max ~6MB)');
      const fileName = `${req.tenantCtx!.tenantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = path.join(UPLOAD_DIR, fileName);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
      photoPath = fileName;
    }

    const prescription = await prisma.prescription.create({
      data: {
        tenantId: req.tenantCtx!.tenantId,
        branchId: branch.id,
        customerId: data.customerId || undefined,
        customerName: data.customerName,
        phone: data.phone,
        photoPath,
        doctorName: data.doctorName,
        notes: data.notes,
        createdBy: req.tenantCtx!.user.id,
        createdByName: req.tenantCtx!.user.username,
      },
    });
    await audit({ req: req as never, action: 'rx.created', entityType: 'Prescription', entityId: prescription.id, tenantId: req.tenantCtx!.tenantId, branchId: branch.id });
    res.status(201).json(prescription);
  })
);

/** Serve a prescription photo (authenticated, tenant-scoped) */
router.get(
  '/:id/photo',
  asyncHandler(async (req: AuthedRequest, res) => {
    const rx = await prisma.prescription.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!rx?.photoPath) throw ApiError.notFound('Photo not found');
    const filePath = path.join(UPLOAD_DIR, rx.photoPath);
    if (!fs.existsSync(filePath)) throw ApiError.notFound('Photo file missing');
    res.sendFile(filePath);
  })
);

router.post(
  '/:id/verify',
  gateWrite,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'PHARMACIST'].includes(req.tenantCtx!.user.role)) {
      throw ApiError.forbidden('Only pharmacists can verify prescriptions');
    }
    const rx = await prisma.prescription.findFirst({ where: { id: req.params.id, tenantId: req.tenantCtx!.tenantId } });
    if (!rx) throw ApiError.notFound('Prescription not found');
    if (rx.status !== 'RECEIVED') throw ApiError.badRequest(`Prescription is ${rx.status}`);
    const updated = await prisma.prescription.update({
      where: { id: rx.id },
      data: { status: 'VERIFIED', verifiedBy: req.tenantCtx!.user.id, verifiedByName: req.tenantCtx!.user.username },
    });
    await audit({ req: req as never, action: 'rx.verified', entityType: 'Prescription', entityId: rx.id, tenantId: req.tenantCtx!.tenantId });
    res.json(updated);
  })
);

export default router;
