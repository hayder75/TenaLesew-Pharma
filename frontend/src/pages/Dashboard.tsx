import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { mockSales, mockProducts, mockBanks } from '../lib/mockData';
import { getSeasonalMedicines } from '../lib/seasonalData';
import { 
  Package, 
  AlertTriangle, 
  DollarSign, 
  ShoppingCart, 
  Users,
  Clock,
  FileText,
  Truck,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const totalSales = mockSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProducts = mockProducts.length;
  const lowStockProducts = mockProducts.filter(p => (p.minStock || 10) >= p.stock).length;
  const outOfStock = mockProducts.filter(p => p.stock === 0).length;
  const totalBankBalance = mockBanks.reduce((sum, b) => sum + b.balance, 0);

  const seasonal = getSeasonalMedicines();

  const navigateTo = (path: string) => {
    navigate(path);
  };

  const getStats = () => {
    const baseStats = [
      { label: "Today's Sales", value: `$${totalSales.toFixed(2)}`, icon: DollarSign, color: 'blue', change: '+12%' },
      { label: 'Total Products', value: totalProducts, icon: Package, color: 'green', change: '' },
      { label: 'Low Stock Items', value: lowStockProducts, icon: AlertTriangle, color: 'red', change: '' },
      { label: 'Total Customers', value: 124, icon: Users, color: 'purple', change: '+5' },
    ];

    switch (user?.role) {
      case 'admin':
        return [...baseStats, { label: 'Bank Balance', value: `$${totalBankBalance.toLocaleString()}`, icon: DollarSign, color: 'green', change: '' }];
      case 'pharmacist':
      case 'cashier':
        return baseStats.slice(0, 2);
      case 'inventory':
        return [
          { label: 'Total Products', value: totalProducts, icon: Package, color: 'green', change: '' },
          { label: 'Low Stock', value: lowStockProducts, icon: AlertTriangle, color: 'red', change: '' },
          { label: 'Out of Stock', value: outOfStock, icon: AlertTriangle, color: 'orange', change: '' },
        ];
      case 'wholesale':
        return [
          { label: 'Wholesale Orders', value: 12, icon: Truck, color: 'blue', change: '+3' },
          { label: 'Active Clients', value: 8, icon: Users, color: 'green', change: '+2' },
          { label: 'Pending Credit', value: '$7,500', icon: DollarSign, color: 'red', change: '' },
        ];
      default:
        return baseStats;
    }
  };

  const getQuickActions = () => {
    const actions = [];
    if (['admin', 'pharmacist', 'cashier'].includes(user?.role || '')) {
      actions.push({ action: () => navigateTo('/pos'), icon: ShoppingCart, label: 'New Sale', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-600' });
    }
    if (['admin', 'pharmacist'].includes(user?.role || '')) {
      actions.push({ action: () => navigateTo('/prescriptions'), icon: FileText, label: 'Upload Rx', color: 'orange', bg: 'bg-orange-100', text: 'text-orange-600' });
    }
    if (['admin', 'wholesale'].includes(user?.role || '')) {
      actions.push({ action: () => navigateTo('/wholesale'), icon: Truck, label: 'Bulk Order', color: 'purple', bg: 'bg-purple-100', text: 'text-purple-600' });
    }
    if (['admin', 'inventory'].includes(user?.role || '')) {
      actions.push({ action: () => navigateTo('/inventory'), icon: Package, label: 'Add Product', color: 'green', bg: 'bg-green-100', text: 'text-green-600' });
    }
    if (user?.role === 'admin') {
      actions.push({ action: () => navigateTo('/finance'), icon: DollarSign, label: 'View Finance', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-600' });
    }
    return actions;
  };

  const stats = getStats();
  const quickActions = getQuickActions();

  const colorMap: Record<string, string> = {
    blue: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    green: 'linear-gradient(135deg, #10b981, #059669)',
    red: 'linear-gradient(135deg, #ef4444, #dc2626)',
    purple: 'linear-gradient(135deg, #a855f7, #9333ea)',
    orange: 'linear-gradient(135deg, #f97316, #ea580c)',
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, {user?.username}!</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          {user?.role?.toUpperCase()} - Branch: {user?.branch || 'All'}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="card p-5 text-white" style={{ background: colorMap[stat.color] }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/80 text-sm">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    {stat.change && (
                      <div className="flex items-center mt-2 text-sm">
                        <ArrowUpRight className="w-4 h-4" />
                        <span className="ml-1">{stat.change}</span>
                      </div>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {quickActions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button key={index} onClick={action.action} className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3 cursor-pointer">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.bg} ${action.text}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{action.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Recent Sales</h2>
              {user?.role === 'admin' && <button onClick={() => navigateTo('/reports')} className="text-sm text-blue-600 hover:underline">View all</button>}
            </div>
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {mockSales.map(sale => (
                <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Sale #{sale.id}</p>
                      <p className="text-sm text-gray-500">{sale.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+${sale.total.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 capitalize">{sale.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Alerts</h2>
            </div>
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {mockProducts.filter(p => (p.minStock || 10) >= p.stock).slice(0, 3).map(product => (
                <div key={product.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-red-500">{product.stock === 0 ? 'Out of stock' : 'Low stock'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-sm rounded-full ${product.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                    {product.stock} left
                  </span>
                </div>
              ))}
              {mockProducts.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).slice(0, 2).map(product => (
                <div key={`ex-${product.id}`} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-yellow-600">Expiring soon</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-600 text-sm rounded-full">{product.expiryDate}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Seasonal Medicines */}
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Seasonal Medicines — {seasonal.title}</h2>
                <p className="text-sm text-gray-500">{seasonal.note}</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium whitespace-nowrap">
              Suggested for {new Date().toLocaleDateString('en-US', { month: 'long' })}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {seasonal.medicines.map(med => {
              const product = mockProducts.find(p => p.name === med.name);
              const available = product?.stock || 0;
              const needsMore = !product || available < med.suggestedStock;
              const shortBy = Math.max(0, med.suggestedStock - available);
              return (
                <div key={med.name} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{med.name}</p>
                      <p className="text-sm text-gray-500">{med.reason}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {product ? (
                      <p className="text-sm text-gray-500">In stock: <span className="font-medium text-gray-900">{available}</span></p>
                    ) : (
                      <p className="text-sm text-gray-400">Not in inventory</p>
                    )}
                    {needsMore ? (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3" />Supply more ({shortBy} short)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        Stocked up
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl text-xs text-gray-400">
            Seasonal recommendations use typical demand patterns for this time of year. Smarter demand-based suggestions come later.
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;