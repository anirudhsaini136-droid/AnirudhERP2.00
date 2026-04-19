import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { parseEnabledModules, effectiveModuleEnabled } from './shared-core/modules';
import { shouldApplyTrialModuleLock, isTrialPathUnlocked, trialFallbackPathForRole } from './shared-core/trialAccess';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const PublicInvoicePage = lazy(() => import('./pages/finance/PublicInvoicePage'));
const PublicCustomerPayPage = lazy(() => import('./pages/finance/PublicCustomerPayPage'));
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/SuperAdminDashboard'));
const BusinessesPage = lazy(() => import('./pages/super-admin/BusinessesPage'));
const BusinessDetailPage = lazy(() => import('./pages/super-admin/BusinessDetailPage'));
const PlatformSettingsPage = lazy(() => import('./pages/super-admin/PlatformSettingsPage'));
const BusinessDashboard = lazy(() => import('./pages/business/BusinessDashboard'));
const TrialUpgradePage = lazy(() => import('./pages/business/TrialUpgradePage'));
const UserManagement = lazy(() => import('./pages/business/UserManagement'));
const BusinessSettings = lazy(() => import('./pages/business/BusinessSettings'));
const HRDashboard = lazy(() => import('./pages/hr/HRDashboard'));
const EmployeesPage = lazy(() => import('./pages/hr/EmployeesPage'));
const AttendancePage = lazy(() => import('./pages/hr/AttendancePage'));
const LeavePage = lazy(() => import('./pages/hr/LeavePage'));
const PayrollPage = lazy(() => import('./pages/hr/PayrollPage'));
const FinanceDashboard = lazy(() => import('./pages/finance/FinanceDashboard'));
const InvoicesPage = lazy(() => import('./pages/finance/InvoicesPage'));
const CreateInvoicePage = lazy(() => import('./pages/finance/CreateInvoicePage'));
const InvoiceViewPage = lazy(() => import('./pages/finance/InvoiceViewPage'));
const ExpensesPage = lazy(() => import('./pages/finance/ExpensesPage'));
const ReportsPage = lazy(() => import('./pages/finance/ReportsPage'));
const GSTReportsPage = lazy(() => import('./pages/finance/GSTReportsPage'));
const PurchasesPage = lazy(() => import('./pages/purchases/PurchasesPage'));
const CreatePurchaseBillPage = lazy(() => import('./pages/purchases/CreatePurchaseBillPage'));
const CAPortalPage = lazy(() => import('./pages/ca/CAPortalPage'));
const AccountingPage = lazy(() => import('./pages/finance/AccountingPage'));
const CustomersLedgerPage = lazy(() => import('./pages/finance/CustomersLedgerPage'));
const CustomerLedgerDetailPage = lazy(() => import('./pages/finance/CustomerLedgerDetailPage'));
const ChallansPage = lazy(() => import('./pages/finance/ChallansPage'));
const POSPage = lazy(() => import('./pages/finance/POSPage'));
const PdcChequesPage = lazy(() => import('./pages/finance/PdcChequesPage'));
const PriceListsPage = lazy(() => import('./pages/finance/PriceListsPage'));
const BankReconciliationPage = lazy(() => import('./pages/finance/BankReconciliationPage'));
const OrderManagementPage = lazy(() => import('./pages/finance/OrderManagementPage'));
const MisReportsPage = lazy(() => import('./pages/finance/MisReportsPage'));
const DataMigrationPage = lazy(() => import('./pages/finance/DataMigrationPage'));
const RecurringInvoicesPage = lazy(() => import('./pages/finance/RecurringInvoicesPage'));
const EwayBillsPage = lazy(() => import('./pages/finance/EwayBillsPage'));
const TallyExportPage = lazy(() => import('./pages/finance/TallyExportPage'));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const BillingPage = lazy(() => import('./pages/inventory/BillingPage'));
const ManufacturingPage = lazy(() => import('./pages/inventory/ManufacturingPage'));
const SalesmenPage = lazy(() => import('./pages/hr/SalesmenPage'));
const StaffHome = lazy(() => import('./pages/staff/StaffHome'));
const StaffAttendance = lazy(() => import('./pages/staff/StaffAttendance'));
const StaffLeave = lazy(() => import('./pages/staff/StaffLeave'));
const StaffPayslips = lazy(() => import('./pages/staff/StaffPayslips'));
const StaffProfile = lazy(() => import('./pages/staff/StaffProfile'));

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
    <Suspense fallback={<Spinner />}>
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
    </Suspense>
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
