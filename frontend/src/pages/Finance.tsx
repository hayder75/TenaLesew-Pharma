import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { mockBanks, mockUsers } from '../lib/mockData';
import { PageHeader, Tabs, StatCard, Chip, Th, Td, Modal } from '../components/ui';
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
      paymentMethod: methods[Math.floor(Math.random() * methods.length)],
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
          <div className="card-dark p-10 text-center max-w-sm">
            <div className="w-16 h-16 bg-lime rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-ink" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Access Denied</h2>
            <p className="text-white/50 mt-2 text-sm">Only admins can access the finance module.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredTransactions = mockTransactionsData.filter((t) => selectedCashier === 'all' || t.cashier === selectedCashier);

  const totalIncome = filteredTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filteredTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const totalBankBalance = mockBanks.reduce((s, b) => s + b.balance, 0);

  const incomeByBank: Record<string, number> = {};
  filteredTransactions.filter((t) => t.type === 'income').forEach((t) => {
    const method = t.paymentMethod || 'Cash';
    incomeByBank[method] = (incomeByBank[method] || 0) + t.amount;
  });

  const cashierStats = mockUsers.filter((u) => u.role !== 'admin').map((cashier) => ({
    name: cashier.username,
    totalSales: filteredTransactions.filter((t) => t.cashier === cashier.username && t.type === 'income').reduce((s, t) => s + t.amount, 0),
    transactionCount: filteredTransactions.filter((t) => t.cashier === cashier.username).length,
  }));

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Finance"
          subtitle="Financial overview, cashier reports & bank balances"
          actions={
            <>
              <button className="btn btn-ghost">
                <Download className="w-4 h-4" /> Export
              </button>
              <button onClick={() => setShowAddExpense(true)} className="btn btn-dark">
                <Plus className="w-5 h-5" />Add Expense
              </button>
            </>
          }
        />

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-stone-400" />
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="input">
                <option value="all">All Branches</option>
                <option value="main">Main Branch</option>
                <option value="bole">Branch 2 - Bole</option>
                <option value="hawassa">Branch 3 - Hawassa</option>
              </select>
            </div>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="input">
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-stone-400" />
              <select value={selectedCashier} onChange={(e) => setSelectedCashier(e.target.value)} className="input">
                <option value="all">All Cashiers</option>
                {mockUsers.filter((u) => u.role !== 'admin').map((u) => (
                  <option key={u.id} value={u.username}>{u.username}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Total Income" value={`$${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={DollarSign} tone="mint" />
          <StatCard label="Total Expenses" value={`$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={DollarSign} tone="blush" />
          <StatCard label="Net Profit" value={`$${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={DollarSign} tone={netProfit >= 0 ? 'lime' : 'sun'} />
          <StatCard label="Bank Balance" value={`$${totalBankBalance.toLocaleString()}`} icon={CreditCard} tone="lav" />
        </div>

        {/* Income by bank */}
        <div className="card p-5">
          <h3 className="font-extrabold tracking-tight text-ink mb-4">Income by bank / wallet</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(incomeByBank).map(([bank, amount]) => (
              <div key={bank} className="p-3 bg-cream-soft border border-line rounded-2xl">
                <p className="text-[11px] font-semibold text-stone-400 truncate">{bank}</p>
                <p className="font-extrabold text-ink">${amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'transactions', label: 'Transactions' },
            { id: 'cashiers', label: 'Cashier Reports' },
            { id: 'banks', label: 'Bank Accounts' },
          ]}
          active={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />

        {activeTab === 'overview' && (
          <div className="card p-6">
            <p className="text-sm text-stone-400">Charts and trend visualizations land here once we connect the backend.</p>
          </div>
        )}

        {activeTab === 'transactions' && (
          <>
          <div className="card overflow-hidden hidden md:block">
            <table className="w-full min-w-[720px]">
              <thead className="bg-cream-soft border-b border-line">
                <tr>
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th>Category</Th>
                  <Th>Cashier</Th>
                  <Th>Method</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-deep/70">
                {filteredTransactions.slice(0, 30).map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-cream-soft">
                    <Td className="text-xs text-stone-400">{transaction.date}</Td>
                    <Td className="font-bold text-ink">{transaction.description}</Td>
                    <Td className="text-stone-500">{transaction.category}</Td>
                    <Td><Chip tone="sky">{transaction.cashier}</Chip></Td>
                    <Td className="text-stone-500 text-xs">{transaction.paymentMethod}</Td>
                    <Td className="text-right font-bold">
                      <span className={transaction.type === 'income' ? 'text-[#2f6b46]' : 'text-[#a34141]'}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cards (mobile) */}
          <div className="md:hidden space-y-3">
            {filteredTransactions.slice(0, 30).map((transaction) => (
              <div key={transaction.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-ink truncate">{transaction.description}</p>
                  <p className="text-xs text-stone-400">{transaction.date}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Chip tone="sky">{transaction.cashier}</Chip>
                    <Chip tone="neutral">{transaction.category}</Chip>
                  </div>
                </div>
                <p className={`font-extrabold shrink-0 ${transaction.type === 'income' ? 'text-[#2f6b46]' : 'text-[#a34141]'}`}>
                  {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          </>
        )}

        {activeTab === 'cashiers' && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-cream-soft border-b border-line">
                <tr>
                  <Th>Cashier</Th>
                  <Th>Role</Th>
                  <Th className="text-right">Transactions</Th>
                  <Th className="text-right">Total Collected</Th>
                  <Th>Performance</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-deep/70">
                {cashierStats.map((cashier) => (
                  <tr key={cashier.name} className="hover:bg-cream-soft">
                    <Td className="font-bold text-ink capitalize">{cashier.name}</Td>
                    <Td className="text-stone-500 capitalize text-xs">{cashier.name}</Td>
                    <Td className="text-right">{cashier.transactionCount}</Td>
                    <Td className="text-right font-extrabold text-[#2f6b46]">${cashier.totalSales.toFixed(2)}</Td>
                    <Td>
                      <div className="w-full bg-cream-deep rounded-full h-2 max-w-[140px]">
                        <div className="bg-lime h-2 rounded-full" style={{ width: `${totalIncome > 0 ? Math.min(100, (cashier.totalSales / totalIncome) * 100) : 0}%` }} />
                      </div>
                      <span className="text-[11px] text-stone-400 font-semibold">{totalIncome > 0 ? ((cashier.totalSales / totalIncome) * 100).toFixed(1) : 0}%</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {activeTab === 'banks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockBanks.map((bank) => (
              <div key={bank.id} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${bank.type === 'bank' ? 'bg-sky-soft text-[#3d5a94]' : 'bg-lav-soft text-[#5d4394]'}`}>
                      {bank.type === 'bank' ? <CreditCard className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-ink tracking-tight">{bank.name}</h3>
                      <p className="text-[11px] font-semibold text-stone-400 capitalize">{bank.type}</p>
                    </div>
                  </div>
                </div>
                <p className="text-2xl font-extrabold tracking-tight text-ink">${bank.balance.toLocaleString()}</p>
                <p className="text-xs text-stone-400 mt-1 font-mono">{bank.accountNumber}</p>
                <div className="mt-3 pt-3 border-t border-line">
                  <p className="text-xs text-stone-400">Income this period: <span className="font-bold text-ink">${(incomeByBank[bank.name] || 0).toFixed(2)}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal
          open={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          title="Add Expense"
          footer={
            <>
              <button onClick={() => setShowAddExpense(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => setShowAddExpense(false)} className="btn btn-dark flex-1">Save</button>
            </>
          }
        >
          <input type="text" placeholder="Description" className="input" />
          <input type="number" placeholder="Amount" className="input" />
          <select className="input">
            <option>Rent</option><option>Salaries</option><option>Utilities</option><option>Supplies</option><option>Other</option>
          </select>
          <input type="date" className="input" />
        </Modal>
      </div>
    </Layout>
  );
};

export default Finance;
