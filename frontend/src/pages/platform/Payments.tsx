import React from 'react';
import { useApi } from '../../hooks/useApi';
import { apiGet } from '../../lib/api';
import { etb, dateStr, dateTimeStr } from '../../lib/format';
import { Chip, EmptyState } from '../../components/ui';
import { CreditCard } from 'lucide-react';
import type { PlatformPayment } from '../../lib/types';

const Payments: React.FC = () => {
  const { data: payments, loading } = useApi<PlatformPayment[]>(() => apiGet('/platform/payments'), []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Payments</h1>
        <p className="text-sm text-stone-500 mt-0.5">Every Telebirr/manual payment recorded across the platform</p>
      </div>

      {loading && <div className="card p-8 text-center text-stone-400">Loading…</div>}

      <div className="card overflow-hidden hidden md:block">
        <table className="w-full min-w-[720px]">
          <thead className="bg-cream-soft border-b border-line">
            <tr>
              {['Date', 'Pharmacy', 'Branch', 'Amount', 'Method', 'Period', 'Ref'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-deep/70">
            {payments?.map((p) => (
              <tr key={p.id} className="hover:bg-cream-soft">
                <td className="px-4 py-3 text-sm text-stone-500">{dateTimeStr(p.createdAt)}</td>
                <td className="px-4 py-3 font-bold text-ink">{p.tenant.name}</td>
                <td className="px-4 py-3 text-stone-500">{p.branch?.name || '—'}</td>
                <td className="px-4 py-3 font-extrabold text-ink">{etb(p.amountEtb)}</td>
                <td className="px-4 py-3"><Chip tone="lime">{p.method}</Chip></td>
                <td className="px-4 py-3 text-xs text-stone-400">until {dateStr(p.periodEnd)}</td>
                <td className="px-4 py-3 text-xs font-mono text-stone-400">{p.referenceNo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments?.length === 0 && <EmptyState icon={CreditCard} title="No payments recorded yet" />}
      </div>

      <div className="md:hidden space-y-3">
        {payments?.map((p) => (
          <div key={p.id} className="card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-ink truncate">{p.tenant.name} — {p.branch?.name || '—'}</p>
              <p className="text-xs text-stone-400">{dateTimeStr(p.createdAt)} · {p.method}{p.referenceNo ? ` · ${p.referenceNo}` : ''}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-extrabold text-ink">{etb(p.amountEtb)}</p>
              <p className="text-[11px] text-stone-400">until {dateStr(p.periodEnd)}</p>
            </div>
          </div>
        ))}
        {!loading && payments?.length === 0 && <div className="card"><EmptyState icon={CreditCard} title="No payments yet" /></div>}
      </div>
    </div>
  );
};

export default Payments;
