import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { apiGet, apiPost, apiPatch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { money, dateStr, dateTimeStr, errMsg } from '../lib/format';
import { PageHeader, StatCard, Chip, Modal, Btn, EmptyState, Tabs, statusTone } from '../components/ui';
import { Package, Search, Plus, AlertTriangle, TrendingDown, Calendar, ArrowLeftRight, ClipboardCheck, ListOrdered, ChevronDown } from 'lucide-react';
import type { StockRow, StockTransfer, StockCount, StockMovement, Product, Category } from '../lib/types';
import { canAdjustStock } from '../lib/roles';

const Inventory: React.FC = () => {
  const { currentBranch, session, user } = useAuth();
  const branchId = currentBranch?.id;
  const [tab, setTab] = useState('products');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [adjustRow, setAdjustRow] = useState<StockRow | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: stockData, loading, reload } = useApi<{ items: StockRow[] }>(
    () => apiGet(`/inventory/stock?branchId=${branchId}&limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`),
    [branchId, search]
  );
  const { data: categories } = useApi<Category[]>(() => apiGet('/products/categories'), []);
  const { data: alerts } = useApi<{ lowStock: { productId: string }[]; expired: unknown[]; expiringSoon: unknown[] }>(
    () => apiGet(`/inventory/alerts?branchId=${branchId}`),
    [branchId]
  );
  const { data: transfersData, reload: reloadTransfers } = useApi<{ items: StockTransfer[] }>(() => apiGet('/inventory/transfers'), [tab]);
  const transfers = transfersData?.items;
  const { data: counts, reload: reloadCounts } = useApi<StockCount[]>(() => apiGet('/inventory/counts'), [tab]);
  const { data: movements } = useApi<{ items: StockMovement[] }>(
    () => apiGet(`/inventory/movements?branchId=${branchId}&limit=50`),
    [tab, branchId]
  );

  const items = stockData?.items || [];
  const lowCount = alerts?.lowStock.length ?? 0;
  const expiringCount = (alerts?.expired.length ?? 0) + (alerts?.expiringSoon.length ?? 0);
  const outCount = items.filter((i) => i.stockState === 'OUT').length;

  // ── add/edit product form ──
  const emptyForm = { name: '', genericName: '', strength: '', barcode: '', categoryId: '', unitPrice: 0, costPrice: 0, wholesalePrice: 0, reorderLevel: 10, packSize: 30 };
  const [productForm, setProductForm] = useState(emptyForm);

  const openEdit = (row: StockRow) => {
    setProductForm({
      name: row.name,
      genericName: row.genericName || '',
      strength: '',
      barcode: row.barcode || '',
      categoryId: '',
      unitPrice: row.unitPrice,
      costPrice: row.batches[0]?.costPrice || 0,
      wholesalePrice: 0,
      reorderLevel: row.reorderLevel,
      packSize: 30,
    });
    setEditProduct({ id: row.productId } as Product);
    setShowAdd(true);
  };

  const saveProduct = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: productForm.name,
        genericName: productForm.genericName || undefined,
        strength: productForm.strength || undefined,
        barcode: productForm.barcode || undefined,
        categoryId: productForm.categoryId || undefined,
        unitPrice: productForm.unitPrice,
        costPrice: productForm.costPrice,
        wholesalePrice: productForm.wholesalePrice || undefined,
        reorderLevel: productForm.reorderLevel,
        packSize: productForm.packSize,
      };
      if (editProduct) await apiPatch(`/products/${editProduct.id}`, payload);
      else await apiPost('/products', payload);
      setShowAdd(false);
      setEditProduct(null);
      setProductForm(emptyForm);
      reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // ── adjustment ──
  const [adjustForm, setAdjustForm] = useState({ batchId: '', newQty: 0, reason: '', type: 'ADJUSTMENT' });
  const openAdjust = (row: StockRow) => {
    setAdjustForm({ batchId: row.batches[0]?.id || '', newQty: row.batches[0]?.qtyOnHand || 0, reason: '', type: 'ADJUSTMENT' });
    setAdjustRow(row);
  };
  const submitAdjust = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPost('/inventory/adjustments', {
        branchId,
        productId: adjustRow!.productId,
        batchId: adjustForm.batchId,
        newQty: adjustForm.newQty,
        reason: adjustForm.reason,
        type: adjustForm.type,
      });
      setAdjustRow(null);
      reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // ── transfers ──
  const otherBranches = (session?.branches || []).filter((b) => b.id !== branchId);
  const [transferModal, setTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState<{ toBranchId: string; note: string; items: { productId: string; name: string; qty: number }[] }>({ toBranchId: '', note: '', items: [] });
  const [transferSearch, setTransferSearch] = useState('');

  const startTransfer = (row: StockRow) => {
    setTransferForm((f) => {
      const existing = f.items.find((i) => i.productId === row.productId);
      if (existing) return { ...f, items: f.items.map((i) => (i.productId === row.productId ? { ...i, qty: i.qty + 1 } : i)) };
      return { ...f, items: [...f.items, { productId: row.productId, name: row.name, qty: 1 }] };
    });
    setTransferModal(true);
  };

  const submitTransfer = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPost('/inventory/transfers', {
        fromBranchId: branchId,
        toBranchId: transferForm.toBranchId,
        note: transferForm.note || undefined,
        items: transferForm.items.map((i) => ({ productId: i.productId, qty: i.qty })),
      });
      setTransferModal(false);
      setTransferForm({ toBranchId: '', note: '', items: [] });
      reloadTransfers();
      reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const transferAction = async (id: string, action: 'approve' | 'receive' | 'cancel') => {
    setBusy(true);
    setError('');
    try {
      await apiPost(`/inventory/transfers/${id}/${action}`);
      reloadTransfers();
      reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // ── counts ──
  const [openCount, setOpenCount] = useState<StockCount | null>(null);
  const [countEntries, setCountEntries] = useState<Record<string, string>>({});

  const startCount = async () => {
    setBusy(true);
    setError('');
    try {
      const count = await apiPost<StockCount>('/inventory/counts', { branchId });
      reloadCounts();
      openCountSheet(count);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const openCountSheet = async (summary: StockCount) => {
    try {
      const detail = await apiGet<StockCount>(`/inventory/counts/${summary.id}`);
      setOpenCount(detail);
      const entries: Record<string, string> = {};
      detail.items?.forEach((i) => (entries[i.id] = i.countedQty !== null ? String(i.countedQty) : String(i.systemQty)));
      setCountEntries(entries);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const submitCount = async () => {
    if (!openCount?.items) return;
    setBusy(true);
    setError('');
    try {
      await apiPatch(`/inventory/counts/${openCount.id}/items`, {
        items: openCount.items.map((i) => ({ itemId: i.id, countedQty: parseFloat(countEntries[i.id]) || 0 })),
      });
      await apiPost(`/inventory/counts/${openCount.id}/approve`);
      setOpenCount(null);
      reloadCounts();
      reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Inventory"
          subtitle={`Stock at ${currentBranch?.name || 'branch'}`}
          actions={
            <Btn variant="dark" onClick={() => { setEditProduct(null); setProductForm(emptyForm); setShowAdd(true); }}>
              <Plus className="w-5 h-5" />Add Product
            </Btn>
          }
        />

        {error && <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl text-sm text-[#a34141] font-medium">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Tracked products" value={items.length} icon={Package} tone="sky" />
          <StatCard label="Low stock" value={lowCount} icon={AlertTriangle} tone="blush" />
          <StatCard label="Out of stock" value={outCount} icon={TrendingDown} tone="sun" />
          <StatCard label="Expiring ≤90d" value={expiringCount} icon={Calendar} tone="lav" />
        </div>

        <Tabs
          tabs={[
            { id: 'products', label: 'Stock', icon: Package },
            { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
            { id: 'counts', label: 'Stock counts', icon: ClipboardCheck },
            { id: 'ledger', label: 'Ledger', icon: ListOrdered },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'products' && (
          <>
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input className="input !rounded-full !pl-10" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {loading && <div className="card p-8 text-center text-stone-400">Loading stock…</div>}

            <div className="space-y-2.5">
              {items.map((row) => (
                <div key={row.productId} className="card overflow-hidden">
                  <button className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-cream-soft" onClick={() => setExpanded(expanded === row.productId ? null : row.productId)}>
                    <div className="min-w-0">
                      <p className="font-extrabold text-ink tracking-tight truncate">{row.name}</p>
                      <p className="text-xs text-stone-400">{row.category || 'Uncategorized'}{row.barcode ? ` · ${row.barcode}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Chip tone={row.stockState === 'OUT' ? 'blush' : row.stockState === 'LOW' ? 'sun' : 'mint'}>{row.totalQty}</Chip>
                      <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${expanded === row.productId ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {expanded === row.productId && (
                    <div className="px-4 pb-4 border-t border-line pt-3 space-y-2">
                      {row.batches.map((b) => {
                        const isExpiring = new Date(b.expiryDate) < new Date(Date.now() + 90 * 86400000);
                        return (
                          <div key={b.id} className="flex items-center justify-between text-sm bg-cream-soft border border-line rounded-2xl px-3 py-2">
                            <div>
                              <span className="font-mono font-bold text-ink">{b.batchNo}</span>
                              <span className={`ml-2 text-xs ${isExpiring ? 'text-[#a34141] font-semibold' : 'text-stone-400'}`}>exp {dateStr(b.expiryDate)}</span>
                            </div>
                            <span className="font-bold text-ink">{b.qtyOnHand}</span>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-stone-400">Sells at {money(row.unitPrice)} · reorder at {row.reorderLevel}</p>
                        {canAdjustStock(user?.role || 'CASHIER') && (
                          <div className="flex gap-2">
                            <Btn variant="ghost" onClick={() => startTransfer(row)}><ArrowLeftRight className="w-4 h-4" /> Transfer</Btn>
                            <Btn variant="ghost" onClick={() => openAdjust(row)}>Adjust</Btn>
                            <Btn variant="ghost" onClick={() => openEdit(row)}>Edit</Btn>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {!loading && items.length === 0 && (
                <div className="card"><EmptyState icon={Package} title="No stock at this branch" sub="Receive a GRN from Suppliers, or transfer from another branch" /></div>
              )}
            </div>
          </>
        )}

        {tab === 'transfers' && (
          <div className="space-y-3">
            <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-stone-500">Move stock between branches — request → approve (stock leaves) → receive (stock arrives).</p>
              <Btn variant="dark" onClick={() => { setTransferForm({ toBranchId: otherBranches[0]?.id || '', note: '', items: [] }); setTransferModal(true); }} disabled={otherBranches.length === 0}>
                <Plus className="w-4 h-4" /> New transfer
              </Btn>
            </div>
            {transfers?.map((t) => (
              <div key={t.id} className="card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-extrabold text-ink tracking-tight text-sm">{t.fromBranch.name} → {t.toBranch.name}</p>
                    <p className="text-xs text-stone-400">{t.items.map((i) => `${i.product.name} x${i.qty}`).join(', ')} · {dateTimeStr(t.createdAt)} · by {t.requestedByName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip tone={statusTone(t.status)}>{t.status.replace('_', ' ').toLowerCase()}</Chip>
                    {t.status === 'REQUESTED' && (
                      <>
                        <Btn variant="lime" onClick={() => transferAction(t.id, 'approve')} disabled={busy}>Approve</Btn>
                        <Btn variant="danger" onClick={() => transferAction(t.id, 'cancel')} disabled={busy}>Cancel</Btn>
                      </>
                    )}
                    {t.status === 'IN_TRANSIT' && <Btn variant="dark" onClick={() => transferAction(t.id, 'receive')} disabled={busy}>Receive</Btn>}
                  </div>
                </div>
              </div>
            ))}
            {transfers?.length === 0 && <div className="card"><EmptyState icon={ArrowLeftRight} title="No transfers yet" /></div>}
          </div>
        )}

        {tab === 'counts' && (
          <div className="space-y-3">
            <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-stone-500">Physical stock count: snapshot → count → approve (variances auto-adjust).</p>
              <Btn variant="dark" onClick={startCount} disabled={busy}><Plus className="w-4 h-4" /> Start count</Btn>
            </div>
            {counts?.map((c) => (
              <div key={c.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-extrabold text-ink tracking-tight text-sm">Count · {dateTimeStr(c.createdAt)}</p>
                  <p className="text-xs text-stone-400">{c.itemCount} items · {c.varianceCount} with variance · by {c.startedByName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Chip tone={statusTone(c.status)}>{c.status.toLowerCase()}</Chip>
                  {['COUNTING', 'REVIEW'].includes(c.status) && <Btn variant="dark" onClick={() => openCountSheet(c)}>Open sheet</Btn>}
                </div>
              </div>
            ))}
            {counts?.length === 0 && <div className="card"><EmptyState icon={ClipboardCheck} title="No stock counts yet" /></div>}
          </div>
        )}

        {tab === 'ledger' && (
          <div className="card divide-y divide-cream-deep/70">
            {movements?.items.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Chip tone={m.qtyDelta >= 0 ? 'mint' : 'blush'}>{m.type.replace('_', ' ').toLowerCase()}</Chip>
                    <span className="font-bold text-sm text-ink truncate">{(m as unknown as { productName?: string }).productName || ''}</span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{m.reason || '—'} · by {m.userName || '—'} · {dateTimeStr(m.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-extrabold ${m.qtyDelta >= 0 ? 'text-[#2f6b46]' : 'text-[#a34141]'}`}>{m.qtyDelta > 0 ? '+' : ''}{Math.round(m.qtyDelta * 100) / 100}</p>
                  <p className="text-[11px] text-stone-400">→ {m.qtyAfter}</p>
                </div>
              </div>
            ))}
            {movements?.items.length === 0 && <EmptyState icon={ListOrdered} title="No movements yet" />}
          </div>
        )}
      </div>

      {/* Add/edit product */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditProduct(null); }}
        title={editProduct ? 'Edit product' : 'Add product'}
        maxWidth="max-w-lg"
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => { setShowAdd(false); setEditProduct(null); }}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={saveProduct} disabled={busy || productForm.name.length < 1}>{busy ? 'Saving…' : 'Save product'}</Btn>
          </>
        }
      >
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Name *</label>
          <input className="input mt-1" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Generic name</label>
            <input className="input mt-1" value={productForm.genericName} onChange={(e) => setProductForm({ ...productForm, genericName: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Strength / form</label>
            <input className="input mt-1" value={productForm.strength} onChange={(e) => setProductForm({ ...productForm, strength: e.target.value })} placeholder="500mg tablet" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Barcode</label>
            <input className="input mt-1" value={productForm.barcode} onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Category</label>
            <select className="input mt-1" value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}>
              <option value="">— none —</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Sell price *</label>
            <input type="number" min="0" step="0.01" className="input mt-1" value={productForm.unitPrice} onChange={(e) => setProductForm({ ...productForm, unitPrice: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Cost price</label>
            <input type="number" min="0" step="0.01" className="input mt-1" value={productForm.costPrice} onChange={(e) => setProductForm({ ...productForm, costPrice: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Wholesale price</label>
            <input type="number" min="0" step="0.01" className="input mt-1" value={productForm.wholesalePrice} onChange={(e) => setProductForm({ ...productForm, wholesalePrice: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Reorder level</label>
            <input type="number" min="0" className="input mt-1" value={productForm.reorderLevel} onChange={(e) => setProductForm({ ...productForm, reorderLevel: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      </Modal>

      {/* Adjust stock */}
      <Modal
        open={!!adjustRow}
        onClose={() => setAdjustRow(null)}
        title={`Adjust stock — ${adjustRow?.name || ''}`}
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setAdjustRow(null)}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={submitAdjust} disabled={busy || adjustForm.reason.length < 3}>{busy ? 'Saving…' : 'Apply adjustment'}</Btn>
          </>
        }
      >
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Batch</label>
          <select className="input mt-1" value={adjustForm.batchId} onChange={(e) => {
            const b = adjustRow?.batches.find((x) => x.id === e.target.value);
            setAdjustForm({ ...adjustForm, batchId: e.target.value, newQty: b?.qtyOnHand || 0 });
          }}>
            {adjustRow?.batches.map((b) => <option key={b.id} value={b.id}>{b.batchNo} · {b.qtyOnHand} left · exp {dateStr(b.expiryDate)}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">New quantity *</label>
            <input type="number" min="0" className="input mt-1" value={adjustForm.newQty} onChange={(e) => setAdjustForm({ ...adjustForm, newQty: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Type</label>
            <select className="input mt-1" value={adjustForm.type} onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}>
              <option value="ADJUSTMENT">Correction</option>
              <option value="DAMAGE">Damage</option>
              <option value="RETURN_SUPPLIER">Return to supplier</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Reason *</label>
          <input className="input mt-1" value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} placeholder="Why is stock changing?" />
        </div>
      </Modal>

      {/* Transfer modal */}
      <Modal
        open={transferModal}
        onClose={() => setTransferModal(false)}
        title="Transfer stock"
        maxWidth="max-w-lg"
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setTransferModal(false)}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={submitTransfer} disabled={busy || !transferForm.toBranchId || transferForm.items.length === 0}>{busy ? 'Sending…' : 'Request transfer'}</Btn>
          </>
        }
      >
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Destination branch *</label>
          <select className="input mt-1" value={transferForm.toBranchId} onChange={(e) => setTransferForm({ ...transferForm, toBranchId: e.target.value })}>
            <option value="">— select —</option>
            {otherBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Items (from {currentBranch?.name})</label>
          {transferForm.items.map((i) => (
            <div key={i.productId} className="flex items-center gap-2 bg-cream-soft border border-line rounded-2xl px-3 py-2">
              <span className="flex-1 text-sm font-bold text-ink truncate">{i.name}</span>
              <input type="number" min="1" className="input !w-20 !py-1.5 text-center" value={i.qty} onChange={(e) => setTransferForm({ ...transferForm, items: transferForm.items.map((x) => (x.productId === i.productId ? { ...x, qty: parseInt(e.target.value) || 1 } : x)) })} />
              <button onClick={() => setTransferForm({ ...transferForm, items: transferForm.items.filter((x) => x.productId !== i.productId) })} className="w-6 h-6 bg-blush-soft text-[#a34141] rounded-full flex items-center justify-center text-xs">×</button>
            </div>
          ))}
          {transferForm.items.length === 0 && (
            <>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input className="input !pl-9 !py-2" placeholder="Add items from stock…" value={transferSearch} onChange={(e) => setTransferSearch(e.target.value)} />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {items.filter((i) => i.name.toLowerCase().includes(transferSearch.toLowerCase())).slice(0, 8).map((row) => (
                  <button key={row.productId} onClick={() => startTransfer(row)} className="w-full text-left px-3 py-2 bg-white border border-line rounded-xl text-sm hover:border-lime flex justify-between">
                    <span className="truncate">{row.name}</span>
                    <span className="text-stone-400">{row.totalQty}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Note</label>
          <input className="input mt-1" value={transferForm.note} onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })} />
        </div>
      </Modal>

      {/* Count sheet */}
      <Modal
        open={!!openCount}
        onClose={() => setOpenCount(null)}
        title="Stock count sheet"
        maxWidth="max-w-2xl"
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setOpenCount(null)}>Cancel count</Btn>
            <Btn variant="dark" className="flex-1" onClick={submitCount} disabled={busy}>{busy ? 'Approving…' : 'Approve & apply variances'}</Btn>
          </>
        }
      >
        <p className="text-sm text-stone-500 -mt-1">Enter what you physically counted. Approving applies differences as adjustments.</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {openCount?.items?.map((i) => {
            const counted = parseFloat(countEntries[i.id]);
            const variance = isNaN(counted) ? null : counted - i.systemQty;
            return (
              <div key={i.id} className="flex items-center gap-3 bg-cream-soft border border-line rounded-2xl px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-ink truncate">{i.product.name}</p>
                  <p className="text-[11px] text-stone-400">batch {i.batch.batchNo} · system: {i.systemQty}</p>
                </div>
                {variance !== null && variance !== 0 && <Chip tone={variance > 0 ? 'mint' : 'blush'}>{variance > 0 ? '+' : ''}{variance}</Chip>}
                <input type="number" min="0" className="input !w-24 !py-1.5 text-center" value={countEntries[i.id] ?? ''} onChange={(e) => setCountEntries({ ...countEntries, [i.id]: e.target.value })} />
              </div>
            );
          })}
        </div>
      </Modal>
    </Layout>
  );
};

export default Inventory;
