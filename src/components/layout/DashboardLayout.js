import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Building2, Users, UserCheck, Calendar, FileText,
  Receipt, BarChart3, Package, ShoppingCart, Settings, Bell, Truck,
  LogOut, ChevronDown, ChevronLeft, ChevronRight, Menu, X, Clock, Briefcase, CreditCard,
  Shield, Home, FileSpreadsheet, UserCircle, ArrowLeftRight, BookUser,
  IndianRupee, BookOpen, HardDriveDownload, Repeat, Lock, FileDown,
} from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import { parseEnabledModules, isNavPathAllowedForModules } from '../../shared-core/modules';
import { shouldApplyTrialModuleLock, isTrialPathUnlocked, TRIAL_UPGRADE_MESSAGE } from '../../shared-core/trialAccess';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { applySidebarOrder } from '../../shared-core/sidebarOrder';
import { getDisabledPremiumModules } from '../../shared-core/premiumModules';

const PREMIUM_LS_KEY = 'nexaerp_premium_features_expanded';
const SIDEBAR_PINNED_LS_KEY = 'nexaerp_sidebar_pinned';
const SIDEBAR_REORDER_ROLES = ['business_owner', 'finance_admin', 'hr_admin', 'inventory_admin', 'ca_admin'];
const SCROLL_EDGE_PX = 56;
const SCROLL_SPEED_PX = 16;

/** @template T @param {T[]} items @param {number} fromIndex @param {number} hoverBefore */
function finalizeReorder(items, fromIndex, hoverBefore) {
  if (fromIndex < 0 || fromIndex >= items.length) return items;
  const n = items.length;
  const hb = Math.max(0, Math.min(hoverBefore, n));
  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  const insertAt = hb > fromIndex ? hb - 1 : hb;
  copy.splice(insertAt, 0, moved);
  return copy;
}

/** @param {number} clientY @param {(HTMLElement|null)[]} rowEls @param {number} [rowCount] */
function hoverBeforeIndexFromY(clientY, rowEls, rowCount) {
  const n = rowCount != null ? rowCount : rowEls.length;
  for (let i = 0; i < n; i++) {
    const el = rowEls[i];
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.height <= 0) continue;
    const mid = r.top + r.height / 2;
    if (clientY < mid) return i;
  }
  return n;
}

