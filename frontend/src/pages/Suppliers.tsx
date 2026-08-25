import React, { useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader, Tabs, StatCard, Chip, EmptyState, Th, Td, Modal } from '../components/ui';
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

  const filteredSuppliers = mockSuppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const totalDebt = mockSuppliers.reduce((sum, s) => sum + s.balance, 0);

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Suppliers"
          subtitle="Manage suppliers and purchase orders"
          actions={
            <button
              onClick={() => (activeTab === 'suppliers' ? setShowAddSupplier(true) : setShowAddPurchase(true))}
              className="btn btn-dark"
            >
              <Plus className="w-5 h-5" />
              {activeTab === 'suppliers' ? 'Add Supplier' : 'New PO'}
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Suppliers" value={mockSuppliers.length} icon={Truck} tone="sky" />
          <StatCard label="Pending POs" value={mockPurchases.filter((p) => p.status === 'pending').length} icon={Package} tone="sun" />
          <StatCard label="Total Payable" value={`$${totalDebt.toLocaleString()}`} icon={DollarSign} tone="blush" />
        </div>

        <Tabs
          tabs={[
            { id: 'suppliers', label: 'Suppliers' },
            { id: 'purchases', label: 'Purchase Orders' },
          ]}
          active={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />

        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="input !rounded-full !py-3 !pl-10" />
        </div>

        {activeTab === 'suppliers' && (
          <>
          <div className="card overflow-hidden hidden md:block">
            <table className="w-full min-w-[720px]">
              <thead className="bg-cream-soft border-b border-line">
                <tr>
                  <Th>Supplier</Th>
                  <Th>Phone</Th>
                  <Th>Email</Th>
                  <Th>Address</Th>
                  <Th>Balance</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-deep/70">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-cream-soft">
                    <Td className="font-bold text-ink">{supplier.name}</Td>
                    <Td className="text-stone-500">{supplier.phone}</Td>
                    <Td className="text-stone-500">{supplier.email}</Td>
                    <Td className="text-stone-500">{supplier.address}</Td>
                    <Td>{supplier.balance > 0 ? <Chip tone="blush">${supplier.balance.toLocaleString()}</Chip> : <Chip tone="mint">Clear</Chip>}</Td>
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
            {filteredSuppliers.length === 0 && <EmptyState icon={Truck} title="No suppliers found" />}
          </div>
          {/* Cards (mobile) */}
          <div className="md:hidden space-y-3">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-ink tracking-tight truncate">{supplier.name}</p>
                    <p className="text-xs text-stone-400 truncate">{supplier.phone} · {supplier.address}</p>
                    <p className="text-xs text-stone-400 truncate">{supplier.email}</p>
                  </div>
                  {supplier.balance > 0 ? <Chip tone="blush">${supplier.balance.toLocaleString()}</Chip> : <Chip tone="mint">Clear</Chip>}
                </div>
                <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-line">
                  <button className="p-2 text-stone-400 hover:text-ink hover:bg-lime-soft rounded-full"><Eye className="w-4 h-4" /></button>
                  <button className="p-2 text-stone-400 hover:text-ink hover:bg-cream-deep rounded-full"><Edit className="w-4 h-4" /></button>
                  <button className="p-2 text-stone-400 hover:text-[#a34141] hover:bg-blush-soft rounded-full"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {filteredSuppliers.length === 0 && (
              <div className="card"><EmptyState icon={Truck} title="No suppliers found" /></div>
            )}
          </div>
          </>
        )}

        {activeTab === 'purchases' && (
          <>
          <div className="card overflow-hidden hidden md:block">
            <table className="w-full min-w-[640px]">
              <thead className="bg-cream-soft border-b border-line">
                <tr>
                  <Th>PO#</Th>
                  <Th>Supplier</Th>
                  <Th>Date</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-deep/70">
                {mockPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-cream-soft">
                    <Td className="font-bold text-stone-400">#{purchase.id}</Td>
                    <Td className="font-bold text-ink">{purchase.supplier}</Td>
                    <Td className="text-stone-500">{purchase.date}</Td>
                    <Td className="font-bold text-ink">${purchase.total.toLocaleString()}</Td>
                    <Td><Chip tone={purchase.status === 'received' ? 'mint' : purchase.status === 'pending' ? 'sun' : 'blush'}>{purchase.status}</Chip></Td>
                    <Td className="text-right">
                      <button className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4 text-sm">View</button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cards (mobile) */}
          <div className="md:hidden space-y-3">
            {mockPurchases.map((purchase) => (
              <div key={purchase.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-ink tracking-tight">PO #{purchase.id}</p>
                  <p className="text-xs text-stone-400 truncate">{purchase.supplier} · {purchase.date}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-extrabold text-ink">${purchase.total.toLocaleString()}</p>
                  <Chip tone={purchase.status === 'received' ? 'mint' : purchase.status === 'pending' ? 'sun' : 'blush'} className="mt-1">{purchase.status}</Chip>
                </div>
              </div>
            ))}
          </div>
          </>
        )}

        <Modal
          open={showAddSupplier}
          onClose={() => setShowAddSupplier(false)}
          title="Add Supplier"
          footer={
            <>
              <button onClick={() => setShowAddSupplier(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => setShowAddSupplier(false)} className="btn btn-dark flex-1">Save</button>
            </>
          }
        >
          <input type="text" placeholder="Name" className="input" />
          <input type="tel" placeholder="Phone" className="input" />
          <input type="email" placeholder="Email" className="input" />
          <input type="text" placeholder="Address" className="input" />
        </Modal>

        <Modal
          open={showAddPurchase}
          onClose={() => setShowAddPurchase(false)}
          title="Create Purchase Order"
          footer={
            <>
              <button onClick={() => setShowAddPurchase(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => setShowAddPurchase(false)} className="btn btn-dark flex-1">Create PO</button>
            </>
          }
        >
          <select className="input">
            <option>Select Supplier</option>
            {mockSuppliers.map((s) => <option key={s.id}>{s.name}</option>)}
          </select>
          <p className="text-sm text-stone-400">Add products from inventory — full PO builder coming with the backend.</p>
        </Modal>
      </div>
    </Layout>
  );
};

export default Suppliers;
