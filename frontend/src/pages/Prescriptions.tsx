import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Modal, PageHeader, StatCard, Chip, EmptyState, Th, Td } from '../components/ui';
import { Camera, FileText, Search, Eye, Trash2, Download, Upload, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Prescription {
  id: number;
  customerName: string;
  phone: string;
  uploadedAt: string;
  status: 'pending' | 'processed' | 'completed';
  notes: string;
  seller: string;
}

const mockPrescriptions: Prescription[] = [
  { id: 1, customerName: 'John Doe', phone: '0912345678', uploadedAt: '2026-04-22 10:30', status: 'pending', notes: 'For blood pressure medication', seller: 'pharmacist' },
  { id: 2, customerName: 'Sarah Johnson', phone: '0919876543', uploadedAt: '2026-04-21 14:15', status: 'processed', notes: 'Antibiotics', seller: 'admin' },
];

const Prescriptions: React.FC = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState(mockPrescriptions);

  const filteredPrescriptions = prescriptions.filter(
    (p) => p.customerName.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search)
  );

  const handleUpload = () => {
    if (!uploadFile) return;
    const newPrescription: Prescription = {
      id: prescriptions.length + 1,
      customerName: customerName || 'Unknown',
      phone: customerPhone || 'N/A',
      uploadedAt: new Date().toLocaleString(),
      status: 'pending',
      notes,
      seller: 'current_user',
    };
    setPrescriptions([newPrescription, ...prescriptions]);
    setShowUpload(false);
    setUploadFile(null);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
  };

  const updateStatus = (id: number, status: Prescription['status']) => {
    setPrescriptions(prescriptions.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Prescriptions"
          subtitle="Manage prescription uploads and processing"
          actions={
            <button onClick={() => setShowUpload(true)} className="btn btn-dark">
              <Upload className="w-5 h-5" />
              Upload Rx
            </button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Pending" value={prescriptions.filter((p) => p.status === 'pending').length} icon={Clock} tone="sun" />
          <StatCard label="Processed" value={prescriptions.filter((p) => p.status === 'processed').length} icon={AlertCircle} tone="sky" />
          <StatCard label="Completed" value={prescriptions.filter((p) => p.status === 'completed').length} icon={CheckCircle} tone="mint" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input !rounded-full !py-3 !pl-10"
          />
        </div>

        {/* List — table (desktop) */}
        <div className="card overflow-hidden hidden md:block">
          <table className="w-full min-w-[680px]">
            <thead className="bg-cream-soft border-b border-line">
              <tr>
                <Th>ID</Th>
                <Th>Customer</Th>
                <Th>Phone</Th>
                <Th>Uploaded</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-deep/70">
              {filteredPrescriptions.map((prescription) => (
                <tr key={prescription.id} className="hover:bg-cream-soft">
                  <Td className="font-bold text-stone-400">#{prescription.id}</Td>
                  <Td className="font-bold text-ink">{prescription.customerName}</Td>
                  <Td className="text-stone-500">{prescription.phone}</Td>
                  <Td className="text-stone-400 text-xs">{prescription.uploadedAt}</Td>
                  <Td>
                    <select
                      value={prescription.status}
                      onChange={(e) => updateStatus(prescription.id, e.target.value as Prescription['status'])}
                      className={`chip border-0 cursor-pointer ${prescription.status === 'pending' ? 'bg-sun-soft text-[#8a6d10]' : prescription.status === 'processed' ? 'bg-sky-soft text-[#3d5a94]' : 'bg-mint-soft text-[#2f6b46]'}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processed">Processed</option>
                      <option value="completed">Completed</option>
                    </select>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 text-stone-400 hover:text-ink hover:bg-lime-soft rounded-full"><Eye className="w-4 h-4" /></button>
                      <button className="p-2 text-stone-400 hover:text-ink hover:bg-cream-deep rounded-full"><Download className="w-4 h-4" /></button>
                      <button className="p-2 text-stone-400 hover:text-[#a34141] hover:bg-blush-soft rounded-full"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPrescriptions.length === 0 && <EmptyState icon={FileText} title="No prescriptions found" />}
        </div>

        {/* List — cards (mobile) */}
        <div className="md:hidden space-y-3">
          {filteredPrescriptions.map((prescription) => (
            <div key={prescription.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-ink tracking-tight truncate">{prescription.customerName}</p>
                  <p className="text-xs text-stone-400">{prescription.phone} · #{prescription.id}</p>
                </div>
                <select
                  value={prescription.status}
                  onChange={(e) => updateStatus(prescription.id, e.target.value as Prescription['status'])}
                  className={`chip border-0 cursor-pointer shrink-0 ${prescription.status === 'pending' ? 'bg-sun-soft text-[#8a6d10]' : prescription.status === 'processed' ? 'bg-sky-soft text-[#3d5a94]' : 'bg-mint-soft text-[#2f6b46]'}`}
                >
                  <option value="pending">Pending</option>
                  <option value="processed">Processed</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                <p className="text-xs text-stone-400 font-semibold">{prescription.uploadedAt}</p>
                <div className="flex items-center gap-1">
                  <button className="p-2 text-stone-400 hover:text-ink hover:bg-lime-soft rounded-full"><Eye className="w-4 h-4" /></button>
                  <button className="p-2 text-stone-400 hover:text-ink hover:bg-cream-deep rounded-full"><Download className="w-4 h-4" /></button>
                  <button className="p-2 text-stone-400 hover:text-[#a34141] hover:bg-blush-soft rounded-full"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {filteredPrescriptions.length === 0 && (
            <div className="card"><EmptyState icon={FileText} title="No prescriptions found" /></div>
          )}
        </div>

        {/* Upload modal */}
        <Modal
          open={showUpload}
          onClose={() => setShowUpload(false)}
          title="Upload Prescription"
          footer={
            <>
              <button onClick={() => setShowUpload(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={handleUpload} disabled={!uploadFile} className="btn btn-dark flex-1">Upload</button>
            </>
          }
        >
          <div className="border-2 border-dashed border-line rounded-3xl p-6 text-center hover:border-lime transition-all">
            <div className="w-14 h-14 bg-cream-deep rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Camera className="w-6 h-6 text-stone-400" />
            </div>
            <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="hidden" id="rx-upload" />
            <label htmlFor="rx-upload" className="cursor-pointer font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4 text-sm">
              Click to upload
            </label>
            {uploadFile && <p className="mt-2"><Chip tone="mint">{uploadFile.name}</Chip></p>}
          </div>
          <input type="text" placeholder="Customer Name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input" />
          <input type="tel" placeholder="Phone Number (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input" />
          <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={3} />
        </Modal>
      </div>
    </Layout>
  );
};

export default Prescriptions;