function useIsLg() {
  const [ok, setOk] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(min-width: 1024px)');
    const fn = () => setOk(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return ok;
}

const NAV_CONFIG = {
  super_admin: {
    title: 'Super Admin',
    icon: Shield,
    items: [
      { path: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, orderKey: 'dashboard' },
      { path: '/super-admin/businesses', label: 'Businesses', icon: Building2, orderKey: 'businesses' },
      { path: '/super-admin/settings', label: 'Platform Settings', icon: Settings, orderKey: 'settings_sa' },
    ],
  },
  business_owner: {
    title: 'Business',
    icon: Briefcase,
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, orderKey: 'dashboard' },
      { path: '/dashboard/users', label: 'Manage Users', icon: Users, orderKey: 'users' },
      { path: '/hr', label: 'HR Dashboard', icon: UserCheck, orderKey: 'hr' },
      { path: '/hr/employees', label: 'Employees', icon: Users, orderKey: 'hr_employees' },
      { path: '/hr/attendance', label: 'Attendance', icon: Calendar, orderKey: 'hr_attendance' },
      { path: '/hr/leave', label: 'Leave', icon: FileText, orderKey: 'hr_leave' },
      { path: '/hr/payroll', label: 'Payroll', icon: CreditCard, orderKey: 'payroll' },
      { path: '/finance', label: 'Finance Dashboard', icon: BarChart3, orderKey: 'finance' },
      { path: '/finance/invoices', label: 'Sales Invoice', icon: FileSpreadsheet, orderKey: 'invoices' },
      { path: '/finance/recurring-invoices', label: 'Recurring Invoices', icon: Repeat, orderKey: 'recurring_invoices' },
      { path: '/finance/eway-bills', label: 'E-Way Bills', icon: Truck, orderKey: 'eway_bills' },
      { path: '/finance/customers', label: 'Customer Ledger', icon: BookUser, orderKey: 'customers' },
      { path: '/finance/challans', label: 'Challans', icon: FileText, orderKey: 'challans' },
      { path: '/finance/pos', label: 'POS Billing', icon: ShoppingCart, orderKey: 'pos_billing' },
      { path: '/finance/pdc-cheques', label: 'PDC Cheques', icon: CreditCard, orderKey: 'pdc_cheques' },
      { path: '/finance/price-lists', label: 'Rate Management', icon: Receipt, orderKey: 'rate_management' },
      { path: '/finance/bank-reconciliation', label: 'Bank Reconciliation', icon: ArrowLeftRight, orderKey: 'bank_reconciliation' },
      { path: '/finance/orders', label: 'Order Management', icon: Truck, orderKey: 'order_management' },
      { path: '/finance/mis-reports', label: 'MIS Reports', icon: BarChart3, orderKey: 'mis_reports' },
      { path: '/finance/migration', label: 'Import data', icon: HardDriveDownload, orderKey: 'migration' },
      { path: '/finance/expenses', label: 'Expenses', icon: Receipt, orderKey: 'expenses' },
      { path: '/finance/reports', label: 'Reports', icon: BarChart3, orderKey: 'reports' },
      { path: '/finance/gst', label: 'GST Reports', icon: IndianRupee, orderKey: 'gst' },
      { path: '/finance/tally-export', label: 'Tally Export', icon: FileDown, orderKey: 'tally_export' },
      { path: '/accounting', label: 'Accounting', icon: BookOpen, orderKey: 'accounting' },
      { path: '/purchases', label: 'Purchase Invoice', icon: Truck, orderKey: 'purchases' },
      { path: '/inventory', label: 'Inventory', icon: Package, orderKey: 'inventory' },
      { path: '/inventory/billing', label: 'Quick Bill', icon: ShoppingCart, orderKey: 'quick_bill' },
      { path: '/manufacturing', label: 'Manufacturing', icon: Briefcase, orderKey: 'manufacturing' },
      { path: '/dashboard/settings', label: 'Settings', icon: Settings, orderKey: 'settings' },
    ],
  },
  hr_admin: {
    title: 'HR Management',
    icon: UserCheck,
    items: [
      { path: '/hr', label: 'Dashboard', icon: LayoutDashboard, orderKey: 'hr' },
      { path: '/hr/employees', label: 'Employees', icon: Users, orderKey: 'hr_employees' },
      { path: '/hr/attendance', label: 'Attendance', icon: Calendar, orderKey: 'hr_attendance' },
      { path: '/hr/leave', label: 'Leave Mgmt', icon: FileText, orderKey: 'hr_leave' },
      { path: '/hr/payroll', label: 'Payroll', icon: CreditCard, orderKey: 'payroll' },
      { path: '/hr/salesmen', label: 'Salesmen', icon: Users, orderKey: 'salesmen' },
    ],
  },
  finance_admin: {
    title: 'Finance',
    icon: BarChart3,
    items: [
      { path: '/finance', label: 'Dashboard', icon: LayoutDashboard, orderKey: 'finance' },
      { path: '/finance/invoices', label: 'Sales Invoice', icon: FileSpreadsheet, orderKey: 'invoices' },
      { path: '/finance/recurring-invoices', label: 'Recurring Invoices', icon: Repeat, orderKey: 'recurring_invoices' },
      { path: '/finance/eway-bills', label: 'E-Way Bills', icon: Truck, orderKey: 'eway_bills' },
      { path: '/finance/customers', label: 'Customer Ledger', icon: BookUser, orderKey: 'customers' },
      { path: '/finance/challans', label: 'Challans', icon: FileText, orderKey: 'challans' },
      { path: '/finance/pos', label: 'POS Billing', icon: ShoppingCart, orderKey: 'pos_billing' },
      { path: '/finance/pdc-cheques', label: 'PDC Cheques', icon: CreditCard, orderKey: 'pdc_cheques' },
      { path: '/finance/price-lists', label: 'Rate Management', icon: Receipt, orderKey: 'rate_management' },
      { path: '/finance/bank-reconciliation', label: 'Bank Reconciliation', icon: ArrowLeftRight, orderKey: 'bank_reconciliation' },
      { path: '/finance/orders', label: 'Order Management', icon: Truck, orderKey: 'order_management' },
      { path: '/finance/mis-reports', label: 'MIS Reports', icon: BarChart3, orderKey: 'mis_reports' },
      { path: '/finance/migration', label: 'Import data', icon: HardDriveDownload, orderKey: 'migration' },
      { path: '/finance/expenses', label: 'Expenses', icon: Receipt, orderKey: 'expenses' },
      { path: '/finance/reports', label: 'Reports', icon: BarChart3, orderKey: 'reports' },
      { path: '/finance/gst', label: 'GST Reports', icon: IndianRupee, orderKey: 'gst' },
      { path: '/finance/tally-export', label: 'Tally Export', icon: FileDown, orderKey: 'tally_export' },
      { path: '/accounting', label: 'Accounting', icon: BookOpen, orderKey: 'accounting' },
      { path: '/purchases', label: 'Purchase Invoice', icon: Truck, orderKey: 'purchases' },
    ],
  },
  ca_admin: {
    title: 'CA Portal',
    icon: BookOpen,
    items: [
      { path: '/ca', label: 'GST Reports', icon: IndianRupee, orderKey: 'ca_gst' },
      { path: '/finance/invoices', label: 'Sales Invoice', icon: FileSpreadsheet, orderKey: 'invoices' },
      { path: '/purchases', label: 'Purchase Invoice', icon: Truck, orderKey: 'purchases' },
    ],
  },
  inventory_admin: {
    title: 'Inventory',
    icon: Package,
    items: [
      { path: '/inventory', label: 'Products', icon: Package, orderKey: 'inventory' },
      { path: '/inventory/billing', label: 'Quick Bill', icon: ShoppingCart, orderKey: 'quick_bill' },
    ],
  },
  staff: {
    title: 'Staff Portal',
    icon: Home,
    items: [
      { path: '/staff', label: 'Home', icon: Home, orderKey: 'staff_home' },
      { path: '/staff/attendance', label: 'My Attendance', icon: Clock, orderKey: 'staff_attendance' },
      { path: '/staff/leave', label: 'My Leave', icon: Calendar, orderKey: 'staff_leave' },
      { path: '/staff/payslips', label: 'My Payslips', icon: FileText, orderKey: 'staff_payslips' },
      { path: '/staff/profile', label: 'My Profile', icon: UserCircle, orderKey: 'staff_profile' },
    ],
  },
};

