import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { PageHeader, Chip, Modal, Avatar } from '../components/ui';
import { Building, Plus, MapPin, Phone, Edit, Trash2, Eye, Lock, Users, DollarSign, ShoppingCart } from 'lucide-react';

interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  manager: string;
  status: 'active' | 'inactive';
  users: number;
  transactions: number;
  todaySales: number;
}

const mockBranches: Branch[] = [
  { id: 1, name: 'Main Branch', address: 'Addis Ababa, Ethiopia', phone: '0111111111', manager: 'Admin', status: 'active', users: 5, transactions: 1250, todaySales: 45000 },
  { id: 2, name: 'Branch 2 - Bole', address: 'Bole Road, Addis Ababa', phone: '0112222222', manager: 'Tadesse', status: 'active', users: 3, transactions: 890, todaySales: 32000 },
  { id: 3, name: 'Branch 3 - Hawassa', address: 'Hawassa, Ethiopia', phone: '0113333333', manager: 'Mekdes', status: 'active', users: 2, transactions: 560, todaySales: 18500 },
];

const Branches: React.FC = () => {
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="card-dark p-10 text-center max-w-sm">
            <div className="w-16 h-16 bg-lime rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-ink" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Access Denied</h2>
            <p className="text-white/50 mt-2 text-sm">Only admins can manage branches.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Branches"
          subtitle="Manage your pharmacy branches"
          actions={
            <button onClick={() => setShowAdd(true)} className="btn btn-dark">
              <Plus className="w-5 h-5" />
              Add Branch
            </button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockBranches.map((branch, i) => (
            <div key={branch.id} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${i % 2 === 0 ? 'bg-lime-soft text-[#5c6b12]' : 'bg-sky-soft text-[#3d5a94]'}`}>
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold tracking-tight text-ink">{branch.name}</h3>
                    <Chip tone={branch.status === 'active' ? 'mint' : 'neutral'} className="mt-1">{branch.status}</Chip>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm text-stone-500 mb-4">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-stone-400" /><span>{branch.address}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-stone-400" /><span>{branch.phone}</span></div>
                <div className="flex items-center gap-2"><span className="text-stone-400">Manager:</span><span className="font-bold text-ink">{branch.manager}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-2 py-3 border-t border-line">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-[#3d5a94]"><Users className="w-4 h-4" /></div>
                  <p className="font-extrabold text-ink">{branch.users}</p>
                  <p className="text-[11px] text-stone-400 font-semibold">Users</p>
                </div>
                <div className="text-center border-l border-line">
                  <div className="flex items-center justify-center gap-1 text-[#2f6b46]"><ShoppingCart className="w-4 h-4" /></div>
                  <p className="font-extrabold text-ink">{branch.transactions}</p>
                  <p className="text-[11px] text-stone-400 font-semibold">Orders</p>
                </div>
                <div className="text-center border-l border-line">
                  <div className="flex items-center justify-center gap-1 text-[#8a6d10]"><DollarSign className="w-4 h-4" /></div>
                  <p className="font-extrabold text-ink">{(branch.todaySales / 1000).toFixed(1)}k</p>
                  <p className="text-[11px] text-stone-400 font-semibold">Sales</p>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-line">
                <button onClick={() => setSelectedBranch(branch)} className="btn btn-ghost flex-1 !py-2 !text-xs"><Eye className="w-4 h-4" />View</button>
                <button className="btn btn-ghost !py-2 !px-3"><Edit className="w-4 h-4" /></button>
                <button className="btn btn-danger !py-2 !px-3"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Branch detail modal */}
        <Modal
          open={!!selectedBranch}
          onClose={() => setSelectedBranch(null)}
          title={selectedBranch?.name || ''}
          maxWidth="max-w-2xl"
          footer={
            <>
              <button onClick={() => setSelectedBranch(null)} className="btn btn-ghost flex-1">Close</button>
              <button className="btn btn-dark flex-1">Edit Branch</button>
            </>
          }
        >
          <p className="text-sm text-stone-400 -mt-2">{selectedBranch?.address}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-sky-soft p-4 rounded-2xl text-center border border-sky/40">
              <Users className="w-5 h-5 text-[#3d5a94] mx-auto mb-1.5" />
              <p className="text-xl font-extrabold text-ink">{selectedBranch?.users}</p>
              <p className="text-[11px] font-semibold text-stone-400">Users</p>
            </div>
            <div className="bg-mint-soft p-4 rounded-2xl text-center border border-mint/40">
              <ShoppingCart className="w-5 h-5 text-[#2f6b46] mx-auto mb-1.5" />
              <p className="text-xl font-extrabold text-ink">{selectedBranch?.transactions}</p>
              <p className="text-[11px] font-semibold text-stone-400">Orders</p>
            </div>
            <div className="bg-sun-soft p-4 rounded-2xl text-center border border-sun/40">
              <DollarSign className="w-5 h-5 text-[#8a6d10] mx-auto mb-1.5" />
              <p className="text-xl font-extrabold text-ink">{selectedBranch?.todaySales.toLocaleString()}</p>
              <p className="text-[11px] font-semibold text-stone-400">Today (ETB)</p>
            </div>
            <div className="bg-lav-soft p-4 rounded-2xl text-center border border-lav/40">
              <Building className="w-5 h-5 text-[#5d4394] mx-auto mb-1.5" />
              <p className="text-xl font-extrabold text-ink capitalize">{selectedBranch?.status}</p>
              <p className="text-[11px] font-semibold text-stone-400">Status</p>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="font-extrabold text-sm tracking-tight text-ink mb-2.5">Branch users</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border border-line rounded-2xl">
                <div className="flex items-center gap-3">
                  <Avatar name="Admin User" tone="lime" size="sm" />
                  <div><p className="font-bold text-sm text-ink">Admin User</p><p className="text-xs text-stone-400">admin@tenalesew.com</p></div>
                </div>
                <Chip tone="sky">Admin</Chip>
              </div>
              <div className="flex items-center justify-between p-3 border border-line rounded-2xl">
                <div className="flex items-center gap-3">
                  <Avatar name={selectedBranch?.manager || 'M'} tone="mint" size="sm" />
                  <div><p className="font-bold text-sm text-ink">{selectedBranch?.manager}</p><p className="text-xs text-stone-400">manager@tenalesew.com</p></div>
                </div>
                <Chip tone="mint">Manager</Chip>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="font-extrabold text-sm tracking-tight text-ink mb-2.5">Recent transactions</h3>
            <div className="space-y-2">
              {[
                { id: 10245, time: 'Today, 10:30 AM', amount: '+2,450 ETB' },
                { id: 10244, time: 'Today, 9:15 AM', amount: '+850 ETB' },
                { id: 10243, time: 'Yesterday, 5:45 PM', amount: '+3,200 ETB' },
              ].map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 border border-line rounded-2xl">
                  <div><p className="font-bold text-sm text-ink">Invoice #{tx.id}</p><p className="text-xs text-stone-400">{tx.time}</p></div>
                  <p className="font-extrabold text-[#2f6b46]">{tx.amount}</p>
                </div>
              ))}
            </div>
          </div>
        </Modal>

        {/* Add branch modal */}
        <Modal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          title="Add Branch"
          footer={
            <>
              <button onClick={() => setShowAdd(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => setShowAdd(false)} className="btn btn-dark flex-1">Save</button>
            </>
          }
        >
          <input type="text" placeholder="Branch Name" className="input" />
          <input type="text" placeholder="Address" className="input" />
          <input type="tel" placeholder="Phone" className="input" />
          <input type="text" placeholder="Manager Name" className="input" />
        </Modal>
      </div>
    </Layout>
  );
};

export default Branches;
