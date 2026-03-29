/** 30-day trusted device window (must match server / Android). */
export const TRUSTED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function normEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function trustedDeviceStorageKey(email) {
  return `trusted_device_${normEmail(email)}`;
}

/** UUID v4 for trusted device token (client-generated). */
export function createTrustedDeviceUuid() {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = (Math.random() * 256) | 0;
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function readTrustedDeviceRecord(email) {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(trustedDeviceStorageKey(email));
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o.token !== 'string' || !o.expiresAt) return null;
    return { token: o.token, expiresAt: o.expiresAt, email: o.email || normEmail(email) };
  } catch {
    return null;
  }
}

export function writeTrustedDeviceRecord(email, token, expiresAtIso) {
  if (typeof localStorage === 'undefined') return;
  const em = normEmail(email);
  localStorage.setItem(
    trustedDeviceStorageKey(em),
    JSON.stringify({ token, expiresAt: expiresAtIso, email: em }),
  );
}

export function clearTrustedDeviceRecord(email) {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(trustedDeviceStorageKey(email));
}

export function trustedDeviceExpiresAtIso() {
  return new Date(Date.now() + TRUSTED_DEVICE_TTL_MS).toISOString();
}
