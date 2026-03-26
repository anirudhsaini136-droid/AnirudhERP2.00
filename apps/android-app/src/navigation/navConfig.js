/**
 * Mirrors web DashboardLayout.js — path, label, screen (React Navigation), optional NEW badge.
 */

export const MODULE_NAV_MAP = {
  manage_users: ["/dashboard/users"],
  hr_payroll: ["/hr", "/hr/employees", "/hr/attendance", "/hr/leave", "/hr/payroll"],
  invoices_finance: ["/finance", "/finance/invoices", "/finance/invoices/:id", "/finance/reports", "/finance/migration"],
  inventory_billing: ["/inventory", "/inventory/billing"],
  purchases_itc: ["/purchases"],
  gst_reports: ["/finance/gst", "/ca"],
  accounting: ["/accounting"],
  customer_ledger: ["/finance/customers", "/finance/customers/:id"],
  expenses: ["/finance/expenses"],
  ca_portal: ["/ca"],
};

const RAW_NAV_CONFIG = {
  super_admin: {
    title: "Super Admin",
    items: [
      { path: "/super-admin", label: "Dashboard", screen: "SuperAdminDashboard" },
      { path: "/super-admin/businesses", label: "Businesses", screen: "SuperAdminBusinesses" },
      { path: "/super-admin/settings", label: "Platform Settings", screen: "PlatformSettings" },
    ],
  },
  business_owner: {
    title: "Business",
    items: [
      { path: "/dashboard", label: "Dashboard", screen: "BusinessDashboard" },
      { path: "/dashboard/users", label: "Manage Users", screen: "UserManagement" },
      { path: "/hr", label: "HR Dashboard", screen: "HrDashboard" },
      { path: "/hr/employees", label: "Employees", screen: "Employees" },
      { path: "/hr/attendance", label: "Attendance", screen: "HrAttendance" },
      { path: "/hr/leave", label: "Leave", screen: "HrLeave" },
      { path: "/hr/payroll", label: "Payroll", screen: "HrPayroll" },
      { path: "/finance", label: "Finance Dashboard", screen: "FinanceDashboard" },
      { path: "/finance/invoices", label: "Invoices", screen: "Invoices" },
      { path: "/finance/customers", label: "Customer Ledger", screen: "Customers" },
      { path: "/finance/migration", label: "Import data", screen: "DataMigration" },
      { path: "/finance/expenses", label: "Expenses", screen: "Expenses" },
      { path: "/finance/reports", label: "Reports", screen: "FinanceReports" },
      { path: "/finance/gst", label: "GST Reports", screen: "Gst", newBadge: true },
      { path: "/accounting", label: "Accounting", screen: "Accounting" },
      { path: "/purchases", label: "Purchases", screen: "Purchases", newBadge: true },
      { path: "/inventory", label: "Inventory", screen: "InventoryDashboard" },
      { path: "/inventory/billing", label: "Quick Bill", screen: "QuickBill" },
      { path: "/dashboard/settings", label: "Settings", screen: "BusinessSettings" },
    ],
  },
  hr_admin: {
    title: "HR Management",
    items: [
      { path: "/hr", label: "Dashboard", screen: "HrDashboard" },
      { path: "/hr/employees", label: "Employees", screen: "Employees" },
      { path: "/hr/attendance", label: "Attendance", screen: "HrAttendance" },
      { path: "/hr/leave", label: "Leave Mgmt", screen: "HrLeave" },
      { path: "/hr/payroll", label: "Payroll", screen: "HrPayroll" },
      { path: "/dashboard/settings", label: "Settings", screen: "BusinessSettings" },
    ],
  },
  finance_admin: {
    title: "Finance",
    items: [
      { path: "/finance", label: "Dashboard", screen: "FinanceDashboard" },
      { path: "/finance/invoices", label: "Invoices", screen: "Invoices" },
      { path: "/finance/customers", label: "Customer Ledger", screen: "Customers" },
      { path: "/finance/migration", label: "Import data", screen: "DataMigration" },
      { path: "/finance/expenses", label: "Expenses", screen: "Expenses" },
      { path: "/finance/reports", label: "Reports", screen: "FinanceReports" },
      { path: "/finance/gst", label: "GST Reports", screen: "Gst", newBadge: true },
      { path: "/accounting", label: "Accounting", screen: "Accounting" },
      { path: "/purchases", label: "Purchases", screen: "Purchases", newBadge: true },
      { path: "/dashboard/settings", label: "Settings", screen: "BusinessSettings" },
    ],
  },
  ca_admin: {
    title: "CA Portal",
    items: [
      { path: "/ca", label: "GST Reports", screen: "CaPortal" },
      { path: "/finance/invoices", label: "Invoices", screen: "Invoices" },
      { path: "/purchases", label: "Purchases", screen: "Purchases", newBadge: true },
      { path: "/dashboard/settings", label: "Settings", screen: "BusinessSettings" },
    ],
  },
  inventory_admin: {
    title: "Inventory",
    items: [
      { path: "/inventory", label: "Products", screen: "InventoryDashboard" },
      { path: "/inventory/billing", label: "Quick Bill", screen: "QuickBill" },
      { path: "/dashboard/settings", label: "Settings", screen: "BusinessSettings" },
    ],
  },
  staff: {
    title: "Staff Portal",
    items: [
      { path: "/staff", label: "Home", screen: "StaffHome" },
      { path: "/staff/attendance", label: "My Attendance", screen: "StaffAttendance" },
      { path: "/staff/leave", label: "My Leave", screen: "StaffLeave" },
      { path: "/staff/payslips", label: "My Payslips", screen: "StaffPayslips" },
      { path: "/staff/profile", label: "My Profile", screen: "StaffProfile" },
    ],
  },
};