export default function DashboardLayout({ children }) {
  const { user, business, logout, impersonating, endImpersonation, api, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSidebarUserMenu, setShowSidebarUserMenu] = useState(false);

  const isLg = useIsLg();
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_PINNED_LS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [sidebarRailHover, setSidebarRailHover] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_PINNED_LS_KEY, sidebarPinned ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarPinned]);

  /** Desktop rail: expanded when pinned or hovering the aside. Mobile drawer: expanded when open. */
  const navLabelsVisible = isLg ? sidebarPinned || sidebarRailHover : sidebarOpen;
  /** Narrow 64px rail: logo must use full width; pin control is absolutely positioned so it does not squeeze the mark. */
  const collapsedDesktopRail = isLg && !navLabelsVisible;

  const role = user?.role || 'staff';
  const rawNav = NAV_CONFIG[role] || NAV_CONFIG.staff;

  const enabledModules = useMemo(() => parseEnabledModules(business), [business]);

  const isPathAllowed = useCallback(
    (path) => {
      if (role === 'super_admin') return true;
      if (role === 'staff') return true;
      if (['/dashboard', '/dashboard/settings'].includes(path)) return true;
      if (
        path === '/trial-upgrade' &&
        ['business_owner', 'finance_admin', 'hr_admin', 'inventory_admin', 'ca_admin'].includes(role)
      ) {
        return true;
      }
      if (enabledModules === null) return false;
      if (enabledModules.length === 0) return false;
      return isNavPathAllowedForModules(path, enabledModules);
    },
    [role, enabledModules],
  );

  const [trialOpen, setTrialOpen] = useState(false);

  const baseNavItems = useMemo(() => {
    return rawNav.items
      .filter((item) => isPathAllowed(item.path))
      .map((item) => ({
        ...item,
        trialLocked: shouldApplyTrialModuleLock(business, role) && !isTrialPathUnlocked(item.path),
      }));
  }, [rawNav.items, isPathAllowed, business, role]);

  const savedSidebarOrder = business?.sidebar_order;
  const mergedNavItems = useMemo(
    () => applySidebarOrder(baseNavItems, savedSidebarOrder),
    [baseNavItems, savedSidebarOrder],
  );

  const [navItems, setNavItems] = useState(mergedNavItems);
  useEffect(() => {
    setNavItems(mergedNavItems);
  }, [mergedNavItems]);

  const navItemsRef = useRef(navItems);
  navItemsRef.current = navItems;

  const canReorderSidebar = business && SIDEBAR_REORDER_ROLES.includes(role);
  const saveTimerRef = useRef(null);

  const persistSidebarOrder = useCallback(
    async (keys) => {
      try {
        await api.put('/business/sidebar-order', { order: keys });
        await refreshUser();
      } catch {
        /* ignore */
      }
    },
    [api, refreshUser],
  );

  const schedulePersistOrder = useCallback(
    (keys) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => persistSidebarOrder(keys), 450);
    },
    [persistSidebarOrder],
  );

  /** @type {React.MutableRefObject<HTMLDivElement|null>} */
  const navScrollRef = useRef(null);
  const lastPointerYRef = useRef(0);
  const listDragRef = useRef(null);
  /** @type {React.MutableRefObject<{ fromIndex: number; hoverBefore: number; ghostX: number; ghostY: number; grabOffsetX: number; grabOffsetY: number; width: number }|null>} */
  const dragSessionRef = useRef(null);

  const [listDrag, setListDrag] = useState(null);
  listDragRef.current = listDrag;

  const previewNavItems = useMemo(() => {
    if (!listDrag) return navItems;
    return finalizeReorder(navItems, listDrag.fromIndex, listDrag.hoverBefore);
  }, [navItems, listDrag]);

  useEffect(() => {
    if (!listDrag) return undefined;
    const nav = navScrollRef.current;
    let raf = 0;
    const tick = () => {
      if (!listDragRef.current) return;
      if (nav) {
        const y = lastPointerYRef.current;
        const rect = nav.getBoundingClientRect();
        if (y < rect.top + SCROLL_EDGE_PX) nav.scrollTop -= SCROLL_SPEED_PX;
        else if (y > rect.bottom - SCROLL_EDGE_PX) nav.scrollTop += SCROLL_SPEED_PX;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [listDrag]);

  const onReorderHandlePointerDown = useCallback(
    (e, index) => {
      if (!canReorderSidebar || !navLabelsVisible || e.button !== 0 || index < 0) return;
      e.preventDefault();
      e.stopPropagation();
      const handleEl = e.currentTarget;
      const rowWrap = handleEl.closest('[data-nav-row]');
      if (!(rowWrap instanceof HTMLElement)) return;
      const rect = rowWrap.getBoundingClientRect();
      try {
        handleEl.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      lastPointerYRef.current = e.clientY;
      const session = {
        fromIndex: index,
        hoverBefore: index,
        ghostX: e.clientX,
        ghostY: e.clientY,
        grabOffsetX: e.clientX - rect.left,
        grabOffsetY: e.clientY - rect.top,
        width: rect.width,
      };
      dragSessionRef.current = session;
      setListDrag(session);

      const onMove = (ev) => {
        const s = dragSessionRef.current;
        if (!s) return;
        lastPointerYRef.current = ev.clientY;
        const navEl = navScrollRef.current;
        const rowEls = navEl ? [...navEl.querySelectorAll('[data-nav-row]')] : [];
        s.hoverBefore = hoverBeforeIndexFromY(ev.clientY, rowEls, rowEls.length);
        s.ghostX = ev.clientX;
        s.ghostY = ev.clientY;
        setListDrag({ ...s });
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        document.body.style.userSelect = '';
        try {
          handleEl.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        const ld = dragSessionRef.current;
        dragSessionRef.current = null;
        setListDrag(null);
        if (!ld) return;
        const base = navItemsRef.current;
        const next = finalizeReorder(base, ld.fromIndex, ld.hoverBefore);
        const oldKeys = base.map((i) => i.orderKey);
        const newKeys = next.map((i) => i.orderKey);
        if (JSON.stringify(oldKeys) !== JSON.stringify(newKeys)) {
          schedulePersistOrder(newKeys);
        }
        setNavItems(next);
      };

      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [canReorderSidebar, navLabelsVisible, schedulePersistOrder],
  );

  const handleResetSidebarOrder = async () => {
    try {
      await api.put('/business/sidebar-order', { order: [] });
      await refreshUser();
    } catch {
      /* ignore */
    }
  };

  const disabledPremiumModules = useMemo(() => {
    if (!business || role === 'super_admin' || role === 'staff') return [];
    if (!Array.isArray(enabledModules)) return [];
    return getDisabledPremiumModules(enabledModules);
  }, [business, role, enabledModules]);

  const [premiumOpen, setPremiumOpen] = useState(() => {
    try {
      return localStorage.getItem(PREMIUM_LS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREMIUM_LS_KEY, premiumOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [premiumOpen]);

  const [premiumLocked, setPremiumLocked] = useState(null);

  const lastSessionRefreshRef = useRef(0);
  useEffect(() => {
    const refreshSessionIfVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastSessionRefreshRef.current < 4000) return;
      lastSessionRefreshRef.current = now;
      refreshUser();
    };
    window.addEventListener('focus', refreshSessionIfVisible);
    document.addEventListener('visibilitychange', refreshSessionIfVisible);
    return () => {
      window.removeEventListener('focus', refreshSessionIfVisible);
      document.removeEventListener('visibilitychange', refreshSessionIfVisible);
    };
  }, [refreshUser]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications?limit=10');
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      } catch (e) {
        /* ignore */
      }
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
      setNotifications((n) => n.map((x) => ({ ...x, is_read: true })));
    } catch (e) {
      /* ignore */
    }
  };

  const NavIcon = rawNav.icon;

  const displayFirstName = (user?.first_name || user?.email || 'User').trim();
  const userInitial = (displayFirstName.charAt(0) || '?').toUpperCase();
  const businessNameSameAsUser =
    business &&
    String(business.name || '')
      .trim()
      .toLowerCase() === displayFirstName.toLowerCase();

  const draggedSourcePath = listDrag ? navItems[listDrag.fromIndex]?.path : null;

  const renderNavRow = (item, sourceIndex) => {
    const isPlaceholder = Boolean(listDrag && draggedSourcePath === item.path);
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    const innerPad = navLabelsVisible
      ? 'min-w-0 flex-1 gap-3 py-2.5 pl-3 pr-2 text-left'
      : 'min-w-0 flex-1 justify-center px-0 py-2.5 min-h-[44px]';
    const rowClass = `flex items-center rounded-xl text-sm font-medium transition-all duration-200 ease-out ${innerPad} ${
      isActive
        ? 'bg-gradient-to-r from-[#D4AF37]/15 to-transparent text-gold-400 border-l-2 border-gold-500'
        : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border-l-2 border-transparent'
    } ${item.trialLocked ? 'opacity-70 cursor-pointer' : ''}`;

    if (isPlaceholder) {
      return (
        <div
          key={item.path}
          data-nav-row
          className="flex min-h-[44px] w-full items-stretch rounded-xl border border-dashed border-gold-500/25 bg-white/[0.03] opacity-80"
          aria-hidden
        />
      );
    }

    const labelEl = (
      <span
        className={`min-w-0 flex-1 truncate text-left transition-[opacity,max-width] duration-200 ease-out ${
          navLabelsVisible ? 'max-w-[200px] opacity-100' : 'pointer-events-none max-w-0 overflow-hidden opacity-0'
        }`}
      >
        {item.label}
      </span>
    );

    const inner = item.trialLocked ? (
      <button
        type="button"
        className={rowClass}
        onClick={() => {
          setSidebarOpen(false);
          setTrialOpen(true);
        }}
      >
        <Icon size={18} className={`shrink-0 ${isActive ? 'text-gold-400' : 'text-gray-500'}`} />
        {navLabelsVisible ? (
          <>
            {labelEl}
            <Lock size={15} className="shrink-0 text-amber-400/90" />
          </>
        ) : null}
        {!navLabelsVisible ? <span className="sr-only">{item.label}</span> : null}
      </button>
    ) : (
      <Link to={item.path} onClick={() => setSidebarOpen(false)} className={rowClass}>
        <Icon size={18} className={`shrink-0 ${isActive ? 'text-gold-400' : 'text-gray-400'}`} />
        {navLabelsVisible ? labelEl : null}
        {!navLabelsVisible ? <span className="sr-only">{item.label}</span> : null}
      </Link>
    );

    const showDrag = canReorderSidebar && navLabelsVisible;

    return (
      <div key={item.path} data-nav-row className="group/nav-row flex w-full min-w-0 items-stretch rounded-xl">
        {inner}
        {showDrag ? (
          <button
            type="button"
            className="sidebar-drag-handle flex w-7 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-lg text-[10px] leading-none tracking-tighter text-gray-500 opacity-0 transition-opacity duration-150 hover:text-gold-400 active:cursor-grabbing group-hover/nav-row:opacity-100"
            onPointerDown={(e) => onReorderHandlePointerDown(e, sourceIndex)}
            aria-label="Drag to reorder"
          >
            ⋮⋮
          </button>
        ) : null}
      </div>
    );
  };

  const dragGhostItem = listDrag ? navItems[listDrag.fromIndex] : null;
  const DragGhostIcon = dragGhostItem?.icon;

  return (
    <div className="min-h-screen bg-obsidian flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        onMouseEnter={() => isLg && setSidebarRailHover(true)}
        onMouseLeave={() => isLg && setSidebarRailHover(false)}
        className={`fixed lg:sticky top-0 left-0 z-50 flex h-screen flex-col overflow-hidden border-r border-white/5 bg-void transition-[transform,width] duration-200 ease-out max-lg:w-64 ${
          sidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'
        } lg:translate-x-0 ${isLg && navLabelsVisible ? 'lg:w-60' : 'lg:w-16'}`}
      >
        <div
          className={`relative flex h-14 shrink-0 items-center border-b border-white/5 lg:h-16 ${
            collapsedDesktopRail ? 'justify-center px-0' : 'gap-1 px-2.5 pr-2 lg:pl-4 lg:pr-2'
          }`}
        >
          {collapsedDesktopRail ? (
            <>
              {/* True center of rail (matches footer avatar); pin sits in narrow right strip only */}
              <Link
                to="/"
                className="absolute left-1/2 top-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center py-2"
                aria-label="NexaERP home"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-gold">
                  <span className="font-sans text-sm font-bold text-black">N</span>
                </div>
              </Link>
              <button
                type="button"
                className="absolute right-0 top-1/2 z-[2] flex h-9 w-4 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gold-400"
                aria-label={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                onClick={() => setSidebarPinned((p) => !p)}
              >
                {sidebarPinned ? <ChevronLeft size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/"
                className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden pl-2 lg:pl-2.5"
                aria-label="NexaERP home"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-gold">
                  <span className="font-sans text-sm font-bold text-black">N</span>
                </div>
                {navLabelsVisible ? (
                  <span className="font-display whitespace-nowrap text-lg tracking-tight text-white">NexaERP</span>
                ) : null}
              </Link>
              <button
                type="button"
                className="hidden shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gold-400 lg:flex"
                aria-label={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                onClick={() => setSidebarPinned((p) => !p)}
              >
                {sidebarPinned ? <ChevronLeft size={18} strokeWidth={2} /> : <ChevronRight size={18} strokeWidth={2} />}
              </button>
              <button type="button" className="p-1.5 text-gray-400 hover:text-white lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </>
          )}
        </div>

        <div className={`shrink-0 border-b border-white/5 py-2 ${navLabelsVisible ? 'px-3' : 'px-2'}`}>
          <div
            className={`flex items-center rounded-lg bg-white/[0.03] ${navLabelsVisible ? 'gap-2 px-3 py-1.5' : 'justify-center px-2 py-2'}`}
          >
            <NavIcon size={navLabelsVisible ? 14 : 18} className="shrink-0 text-gold-400" />
            {navLabelsVisible ? (
              <span className="max-w-[200px] text-xs font-semibold uppercase tracking-wider text-gray-400">{rawNav.title}</span>
            ) : null}
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            ref={navScrollRef}
            className={`min-h-0 flex-1 space-y-1 overflow-y-auto py-4 transition-[padding] duration-200 ease-out ${navLabelsVisible ? 'px-3' : 'px-2'}`}
          >
            {previewNavItems.map((item) => {
              const sourceIndex = navItems.findIndex((x) => x.path === item.path);
              return renderNavRow(item, sourceIndex);
            })}

            {disabledPremiumModules.length > 0 ? (
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="border-b border-white/10 py-2">
                  <button
                    type="button"
                    onClick={() => setPremiumOpen((o) => !o)}
                    className={`flex w-full items-center gap-2 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:text-gold-400 light-theme:text-slate-600 ${
                      navLabelsVisible ? 'px-1' : 'justify-center px-0'
                    }`}
                    aria-label="Premium features"
                  >
                    {navLabelsVisible ? (
                      <>
                        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate pr-2 text-left">
                          <span className="shrink-0" aria-hidden>
                            ✨
                          </span>
                          <span className="truncate">Premium Features</span>
                        </span>
                        <span className="shrink-0 pl-1 pr-0.5 text-base font-light leading-none text-gold-500/95 light-theme:text-amber-600">
                          {premiumOpen ? '∨' : '›'}
                        </span>
                      </>
                    ) : (
                      <span className="flex items-center justify-center gap-3 px-1" aria-hidden>
                        <span className="text-lg leading-none">⭐</span>
                        <span className="text-sm font-light leading-none text-gold-500/90">{premiumOpen ? '∨' : '›'}</span>
                      </span>
                    )}
                  </button>
                </div>
                {premiumOpen && navLabelsVisible ? (
                  <div className="space-y-0.5 pb-2 pt-1">
                    {disabledPremiumModules.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSidebarOpen(false);
                          setPremiumLocked({ id: m.id, label: m.label });
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-400 hover:bg-white/[0.04] hover:text-white light-theme:text-slate-600"
                      >
                        <span className="shrink-0 text-base" aria-hidden>
                          {m.icon}
                        </span>
                        <span className="flex-1">{m.label}</span>
                        <span className="shrink-0 text-xs text-gold-500">⭐</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarOpen(false);
                        navigate('/trial-upgrade');
                      }}
                      className="mx-2 mt-2 w-full text-left text-xs font-semibold text-gold-400 hover:text-gold-300"
                    >
                      Upgrade Plan →
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {canReorderSidebar && navLabelsVisible ? (
              <div className="px-1 pb-4 pt-3">
                <button
                  type="button"
                  onClick={handleResetSidebarOrder}
                  className="text-[11px] text-gray-500 transition-colors hover:text-gold-400 light-theme:text-slate-500"
                >
                  Reset to default order
                </button>
              </div>
            ) : null}
          </div>
        </nav>

        {listDrag &&
          dragGhostItem &&
          DragGhostIcon &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="sidebar-drag-ghost pointer-events-none fixed z-[100] flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium shadow-2xl backdrop-blur-md"
              style={{
                left: listDrag.ghostX - listDrag.grabOffsetX,
                top: listDrag.ghostY - listDrag.grabOffsetY,
                width: listDrag.width,
                boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
              }}
            >
              <DragGhostIcon size={18} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{dragGhostItem.label}</span>
              <span className="shrink-0 select-none text-[10px] opacity-70">⋮⋮</span>
            </div>,
            document.body,
          )}

        <Dialog open={trialOpen} onOpenChange={setTrialOpen}>
          <DialogContent className="sm:max-w-md border-white/10 bg-void">
            <DialogHeader>
              <DialogTitle className="text-white">Trial limit</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-400 leading-relaxed">{TRIAL_UPGRADE_MESSAGE}</p>
          </DialogContent>
        </Dialog>

        <Dialog open={!!premiumLocked} onOpenChange={(open) => !open && setPremiumLocked(null)}>
          <DialogContent className="sm:max-w-md border-gold-500/25 bg-void light-theme:bg-white light-theme:border-amber-400/30">
            <DialogHeader>
              <DialogTitle className="text-gold-400 light-theme:text-amber-700 flex items-center gap-2 text-base">
                <span className="text-lg" aria-hidden>
                  ⭐
                </span>
                Premium Feature
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-gray-400 light-theme:text-slate-600 leading-relaxed space-y-3">
              <p>
                <span className="text-white light-theme:text-slate-900 font-medium">{premiumLocked?.label}</span> is not included in your
                current plan.
              </p>
              <p>Contact your administrator to upgrade and unlock this feature.</p>
            </div>
            <DialogFooter className="gap-2 sm:justify-end flex-col sm:flex-row pt-2">
              <a
                href="mailto:admin@nexaerp.in"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#b8922e] px-4 py-2 text-sm font-semibold text-black hover:opacity-95"
              >
                Contact Admin
              </a>
              <button
                type="button"
                onClick={() => setPremiumLocked(null)}
                className="inline-flex items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.06] light-theme:border-slate-300 light-theme:text-slate-700"
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {user && (
          <div className={`relative shrink-0 border-t border-white/5 ${navLabelsVisible ? 'px-3 py-3' : 'px-2 py-3'}`}>
            <button
              type="button"
              onClick={() => {
                setShowSidebarUserMenu((v) => !v);
                setShowUserMenu(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl py-1 transition-colors hover:bg-white/[0.04] ${navLabelsVisible ? 'justify-start pl-0.5 pr-1' : 'justify-center'}`}
              aria-expanded={showSidebarUserMenu}
              aria-haspopup="menu"
              aria-label={`Account, ${displayFirstName}`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d4a017] text-sm font-bold text-black">
                {userInitial}
              </div>
              {navLabelsVisible ? (
                <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-white">
                  {displayFirstName}
                </span>
              ) : null}
            </button>
            {showSidebarUserMenu ? (
              <div className="absolute bottom-full left-2 right-2 z-[60] mb-1 overflow-hidden rounded-xl border border-white/10 bg-void py-1 shadow-elevated light-theme:border-slate-200 light-theme:bg-white">
                <div className="border-b border-white/5 px-3 py-2 light-theme:border-slate-100">
                  <p className="truncate text-sm font-medium text-white light-theme:text-slate-900">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSidebarUserMenu(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-400 hover:bg-white/[0.04] hover:text-rose-400 light-theme:hover:bg-slate-50"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        )}

        {business && navLabelsVisible ? (
          <div className="shrink-0 border-t border-white/5 px-4 py-3">
            <div className="px-2 text-left">
              {!businessNameSameAsUser ? (
                <p className="truncate text-xs text-gray-500 light-theme:text-slate-600">{business.name}</p>
              ) : null}
              <div className={`flex flex-wrap items-center gap-2 ${businessNameSameAsUser ? '' : 'mt-1'}`}>
                <span
                  className={`badge-premium px-2 py-0.5 text-[10px] ${
                    business.status === 'active'
                      ? 'badge-success'
                      : business.status === 'trial'
                        ? 'badge-warning'
                        : 'badge-danger'
                  }`}
                >
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
        ) : null}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
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

        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 shrink-0 bg-void/50 backdrop-blur-sm sticky top-0 z-30">
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifs(!showNotifs);
                  setShowUserMenu(false);
                  setShowSidebarUserMenu(false);
                }}
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
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] ${
                            !n.is_read ? 'bg-gold/[0.02]' : ''
                          }`}
                        >
                          <p className="text-sm text-white">{n.title}</p>
                          {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifs(false);
                  setShowSidebarUserMenu(false);
                }}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="w-7 h-7 bg-gradient-gold rounded-full flex items-center justify-center text-black text-xs font-bold">
                  {user?.first_name?.[0]}
                  {user?.last_name?.[0]}
                </div>
                <span className="text-sm text-gray-300 hidden sm:inline">{user?.first_name}</span>
                <ChevronDown size={14} className="text-gray-500" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-12 w-56 glass-card rounded-xl shadow-elevated z-50 overflow-hidden py-1">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm text-white font-medium">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <span className="badge-premium badge-gold text-[10px] mt-1 inline-block">{role.replace('_', ' ')}</span>
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

        <main
          className="flex-1 p-4 lg:p-6 overflow-auto"
          onClick={() => {
            setShowNotifs(false);
            setShowUserMenu(false);
            setShowSidebarUserMenu(false);
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
