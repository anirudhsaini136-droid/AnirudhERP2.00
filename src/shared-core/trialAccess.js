/** Locked modules during restricted trial (self-serve signup or Super Admin "Activate trial"). */

export const TRIAL_UPGRADE_MESSAGE =
  'During your trial, only invoice creation, purchase creation, and stock adjustments are available. Please upgrade your plan to unlock all modules.';

const TRIAL_LOCKED_ROLES = new Set([
  'business_owner',
  'finance_admin',
  'hr_admin',
  'inventory_admin',
  'ca_admin',
]);

const TRIAL_ALLOWED_EXACT = new Set(['/dashboard/settings', '/trial-upgrade']);

const TRIAL_ALLOWED_PREFIXES = ['/finance/invoices', '/purchases', '/inventory'];

export function isTrialRestrictedBusiness(business) {
  if (!business) return false;
  return Boolean(business.trial_restricted);
}

export function shouldApplyTrialModuleLock(business, role) {
  if (!business || !role || role === 'super_admin' || role === 'staff') return false;
  return isTrialRestrictedBusiness(business) && TRIAL_LOCKED_ROLES.has(role);
}

/**
 * @param {string} pathname - React Router location.pathname
 */
export function isTrialPathUnlocked(pathname) {
  if (!pathname) return false;
  if (TRIAL_ALLOWED_EXACT.has(pathname)) return true;
  return TRIAL_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Web: safe home when guard redirects. */
export function trialFallbackPathForRole(role) {
  switch (role) {
    case 'business_owner':
      return '/finance/invoices';
    case 'finance_admin':
      return '/finance/invoices';
    case 'inventory_admin':
      return '/inventory';
    case 'ca_admin':
      return '/finance/invoices';
    case 'hr_admin':
      return '/trial-upgrade';
    default:
      return '/dashboard';
  }
}
