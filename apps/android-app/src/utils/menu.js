/** Native launcher tiles; navigation target must be a screen name in AppNavigator. */

import { shouldApplyTrialModuleLock, TRIAL_UNLOCKED_SCREENS } from "./trialAccess";

function annotateTrial(items, role, business) {
  const trialLock = shouldApplyTrialModuleLock(business, role);
  return items.map((it) => ({
    ...it,
    trialLocked: trialLock && !TRIAL_UNLOCKED_SCREENS.has(it.screen),
  }));
}

export function getLauncherItems(role, business) {
  const r = role || "staff";
  if (r === "super_admin") {
    return annotateTrial(
      [
        { key: "superAdminDash", label: "Platform dashboard", screen: "SuperAdminDashboard", icon: "shield" },
        { key: "businesses", label: "Businesses", screen: "SuperAdminBusinesses", icon: "building" },
        { key: "profile", label: "Profile & logout", screen: "Profile", icon: "user" },
      ],
      r,
      business,
    );
  }
  if (r === "staff") {
    return annotateTrial(
      [
        { key: "staff", label: "Staff home", screen: "StaffHome", icon: "briefcase" },
        { key: "profile", label: "Profile & logout", screen: "Profile", icon: "user" },
      ],
      r,
      business,
    );
  }

  const items = [{ key: "profile", label: "Profile & logout", screen: "Profile", icon: "user" }];

  if (r === "business_owner") {
    return annotateTrial(
      [
        { key: "biz", label: "Business overview", screen: "BusinessDashboard", icon: "home" },
        { key: "finance", label: "Finance dashboard", screen: "FinanceDashboard", icon: "chart" },
        { key: "invoices", label: "Invoices", screen: "Invoices", icon: "file" },
        { key: "customers", label: "Customer ledger", screen: "Customers", icon: "users" },
        { key: "gst", label: "GST reports", screen: "Gst", icon: "tax" },
        { key: "expenses", label: "Expenses", screen: "Expenses", icon: "receipt" },
        { key: "inventory", label: "Inventory", screen: "InventoryDashboard", icon: "box" },
        { key: "products", label: "Products", screen: "Products", icon: "package" },
        { key: "purchases", label: "Purchases", screen: "Purchases", icon: "cart" },
        { key: "hr", label: "HR dashboard", screen: "HrDashboard", icon: "team" },
        { key: "employees", label: "Employees", screen: "Employees", icon: "users" },
        { key: "accounting", label: "Accounting", screen: "Accounting", icon: "book" },
        ...items,
      ],
      r,
      business,
    );
  }
  if (r === "hr_admin") {
    return annotateTrial(
      [
        { key: "hr", label: "HR dashboard", screen: "HrDashboard", icon: "team" },
        { key: "employees", label: "Employees", screen: "Employees", icon: "users" },
        ...items,
      ],
      r,
      business,
    );
  }
  if (r === "finance_admin") {
    return annotateTrial(
      [
        { key: "finance", label: "Finance dashboard", screen: "FinanceDashboard", icon: "chart" },
        { key: "invoices", label: "Invoices", screen: "Invoices", icon: "file" },
        { key: "customers", label: "Customer ledger", screen: "Customers", icon: "users" },
        { key: "gst", label: "GST reports", screen: "Gst", icon: "tax" },
        { key: "expenses", label: "Expenses", screen: "Expenses", icon: "receipt" },
        { key: "purchases", label: "Purchases", screen: "Purchases", icon: "cart" },
        { key: "accounting", label: "Accounting", screen: "Accounting", icon: "book" },
        ...items,
      ],
      r,
      business,
    );
  }
  if (r === "inventory_admin") {
    return annotateTrial(
      [
        { key: "inventory", label: "Inventory", screen: "InventoryDashboard", icon: "box" },
        { key: "products", label: "Products", screen: "Products", icon: "package" },
        { key: "purchases", label: "Purchases", screen: "Purchases", icon: "cart" },
        ...items,
      ],
      r,
      business,
    );
  }
  if (r === "ca_admin") {
    return annotateTrial(
      [
        { key: "gst", label: "GST reports", screen: "Gst", icon: "tax" },
        { key: "invoices", label: "Invoices", screen: "Invoices", icon: "file" },
        { key: "purchases", label: "Purchases", screen: "Purchases", icon: "cart" },
        { key: "accounting", label: "Accounting", screen: "Accounting", icon: "book" },
        ...items,
      ],
      r,
      business,
    );
  }
  return annotateTrial(items, r, business);
}
