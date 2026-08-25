import React, { useState } from 'react';
import Layout from '../components/Layout';
import { mockProducts, type Product } from '../lib/mockData';
import { Chip, EmptyState } from '../components/ui';
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

  const filteredProducts = mockProducts.filter(
    (p) => (p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search)) && p.stock > 0
  );

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(cart.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)));
      }
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: number) => setCart(cart.filter((item) => item.product.id !== productId));

  const updateQuantity = (productId: number, quantity: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (quantity <= 0) removeFromCart(productId);
    else if (item && quantity <= item.product.stock) {
      setCart(cart.map((item) => (item.product.id === productId ? { ...item, quantity } : item)));
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;
  const paidAmount = parseFloat(amountPaid) || 0;
  const change = paidAmount - total;

  const paymentDisplay = selectedPayment === 'other' ? otherPayment : ethiopianBanks.find((b) => b.id === selectedPayment)?.label || 'Cash';

  const handleCheckout = () => {
    if (selectedPayment !== 'cash' || change >= 0) {
      const sale = {
        items: cart,
        total,
        date: new Date().toLocaleString(),
        paymentMethod: paymentDisplay,
        change: selectedPayment === 'cash' ? change : 0,
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

  const handlePrint = () => window.print();

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Point of Sale</h1>
          <Chip tone="lime">Main Branch</Chip>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Customer info */}
            <div className="card p-5">
              <h3 className="font-extrabold text-sm tracking-tight text-ink mb-3">Customer info <span className="font-medium text-stone-400">(optional)</span></h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input" />
                <input type="tel" placeholder="Phone number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input" />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-ink bg-cream-soft hover:bg-lime-soft border border-line rounded-full px-4 py-2 transition-all">
                  <Camera className="w-4 h-4" />
                  <span>Upload Prescription</span>
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => setPrescriptionFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
                {prescriptionFile && <Chip tone="mint">{prescriptionFile.name}</Chip>}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input type="text" placeholder="Search by name or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="input !rounded-full !py-3 !pl-11" />
            </div>

            {/* Product grid */}
            <div className="card p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                    className="p-3 bg-white border border-line rounded-2xl hover:border-lime hover:bg-lime-soft/40 hover:shadow-card transition-all text-left group disabled:opacity-40"
                  >
                    <p className="font-bold text-xs text-ink truncate">{product.name}</p>
                    <p className="text-[15px] font-extrabold text-ink mt-1">${product.price.toFixed(2)}</p>
                    <p className={`text-[11px] font-semibold mt-0.5 ${product.stock < 10 ? 'text-[#a34141]' : 'text-stone-400'}`}>
                      Stock: {product.stock}
                    </p>
                    <div className="mt-2 w-6 h-6 rounded-full bg-lime-soft text-[#5c6b12] flex items-center justify-center group-hover:bg-lime group-hover:text-ink transition-all">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
              {filteredProducts.length === 0 && <EmptyState icon={ShoppingCart} title="No products found" sub="Try a different search" />}
            </div>
          </div>

          {/* Cart */}
          <div className="card h-fit sticky top-4 overflow-hidden">
            <div className="p-4 border-b border-line flex items-center justify-between bg-cream-soft">
              <h2 className="font-extrabold tracking-tight text-ink flex items-center gap-2">
                <span className="w-7 h-7 bg-ink rounded-full flex items-center justify-center"><ShoppingCart className="w-3.5 h-3.5 text-lime" /></span>
                Cart ({cart.length})
              </h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs font-bold text-[#a34141] bg-blush-soft px-3 py-1 rounded-full">Clear</button>
              )}
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {cart.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="Cart is empty" sub="Tap products to add them" />
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-2 p-2.5 bg-cream-soft rounded-2xl border border-line">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-ink truncate">{item.product.name}</p>
                        <p className="text-[11px] text-stone-400">${item.product.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-6 h-6 bg-white border border-line rounded-full flex items-center justify-center hover:border-lime"><Minus className="w-3 h-3" /></button>
                        <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-6 h-6 bg-white border border-line rounded-full flex items-center justify-center hover:border-lime"><Plus className="w-3 h-3" /></button>
                        <button onClick={() => removeFromCart(item.product.id)} className="w-6 h-6 bg-blush-soft text-[#a34141] rounded-full flex items-center justify-center ml-1"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-line space-y-3 bg-cream-soft">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Discount %</label>
                  <input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className="input mt-1" />
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-stone-500"><span>Subtotal</span><span className="font-semibold text-ink">${subtotal.toFixed(2)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-[#2f6b46] font-semibold"><span>Discount ({discount}%)</span><span>-${discountAmount.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-lg font-extrabold text-ink pt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
                </div>
                <button onClick={() => { setAmountPaid(total.toString()); setShowBilling(true); }} className="btn btn-dark w-full !py-3.5">
                  Proceed to Billing <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Billing modal */}
        {showBilling && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-pop max-w-lg w-full overflow-hidden max-h-[92vh] overflow-y-auto">
              <div className="p-4 border-b border-line flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="font-extrabold tracking-tight text-ink">Payment</h2>
                <button onClick={() => setShowBilling(false)} className="p-1.5 hover:bg-cream rounded-full text-stone-400"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-5 space-y-4">
                <div className="text-center p-5 bg-cream-soft border border-line rounded-3xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Total amount</p>
                  <p className="text-[34px] font-extrabold tracking-tight text-ink">${total.toFixed(2)}</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5 block">Payment method</label>
                  <select value={selectedPayment} onChange={(e) => setSelectedPayment(e.target.value)} className="input">
                    <optgroup label="Cash">
                      <option value="cash">Cash (Drawer)</option>
                    </optgroup>
                    <optgroup label="Banks">
                      {ethiopianBanks.filter((b) => b.type === 'bank').map((bank) => (
                        <option key={bank.id} value={bank.id}>{bank.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Mobile Wallets">
                      {ethiopianBanks.filter((b) => b.type === 'wallet').map((bank) => (
                        <option key={bank.id} value={bank.id}>{bank.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Other">
                      <option value="other">Other (Specify)</option>
                    </optgroup>
                  </select>
                </div>

                {selectedPayment === 'other' && (
                  <input type="text" value={otherPayment} onChange={(e) => setOtherPayment(e.target.value)} placeholder="Enter bank/wallet name" className="input" />
                )}

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5 block">Amount received</label>
                  <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="input !text-xl !font-extrabold text-center" placeholder="0.00" />
                </div>

                <div className="flex justify-between items-center text-lg">
                  <span className="text-stone-500 text-sm font-semibold">Change</span>
                  <span className={`font-extrabold ${change >= 0 ? 'text-[#2f6b46]' : 'text-[#a34141]'}`}>${change.toFixed(2)}</span>
                </div>

                <div className="p-3 bg-lime-soft border border-lime/40 rounded-2xl">
                  <p className="text-sm text-[#5c6b12] font-semibold">Receiving to: <span className="font-extrabold">{paymentDisplay}</span></p>
                </div>
              </div>

              <div className="p-4 border-t border-line sticky bottom-0 bg-white flex gap-3">
                <button onClick={() => setShowBilling(false)} className="btn btn-ghost flex-1 !py-3">Cancel</button>
                <button onClick={handleCheckout} disabled={change < 0} className="btn btn-lime flex-1 !py-3">
                  <Check className="w-5 h-5" /> Complete Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt modal */}
        {showReceipt && lastSale && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-pop max-w-md w-full overflow-hidden print:shadow-none print:fixed print:inset-0 print:m-0 print:max-w-none print:rounded-none">
              <div className="bg-lime p-6 text-center print:bg-white">
                <div className="w-16 h-16 bg-ink rounded-full flex items-center justify-center mx-auto mb-3 print:bg-cream">
                  <Check className="w-8 h-8 text-lime print:text-ink" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-ink">Payment Successful!</h2>
                <p className="text-ink/60 text-sm">{lastSale.date}</p>
              </div>

              <div className="p-6">
                <div className="border-b border-line pb-4 mb-4">
                  {lastSale.items.map((item) => (
                    <div key={item.product.id} className="flex justify-between py-1 text-sm">
                      <span className="text-stone-500">{item.product.name} x{item.quantity}</span>
                      <span className="font-semibold">${(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xl font-extrabold mb-4 text-ink"><span>Total Paid</span><span>${lastSale.total.toFixed(2)}</span></div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="p-3 bg-cream-soft border border-line rounded-2xl"><p className="text-stone-400 text-xs font-bold uppercase tracking-wider">Payment</p><p className="font-bold text-ink">{lastSale.paymentMethod}</p></div>
                  <div className="p-3 bg-cream-soft border border-line rounded-2xl"><p className="text-stone-400 text-xs font-bold uppercase tracking-wider">Change</p><p className="font-bold text-ink">${lastSale.change.toFixed(2)}</p></div>
                </div>

                {(customerName || customerPhone) && (
                  <div className="text-sm text-stone-500 mb-4">
                    {customerName && <p>Customer: {customerName}</p>}
                    {customerPhone && <p>Phone: {customerPhone}</p>}
                  </div>
                )}

                <div className="flex gap-3 print:hidden">
                  <button onClick={handlePrint} className="btn btn-ghost flex-1"><Printer className="w-4 h-4" />Print</button>
                  <button onClick={handleNewSale} className="btn btn-dark flex-1">New Sale</button>
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
            .print\\:rounded-none { border-radius: 0 !important; }
            .print\\:shadow-none { box-shadow: none !important; }
            .print\\:bg-white { background: white !important; }
            .print\\:bg-cream { background: #f4f2ea !important; }
            .print\\:text-ink { color: #1d1d18 !important; }
            .print\\:text-lime { color: #1d1d18 !important; }
          }
        `}</style>
      </div>
    </Layout>
  );
};

export default POS;
