import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
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
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
            <p className="text-gray-500 mt-2">Only admins can manage branches.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
            <p className="text-gray-500 mt-1">Manage your pharmacy branches</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Branch
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockBranches.map(branch => (
            <div key={branch.id} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${branch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{branch.status}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /><span>{branch.address}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span>{branch.phone}</span></div>
                <div className="flex items-center gap-2"><span className="text-gray-400">Manager:</span><span className="font-medium">{branch.manager}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-2 py-3 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600"><Users className="w-4 h-4" /></div>
                  <p className="font-semibold text-gray-900">{branch.users}</p>
                  <p className="text-xs text-gray-500">Users</p>
                </div>
                <div className="text-center border-l">
                  <div className="flex items-center justify-center gap-1 text-green-600"><ShoppingCart className="w-4 h-4" /></div>
                  <p className="font-semibold text-gray-900">{branch.transactions}</p>
                  <p className="text-xs text-gray-500">Orders</p>
                </div>
                <div className="text-center border-l">
                  <div className="flex items-center justify-center gap-1 text-orange-600"><DollarSign className="w-4 h-4" /></div>
                  <p className="font-semibold text-gray-900">{(branch.todaySales / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-gray-500">Sales</p>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <button onClick={() => setSelectedBranch(branch)} className="flex-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"><Eye className="w-4 h-4" />View</button>
                <button className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"><Edit className="w-4 h-4" /></button>
                <button className="px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>

        {selectedBranch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-xl">{selectedBranch.name}</h2>
                  <p className="text-sm text-gray-500">{selectedBranch.address}</p>
                </div>
                <button onClick={() => setSelectedBranch(null)} className="text-gray-400 hover:text-gray-600"><Trash2 className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-center">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{selectedBranch.users}</p>
                    <p className="text-sm text-gray-600">Users</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl text-center">
                    <ShoppingCart className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{selectedBranch.transactions}</p>
                    <p className="text-sm text-gray-600">Orders</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl text-center">
                    <DollarSign className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{selectedBranch.todaySales.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Today Sales (ETB)</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl text-center">
                    <Building className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 capitalize">{selectedBranch.status}</p>
                    <p className="text-sm text-gray-600">Status</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Branch Users</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><span className="text-sm font-medium text-blue-600">A</span></div>
                        <div><p className="font-medium">Admin User</p><p className="text-sm text-gray-500">admin@tenalesew.com</p></div>
                      </div>
                      <span className="text-xs bg-blue-100 px-2 py-1 rounded-full">Admin</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"><span className="text-sm font-medium text-green-600">M</span></div>
                        <div><p className="font-medium">{selectedBranch.manager}</p><p className="text-sm text-gray-500">manager@tenalesew.com</p></div>
                      </div>
                      <span className="text-xs bg-green-100 px-2 py-1 rounded-full">Manager</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Recent Transactions</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div><p className="font-medium">Invoice #10245</p><p className="text-sm text-gray-500">Today, 10:30 AM</p></div>
                      <p className="font-semibold text-green-600">+2,450 ETB</p>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div><p className="font-medium">Invoice #10244</p><p className="text-sm text-gray-500">Today, 9:15 AM</p></div>
                      <p className="font-semibold text-green-600">+850 ETB</p>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div><p className="font-medium">Invoice #10243</p><p className="text-sm text-gray-500">Yesterday, 5:45 PM</p></div>
                      <p className="font-semibold text-green-600">+3,200 ETB</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={() => setSelectedBranch(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">Close</button>
                <button className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Edit Branch</button>
              </div>
            </div>
          </div>
        )}

        {showAdd && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b"><h2 className="font-semibold">Add Branch</h2></div>
              <div className="p-4 space-y-3">
                <input type="text" placeholder="Branch Name" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <input type="text" placeholder="Address" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <input type="tel" placeholder="Phone" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <input type="text" placeholder="Manager Name" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Branches;