import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { apiGet } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { money, dateStr } from '../lib/format';
import { PageHeader, StatCard, Chip, Modal } from '../components/ui';
import { DollarSign, ShoppingCart, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Sale } from '../lib/types';

const CashierDashboard: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [detail, setDetail] = useState<Sale | null>(null);

  const { data: mySales, loading, error } = useApi<{ items: Sale[] }>(
    () => apiGet(`/pos/sales?cashierId=${user?.id}&limit=200${currentBranch ? `&branchId=${currentBranch.id}` : ''}`),
    [user?.id, currentBranch?.id]
  );

  const sales = mySales?.items || [];
  const today = new Date();
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  const todaySales = sales.filter((s) => isSameDay(new Date(s.createdAt), today));
  const monthSales = sales.filter((s) => new Date(s.createdAt).getMonth() === today.getMonth() && new Date(s.createdAt).getFullYear() === today.getFullYear());

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const salesForDay = (day: number) =>
    sales.filter((s) => {
      const d = new Date(s.createdAt);
      return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader title="My Sales" subtitle="Your personal sales performance" />

        {error && <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl text-sm text-[#a34141] font-medium">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Today's sales" value={money(todaySales.reduce((s, x) => s + x.total, 0))} icon={DollarSign} tone="lime" sub={`${todaySales.length} transactions`} />
          <StatCard label="This month" value={money(monthSales.reduce((s, x) => s + x.total, 0))} icon={TrendingUp} tone="sky" sub={`${monthSales.length} transactions`} />
          <StatCard label="All time" value={money(sales.reduce((s, x) => s + x.total, 0))} icon={ShoppingCart} tone="lav" sub={`${sales.length} transactions`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setSelectedDate(new Date(currentYear, currentMonth - 1, 1))} className="p-2 hover:bg-cream rounded-full text-stone-500"><ChevronLeft className="w-5 h-5" /></button>
              <h2 className="font-extrabold tracking-tight text-ink">{monthNames[currentMonth]} {currentYear}</h2>
              <button onClick={() => setSelectedDate(new Date(currentYear, currentMonth + 1, 1))} className="p-2 hover:bg-cream rounded-full text-stone-500"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-[11px] font-bold uppercase tracking-wider text-stone-400 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((day, index) => {
                if (!day) return <div key={index} />;
                const daySales = salesForDay(day);
                const dayTotal = daySales.reduce((s, x) => s + x.total, 0);
                const isToday = isSameDay(new Date(currentYear, currentMonth, day), today);
                return (
                  <button
                    key={day}
                    onClick={() => daySales.length > 0 && setDetail(daySales[0])}
                    disabled={daySales.length === 0}
                    className={`p-1.5 sm:p-2 text-xs sm:text-sm rounded-2xl relative font-semibold transition-all ${
                      isToday ? 'bg-ink text-white' : daySales.length > 0 ? 'bg-lime-soft text-[#5c6b12] hover:bg-lime hover:text-ink' : 'bg-cream-soft text-stone-300'
                    } disabled:cursor-not-allowed`}
                    title={daySales.length ? `${daySales.length} sales · ${money(dayTotal)}` : undefined}
                  >
                    {day}
                    {daySales.length > 0 && (
                      <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center ${isToday ? 'bg-lime text-ink' : 'bg-ink text-lime'}`}>
                        {daySales.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-lime-soft border border-lime rounded" /><span className="text-stone-400">Has sales</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-ink rounded" /><span className="text-stone-400">Today</span></div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-extrabold tracking-tight text-ink mb-3">Today's transactions</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading && <p className="text-stone-400 text-center py-6 text-sm">Loading…</p>}
              {todaySales.length === 0 && !loading && <p className="text-stone-400 text-center py-6 text-sm">No sales today yet</p>}
              {todaySales.map((sale) => (
                <button key={sale.id} onClick={() => setDetail(sale)} className="w-full p-3 bg-cream-soft border border-line rounded-2xl text-left hover:border-lime">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-ink">{sale.receiptNo}</p>
                      <p className="text-[11px] text-stone-400">{new Date(sale.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className="font-extrabold text-[#2f6b46]">{money(sale.total)}</span>
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1 font-semibold">{sale.items?.length || 0} items — {sale.paymentMethod}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.receiptNo || ''} maxWidth="max-w-lg">
          {detail && (
            <>
              <p className="text-sm text-stone-400 -mt-1">{dateStr(detail.createdAt)} · {detail.customerName || 'Walk-in'}</p>
              <div className="space-y-1">
                {detail.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1 border-b border-cream-deep/50">
                    <span className="text-stone-500">{item.productName} x{item.qty}</span>
                    <span className="font-semibold">{money(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-lg font-extrabold text-ink pt-2"><span>Total</span><span>{money(detail.total)}</span></div>
              <div className="flex gap-2">
                <Chip tone="neutral">{detail.paymentMethod}</Chip>
                <Chip tone={detail.status === 'COMPLETED' ? 'mint' : 'sun'}>{detail.status.replace('_', ' ').toLowerCase()}</Chip>
              </div>
            </>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default CashierDashboard;
