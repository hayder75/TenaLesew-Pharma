import React from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { apiGet } from '../../lib/api';
import { etb, dateStr } from '../../lib/format';
import { StatCard, Chip } from '../../components/ui';
import { Building2, Package, DollarSign, AlertTriangle, ArrowRight } from 'lucide-react';
import type { PlatformOverview } from '../../lib/types';

const Overview: React.FC = () => {
  const { data } = useApi<PlatformOverview>(() => apiGet('/platform/overview'), []);

  if (!data) return <div className="card p-8 text-center text-stone-400">Loading overview…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">
          Platform <span className="bg-lime px-2 rounded-lg">overview</span>
        </h1>
        <p className="text-sm text-stone-500 mt-0.5">Everything happening across your pharmacies.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pharmacies" value={data.tenants.total} icon={Building2} tone="sky" sub={`${data.tenants.active} active · ${data.tenants.suspended} suspended`} />
        <StatCard label="Branches" value={data.branches.total} icon={Package} tone="lav" sub={`${data.branches.active} licensed · ${data.branches.expired} expired`} />
        <StatCard label="Sales today" value={etb(data.sales.todayTotal)} icon={DollarSign} tone="lime" sub={`${data.sales.todayCount} transactions`} dark />
        <StatCard label="Sales this month" value={etb(data.sales.monthTotal)} icon={DollarSign} tone="mint" sub={`${data.sales.monthCount} transactions`} />
      </div>

      {data.expiringLicenses.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blush-soft rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#a34141]" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight text-ink">Licenses needing attention</h2>
              <p className="text-xs text-stone-400">Expiring within 7 days or already expired</p>
            </div>
          </div>
          <div className="space-y-2">
            {data.expiringLicenses.map((l) => (
              <div key={l.branchId} className="flex items-center justify-between p-3 bg-cream-soft border border-line rounded-2xl">
                <div>
                  <p className="font-bold text-sm text-ink">{l.tenantName} — {l.branchName}</p>
                  <p className="text-xs text-stone-400">
                    {l.license.paidUntil ? `Paid until ${dateStr(l.license.paidUntil)}` : l.license.trialEndsAt ? `Trial ends ${dateStr(l.license.trialEndsAt)}` : 'No license'}
                  </p>
                </div>
                <Chip tone={l.license.status === 'EXPIRED' ? 'blush' : 'sun'}>{l.license.status.toLowerCase()}</Chip>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-extrabold tracking-tight text-ink">Newest pharmacies</h2>
          <Link to="/platform/tenants" className="text-sm font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4 flex items-center gap-1">
            All pharmacies <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-2">
          {data.recentTenants.map((t) => (
            <Link key={t.id} to={`/platform/tenants/${t.id}`} className="flex items-center justify-between p-3 bg-cream-soft border border-line rounded-2xl hover:border-lime">
              <div>
                <p className="font-bold text-sm text-ink">{t.name}</p>
                <p className="text-xs text-stone-400">Joined {dateStr(t.createdAt)}</p>
              </div>
              <Chip tone={t.status === 'ACTIVE' ? 'mint' : 'blush'}>{t.status.toLowerCase()}</Chip>
            </Link>
          ))}
          {data.recentTenants.length === 0 && <p className="text-sm text-stone-400 text-center py-4">No pharmacies yet</p>}
        </div>
      </div>
    </div>
  );
};

export default Overview;
