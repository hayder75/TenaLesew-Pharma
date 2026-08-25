import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { roleMenus, roleLabels } from '../lib/roles';
import { apiGet, apiPost } from '../lib/api';
import { timeAgo } from '../lib/format';
import {
  LayoutDashboard, ShoppingCart, FileText, Truck, Package, Users, DollarSign,
  BarChart3, Settings, LogOut, Building2, Menu, BarChart, Bell, Cross, X,
  ShieldAlert, ChevronDown, Check,
} from 'lucide-react';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard, ShoppingCart, FileText, Truck, Package, Users, DollarSign,
  BarChart3, Settings, Building2, BarChart,
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

const pageTitleMap: Record<string, string> = Object.fromEntries(menuConfig.map((m) => [m.path, m.label]));

const licenseTone = (status: string) =>
  status === 'ACTIVE' ? 'text-[#2f6b46]' : status === 'EXPIRED' ? 'text-[#a34141]' : 'text-[#8a6d10]';

interface Notif { id: string; title: string; body?: string | null; readAt: string | null; createdAt: string }

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout, currentBranch, setCurrentBranchId, exitImpersonation, exitImpersonationFn } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branchDropdown, setBranchDropdown] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const role = session?.user.role;
  const allowedKeys = role ? roleMenus[role] || [] : [];
  const menuItems = menuConfig.filter((i) => allowedKeys.includes(i.key));
  const [now] = useState(() => Date.now());
  const expired = currentBranch?.license.status === 'EXPIRED';
  const grace = currentBranch?.license.status === 'GRACE';

  useEffect(() => {
    if (!session?.tenant) return;
    apiGet<{ items: Notif[]; unread: number }>('/notifications')
      .then((r) => setNotifs(r.items))
      .catch(() => undefined);
  }, [session?.tenant, location.pathname]);

  const unread = notifs.filter((n) => !n.readAt).length;

  const markRead = async () => {
    const ids = notifs.filter((n) => !n.readAt).map((n) => n.id);
    if (!ids.length) return;
    await apiPost('/notifications/read', { ids }).catch(() => undefined);
    setNotifs((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebar = (
    <div className={`fixed left-0 top-0 h-full bg-cream-soft border-r border-line transition-all duration-300 z-50 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'}`}>
      <div className="h-[72px] flex items-center px-4 shrink-0">
        <div className="w-11 h-11 bg-ink rounded-2xl flex items-center justify-center shrink-0 shadow-card">
          <Cross className="w-5 h-5 text-lime" strokeWidth={2.75} />
        </div>
        {sidebarOpen && (
          <div className="ml-3 leading-tight min-w-0">
            <p className="font-extrabold tracking-tight text-ink truncate">{session?.tenant?.name || 'TenaLesew'}</p>
            <p className="text-[11px] font-bold text-[#8a861f] uppercase tracking-widest">Pharma</p>
          </div>
        )}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`ml-auto p-1.5 hover:bg-white rounded-full text-stone-400 ${!sidebarOpen && 'hidden'}`}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {sidebarOpen && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Menu</p>}
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
                  isActive ? 'bg-lime text-ink font-bold shadow-card' : 'text-stone-500 hover:bg-white hover:text-ink font-medium'
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

      {/* License card */}
      {sidebarOpen && currentBranch && (
        <div className="px-3 pb-3">
          <div className={`${expired ? 'bg-blush-soft border border-blush' : 'card-dark'} p-4 relative overflow-hidden`}>
            <div className="flex items-center gap-2">
              <ShieldAlert className={`w-4 h-4 ${expired ? 'text-[#a34141]' : 'text-lime'}`} />
              <p className={`font-bold text-sm ${expired ? 'text-[#a34141]' : 'text-white'}`}>
                {expired ? 'License expired' : grace ? 'Grace period' : `Licensed: ${currentBranch.name}`}
              </p>
            </div>
            <p className={`text-xs mt-1 ${expired ? 'text-[#a34141]/80' : 'text-white/50'}`}>
              {expired
                ? 'Renew with the platform to keep selling.'
                : grace
                ? `Renew before ${new Date(new Date(currentBranch.license.paidUntil || now).getTime() + 7 * 86400000).toLocaleDateString()}`
                : `Active until ${new Date(currentBranch.license.paidUntil || currentBranch.license.trialEndsAt || now).toLocaleDateString()}`}
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-line p-3 shrink-0">
        <div className={`flex items-center ${sidebarOpen ? '' : 'justify-center'}`}>
          <div className="w-10 h-10 bg-lime rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-extrabold text-ink">{session?.user.username?.charAt(0).toUpperCase()}</span>
          </div>
          {sidebarOpen && (
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-bold text-ink truncate">{session?.user.fullName || session?.user.username}</p>
              <p className="text-xs text-stone-400">{roleLabels[role || 'CASHIER']}</p>
            </div>
          )}
          {sidebarOpen && (
            <button onClick={handleLogout} className="p-2 hover:bg-white rounded-full text-stone-400 hover:text-[#a34141]" title="Logout">
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
        {!sidebarOpen && (
          <button onClick={handleLogout} className="w-full mt-2 p-2 hover:bg-white rounded-full text-stone-400 hover:text-[#a34141] flex justify-center" title="Logout">
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Impersonation banner */}
      {exitImpersonation && session?.impersonated && (
        <div className="fixed top-0 inset-x-0 z-[60] bg-ink text-white text-sm px-4 py-2.5 flex items-center justify-center gap-3">
          <ShieldAlert className="w-4 h-4 text-lime" />
          <span>You are viewing <b>{session.tenant?.name}</b> as support.</span>
          <button onClick={exitImpersonationFn} className="btn btn-lime !py-1 !px-3 !text-xs">Exit to platform</button>
        </div>
      )}

      {/* Mobile topbar */}
      <div className={`lg:hidden fixed left-0 right-0 h-16 bg-cream-soft/95 backdrop-blur border-b border-line flex items-center px-4 z-40 ${exitImpersonation ? 'top-9' : 'top-0'}`}>
        <button onClick={() => setMobileOpen(true)} className="p-2 hover:bg-white rounded-full">
          <Menu className="w-5 h-5 text-ink" />
        </button>
        <div className="ml-2 flex items-center">
          <div className="w-8 h-8 bg-ink rounded-xl flex items-center justify-center">
            <Cross className="w-4 h-4 text-lime" strokeWidth={2.75} />
          </div>
          <span className="ml-2 font-extrabold text-ink">{session?.tenant?.name?.split(' ')[0] || 'TenaLesew'}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen && unread) markRead(); }} className="relative p-2.5 hover:bg-white rounded-full text-stone-500">
            <Bell className="w-[18px] h-[18px]" />
            {unread > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-lime-deep rounded-full ring-2 ring-cream-soft" />}
          </button>
          <div className="w-9 h-9 bg-lime rounded-full flex items-center justify-center">
            <span className="text-sm font-extrabold text-ink">{session?.user.username?.charAt(0).toUpperCase()}</span>
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

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} ${exitImpersonation ? 'pt-9' : ''} pt-16 lg:pt-0`}>
        {/* Desktop topbar */}
        <div className="hidden lg:flex items-center gap-3 px-6 pt-5 pb-1">
          <h2 className="text-sm font-bold text-stone-400">{pageTitleMap[location.pathname] || 'TenaLesew Pharma'}</h2>
          <div className="ml-auto flex items-center gap-2">
            {/* Branch switcher */}
            {session?.branches && session.branches.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setBranchDropdown(!branchDropdown)}
                  className="flex items-center gap-2 bg-white border border-line rounded-full px-4 py-2 text-sm font-semibold text-ink hover:border-lime"
                >
                  <Building2 className="w-4 h-4 text-stone-400" />
                  {currentBranch?.name}
                  <span className={`text-xs font-bold ${licenseTone(currentBranch?.license.status || '')}`}>{currentBranch?.license.status.toLowerCase()}</span>
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                </button>
                {branchDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-line rounded-3xl shadow-pop p-2 z-50">
                    {session.branches.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => { setCurrentBranchId(b.id); setBranchDropdown(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center justify-between hover:bg-cream-soft ${b.id === currentBranch?.id ? 'bg-lime-soft' : ''}`}
                      >
                        <div>
                          <p className="text-sm font-bold text-ink">{b.name}</p>
                          <p className={`text-xs font-semibold capitalize ${licenseTone(b.license.status)}`}>{b.license.status.toLowerCase()}</p>
                        </div>
                        {b.id === currentBranch?.id && <Check className="w-4 h-4 text-[#5c6b12]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="relative">
              <button onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen && unread) markRead(); }} className="relative p-2.5 hover:bg-white rounded-full text-stone-500">
                <Bell className="w-[18px] h-[18px]" />
                {unread > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-lime-deep rounded-full ring-2 ring-cream" />}
              </button>
            </div>
            <button onClick={handleLogout} className="btn btn-ghost !py-2 !px-4">Sign out</button>
          </div>
        </div>

        {/* Notifications dropdown */}
        {notifOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)}>
            <div className="absolute right-4 lg:right-6 top-16 lg:top-16 w-80 bg-white border border-line rounded-3xl shadow-pop p-3 max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400 px-2 pb-2">Notifications</p>
              {notifs.length === 0 && <p className="text-sm text-stone-400 text-center py-6">All quiet — no notifications</p>}
              {notifs.map((n) => (
                <div key={n.id} className={`px-3 py-2.5 rounded-2xl ${!n.readAt ? 'bg-lime-soft/60' : ''}`}>
                  <p className="text-sm font-bold text-ink">{n.title}</p>
                  {n.body && <p className="text-xs text-stone-500 mt-0.5">{n.body}</p>}
                  <p className="text-[10px] text-stone-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired license banner */}
        {expired && (
          <div className="mx-4 lg:mx-6 mt-3 bg-blush-soft border border-blush rounded-2xl px-4 py-3 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-[#a34141] shrink-0" />
            <p className="text-sm text-[#a34141] font-semibold">
              {currentBranch?.name}'s license has expired — selling and stock changes are disabled. Reports stay available. Contact the platform to renew.
            </p>
          </div>
        )}

        <main className={`p-4 lg:p-6 lg:pt-3 ${exitImpersonation ? 'mt-9 lg:mt-9' : ''}`}>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
