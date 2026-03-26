/** Native launcher tiles; navigation target must be a screen name in AppNavigator. */

export function getLauncherItems(role) {
  const r = role || "staff";
  if (r === "super_admin") {
    return [
      { key: "superAdminDash", label: "Platform dashboard", screen: "SuperAdminDashboard", icon: "shield" },
      { key: "businesses", label: "Businesses", screen: "SuperAdminBusinesses", icon: "building" },
      { key: "profile", label: "Profile & logout", screen: "Profile", icon: "user" },
    ];
  }
  if (r === "staff") {
    return [
      { key: "staff", label: "Staff home", screen: "StaffHome", icon: "briefcase" },
      { key: "profile", label: "Profile & logout", screen: "Profile", icon: "user" },
    ];
  }

  const items = [{ key: "profile", label: "Profile & logout", screen: "Profile", icon: "user" }];

  if (r === "business_owner") {
    return [
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
    ];
  }
  if (r === "hr_admin") {
    return [
      { key: "hr", label: "HR dashboard", screen: "HrDashboard", icon: "team" },
      { key: "employees", label: "Employees", screen: "Employees", icon: "users" },
      ...items,
    ];
  }
  if (r === "finance_admin") {
    return [
      { key: "finance", label: "Finance dashboard", screen: "FinanceDashboard", icon: "chart" },
      { key: "invoices", label: "Invoices", screen: "Invoices", icon: "file" },
      { key: "customers", label: "Customer ledger", screen: "Customers", icon: "users" },
      { key: "gst", label: "GST reports", screen: "Gst", icon: "tax" },
      { key: "expenses", label: "Expenses", screen: "Expenses", icon: "receipt" },
      { key: "purchases", label: "Purchases", screen: "Purchases", icon: "cart" },
      { key: "accounting", label: "Accounting", screen: "Accounting", icon: "book" },
      ...items,
    ];
  }
  if (r === "inventory_admin") {
    return [
      { key: "inventory", label: "Inventory", screen: "InventoryDashboard", icon: "box" },
      { key: "products", label: "Products", screen: "Products", icon: "package" },
      { key: "purchases", label: "Purchases", screen: "Purchases", icon: "cart" },
      ...items,
    ];
  }
  if (r === "ca_admin") {
    return [
      { key: "gst", label: "GST reports", screen: "Gst", icon: "tax" },
      { key: "invoices", label: "Invoices", screen: "Invoices", icon: "file" },
      { key: "purchases", label: "Purchases", screen: "Purchases", icon: "cart" },
      { key: "accounting", label: "Accounting", screen: "Accounting", icon: "book" },
      ...items,
    ];
  }
  return items;
}
