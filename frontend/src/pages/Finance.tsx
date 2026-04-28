import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { mockBanks, mockUsers } from '../lib/mockData';
import { Plus, Lock, User, DollarSign, CreditCard, Building2, Download } from 'lucide-react';

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  cashier?: string;
  paymentMethod?: string;
}

const generateMockTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const categories = ['Sales', 'Wholesale', 'Rent', 'Salaries', 'Utilities', 'Supplies'];
  const cashiers = ['admin', 'pharmacist', 'cashier'];
  const methods = ['Cash', 'Commercial Bank of Ethiopia', 'Dashen Bank', 'Awash Bank', 'Telebirr', 'CBE Birr'];
  
  for (let i = 1; i <= 50; i++) {
    const isIncome = Math.random() > 0.3;
    transactions.push({
      id: i,
      date: `2026-04-${String(20 - (i % 20)).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      description: isIncome ? `POS Sale #${1000 + i}` : `${categories[Math.floor(Math.random() * categories.length)]} Payment`,
      amount: Math.random() * 500 + 10,
      type: isIncome ? 'income' : 'expense',
      category: isIncome ? 'Sales' : categories[Math.floor(Math.random() * categories.length)],
      cashier: cashiers[Math.floor(Math.random() * cashiers.length)],
      paymentMethod: methods[Math.floor(Math.random() * methods.length)]
    });
  }
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const mockTransactionsData = generateMockTransactions();

const Finance: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'cashiers' | 'banks'>('overview');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [dateRange, setDateRange] = useState('today');

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
            <p className="text-gray-500 mt-2">Only admins can access the finance module.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredTransactions = mockTransactionsData.filter(t => {
    return selectedCashier === 'all' || t.cashier === selectedCashier;
  });

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const totalBankBalance = mockBanks.reduce((s, b) => s + b.balance, 0);

  const incomeByBank: Record<string, number> = {};
  filteredTransactions.filter(t => t.type === 'income').forEach(t => {
    const method = t.paymentMethod || 'Cash';
    incomeByBank[method] = (incomeByBank[method] || 0) + t.amount;
  });

  const cashierStats = mockUsers.filter(u => u.role !== 'admin').map(cashier => ({
    name: cashier.username,
    totalSales: filteredTransactions.filter(t => t.cashier === cashier.username && t.type === 'income').reduce((s, t) => s + t.amount, 0),
    transactionCount: filteredTransactions.filter(t => t.cashier === cashier.username).length
  }));

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
            <p className="text-gray-500 mt-1">Financial overview, cashier reports & bank balances</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => setShowAddExpense(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2">
              <Plus className="w-5 h-5" />Add Expense
            </button>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-400" />
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl">
                <option value="all">All Branches</option>
                <option value="main">Main Branch</option>
                <option value="bole">Branch 2 - Bole</option>
                <option value="hawassa">Branch 3 - Hawassa</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl">
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              <select value={selectedCashier} onChange={(e) => setSelectedCashier(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl">
                <option value="all">All Cashiers</option>
                {mockUsers.filter(u => u.role !== 'admin').map(u => (
                  <option key={u.id} value={u.username}>{u.username}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-gray-500">Total Income</p>
            <p className="text-2xl font-bold text-green-600">${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-red-500">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className={`card p-4 border-l-4 ${netProfit >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
            <p className="text-sm text-gray-500">Net Profit</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-purple-500">
            <p className="text-sm text-gray-500">Bank Balance</p>
            <p className="text-2xl font-bold text-purple-600">${totalBankBalance.toLocaleString()}</p>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Income by Bank/Wallet</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(incomeByBank).map(([bank, amount]) => (
              <div key={bank} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 truncate">{bank}</p>
                <p className="font-bold text-gray-900">${amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'overview' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Overview</button>
          <button onClick={() => setActiveTab('transactions')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'transactions' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Transactions</button>
          <button onClick={() => setActiveTab('cashiers')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'cashiers' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Cashier Reports</button>
          <button onClick={() => setActiveTab('banks')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'banks' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Bank Accounts</button>
        </div>

        {activeTab === 'transactions' && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.slice(0, 30).map(transaction => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{transaction.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{transaction.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{transaction.category}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{transaction.cashier}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{transaction.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-medium"><span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>{transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'cashiers' && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transactions</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Collected</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cashierStats.map(cashier => (
                  <tr key={cashier.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 capitalize">{cashier.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{cashier.name}</td>
                    <td className="px-4 py-3 text-right">{cashier.transactionCount}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">${cashier.totalSales.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${totalIncome > 0 ? Math.min(100, (cashier.totalSales / totalIncome) * 100) : 0}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-500">{totalIncome > 0 ? ((cashier.totalSales / totalIncome) * 100).toFixed(1) : 0}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'banks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockBanks.map(bank => (
              <div key={bank.id} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bank.type === 'bank' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      {bank.type === 'bank' ? <CreditCard className="w-5 h-5 text-blue-600" /> : <DollarSign className="w-5 h-5 text-purple-600" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{bank.name}</h3>
                      <p className="text-xs text-gray-500 capitalize">{bank.type}</p>
                    </div>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">${bank.balance.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1 font-mono">{bank.accountNumber}</p>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500">Income this period: ${(incomeByBank[bank.name] || 0).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddExpense && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b"><h2 className="font-semibold">Add Expense</h2></div>
              <div className="p-4 space-y-3">
                <input type="text" placeholder="Description" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <input type="number" placeholder="Amount" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl">
                  <option>Rent</option><option>Salaries</option><option>Utilities</option><option>Supplies</option><option>Other</option>
                </select>
                <input type="date" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={() => setShowAddExpense(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={() => setShowAddExpense(false)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Finance;