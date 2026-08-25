import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getMenuItemsForRole } from '../lib/mockData';
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Truck,
  Package,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  Menu,
  BarChart,
  Sun,
  Moon,
  Bell,
  Plus,
  Cross,
  X
} from 'lucide-react';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Truck,
  Package,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Building2,
  BarChart
};

const menuConfig = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', key: 'dashboard' },
  { path: '/pos', label: 'Point of Sale', icon: 'ShoppingCart', key: 'pos' },
  { path: '/my-sales', label: 'My Sales', icon: 'BarChart', key: 'my_sales' },
  { path: '/prescriptions', label: 'Prescriptions', icon: 'FileText', key: 'prescriptions' },
  { path: '/wholesale', label: 'Wholesale', icon: 'Truck', key: 'wholesale' },
  { path: '/inventory', label: 'Inventory', icon: 'Package', key: 'inventory' },
  { path: '/suppliers', label: 'Suppliers', icon: 'Users', key: 'suppliers' },
  { path: '/customers', label: 'Customers', icon: 'Users', key: 'customers' },
  { path: '/finance', label: 'Finance', icon: 'DollarSign', key: 'finance' },
  { path: '/reports', label: 'Reports', icon: 'BarChart3', key: 'reports' },
  { path: '/branches', label: 'Branches', icon: 'Building2', key: 'branches' },
  { path: '/settings', label: 'Settings', icon: 'Settings', key: 'settings' },
];

const pageTitleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pos': 'Point of Sale',
  '/my-sales': 'My Sales',
  '/prescriptions': 'Prescriptions',
  '/wholesale': 'Wholesale',
  '/inventory': 'Inventory',
  '/suppliers': 'Suppliers',
  '/customers': 'Customers',
  '/finance': 'Finance',
  '/reports': 'Reports',
  '/branches': 'Branches',
  '/settings': 'Settings'
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allowedMenuKeys = user ? getMenuItemsForRole(user.role) : [];
  const menuItems = menuConfig.filter((item) => allowedMenuKeys.includes(item.key));
  const pageTitle = pageTitleMap[location.pathname] || 'TenaLesew Pharma';

  const sidebar = (
    <div
      className={`fixed left-0 top-0 h-full bg-cream-soft border-r border-line transition-all duration-300 z-50 flex flex-col ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Logo */}
      <div className="h-[72px] flex items-center px-4 shrink-0">
        <div className="w-11 h-11 bg-ink rounded-2xl flex items-center justify-center shrink-0 shadow-card">
          <Cross className="w-5 h-5 text-lime" strokeWidth={2.75} />
        </div>
        {sidebarOpen && (
          <div className="ml-3 leading-tight">
            <p className="font-extrabold tracking-tight text-ink">TenaLesew</p>
            <p className="text-[11px] font-bold text-[#8a861f] uppercase tracking-widest">Pharma</p>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`ml-auto p-1.5 hover:bg-white rounded-full text-stone-400 ${!sidebarOpen && 'hidden'}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {sidebarOpen && (
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Menu</p>
        )}
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-3.5 py-2.5 rounded-full transition-all group ${
                  isActive
                    ? 'bg-lime text-ink font-bold shadow-card'
                    : 'text-stone-500 hover:bg-white hover:text-ink font-medium'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                {Icon && <Icon className="w-[18px] h-[18px] shrink-0" />}
                {sidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Help card */}
      {sidebarOpen && (
        <div className="px-3 pb-3">
          <div className="card-dark p-4 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-lime/20 rounded-full" />
            <p className="font-bold text-sm relative">Need help?</p>
            <p className="text-xs text-white/50 mt-1 relative">Reach the platform team anytime.</p>
            <button className="btn btn-lime !py-1.5 !px-3 !text-xs mt-3 relative">Go to help center</button>
          </div>
        </div>
      )}

      {/* Profile */}
      <div className="border-t border-line p-3 shrink-0">
        <div className={`flex items-center ${sidebarOpen ? '' : 'justify-center'}`}>
          <div className="w-10 h-10 bg-lime rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-extrabold text-ink">{user?.username?.charAt(0).toUpperCase()}</span>
          </div>
          {sidebarOpen && (
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-bold text-ink truncate capitalize">{user?.username}</p>
              <p className="text-xs text-stone-400 capitalize">{user?.role}</p>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white rounded-full text-stone-400 hover:text-[#a34141]"
              title="Logout"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
        {!sidebarOpen && (
          <button
            onClick={handleLogout}
            className="w-full mt-2 p-2 hover:bg-white rounded-full text-stone-400 hover:text-[#a34141] flex justify-center"
            title="Logout"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Mobile topbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-cream-soft/95 backdrop-blur border-b border-line flex items-center px-4 z-40">
        <button onClick={() => setMobileOpen(true)} className="p-2 hover:bg-white rounded-full">
          <Menu className="w-5 h-5 text-ink" />
        </button>
        <div className="ml-2 flex items-center">
          <div className="w-8 h-8 bg-ink rounded-xl flex items-center justify-center">
            <Cross className="w-4 h-4 text-lime" strokeWidth={2.75} />
          </div>
          <span className="ml-2 font-extrabold text-ink">TenaLesew</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button className="relative p-2.5 hover:bg-white rounded-full text-stone-500">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-lime-deep rounded-full ring-2 ring-cream-soft" />
          </button>
          <div className="w-9 h-9 bg-lime rounded-full flex items-center justify-center">
            <span className="text-sm font-extrabold text-ink">{user?.username?.charAt(0).toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="hidden lg:block">{sidebar}</div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-cream-soft">{sidebar}</div>
        </div>
      )}

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} pt-16 lg:pt-0`}>
        {/* Desktop topbar */}
        <div className="hidden lg:flex items-center gap-3 px-6 pt-5 pb-1">
          <h2 className="text-sm font-bold text-stone-400">{pageTitle}</h2>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden xl:flex items-center relative">
              <input className="input !rounded-full !py-2 !pl-9 w-56" placeholder="Search or type command" />
              <svg
                className="w-4 h-4 absolute left-3 text-stone-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <div className="flex items-center bg-cream-deep/70 rounded-full p-1">
              <button className="px-3 py-1 rounded-full bg-white shadow-card text-xs font-bold text-ink flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" /> Light
              </button>
              <button
                className="px-3 py-1 rounded-full text-xs font-semibold text-stone-400 flex items-center gap-1.5"
                title="Dark mode coming soon"
              >
                <Moon className="w-3.5 h-3.5" /> Dark
              </button>
            </div>
            <button className="relative p-2.5 hover:bg-white rounded-full text-stone-500">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-lime-deep rounded-full ring-2 ring-cream" />
            </button>
            <button className="btn btn-dark !py-2 !px-4">
              <Plus className="w-4 h-4" /> New Sale
            </button>
          </div>
        </div>

        <main className="p-4 lg:p-6 lg:pt-3">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
