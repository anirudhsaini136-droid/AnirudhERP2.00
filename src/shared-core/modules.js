/** Sub-features under finance; optional explicit toggles in Super Admin (must appear in modules[] to be on). */
export const GRANULAR_FINANCE_ADDON_IDS = ['recurring_invoices', 'eway_bill', 'einvoice'];

/**
 * @returns {string[]|null} null = no business in context (do not treat as "allow all")
 */
export function parseEnabledModules(business) {
  if (!business) return null;
  const raw = business.modules;
  if (raw === undefined || raw === null) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.filter((x) => typeof x === 'string');
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Whether a module id is enabled for this business. No implied extras: turning on
 * `invoices_finance` does not enable recurring / e-way / e-invoice unless those ids are in the list.
 */
export function effectiveModuleEnabled(enabled, moduleId) {
  if (!Array.isArray(enabled)) return true;
  return enabled.includes(moduleId);
}

/**
 * Each sidebar / deep-link path maps to explicit Super Admin module ids (no OR across unrelated modules).
 * `/ca` → `ca_portal` only; `/finance/gst` → `gst_reports` only.
 */
const NAV_PATH_MODULE_REQUIREMENTS = {
  '/dashboard/users': { all: ['manage_users'] },
  '/hr': { all: ['hr_payroll'] },
  '/hr/employees': { all: ['hr_payroll'] },
  '/hr/attendance': { all: ['hr_payroll'] },
  '/hr/leave': { all: ['hr_payroll'] },
  '/hr/payroll': { all: ['hr_payroll'] },
  '/finance': { all: ['invoices_finance'] },
  '/finance/invoices': { all: ['invoices_finance'] },
  '/finance/recurring-invoices': { all: ['recurring_invoices'] },
  '/finance/eway-bills': { all: ['eway_bill'] },
  '/finance/customers': { all: ['customer_ledger'] },
  '/finance/migration': { all: ['invoices_finance'] },
  '/finance/expenses': { all: ['expenses'] },
  '/finance/reports': { all: ['invoices_finance'] },
  '/finance/gst': { all: ['gst_reports'] },
  '/finance/tally-export': { all: ['tally_export'] },
  '/accounting': { all: ['accounting'] },
  '/purchases': { all: ['purchases_itc'] },
  '/inventory': { all: ['inventory_billing'] },
  '/inventory/billing': { all: ['inventory_billing'] },
  '/ca': { all: ['ca_portal'] },
};

/**
 * @returns {{ all?: string[], any?: string[] } | null}
 */
export function getRequiredModuleSpecForNavPath(path) {
  if (!path || typeof path !== 'string') return null;
  const exact = NAV_PATH_MODULE_REQUIREMENTS[path];
  if (exact) return exact;
  if (path.startsWith('/finance/invoices')) return { all: ['invoices_finance'] };
  if (path.startsWith('/finance/customers')) return { all: ['customer_ledger'] };
  if (path.startsWith('/purchases')) return { all: ['purchases_itc'] };
  return null;
}

export function isNavPathAllowedForModules(path, enabledModules) {
  if (!Array.isArray(enabledModules)) return false;
  const spec = getRequiredModuleSpecForNavPath(path);
  if (!spec) return false;
  if (spec.all?.length) {
    return spec.all.every((id) => enabledModules.includes(id));
  }
  if (spec.any?.length) {
    return spec.any.some((id) => enabledModules.includes(id));
  }
  return false;
}
