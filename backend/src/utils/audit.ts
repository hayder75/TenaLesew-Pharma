import type { Request } from 'express';
import { prisma } from '../db';

interface AuditInput {
  req: Request;
  action: string;
  entityType?: string;
  entityId?: string;
  tenantId?: string | null;
  branchId?: string | null;
  detail?: Record<string, unknown>;
}

/** Fire-and-forget audit logging — never blocks or breaks the request */
export const audit = async ({ req, action, entityType, entityId, tenantId, branchId, detail }: AuditInput) => {
  try {
    const user = (req as any).user;
    await prisma.auditLog.create({
      data: {
        tenantId: tenantId ?? user?.tenantId ?? null,
        branchId: branchId ?? null,
        actorId: user?.sub ?? null,
        actorLabel: user?.username ?? null,
        action,
        entityType,
        entityId,
        detail: (detail ?? undefined) as object | undefined,
        ip: req.ip,
      },
    });
  } catch (err) {
    console.error('audit log failed:', (err as Error).message);
  }
};
