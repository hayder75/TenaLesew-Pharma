import React, { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { apiGet, apiPost } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { money, dateTimeStr, errMsg } from '../lib/format';
import { PageHeader, Tabs, Chip, EmptyState, Btn, Th, Td, Avatar, statusTone } from '../components/ui';
import { Search, Plus, Minus, Trash2, ShoppingCart, FileText, Users, Truck, Printer } from 'lucide-react';
import type { Customer, Product, Sale, StockRow, SaleItem } from '../lib/types';

interface CartLine {
  product: Product;
  qty: number;
  unitPrice: number;
}

const Wholesale: React.FC = () => {
  const { currentBranch } = useAuth();
  const branchId = currentBranch?.id;
  const expired = currentBranch?.license.status === 'EXPIRED';
  const [tab, setTab] = useState('bulk');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manualName, setManualName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [invoice, setInvoice] = useState<Sale | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { data: stockData } = useApi<{ items: StockRow[] }>(() => apiGet(`/inventory/stock?branchId=${branchId}&limit=200`), [branchId]);
  const { data: clients, reload: reloadClients } = useApi<{ items: Customer[] }>(() => apiGet('/customers?type=wholesale'), [tab]);
  const { data: orders } = useApi<{ items: Sale[] }>(() => apiGet('/pos/sales?limit=50'), [tab]);

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
        unitPrice: s.unitPrice,
        costPrice: s.batches[0]?.costPrice || 0,
        reorderLevel: s.reorderLevel,
        isActive: true,
      })),
    [stockData]
  );

  const addToCart = (product: Product, qty = 10) => {
    const available = stockMap.get(product.id)?.totalQty || 0;
    const wholesalePrice = product.costPrice > 0 ? Math.round(product.costPrice * 1.25 * 100) / 100 : product.unitPrice * 0.8;
    const existing = cart.find((l) => l.product.id === product.id);
    if (existing) {
      setCart(cart.map((l) => (l.product.id === product.id ? { ...l, qty: Math.min(l.qty + qty, available) } : l)));
    } else if (available > 0) {
      setCart([...cart, { product, qty: Math.min(qty, available), unitPrice: wholesalePrice }]);
    }
  };

  const total = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  const checkout = async () => {
    setBusy(true);
    setError('');
    try {
      const sale = await apiPost<Sale>('/pos/sales', {
        branchId,
        customerId: selectedCustomer?.id || undefined,
        items: cart.map((l) => ({ productId: l.product.id, qty: l.qty })),
        paymentMethod: paymentMethod === 'credit' ? 'credit' : 'cash',
        isWholesale: true,
        amountPaid: paymentMethod === 'credit' ? 0 : total,
      });
      setInvoice(sale);
      setCart([]);
      setSelectedCustomer(null);
      setManualName('');
      reloadClients();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader title="Wholesale" subtitle="Bulk orders and credit clients" />

        {error && <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl text-sm text-[#a34141] font-medium">{error}</div>}

        <Tabs
          tabs={[
            { id: 'bulk', label: 'Bulk order', icon: Truck },
            { id: 'orders', label: 'Orders', icon: FileText },
            { id: 'clients', label: 'Clients', icon: Users },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'bulk' && (expired ? (
          <div className="card p-10 text-center">
            <p className="font-bold text-ink">Branch license expired</p>
            <p className="text-sm text-stone-400 mt-1">Wholesale orders are disabled until renewal.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="card p-5">
                <h3 className="font-extrabold text-sm tracking-tight text-ink mb-3">Client</h3>
                <select
                  className="input mb-2"
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const c = clients?.items.find((x) => x.id === e.target.value);
                    setSelectedCustomer(c || null);
                    setManualName('');
                  }}
                >
                  <option value="">Walk-in customer</option>
                  {clients?.items.map((c) => <option key={c.id} value={c.id}>{c.name} — credit {money(c.creditBalance)}/{money(c.creditLimit)}</option>)}
                </select>
                <input className="input" placeholder="Or enter client name manually" value={manualName} onChange={(e) => { setManualName(e.target.value); setSelectedCustomer(null); }} />
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input className="input !rounded-full !py-3 !pl-10" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              <div className="card p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {products
                    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
                    .map((product) => {
                      const row = stockMap.get(product.id);
                      const wholesale = product.costPrice > 0 ? Math.round(product.costPrice * 1.25 * 100) / 100 : product.unitPrice * 0.8;
                      return (
                        <div key={product.id} className="p-3 border border-line rounded-2xl hover:border-lime hover:shadow-card transition-all">
                          <p className="font-bold text-sm text-ink truncate">{product.name}</p>
                          <p className="text-lg font-extrabold text-ink mt-1">{money(wholesale)}</p>
                          <p className="text-[11px] text-stone-400">retail {money(product.unitPrice)} · stock {row?.totalQty || 0}</p>
                          <Btn variant="lime" className="w-full !py-1.5 !px-3 !text-xs mt-2" onClick={() => addToCart(product, 10)} disabled={!row || row.totalQty <= 0}>
                            <Plus className="w-3.5 h-3.5" /> Add 10+
                          </Btn>
                        </div>
                      );
                    })}
                </div>
                {products.length === 0 && <EmptyState icon={Truck} title="No products with stock" />}
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
                    {cart.map((line) => (
                      <div key={line.product.id} className="p-2.5 bg-cream-soft border border-line rounded-2xl">
                        <div className="flex justify-between">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-ink truncate">{line.product.name}</p>
                            <p className="text-[11px] text-stone-400">{money(line.unitPrice)}</p>
                          </div>
                          <button onClick={() => setCart(cart.filter((l) => l.product.id !== line.product.id))} className="w-7 h-7 bg-blush-soft text-[#a34141] rounded-full flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setCart(cart.map((l) => (l.product.id === line.product.id ? { ...l, qty: Math.max(1, l.qty - 1) } : l)))} className="w-6 h-6 bg-white border border-line rounded-full flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                            <span className="w-8 text-center text-sm font-bold">{line.qty}</span>
                            <button onClick={() => addToCart(line.product, 1)} className="w-6 h-6 bg-white border border-line rounded-full flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                          </div>
                          <span className="font-extrabold text-ink">{money(line.unitPrice * line.qty)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {cart.length > 0 && (
                <div className="p-4 border-t border-line space-y-3 bg-cream-soft">
                  <div className="flex justify-between text-lg font-extrabold text-ink"><span>Total</span><span>{money(total)}</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPaymentMethod('cash')} className={`py-2.5 rounded-full border text-sm font-semibold ${paymentMethod === 'cash' ? 'border-ink bg-ink text-white' : 'border-line bg-white text-stone-500'}`}>Cash</button>
                    <button onClick={() => setPaymentMethod('credit')} className={`py-2.5 rounded-full border text-sm font-semibold ${paymentMethod === 'credit' ? 'border-ink bg-ink text-white' : 'border-line bg-white text-stone-500'}`}>Credit</button>
                  </div>
                  <Btn variant="dark" className="w-full !py-3.5" onClick={checkout} disabled={busy}>{busy ? 'Generating…' : 'Generate invoice'}</Btn>
                </div>
              )}
            </div>
          </div>
        ))}

        {tab === 'orders' && (
          <div className="card overflow-hidden">
            <table className="w-full min-w-[640px]">
              <thead className="bg-cream-soft border-b border-line">
                <tr><Th>Invoice</Th><Th>Client</Th><Th>Date</Th><Th>Total</Th><Th>Status</Th></tr>
              </thead>
              <tbody className="divide-y divide-cream-deep/70">
                {orders?.items.filter((s) => s.isWholesale).map((s) => (
                  <tr key={s.id} className="hover:bg-cream-soft">
                    <Td className="font-bold text-ink">{s.receiptNo}</Td>
                    <Td className="text-stone-500">{s.customerName || 'Walk-in'}</Td>
                    <Td className="text-xs text-stone-400">{dateTimeStr(s.createdAt)}</Td>
                    <Td className="font-extrabold text-ink">{money(s.total)}</Td>
                    <Td><Chip tone={statusTone(s.status)}>{s.status.replace('_', ' ').toLowerCase()}</Chip></Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders?.items.filter((s) => s.isWholesale).length === 0 && <EmptyState icon={FileText} title="No wholesale orders yet" />}
          </div>
        )}

        {tab === 'clients' && (
          <>
            <div className="card overflow-hidden hidden md:block">
              <table className="w-full min-w-[560px]">
                <thead className="bg-cream-soft border-b border-line">
                  <tr><Th>Client</Th><Th>Phone</Th><Th>Credit balance</Th><Th>Limit</Th></tr>
                </thead>
                <tbody className="divide-y divide-cream-deep/70">
                  {clients?.items.map((c) => (
                    <tr key={c.id} className="hover:bg-cream-soft">
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.name} tone="lav" size="sm" />
                          <span className="font-bold text-ink">{c.name}</span>
                        </div>
                      </Td>
                      <Td className="text-stone-500">{c.phone || '—'}</Td>
                      <Td>{c.creditBalance > 0 ? <Chip tone="blush">{money(c.creditBalance)}</Chip> : <Chip tone="mint">clear</Chip>}</Td>
                      <Td className="text-stone-500">{money(c.creditLimit)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clients?.items.length === 0 && <EmptyState icon={Users} title="No wholesale clients yet" sub="Add one from the Customers page" />}
            </div>
            <div className="md:hidden space-y-3">
              {clients?.items.map((c) => (
                <div key={c.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={c.name} tone="lav" size="sm" />
                    <div className="min-w-0"><p className="font-extrabold text-ink tracking-tight truncate">{c.name}</p><p className="text-xs text-stone-400">{c.phone || '—'}</p></div>
                  </div>
                  {c.creditBalance > 0 ? <Chip tone="blush">{money(c.creditBalance)}</Chip> : <Chip tone="mint">clear</Chip>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Invoice modal */}
      {invoice && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-pop max-w-md w-full overflow-hidden">
            <div className="bg-lime p-6 text-center">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink">Invoice generated</h2>
              <p className="text-ink/60 text-sm">{invoice.receiptNo}</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-stone-500 mb-4">Client: <b className="text-ink">{invoice.customerName || 'Walk-in'}</b></p>
              <div className="border-b border-line pb-4 mb-4">
                {invoice.items?.map((i: SaleItem) => (
                  <div key={i.id} className="flex justify-between py-1 text-sm">
                    <span className="text-stone-500">{i.productName} x{i.qty}</span>
                    <span className="font-semibold">{money(i.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xl font-extrabold mb-6 text-ink"><span>Total</span><span>{money(invoice.total)}</span></div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 [&>*]:w-full sm:[&>*]:flex-1">
                <Btn variant="ghost" onClick={() => window.print()}><Printer className="w-4 h-4" />Print</Btn>
                <Btn variant="dark" onClick={() => setInvoice(null)}>New order</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Wholesale;
