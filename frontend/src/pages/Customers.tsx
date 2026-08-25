import React, { useState } from 'react';
import Layout from '../components/Layout';
import { apiGet, apiPost } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { money, dateStr, errMsg } from '../lib/format';
import { PageHeader, StatCard, Chip, Modal, Btn, Th, Td, EmptyState, Avatar } from '../components/ui';
import { Search, Plus, Users, CreditCard, Wallet } from 'lucide-react';
import type { Customer } from '../lib/types';

const Customers: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, reload } = useApi<{ items: Customer[]; total: number }>(
    () => apiGet(`/customers?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}${filterType !== 'all' ? `&type=${filterType}` : ''}`),
    [search, filterType]
  );

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', isWholesale: false, creditLimit: 0 });
  const [detail, setDetail] = useState<Customer | null>(null);
  const [collectAmount, setCollectAmount] = useState('');

  const addCustomer = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPost('/customers', { ...form, email: form.email || undefined });
      setShowAdd(false);
      setForm({ name: '', phone: '', email: '', isWholesale: false, creditLimit: 0 });
      reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (c: Customer) => {
    setError('');
    try {
      const full = await apiGet<Customer>(`/customers/${c.id}`);
      setDetail(full);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const collect = async () => {
    if (!detail) return;
    setBusy(true);
    setError('');
    try {
      await apiPost(`/customers/${detail.id}/payments`, { amount: parseFloat(collectAmount) || 0, method: 'cash' });
      setDetail(null);
      setCollectAmount('');
      reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const items = data?.items || [];

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Customers"
          subtitle="Retail customers and wholesale credit clients"
          actions={<Btn variant="dark" onClick={() => setShowAdd(true)}><Plus className="w-5 h-5" />Add Customer</Btn>}
        />

        {error && <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl text-sm text-[#a34141] font-medium">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Total" value={data?.total || 0} icon={Users} tone="sky" />
          <StatCard label="Retail" value={items.filter((c) => !c.isWholesale).length} icon={Users} tone="mint" />
          <StatCard label="Wholesale" value={items.filter((c) => c.isWholesale).length} icon={Users} tone="lav" />
          <StatCard label="Credit outstanding" value={money(items.reduce((s, c) => s + c.creditBalance, 0))} icon={CreditCard} tone="blush" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input className="input !rounded-full !pl-10" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input sm:w-44" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All types</option>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </div>

        {loading && <div className="card p-8 text-center text-stone-400">Loading…</div>}

        <div className="card overflow-hidden hidden md:block">
          <table className="w-full min-w-[680px]">
            <thead className="bg-cream-soft border-b border-line">
              <tr><Th>Customer</Th><Th>Phone</Th><Th>Type</Th><Th>Credit balance</Th><Th className="text-right">Actions</Th></tr>
            </thead>
            <tbody className="divide-y divide-cream-deep/70">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-cream-soft">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={c.name} tone={c.isWholesale ? 'lav' : 'lime'} size="sm" />
                      <div>
                        <div className="font-bold text-ink">{c.name}</div>
                        <div className="text-xs text-stone-400">since {dateStr(c.createdAt)}</div>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-stone-500">{c.phone || '—'}</Td>
                  <Td><Chip tone={c.isWholesale ? 'lav' : 'mint'}>{c.isWholesale ? 'wholesale' : 'retail'}</Chip></Td>
                  <Td>{c.creditBalance > 0 ? <Chip tone="blush">{money(c.creditBalance)}</Chip> : <Chip tone="mint">clear</Chip>}</Td>
                  <Td className="text-right"><Btn variant="ghost" onClick={() => openDetail(c)}>View</Btn></Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && items.length === 0 && <EmptyState icon={Users} title="No customers found" />}
        </div>

        <div className="md:hidden space-y-3">
          {items.map((c) => (
            <button key={c.id} onClick={() => openDetail(c)} className="card p-4 w-full text-left flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={c.name} tone={c.isWholesale ? 'lav' : 'lime'} size="sm" />
                <div className="min-w-0">
                  <p className="font-extrabold text-ink tracking-tight truncate">{c.name}</p>
                  <p className="text-xs text-stone-400">{c.phone || '—'}</p>
                </div>
              </div>
              {c.creditBalance > 0 ? <Chip tone="blush">{money(c.creditBalance)}</Chip> : <Chip tone="mint">clear</Chip>}
            </button>
          ))}
        </div>

        {/* Add customer */}
        <Modal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          title="Add customer"
          footer={
            <>
              <Btn variant="ghost" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Btn>
              <Btn variant="dark" className="flex-1" onClick={addCustomer} disabled={busy || !form.name}>{busy ? 'Saving…' : 'Save'}</Btn>
            </>
          }
        >
          <input className="input" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="flex items-center justify-between bg-cream-soft border border-line rounded-2xl px-4 py-3">
            <span className="text-sm font-semibold text-ink">Wholesale client (credit allowed)</span>
            <input type="checkbox" checked={form.isWholesale} onChange={(e) => setForm({ ...form, isWholesale: e.target.checked })} className="w-4 h-4 accent-[#1d1d18]" />
          </div>
          {form.isWholesale && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Credit limit</label>
              <input type="number" min="0" className="input mt-1" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })} />
            </div>
          )}
        </Modal>

        {/* Customer detail */}
        <Modal
          open={!!detail}
          onClose={() => { setDetail(null); setCollectAmount(''); }}
          title={detail?.name || ''}
          maxWidth="max-w-lg"
        >
          {detail && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-cream-soft border border-line rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-stone-400">Purchases</p>
                  <p className="font-extrabold text-ink">{money(detail.totalPurchases || 0)}</p>
                </div>
                <div className="bg-cream-soft border border-line rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-stone-400">Credit out</p>
                  <p className={`font-extrabold ${detail.creditBalance > 0 ? 'text-[#a34141]' : 'text-[#2f6b46]'}`}>{money(detail.creditBalance)}</p>
                </div>
                <div className="bg-cream-soft border border-line rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-stone-400">Loyalty</p>
                  <p className="font-extrabold text-ink">{detail.loyaltyPoints}</p>
                </div>
              </div>

              {detail.creditBalance > 0 && (
                <div className="p-3 bg-blush-soft/50 border border-blush rounded-2xl flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#a34141] shrink-0" />
                  <input type="number" min="0" max={detail.creditBalance} className="input !py-1.5 flex-1" placeholder={`Collect up to ${money(detail.creditBalance)}`} value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)} />
                  <Btn variant="lime" onClick={collect} disabled={busy || !collectAmount}>Collect</Btn>
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">Recent purchases</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {detail.sales?.map((s) => (
                    <div key={s.id} className="flex justify-between text-sm bg-cream-soft border border-line rounded-xl px-3 py-2">
                      <span className="text-stone-500">{s.receiptNo} · {dateStr(s.createdAt)}</span>
                      <span className="font-bold text-ink">{money(s.total)}</span>
                    </div>
                  ))}
                  {(!detail.sales || detail.sales.length === 0) && <p className="text-sm text-stone-400">No purchases yet</p>}
                </div>
              </div>
            </>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default Customers;
