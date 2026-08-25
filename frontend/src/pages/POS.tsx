import React, { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { apiGet, apiPost } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { money, errMsg } from '../lib/format';
import { Chip, EmptyState, Modal, Btn } from '../components/ui';
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, Check, ArrowRight, X, Clock, Lock } from 'lucide-react';
import type { Product, Sale, Shift, StockRow } from '../lib/types';

interface CartLine {
  product: Product;
  qty: number;
}

const ethiopianBanks = [
  { id: 'cash', label: 'Cash (Drawer)', type: 'cash' },
  { id: 'cbe', label: 'Commercial Bank of Ethiopia (CBE)', type: 'bank' },
  { id: 'dashen', label: 'Dashen Bank', type: 'bank' },
  { id: 'awash', label: 'Awash Bank', type: 'bank' },
  { id: 'telebirr', label: 'Telebirr (OTC)', type: 'wallet' },
  { id: 'cbe-birr', label: 'CBE Birr', type: 'wallet' },
  { id: 'other', label: 'Other (Specify)', type: 'other' },
];

const POS: React.FC = () => {
  const { currentBranch, user } = useAuth();
  const branchId = currentBranch?.id;
  const expired = currentBranch?.license.status === 'EXPIRED';

  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showBilling, setShowBilling] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDetail, setPaymentDetail] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [showShiftClose, setShowShiftClose] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [zReport, setZReport] = useState<{ expectedCash: number; countedCash: number; variance: number; totalSales: number; saleCount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { data: stockData, reload: reloadStock } = useApi<{ items: StockRow[] }>(
    () => apiGet(`/inventory/stock?branchId=${branchId}&limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`),
    [branchId, search]
  );

  const { data: shift, reload: reloadShift } = useApi<Shift | null>(
    () => apiGet(`/pos/shifts/current?branchId=${branchId}`),
    [branchId]
  );

  const stockMap = useMemo(() => {
    const m = new Map<string, StockRow>();
    stockData?.items.forEach((s) => m.set(s.productId, s));
    return m;
  }, [stockData]);

  const products: Product[] = useMemo(
    () =>
      (stockData?.items || []).map((s) => ({
        id: s.productId,
        name: s.name,
        genericName: s.genericName,
        barcode: s.barcode,
        unitPrice: s.unitPrice,
        costPrice: 0,
        reorderLevel: s.reorderLevel,
        isActive: true,
      })),
    [stockData]
  );

  const addToCart = (product: Product) => {
    const stockRow = stockMap.get(product.id);
    const available = stockRow?.totalQty || 0;
    const existing = cart.find((l) => l.product.id === product.id);
    if (existing) {
      if (existing.qty < available) setCart(cart.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l)));
    } else if (available > 0) {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const updateQty = (productId: string, qty: number) => {
    const available = stockMap.get(productId)?.totalQty || 0;
    if (qty <= 0) setCart(cart.filter((l) => l.product.id !== productId));
    else if (qty <= available) setCart(cart.map((l) => (l.product.id === productId ? { ...l, qty } : l)));
  };

  const subtotal = cart.reduce((s, l) => s + l.product.unitPrice * l.qty, 0);
  const total = Math.max(0, subtotal - discount);
  const paidAmount = parseFloat(amountPaid) || 0;
  const change = paidAmount - total;
  const isCredit = paymentMethod === 'credit';
  const canCheckout = isCredit || paymentMethod === 'mixed' || change >= 0;

  const openShift = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPost('/pos/shifts/open', { branchId, openingFloat: 0 });
      reloadShift();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const closeShift = async () => {
    if (!shift) return;
    setBusy(true);
    setError('');
    try {
      const res = await apiPost<{ zReport: { expectedCash: number; countedCash: number; variance: number; totalSales: number; saleCount: number } }>(
        `/pos/shifts/${shift.id}/close`,
        { countedCash: parseFloat(countedCash) || 0 }
      );
      setZReport(res.zReport);
      setShowShiftClose(false);
      reloadShift();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const checkout = async () => {
    setBusy(true);
    setError('');
    try {
      const sale = await apiPost<Sale>('/pos/sales', {
        branchId,
        shiftId: shift?.id,
        customerName: customerName || undefined,
        items: cart.map((l) => ({ productId: l.product.id, qty: l.qty })),
        paymentMethod,
        paymentDetail: paymentDetail || undefined,
        amountPaid: paymentMethod === 'credit' ? 0 : parseFloat(amountPaid) || total,
        saleDiscount: discount || 0,
      });
      setLastSale(sale);
      setShowBilling(false);
      setShowCartSheet(false);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      setAmountPaid('');
      setPaymentMethod('cash');
      setPaymentDetail('');
      reloadStock();
      reloadShift();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const newSale = () => {
    setLastSale(null);
    setZReport(null);
  };

  const cartList = (compact: boolean) => (
    <div className={compact ? 'space-y-2' : 'space-y-2'}>
      {cart.map((line) => (
        <div key={line.product.id} className={`flex items-center gap-2 ${compact ? 'p-2.5' : 'p-3'} bg-cream-soft rounded-2xl border border-line`}>
          <div className="flex-1 min-w-0">
            <p className={`font-bold ${compact ? 'text-xs' : 'text-sm'} text-ink truncate`}>{line.product.name}</p>
            <p className="text-[11px] text-stone-400">{money(line.product.unitPrice)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => updateQty(line.product.id, line.qty - 1)} className="w-7 h-7 bg-white border border-line rounded-full flex items-center justify-center hover:border-lime"><Minus className="w-3 h-3" /></button>
            <span className="w-8 text-center text-sm font-bold">{line.qty}</span>
            <button onClick={() => updateQty(line.product.id, line.qty + 1)} className="w-7 h-7 bg-white border border-line rounded-full flex items-center justify-center hover:border-lime"><Plus className="w-3 h-3" /></button>
            <button onClick={() => setCart(cart.filter((l) => l.product.id !== line.product.id))} className="w-7 h-7 bg-blush-soft text-[#a34141] rounded-full flex items-center justify-center ml-1"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Layout>
      <div className="space-y-4 pb-28 lg:pb-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Point of Sale</h1>
          <div className="flex items-center gap-2">
            <Chip tone="lime">{currentBranch?.name}</Chip>
            {shift ? (
              <button onClick={() => { setShowShiftClose(true); setCountedCash(String(shift.cashSoFar || 0)); }} className="chip bg-sky-soft text-[#3d5a94] cursor-pointer">
                <Clock className="w-3 h-3" /> Shift open · {money(shift.cashSoFar)} · close
              </button>
            ) : (
              !expired && (
                <button onClick={openShift} disabled={busy} className="btn btn-lime !py-2 !px-4 !text-xs">
                  Open shift to sell
                </button>
              )
            )}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl text-sm text-[#a34141] font-medium">{error}</div>
        )}

        {expired ? (
          <div className="card-dark p-10 text-center max-w-md mx-auto mt-10">
            <div className="w-16 h-16 bg-lime rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-ink" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Branch license expired</h2>
            <p className="text-white/50 mt-2 text-sm">Selling is disabled until the platform renews this branch's license. Reports are still available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="card p-5">
                <h3 className="font-extrabold text-sm tracking-tight text-ink mb-3">Customer info <span className="font-medium text-stone-400">(optional)</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input" />
                  <input type="tel" placeholder="Phone number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input" />
                </div>
              </div>

              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="text" placeholder="Search by name or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="input !rounded-full !py-3 !pl-11" />
              </div>

              <div className="card p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                  {products.map((product) => {
                    const row = stockMap.get(product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        disabled={!row || row.totalQty <= 0}
                        className="p-3 bg-white border border-line rounded-2xl hover:border-lime hover:bg-lime-soft/40 hover:shadow-card transition-all text-left group disabled:opacity-40"
                      >
                        <p className="font-bold text-xs text-ink truncate">{product.name}</p>
                        <p className="text-[15px] font-extrabold text-ink mt-1">{money(product.unitPrice)}</p>
                        <p className={`text-[11px] font-semibold mt-0.5 ${!row || row.totalQty <= 0 ? 'text-[#a34141]' : row.totalQty < 10 ? 'text-[#8a6d10]' : 'text-stone-400'}`}>
                          {row ? `Stock: ${row.totalQty}` : 'No stock'}
                        </p>
                        <div className="mt-2 w-6 h-6 rounded-full bg-lime-soft text-[#5c6b12] flex items-center justify-center group-hover:bg-lime group-hover:text-ink transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
                {products.length === 0 && <EmptyState icon={ShoppingCart} title="No products with stock" sub="Receive a GRN or add products first" />}
              </div>
            </div>

            {/* Desktop cart */}
            <div className="hidden lg:block">
              <div className="card h-fit sticky top-4 overflow-hidden">
                <div className="p-4 border-b border-line flex items-center justify-between bg-cream-soft">
                  <h2 className="font-extrabold tracking-tight text-ink flex items-center gap-2">
                    <span className="w-7 h-7 bg-ink rounded-full flex items-center justify-center"><ShoppingCart className="w-3.5 h-3.5 text-lime" /></span>
                    Cart ({cart.length})
                  </h2>
                  {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs font-bold text-[#a34141] bg-blush-soft px-3 py-1 rounded-full">Clear</button>}
                </div>
                <div className="p-4 max-h-80 overflow-y-auto">
                  {cart.length === 0 ? <EmptyState icon={ShoppingCart} title="Cart is empty" sub="Tap products to add them" /> : cartList(true)}
                </div>
                {cart.length > 0 && (
                  <div className="p-4 border-t border-line space-y-3 bg-cream-soft">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Discount (amount)</label>
                      <input type="number" min="0" value={discount} onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))} className="input mt-1" />
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-stone-500"><span>Subtotal</span><span className="font-semibold text-ink">{money(subtotal)}</span></div>
                      {discount > 0 && <div className="flex justify-between text-[#2f6b46] font-semibold"><span>Discount</span><span>-{money(discount)}</span></div>}
                      <div className="flex justify-between text-lg font-extrabold text-ink pt-1"><span>Total</span><span>{money(total)}</span></div>
                    </div>
                    <Btn variant="dark" className="w-full !py-3.5" onClick={() => { setAmountPaid(String(total)); setShowBilling(true); }}>
                      Proceed to Billing <ArrowRight className="w-5 h-5" />
                    </Btn>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile floating cart bar */}
        {cart.length > 0 && !expired && !showBilling && !lastSale && !showCartSheet && (
          <div className="lg:hidden fixed bottom-4 inset-x-4 z-40">
            <button onClick={() => setShowCartSheet(true)} className="card-dark w-full !rounded-full pl-5 pr-2 py-2 flex items-center justify-between shadow-pop">
              <div className="text-left">
                <p className="text-[11px] text-white/50 font-bold uppercase tracking-wider">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
                <p className="font-extrabold text-lime text-lg leading-tight">{money(total)}</p>
              </div>
              <span className="btn btn-lime !py-2.5">View Cart <ArrowRight className="w-4 h-4" /></span>
            </button>
          </div>
        )}

        {/* Mobile cart sheet */}
        {showCartSheet && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setShowCartSheet(false)} />
            <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[28px] max-h-[88vh] flex flex-col shadow-pop" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div className="p-4 border-b border-line flex items-center justify-between shrink-0">
                <h2 className="font-extrabold tracking-tight text-ink">Cart ({cart.length})</h2>
                <button onClick={() => setShowCartSheet(false)} className="p-2 hover:bg-cream rounded-full text-stone-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">{cartList(false)}</div>
              {cart.length > 0 && (
                <div className="p-4 border-t border-line space-y-3 bg-cream-soft shrink-0">
                  <div className="flex justify-between text-lg font-extrabold text-ink"><span>Total</span><span>{money(total)}</span></div>
                  <Btn variant="dark" className="w-full !py-3.5" onClick={() => { setAmountPaid(String(total)); setShowBilling(true); }}>
                    Proceed to Billing <ArrowRight className="w-5 h-5" />
                  </Btn>
                </div>
              )}
            </div>
          </div>
        )}

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
                  <p className="text-[34px] font-extrabold tracking-tight text-ink">{money(total)}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5 block">Payment method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
                    <optgroup label="Cash"><option value="cash">Cash (Drawer)</option></optgroup>
                    <optgroup label="Banks">
                      {ethiopianBanks.filter((b) => b.type === 'bank').map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </optgroup>
                    <optgroup label="Mobile Wallets">
                      {ethiopianBanks.filter((b) => b.type === 'wallet').map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </optgroup>
                    <optgroup label="Other"><option value="other">Other (Specify)</option></optgroup>
                  </select>
                </div>
                {paymentMethod === 'other' && (
                  <input className="input" value={paymentDetail} onChange={(e) => setPaymentDetail(e.target.value)} placeholder="Enter bank/wallet name" />
                )}
                {paymentMethod !== 'credit' && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5 block">Amount received</label>
                    <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="input !text-xl !font-extrabold text-center" placeholder="0.00" />
                  </div>
                )}
                {paymentMethod !== 'credit' && (
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-stone-500 text-sm font-semibold">Change</span>
                    <span className={`font-extrabold ${change >= 0 ? 'text-[#2f6b46]' : 'text-[#a34141]'}`}>{money(change)}</span>
                  </div>
                )}
                {error && <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl text-sm text-[#a34141] font-medium">{error}</div>}
              </div>
              <div className="p-4 border-t border-line sticky bottom-0 bg-white flex flex-col-reverse sm:flex-row gap-3 [&>*]:w-full sm:[&>*]:flex-1">
                <Btn variant="ghost" className="!py-3" onClick={() => setShowBilling(false)}>Cancel</Btn>
                <Btn variant="lime" className="!py-3" onClick={checkout} disabled={busy || !canCheckout || !shift}>
                  <Check className="w-5 h-5" /> {busy ? 'Processing…' : 'Complete Payment'}
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* Receipt modal */}
        {lastSale && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-pop max-w-md w-full overflow-hidden print:shadow-none print:fixed print:inset-0 print:m-0 print:max-w-none print:rounded-none">
              <div className="bg-lime p-6 text-center print:bg-white">
                <div className="w-16 h-16 bg-ink rounded-full flex items-center justify-center mx-auto mb-3 print:bg-cream">
                  <Check className="w-8 h-8 text-lime print:text-ink" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-ink">Payment Successful!</h2>
                <p className="text-ink/60 text-sm">{new Date(lastSale.createdAt).toLocaleString()}</p>
              </div>
              <div className="p-6">
                <div className="text-center mb-4">
                  <p className="font-extrabold text-ink">{lastSale.receiptNo}</p>
                  <p className="text-xs text-stone-400">{currentBranch?.name} · {user?.fullName || user?.username}</p>
                </div>
                <div className="border-b border-line pb-4 mb-4">
                  {lastSale.items?.map((item) => (
                    <div key={item.id} className="flex justify-between py-1 text-sm">
                      <span className="text-stone-500">{item.productName} x{item.qty}</span>
                      <span className="font-semibold">{money(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xl font-extrabold mb-4 text-ink"><span>Total Paid</span><span>{money(lastSale.total)}</span></div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="p-3 bg-cream-soft border border-line rounded-2xl"><p className="text-stone-400 text-xs font-bold uppercase tracking-wider">Payment</p><p className="font-bold text-ink capitalize">{lastSale.paymentMethod}{lastSale.paymentDetail ? ` · ${lastSale.paymentDetail}` : ''}</p></div>
                  <div className="p-3 bg-cream-soft border border-line rounded-2xl"><p className="text-stone-400 text-xs font-bold uppercase tracking-wider">Change</p><p className="font-bold text-ink">{money(lastSale.changeDue)}</p></div>
                </div>
                <div className="text-center text-xs text-stone-400 mb-4">Thank you for choosing {currentBranch?.name} — get well soon! 🌿</div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 print:hidden [&>*]:w-full sm:[&>*]:flex-1">
                  <Btn variant="ghost" onClick={() => window.print()}><Printer className="w-4 h-4" />Print</Btn>
                  <Btn variant="dark" onClick={newSale}>New Sale</Btn>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Close shift modal */}
        <Modal
          open={showShiftClose}
          onClose={() => setShowShiftClose(false)}
          title="Close shift (Z-report)"
          footer={
            <>
              <Btn variant="ghost" className="flex-1" onClick={() => setShowShiftClose(false)}>Cancel</Btn>
              <Btn variant="dark" className="flex-1" onClick={closeShift} disabled={busy}>{busy ? 'Closing…' : 'Close shift'}</Btn>
            </>
          }
        >
          <p className="text-sm text-stone-500 -mt-1">
            Cash collected this shift: <b className="text-ink">{money(shift?.cashSoFar)}</b> (plus opening float 0)
          </p>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Counted cash *</label>
            <input type="number" className="input mt-1 !text-xl !font-extrabold text-center" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} />
          </div>
        </Modal>

        {/* Z-report modal */}
        {zReport && (
          <Modal
            open={!!zReport}
            onClose={newSale}
            title="Shift closed — Z-Report"
            footer={<Btn variant="dark" className="flex-1" onClick={newSale}>Done</Btn>}
          >
            <div className={`text-center p-5 rounded-3xl border ${Math.abs(zReport.variance) < 0.01 ? 'bg-mint-soft border-mint/40' : 'bg-sun-soft border-sun/40'}`}>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Variance</p>
              <p className={`text-4xl font-extrabold ${zReport.variance < 0 ? 'text-[#a34141]' : 'text-[#2f6b46]'}`}>{money(zReport.variance)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-cream-soft border border-line rounded-2xl"><p className="text-stone-400 text-xs font-bold uppercase">Total sales</p><p className="font-extrabold text-ink">{money(zReport.totalSales)}</p></div>
              <div className="p-3 bg-cream-soft border border-line rounded-2xl"><p className="text-stone-400 text-xs font-bold uppercase">Transactions</p><p className="font-extrabold text-ink">{zReport.saleCount}</p></div>
              <div className="p-3 bg-cream-soft border border-line rounded-2xl"><p className="text-stone-400 text-xs font-bold uppercase">Expected cash</p><p className="font-extrabold text-ink">{money(zReport.expectedCash)}</p></div>
              <div className="p-3 bg-cream-soft border border-line rounded-2xl"><p className="text-stone-400 text-xs font-bold uppercase">Counted</p><p className="font-extrabold text-ink">{money(zReport.countedCash)}</p></div>
            </div>
          </Modal>
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
