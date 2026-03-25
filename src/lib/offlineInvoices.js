// Offline MVP storage for invoices + payments (Part 1).
// MVP uses localStorage (simple + reliable for small data). Can be migrated to IndexedDB later.

const PREFIX = "nexus_offline_v1";

function safeJsonParse(v, fallback) {
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function getBusinessKey(businessId) {
  return `${PREFIX}:biz:${businessId}`;
}

function getQueueKey(businessId) {
  return `${getBusinessKey(businessId)}:queue`;
}

function getInvoicesKey(businessId) {
  return `${getBusinessKey(businessId)}:invoices`;
}

function getPaymentsKey(businessId) {
  return `${getBusinessKey(businessId)}:payments`;
}

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  // eslint-disable-next-line no-undef
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `offline_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function isOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function loadLocalInvoices(businessId) {
  const raw = localStorage.getItem(getInvoicesKey(businessId));
  const invoices = safeJsonParse(raw, []);
  return Array.isArray(invoices) ? invoices : [];
}

export function getLocalInvoice(businessId, localInvoiceId) {
  const invoices = loadLocalInvoices(businessId);
  return invoices.find((i) => i.id === localInvoiceId) || null;
}

export function upsertLocalInvoices(businessId, invoices) {
  localStorage.setItem(getInvoicesKey(businessId), JSON.stringify(invoices));
}

export function upsertServerInvoices(businessId, serverInvoices) {
  if (!Array.isArray(serverInvoices) || serverInvoices.length === 0) return;
  const invoices = loadLocalInvoices(businessId);

  for (const s of serverInvoices) {
    if (!s || !s.id) continue;
    const existingIdx = invoices.findIndex((i) => i.id === s.id);
    const local = {
      ...s,
      id: s.id,
      local_invoice_id: s.id,
      server_invoice_id: s.id,
      sync_status: "synced",
      // server list endpoint doesn't include items/payments
      items: invoices[existingIdx]?.items || [],
      payments: invoices[existingIdx]?.payments || [],
      updated_at: s.updated_at || invoices[existingIdx]?.updated_at || nowIso(),
    };
    if (existingIdx >= 0) invoices[existingIdx] = { ...invoices[existingIdx], ...local };
    else invoices.push(local);
  }

  upsertLocalInvoices(businessId, invoices);
}

export function upsertLocalInvoiceDetail(businessId, { invoice, items, payments } = {}) {
  if (!invoice || !invoice.id) return;
  const invoices = loadLocalInvoices(businessId);
  const idx = invoices.findIndex((i) => i.id === invoice.id);
  const base = idx >= 0 ? invoices[idx] : null;
  const next = {
    ...(base || {}),
    ...invoice,
    id: invoice.id,
    local_invoice_id: invoice.id,
    server_invoice_id: base?.server_invoice_id || invoice.id,
    sync_status: base?.sync_status || "synced",
    items: Array.isArray(items) ? items : base?.items || [],
    payments: Array.isArray(payments) ? payments : base?.payments || [],
    updated_at: invoice.updated_at || nowIso(),
  };
  if (idx >= 0) invoices[idx] = next;
  else invoices.push(next);
  upsertLocalInvoices(businessId, invoices);
}

export function loadLocalQueue(businessId) {
  const raw = localStorage.getItem(getQueueKey(businessId));
  const q = safeJsonParse(raw, []);
  return Array.isArray(q) ? q : [];
}

export function setLocalQueue(businessId, queue) {
  localStorage.setItem(getQueueKey(businessId), JSON.stringify(queue));
}

export function loadLocalPayments(businessId) {
  const raw = localStorage.getItem(getPaymentsKey(businessId));
  const payments = safeJsonParse(raw, []);
  return Array.isArray(payments) ? payments : [];
}

export function upsertLocalPayments(businessId, payments) {
  localStorage.setItem(getPaymentsKey(businessId), JSON.stringify(payments));
}

export function nextOfflineInvoiceNumber(businessId, yyyyMm) {
  const counterKey = `${PREFIX}:biz:${businessId}:counter:${yyyyMm}`;
  const current = safeJsonParse(localStorage.getItem(counterKey), 0);
  const next = (Number(current) || 0) + 1;
  localStorage.setItem(counterKey, JSON.stringify(next));
  return `OFF-${yyyyMm}-${String(next).padStart(4, "0")}`;
}

export function dedupeInvoicesForOffline(invoices) {
  // Prefer server-cached record (id === server_invoice_id) when both exist.
  const map = new Map();
  for (const inv of invoices || []) {
    if (!inv) continue;
    const serverKey = inv.server_invoice_id || inv.id;
    const preferServer = inv.id && inv.server_invoice_id && inv.id === inv.server_invoice_id;
    if (!map.has(serverKey)) {
      map.set(serverKey, inv);
      continue;
    }
    const existing = map.get(serverKey);
    const existingPreferServer = existing?.id && existing?.server_invoice_id && existing?.id === existing?.server_invoice_id;
    if (preferServer && !existingPreferServer) map.set(serverKey, inv);
  }
  return Array.from(map.values());
}

function calculateGstLocal(taxRate, subtotal, sellerState, buyerState) {
  // Replicates backend routes/finance.py calculate_gst logic.
  if (!taxRate || Number(taxRate) === 0) {
    return {
      supply_type: "intrastate",
      cgst_rate: 0,
      cgst_amount: 0,
      sgst_rate: 0,
      sgst_amount: 0,
      igst_rate: 0,
      igst_amount: 0,
      tax_amount: 0,
    };
  }

  const s1 = (sellerState || "").trim().toLowerCase();
  const s2 = (buyerState || "").trim().toLowerCase();
  const taxAmount = round2((Number(subtotal) * Number(taxRate)) / 100);

  if (s1 && s2 && s1 === s2) {
    const halfRate = round2(Number(taxRate) / 2);
    const halfAmount = round2(taxAmount / 2);
    return {
      supply_type: "intrastate",
      cgst_rate: halfRate,
      cgst_amount: halfAmount,
      sgst_rate: halfRate,
      sgst_amount: halfAmount,
      igst_rate: 0,
      igst_amount: 0,
      tax_amount: taxAmount,
    };
  }

  return {
    supply_type: "interstate",
    cgst_rate: 0,
    cgst_amount: 0,
    sgst_rate: 0,
    sgst_amount: 0,
    igst_rate: Number(taxRate),
    igst_amount: taxAmount,
    tax_amount: taxAmount,
  };
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

// Builds a local invoice object shaped like backend serialize_model output (enough for InvoiceRenderer).
export function buildLocalInvoiceFromForm({ business, form, localInvoiceId, invoiceNumber }) {
  const yyyyMm = new Date().toISOString().slice(0, 7).replace("-", "");
  const issueDate = form.issue_date || new Date().toISOString().split("T")[0];
  const dueDate = form.due_date || null;

  const items = (form.items || []).map((it) => {
    const qty = Number(it.quantity) || 0;
    const unitPrice = Number(it.unit_price) || 0;
    const disc = Number(it.item_discount) || 0;
    const total = qty * unitPrice - disc;
    return {
      description: it.description,
      hsn_code: it.hsn_code || null,
      quantity: qty,
      unit_price: unitPrice,
      item_discount: disc,
      total,
    };
  });

  const subtotal = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const discountAmount = Number(form.discount_amount) || 0;
  const taxRate = Number(form.tax_rate) || 0;
  const gst = calculateGstLocal(taxRate, subtotal, business?.state || "", form.buyer_state || "");
  const totalAmount = subtotal + gst.tax_amount - discountAmount;

  const customFieldsFiltered = (form.custom_fields || [])
    .filter((f) => f && f.label && f.value)
    .map((f) => ({ label: f.label, value: f.value }));

  return {
    id: localInvoiceId,
    local_invoice_id: localInvoiceId,
    server_invoice_id: null,
    sync_status: "local_pending", // or "synced"

    status: "draft",
    invoice_number: invoiceNumber || `OFF-${yyyyMm}-0001`,

    client_name: form.client_name,
    client_email: form.client_email || null,
    client_address: form.client_address || null,
    client_phone: form.client_phone || null,
    buyer_state: form.buyer_state || null,
    place_of_supply: form.buyer_state || null,
    supply_type: gst.supply_type,

    issue_date: issueDate,
    due_date: dueDate,

    subtotal,
    tax_rate: taxRate,
    tax_amount: gst.tax_amount,
    discount_amount: discountAmount,

    total_amount: totalAmount,
    amount_paid: 0,
    balance_due: totalAmount,

    notes: form.notes || null,
    payment_terms: form.payment_terms || null,
    currency: form.currency || "INR",

    cgst_rate: gst.cgst_rate,
    cgst_amount: gst.cgst_amount,
    sgst_rate: gst.sgst_rate,
    sgst_amount: gst.sgst_amount,
    igst_rate: gst.igst_rate,
    igst_amount: gst.igst_amount,

    items,
    // Backend stores custom_fields as JSON string in DB.
    custom_fields: customFieldsFiltered.length ? JSON.stringify(customFieldsFiltered) : null,

    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

export function enqueueCreateInvoice({ businessId, localInvoiceId, payload }) {
  const queue = loadLocalQueue(businessId);
  queue.push({
    qid: uuid(),
    type: "CREATE_INVOICE",
    local_invoice_id: localInvoiceId,
    payload,
    created_at: nowIso(),
    status: "pending",
    retry_count: 0,
  });
  setLocalQueue(businessId, queue);
}

export function enqueueCreatePayment({ businessId, localInvoiceId, payload }) {
  const queue = loadLocalQueue(businessId);
  queue.push({
    qid: uuid(),
    type: "CREATE_PAYMENT",
    local_invoice_id: localInvoiceId,
    payload,
    created_at: nowIso(),
    status: "pending",
    retry_count: 0,
  });
  setLocalQueue(businessId, queue);
}

export function createLocalInvoiceAndQueue({ businessId, business, form }) {
  const localInvoiceId = uuid();
  const yyyyMm = new Date().toISOString().slice(0, 7).replace("-", "");
  const invoiceNumber = nextOfflineInvoiceNumber(businessId, yyyyMm);

  const localInvoice = buildLocalInvoiceFromForm({
    business,
    form,
    localInvoiceId,
    invoiceNumber,
  });

  const invoices = loadLocalInvoices(businessId);
  invoices.push(localInvoice);
  upsertLocalInvoices(businessId, invoices);

  // Payload to send to backend when syncing.
  const invoicePayload = {
    ...form,
    buyer_state: form.buyer_state || null,
    place_of_supply: form.buyer_state || null,
    custom_fields: (form.custom_fields || [])
      .filter((f) => f && f.label && f.value)
      .map((f) => ({ label: f.label, value: f.value })),
    items: (form.items || []).map((i) => ({
      description: i.description,
      hsn_code: i.hsn_code || null,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      item_discount: Number(i.item_discount) || 0,
    })),
  };

  enqueueCreateInvoice({ businessId, localInvoiceId, payload: invoicePayload });
  return localInvoice;
}

export function recordLocalPaymentAndQueue({ businessId, localInvoiceId, form }) {
  // form matches InvoicePaymentCreate: { amount, payment_date, payment_method, reference, notes }
  const invoices = loadLocalInvoices(businessId);
  const inv = invoices.find((i) => i.id === localInvoiceId);
  if (!inv) return null;

  const amount = Number(form.amount) || 0;
  const newPaid = Number(inv.amount_paid) + amount;
  const newBalance = Math.max(0, Number(inv.total_amount) - newPaid);
  const newStatus = newBalance <= 0 ? "paid" : "partially_paid";

  inv.amount_paid = newPaid;
  inv.balance_due = newBalance;
  inv.status = newStatus;
  inv.updated_at = nowIso();

  upsertLocalInvoices(businessId, invoices);

  const payload = {
    amount,
    payment_date: form.payment_date,
    payment_method: form.payment_method,
    reference: form.reference || null,
    notes: form.notes || null,
  };

  enqueueCreatePayment({ businessId, localInvoiceId, payload });

  // Also store a local payment list if needed later.
  const payments = loadLocalPayments(businessId);
  payments.push({
    id: uuid(),
    invoice_local_id: localInvoiceId,
    ...payload,
    created_at: nowIso(),
    sync_status: "local_pending",
  });
  upsertLocalPayments(businessId, payments);

  return inv;
}

export async function syncOfflineInvoiceQueue({ api, businessId }) {
  if (!isOnline()) return { synced: 0, failed: 0, skipped: 0 };
  const queue = loadLocalQueue(businessId);
  if (!queue.length) return { synced: 0, failed: 0, skipped: 0 };

  let synced = 0;
  let failed = 0;
  let skipped = 0;

  // Keep order.
  const nextQueue = [];
  for (const action of queue) {
    if (action.status !== "pending") {
      nextQueue.push(action);
      continue;
    }
    try {
      if (action.type === "CREATE_INVOICE") {
        const res = await api.post("/finance/invoices", action.payload);
        const serverInvoiceId = res?.data?.id;
        const serverInvoiceNumber = res?.data?.invoice_number;
        const invoices = loadLocalInvoices(businessId);
        const inv = invoices.find((i) => i.id === action.local_invoice_id);
        if (inv && serverInvoiceId) {
          inv.server_invoice_id = serverInvoiceId;
          inv.sync_status = "synced";
          if (serverInvoiceNumber) inv.invoice_number = serverInvoiceNumber;
          inv.updated_at = nowIso();
          upsertLocalInvoices(businessId, invoices);
        }
        synced += 1;
        continue; // do not re-add to nextQueue
      }

      if (action.type === "CREATE_PAYMENT") {
        const localInv = getLocalInvoice(businessId, action.local_invoice_id);
        const serverInvoiceId = localInv?.server_invoice_id;
        if (!serverInvoiceId) {
          // Invoice not synced yet; keep for later.
          skipped += 1;
          nextQueue.push(action);
          continue;
        }
        await api.post(`/finance/invoices/${serverInvoiceId}/payments`, action.payload);
        synced += 1;
        // Payment sync successful; keep local invoice as-is (UI already updated).
        continue;
      }

      // Unknown action: keep.
      nextQueue.push(action);
    } catch (e) {
      failed += 1;
      // Keep it for retry later (increment retry count).
      nextQueue.push({
        ...action,
        retry_count: Number(action.retry_count || 0) + 1,
        status: "pending",
      });
    }
  }

  setLocalQueue(businessId, nextQueue);
  return { synced, failed, skipped };
}

