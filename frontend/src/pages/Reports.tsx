import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { apiGet } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { money, dateStr } from '../lib/format';
import { PageHeader, Chip, EmptyState, BarChart, Th, Td, Btn } from '../components/ui';
import { Download, Lock, TrendingUp, Package, Calendar, Ghost } from 'lucide-react';
import type { SalesReport } from '../lib/types';

interface InvReport {
  totalUnits: number;
  totalCost: number;
  totalRetail: number;
  expectedMargin: number;
  byBranch: { branchId: string; cost: number; retail: number; units: number }[];
}

interface ExpiryReport {
  expired: { batchId: string; product: string; branch: string; batchNo: string; expiryDate: string; qty: number; valueAtCost: number }[];
  soon: { batchId: string; product: string; branch: string; batchNo: string; expiryDate: string; qty: number; valueAtCost: number }[];
}

interface DeadStockRow { name: string; branch: string; qty: number; value: number }

const Reports: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [range, setRange] = useState('month');
  const [tab, setTab] = useState('sales');
  const allowed = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER'].includes(user?.role || '');

  const branchQ = currentBranch ? `&branchId=${currentBranch.id}` : '';
  const { data: sales } = useApi<SalesReport>(() => apiGet(`/reports/sales?range=${range}${branchQ}`), [range, tab]);
  const { data: inv, loading: invLoading } = useApi<InvReport>(() => apiGet(`/reports/inventory${branchQ}`), [tab]);
  const { data: expiry } = useApi<ExpiryReport>(() => apiGet(`/reports/expiry?days=90${branchQ}`), [tab]);
  const { data: dead } = useApi<DeadStockRow[]>(() => apiGet(`/reports/dead-stock?days=30${branchQ}`), [tab]);

  if (!allowed) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="card-dark p-10 text-center max-w-sm">
            <div className="w-16 h-16 bg-lime rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-ink" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Access denied</h2>
            <p className="text-white/50 mt-2 text-sm">Your role cannot access reports.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const exportCSV = () => {
    let csv = '';
    if (tab === 'sales' && sales) {
      csv = ['Day,Total,Transactions', ...sales.byDay.map((d) => `${new Date(d.day).toISOString().slice(0, 10)},${d.total},${d.count}`)].join('\n');
    } else if (tab === 'expiry' && expiry) {
      csv = ['Product,Batch,Branch,Expiry,Qty,ValueAtCost', ...[...expiry.expired, ...expiry.soon].map((b) => `"${b.product}",${b.batchNo},${b.branch},${b.expiryDate.slice(0, 10)},${b.qty},${b.valueAtCost}`)].join('\n');
    }
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${tab}_report.csv`;
    a.click();
  };

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Reports"
          subtitle={currentBranch ? `Reports for ${currentBranch.name}` : 'Reports across your branches'}
          actions={<Btn variant="dark" onClick={exportCSV}><Download className="w-5 h-5" />Export CSV</Btn>}
        />

        <div className="card p-4">
          <select className="input sm:w-44" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </div>

        <div className="flex gap-1 bg-cream-deep/60 p-1 rounded-full w-fit max-w-full overflow-x-auto">
          {[
            { id: 'sales', label: 'Sales', icon: TrendingUp },
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'expiry', label: 'Expiry', icon: Calendar },
            { id: 'dead', label: 'Dead stock', icon: Ghost },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-full text-sm font-semibold shrink-0 flex items-center gap-1.5 ${tab === t.id ? 'bg-ink text-white shadow-card' : 'text-stone-500'}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {tab === 'sales' && sales && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-lime-soft p-4 rounded-2xl border border-lime/30"><p className="text-xs font-bold text-[#5c6b12] uppercase tracking-wider">Total sales</p><p className="text-2xl font-extrabold text-ink">{money(sales.total)}</p></div>
              <div className="bg-sky-soft p-4 rounded-2xl border border-sky/40"><p className="text-xs font-bold text-[#3d5a94] uppercase tracking-wider">Transactions</p><p className="text-2xl font-extrabold text-ink">{sales.count}</p></div>
              <div className="bg-lav-soft p-4 rounded-2xl border border-lav/40"><p className="text-xs font-bold text-[#5d4394] uppercase tracking-wider">Average sale</p><p className="text-2xl font-extrabold text-ink">{money(sales.average)}</p></div>
            </div>
            <div className="card p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">Daily sales</p>
              {sales.byDay.length ? (
                <BarChart data={sales.byDay.slice(-21).map((d) => ({ label: new Date(d.day).getDate().toString(), value: d.total }))} format={(v) => `${Math.round(v / 100) / 10}k`} height={180} />
              ) : (
                <p className="text-sm text-stone-400 text-center py-8">No sales in this period</p>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-5">
                <h3 className="font-extrabold tracking-tight text-ink mb-3">Top products</h3>
                {sales.topProducts.length ? sales.topProducts.map((p, i) => (
                  <div key={p.name} className="flex justify-between py-2 border-b border-cream-deep/50 last:border-0 text-sm">
                    <span className="text-stone-500 truncate"><b className="text-ink">#{i + 1}</b> {p.name}</span>
                    <span className="font-bold text-ink shrink-0 ml-2">{money(p.total)} <span className="text-stone-400 font-normal">· {Math.round(p.qty * 100) / 100} sold</span></span>
                  </div>
                )) : <p className="text-sm text-stone-400">No data yet</p>}
              </div>
              <div className="card p-5">
                <h3 className="font-extrabold tracking-tight text-ink mb-3">By category</h3>
                {sales.byCategory.length ? sales.byCategory.map((c) => (
                  <div key={c.category} className="flex justify-between py-2 border-b border-cream-deep/50 last:border-0 text-sm">
                    <span className="text-stone-500">{c.category}</span>
                    <span className="font-bold text-ink">{money(c.total)}</span>
                  </div>
                )) : <p className="text-sm text-stone-400">No data yet</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'inventory' && (
          <div className="space-y-4">
            {invLoading || !inv ? (
              <div className="card p-8 text-center text-stone-400">Calculating…</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-sky-soft p-4 rounded-2xl border border-sky/40"><p className="text-xs font-bold text-[#3d5a94] uppercase tracking-wider">Units in stock</p><p className="text-2xl font-extrabold text-ink">{inv.totalUnits}</p></div>
                  <div className="bg-lav-soft p-4 rounded-2xl border border-lav/40"><p className="text-xs font-bold text-[#5d4394] uppercase tracking-wider">Value at cost</p><p className="text-2xl font-extrabold text-ink">{money(inv.totalCost)}</p></div>
                  <div className="bg-mint-soft p-4 rounded-2xl border border-mint/40"><p className="text-xs font-bold text-[#2f6b46] uppercase tracking-wider">Value at retail</p><p className="text-2xl font-extrabold text-ink">{money(inv.totalRetail)}</p></div>
                  <div className="bg-lime-soft p-4 rounded-2xl border border-lime/30"><p className="text-xs font-bold text-[#5c6b12] uppercase tracking-wider">Expected margin</p><p className="text-2xl font-extrabold text-ink">{money(inv.expectedMargin)}</p></div>
                </div>
                {inv.byBranch.length > 1 && (
                  <div className="card p-5">
                    <h3 className="font-extrabold tracking-tight text-ink mb-3">By branch</h3>
                    {inv.byBranch.map((b) => (
                      <div key={b.branchId} className="flex justify-between py-2 border-b border-cream-deep/50 last:border-0 text-sm">
                        <span className="text-stone-500">{b.units} units</span>
                        <span className="font-bold text-ink">cost {money(b.cost)} · retail {money(b.retail)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'expiry' && expiry && (
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-extrabold tracking-tight text-ink mb-3">Expired <Chip tone="blush">{expiry.expired.length}</Chip></h3>
              {expiry.expired.length ? expiry.expired.map((b) => (
                <div key={b.batchId} className="flex justify-between py-2 border-b border-cream-deep/50 last:border-0 text-sm">
                  <span className="text-stone-500 truncate">{b.product} · {b.batchNo}</span>
                  <span className="font-bold text-[#a34141] shrink-0">{b.qty} left · {dateStr(b.expiryDate)}</span>
                </div>
              )) : <p className="text-sm text-stone-400">Nothing expired 🎉</p>}
            </div>
            <div className="card p-5">
              <h3 className="font-extrabold tracking-tight text-ink mb-3">Expiring within 90 days <Chip tone="sun">{expiry.soon.length}</Chip></h3>
              {expiry.soon.length ? expiry.soon.map((b) => (
                <div key={b.batchId} className="flex justify-between py-2 border-b border-cream-deep/50 last:border-0 text-sm">
                  <span className="text-stone-500 truncate">{b.product} · {b.batchNo}</span>
                  <span className="font-bold text-[#8a6d10] shrink-0">{b.qty} left · {dateStr(b.expiryDate)}</span>
                </div>
              )) : <p className="text-sm text-stone-400">Nothing expiring soon</p>}
            </div>
          </div>
        )}

        {tab === 'dead' && (
          <div className="card overflow-hidden">
            <table className="w-full min-w-[520px]">
              <thead className="bg-cream-soft border-b border-line">
                <tr><Th>Product</Th><Th>Branch</Th><Th>Qty stuck</Th><Th>Value at cost</Th></tr>
              </thead>
              <tbody className="divide-y divide-cream-deep/70">
                {dead?.map((d, i) => (
                  <tr key={i} className="hover:bg-cream-soft">
                    <Td className="font-bold text-ink">{d.name}</Td>
                    <Td className="text-stone-500">{d.branch}</Td>
                    <Td>{d.qty}</Td>
                    <Td className="font-extrabold text-ink">{money(d.value)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dead?.length === 0 && <EmptyState icon={Ghost} title="No dead stock — everything is moving 🎉" />}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
