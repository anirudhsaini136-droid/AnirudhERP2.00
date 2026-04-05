/** Canonical order: highlighted premium items first, then the rest. */
const PREMIUM_MODULE_ORDER = [
  'hr_payroll',
  'accounting',
  'gst_reports',
  'tally_export',
  'recurring_invoices',
  'einvoice',
  'eway_bill',
  'manage_users',
  'invoices_finance',
  'inventory_billing',
  'purchases_itc',
  'customer_ledger',
  'expenses',
  'ca_portal',
];

const DEFS = {
  manage_users: { id: 'manage_users', label: 'Manage Users', icon: '👤' },
  hr_payroll: { id: 'hr_payroll', label: 'HR & Payroll', icon: '👔' },
  invoices_finance: { id: 'invoices_finance', label: 'Invoices & Finance', icon: '🧾' },
  recurring_invoices: { id: 'recurring_invoices', label: 'Recurring Invoices', icon: '🔄' },
  eway_bill: { id: 'eway_bill', label: 'E-Way Bill', icon: '🚚' },
  einvoice: { id: 'einvoice', label: 'E-Invoice', icon: '🧾' },
  inventory_billing: { id: 'inventory_billing', label: 'Inventory & Billing', icon: '📦' },
  purchases_itc: { id: 'purchases_itc', label: 'Purchases & ITC', icon: '🛒' },
  gst_reports: { id: 'gst_reports', label: 'GST Reports', icon: '🧮' },
  customer_ledger: { id: 'customer_ledger', label: 'Customer Ledger', icon: '📒' },
  expenses: { id: 'expenses', label: 'Expenses', icon: '💸' },
  accounting: { id: 'accounting', label: 'Accounting', icon: '📊' },
  ca_portal: { id: 'ca_portal', label: 'CA Portal', icon: '🔐' },
  tally_export: { id: 'tally_export', label: 'Tally Export', icon: '📤' },
};

/**
 * @param {string[]|null|undefined} enabledModuleIds
 * @returns {{ id: string, label: string, icon: string }[]}
 */
export function getDisabledPremiumModules(enabledModuleIds) {
  const enabled = new Set(Array.isArray(enabledModuleIds) ? enabledModuleIds : []);
  return PREMIUM_MODULE_ORDER.map((id) => DEFS[id]).filter((d) => d && !enabled.has(d.id));
}

export function getPremiumModuleLabel(moduleId) {
  const d = DEFS[moduleId];
  return d ? d.label : moduleId;
}
