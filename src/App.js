import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PublicInvoicePage from './pages/finance/PublicInvoicePage';
import PublicCustomerPayPage from './pages/finance/PublicCustomerPayPage';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import BusinessesPage from './pages/super-admin/BusinessesPage';
import BusinessDetailPage from './pages/super-admin/BusinessDetailPage';
import PlatformSettingsPage from './pages/super-admin/PlatformSettingsPage';
import BusinessDashboard from './pages/business/BusinessDashboard';
import TrialUpgradePage from './pages/business/TrialUpgradePage';
import UserManagement from './pages/business/UserManagement';
import BusinessSettings from './pages/business/BusinessSettings';
import HRDashboard from './pages/hr/HRDashboard';
import EmployeesPage from './pages/hr/EmployeesPage';
import AttendancePage from './pages/hr/AttendancePage';
import LeavePage from './pages/hr/LeavePage';
import PayrollPage from './pages/hr/PayrollPage';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import InvoicesPage from './pages/finance/InvoicesPage';
import CreateInvoicePage from './pages/finance/CreateInvoicePage';
import InvoiceViewPage from './pages/finance/InvoiceViewPage';
import ExpensesPage from './pages/finance/ExpensesPage';
import ReportsPage from './pages/finance/ReportsPage';
import GSTReportsPage from './pages/finance/GSTReportsPage';
import PurchasesPage from './pages/purchases/PurchasesPage';
import CreatePurchaseBillPage from './pages/purchases/CreatePurchaseBillPage';
import CAPortalPage from './pages/ca/CAPortalPage';
import AccountingPage from './pages/finance/AccountingPage';
import CustomersLedgerPage from './pages/finance/CustomersLedgerPage';
import CustomerLedgerDetailPage from './pages/finance/CustomerLedgerDetailPage';
import ChallansPage from './pages/finance/ChallansPage';
import POSPage from './pages/finance/POSPage';
import PdcChequesPage from './pages/finance/PdcChequesPage';
import PriceListsPage from './pages/finance/PriceListsPage';
import BankReconciliationPage from './pages/finance/BankReconciliationPage';
import OrderManagementPage from './pages/finance/OrderManagementPage';
import MisReportsPage from './pages/finance/MisReportsPage';
import DataMigrationPage from './pages/finance/DataMigrationPage';
import RecurringInvoicesPage from './pages/finance/RecurringInvoicesPage';
import EwayBillsPage from './pages/finance/EwayBillsPage';
import TallyExportPage from './pages/finance/TallyExportPage';
import InventoryPage from './pages/inventory/InventoryPage';
import BillingPage from './pages/inventory/BillingPage';
import SalesmenPage from './pages/hr/SalesmenPage';
import ManufacturingPage from './pages/inventory/ManufacturingPage';
import StaffHome from './pages/staff/StaffHome';
import StaffAttendance from './pages/staff/StaffAttendance';
import StaffLeave from './pages/staff/StaffLeave';
import StaffPayslips from './pages/staff/StaffPayslips';
import StaffProfile from './pages/staff/StaffProfile';
import { parseEnabledModules, effectiveModuleEnabled } from './shared-core/modules';
import { shouldApplyTrialModuleLock, isTrialPathUnlocked, trialFallbackPathForRole } from './shared-core/trialAccess';

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

function getPostLoginHome(user, business) {
  if (shouldApplyTrialModuleLock(business, user?.role)) {
    return trialFallbackPathForRole(user?.role);
  }
  return ROLE_HOMES[user?.role] || '/dashboard';
}

function RequireAuth({ children, allowedRoles }) {
  const { user, business, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getPostLoginHome(user, business)} replace />;
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
    return <Navigate to={getPostLoginHome(user, business)} replace />;
  }
  const ok = required.every((m) => effectiveModuleEnabled(enabled, m));
  if (!ok) {
    return <Navigate to={getPostLoginHome(user, business)} replace />;
  }
  return children;
}

/** At least one listed module must be enabled (e.g. CA portal vs GST reports toggle). */
function RequireModuleAny({ children, modules }) {
  const { user, business, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user?.role === 'super_admin') return children;
  const enabled = parseEnabledModules(business);
  if (enabled === null) return children;
  const required = Array.isArray(modules) ? modules : [modules];
  if (enabled.length === 0) {
    return <Navigate to={getPostLoginHome(user, business)} replace />;
  }
  const ok = required.some((m) => effectiveModuleEnabled(enabled, m));
  if (!ok) {
    return <Navigate to={getPostLoginHome(user, business)} replace />;
  }
  return children;
}

