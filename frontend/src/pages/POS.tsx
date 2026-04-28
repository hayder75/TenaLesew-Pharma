import React, { useState } from 'react';
import Layout from '../components/Layout';
import { mockProducts, type Product } from '../lib/mockData';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,  
  Printer, 
  Camera,
  Check,
  ArrowRight,
  X
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

const ethiopianBanks = [
  { id: 'cash', label: 'Cash (Drawer)', type: 'cash' },
  { id: 'cbe', label: 'Commercial Bank of Ethiopia (CBE)', type: 'bank' },
  { id: 'dashen', label: 'Dashen Bank', type: 'bank' },
  { id: 'awash', label: 'Awash Bank', type: 'bank' },
  { id: 'dashenDirect', label: 'Dashen Bank Direct', type: 'bank' },
  { id: 'hibret', label: 'Hibret Bank', type: 'bank' },
  { id: 'buna', label: 'Buna Bank', type: 'bank' },
  { id: 'zemen', label: 'Zemen Bank', type: 'bank' },
  { id: 'aiben', label: 'Aiben Bank', type: 'bank' },
  { id: 'oromiya', label: 'Oromiya Bank', type: 'bank' },
  { id: 'telebirr', label: 'Telebirr (OTC)', type: 'wallet' },
  { id: 'cbe-birr', label: 'CBE Birr', type: 'wallet' },
  { id: 'amole', label: 'Amole Wallet', type: 'wallet' },
  { id: 'hellocash', label: 'HelloCash', type: 'wallet' },
  { id: 'other', label: 'Other (Specify)', type: 'other' },
];

