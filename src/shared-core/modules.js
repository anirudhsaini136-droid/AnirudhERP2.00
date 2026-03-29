/** Sub-features under finance; optional explicit toggles in Super Admin. */
export const GRANULAR_FINANCE_ADDON_IDS = ['recurring_invoices', 'eway_bill', 'einvoice'];

/**
 * @returns {string[]|null} null = legacy business (no modules field) → all modules allowed in UI
 */
export function parseEnabledModules(business) {
  if (business?.modules === undefined || business?.modules === null) return null;
  try {
    return JSON.parse(business.modules || '[]');
  } catch {
    return [];
  }
}

/**
 * Whether a module id is effectively on, including legacy: invoices_finance without any granular id
 * implies recurring_invoices, eway_bill, einvoice stay on until SA adds at least one granular flag.
 */
export function effectiveModuleEnabled(enabled, moduleId) {
  if (!Array.isArray(enabled)) return true;
  if (enabled.includes(moduleId)) return true;
  if (GRANULAR_FINANCE_ADDON_IDS.includes(moduleId)) {
    const hasAnyGranular = GRANULAR_FINANCE_ADDON_IDS.some((id) => enabled.includes(id));
    const legacyInvoicesFinance = enabled.includes('invoices_finance') && !hasAnyGranular;
    return legacyInvoicesFinance;
  }
  return false;
}