export const ROLE_INITIAL_SCREEN = {
  super_admin: "SuperAdminDashboard",
  business_owner: "BusinessDashboard",
  hr_admin: "HrDashboard",
  finance_admin: "FinanceDashboard",
  inventory_admin: "InventoryDashboard",
  ca_admin: "CaPortal",
  staff: "StaffHome",
};

export function parseEnabledModules(business) {
  try {
    return JSON.parse(business?.modules || "[]");
  } catch {
    return [];
  }
}

export function isPathAllowed(role, business, path) {
  if (role === "super_admin") return true;
  if (["/dashboard", "/dashboard/settings"].includes(path)) return true;
  if (business?.modules === undefined || business?.modules === null) return true;
  const enabled = parseEnabledModules(business);
  if (enabled.length === 0) return false;
  return enabled.some((mod) => (MODULE_NAV_MAP[mod] || []).includes(path));
}

export function getNavForUser(user, business) {
  const role = user?.role || "staff";
  const raw = RAW_NAV_CONFIG[role] || RAW_NAV_CONFIG.staff;
  const items = raw.items.filter((item) => isPathAllowed(role, business, item.path));
  return { title: raw.title, items };
}

export function screenTitleForRoute(name) {
  const map = {
    Login: "Sign in",
    BusinessDashboard: "Dashboard",
    UserManagement: "Manage Users",
    HrDashboard: "HR",
    Employees: "Employees",
    HrAttendance: "Attendance",
    HrLeave: "Leave",
    HrPayroll: "Payroll",
    FinanceDashboard: "Finance",
    Invoices: "Invoices",
    InvoiceCreate: "Create Invoice",
    InvoiceDetail: "Invoice",
    Customers: "Customer Ledger",
    CustomerLedger: "Ledger",
    DataMigration: "Import data",
    Expenses: "Expenses",
    FinanceReports: "Reports",
    Gst: "GST Reports",
    Accounting: "Accounting",
    Purchases: "Purchases",
    PurchaseDetail: "Purchase",
    InventoryDashboard: "Inventory",
    Products: "Products",
    QuickBill: "Quick Bill",
    BusinessSettings: "Settings",
    CaPortal: "CA Portal",
    StaffHome: "Staff",
    StaffAttendance: "My Attendance",
    StaffLeave: "My Leave",
    StaffPayslips: "My Payslips",
    StaffProfile: "My Profile",
    SuperAdminDashboard: "Super Admin",
    SuperAdminBusinesses: "Businesses",
    SuperAdminBusinessDetail: "Business",
    PlatformSettings: "Platform Settings",
    Profile: "Account",
  };
  return map[name] || "NexusERP";
}
