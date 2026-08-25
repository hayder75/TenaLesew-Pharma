import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { mockSales, mockProducts, mockBanks } from '../lib/mockData';
import { getSeasonalMedicines } from '../lib/seasonalData';
import { StatCard, Chip, ProgressRing, Avatar } from '../components/ui';
import {
  Package,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  FileText,
  Truck,
  Sparkles,
  Wallet
} from 'lucide-react';

const EXPIRY_CUTOFF = Date.now() + 90 * 24 * 60 * 60 * 1000;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const totalSales = mockSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProducts = mockProducts.length;
  const lowStockProducts = mockProducts.filter((p) => (p.minStock || 10) >= p.stock).length;
  const outOfStock = mockProducts.filter((p) => p.stock === 0).length;
  const totalBankBalance = mockBanks.reduce((sum, b) => sum + b.balance, 0);

  const seasonal = getSeasonalMedicines();

  const navigateTo = (path: string) => navigate(path);

  const getStats = () => {
    const baseStats = [
      { label: "Today's Sales", value: `$${totalSales.toFixed(2)}`, icon: DollarSign, tone: 'lime' as const, sub: '+12% vs yesterday' },
      { label: 'Total Products', value: totalProducts, icon: Package, tone: 'sky' as const, sub: 'across catalog' },
      { label: 'Low Stock Items', value: lowStockProducts, icon: AlertTriangle, tone: 'blush' as const, sub: `${outOfStock} out of stock` },
      { label: 'Total Customers', value: 124, icon: Users, tone: 'lav' as const, sub: '+5 this week' },
    ];

    switch (user?.role) {
      case 'admin':
        return [...baseStats, { label: 'Bank Balance', value: `$${totalBankBalance.toLocaleString()}`, icon: Wallet, tone: 'mint' as const, sub: 'all accounts' }];
      case 'pharmacist':
      case 'cashier':
        return baseStats.slice(0, 2);
      case 'inventory':
        return [
          { label: 'Total Products', value: totalProducts, icon: Package, tone: 'sky' as const, sub: 'in catalog' },
          { label: 'Low Stock', value: lowStockProducts, icon: AlertTriangle, tone: 'blush' as const, sub: 'needs reorder' },
          { label: 'Out of Stock', value: outOfStock, icon: AlertTriangle, tone: 'sun' as const, sub: 'urgent' },
        ];
      case 'wholesale':
        return [
          { label: 'Wholesale Orders', value: 12, icon: Truck, tone: 'lime' as const, sub: '+3 this week' },
          { label: 'Active Clients', value: 8, icon: Users, tone: 'sky' as const, sub: '+2 this month' },
          { label: 'Pending Credit', value: '$7,500', icon: DollarSign, tone: 'blush' as const, sub: 'to collect' },
        ];
      default:
        return baseStats;
    }
  };

  const getQuickActions = () => {
    const actions = [];
    if (['admin', 'pharmacist', 'cashier'].includes(user?.role || '')) {
      actions.push({ action: () => navigateTo('/pos'), icon: ShoppingCart, label: 'New Sale', tone: 'lime' as const });
    }
    if (['admin', 'pharmacist'].includes(user?.role || '')) {
      actions.push({ action: () => navigateTo('/prescriptions'), icon: FileText, label: 'Upload Rx', tone: 'sun' as const });
    }
    if (['admin', 'wholesale'].includes(user?.role || '')) {
      actions.push({ action: () => navigateTo('/wholesale'), icon: Truck, label: 'Bulk Order', tone: 'lav' as const });
    }
    if (['admin', 'inventory'].includes(user?.role || '')) {
      actions.push({ action: () => navigateTo('/inventory'), icon: Package, label: 'Add Product', tone: 'sky' as const });
    }
    if (user?.role === 'admin') {
      actions.push({ action: () => navigateTo('/finance'), icon: DollarSign, label: 'View Finance', tone: 'mint' as const });
    }
    return actions;
  };

  const stats = getStats();
  const quickActions = getQuickActions();

  const hour = new Date().getHours();
  const dayPart = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  return (
    <Layout>
      <div className="space-y-5">
        {/* Greeting hero */}
        <div>
          <h1 className="text-[21px] sm:text-[30px] lg:text-[38px] leading-snug sm:leading-tight font-extrabold tracking-tight text-ink">
            Good {dayPart}, {user?.username}! <span className="inline-block">👋</span>
            <br />
            Here's your <span className="bg-lime px-1.5 sm:px-2.5 rounded-lg sm:rounded-xl">pharmacy</span> at a glance.
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Chip tone="dark">
              <span className="w-1.5 h-1.5 bg-lime rounded-full" />
              {user?.role?.toUpperCase()}
            </Chip>
            <Chip tone="neutral">Branch: {user?.branch || 'All'}</Chip>
            <Chip tone="neutral">
              <Clock className="w-3 h-3" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Chip>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} dark={user?.role === 'admin' && index === 4} />
          ))}
        </div>

        {/* Quick actions */}
        {quickActions.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2.5">Quick actions</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className="card p-4 hover:shadow-pop transition-all flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-lime-soft text-[#5c6b12] group-hover:bg-lime group-hover:text-ink transition-all"
                      data-tone={action.tone}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-sm text-ink">{action.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent sales */}
          <div className="card">
            <div className="p-5 pb-3 flex items-center justify-between">
              <h2 className="font-extrabold text-ink tracking-tight">Recent sales</h2>
              {user?.role === 'admin' && (
                <button onClick={() => navigateTo('/reports')} className="text-sm font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4 hover:decoration-lime-deep">
                  View all
                </button>
              )}
            </div>
            <div className="divide-y divide-cream-deep/70 max-h-72 overflow-y-auto">
              {mockSales.map((sale, i) => (
                <div key={sale.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-cream-soft">
                  <div className="flex items-center gap-3">
                    <Avatar name={`#${sale.id}`} tone={i % 2 === 0 ? 'lime' : 'sky'} size="sm" />
                    <div>
                      <p className="font-bold text-sm text-ink">Sale #{sale.id}</p>
                      <p className="text-xs text-stone-400">{sale.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-sm text-ink">+${sale.total.toFixed(2)}</p>
                    <p className="text-[11px] text-stone-400 capitalize">{sale.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="card">
            <div className="p-5 pb-3">
              <h2 className="font-extrabold text-ink tracking-tight">Alerts</h2>
            </div>
            <div className="divide-y divide-cream-deep/70 max-h-72 overflow-y-auto">
              {mockProducts
                .filter((p) => (p.minStock || 10) >= p.stock)
                .slice(0, 3)
                .map((product) => (
                  <div key={product.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-cream-soft">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blush-soft rounded-2xl flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-[#a34141]" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-ink">{product.name}</p>
                        <p className="text-xs text-[#a34141]">{product.stock === 0 ? 'Out of stock' : 'Low stock'}</p>
                      </div>
                    </div>
                    <Chip tone={product.stock === 0 ? 'blush' : 'sun'}>{product.stock} left</Chip>
                  </div>
                ))}
              {mockProducts
                .filter((p) => p.expiryDate && new Date(p.expiryDate) < new Date(EXPIRY_CUTOFF))
                .slice(0, 2)
                .map((product) => (
                  <div key={`ex-${product.id}`} className="px-5 py-3.5 flex items-center justify-between hover:bg-cream-soft">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-sun-soft rounded-2xl flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-[#8a6d10]" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-ink">{product.name}</p>
                        <p className="text-xs text-[#8a6d10]">Expiring soon</p>
                      </div>
                    </div>
                    <Chip tone="sun">{product.expiryDate}</Chip>
                  </div>
                ))}
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
              const product = mockProducts.find((p) => p.name === med.name);
              const available = product?.stock || 0;
              const needsMore = !product || available < med.suggestedStock;
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
                        {product ? (
                          <Chip tone="neutral">In stock: {available}</Chip>
                        ) : (
                          <Chip tone="neutral">Not in inventory</Chip>
                        )}
                        {needsMore ? (
                          <Chip tone="blush">
                            <AlertTriangle className="w-3 h-3" />Supply more ({shortBy} short)
                          </Chip>
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

        {/* Target ring (decorative summary) */}
        <div className="card p-5 flex items-center gap-5 flex-wrap">
          <ProgressRing percent={72} size={64} />
          <div>
            <p className="font-extrabold text-ink tracking-tight">Monthly target</p>
            <p className="text-sm text-stone-400">You're at $45,230 of $63,000 — keep it up, {user?.username}!</p>
          </div>
          <Chip tone="lime" className="ml-auto">On track</Chip>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
