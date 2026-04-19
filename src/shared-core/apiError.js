/**
 * Turn an axios/FastAPI error into a short toast message.
 */
export function formatApiError(error, fallbackLabel) {
  const res = error?.response;
  if (!res) {
    return `${fallbackLabel}: no response (offline, wrong API URL, CORS, or backend down).`;
  }
  const st = res.status;
  const d = res.data?.detail;
  if (st === 401) return 'Session expired — sign in again.';
  if (st === 403) return `${fallbackLabel}: no permission (finance access required).`;
  if (typeof d === 'string' && d.trim()) return d;
  if (Array.isArray(d)) {
    const parts = d.map((x) => (x && typeof x === 'object' ? x.msg : String(x)));
    const s = parts.filter(Boolean).join('; ');
    if (s) return s;
  }
  if (st >= 500) {
    return `${fallbackLabel}: server error — on Railway run migrate.py so tables exist (recurring_invoice_schedules, eway_bills).`;
  }
  return `${fallbackLabel} (${st}).`;
}
