import { Request } from 'express';

export const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}

export const getPagination = (req: Request, defaultLimit = 50): PageParams => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

export const paged = <T>(items: T[], total: number, { page, limit }: PageParams) => ({
  items,
  total,
  page,
  pages: Math.ceil(total / limit) || 1,
});

/** Generates the next receipt number for a branch: BR-<branchShort>-000001 */
export const nextReceiptNo = async (
  tx: { sale: { count: (args: object) => Promise<number> } },
  tenantId: string,
  branchId: string
) => {
  const count = await tx.sale.count({ where: { tenantId, branchId } });
  const seq = String(count + 1).padStart(6, '0');
  return `R-${branchId.slice(0, 4).toUpperCase()}-${seq}`;
};

export const parseDate = (value: unknown): Date | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
};

export const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const dateRangeFromQuery = (range: string | undefined) => {
  const now = new Date();
  const start = new Date();
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setMonth(now.getMonth() - 1);
  }
  return { start, end: now };
};
