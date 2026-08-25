import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { apiGet, apiPost } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { dateTimeStr, errMsg } from '../lib/format';
import { PageHeader, StatCard, Chip, Modal, Btn, Th, Td, EmptyState, statusTone } from '../components/ui';
import { Search, Upload, Clock, CheckCircle, AlertCircle, Eye, Camera } from 'lucide-react';
import type { Prescription } from '../lib/types';
import { canVerifyRx } from '../lib/roles';

const Prescriptions: React.FC = () => {
  const { currentBranch, user } = useAuth();
  const branchId = currentBranch?.id;
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: rxs, loading, reload } = useApi<{ items: Prescription[] }>(
    () => apiGet(`/prescriptions?limit=50${branchId ? `&branchId=${branchId}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
    [search, branchId]
  );

  const [form, setForm] = useState({ customerName: '', phone: '', doctorName: '', notes: '', photoBase64: '' });
  const [photoName, setPhotoName] = useState('');

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo too large — max 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, photoBase64: reader.result as string }));
      setPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const upload = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPost('/prescriptions', {
        branchId,
        customerName: form.customerName || undefined,
        phone: form.phone || undefined,
        doctorName: form.doctorName || undefined,
        notes: form.notes || undefined,
        photoBase64: form.photoBase64 || undefined,
      });
      setShowUpload(false);
      setForm({ customerName: '', phone: '', doctorName: '', notes: '', photoBase64: '' });
      setPhotoName('');
      reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (id: string) => {
    setError('');
    try {
      await apiPost(`/prescriptions/${id}/verify`);
      reload();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const viewPhoto = async (rx: Prescription) => {
    if (!rx.photoPath) return;
    try {
      const res = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:4100/api/v1')}/prescriptions/${rx.id}/photo`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('tl_access')}` },
      });
      if (!res.ok) throw new Error('Photo not found');
      const url = URL.createObjectURL(await res.blob());
      window.open(url, '_blank');
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Prescriptions"
          subtitle="Upload, verify and track prescriptions"
          actions={<Btn variant="dark" onClick={() => setShowUpload(true)}><Upload className="w-5 h-5" />Upload Rx</Btn>}
        />

        {error && <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl text-sm text-[#a34141] font-medium">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Pending" value={rxs?.items.filter((r) => r.status === 'RECEIVED').length || 0} icon={Clock} tone="sun" />
          <StatCard label="Verified" value={rxs?.items.filter((r) => r.status === 'VERIFIED').length || 0} icon={AlertCircle} tone="sky" />
          <StatCard label="Dispensed" value={rxs?.items.filter((r) => r.status === 'DISPENSED').length || 0} icon={CheckCircle} tone="mint" />
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input className="input !rounded-full !pl-10" placeholder="Search by customer or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading && <div className="card p-8 text-center text-stone-400">Loading…</div>}

        <div className="card overflow-hidden hidden md:block">
          <table className="w-full min-w-[680px]">
            <thead className="bg-cream-soft border-b border-line">
              <tr><Th>Customer</Th><Th>Phone</Th><Th>Doctor</Th><Th>Uploaded</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr>
            </thead>
            <tbody className="divide-y divide-cream-deep/70">
              {rxs?.items.map((rx) => (
                <tr key={rx.id} className="hover:bg-cream-soft">
                  <Td className="font-bold text-ink">{rx.customerName || 'Unknown'}</Td>
                  <Td className="text-stone-500">{rx.phone || '—'}</Td>
                  <Td className="text-stone-500">{rx.doctorName || '—'}</Td>
                  <Td className="text-stone-400 text-xs">{dateTimeStr(rx.createdAt)}</Td>
                  <Td><Chip tone={statusTone(rx.status)}>{rx.status.toLowerCase()}</Chip></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1.5">
                      {rx.photoPath && <button onClick={() => viewPhoto(rx)} className="p-2 text-stone-400 hover:text-ink hover:bg-lime-soft rounded-full" title="View photo"><Eye className="w-4 h-4" /></button>}
                      {rx.status === 'RECEIVED' && canVerifyRx(user?.role || 'CASHIER') && (
                        <Btn variant="lime" onClick={() => verify(rx.id)}>Verify</Btn>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {rxs?.items.length === 0 && <EmptyState icon={Upload} title="No prescriptions yet" />}
        </div>

        <div className="md:hidden space-y-3">
          {rxs?.items.map((rx) => (
            <div key={rx.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-ink tracking-tight truncate">{rx.customerName || 'Unknown'}</p>
                  <p className="text-xs text-stone-400">{rx.phone || '—'} · {rx.doctorName || '—'}</p>
                </div>
                <Chip tone={statusTone(rx.status)}>{rx.status.toLowerCase()}</Chip>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                <p className="text-xs text-stone-400">{dateTimeStr(rx.createdAt)}</p>
                <div className="flex gap-1.5">
                  {rx.photoPath && <Btn variant="ghost" onClick={() => viewPhoto(rx)}><Eye className="w-4 h-4" /></Btn>}
                  {rx.status === 'RECEIVED' && canVerifyRx(user?.role || 'CASHIER') && <Btn variant="lime" onClick={() => verify(rx.id)}>Verify</Btn>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Upload modal */}
        <Modal
          open={showUpload}
          onClose={() => setShowUpload(false)}
          title="Upload prescription"
          footer={
            <>
              <Btn variant="ghost" className="flex-1" onClick={() => setShowUpload(false)}>Cancel</Btn>
              <Btn variant="dark" className="flex-1" onClick={upload} disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</Btn>
            </>
          }
        >
          <div className="border-2 border-dashed border-line rounded-3xl p-6 text-center hover:border-lime transition-all">
            <div className="w-14 h-14 bg-cream-deep rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Camera className="w-6 h-6 text-stone-400" />
            </div>
            <input type="file" accept="image/*" className="hidden" id="rx-photo" onChange={(e) => pickPhoto(e.target.files?.[0])} />
            <label htmlFor="rx-photo" className="cursor-pointer font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4 text-sm">
              Choose a photo
            </label>
            {photoName && <p className="mt-2 text-xs text-stone-400">{photoName}</p>}
          </div>
          <input className="input" placeholder="Customer name (optional)" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input className="input" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" placeholder="Doctor name (optional)" value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} />
          <textarea className="input" rows={2} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Modal>
      </div>
    </Layout>
  );
};

export default Prescriptions;
