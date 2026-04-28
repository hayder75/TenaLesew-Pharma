import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Search, Plus, Users, CreditCard, Trash2, Edit, Eye } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  totalPurchases: number;
  creditBalance: number;
  type: 'retail' | 'wholesale';
}

const mockCustomers: Customer[] = [
  { id: 1, name: 'John Doe', phone: '0912345678', email: 'john@example.com', totalPurchases: 1500, creditBalance: 0, type: 'retail' },
  { id: 2, name: 'ABC Pharmacy', phone: '0911111111', email: 'abc@pharmacy.com', totalPurchases: 25000, creditBalance: 5000, type: 'wholesale' },
  { id: 3, name: 'Sarah Johnson', phone: '0919876543', email: 'sarah@example.com', totalPurchases: 800, creditBalance: 0, type: 'retail' },
  { id: 4, name: 'Health Plus Clinic', phone: '0912222222', email: 'health@clinic.com', totalPurchases: 15000, creditBalance: 2500, type: 'wholesale' },
];

const Customers: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'retail' | 'wholesale'>('all');
  const [showAdd, setShowAdd] = useState(false);

  const filteredCustomers = mockCustomers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-500 mt-1">Manage retail and wholesale customers</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{mockCustomers.length}</p></div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Retail</p><p className="text-2xl font-bold text-green-600">{mockCustomers.filter(c => c.type === 'retail').length}</p></div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-purple-600" /></div>
            <div><p className="text-sm text-gray-500">Wholesale</p><p className="text-2xl font-bold text-purple-600">{mockCustomers.filter(c => c.type === 'wholesale').length}</p></div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><CreditCard className="w-6 h-6 text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Credit Total</p><p className="text-2xl font-bold">${mockCustomers.reduce((s, c) => s + c.creditBalance, 0).toLocaleString()}</p></div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)} className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white">
            <option value="all">All Types</option>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Purchases</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{customer.phone}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-1 rounded-full ${customer.type === 'wholesale' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{customer.type}</span></td>
                  <td className="px-4 py-3 font-medium">${customer.totalPurchases.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={customer.creditBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>${customer.creditBalance.toLocaleString()}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showAdd && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b"><h2 className="font-semibold">Add Customer</h2></div>
              <div className="p-4 space-y-3">
                <input type="text" placeholder="Name" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <input type="tel" placeholder="Phone" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <input type="email" placeholder="Email" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl"><option value="retail">Retail</option><option value="wholesale">Wholesale</option></select>
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

export default Customers;