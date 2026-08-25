import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { apiPost } from '../lib/api';
import { money, dateStr, errMsg } from '../lib/format';
import { PageHeader, Chip, Modal, Btn, EmptyState } from '../components/ui';
import { Building2, Plus, MapPin, Phone, ShieldAlert } from 'lucide-react';
import type { BranchInfo } from '../lib/types';

const licenseChip = (s: string): 'mint' | 'blush' | 'sun' => (s === 'ACTIVE' ? 'mint' : s === 'EXPIRED' ? 'blush' : 'sun');

const Branches: React.FC = () => {
  const { session, currentBranch, setCurrentBranchId } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const allowed = ['OWNER', 'ADMIN'].includes(session?.user.role || '');

  const branches = session?.branches || [];

  const add = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPost('/branches', { name: form.name, location: form.location || undefined, phone: form.phone || undefined });
      setShowAdd(false);
      setForm({ name: '', location: '', phone: '' });
      window.location.reload(); // refresh session branches
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Branches"
          subtitle="Your pharmacy locations and their licenses"
          actions={allowed && <Btn variant="dark" onClick={() => setShowAdd(true)}><Plus className="w-5 h-5" />Add Branch</Btn>}
        />

        {error && <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl text-sm text-[#a34141] font-medium">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b: BranchInfo) => (
            <div key={b.id} className={`card p-5 ${b.id === currentBranch?.id ? 'ring-2 ring-lime' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-lime-soft text-[#5c6b12] rounded-2xl flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold tracking-tight text-ink">{b.name}</h3>
                    <Chip tone={licenseChip(b.license.status)} className="mt-1">{b.license.status.toLowerCase()}</Chip>
                  </div>
                </div>
                {b.id === currentBranch?.id && <Chip tone="dark">viewing</Chip>}
              </div>
              <div className="space-y-2 text-sm text-stone-500 mb-4">
                {b.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-stone-400" />{b.location}</div>}
                {b.todaySales && <p className="text-xs text-stone-400">Today: {money(b.todaySales.total)} ({b.todaySales.count} sales)</p>}
                <p className="text-xs text-stone-400">
                  {b.license.paidUntil ? `Licensed until ${dateStr(b.license.paidUntil)}` : b.license.trialEndsAt ? `Trial until ${dateStr(b.license.trialEndsAt)}` : 'No license'}
                </p>
              </div>
              {b.license.status === 'EXPIRED' && (
                <div className="flex items-start gap-2 p-3 bg-blush-soft/60 border border-blush rounded-2xl text-xs text-[#a34141] mb-3">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  License expired — record a payment from the platform side (or contact support) to reactivate.
                </div>
              )}
              {b.id !== currentBranch?.id && (
                <Btn variant="ghost" className="w-full" onClick={() => setCurrentBranchId(b.id)}>Switch to this branch</Btn>
              )}
            </div>
          ))}
        </div>

        {branches.length === 0 && <div className="card"><EmptyState icon={Building2} title="No branches yet" sub="Add your first branch to start selling" /></div>}
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add branch"
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={add} disabled={busy || form.name.length < 2}>{busy ? 'Adding…' : 'Add branch (14-day trial)'}</Btn>
          </>
        }
      >
        <input className="input" placeholder="Branch name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <p className="text-xs text-stone-400 flex items-center gap-2">
          <Phone className="w-3.5 h-3.5" /> New branches start with a 14-day trial license.
        </p>
      </Modal>
    </Layout>
  );
};

export default Branches;
