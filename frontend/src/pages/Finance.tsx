import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { apiGet, apiPost } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { money, dateStr, errMsg } from '../lib/format';
import { PageHeader, StatCard, Modal, Btn, Th, Td, EmptyState, BarChart } from '../components/ui';
import { Plus, Download, Lock, DollarSign } from 'lucide-react';
import type { Expense, FinanceSummary, SalesReport, Sale } from '../lib/types';

const Finance: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const branchId = currentBranch?.id;
  const [range, setRange] = useState('month');
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const allowed = ['OWNER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role || '');

  const { data: summary } = useApi<FinanceSummary>(() => apiGet(`/finance/summary?range=${range}${branchId ? `&branchId=${branchId}` : ''}`), [range, branchId, tab]);
  const { data: expenses, reload: reloadExpenses } = useApi<{ items: Expense[] }>(() => apiGet(`/finance/expenses?limit=50${branchId ? `&branchId=${branchId}` : ''}`), [tab, branchId]);
  const { data: cashiers } = useApi<{ cashierId: string; name: string; total: number; count: number; share: number }[]>(
    () => apiGet(`/finance/cashiers?range=${range}`),
    [range, tab]
  );
  const { data: salesReport } = useApi<SalesReport>(() => apiGet(`/reports/sales?range=${range}${branchId ? `&branchId=${branchId}` : ''}`), [range, tab]);
  const { data: recentSales } = useApi<{ items: Sale[] }>(() => apiGet(`/pos/sales?limit=20${branchId ? `&branchId=${branchId}` : ''}`), [tab, branchId]);

  const [showExpense, setShowExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'Rent', amount: 0, description: '' });

  if (!allowed) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="card-dark p-10 text-center max-w-sm">
            <div className="w-16 h-16 bg-lime rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-ink" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Access denied</h2>
            <p className="text-white/50 mt-2 text-sm">Only owners, admins and accountants can access finance.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const addExpense = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPost('/finance/expenses', { branchId, category: expenseForm.category, amount: expenseForm.amount, description: expenseForm.description || undefined });
      setShowExpense(false);
      setExpenseForm({ category: 'Rent', amount: 0, description: '' });
      reloadExpenses();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const exportCSV = () => {
    const rows = recentSales?.items || [];
    const csv = ['Receipt,Date,Customer,Total,Method,Status', ...rows.map((s) => `${s.receiptNo},${new Date(s.createdAt).toISOString()},"${s.customerName || 'Walk-in'}",${s.total},${s.paymentMethod},${s.status}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `finance_${range}.csv`;
    a.click();
  };

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Finance"
          subtitle="Revenue, expenses and profitability"
          actions={
            <>
              <Btn variant="ghost" onClick={exportCSV}><Download className="w-4 h-4" /> Export</Btn>
              <Btn variant="dark" onClick={() => setShowExpense(true)}><Plus className="w-5 h-5" />Add Expense</Btn>
            </>
          }
        />

        {error && <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl text-sm text-[#a34141] font-medium">{error}</div>}

        <div className="card p-4 flex flex-wrap items-center gap-3">
          <select className="input sm:w-44" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Revenue" value={money(summary?.revenue)} icon={DollarSign} tone="mint" sub={`${summary?.saleCount || 0} sales`} />
          <StatCard label="Refunds" value={money(summary?.refunds)} icon={DollarSign} tone="blush" />
          <StatCard label="Expenses" value={money(summary?.expenses)} icon={DollarSign} tone="sun" />
          <StatCard label="Net" value={money(summary?.net)} icon={DollarSign} tone={(summary?.net || 0) >= 0 ? 'lime' : 'blush'} sub={`credit out: ${money(summary?.creditOutstanding)}`} />
        </div>

        <div className="flex gap-1 bg-cream-deep/60 p-1 rounded-full w-fit max-w-full overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'expenses', label: 'Expenses' },
            { id: 'cashiers', label: 'Cashier report' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-full text-sm font-semibold shrink-0 ${tab === t.id ? 'bg-ink text-white shadow-card' : 'text-stone-500'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-5">
            <div className="card p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">Sales trend</p>
              {salesReport?.byDay?.length ? (
                <BarChart data={salesReport.byDay.slice(-14).map((d) => ({ label: new Date(d.day).getDate().toString(), value: d.total }))} format={(v) => money(v).replace('.00', '')} />
              ) : (
                <p className="text-sm text-stone-400 text-center py-8">No sales in this period yet</p>
              )}
            </div>
            <div className="card p-5">
              <h3 className="font-extrabold tracking-tight text-ink mb-4">Income by payment method</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {summary?.byMethod.map((m) => (
                  <div key={m.method} className="p-3 bg-cream-soft border border-line rounded-2xl">
                    <p className="text-[11px] font-semibold text-stone-400 capitalize truncate">{m.method}</p>
                    <p className="font-extrabold text-ink">{money(m.total)}</p>
                    <p className="text-[10px] text-stone-400">{m.count} txns</p>
                  </div>
                ))}
                {summary?.byMethod.length === 0 && <p className="text-sm text-stone-400">No income yet</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'expenses' && (
          <div className="card divide-y divide-cream-deep/70">
            {expenses?.items.map((e) => (
              <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm text-ink">{e.category}</p>
                  <p className="text-xs text-stone-400">{e.description || '—'} · {dateStr(e.spentAt)} · by {e.recordedByName}</p>
                </div>
                <p className="font-extrabold text-[#a34141]">-{money(e.amount)}</p>
              </div>
            ))}
            {expenses?.items.length === 0 && <EmptyState icon={DollarSign} title="No expenses recorded" />}
          </div>
        )}

        {tab === 'cashiers' && (
          <div className="card overflow-hidden">
            <table className="w-full min-w-[560px]">
              <thead className="bg-cream-soft border-b border-line">
                <tr><Th>Cashier</Th><Th className="text-right">Transactions</Th><Th className="text-right">Total collected</Th><Th>Share</Th></tr>
              </thead>
              <tbody className="divide-y divide-cream-deep/70">
                {cashiers?.map((c) => (
                  <tr key={c.cashierId} className="hover:bg-cream-soft">
                    <Td className="font-bold text-ink capitalize">{c.name}</Td>
                    <Td className="text-right">{c.count}</Td>
                    <Td className="text-right font-extrabold text-[#2f6b46]">{money(c.total)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-cream-deep rounded-full h-2 max-w-[120px]">
                          <div className="bg-lime h-2 rounded-full" style={{ width: `${c.share}%` }} />
                        </div>
                        <span className="text-xs text-stone-400 font-semibold">{c.share}%</span>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cashiers?.length === 0 && <EmptyState icon={DollarSign} title="No cashier activity in this period" />}
          </div>
        )}
      </div>

      {/* Add expense */}
      <Modal
        open={showExpense}
        onClose={() => setShowExpense(false)}
        title="Add expense"
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setShowExpense(false)}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={addExpense} disabled={busy || expenseForm.amount <= 0}>{busy ? 'Saving…' : 'Save'}</Btn>
          </>
        }
      >
        <select className="input" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
          {['Rent', 'Salaries', 'Utilities', 'Transport', 'Supplies', 'Other'].map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="number" min="0" className="input" placeholder="Amount *" value={expenseForm.amount || ''} onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })} />
        <input className="input" placeholder="Description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
      </Modal>
    </Layout>
  );
};

export default Finance;
