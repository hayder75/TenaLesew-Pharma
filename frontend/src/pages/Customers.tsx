import React, { useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader, StatCard, Chip, Th, Td, Modal, Avatar } from '../components/ui';
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

  const filteredCustomers = mockCustomers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Customers"
          subtitle="Manage retail and wholesale customers"
          actions={
            <button onClick={() => setShowAdd(true)} className="btn btn-dark">
              <Plus className="w-5 h-5" />
              Add Customer
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Total" value={mockCustomers.length} icon={Users} tone="sky" />
          <StatCard label="Retail" value={mockCustomers.filter((c) => c.type === 'retail').length} icon={Users} tone="mint" />
          <StatCard label="Wholesale" value={mockCustomers.filter((c) => c.type === 'wholesale').length} icon={Users} tone="lav" />
          <StatCard label="Credit Total" value={`$${mockCustomers.reduce((s, c) => s + c.creditBalance, 0).toLocaleString()}`} icon={CreditCard} tone="blush" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="input !rounded-full !pl-10" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)} className="input sm:w-44">
            <option value="all">All Types</option>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-cream-soft border-b border-line">
              <tr>
                <Th>Customer</Th>
                <Th>Phone</Th>
                <Th>Type</Th>
                <Th>Total Purchases</Th>
                <Th>Credit</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-deep/70">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-cream-soft">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={customer.name} tone={customer.type === 'wholesale' ? 'lav' : 'lime'} size="sm" />
                      <div>
                        <div className="font-bold text-ink">{customer.name}</div>
                        <div className="text-xs text-stone-400">{customer.email}</div>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-stone-500">{customer.phone}</Td>
                  <Td><Chip tone={customer.type === 'wholesale' ? 'lav' : 'mint'}>{customer.type}</Chip></Td>
                  <Td className="font-bold text-ink">${customer.totalPurchases.toLocaleString()}</Td>
                  <Td>{customer.creditBalance > 0 ? <Chip tone="blush">${customer.creditBalance.toLocaleString()}</Chip> : <Chip tone="mint">Clear</Chip>}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 text-stone-400 hover:text-ink hover:bg-lime-soft rounded-full"><Eye className="w-4 h-4" /></button>
                      <button className="p-2 text-stone-400 hover:text-ink hover:bg-cream-deep rounded-full"><Edit className="w-4 h-4" /></button>
                      <button className="p-2 text-stone-400 hover:text-[#a34141] hover:bg-blush-soft rounded-full"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Modal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          title="Add Customer"
          footer={
            <>
              <button onClick={() => setShowAdd(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => setShowAdd(false)} className="btn btn-dark flex-1">Save</button>
            </>
          }
        >
          <input type="text" placeholder="Name" className="input" />
          <input type="tel" placeholder="Phone" className="input" />
          <input type="email" placeholder="Email" className="input" />
          <select className="input">
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </Modal>
      </div>
    </Layout>
  );
};

export default Customers;
