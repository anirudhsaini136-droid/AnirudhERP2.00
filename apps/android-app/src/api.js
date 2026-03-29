import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { formatApiError } from "./utils/errors";

const extra = Constants.expoConfig?.extra || {};
const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const fromExtra = extra.apiUrl && String(extra.apiUrl).trim();
/** Set EXPO_PUBLIC_API_URL or app.json expo.extra.apiUrl to your FastAPI base, e.g. https://xxx.railway.app/api */
export const API_BASE = (fromEnv || fromExtra || "http://10.0.2.2:8000/api").replace(/\/$/, "");

const KEY_ACCESS = "access_token";
const KEY_REFRESH = "refresh_token";

export async function readToken() {
  return AsyncStorage.getItem(KEY_ACCESS);
}

export async function readRefreshToken() {
  return AsyncStorage.getItem(KEY_REFRESH);
}

export async function writeToken(token) {
  if (!token) return AsyncStorage.removeItem(KEY_ACCESS);
  return AsyncStorage.setItem(KEY_ACCESS, token);
}

export async function writeRefreshToken(token) {
  if (!token) return AsyncStorage.removeItem(KEY_REFRESH);
  return AsyncStorage.setItem(KEY_REFRESH, token);
}

export async function clearAllTokens() {
  await AsyncStorage.multiRemove([KEY_ACCESS, KEY_REFRESH]);
}

export async function persistAuth(access, refresh) {
  if (access) await writeToken(access);
  if (refresh) await writeRefreshToken(refresh);
}

async function tryRefresh() {
  const refresh = await readRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  await persistAuth(data.access_token, data.refresh_token);
  return data.access_token;
}

export async function request(path, options = {}, _retried = false) {
  const token = await readToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !_retried) {
    const newAccess = await tryRefresh();
    if (newAccess) return request(path, options, true);
  }

  if (!res.ok) {
    throw new Error(formatApiError(data, `Request failed (${res.status})`));
  }
  return data;
}

/** Login must not attach a stale access token (would break after session expiry). */
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatApiError(data, `Login failed (${res.status})`));
  }
  return data;
}

export function getMe() {
  return request("/auth/me");
}

export function getBusinessDashboard() {
  return request("/dashboard");
}

export function getFinanceDashboard() {
  return request("/finance");
}

export function getInvoices(params = {}) {
  const q = new URLSearchParams({ limit: "50", page: "1", ...params });
  return request(`/finance/invoices?${q}`);
}

export function postInvoice(body) {
  return request("/finance/invoices", { method: "POST", body: JSON.stringify(body) });
}

export function getInvoice(id) {
  return request(`/finance/invoices/${id}`);
}

export function deleteInvoice(id) {
  return request(`/finance/invoices/${id}`, { method: "DELETE" });
}

