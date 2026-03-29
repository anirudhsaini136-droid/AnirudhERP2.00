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
 * Granular finance add-ons (recurring / e-way / e-invoice).
 * - If explicitly listed → on.
 * - If another granular sibling is on but this id is not → off (super-admin per-toggle control).
 * - Legacy: only `invoices_finance` with no granular ids → all three implied on (old tenants).
 */
export function effectiveModuleEnabled(enabled, moduleId) {
  if (!Array.isArray(enabled)) return true;
  if (enabled.includes(moduleId)) return true;
  if (GRANULAR_FINANCE_ADDON_IDS.includes(moduleId)) {
    const siblingOn = GRANULAR_FINANCE_ADDON_IDS.some(
      (id) => id !== moduleId && enabled.includes(id),
    );
    if (siblingOn) return false;
    return enabled.includes('invoices_finance');
  }
  return false;
}
