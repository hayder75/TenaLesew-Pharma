import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { LayoutDashboard, Building2, CreditCard, ScrollText, LogOut, Cross, Menu, X } from 'lucide-react';

const nav = [
  { path: '/platform', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/platform/tenants', label: 'Pharmacies', icon: Building2, end: false },
  { path: '/platform/payments', label: 'Payments', icon: CreditCard, end: false },
  { path: '/platform/audit', label: 'Audit Log', icon: ScrollText, end: false },
];

const PlatformLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="fixed left-0 top-0 h-full w-64 bg-cream-soft border-r border-line flex flex-col z-50">
      <div className="h-[72px] flex items-center px-4 shrink-0">
        <div className="w-11 h-11 bg-lime rounded-2xl flex items-center justify-center shrink-0">
          <Cross className="w-5 h-5 text-ink" strokeWidth={2.75} />
        </div>
        <div className="ml-3 leading-tight">
          <p className="font-extrabold tracking-tight text-ink">Platform</p>
          <p className="text-[11px] font-bold text-[#8a861f] uppercase tracking-widest">TenaLesew</p>
        </div>
        <button onClick={() => setMobileOpen(false)} className="ml-auto p-1.5 hover:bg-white rounded-full text-stone-400 lg:hidden">
          <X className="w-4 h-4" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {nav.map((item) => {
          const isActive = item.end ? location.pathname === item.path : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center px-3.5 py-2.5 rounded-full transition-all ${
                isActive ? 'bg-ink text-white font-bold shadow-card' : 'text-stone-500 hover:bg-white hover:text-ink font-medium'
              }`}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              <span className="ml-3 text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-ink rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-extrabold text-lime">{session?.user.username?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-bold text-ink truncate">{session?.user.fullName || session?.user.username}</p>
            <p className="text-xs text-stone-400">Super Admin</p>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-white rounded-full text-stone-400 hover:text-[#a34141]" title="Logout">
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      <div className="hidden lg:block">{sidebar}</div>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
          {sidebar}
        </div>
      )}
      <div className="lg:ml-64">
        <div className="hidden lg:flex items-center gap-3 px-6 pt-5 pb-1">
          <h2 className="text-sm font-bold text-stone-400">Platform Console</h2>
        </div>
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-cream-soft/95 backdrop-blur border-b border-line flex items-center px-4 z-40">
          <button onClick={() => setMobileOpen(true)} className="p-2 hover:bg-white rounded-full">
            <Menu className="w-5 h-5 text-ink" />
          </button>
          <div className="ml-2 flex items-center">
            <div className="w-8 h-8 bg-lime rounded-xl flex items-center justify-center">
              <Cross className="w-4 h-4 text-ink" strokeWidth={2.75} />
            </div>
            <span className="ml-2 font-extrabold text-ink">Platform</span>
          </div>
        </div>
        <main className="p-4 lg:p-6 lg:pt-3 pt-16 lg:pt-3">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PlatformLayout;
