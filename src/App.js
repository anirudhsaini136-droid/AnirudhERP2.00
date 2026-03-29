import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PublicInvoicePage from './pages/finance/PublicInvoicePage';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import BusinessesPage from './pages/super-admin/BusinessesPage';
import BusinessDetailPage from './pages/super-admin/BusinessDetailPage';
import PlatformSettingsPage from './pages/super-admin/PlatformSettingsPage';
import BusinessDashboard from './pages/business/BusinessDashboard';
import UserManagement from './pages/business/UserManagement';
import BusinessSettings from './pages/business/BusinessSettings';
import HRDashboard from './pages/hr/HRDashboard';
import EmployeesPage from './pages/hr/EmployeesPage';
import AttendancePage from './pages/hr/AttendancePage';
import LeavePage from './pages/hr/LeavePage';
import PayrollPage from './pages/hr/PayrollPage';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import InvoicesPage from './pages/finance/InvoicesPage';
import InvoiceViewPage from './pages/finance/InvoiceViewPage';
import ExpensesPage from './pages/finance/ExpensesPage';
import ReportsPage from './pages/finance/ReportsPage';
import GSTReportsPage from './pages/finance/GSTReportsPage';
import PurchasesPage from './pages/purchases/PurchasesPage';
import CAPortalPage from './pages/ca/CAPortalPage';
import AccountingPage from './pages/finance/AccountingPage';
import CustomersLedgerPage from './pages/finance/CustomersLedgerPage';
import CustomerLedgerDetailPage from './pages/finance/CustomerLedgerDetailPage';
import DataMigrationPage from './pages/finance/DataMigrationPage';
import RecurringInvoicesPage from './pages/finance/RecurringInvoicesPage';
import EwayBillsPage from './pages/finance/EwayBillsPage';
import InventoryPage from './pages/inventory/InventoryPage';
import BillingPage from './pages/inventory/BillingPage';
import StaffHome from './pages/staff/StaffHome';
import StaffAttendance from './pages/staff/StaffAttendance';
import StaffLeave from './pages/staff/StaffLeave';
import StaffPayslips from './pages/staff/StaffPayslips';
import StaffProfile from './pages/staff/StaffProfile';
import { parseEnabledModules, effectiveModuleEnabled } from './shared-core/modules';

const ROLE_HOMES = {
  super_admin: '/super-admin',
  business_owner: '/dashboard',
  hr_admin: '/hr',
  finance_admin: '/finance',
  inventory_admin: '/inventory',
  ca_admin: '/ca',
  staff: '/staff',
};

const Spinner = () => (
  <div className="min-h-screen bg-obsidian flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function RequireAuth({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOMES[user.role] || '/login'} replace />;
  }
  return children;
}

/** All listed modules must be enabled on the business (same rules as DashboardLayout). */
function RequireModule({ children, modules }) {
  const { user, business, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user?.role === 'super_admin') return children;
  const enabled = parseEnabledModules(business);
  if (enabled === null) return children;
  const required = Array.isArray(modules) ? modules : [modules];
  if (enabled.length === 0) {
    return <Navigate to={ROLE_HOMES[user?.role] || '/dashboard'} replace />;
  }
  const ok = required.every((m) => effectiveModuleEnabled(enabled, m));
  if (!ok) {
    return <Navigate to={ROLE_HOMES[user?.role] || '/dashboard'} replace />;
  }
  return children;
}

function RedirectAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to={ROLE_HOMES[user.role] || '/dashboard'} replace />;
  return children || <LoginPage />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC - No auth required */}
      <Route path="/login" element={<RedirectAuth />} />
      <Route path="/signup" element={<RedirectAuth><SignupPage /></RedirectAuth>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/invoice/:id" element={<PublicInvoicePage />} />

      {/* Super Admin */}
      <Route path="/super-admin" element={<RequireAuth allowedRoles={['super_admin']}><SuperAdminDashboard /></RequireAuth>} />
      <Route path="/super-admin/businesses" element={<RequireAuth allowedRoles={['super_admin']}><BusinessesPage /></RequireAuth>} />
      <Route path="/super-admin/businesses/:id" element={<RequireAuth allowedRoles={['super_admin']}><BusinessDetailPage /></RequireAuth>} />
      <Route path="/super-admin/settings" element={<RequireAuth allowedRoles={['super_admin']}><PlatformSettingsPage /></RequireAuth>} />

      {/* Business Owner */}
      <Route path="/dashboard" element={<RequireAuth allowedRoles={['business_owner']}><BusinessDashboard /></RequireAuth>} />
      <Route path="/dashboard/users" element={<RequireAuth allowedRoles={['business_owner']}><UserManagement /></RequireAuth>} />
      <Route path="/dashboard/settings" element={<RequireAuth allowedRoles={['business_owner']}><BusinessSettings /></RequireAuth>} />

      {/* HR */}
      <Route path="/hr" element={<RequireAuth allowedRoles={['hr_admin', 'business_owner']}><HRDashboard /></RequireAuth>} />
      <Route path="/hr/employees" element={<RequireAuth allowedRoles={['hr_admin', 'business_owner']}><EmployeesPage /></RequireAuth>} />
      <Route path="/hr/attendance" element={<RequireAuth allowedRoles={['hr_admin', 'business_owner']}><AttendancePage /></RequireAuth>} />
      <Route path="/hr/leave" element={<RequireAuth allowedRoles={['hr_admin', 'business_owner']}><LeavePage /></RequireAuth>} />
      <Route path="/hr/payroll" element={<RequireAuth allowedRoles={['hr_admin', 'business_owner']}><PayrollPage /></RequireAuth>} />

      {/* Finance */}
      <Route path="/finance" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner', 'ca_admin']}><FinanceDashboard /></RequireAuth>} />
      <Route path="/finance/invoices" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner', 'ca_admin']}><InvoicesPage /></RequireAuth>} />
      <Route path="/finance/invoices/:id" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner', 'ca_admin']}><RequireModule modules={['invoices_finance']}><InvoiceViewPage /></RequireModule></RequireAuth>} />
      <Route path="/finance/expenses" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner']}><ExpensesPage /></RequireAuth>} />
      <Route path="/finance/reports" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner']}><ReportsPage /></RequireAuth>} />
      <Route path="/finance/gst" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner', 'ca_admin']}><GSTReportsPage /></RequireAuth>} />
      <Route path="/purchases" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner', 'inventory_admin', 'ca_admin']}><PurchasesPage /></RequireAuth>} />
      <Route path="/ca" element={<RequireAuth allowedRoles={['ca_admin', 'business_owner', 'finance_admin']}><CAPortalPage /></RequireAuth>} />
      <Route path="/accounting" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner', 'ca_admin']}><AccountingPage /></RequireAuth>} />
      <Route path="/finance/customers" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner']}><CustomersLedgerPage /></RequireAuth>} />
      <Route path="/finance/customers/:clientName" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner']}><CustomerLedgerDetailPage /></RequireAuth>} />
      <Route path="/finance/migration" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner']}><DataMigrationPage /></RequireAuth>} />
      <Route path="/finance/recurring-invoices" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner']}><RequireModule modules={['recurring_invoices']}><RecurringInvoicesPage /></RequireModule></RequireAuth>} />
      <Route path="/finance/eway-bills" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner']}><RequireModule modules={['eway_bill']}><EwayBillsPage /></RequireModule></RequireAuth>} />

      {/* Inventory */}
      <Route path="/inventory" element={<RequireAuth allowedRoles={['inventory_admin', 'business_owner']}><InventoryPage /></RequireAuth>} />
      <Route path="/inventory/billing" element={<RequireAuth allowedRoles={['inventory_admin', 'business_owner']}><BillingPage /></RequireAuth>} />

      {/* Staff */}
      <Route path="/staff" element={<RequireAuth allowedRoles={['staff']}><StaffHome /></RequireAuth>} />
      <Route path="/staff/attendance" element={<RequireAuth allowedRoles={['staff']}><StaffAttendance /></RequireAuth>} />
      <Route path="/staff/leave" element={<RequireAuth allowedRoles={['staff']}><StaffLeave /></RequireAuth>} />
      <Route path="/staff/payslips" element={<RequireAuth allowedRoles={['staff']}><StaffPayslips /></RequireAuth>} />
      <Route path="/staff/profile" element={<RequireAuth allowedRoles={['staff']}><StaffProfile /></RequireAuth>} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
