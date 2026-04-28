import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Search, Plus, Package, Truck, DollarSign, Edit, Trash2, Eye } from 'lucide-react';

interface Supplier {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
}

const mockSuppliers: Supplier[] = [
  { id: 1, name: 'PharmaCo Ethiopia', phone: '0111111111', email: 'contact@pharmacoe.com', address: 'Addis Ababa', balance: 15000 },
  { id: 2, name: 'MedSupply PLC', phone: '0112222222', email: 'info@medsupply.com', address: 'Dire Dawa', balance: 5000 },
  { id: 3, name: 'Health Distributors', phone: '0113333333', email: 'sales@healthdist.com', address: 'Hawassa', balance: 0 },
];

interface Purchase {
  id: number;
  supplier: string;
  date: string;
  total: number;
  status: 'pending' | 'received' | 'cancelled';
}

const mockPurchases: Purchase[] = [
  { id: 1, supplier: 'PharmaCo Ethiopia', date: '2026-04-20', total: 25000, status: 'received' },
  { id: 2, supplier: 'MedSupply PLC', date: '2026-04-21', total: 12000, status: 'pending' },
];

const Suppliers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchases'>('suppliers');
  const [search, setSearch] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);

  const filteredSuppliers = mockSuppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const totalDebt = mockSuppliers.reduce((sum, s) => sum + s.balance, 0);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
            <p className="text-gray-500 mt-1">Manage suppliers and purchase orders</p>
          </div>
          <button onClick={() => activeTab === 'suppliers' ? setShowAddSupplier(true) : setShowAddPurchase(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {activeTab === 'suppliers' ? 'Add Supplier' : 'New PO'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><Truck className="w-6 h-6 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Suppliers</p><p className="text-2xl font-bold">{mockSuppliers.length}</p></div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center"><Package className="w-6 h-6 text-yellow-600" /></div>
            <div><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-yellow-600">{mockPurchases.filter(p => p.status === 'pending').length}</p></div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Payable</p><p className="text-2xl font-bold">${totalDebt.toLocaleString()}</p></div>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button onClick={() => setActiveTab('suppliers')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'suppliers' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Suppliers</button>
          <button onClick={() => setActiveTab('purchases')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'purchases' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Purchase Orders</button>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        {activeTab === 'suppliers' && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{supplier.name}</td>
                    <td className="px-4 py-3 text-gray-500">{supplier.phone}</td>
                    <td className="px-4 py-3 text-gray-500">{supplier.email}</td>
                    <td className="px-4 py-3 text-gray-500">{supplier.address}</td>
                    <td className="px-4 py-3"><span className={supplier.balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>${supplier.balance.toLocaleString()}</span></td>
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
        )}

        {activeTab === 'purchases' && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockPurchases.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">#{purchase.id}</td>
                    <td className="px-4 py-3">{purchase.supplier}</td>
                    <td className="px-4 py-3 text-gray-500">{purchase.date}</td>
                    <td className="px-4 py-3 font-medium">${purchase.total.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-1 rounded-full ${purchase.status === 'received' ? 'bg-green-100 text-green-700' : purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{purchase.status}</span></td>
                    <td className="px-4 py-3 text-right"><button className="text-blue-600 hover:underline text-sm">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAddSupplier && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b"><h2 className="font-semibold">Add Supplier</h2></div>
              <div className="p-4 space-y-3">
                <input type="text" placeholder="Name" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <input type="tel" placeholder="Phone" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <input type="email" placeholder="Email" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <input type="text" placeholder="Address" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={() => setShowAddSupplier(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={() => setShowAddSupplier(false)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Save</button>
              </div>
            </div>
          </div>
        )}

        {showAddPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b"><h2 className="font-semibold">Create Purchase Order</h2></div>
              <div className="p-4 space-y-3">
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl"><option>Select Supplier</option>{mockSuppliers.map(s => <option key={s.id}>{s.name}</option>)}</select>
                <p className="text-sm text-gray-500">Add products from inventory</p>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={() => setShowAddPurchase(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={() => setShowAddPurchase(false)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Create PO</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Suppliers;