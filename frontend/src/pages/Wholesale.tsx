import React, { useState } from 'react';
import Layout from '../components/Layout';
import { mockProducts, type Product } from '../lib/mockData';
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

  const filteredProducts = mockProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const addToCart = (product: Product, quantity: number = 1) => {
    const wholesalePrice = product.price * 0.8;
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item));
    } else {
      setCart([...cart, { product, quantity, wholesalePrice }]);
    }
  };

  const removeFromCart = (productId: number) => setCart(cart.filter(item => item.product.id !== productId));
  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) removeFromCart(productId);
    else setCart(cart.map(item => item.product.id === productId ? { ...item, quantity } : item));
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wholesale</h1>
            <p className="text-gray-500 mt-1">Bulk orders and pharmacy clients</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {[
            { id: 'bulk', label: 'Bulk Order', icon: Truck },
            { id: 'orders', label: 'Orders', icon: Receipt },
            { id: 'clients', label: 'Clients', icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'bulk' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="card p-4">
                <h3 className="font-medium text-gray-900 mb-3">Client (Optional)</h3>
                <select
                  value={selectedClient?.id || ''}
                  onChange={(e) => { const c = mockClients.find(x => x.id === parseInt(e.target.value)); setSelectedClient(c || null); setManualClientName(''); }}
                  className="w-full mb-2 px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Walk-in Customer</option>
                  {mockClients.map(c => <option key={c.id} value={c.id}>{c.name} - ${c.balance} due</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Or enter client name manually"
                  value={manualClientName}
                  onChange={(e) => { setManualClientName(e.target.value); setSelectedClient(null); }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="card p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredProducts.map(product => (
                    <div key={product.id} className="p-3 border border-gray-100 rounded-xl hover:border-blue-500 transition-all">
                      <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                      <p className="text-lg font-bold text-green-600 mt-1">${(product.price * 0.8).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">Retail: ${product.price.toFixed(2)}</p>
                      <button onClick={() => addToCart(product, 10)} className="w-full mt-2 bg-blue-600 text-white text-xs py-1.5 rounded-lg hover:bg-blue-700">
                        Add 10+
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card h-fit sticky top-4">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Order ({cart.length})
                </h2>
              </div>
              <div className="p-4 max-h-80 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Truck className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm">No items</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.product.id} className="p-2 bg-gray-50 rounded-lg">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium text-sm">{item.product.name}</p>
                            <p className="text-xs text-gray-500">${item.wholesalePrice.toFixed(2)}</p>
                          </div>
                          <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-6 h-6 bg-white border rounded flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-6 h-6 bg-white border rounded flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                          </div>
                          <span className="font-medium">${(item.wholesalePrice * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {cart.length > 0 && (
                <div className="p-4 border-t border-gray-100 space-y-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPaymentMethod('cash')} className={`py-2 rounded-lg border text-sm ${paymentMethod === 'cash' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200'}`}>💵 Cash</button>
                    <button onClick={() => setPaymentMethod('credit')} className={`py-2 rounded-lg border text-sm ${paymentMethod === 'credit' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200'}`}>📄 Credit</button>
                  </div>
                  <button onClick={handleCheckout} className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700">Generate Invoice</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="card">
            <div className="p-8 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2" />
              <p>No orders yet</p>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Pharmacy Clients</h2>
              <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">Add Client</button>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockClients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{client.name}</td>
                    <td className="px-4 py-3 text-gray-500">{client.phone}</td>
                    <td className="px-4 py-3"><span className={client.balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>${client.balance.toFixed(2)}</span></td>
                    <td className="px-4 py-3 text-right"><button className="text-blue-600 hover:underline text-sm">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showInvoice && lastOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-green-600 p-6 text-white text-center">
                <h2 className="text-2xl font-bold">Invoice Generated</h2>
                <p className="text-green-100">{lastOrder.date}</p>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-500 mb-4">Client: <span className="font-medium text-gray-900">{lastOrder.client}</span></p>
                <div className="border-b pb-4 mb-4">
                  {lastOrder.items.map(item => (
                    <div key={item.product.id} className="flex justify-between py-1 text-sm">
                      <span>{item.product.name} x{item.quantity}</span>
                      <span>${(item.wholesalePrice * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xl font-bold mb-6"><span>Total</span><span>${lastOrder.total.toFixed(2)}</span></div>
                <div className="flex gap-3">
                  <button onClick={() => window.print()} className="flex-1 py-2 border border-gray-200 rounded-xl hover:bg-gray-50">Print</button>
                  <button onClick={handleNewOrder} className="flex-1 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">New Order</button>
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