import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { mockProducts } from '../lib/mockData';
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
      customerName: Math.random() > 0.5 ? `Customer ${i}` : undefined
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
    const daySales = mockCashierSales.filter(s => s.cashier === user?.username && s.date.startsWith(dateStr));
    const total = daySales.reduce((sum, s) => sum + s.total, 0);
    return { count: daySales.length, total, sales: daySales };
  };

  const monthSales = mockCashierSales.filter(s => s.cashier === user?.username && s.date.startsWith('2026-04'));
  const monthTotal = monthSales.reduce((sum, s) => sum + s.total, 0);
  const todaySales = monthSales.filter(s => s.date.includes(today.getDate().toString().padStart(2, '0')));
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

  const mySales = mockCashierSales.filter(s => s.cashier === user?.username);

  const prevMonth = () => setSelectedDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setSelectedDate(new Date(currentYear, currentMonth + 1, 1));

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Sales</h1>
            <p className="text-gray-500 mt-1">View your daily, weekly and monthly sales</p>
          </div>
          <button onClick={() => window.print()} className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Today's Sales</p>
                <p className="text-xl font-bold text-green-600">${todayTotal.toFixed(2)}</p>
                <p className="text-xs text-gray-400">{todaySales.length} transactions</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-xl font-bold text-blue-600">${monthTotal.toFixed(2)}</p>
                <p className="text-xs text-gray-400">{monthSales.length} transactions</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-xl font-bold text-purple-600">${mySales.reduce((s, sale) => s + sale.total, 0).toFixed(2)}</p>
                <p className="text-xs text-gray-400">{mySales.length} all time</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
              <h2 className="text-lg font-semibold">{monthNames[currentMonth]} {currentYear}</h2>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-xs font-medium text-gray-500 py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (!day) return <div key={index} className="p-2"></div>;
                const dayData = getSalesForDay(day);
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                
                return (
                  <button
                    key={day}
                    onClick={() => dayData.count > 0 && setShowDetails(dayData.sales[0])}
                    disabled={dayData.count === 0}
                    className={`p-2 text-sm rounded-lg relative ${isToday ? 'bg-blue-600 text-white' : dayData.count > 0 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-50 text-gray-400'} disabled:cursor-not-allowed`}
                  >
                    {day}
                    {dayData.count > 0 && (
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center ${isToday ? 'bg-white text-blue-600' : 'bg-green-500 text-white'}`}>
                        {dayData.count}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-4 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 rounded"></div><span className="text-gray-500">Has sales</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded"></div><span className="text-gray-500">Today</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-50 rounded"></div><span className="text-gray-500">No sales</span></div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-semibold mb-4">Today's Transactions</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {todaySales.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No sales today</p>
              ) : (
                todaySales.map(sale => (
                  <div key={sale.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Sale #{sale.id}</p>
                        <p className="text-xs text-gray-500">{sale.date.split(' ')[1]}</p>
                      </div>
                      <span className="font-bold text-green-600">${sale.total.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{sale.items.length} items - {sale.paymentMethod}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-lg">Sales Details - {showDetails.date.split(' ')[0]}</h2>
                <button onClick={() => setShowDetails(null)} className="p-1 hover:bg-gray-100 rounded">×</button>
              </div>
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {getSalesForDay(parseInt(showDetails.date.split('-')[2])).sales.map(sale => (
                  <div key={sale.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Sale #{sale.id}</span>
                      <span className="font-bold text-green-600">${sale.total.toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">{sale.date}</div>
                    <div className="space-y-1">
                      {sale.items.map(item => (
                        <div key={item.productId} className="flex justify-between text-sm">
                          <span>{item.productName} x{item.quantity}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CashierDashboard;