import React, { useState } from 'react';
import Layout from '../components/Layout';
import { mockProducts, type Product } from '../lib/mockData';
import { PageHeader, Tabs, Chip, EmptyState, Th, Td, Avatar } from '../components/ui';
import { Search, Plus, Minus, Trash2, ShoppingCart, FileText, Users, Truck, Receipt } from 'lucide-react';

interface WholesaleItem {
  product: Product;
  quantity: number;
  wholesalePrice: number;
}

interface Client {
  id: number;
  name: string;
  phone: string;
  balance: number;
}

const mockClients: Client[] = [
  { id: 1, name: 'ABC Pharmacy', phone: '0911111111', balance: 5000 },
  { id: 2, name: 'Health Plus Clinic', phone: '0912222222', balance: 2500 },
  { id: 3, name: 'MediCare Store', phone: '0913333333', balance: 0 },
];

const Wholesale: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bulk' | 'orders' | 'clients'>('bulk');
  const [cart, setCart] = useState<WholesaleItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [manualClientName, setManualClientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastOrder, setLastOrder] = useState<{ items: WholesaleItem[]; total: number; client: string; date: string } | null>(null);

  const filteredProducts = mockProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const addToCart = (product: Product, quantity: number = 1) => {
    const wholesalePrice = product.price * 0.8;
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      setCart(cart.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)));
    } else {
      setCart([...cart, { product, quantity, wholesalePrice }]);
    }
  };

  const removeFromCart = (productId: number) => setCart(cart.filter((item) => item.product.id !== productId));
  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) removeFromCart(productId);
    else setCart(cart.map((item) => (item.product.id === productId ? { ...item, quantity } : item)));
  };

  const total = cart.reduce((sum, item) => sum + item.wholesalePrice * item.quantity, 0);

  const handleCheckout = () => {
    const clientDisplay = selectedClient?.name || manualClientName || 'Walk-in Customer';
    setLastOrder({ items: cart, total, client: clientDisplay, date: new Date().toLocaleString() });
    setShowInvoice(true);
  };

  const handleNewOrder = () => {
    setCart([]);
    setSelectedClient(null);
    setManualClientName('');
    setShowInvoice(false);
    setLastOrder(null);
  };

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader title="Wholesale" subtitle="Bulk orders and pharmacy clients" />

        <Tabs
          tabs={[
            { id: 'bulk', label: 'Bulk Order', icon: Truck },
            { id: 'orders', label: 'Orders', icon: Receipt },
            { id: 'clients', label: 'Clients', icon: Users },
          ]}
          active={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />

        {activeTab === 'bulk' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="card p-5">
                <h3 className="font-extrabold text-sm tracking-tight text-ink mb-3">Client <span className="font-medium text-stone-400">(optional)</span></h3>
                <select
                  value={selectedClient?.id || ''}
                  onChange={(e) => {
                    const c = mockClients.find((x) => x.id === parseInt(e.target.value));
                    setSelectedClient(c || null);
                    setManualClientName('');
                  }}
                  className="input mb-2"
                >
                  <option value="">Walk-in Customer</option>
                  {mockClients.map((c) => <option key={c.id} value={c.id}>{c.name} — ${c.balance} due</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Or enter client name manually"
                  value={manualClientName}
                  onChange={(e) => {
                    setManualClientName(e.target.value);
                    setSelectedClient(null);
                  }}
                  className="input"
                />
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="input !rounded-full !py-3 !pl-10" />
              </div>

              <div className="card p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="p-3 border border-line rounded-2xl hover:border-lime hover:shadow-card transition-all">
                      <p className="font-bold text-sm text-ink truncate">{product.name}</p>
                      <p className="text-lg font-extrabold text-ink mt-1">${(product.price * 0.8).toFixed(2)}</p>
                      <p className="text-[11px] text-stone-400">Retail: ${product.price.toFixed(2)}</p>
                      <button onClick={() => addToCart(product, 10)} className="btn btn-lime w-full !py-1.5 !px-3 !text-xs mt-2">
                        <Plus className="w-3.5 h-3.5" /> Add 10+
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card h-fit sticky top-4 overflow-hidden">
              <div className="p-4 border-b border-line bg-cream-soft">
                <h2 className="font-extrabold tracking-tight text-ink flex items-center gap-2">
                  <span className="w-7 h-7 bg-ink rounded-full flex items-center justify-center"><ShoppingCart className="w-3.5 h-3.5 text-lime" /></span>
                  Order ({cart.length})
                </h2>
              </div>
              <div className="p-4 max-h-80 overflow-y-auto">
                {cart.length === 0 ? (
                  <EmptyState icon={Truck} title="No items" sub="Add products to the order" />
                ) : (
                  <div className="space-y-2.5">
                    {cart.map((item) => (
                      <div key={item.product.id} className="p-2.5 bg-cream-soft border border-line rounded-2xl">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-bold text-sm text-ink">{item.product.name}</p>
                            <p className="text-[11px] text-stone-400">${item.wholesalePrice.toFixed(2)}</p>
                          </div>
                          <button onClick={() => removeFromCart(item.product.id)} className="w-7 h-7 bg-blush-soft text-[#a34141] rounded-full flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-6 h-6 bg-white border border-line rounded-full flex items-center justify-center hover:border-lime"><Minus className="w-3 h-3" /></button>
                            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-6 h-6 bg-white border border-line rounded-full flex items-center justify-center hover:border-lime"><Plus className="w-3 h-3" /></button>
                          </div>
                          <span className="font-extrabold text-ink">${(item.wholesalePrice * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {cart.length > 0 && (
                <div className="p-4 border-t border-line space-y-3 bg-cream-soft">
                  <div className="flex justify-between text-lg font-extrabold text-ink">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPaymentMethod('cash')} className={`py-2.5 rounded-full border text-sm font-semibold transition-all ${paymentMethod === 'cash' ? 'border-ink bg-ink text-white' : 'border-line bg-white text-stone-500 hover:border-lime'}`}>Cash</button>
                    <button onClick={() => setPaymentMethod('credit')} className={`py-2.5 rounded-full border text-sm font-semibold transition-all ${paymentMethod === 'credit' ? 'border-ink bg-ink text-white' : 'border-line bg-white text-stone-500 hover:border-lime'}`}>Credit</button>
                  </div>
                  <button onClick={handleCheckout} className="btn btn-dark w-full !py-3.5">Generate Invoice</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="card">
            <EmptyState icon={FileText} title="No orders yet" sub="Generated invoices will appear here" />
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-line bg-cream-soft flex justify-between items-center">
              <h2 className="font-extrabold tracking-tight text-ink">Pharmacy Clients</h2>
              <button className="btn btn-dark !py-2 !px-4 !text-xs">Add Client</button>
            </div>
            <table className="w-full">
              <thead className="bg-cream-soft border-b border-line">
                <tr>
                  <Th>Client</Th>
                  <Th>Phone</Th>
                  <Th>Balance</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-deep/70">
                {mockClients.map((client) => (
                  <tr key={client.id} className="hover:bg-cream-soft">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={client.name} tone="lav" size="sm" />
                        <span className="font-bold text-ink">{client.name}</span>
                      </div>
                    </Td>
                    <Td className="text-stone-500">{client.phone}</Td>
                    <Td>{client.balance > 0 ? <Chip tone="blush">${client.balance.toFixed(2)} due</Chip> : <Chip tone="mint">Clear</Chip>}</Td>
                    <Td className="text-right">
                      <button className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4 text-sm">View</button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showInvoice && lastOrder && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-pop max-w-md w-full overflow-hidden">
              <div className="bg-lime p-6 text-center">
                <h2 className="text-2xl font-extrabold tracking-tight text-ink">Invoice Generated</h2>
                <p className="text-ink/60 text-sm">{lastOrder.date}</p>
              </div>
              <div className="p-6">
                <p className="text-sm text-stone-500 mb-4">Client: <span className="font-bold text-ink">{lastOrder.client}</span></p>
                <div className="border-b border-line pb-4 mb-4">
                  {lastOrder.items.map((item) => (
                    <div key={item.product.id} className="flex justify-between py-1 text-sm">
                      <span className="text-stone-500">{item.product.name} x{item.quantity}</span>
                      <span className="font-semibold">${(item.wholesalePrice * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xl font-extrabold mb-6 text-ink"><span>Total</span><span>${lastOrder.total.toFixed(2)}</span></div>
                <div className="flex gap-3">
                  <button onClick={() => window.print()} className="btn btn-ghost flex-1">Print</button>
                  <button onClick={handleNewOrder} className="btn btn-dark flex-1">New Order</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Wholesale;
