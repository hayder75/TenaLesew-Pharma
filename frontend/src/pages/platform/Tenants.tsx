import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { apiGet, apiPost } from '../../lib/api';
import { etb, dateStr, timeAgo, errMsg } from '../../lib/format';
import { Chip, Modal, Btn } from '../../components/ui';
import { Search, Plus, Building2, ArrowRight, Copy, Check } from 'lucide-react';
import type { PlatformTenant } from '../../lib/types';

const Tenants: React.FC = () => {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { data: tenants, loading, reload } = useApi<PlatformTenant[]>(() => apiGet(`/platform/tenants${search ? `?search=${encodeURIComponent(search)}` : ''}`), [search]);

  const [form, setForm] = useState({ name: '', phone: '', address: '', ownerUsername: '', ownerPassword: '', ownerName: '' });
  const [credentials, setCredentials] = useState<{ name: string; username: string; password: string } | null>(null);

  const create = async () => {
    setCreating(true);
    setError('');
    try {
      await apiPost('/platform/tenants', {
        name: form.name,
        phone: form.phone || undefined,
        address: form.address || undefined,
        owner: { username: form.ownerUsername, password: form.ownerPassword, fullName: form.ownerName || undefined },
      });
      setCredentials({ name: form.name, username: form.ownerUsername, password: form.ownerPassword });
      setShowCreate(false);
      setForm({ name: '', phone: '', address: '', ownerUsername: '', ownerPassword: '', ownerName: '' });
      reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setCreating(false);
    }
  };

  const copyCreds = (t: { username: string; password: string }) => {
    navigator.clipboard.writeText(`${t.username} / ${t.password}`).then(() => {
      setCopiedId(t.username);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Pharmacies</h1>
          <p className="text-sm text-stone-500 mt-0.5">Registered tenants and their branches</p>
        </div>
        <Btn variant="dark" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Register pharmacy
        </Btn>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input className="input !rounded-full !pl-10" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading && <div className="card p-8 text-center text-stone-400">Loading…</div>}

      <div className="space-y-3">
        {tenants?.map((t) => (
          <Link key={t.id} to={`/platform/tenants/${t.id}`} className="card p-5 block hover:shadow-pop transition-all group">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 bg-sky-soft rounded-2xl flex items-center justify-center shrink-0 text-[#3d5a94]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold tracking-tight text-ink truncate">{t.name}</p>
                  <p className="text-xs text-stone-400">
                    Owner: {t.owner?.username || '—'} · {t.userCount} users · joined {dateStr(t.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone={t.status === 'ACTIVE' ? 'mint' : 'blush'}>{t.status.toLowerCase()}</Chip>
                <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {t.branches.map((b) => (
                <Chip key={b.id} tone={b.license.status === 'ACTIVE' ? 'mint' : b.license.status === 'EXPIRED' ? 'blush' : 'sun'}>
                  {b.name} · {b.license.status.toLowerCase()}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-5 mt-3 pt-3 border-t border-line text-xs">
              <span className="text-stone-400">30-day sales: <b className="text-ink">{etb(t.monthSales.total)}</b> ({t.monthSales.count} txns)</span>
              <span className="text-stone-400">Last activity: <b className="text-ink">{timeAgo(t.lastActivity)}</b></span>
            </div>
          </Link>
        ))}
        {!loading && tenants?.length === 0 && (
          <div className="card p-10 text-center">
            <Building2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="font-bold text-ink">No pharmacies yet</p>
            <p className="text-sm text-stone-400">Register your first pharmacy to get started</p>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Register a pharmacy"
        maxWidth="max-w-lg"
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={create} disabled={creating || !form.name || form.ownerUsername.length < 3 || form.ownerPassword.length < 8}>
              {creating ? 'Creating…' : 'Create pharmacy'}
            </Btn>
          </>
        }
      >
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Pharmacy name *</label>
          <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bole Pharmacy PLC" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Phone</label>
            <input className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Address</label>
            <input className="input mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
        <div className="pt-3 border-t border-line mt-1">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Owner account (they take it from here)</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Owner username *</label>
              <input className="input mt-1 font-mono" value={form.ownerUsername} onChange={(e) => setForm({ ...form, ownerUsername: e.target.value })} placeholder="e.g. bole_owner" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Owner password * (min 8 chars)</label>
              <input className="input mt-1 font-mono" value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} placeholder="They should change this later" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Owner full name</label>
              <input className="input mt-1" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
            </div>
          </div>
        </div>
        {error && (
          <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl">
            <p className="text-sm text-[#a34141] font-medium">{error}</p>
          </div>
        )}
      </Modal>

      {/* Credentials modal */}
      <Modal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        title="Pharmacy created 🎉"
        footer={<Btn variant="dark" className="flex-1" onClick={() => setCredentials(null)}>Done</Btn>}
      >
        {credentials && (
          <>
            <p className="text-sm text-stone-500">
              <b className="text-ink">{credentials.name}</b> is registered. Hand these owner credentials to the pharmacist — they can now log in and set up branches and staff.
            </p>
            <div className="p-4 bg-cream-soft border border-line rounded-2xl flex items-center justify-between">
              <div className="font-mono text-sm">
                <p><span className="text-stone-400">user:</span> <b>{credentials.username}</b></p>
                <p><span className="text-stone-400">pass:</span> <b>{credentials.password}</b></p>
              </div>
              <Btn variant="lime" onClick={() => copyCreds(credentials)}>
                {copiedId === credentials.username ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Tenants;