function RequireTrialRoute({ children }) {
  const location = useLocation();
  const { user, business, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user?.role === 'super_admin') return children;
  if (!shouldApplyTrialModuleLock(business, user?.role)) return children;
  if (isTrialPathUnlocked(location.pathname)) return children;
  return <Navigate to={trialFallbackPathForRole(user.role)} replace />;
}

function BizRoute({ children, allowedRoles, modules = null, modulesAny = false }) {
  const trialWrapped = <RequireTrialRoute>{children}</RequireTrialRoute>;
  const Mod = modulesAny ? RequireModuleAny : RequireModule;
  return (
    <RequireAuth allowedRoles={allowedRoles}>
      {modules ? <Mod modules={modules}>{trialWrapped}</Mod> : trialWrapped}
    </RequireAuth>
  );
}

function RedirectAuth({ children }) {
  const { user, business, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to={getPostLoginHome(user, business)} replace />;
  return children || <LoginPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectAuth />} />
      <Route path="/signup" element={<RedirectAuth><SignupPage /></RedirectAuth>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/invoice/:id" element={<PublicInvoicePage />} />
      <Route path="/pay/:token" element={<PublicCustomerPayPage />} />

      <Route path="/super-admin" element={<RequireAuth allowedRoles={['super_admin']}><SuperAdminDashboard /></RequireAuth>} />
      <Route path="/super-admin/businesses" element={<RequireAuth allowedRoles={['super_admin']}><BusinessesPage /></RequireAuth>} />
      <Route path="/super-admin/businesses/:id" element={<RequireAuth allowedRoles={['super_admin']}><BusinessDetailPage /></RequireAuth>} />
      <Route path="/super-admin/settings" element={<RequireAuth allowedRoles={['super_admin']}><PlatformSettingsPage /></RequireAuth>} />

      <Route
        path="/trial-upgrade"
        element={
          <RequireAuth allowedRoles={['business_owner', 'finance_admin', 'hr_admin', 'inventory_admin', 'ca_admin']}>
            <TrialUpgradePage />
          </RequireAuth>
        }
      />

      <Route path="/dashboard" element={<BizRoute allowedRoles={['business_owner']}><BusinessDashboard /></BizRoute>} />
      <Route path="/dashboard/users" element={<BizRoute allowedRoles={['business_owner']} modules={['manage_users']}><UserManagement /></BizRoute>} />
      <Route path="/dashboard/settings" element={<BizRoute allowedRoles={['business_owner']}><BusinessSettings /></BizRoute>} />

      <Route path="/hr" element={<BizRoute allowedRoles={['hr_admin', 'business_owner']} modules={['hr_payroll']}><HRDashboard /></BizRoute>} />
      <Route path="/hr/employees" element={<BizRoute allowedRoles={['hr_admin', 'business_owner']} modules={['hr_payroll']}><EmployeesPage /></BizRoute>} />
      <Route path="/hr/attendance" element={<BizRoute allowedRoles={['hr_admin', 'business_owner']} modules={['hr_payroll']}><AttendancePage /></BizRoute>} />
      <Route path="/hr/leave" element={<BizRoute allowedRoles={['hr_admin', 'business_owner']} modules={['hr_payroll']}><LeavePage /></BizRoute>} />
      <Route path="/hr/payroll" element={<BizRoute allowedRoles={['hr_admin', 'business_owner']} modules={['hr_payroll']}><PayrollPage /></BizRoute>} />
      <Route path="/hr/salesmen" element={<BizRoute allowedRoles={['hr_admin', 'business_owner']} modules={['salesman_management']}><SalesmenPage /></BizRoute>} />

      <Route path="/finance" element={<BizRoute allowedRoles={['finance_admin', 'business_owner', 'ca_admin']} modules={['invoices_finance']}><FinanceDashboard /></BizRoute>} />
      <Route path="/finance/invoices" element={<BizRoute allowedRoles={['finance_admin', 'business_owner', 'ca_admin']} modules={['invoices_finance']}><InvoicesPage /></BizRoute>} />
      <Route
        path="/finance/invoices/create"
        element={
          <BizRoute allowedRoles={['finance_admin', 'business_owner', 'ca_admin']} modules={['invoices_finance']}>
            <CreateInvoicePage />
          </BizRoute>
        }
      />
      <Route
        path="/finance/invoices/:id"
        element={
          <BizRoute allowedRoles={['finance_admin', 'business_owner', 'ca_admin']} modules={['invoices_finance']}>
            <InvoiceViewPage />
          </BizRoute>
        }
      />
      <Route path="/finance/expenses" element={<BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['expenses']}><ExpensesPage /></BizRoute>} />
      <Route path="/finance/reports" element={<BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['invoices_finance']}><ReportsPage /></BizRoute>} />
      <Route path="/finance/challans" element={<BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['challan']}><ChallansPage /></BizRoute>} />
      <Route path="/finance/pos" element={<BizRoute allowedRoles={['finance_admin', 'business_owner', 'inventory_admin']} modules={['pos_billing']}><POSPage /></BizRoute>} />
      <Route path="/finance/pdc-cheques" element={<BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['pdc_cheques']}><PdcChequesPage /></BizRoute>} />
      <Route path="/finance/price-lists" element={<BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['rate_management']}><PriceListsPage /></BizRoute>} />
      <Route path="/finance/bank-reconciliation" element={<BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['bank_reconciliation']}><BankReconciliationPage /></BizRoute>} />
      <Route path="/finance/orders" element={<BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['order_management']}><OrderManagementPage /></BizRoute>} />
      <Route path="/finance/mis-reports" element={<BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['mis_reports']}><MisReportsPage /></BizRoute>} />
      <Route path="/finance/gst" element={<BizRoute allowedRoles={['finance_admin', 'business_owner', 'ca_admin']} modules={['gst_reports']}><GSTReportsPage /></BizRoute>} />
      <Route
        path="/purchases"
        element={
          <BizRoute allowedRoles={['finance_admin', 'business_owner', 'inventory_admin', 'ca_admin']} modules={['purchases_itc']}>
            <PurchasesPage />
          </BizRoute>
        }
      />
      <Route
        path="/purchases/create"
        element={
          <BizRoute allowedRoles={['finance_admin', 'business_owner', 'inventory_admin']} modules={['purchases_itc']}>
            <CreatePurchaseBillPage />
          </BizRoute>
        }
      />
      <Route
        path="/ca"
        element={
          <BizRoute allowedRoles={['ca_admin', 'business_owner', 'finance_admin']} modules={['ca_portal']}>
            <CAPortalPage />
          </BizRoute>
        }
      />
      <Route path="/accounting" element={<BizRoute allowedRoles={['finance_admin', 'business_owner', 'ca_admin']} modules={['accounting']}><AccountingPage /></BizRoute>} />
      <Route path="/finance/customers" element={<BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['customer_ledger']}><CustomersLedgerPage /></BizRoute>} />
      <Route
        path="/finance/customers/:clientName"
        element={
          <BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['customer_ledger']}>
            <CustomerLedgerDetailPage />
          </BizRoute>
        }
      />
      <Route path="/finance/migration" element={<BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['invoices_finance']}><DataMigrationPage /></BizRoute>} />
      <Route
        path="/finance/recurring-invoices"
        element={
          <BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['recurring_invoices']}>
            <RecurringInvoicesPage />
          </BizRoute>
        }
      />
      <Route
        path="/finance/eway-bills"
        element={<BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['eway_bill']}><EwayBillsPage /></BizRoute>}
      />
      <Route
        path="/finance/tally-export"
        element={
          <BizRoute allowedRoles={['finance_admin', 'business_owner']} modules={['tally_export']}>
            <TallyExportPage />
          </BizRoute>
        }
      />

      <Route path="/inventory" element={<BizRoute allowedRoles={['inventory_admin', 'business_owner']} modules={['inventory_billing']}><InventoryPage /></BizRoute>} />
      <Route path="/inventory/billing" element={<BizRoute allowedRoles={['inventory_admin', 'business_owner']} modules={['inventory_billing']}><BillingPage /></BizRoute>} />
      <Route path="/manufacturing" element={<BizRoute allowedRoles={['inventory_admin', 'business_owner']} modules={['manufacturing']}><ManufacturingPage /></BizRoute>} />

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
          <Toaster richColors position="top-right" duration={3000} />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
