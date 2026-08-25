import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { mockSales, mockProducts } from '../lib/mockData';
import { PageHeader, Tabs, Chip, BarChart } from '../components/ui';
import { TrendingUp, Package, DollarSign, Calendar, Filter, Download, Lock } from 'lucide-react';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'finance' | 'expiry'>('sales');
  const [dateRange, setDateRange] = useState('today');
  const [branch, setBranch] = useState('all');

  const exportToCSV = (data: object[], filename: string) => {
    const rows = data as Record<string, unknown>[];
    const headers = Object.keys(rows[0] || {}).filter((h) => typeof rows[0][h] !== 'object');
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleExport = () => {
    if (reportType === 'sales') {
      exportToCSV(mockSales, 'sales_report.csv');
    } else if (reportType === 'inventory') {
      exportToCSV(mockProducts, 'inventory_report.csv');
    } else {
      alert('Export not implemented for this report type yet.');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="card-dark p-10 text-center max-w-sm">
            <div className="w-16 h-16 bg-lime rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-ink" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Access Denied</h2>
            <p className="text-white/50 mt-2 text-sm">Only admins can access reports.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // mock weekly data for the sales chart
  const weekData = [
    { label: 'Mon', value: 4200 },
    { label: 'Tue', value: 5100 },
    { label: 'Wed', value: 3800 },
    { label: 'Thu', value: 6400 },
    { label: 'Fri', value: 7300 },
    { label: 'Sat', value: 8100 },
    { label: 'Sun', value: 5900 },
  ];

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Reports"
          subtitle="Sales, inventory and financial reports"
          actions={
            <button onClick={handleExport} className="btn btn-dark">
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          }
        />

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-stone-400" />
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="input">
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="input">
              <option value="all">All Branches</option>
              <option value="main">Main Branch</option>
              <option value="bole">Branch 2 - Bole</option>
            </select>
          </div>
        </div>

        <Tabs
          tabs={[
            { id: 'sales', label: 'Sales', icon: TrendingUp },
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'finance', label: 'Finance', icon: DollarSign },
            { id: 'expiry', label: 'Expiry', icon: Calendar },
          ]}
          active={reportType}
          onChange={(id) => setReportType(id as typeof reportType)}
        />

        <div className="card p-6">
          {reportType === 'sales' && (
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink mb-4">Sales report</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-lime-soft p-4 rounded-2xl border border-lime/30"><p className="text-xs font-bold text-[#5c6b12] uppercase tracking-wider">Total Sales</p><p className="text-2xl font-extrabold text-ink">$45,230</p></div>
                <div className="bg-sky-soft p-4 rounded-2xl border border-sky/40"><p className="text-xs font-bold text-[#3d5a94] uppercase tracking-wider">Transactions</p><p className="text-2xl font-extrabold text-ink">234</p></div>
                <div className="bg-lav-soft p-4 rounded-2xl border border-lav/40"><p className="text-xs font-bold text-[#5d4394] uppercase tracking-wider">Average</p><p className="text-2xl font-extrabold text-ink">$193.20</p></div>
              </div>
              <div className="bg-cream-soft border border-line rounded-3xl p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">This week (ETB)</p>
                <BarChart data={weekData} format={(v) => `$${(v / 1000).toFixed(1)}k`} />
              </div>
            </div>
          )}
          {reportType === 'inventory' && (
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink mb-4">Inventory report</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-sky-soft p-4 rounded-2xl border border-sky/40"><p className="text-xs font-bold text-[#3d5a94] uppercase tracking-wider">Products</p><p className="text-2xl font-extrabold text-ink">156</p></div>
                <div className="bg-blush-soft p-4 rounded-2xl border border-blush/40"><p className="text-xs font-bold text-[#a34141] uppercase tracking-wider">Low Stock</p><p className="text-2xl font-extrabold text-ink">12</p></div>
                <div className="bg-sun-soft p-4 rounded-2xl border border-sun/40"><p className="text-xs font-bold text-[#8a6d10] uppercase tracking-wider">Expiring</p><p className="text-2xl font-extrabold text-ink">8</p></div>
              </div>
              <Chip tone="neutral">Detailed tables coming with the backend</Chip>
            </div>
          )}
          {reportType === 'finance' && (
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink mb-4">Financial report</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-mint-soft p-4 rounded-2xl border border-mint/40"><p className="text-xs font-bold text-[#2f6b46] uppercase tracking-wider">Revenue</p><p className="text-2xl font-extrabold text-ink">$125,000</p></div>
                <div className="bg-blush-soft p-4 rounded-2xl border border-blush/40"><p className="text-xs font-bold text-[#a34141] uppercase tracking-wider">Expenses</p><p className="text-2xl font-extrabold text-ink">$45,000</p></div>
                <div className="bg-lime-soft p-4 rounded-2xl border border-lime/30"><p className="text-xs font-bold text-[#5c6b12] uppercase tracking-wider">Profit</p><p className="text-2xl font-extrabold text-ink">$80,000</p></div>
              </div>
            </div>
          )}
          {reportType === 'expiry' && (
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink mb-2">Expiry report</h2>
              <p className="text-sm text-stone-400">Products expiring in the next 90 days will be listed here with batch details.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Reports;