const POS: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [discount, setDiscount] = useState(0);
  const [showBilling, setShowBilling] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('cash');
  const [otherPayment, setOtherPayment] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<{ items: CartItem[]; total: number; date: string; paymentMethod: string; change: number } | null>(null);

  const filteredProducts = mockProducts.filter(p =>
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search)) && p.stock > 0
  );

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(cart.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ));
      }
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: number) => setCart(cart.filter(item => item.product.id !== productId));

  const updateQuantity = (productId: number, quantity: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (quantity <= 0) removeFromCart(productId);
    else if (item && quantity <= item.product.stock) {
      setCart(cart.map(item => item.product.id === productId ? { ...item, quantity } : item));
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;
  const paidAmount = parseFloat(amountPaid) || 0;
  const change = paidAmount - total;

  const paymentDisplay = selectedPayment === 'other' ? otherPayment : ethiopianBanks.find(b => b.id === selectedPayment)?.label || 'Cash';

  const handleCheckout = () => {
    if (selectedPayment !== 'cash' || change >= 0) {
      const sale = {
        items: cart,
        total,
        date: new Date().toLocaleString(),
        paymentMethod: paymentDisplay,
        change: selectedPayment === 'cash' ? change : 0
      };
      setLastSale(sale);
      setShowBilling(false);
      setShowReceipt(true);
    }
  };

  const handleNewSale = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setPrescriptionFile(null);
    setDiscount(0);
    setShowBilling(false);
    setShowReceipt(false);
    setLastSale(null);
    setAmountPaid('');
    setSelectedPayment('cash');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Branch:</span>
            <span className="font-medium text-gray-900">Main Branch</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-4">
              <h3 className="font-medium text-gray-900 mb-3">Customer Info (Optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                <input type="tel" placeholder="Phone Number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="mt-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                  <Camera className="w-4 h-4" /><span>Upload Prescription</span>
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => setPrescriptionFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
                {prescriptionFile && <span className="text-sm text-green-600 ml-6">{prescriptionFile.name}</span>}
              </div>
            </div>

            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by name or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="card p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {filteredProducts.map(product => (
                  <button key={product.id} onClick={() => addToCart(product)} disabled={product.stock === 0} className="p-2 border border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left disabled:opacity-50">
                    <p className="font-medium text-xs text-gray-900 truncate">{product.name}</p>
                    <p className="text-sm font-bold text-blue-600">${product.price.toFixed(2)}</p>
                    <p className={`text-xs ${product.stock < 10 ? 'text-red-500' : 'text-gray-400'}`}>Stock: {product.stock}</p>
                  </button>
                ))}
              </div>
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-400"><ShoppingCart className="w-10 h-10 mx-auto mb-2" /><p>No products found</p></div>
              )}
            </div>
          </div>

          <div className="card h-fit sticky top-4">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Cart ({cart.length})</h2>
              {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-500">Clear</button>}
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400"><ShoppingCart className="w-10 h-10 mx-auto mb-2" /><p className="text-sm">Cart is empty</p></div>
              ) : (
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">${item.product.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-6 h-6 bg-white border rounded flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-6 h-6 bg-white border rounded flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                        <button onClick={() => removeFromCart(item.product.id)} className="w-6 h-6 bg-red-50 text-red-500 rounded flex items-center justify-center ml-1"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 space-y-3">
                <div><label className="text-xs text-gray-500">Discount %</label><input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({discount}%)</span><span>-${discountAmount.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-lg font-bold"><span>Total</span><span>${total.toFixed(2)}</span></div>
                </div>
                <button onClick={() => { setAmountPaid(total.toString()); setShowBilling(true); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                  Proceed to Billing <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {showBilling && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
                <h2 className="font-semibold text-lg">Payment</h2>
                <button onClick={() => setShowBilling(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-3xl font-bold text-gray-900">${total.toFixed(2)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
                  <select value={selectedPayment} onChange={(e) => setSelectedPayment(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl">
                    <optgroup label="💵 Cash">
                      <option value="cash">Cash (Drawer)</option>
                    </optgroup>
                    <optgroup label="🏦 Banks">
                      {ethiopianBanks.filter(b => b.type === 'bank').map(bank => (
                        <option key={bank.id} value={bank.id}>{bank.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="📱 Mobile Wallets">
                      {ethiopianBanks.filter(b => b.type === 'wallet').map(bank => (
                        <option key={bank.id} value={bank.id}>{bank.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="📝 Other">
                      <option value="other">Other (Specify)</option>
                    </optgroup>
                  </select>
                </div>

                {selectedPayment === 'other' && (
                  <input type="text" value={otherPayment} onChange={(e) => setOtherPayment(e.target.value)} placeholder="Enter bank/wallet name" className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Amount Received</label>
                  <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg font-bold text-center" placeholder="0.00" />
                </div>

                <div className="flex justify-between text-lg">
                  <span className="text-gray-500">Change</span>
                  <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>${change.toFixed(2)}</span>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-700">Receiving to: <span className="font-medium">{paymentDisplay}</span></p>
                </div>
              </div>

              <div className="p-4 border-t sticky bottom-0 bg-white flex gap-3">
                <button onClick={() => setShowBilling(false)} className="flex-1 py-3 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={handleCheckout} disabled={change < 0} className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Complete Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {showReceipt && lastSale && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden print:shadow-none print:fixed print:inset-0 print:m-0 print:max-w-none">
              <div className="bg-green-600 p-6 text-white text-center print:bg-white print:text-black">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 print:bg-green-100"><Check className="w-8 h-8 print:text-green-600" /></div>
                <h2 className="text-2xl font-bold print:text-black">Payment Successful!</h2>
                <p className="text-green-100 print:text-gray-600">{lastSale.date}</p>
              </div>

              <div className="p-6">
                <div className="border-b pb-4 mb-4">
                  {lastSale.items.map(item => (
                    <div key={item.product.id} className="flex justify-between py-1 text-sm">
                      <span className="text-gray-600">{item.product.name} x{item.quantity}</span>
                      <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xl font-bold mb-4"><span>Total Paid</span><span className="text-green-600">${lastSale.total.toFixed(2)}</span></div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-gray-500">Payment</p><p className="font-medium">{lastSale.paymentMethod}</p></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-gray-500">Change</p><p className="font-medium">${lastSale.change.toFixed(2)}</p></div>
                </div>

                {(customerName || customerPhone) && (
                  <div className="text-sm text-gray-500 mb-4">
                    {customerName && <p>Customer: {customerName}</p>}
                    {customerPhone && <p>Phone: {customerPhone}</p>}
                  </div>
                )}

                <div className="flex gap-3 print:hidden">
                  <button onClick={handlePrint} className="flex-1 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2"><Printer className="w-4 h-4" />Print</button>
                  <button onClick={handleNewSale} className="flex-1 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">New Sale</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print\\:hidden { display: none !important; }
            .print\\:fixed { position: fixed !important; }
            .print\\:inset-0 { top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important; }
            .print\\:m-0 { margin: 0 !important; }
            .print\\:max-w-none { max-width: none !important; }
            .print\\:shadow-none { box-shadow: none !important; }
            .print\\:bg-white { background: white !important; }
            .print\\:text-black { color: black !important; }
            .print\\:bg-green-100 { background: #dcfce7 !important; }
            .print\\:text-green-600 { color: #16a34a !important; }
          }
        `}</style>
      </div>
    </Layout>
  );
};

export default POS;