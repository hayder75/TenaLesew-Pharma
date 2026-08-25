import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { apiGet, apiPost } from '../../lib/api';
import { etb, dateStr, dateTimeStr, errMsg } from '../../lib/format';
import { Chip, Btn, Modal, StatCard, Avatar } from '../../components/ui';
import { useAuth } from '../../lib/AuthContext';
import { ArrowLeft, Plus, CreditCard, ShieldAlert, LogIn, Building2 } from 'lucide-react';
import type { LicenseInfo } from '../../lib/types';

interface TenantDetail {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  branches: {
    id: string;
    name: string;
    location?: string | null;
    license: LicenseInfo;
    monthSales: { total: number; count: number };
  }[];
  users: { id: string; username: string; fullName: string | null; email: string | null; role: string; isActive: boolean }[];
  payments: { id: string; amountEtb: number; method: string; referenceNo?: string | null; monthsPaid: number; periodEnd: string; createdAt: string; recordedByName?: string | null }[];
  activity: {
    monthSaleCount: number;
    topProducts: { name: string; qty: number; total: number }[];
    recentEvents: { id: string; action: string; actorLabel?: string | null; createdAt: string }[];
  };
}

const licenseChip = (s: string): 'mint' | 'blush' | 'sun' => (s === 'ACTIVE' ? 'mint' : s === 'EXPIRED' ? 'blush' : 'sun');

