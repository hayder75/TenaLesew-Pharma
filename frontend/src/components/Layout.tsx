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
  ChevronRight,
  BarChart,
  Moon,
  Sun
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

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allowedMenuKeys = user ? getMenuItemsForRole(user.role) : [];
  const menuItems = menuConfig.filter(item => allowedMenuKeys.includes(item.key));

  const sidebar = (
    <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-50 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'}`}>
      <div className="h-16 flex items-center px-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        {sidebarOpen && (
          <span className="ml-3 text-lg font-bold text-gray-800">PharmaSys</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setDarkMode(!darkMode)} className="p-1 hover:bg-gray-100 rounded-lg">
            {darkMode ? <Sun className="w-5 h-5 text-gray-600" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                {Icon && <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />}
                {sidebarOpen && (
                  <span className={`ml-3 text-sm font-medium ${isActive ? 'text-blue-600' : ''}`}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-gray-100 p-4">
        <div className={`flex items-center ${sidebarOpen ? '' : 'justify-center'}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          {sidebarOpen && (
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
        {!sidebarOpen && (
          <button
            onClick={handleLogout}
            className="w-full mt-2 p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600 flex justify-center"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center px-4 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <div className="ml-3 flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="ml-2 font-bold text-gray-800">PharmaSys</span>
        </div>
      </div>

      <div className="hidden lg:block">
        {sidebar}
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white">
            {sidebar}
          </div>
        </div>
      )}

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} pt-16 lg:pt-0`}>
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;