export function postInvoicePayment(invoiceId, body) {
  return request(`/finance/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Sends invoice/reminder on WhatsApp using WATI API (if configured in business settings).
 * Backend endpoint does not require a request body.
 */
export function postInvoiceSendWhatsappApi(invoiceId) {
  return request(`/finance/invoices/${invoiceId}/send-whatsapp-api`, { method: "POST" });
}

export function postInvoiceGenerateEinvoice(invoiceId) {
  return request(`/finance/invoices/${invoiceId}/einvoice/generate`, { method: "POST" });
}

export function postEwayBill(body) {
  return request("/finance/eway-bills", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function postSendAllWhatsappReminders(body) {
  return request("/finance/reminders/whatsapp/send-all", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getCustomers(params = {}) {
  const q = new URLSearchParams({ limit: "50", page: "1", ...params });
  return request(`/finance/customers?${q}`);
}

export function getCustomerLedger(clientName) {
  const enc = encodeURIComponent(clientName);
  return request(`/finance/customers/${enc}/ledger`);
}

export function postCustomerBulkPayment(clientName, body) {
  const enc = encodeURIComponent(clientName);
  return request(`/finance/customers/${enc}/bulk-payment`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getGstSummary(params = {}) {
  const q = new URLSearchParams(params);
  const suffix = q.toString() ? `?${q}` : "";
  return request(`/finance/gst/summary${suffix}`);
}

export function getGstGstr1(params = {}) {
  const q = new URLSearchParams(params);
  const suffix = q.toString() ? `?${q}` : "";
  return request(`/finance/gst/gstr1${suffix}`);
}

export function getExpenses(params = {}) {
  const q = new URLSearchParams({ limit: "50", ...params });
  return request(`/finance/expenses?${q}`);
}

export function getInventoryDashboard() {
  return request("/inventory");
}

export function getProducts(params = {}) {
  const q = new URLSearchParams({ limit: "50", page: "1", ...params });
  return request(`/inventory/products?${q}`);
}

export function postInventoryBill(body) {
  return request("/inventory/bill", { method: "POST", body: JSON.stringify(body) });
}

export function getPurchases(params = {}) {
  const q = new URLSearchParams({ limit: "50", page: "1", ...params });
  return request(`/purchases?${q}`);
}

export function getPurchaseBill(id) {
  return request(`/purchases/${id}`);
}

export function getHrDashboard() {
  return request("/hr");
}

export function getEmployees(params = {}) {
  const q = new URLSearchParams({ limit: "100", ...params });
  return request(`/hr/employees?${q}`);
}

export function getStaffPortal() {
  return request("/staff");
}

export function getSuperAdminDashboard() {
  return request("/super-admin/dashboard");
}

export function getSuperAdminBusinesses() {
  return request("/super-admin/businesses");
}

export function getTrialBalance() {
  return request("/accounting/reports/trial-balance");
}

/* ——— Notifications (web header) ——— */
export function getNotifications(limit = 10) {
  return request(`/notifications?limit=${limit}`);
}

export function markAllNotificationsRead() {
  return request("/notifications/read-all", { method: "PUT" });
}

/* ——— Staff (web /staff/*) ——— */
export function getStaffHome() {
  return request("/staff/home");
}

export function postStaffClockIn() {
  return request("/staff/clock-in", { method: "POST", body: JSON.stringify({}) });
}

export function postStaffClockOut() {
  return request("/staff/clock-out", { method: "POST", body: JSON.stringify({}) });
}

export function getStaffAttendance(month, year) {
  return request(`/staff/attendance?month=${month}&year=${year}`);
}

export function getStaffLeave() {
  return request("/staff/leave");
}

export function postStaffLeave(body) {
  return request("/staff/leave", { method: "POST", body: JSON.stringify(body) });
}

export function getStaffPayslips() {
  return request("/staff/payslips");
}

export function getStaffProfile() {
  return request("/staff/profile");
}

export function putStaffProfile(body) {
  return request("/staff/profile", { method: "PUT", body: JSON.stringify(body) });
}

export function putStaffChangePassword(body) {
  return request("/staff/change-password", { method: "PUT", body: JSON.stringify(body) });
}

/* ——— HR admin ——— */
export function getHrAttendance(date) {
  return request(`/hr/attendance?date=${encodeURIComponent(date)}`);
}

export function postHrAttendance(body) {
  return request("/hr/attendance", { method: "POST", body: JSON.stringify(body) });
}

export function getHrLeaveRequests(params = {}) {
  const q = new URLSearchParams({ page: "1", limit: "20", ...params });
  return request(`/hr/leave-requests?${q}`);
}

export function putHrLeaveRequestAction(id, action) {
  return request(`/hr/leave-requests/${id}/${action}`, { method: "PUT", body: JSON.stringify({}) });
}

export function getHrPayroll() {
  return request("/hr/payroll");
}

export function postHrPayrollRun(body) {
  return request("/hr/payroll/run", { method: "POST", body: JSON.stringify(body) });
}

export function getHrPayrollRun(id) {
  return request(`/hr/payroll/${id}`);
}

/* ——— Finance reports ——— */
export function getFinanceProfitLossReport(period) {
  return request(`/finance/reports/profit-loss?period=${encodeURIComponent(period)}`);
}

/* ——— Business owner ——— */
export function getDashboardUsers() {
  return request("/dashboard/users");
}

export function postDashboardUser(body) {
  return request("/dashboard/users", { method: "POST", body: JSON.stringify(body) });
}

export function putDashboardUserStatus(userId, activate) {
  return request(`/dashboard/users/${userId}/${activate ? "activate" : "deactivate"}`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export function deleteDashboardUser(userId) {
  return request(`/dashboard/users/${userId}`, { method: "DELETE" });
}

export function postDashboardResetPassword(body) {
  return request("/dashboard/reset-password", { method: "POST", body: JSON.stringify(body) });
}

export function getDashboardSettings() {
  return request("/dashboard/settings");
}

export function putDashboardSettings(body) {
  return request("/dashboard/settings", { method: "PUT", body: JSON.stringify(body) });
}

export function putDashboardInvoiceSettings(body) {
  return request("/dashboard/settings/invoice", { method: "PUT", body: JSON.stringify(body) });
}

/* ——— Super admin detail / settings ——— */
export function postSuperAdminBusiness(body) {
  return request("/super-admin/businesses", { method: "POST", body: JSON.stringify(body) });
}

export function getSuperAdminBusiness(id) {
  return request(`/super-admin/businesses/${id}`);
}

/** Super admin only — swap access token to act as the tenant’s business_owner (same as web “Login as”). */
export function postSuperAdminImpersonate(businessId) {
  return request(`/super-admin/businesses/${businessId}/impersonate`, { method: "POST" });
}

/** Call while impersonating — restores the super_admin access token from the JWT. */
export function postSuperAdminEndImpersonation() {
  return request("/super-admin/end-impersonation", { method: "POST" });
}

export function postSuperAdminExtendSubscription(businessId, body) {
  return request(`/super-admin/businesses/${businessId}/extend`, { method: "POST", body: JSON.stringify(body) });
}

export function postSuperAdminSuspendBusiness(businessId) {
  return request(`/super-admin/businesses/${businessId}/suspend`, { method: "POST" });
}

export function postSuperAdminChangePlan(businessId, newPlan) {
  return request(`/super-admin/businesses/${businessId}/change-plan`, {
    method: "POST",
    body: JSON.stringify({ new_plan: newPlan }),
  });
}

export function deleteSuperAdminBusiness(businessId) {
  return request(`/super-admin/businesses/${businessId}`, { method: "DELETE" });
}

export function postSuperAdminResetPassword(userId, newPassword) {
  return request("/super-admin/reset-password", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, new_password: newPassword }),
  });
}

export function putSuperAdminBusiness(id, body) {
  return request(`/super-admin/businesses/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export function getSuperAdminSettings() {
  return request("/super-admin/settings");
}

export function putSuperAdminSetting(key, value) {
  return request("/super-admin/settings", {
    method: "PUT",
    body: JSON.stringify({ setting_key: key, setting_value: value }),
  });
}

/* ——— CA / accounting extras ——— */
export function getBalanceSheetReport() {
  return request("/accounting/reports/balance-sheet");
}

export function getAccountingProfitLoss(start, end) {
  return request(`/accounting/reports/profit-loss?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`);
}

export function getPurchasesItcSummary(start, end) {
  return request(`/purchases/itc/summary?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`);
}

export function getGstGstr1Json(params = {}) {
  const q = new URLSearchParams(params);
  const suffix = q.toString() ? `?${q}` : "";
  return request(`/finance/gst/gstr1-json${suffix}`);
}