const TenantDetail: React.FC = () => {
  const { id } = useParams();
  const { impersonate } = useAuth();
  const { data: tenant, loading, reload } = useApi<TenantDetail>(() => apiGet(`/platform/tenants/${id}`), [id]);
  const [payModal, setPayModal] = useState<{ branchId: string; branchName: string } | null>(null);
  const [branchModal, setBranchModal] = useState(false);
  const [payForm, setPayForm] = useState({ months: 1, amountEtb: 1500, method: 'telebirr', referenceNo: '', note: '' });
  const [branchForm, setBranchForm] = useState({ name: '', location: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading || !tenant) return <div className="card p-8 text-center text-stone-400">Loading tenant…</div>;

  const recordPayment = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPost(`/platform/branches/${payModal!.branchId}/license`, {
        months: payForm.months,
        amountEtb: payForm.amountEtb || undefined,
        method: payForm.method,
        referenceNo: payForm.referenceNo || undefined,
        note: payForm.note || undefined,
      });
      setPayModal(null);
      reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const addBranch = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPost(`/platform/tenants/${tenant.id}/branches`, {
        name: branchForm.name,
        location: branchForm.location || undefined,
        phone: branchForm.phone || undefined,
      });
      setBranchModal(false);
      setBranchForm({ name: '', location: '', phone: '' });
      reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleSuspend = async () => {
    setBusy(true);
    try {
      await apiPost(`/platform/tenants/${tenant.id}/${tenant.status === 'ACTIVE' ? 'suspend' : 'reactivate'}`);
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/platform/tenants" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-400 hover:text-ink">
        <ArrowLeft className="w-4 h-4" /> All pharmacies
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{tenant.name}</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {tenant.phone || 'no phone'} · joined {dateStr(tenant.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone={tenant.status === 'ACTIVE' ? 'mint' : 'blush'}>{tenant.status.toLowerCase()}</Chip>
          <Btn variant="ghost" onClick={() => impersonate(tenant.id).catch((e) => setError(errMsg(e)))}>
            <LogIn className="w-4 h-4" /> Impersonate
          </Btn>
          <Btn variant={tenant.status === 'ACTIVE' ? 'danger' : 'lime'} onClick={toggleSuspend} disabled={busy}>
            {tenant.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
          </Btn>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl text-sm text-[#a34141] font-medium">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Branches" value={tenant.branches.length} icon={Building2} tone="sky" sub={`${tenant.users.length} users`} />
        <StatCard label="30-day sales" value={etb(tenant.branches.reduce((s, b) => s + b.monthSales.total, 0))} icon={CreditCard} tone="lime" sub={`${tenant.activity.monthSaleCount} transactions`} />
        <StatCard label="Total paid" value={etb(tenant.payments.reduce((s, p) => s + p.amountEtb, 0))} icon={CreditCard} tone="mint" sub={`${tenant.payments.length} payments`} />
      </div>

      {/* Branches */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-extrabold tracking-tight text-ink">Branches & licenses</h2>
          <Btn variant="dark" onClick={() => setBranchModal(true)}><Plus className="w-4 h-4" /> Add branch</Btn>
        </div>
        <div className="space-y-2">
          {tenant.branches.map((b) => (
            <div key={b.id} className="p-4 bg-cream-soft border border-line rounded-2xl flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-bold text-sm text-ink">{b.name}</p>
                <p className="text-xs text-stone-400">
                  {b.license.paidUntil ? `Paid until ${dateStr(b.license.paidUntil)}` : b.license.trialEndsAt ? `Trial ends ${dateStr(b.license.trialEndsAt)}` : 'No license'} · 30d: {etb(b.monthSales.total)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone={licenseChip(b.license.status)}>{b.license.status.toLowerCase()}</Chip>
                <Btn variant="lime" onClick={() => { setPayModal({ branchId: b.id, branchName: b.name }); setPayForm({ months: 1, amountEtb: 1500, method: 'telebirr', referenceNo: '', note: '' }); }}>
                  <CreditCard className="w-4 h-4" /> Record payment
                </Btn>
              </div>
            </div>
          ))}
          {tenant.branches.length === 0 && <p className="text-sm text-stone-400 text-center py-4">No branches yet</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Users */}
        <div className="card p-5">
          <h2 className="font-extrabold tracking-tight text-ink mb-4">Team</h2>
          <div className="space-y-2">
            {tenant.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-cream-soft border border-line rounded-2xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={u.username} tone="sky" size="sm" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-ink truncate">{u.fullName || u.username}</p>
                    <p className="text-xs text-stone-400 truncate">{u.email || u.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Chip tone="sky">{u.role.replace('_', ' ').toLowerCase()}</Chip>
                  {!u.isActive && <Chip tone="blush">disabled</Chip>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="card p-5">
          <h2 className="font-extrabold tracking-tight text-ink mb-4">Recent activity</h2>
          <div className="space-y-2">
            {tenant.activity.topProducts.length > 0 && (
              <div className="p-3 bg-cream-soft border border-line rounded-2xl">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Top products (30d)</p>
                {tenant.activity.topProducts.map((p) => (
                  <div key={p.name} className="flex justify-between text-sm py-0.5">
                    <span className="text-stone-500 truncate">{p.name}</span>
                    <span className="font-bold text-ink">{etb(p.total || 0)}</span>
                  </div>
                ))}
              </div>
            )}
            {tenant.activity.recentEvents.map((e) => (
              <div key={e.id} className="flex justify-between text-sm px-1 py-1.5">
                <span className="text-stone-500"><b className="text-ink">{e.actorLabel || 'system'}</b> · {e.action}</span>
                <span className="text-xs text-stone-400">{dateTimeStr(e.createdAt)}</span>
              </div>
            ))}
            {tenant.activity.recentEvents.length === 0 && <p className="text-sm text-stone-400 text-center py-4">No activity yet</p>}
          </div>
        </div>
      </div>

      {/* Payments history */}
      <div className="card p-5">
        <h2 className="font-extrabold tracking-tight text-ink mb-4">Payment history</h2>
        <div className="space-y-2">
          {tenant.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-cream-soft border border-line rounded-2xl">
              <div>
                <p className="font-bold text-sm text-ink">{etb(p.amountEtb)} · {p.monthsPaid} month{p.monthsPaid > 1 ? 's' : ''}</p>
                <p className="text-xs text-stone-400">
                  {p.method}{p.referenceNo ? ` · ref ${p.referenceNo}` : ''} · by {p.recordedByName || '—'} · {dateTimeStr(p.createdAt)}
                </p>
              </div>
              <Chip tone="neutral">until {dateStr(p.periodEnd)}</Chip>
            </div>
          ))}
          {tenant.payments.length === 0 && <p className="text-sm text-stone-400 text-center py-4">No payments recorded yet</p>}
        </div>
      </div>

      {/* Record payment modal */}
      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title={`Record payment — ${payModal?.branchName || ''}`}
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setPayModal(null)}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={recordPayment} disabled={busy}>{busy ? 'Saving…' : 'Activate license'}</Btn>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Months paid *</label>
            <input type="number" min={1} max={36} className="input mt-1" value={payForm.months} onChange={(e) => setPayForm({ ...payForm, months: parseInt(e.target.value) || 1 })} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Amount (ETB)</label>
            <input type="number" min={0} className="input mt-1" value={payForm.amountEtb} onChange={(e) => setPayForm({ ...payForm, amountEtb: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Method</label>
            <select className="input mt-1" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
              <option value="telebirr">Telebirr</option>
              <option value="cbebirr">CBE Birr</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Reference</label>
            <input className="input mt-1" value={payForm.referenceNo} onChange={(e) => setPayForm({ ...payForm, referenceNo: e.target.value })} placeholder="Telebirr txn no" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Note</label>
          <input className="input mt-1" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
        </div>
      </Modal>

      {/* Add branch modal */}
      <Modal
        open={branchModal}
        onClose={() => setBranchModal(false)}
        title="Add branch"
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setBranchModal(false)}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={addBranch} disabled={busy || branchForm.name.length < 2}>{busy ? 'Adding…' : 'Add (14-day trial)'}</Btn>
          </>
        }
      >
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Branch name *</label>
          <input className="input mt-1" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Location</label>
            <input className="input mt-1" value={branchForm.location} onChange={(e) => setBranchForm({ ...branchForm, location: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Phone</label>
            <input className="input mt-1" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-sun-soft border border-sun/40 rounded-2xl text-sm text-[#8a6d10]">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          New branches start with a 14-day trial. Record a payment to activate the license — the pharmacy can also pay you via Telebirr.
        </div>
      </Modal>
    </div>
  );
};

export default TenantDetail;
