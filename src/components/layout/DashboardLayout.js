import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Building2, Users, UserCheck, Calendar, FileText,
  Receipt, BarChart3, Package, ShoppingCart, Settings, Bell, Truck, 
  LogOut, ChevronDown, Menu, X, Clock, Briefcase, CreditCard,
  Shield, Home, FileSpreadsheet, UserCircle, ArrowLeftRight, BookUser,
  IndianRupee, BookOpen
} from 'lucide-react';

const NAV_CONFIG = {
  super_admin: {
    title: 'Super Admin',
    icon: Shield,
    items: [
      { path: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/super-admin/businesses', label: 'Businesses', icon: Building2 },
      { path: '/super-admin/settings', label: 'Platform Settings', icon: Settings },
    ]
  },
  business_owner: {
    title: 'Business',
    icon: Briefcase,
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/dashboard/users', label: 'Manage Users', icon: Users },
      { path: '/hr', label: 'HR Dashboard', icon: UserCheck },
      { path: '/hr/employees', label: 'Employees', icon: Users },
      { path: '/hr/attendance', label: 'Attendance', icon: Calendar },
      { path: '/hr/leave', label: 'Leave', icon: FileText },
      { path: '/hr/payroll', label: 'Payroll', icon: CreditCard },
      { path: '/finance', label: 'Finance Dashboard', icon: BarChart3 },
      { path: '/finance/invoices', label: 'Invoices', icon: FileSpreadsheet },
      { path: '/finance/customers', label: 'Customer Ledger', icon: BookUser },
      { path: '/finance/expenses', label: 'Expenses', icon: Receipt },
      { path: '/finance/reports', label: 'Reports', icon: BarChart3 },
      { path: '/finance/gst', label: 'GST Reports', icon: IndianRupee },
      { path: '/accounting', label: 'Accounting', icon: BookOpen },
      { path: '/purchases', label: 'Purchases', icon: Truck },
      { path: '/inventory', label: 'Inventory', icon: Package },
      { path: '/inventory/billing', label: 'Quick Bill', icon: ShoppingCart },
      { path: '/dashboard/settings', label: 'Settings', icon: Settings },
    ]
  },
  hr_admin: {
    title: 'HR Management',
    icon: UserCheck,
    items: [
      { path: '/hr', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/hr/employees', label: 'Employees', icon: Users },
      { path: '/hr/attendance', label: 'Attendance', icon: Calendar },
      { path: '/hr/leave', label: 'Leave Mgmt', icon: FileText },
      { path: '/hr/payroll', label: 'Payroll', icon: CreditCard },
    ]
  },
  finance_admin: {
    title: 'Finance',
    icon: BarChart3,
    items: [
      { path: '/finance', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/finance/invoices', label: 'Invoices', icon: FileSpreadsheet },
      { path: '/finance/customers', label: 'Customer Ledger', icon: BookUser },
      { path: '/finance/expenses', label: 'Expenses', icon: Receipt },
      { path: '/finance/reports', label: 'Reports', icon: BarChart3 },
      { path: '/finance/gst', label: 'GST Reports', icon: IndianRupee },
      { path: '/accounting', label: 'Accounting', icon: BookOpen },
      { path: '/purchases', label: 'Purchases', icon: Truck },
    ]
  },
  ca_admin: {
    title: 'CA Portal',
    icon: BookOpen,
    items: [
      { path: '/ca', label: 'GST Reports', icon: IndianRupee },
      { path: '/finance/invoices', label: 'Invoices', icon: FileSpreadsheet },
      { path: '/purchases', label: 'Purchases', icon: Truck },
    ]
  },
  inventory_admin: {
    title: 'Inventory',
    icon: Package,
    items: [
      { path: '/inventory', label: 'Products', icon: Package },
      { path: '/inventory/billing', label: 'Quick Bill', icon: ShoppingCart },
    ]
  },
  staff: {
    title: 'Staff Portal',
    icon: Home,
    items: [
      { path: '/staff', label: 'Home', icon: Home },
      { path: '/staff/attendance', label: 'My Attendance', icon: Clock },
      { path: '/staff/leave', label: 'My Leave', icon: Calendar },
      { path: '/staff/payslips', label: 'My Payslips', icon: FileText },
      { path: '/staff/profile', label: 'My Profile', icon: UserCircle },
    ]
  }
};

export default function DashboardLayout({ children }) {
  const { user, business, logout, impersonating, endImpersonation, api } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const role = user?.role || 'staff';
  const rawNav = NAV_CONFIG[role] || NAV_CONFIG.staff;

  // Filter nav items based on business modules
  const enabledModules = React.useMemo(() => {
    try { return JSON.parse(business?.modules || '[]'); } catch { return []; }
  }, [business]);

  const MODULE_NAV_MAP = {
    'manage_users': ['/dashboard/users'],
    'hr_payroll': ['/hr', '/hr/employees', '/hr/attendance', '/hr/leave', '/hr/payroll'],
    'invoices_finance': ['/finance', '/finance/invoices', '/finance/invoices/:id', '/finance/reports'],
    'inventory_billing': ['/inventory', '/inventory/billing'],
    'purchases_itc': ['/purchases'],
    'gst_reports': ['/finance/gst', '/ca'],
    'accounting': ['/accounting'],
    'customer_ledger': ['/finance/customers', '/finance/customers/:id'],
    'expenses': ['/finance/expenses'],
    'ca_portal': ['/ca'],
  };

  const isPathAllowed = (path) => {
    // Super admin always has full access
    if (role === 'super_admin') return true;
    // Always allow dashboard and settings regardless of modules
    if (['/dashboard', '/dashboard/settings'].includes(path)) return true;
    // If modules field doesn't exist yet (old business before feature), allow all
    if (business?.modules === undefined || business?.modules === null) return true;
    // If modules is empty array '[]', only show dashboard/settings (already handled above)
    if (enabledModules.length === 0) return false;
    // Check if path is covered by any enabled module
    return enabledModules.some(mod => (MODULE_NAV_MAP[mod] || []).includes(path));
  };

  const navConfig = {
    ...rawNav,
    items: rawNav.items.filter(item => isPathAllowed(item.path))
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications?limit=10');
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      } catch (e) {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [api]);

  const handleEndImpersonation = async () => {
    const success = await endImpersonation();
    if (success) navigate('/super-admin');
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(n => n.map(x => ({ ...x, is_read: true })));
    } catch (e) {}
  };

  const NavIcon = navConfig.icon;

  return (
    <div className="min-h-screen bg-obsidian flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-void border-r border-white/5 z-50 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-gold rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm font-sans">N</span>
            </div>
            <span className="font-display text-lg text-white tracking-tight">NexusERP</span>
          </Link>
          <button className="lg:hidden ml-auto text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03]">
            <NavIcon size={14} className="text-gold-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{navConfig.title}</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navConfig.items.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            // Highlight GST Reports with a subtle badge
            const isGST = item.path === '/finance/gst';
            const isPurchases = item.path === '/purchases';
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#D4AF37]/15 to-transparent text-gold-400 border-l-2 border-gold-500'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-gold-400' : ''} />
                <span>{item.label}</span>
                {(isGST || isPurchases) && !isActive && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold">
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Business info */}
        {business && (
          <div className="px-4 py-3 border-t border-white/5 shrink-0">
            <div className="px-2">
              <p className="text-xs text-gray-500 truncate">{business.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge-premium text-[10px] px-2 py-0.5 ${business.status === 'active' ? 'badge-success' : business.status === 'trial' ? 'badge-warning' : 'badge-danger'}`}>
                  {business.plan?.toUpperCase()}
                </span>
                {business.days_remaining !== undefined && (
                  <span className={`text-[10px] ${business.days_remaining <= 7 ? 'text-rose-400' : 'text-gray-500'}`}>
                    {business.days_remaining}d left
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Impersonation bar */}
        {impersonating && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={14} className="text-amber-400" />
              <span className="text-xs text-amber-300">
                Impersonating: {user?.first_name} {user?.last_name} ({user?.email})
              </span>
            </div>
            <button onClick={handleEndImpersonation} className="text-xs text-amber-400 hover:text-amber-300 font-medium">
              End Session
            </button>
          </div>
        )}

        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 shrink-0 bg-void/50 backdrop-blur-sm sticky top-0 z-30">
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); }}
                className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-12 w-80 glass-card rounded-xl shadow-elevated z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-gold-400 hover:text-gold-300">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-gray-500 text-xs text-center py-8">No notifications</p>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] ${!n.is_read ? 'bg-gold/[0.02]' : ''}`}>
                        <p className="text-sm text-white">{n.title}</p>
                        {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="w-7 h-7 bg-gradient-gold rounded-full flex items-center justify-center text-black text-xs font-bold">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <span className="text-sm text-gray-300 hidden sm:inline">{user?.first_name}</span>
                <ChevronDown size={14} className="text-gray-500" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-12 w-56 glass-card rounded-xl shadow-elevated z-50 overflow-hidden py-1">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm text-white font-medium">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <span className="badge-premium badge-gold text-[10px] mt-1 inline-block">
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-rose-400 hover:bg-white/[0.03] transition-colors"
                  >
                    <LogOut size={15} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 p-4 lg:p-6 overflow-auto"
          onClick={() => { setShowNotifs(false); setShowUserMenu(false); }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
