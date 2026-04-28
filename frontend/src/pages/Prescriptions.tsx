import React, { useState } from 'react';
import Layout from '../components/Layout';
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

  const filteredPrescriptions = prescriptions.filter(p =>
    p.customerName.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
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
      seller: 'current_user'
    };
    setPrescriptions([newPrescription, ...prescriptions]);
    setShowUpload(false);
    setUploadFile(null);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
  };

  const updateStatus = (id: number, status: Prescription['status']) => {
    setPrescriptions(prescriptions.map(p => 
      p.id === id ? { ...p, status } : p
    ));
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    processed: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700'
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
            <p className="text-gray-500 mt-1">Manage prescription uploads and processing</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all"
          >
            <Upload className="w-5 h-5" />
            Upload Rx
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{prescriptions.filter(p => p.status === 'pending').length}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Processed</p>
              <p className="text-2xl font-bold text-blue-600">{prescriptions.filter(p => p.status === 'processed').length}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">{prescriptions.filter(p => p.status === 'completed').length}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* List */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPrescriptions.map(prescription => (
                <tr key={prescription.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">#{prescription.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{prescription.customerName}</td>
                  <td className="px-4 py-3 text-gray-500">{prescription.phone}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{prescription.uploadedAt}</td>
                  <td className="px-4 py-3">
                    <select
                      value={prescription.status}
                      onChange={(e) => updateStatus(prescription.id, e.target.value as Prescription['status'])}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${statusColors[prescription.status]}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processed">Processed</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPrescriptions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2" />
              <p>No prescriptions found</p>
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Upload Prescription</h2>
                <button onClick={() => setShowUpload(false)} className="p-1 hover:bg-gray-100 rounded">
                  <span className="sr-only">Close</span>
                  ×
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <Camera className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="rx-upload"
                  />
                  <label htmlFor="rx-upload" className="cursor-pointer text-blue-600 hover:underline text-sm">
                    Click to upload
                  </label>
                  {uploadFile && <p className="mt-2 text-sm text-green-600">{uploadFile.name}</p>}
                </div>
                <input
                  type="text"
                  placeholder="Customer Name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="tel"
                  placeholder="Phone Number (optional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                />
              </div>
              <div className="p-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setShowUpload(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Prescriptions;