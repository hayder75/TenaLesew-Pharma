import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { apiGet, apiPost } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { money, dateStr, errMsg } from '../lib/format';
import { PageHeader, StatCard, Chip, Modal, Btn, Th, Td, EmptyState, Tabs, statusTone } from '../components/ui';
import { Search, Plus, Truck, Package, DollarSign, Trash2 } from 'lucide-react';
import type { Supplier, PurchaseOrder, Product } from '../lib/types';
import { canManageCatalog } from '../lib/roles';

const Suppliers: React.FC = () => {
  const { currentBranch, user } = useAuth();
  const branchId = currentBranch?.id;
  const [tab, setTab] = useState('suppliers');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: suppliers, reload: reloadSuppliers } = useApi<Supplier[]>(() => apiGet(`/suppliers${search ? `?search=${encodeURIComponent(search)}` : ''}`), [search]);
  const { data: pos, reload: reloadPos } = useApi<{ items: PurchaseOrder[] }>(() => apiGet('/purchases/pos?limit=50'), [tab]);
  const { data: products } = useApi<{ items: Product[] }>(() => apiGet('/products?limit=200'), []);

  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '', address: '', tin: '' });

  const [poModal, setPoModal] = useState(false);
  const [poForm, setPoForm] = useState<{ supplierId: string; notes: string; items: { productId: string; qty: number; cost: number }[] }>({ supplierId: '', notes: '', items: [] });
  const [poSearch, setPoSearch] = useState('');

  const [grnModal, setGrnModal] = useState<PurchaseOrder | null>(null);
  const [grnForm, setGrnForm] = useState<{ invoiceNo: string; items: { productId: string; qty: number; cost: number; batchNo: string; expiry: string }[] }>({ invoiceNo: '', items: [] });

  const addSupplier = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPost('/suppliers', { ...supplierForm, email: supplierForm.email || undefined });
      setShowAddSupplier(false);
      setSupplierForm({ name: '', phone: '', email: '', address: '', tin: '' });
      reloadSuppliers();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const createPo = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPost('/purchases/pos', {
        branchId,
        supplierId: poForm.supplierId,
        notes: poForm.notes || undefined,
        items: poForm.items.map((i) => ({ productId: i.productId, qtyExpected: i.qty, unitCost: i.cost })),
      });
      setPoModal(false);
      setPoForm({ supplierId: '', notes: '', items: [] });
      reloadPos();
      setTab('pos');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const openGrn = (po: PurchaseOrder) => {
    setGrnForm({
      invoiceNo: '',
      items: po.items
        .filter((i) => i.qtyExpected - i.qtyReceived > 0)
        .map((i) => ({
          productId: i.productId,
          qty: i.qtyExpected - i.qtyReceived,
          cost: i.unitCost,
          batchNo: '',
          expiry: '',
        })),
    });
    setGrnModal(po);
  };

  const receiveGrn = async () => {
    if (!grnModal) return;
    setBusy(true);
    setError('');
    try {
      await apiPost('/purchases/grns', {
        branchId,
        poId: grnModal.id,
        supplierId: grnModal.supplier.id,
        invoiceNo: grnForm.invoiceNo || undefined,
        items: grnForm.items.map((i) => ({
          productId: i.productId,
          qtyReceived: i.qty,
          unitCost: i.cost,
          batchNo: i.batchNo,
          expiryDate: new Date(i.expiry).toISOString(),
        })),
      });
      setGrnModal(null);
      reloadPos();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const totalDebt = suppliers?.reduce((s, x) => s + (x.totalPurchased || 0), 0) || 0;

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Suppliers"
          subtitle="Suppliers, purchase orders and receiving"
          actions={
            canManageCatalog(user?.role || 'CASHIER') && (
              <Btn variant="dark" onClick={() => (tab === 'suppliers' ? setShowAddSupplier(true) : setPoModal(true))}>
                <Plus className="w-5 h-5" />{tab === 'suppliers' ? 'Add Supplier' : 'New PO'}
              </Btn>
            )
          }
        />

        {error && <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl text-sm text-[#a34141] font-medium">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Suppliers" value={suppliers?.length || 0} icon={Truck} tone="sky" />
          <StatCard label="Open POs" value={pos?.items.filter((p) => ['SUBMITTED', 'PARTIALLY_RECEIVED'].includes(p.status)).length || 0} icon={Package} tone="sun" />
          <StatCard label="Total purchased" value={money(totalDebt)} icon={DollarSign} tone="lav" />
        </div>

        <Tabs
          tabs={[
            { id: 'suppliers', label: 'Suppliers' },
            { id: 'pos', label: 'Purchase Orders' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'suppliers' && (
          <>
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input className="input !rounded-full !pl-10" placeholder="Search suppliers…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="card overflow-hidden hidden md:block">
              <table className="w-full min-w-[640px]">
                <thead className="bg-cream-soft border-b border-line">
                  <tr><Th>Supplier</Th><Th>Phone</Th><Th>POs</Th><Th>Total purchased</Th><Th className="text-right">Status</Th></tr>
                </thead>
                <tbody className="divide-y divide-cream-deep/70">
                  {suppliers?.map((s) => (
                    <tr key={s.id} className="hover:bg-cream-soft">
                      <Td><span className="font-bold text-ink">{s.name}</span><div className="text-xs text-stone-400">{s.address || s.email || ''}</div></Td>
                      <Td className="text-stone-500">{s.phone || '—'}</Td>
                      <Td>{s.poCount}</Td>
                      <Td className="font-bold text-ink">{money(s.totalPurchased || 0)}</Td>
                      <Td className="text-right"><Chip tone={s.isActive ? 'mint' : 'blush'}>{s.isActive ? 'active' : 'inactive'}</Chip></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {suppliers?.length === 0 && <EmptyState icon={Truck} title="No suppliers yet" />}
            </div>
            <div className="md:hidden space-y-3">
              {suppliers?.map((s) => (
                <div key={s.id} className="card p-4 flex items-center justify-between">
                  <div><p className="font-extrabold text-ink tracking-tight">{s.name}</p><p className="text-xs text-stone-400">{s.phone || '—'} · {s.poCount || 0} POs</p></div>
                  <Chip tone={s.isActive ? 'mint' : 'blush'}>{money(s.totalPurchased || 0)}</Chip>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'pos' && (
          <div className="space-y-3">
            {pos?.items.map((po) => (
              <div key={po.id} className="card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-extrabold text-ink tracking-tight text-sm">{po.supplier.name} · {money(po.total)}</p>
                    <p className="text-xs text-stone-400">
                      {po.branch.name} · {dateStr(po.createdAt)} · received {po.receivedQty}/{po.totalQty} units · by {po.createdByName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip tone={statusTone(po.status)}>{po.status.replace('_', ' ').toLowerCase()}</Chip>
                    {['SUBMITTED', 'PARTIALLY_RECEIVED'].includes(po.status) && canManageCatalog(user?.role || 'CASHIER') && (
                      <Btn variant="dark" onClick={() => openGrn(po)}>Receive (GRN)</Btn>
                    )}
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {po.items.map((i) => (
                    <div key={i.id} className="flex justify-between text-xs text-stone-400">
                      <span>{i.product?.name || i.productId}</span>
                      <span>{i.qtyReceived}/{i.qtyExpected} @ {money(i.unitCost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {pos?.items.length === 0 && <div className="card"><EmptyState icon={Package} title="No purchase orders yet" sub="Create a PO, then receive it with batch numbers + expiry" /></div>}
          </div>
        )}
      </div>

      {/* Add supplier */}
      <Modal
        open={showAddSupplier}
        onClose={() => setShowAddSupplier(false)}
        title="Add supplier"
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setShowAddSupplier(false)}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={addSupplier} disabled={busy || !supplierForm.name}>{busy ? 'Saving…' : 'Save'}</Btn>
          </>
        }
      >
        <input className="input" placeholder="Name *" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
          <input className="input" placeholder="TIN" value={supplierForm.tin} onChange={(e) => setSupplierForm({ ...supplierForm, tin: e.target.value })} />
        </div>
        <input className="input" placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
        <input className="input" placeholder="Address" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
      </Modal>

      {/* New PO */}
      <Modal
        open={poModal}
        onClose={() => setPoModal(false)}
        title="Create purchase order"
        maxWidth="max-w-lg"
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setPoModal(false)}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={createPo} disabled={busy || !poForm.supplierId || poForm.items.length === 0}>{busy ? 'Creating…' : 'Create PO'}</Btn>
          </>
        }
      >
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Supplier *</label>
          <select className="input mt-1" value={poForm.supplierId} onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}>
            <option value="">— select —</option>
            {suppliers?.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Items</label>
          {poForm.items.map((i, idx) => {
            const product = products?.items.find((p) => p.id === i.productId);
            return (
              <div key={i.productId} className="flex items-center gap-2 bg-cream-soft border border-line rounded-2xl px-3 py-2">
                <span className="flex-1 text-sm font-bold text-ink truncate">{product?.name}</span>
                <input type="number" min="1" className="input !w-16 !py-1.5 text-center" value={i.qty} onChange={(e) => setPoForm({ ...poForm, items: poForm.items.map((x, j) => (j === idx ? { ...x, qty: parseInt(e.target.value) || 1 } : x)) })} placeholder="qty" />
                <input type="number" min="0" step="0.01" className="input !w-20 !py-1.5 text-center" value={i.cost} onChange={(e) => setPoForm({ ...poForm, items: poForm.items.map((x, j) => (j === idx ? { ...x, cost: parseFloat(e.target.value) || 0 } : x)) })} placeholder="cost" />
                <button onClick={() => setPoForm({ ...poForm, items: poForm.items.filter((_, j) => j !== idx) })} className="w-6 h-6 bg-blush-soft text-[#a34141] rounded-full flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
              </div>
            );
          })}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input className="input !pl-9 !py-2" placeholder="Add products…" value={poSearch} onChange={(e) => setPoSearch(e.target.value)} />
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {products?.items
              .filter((p) => p.name.toLowerCase().includes(poSearch.toLowerCase()))
              .slice(0, 8)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPoForm({ ...poForm, items: [...poForm.items, { productId: p.id, qty: 10, cost: p.costPrice }] });
                    setPoSearch('');
                  }}
                  className="w-full text-left px-3 py-2 bg-white border border-line rounded-xl text-sm hover:border-lime flex justify-between"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-stone-400">cost {money(p.costPrice)}</span>
                </button>
              ))}
          </div>
        </div>
        <input className="input" placeholder="Notes (optional)" value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} />
      </Modal>

      {/* Receive GRN */}
      <Modal
        open={!!grnModal}
        onClose={() => setGrnModal(null)}
        title={`Receive goods — ${grnModal?.supplier.name || ''}`}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setGrnModal(null)}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={receiveGrn} disabled={busy || grnForm.items.some((i) => !i.batchNo || !i.expiry)}>{busy ? 'Receiving…' : 'Receive & create batches'}</Btn>
          </>
        }
      >
        <input className="input" placeholder="Supplier invoice number (optional)" value={grnForm.invoiceNo} onChange={(e) => setGrnForm({ ...grnForm, invoiceNo: e.target.value })} />
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {grnForm.items.map((i, idx) => {
            const product = products?.items.find((p) => p.id === i.productId);
            return (
              <div key={i.productId} className="p-3 bg-cream-soft border border-line rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-ink truncate">{product?.name}</p>
                  <input type="number" min="1" className="input !w-20 !py-1.5 text-center" value={i.qty} onChange={(e) => setGrnForm({ ...grnForm, items: grnForm.items.map((x, j) => (j === idx ? { ...x, qty: parseInt(e.target.value) || 1 } : x)) })} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input className="input !py-1.5 !text-xs" placeholder="Batch no *" value={i.batchNo} onChange={(e) => setGrnForm({ ...grnForm, items: grnForm.items.map((x, j) => (j === idx ? { ...x, batchNo: e.target.value } : x)) })} />
                  <input type="date" className="input !py-1.5 !text-xs" value={i.expiry} onChange={(e) => setGrnForm({ ...grnForm, items: grnForm.items.map((x, j) => (j === idx ? { ...x, expiry: e.target.value } : x)) })} />
                  <input type="number" min="0" step="0.01" className="input !py-1.5 !text-xs" value={i.cost} onChange={(e) => setGrnForm({ ...grnForm, items: grnForm.items.map((x, j) => (j === idx ? { ...x, cost: parseFloat(e.target.value) || 0 } : x)) })} />
                </div>
              </div>
            );
          })}
          {grnForm.items.length === 0 && <p className="text-sm text-stone-400 text-center py-4">Nothing left to receive on this PO</p>}
        </div>
        <p className="text-xs text-stone-400 flex items-start gap-2">
          <Package className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Batch number and expiry are required for medicines — this powers FEFO selling and expiry alerts.
        </p>
      </Modal>
    </Layout>
  );
};

export default Suppliers;
