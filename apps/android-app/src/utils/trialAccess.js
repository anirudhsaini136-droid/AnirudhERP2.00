/** Must match web `src/shared-core/trialAccess.js` for product parity. */

export const TRIAL_UPGRADE_MESSAGE =
  "During your trial, only invoice creation, purchase creation, and stock adjustments are available. Please upgrade your plan to unlock all modules.";

const TRIAL_LOCKED_ROLES = new Set(["business_owner", "finance_admin", "hr_admin", "inventory_admin", "ca_admin"]);

export function isTrialRestrictedBusiness(business) {
  if (!business) return false;
  return Boolean(business.trial_restricted);
}

export function shouldApplyTrialModuleLock(business, role) {
  if (!business || !role || role === "super_admin" || role === "staff") return false;
  return isTrialRestrictedBusiness(business) && TRIAL_LOCKED_ROLES.has(role);
}

/** Screen names allowed while trial_restricted (see App.js stack). */
export const TRIAL_UNLOCKED_SCREENS = new Set([
  "Invoices",
  "InvoiceCreate",
  "InvoiceDetail",
  "Purchases",
  "PurchaseDetail",
  "InventoryDashboard",
  "Products",
  "QuickBill",
  "BusinessSettings",
  "TrialUpgrade",
  "Profile",
  "SuperAdminDashboard",
  "SuperAdminBusinesses",
  "SuperAdminBusinessDetail",
  "PlatformSettings",
  "StaffHome",
  "StaffAttendance",
  "StaffLeave",
  "StaffPayslips",
  "StaffProfile",
  "Login",
]);

const TRIAL_PATH_EXACT = new Set(["/dashboard/settings", "/trial-upgrade"]);
const TRIAL_PREFIXES = ["/finance/invoices", "/purchases", "/inventory"];

/** Mirrors web `isTrialPathUnlocked` using path strings from `navConfig`. */
export function isTrialPathUnlockedForPath(pathname) {
  if (!pathname) return false;
  if (TRIAL_PATH_EXACT.has(pathname)) return true;
  return TRIAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function getTrialAwareInitialScreen(role, business) {
  const base = {
    super_admin: "SuperAdminDashboard",
    business_owner: "BusinessDashboard",
    hr_admin: "HrDashboard",
    finance_admin: "FinanceDashboard",
    inventory_admin: "InventoryDashboard",
    ca_admin: "CaPortal",
    staff: "StaffHome",
  }[role || "staff"];

  if (!shouldApplyTrialModuleLock(business, role)) {
    return base || "StaffHome";
  }
  switch (role) {
    case "business_owner":
      return "Invoices";
    case "finance_admin":
      return "Invoices";
    case "inventory_admin":
      return "InventoryDashboard";
    case "ca_admin":
      return "Invoices";
    case "hr_admin":
      return "TrialUpgrade";
    default:
      return base || "StaffHome";
  }
}
