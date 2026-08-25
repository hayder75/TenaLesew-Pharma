import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { mockProducts } from '../lib/mockData';
import { PageHeader, StatCard, Modal } from '../components/ui';
import { DollarSign, ShoppingCart, TrendingUp, Printer, ChevronLeft, ChevronRight } from 'lucide-react';

interface SaleWithUser {
  id: number;
  date: string;
  total: number;
  items: { productId: number; productName: string; quantity: number; price: number }[];
  paymentMethod: string;
  cashier: string;
  customerName?: string;
}

const generateCashierSales = (): SaleWithUser[] => {
  const sales: SaleWithUser[] = [];
  const products = mockProducts;
  const cashiers = ['admin', 'pharmacist', 'cashier'];
  const methods = ['Cash', 'Commercial Bank of Ethiopia', 'Telebirr', 'CBE Birr'];

  for (let i = 1; i <= 30; i++) {
    const day = Math.floor(Math.random() * 30) + 1;
    const month = 4;
    const hour = Math.floor(Math.random() * 12) + 8;
    const minute = Math.floor(Math.random() * 60);
    const date = `2026-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let total = 0;
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      items.push({ productId: product.id, productName: product.name, quantity: qty, price: product.price });
      total += product.price * qty;
    }

    sales.push({
      id: 1000 + i,
      date,
      total,
      items,
      paymentMethod: methods[Math.floor(Math.random() * methods.length)],
      cashier: cashiers[Math.floor(Math.random() * cashiers.length)],
      customerName: Math.random() > 0.5 ? `Customer ${i}` : undefined,
    });
  }
  return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const mockCashierSales = generateCashierSales();

const CashierDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDetails, setShowDetails] = useState<SaleWithUser | null>(null);

  const today = new Date();
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = firstDayOfMonth;

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getSalesForDay = (day: number) => {
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `2026-04-${dayStr}`;
    const daySales = mockCashierSales.filter((s) => s.cashier === user?.username && s.date.startsWith(dateStr));
    const total = daySales.reduce((sum, s) => sum + s.total, 0);
    return { count: daySales.length, total, sales: daySales };
  };

  const monthSales = mockCashierSales.filter((s) => s.cashier === user?.username && s.date.startsWith('2026-04'));
  const monthTotal = monthSales.reduce((sum, s) => sum + s.total, 0);
  const todaySales = monthSales.filter((s) => s.date.includes(today.getDate().toString().padStart(2, '0')));
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

  const mySales = mockCashierSales.filter((s) => s.cashier === user?.username);

  const prevMonth = () => setSelectedDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setSelectedDate(new Date(currentYear, currentMonth + 1, 1));

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="My Sales"
          subtitle="View your daily, weekly and monthly sales"
          actions={
            <button onClick={() => window.print()} className="btn btn-ghost">
              <Printer className="w-4 h-4" /> Print Report
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Today's Sales" value={`$${todayTotal.toFixed(2)}`} icon={DollarSign} tone="lime" sub={`${todaySales.length} transactions`} />
          <StatCard label="This Month" value={`$${monthTotal.toFixed(2)}`} icon={TrendingUp} tone="sky" sub={`${monthSales.length} transactions`} />
          <StatCard label="Total Sales" value={`$${mySales.reduce((s, sale) => s + sale.total, 0).toFixed(2)}`} icon={ShoppingCart} tone="lav" sub={`${mySales.length} all time`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar */}
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-cream rounded-full text-stone-500"><ChevronLeft className="w-5 h-5" /></button>
              <h2 className="font-extrabold tracking-tight text-ink">{monthNames[currentMonth]} {currentYear}</h2>
              <button onClick={nextMonth} className="p-2 hover:bg-cream rounded-full text-stone-500"><ChevronRight className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-[11px] font-bold uppercase tracking-wider text-stone-400 py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {days.map((day, index) => {
                if (!day) return <div key={index} className="p-2" />;
                const dayData = getSalesForDay(day);
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                return (
                  <button
                    key={day}
                    onClick={() => dayData.count > 0 && setShowDetails(dayData.sales[0])}
                    disabled={dayData.count === 0}
                    className={`p-1.5 sm:p-2 text-xs sm:text-sm rounded-2xl relative font-semibold transition-all ${
                      isToday
                        ? 'bg-ink text-white'
                        : dayData.count > 0
                        ? 'bg-lime-soft text-[#5c6b12] hover:bg-lime hover:text-ink'
                        : 'bg-cream-soft text-stone-300'
                    } disabled:cursor-not-allowed`}
                  >
                    {day}
                    {dayData.count > 0 && (
                      <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center ${isToday ? 'bg-lime text-ink' : 'bg-ink text-lime'}`}>
                        {dayData.count}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-lime-soft border border-lime rounded"></div><span className="text-stone-400">Has sales</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-ink rounded"></div><span className="text-stone-400">Today</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-cream-soft border border-line rounded"></div><span className="text-stone-400">No sales</span></div>
            </div>
          </div>

          {/* Today's transactions */}
          <div className="card p-5">
            <h3 className="font-extrabold tracking-tight text-ink mb-3">Today's transactions</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {todaySales.length === 0 ? (
                <p className="text-stone-400 text-center py-6 text-sm">No sales today</p>
              ) : (
                todaySales.map((sale) => (
                  <div key={sale.id} className="p-3 bg-cream-soft border border-line rounded-2xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-ink">Sale #{sale.id}</p>
                        <p className="text-[11px] text-stone-400">{sale.date.split(' ')[1]}</p>
                      </div>
                      <span className="font-extrabold text-[#2f6b46]">${sale.total.toFixed(2)}</span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-1 font-semibold">{sale.items.length} items — {sale.paymentMethod}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Details modal */}
        <Modal open={!!showDetails} onClose={() => setShowDetails(null)} title={`Sales details — ${showDetails?.date.split(' ')[0] || ''}`} maxWidth="max-w-lg">
          {showDetails &&
            getSalesForDay(parseInt(showDetails.date.split('-')[2])).sales.map((sale) => (
              <div key={sale.id} className="p-4 border border-line rounded-2xl">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-ink">Sale #{sale.id}</span>
                  <span className="font-extrabold text-[#2f6b46]">${sale.total.toFixed(2)}</span>
                </div>
                <div className="text-xs text-stone-400 mb-2">{sale.date}</div>
                <div className="space-y-1">
                  {sale.items.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-stone-500">{item.productName} x{item.quantity}</span>
                      <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </Modal>
      </div>
    </Layout>
  );
};

export default CashierDashboard;
