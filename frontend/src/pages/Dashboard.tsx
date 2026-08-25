import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { apiGet, apiPost } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { money, dateStr } from '../lib/format';
import { StatCard, Chip, ProgressRing, Avatar } from '../components/ui';
import { Package, AlertTriangle, DollarSign, ShoppingCart, Users, Clock, FileText, Truck, Sparkles, Wallet } from 'lucide-react';
import type { Sale, Customer, StockRow, FinanceSummary, Product } from '../lib/types';
import { getSeasonalMedicines } from '../lib/seasonalData';

interface Alerts {
  lowStock: { productId: string; name: string; totalQty: number; reorderLevel: number; state: string }[];
  expired: { batchId: string; name: string; batchNo: string; expiryDate: string; qty: number }[];
  expiringSoon: { batchId: string; name: string; batchNo: string; expiryDate: string; qty: number }[];
}

const Dashboard: React.FC = () => {
  const { user, currentBranch, session } = useAuth();
  const navigate = useNavigate();
  const branchId = currentBranch?.id;

  const { data: summary } = useApi<FinanceSummary>(
    () => apiGet(`/finance/summary?range=today${branchId ? `&branchId=${branchId}` : ''}`),
    [branchId]
  );
  const { data: recentSales } = useApi<{ items: Sale[] }>(() => apiGet(`/pos/sales?limit=6${branchId ? `&branchId=${branchId}` : ''}`), [branchId]);
  const { data: alerts } = useApi<Alerts>(() => apiGet(`/inventory/alerts?branchId=${branchId}`), [branchId]);
  const { data: products } = useApi<{ items: Product[]; total: number }>(() => apiGet('/products?limit=1'), []);
  const { data: customers } = useApi<{ items: Customer[]; total: number }>(() => apiGet('/customers?limit=1'), []);
  const { data: stock } = useApi<{ items: StockRow[] }>(() => apiGet(`/inventory/stock?branchId=${branchId}&limit=200`), [branchId]);

  const seasonal = getSeasonalMedicines();
  const lowCount = alerts?.lowStock.length ?? 0;
  const expiringCount = (alerts?.expired.length ?? 0) + (alerts?.expiringSoon.length ?? 0);

  const stats = [
    { label: "Today's Sales", value: money(summary?.revenue), icon: DollarSign, tone: 'lime' as const, sub: `${summary?.saleCount || 0} transactions` },
    { label: 'Total Products', value: products?.total ?? '…', icon: Package, tone: 'sky' as const, sub: 'in catalog' },
    { label: 'Low Stock Items', value: lowCount, icon: AlertTriangle, tone: 'blush' as const, sub: `${alerts?.lowStock.filter((l) => l.state === 'OUT').length || 0} out of stock` },
    { label: 'Total Customers', value: customers?.total ?? '…', icon: Users, tone: 'lav' as const, sub: `credit out: ${money(summary?.creditOutstanding)}` },
  ];

  const quickActions = [
    ...( ['OWNER', 'ADMIN', 'PHARMACIST', 'CASHIER', 'BRANCH_MANAGER'].includes(user?.role || '') ? [{ path: '/pos', icon: ShoppingCart, label: 'New Sale', tone: 'lime' as const }] : []),
    ...( ['OWNER', 'ADMIN', 'PHARMACIST', 'BRANCH_MANAGER'].includes(user?.role || '') ? [{ path: '/prescriptions', icon: FileText, label: 'Prescriptions', tone: 'sun' as const }] : []),
    ...( ['OWNER', 'ADMIN', 'WHOLESALE_MANAGER'].includes(user?.role || '') ? [{ path: '/wholesale', icon: Truck, label: 'Wholesale', tone: 'lav' as const }] : []),
    ...( ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'BRANCH_MANAGER'].includes(user?.role || '') ? [{ path: '/inventory', icon: Package, label: 'Inventory', tone: 'sky' as const }] : []),
    ...( ['OWNER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role || '') ? [{ path: '/finance', icon: Wallet, label: 'Finance', tone: 'mint' as const }] : []),
  ];

  const hour = new Date().getHours();
  const dayPart = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  // monthly target: rough heuristic vs last month — decorative ring based on stock health
  const okStock = stock?.items.filter((i) => i.stockState === 'OK').length || 0;
  const stockHealth = stock?.items.length ? Math.round((okStock / stock.items.length) * 100) : 0;

  const restock = async (name: string) => {
    try {
      await apiPost('/notifications', { title: `Restock requested: ${name}` }).catch(() => undefined);
    } catch {
      /* notifications are informational */
    }
    navigate('/suppliers');
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-[21px] sm:text-[30px] lg:text-[38px] leading-snug sm:leading-tight font-extrabold tracking-tight text-ink">
            Good {dayPart}, {user?.fullName?.split(' ')[0] || user?.username}! <span className="inline-block">👋</span>
            <br />
            Here's your <span className="bg-lime px-1.5 sm:px-2.5 rounded-lg sm:rounded-xl">pharmacy</span> at a glance.
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Chip tone="dark">
              <span className="w-1.5 h-1.5 bg-lime rounded-full" />
              {user?.role.replace('_', ' ')}
            </Chip>
            {currentBranch && <Chip tone="neutral">{currentBranch.name}</Chip>}
            <Chip tone="neutral">
              <Clock className="w-3 h-3" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Chip>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} dark={index === 0} />
          ))}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2.5">Quick actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button key={index} onClick={() => navigate(action.path)} className="card p-4 hover:shadow-pop transition-all flex items-center gap-3 cursor-pointer group">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-lime-soft text-[#5c6b12] group-hover:bg-lime group-hover:text-ink transition-all">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-sm text-ink">{action.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent sales */}
          <div className="card">
            <div className="p-5 pb-3 flex items-center justify-between">
              <h2 className="font-extrabold text-ink tracking-tight">Recent sales</h2>
              {['OWNER', 'ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER'].includes(user?.role || '') && (
                <button onClick={() => navigate('/reports')} className="text-sm font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">View all</button>
              )}
            </div>
            <div className="divide-y divide-cream-deep/70 max-h-72 overflow-y-auto">
              {recentSales?.items.map((sale, i) => (
                <div key={sale.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-cream-soft">
                  <div className="flex items-center gap-3">
                    <Avatar name={sale.receiptNo.slice(-1)} tone={i % 2 === 0 ? 'lime' : 'sky'} size="sm" />
                    <div>
                      <p className="font-bold text-sm text-ink">{sale.receiptNo}</p>
                      <p className="text-xs text-stone-400">{sale.customerName || 'Walk-in'} · {new Date(sale.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-sm text-ink">+{money(sale.total)}</p>
                    <p className="text-[11px] text-stone-400 capitalize">{sale.paymentMethod}</p>
                  </div>
                </div>
              ))}
              {recentSales?.items.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No sales yet — open the POS to make the first one</p>}
            </div>
          </div>

          {/* Alerts */}
          <div className="card">
            <div className="p-5 pb-3">
              <h2 className="font-extrabold text-ink tracking-tight">Alerts</h2>
            </div>
            <div className="divide-y divide-cream-deep/70 max-h-72 overflow-y-auto">
              {alerts?.lowStock.slice(0, 4).map((l) => (
                <div key={l.productId} className="px-5 py-3.5 flex items-center justify-between hover:bg-cream-soft">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-blush-soft rounded-2xl flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-[#a34141]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-ink truncate">{l.name}</p>
                      <p className="text-xs text-[#a34141]">{l.state === 'OUT' ? 'Out of stock' : `Low — ${l.totalQty} left`}</p>
                    </div>
                  </div>
                  <Chip tone={l.state === 'OUT' ? 'blush' : 'sun'}>{l.totalQty} left</Chip>
                </div>
              ))}
              {alerts?.expiringSoon.slice(0, 3).map((b) => (
                <div key={b.batchId} className="px-5 py-3.5 flex items-center justify-between hover:bg-cream-soft">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-sun-soft rounded-2xl flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-[#8a6d10]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-ink truncate">{b.name}</p>
                      <p className="text-xs text-[#8a6d10]">Batch {b.batchNo} expiring soon</p>
                    </div>
                  </div>
                  <Chip tone="sun">{dateStr(b.expiryDate)}</Chip>
                </div>
              ))}
              {lowCount === 0 && expiringCount === 0 && (
                <p className="text-sm text-stone-400 text-center py-8">All clear — stock levels look healthy ✨</p>
              )}
            </div>
          </div>
        </div>

        {/* Seasonal */}
        <div className="card overflow-hidden">
          <div className="p-5 pb-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-lav-soft rounded-2xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#5d4394]" />
              </div>
              <div>
                <h2 className="font-extrabold text-ink tracking-tight">Seasonal medicines — {seasonal.title}</h2>
                <p className="text-sm text-stone-400">{seasonal.note}</p>
              </div>
            </div>
            <Chip tone="lav">Suggested for {new Date().toLocaleDateString('en-US', { month: 'long' })}</Chip>
          </div>
          <div className="divide-y divide-cream-deep/70">
            {seasonal.medicines.map((med) => {
              const inStock = stock?.items.find((s) => s.name === med.name);
              const available = inStock?.totalQty ?? 0;
              const needsMore = !inStock || available < med.suggestedStock;
              const shortBy = Math.max(0, med.suggestedStock - available);
              return (
                <div key={med.name} className="px-4 sm:px-5 py-3.5 hover:bg-cream-soft">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-lav-soft rounded-2xl flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-[#5d4394]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-ink leading-snug break-words">{med.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{med.reason}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {inStock ? <Chip tone="neutral">In stock: {available}</Chip> : <Chip tone="neutral">Not in inventory</Chip>}
                        {needsMore ? (
                          <button onClick={() => restock(med.name)}>
                            <Chip tone="blush">
                              <AlertTriangle className="w-3 h-3" />Supply more ({shortBy} short)
                            </Chip>
                          </button>
                        ) : (
                          <Chip tone="mint">Stocked up</Chip>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-line bg-cream-soft text-xs text-stone-400">
            Seasonal recommendations use typical demand patterns for this time of year. Smarter demand-based suggestions come later.
          </div>
        </div>

        <div className="card p-5 flex items-center gap-5 flex-wrap">
          <ProgressRing percent={stockHealth} size={64} />
          <div>
            <p className="font-extrabold text-ink tracking-tight">Stock health</p>
            <p className="text-sm text-stone-400">
              {okStock} of {stock?.items.length || 0} products above reorder level at {currentBranch?.name}
            </p>
          </div>
          <Chip tone={stockHealth > 70 ? 'mint' : 'sun'} className="ml-auto">
            {stockHealth > 70 ? 'Healthy' : 'Needs attention'}
          </Chip>
        </div>

        {session?.impersonated && <p className="text-xs text-stone-400 text-center">Support session — actions are logged.</p>}
      </div>
    </Layout>
  );
};

export default Dashboard;
