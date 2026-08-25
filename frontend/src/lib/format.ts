export const money = (n: number | null | undefined) =>
  `$${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const etb = (n: number | null | undefined) =>
  `${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;

export const dateStr = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const dateTimeStr = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const timeAgo = (d: string | Date | null | undefined) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return dateStr(d);
};

export const errMsg = (e: unknown): string =>
  e instanceof Error ? e.message : 'Something went wrong';
