import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { mockSales, mockProducts } from '../lib/mockData';
import { BarChart3, TrendingUp, Package, DollarSign, Calendar, Filter, Lock, Download } from 'lucide-react';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'finance' | 'expiry'>('sales');
  const [dateRange, setDateRange] = useState('today');
  const [branch, setBranch] = useState('all');

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
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
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
            <p className="text-gray-500 mt-2">Only admins can access reports.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-500 mt-1">Sales, inventory and financial reports</p>
          </div>
          <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-gray-400 mr-2" />
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl">
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl">
              <option value="all">All Branches</option>
              <option value="main">Main Branch</option>
              <option value="bole">Branch 2 - Bole</option>
            </select>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button onClick={() => setReportType('sales')} className={`px-4 py-2 rounded-lg text-sm font-medium ${reportType === 'sales' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}><TrendingUp className="w-4 h-4 inline mr-1" />Sales</button>
          <button onClick={() => setReportType('inventory')} className={`px-4 py-2 rounded-lg text-sm font-medium ${reportType === 'inventory' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}><Package className="w-4 h-4 inline mr-1" />Inventory</button>
          <button onClick={() => setReportType('finance')} className={`px-4 py-2 rounded-lg text-sm font-medium ${reportType === 'finance' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}><DollarSign className="w-4 h-4 inline mr-1" />Finance</button>
          <button onClick={() => setReportType('expiry')} className={`px-4 py-2 rounded-lg text-sm font-medium ${reportType === 'expiry' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}><Calendar className="w-4 h-4 inline mr-1" />Expiry</button>
        </div>

        <div className="card p-6">
          {reportType === 'sales' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Sales Report</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-xl"><p className="text-sm text-blue-600">Total Sales</p><p className="text-2xl font-bold">$45,230</p></div>
                <div className="bg-green-50 p-4 rounded-xl"><p className="text-sm text-green-600">Transactions</p><p className="text-2xl font-bold">234</p></div>
                <div className="bg-purple-50 p-4 rounded-xl"><p className="text-sm text-purple-600">Average</p><p className="text-2xl font-bold">$193.20</p></div>
              </div>
              <div className="text-center py-12 text-gray-400"><BarChart3 className="w-16 h-16 mx-auto mb-4" /><p>Sales chart</p></div>
            </div>
          )}
          {reportType === 'inventory' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Inventory Report</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-xl"><p className="text-sm text-blue-600">Products</p><p className="text-2xl font-bold">156</p></div>
                <div className="bg-red-50 p-4 rounded-xl"><p className="text-sm text-red-600">Low Stock</p><p className="text-2xl font-bold">12</p></div>
                <div className="bg-yellow-50 p-4 rounded-xl"><p className="text-sm text-yellow-600">Expiring</p><p className="text-2xl font-bold">8</p></div>
              </div>
            </div>
          )}
          {reportType === 'finance' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Financial Report</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-xl"><p className="text-sm text-green-600">Revenue</p><p className="text-2xl font-bold">$125,000</p></div>
                <div className="bg-red-50 p-4 rounded-xl"><p className="text-sm text-red-600">Expenses</p><p className="text-2xl font-bold">$45,000</p></div>
                <div className="bg-blue-50 p-4 rounded-xl"><p className="text-sm text-blue-600">Profit</p><p className="text-2xl font-bold">$80,000</p></div>
              </div>
            </div>
          )}
          {reportType === 'expiry' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Expiry Report</h2>
              <p className="text-gray-500">Products expiring in next 90 days</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Reports;