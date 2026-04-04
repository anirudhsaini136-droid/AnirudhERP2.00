import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Search, Eye, CheckCircle, Trash2, Bell, ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { toastAfterWhatsAppOpen } from '../../utils/whatsappToast';
import {
  loadLocalInvoices,
  reconcileServerInvoiceCache,
  upsertLocalInvoices,
  createLocalInvoiceAndQueue,
  recordLocalPaymentAndQueue,
  syncOfflineInvoiceQueue,
  upsertServerInvoices,
  dedupeInvoicesForOffline,
  pruneExpiredLocalDrafts,
  countDraftInvoices,
} from '../../lib/offlineInvoices';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const STATUS_COLORS = {
  draft: 'badge-neutral', sent: 'badge-info', paid: 'badge-success',
  overdue: 'badge-danger', cancelled: 'badge-danger', partially_paid: 'badge-warning'
};
const emptyItem = { product_id: null, available_stock: null, minimum_stock: null, description: '', hsn_code: '', quantity: 1, unit_price: 0, item_discount: 0, amount: 0 };

/** Optional party/buyer GSTIN: exactly 15 alphanumeric chars when provided. */
const PARTY_GSTIN_RE = /^[A-Z0-9]{15}$/;
function normalizePartyGstin(s) {
  return (s || '').trim().toUpperCase();
}

/** Any field touched — used for “close modal” confirmation. */
function hasInvoiceFormAnyData(f) {
  if (!f) return false;
  if ((f.client_name || '').trim()) return true;
  if ((f.client_phone || '').trim()) return true;
  if ((f.client_email || '').trim()) return true;
  if ((f.client_address || '').trim()) return true;
  if ((f.client_gstin || '').trim()) return true;
  if ((f.notes || '').trim()) return true;
  if ((f.buyer_state || '').trim()) return true;
  if (Number(f.tax_rate || 0) > 0 || Number(f.discount_amount || 0) > 0) return true;
  if ((f.custom_fields || []).some((cf) => (cf?.label || '').trim() || (cf?.value || '').trim())) return true;
  return (f.items || []).some((i) =>
    (i.description || '').trim() ||
    Number(i.quantity || 0) > 0 ||
    Number(i.unit_price || 0) > 0 ||
    Number(i.item_discount || 0) > 0
  );
}

/** Minimum bar to persist a draft: client name + ≥1 line with description and line total > 0. */
function canSaveInvoiceDraft(f) {
  if (!f || !(f.client_name || '').trim()) return false;
  return (f.items || []).some((i) => {
    if (!(i.description || '').trim()) return false;
    const qty = Number(i.quantity) || 0;
    const rate = Number(i.unit_price) || 0;
    const disc = Number(i.item_discount) || 0;
    return qty * rate - disc > 0;
  });
}

function safeJsonParse(v, fallback) {
  try { return JSON.parse(v); } catch { return fallback; }
}


// Customer autocomplete — GET /api/finance/customers?search=
function ClientSearch({ value, onChange, onSelect, api, businessId, offline }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchCustomers = (val) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.length < 2) {
      setResults([]);
      setShow(false);
      setSearching(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      if (offline) {
        try {
          const q = (val || '').trim().toLowerCase();
          const key = `nexa_offline_v1:finance_customers_cache:${businessId}:${q}`;
          const cached = safeJsonParse(localStorage.getItem(key), []);
          setResults(Array.isArray(cached) ? cached : []);
          setShow(true);
        } catch {
          setResults([]);
          setShow(true);
        }
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const res = await api.get('/finance/customers', {
          params: { search: val, limit: 15, page: 1 },
        });
        const list = res.data.customers || [];
        setResults(list);
        setShow(true);
        try {
          const q = (val || '').trim().toLowerCase();
          const key = `nexa_offline_v1:finance_customers_cache:${businessId}:${q}`;
          localStorage.setItem(key, JSON.stringify(list));
        } catch { /* ignore */ }
      } catch {
        setResults([]);
        setShow(true);
      }
      setSearching(false);
    }, 250);
  };

  const handleChange = (val) => {
    setQuery(val);
    onChange(val);
    setHoverIdx(-1);
    fetchCustomers(val);
  };

  const pickCustomer = (c) => {
    setShow(false);
    setHoverIdx(-1);
    onSelect(c);
    setQuery(c.name || '');
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="input-premium mt-1 w-full"
          placeholder="Client name *"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (query.length >= 2) fetchCustomers(query);
          }}
          autoComplete="off"
          required
        />
        {searching && (
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, border: '2px solid #555', borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        )}
      </div>
      {show && query.length >= 2 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 999,
            background: '#f8f9fa',
            border: '1px solid rgba(212, 175, 55, 0.45)',
            borderRadius: 10,
            marginTop: 4,
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.14)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {!searching && results.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>No customers found — continue typing to add manually</div>
          )}
          {results.map((c, idx) => {
            const lineCity =
              c.city ||
              c.state ||
              ((c.address || '').toString().trim().split(',')[0] || '').trim().slice(0, 40) ||
              '—';
            return (
            <button
              key={c.id || `${c.name}-${c.phone || idx}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickCustomer(c)}
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(-1)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                background: hoverIdx === idx ? 'rgba(212, 175, 55, 0.18)' : '#ffffff',
                border: 'none',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#111827', fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.35 }}>
                  {[c.name, c.phone || '—', lineCity].join(' • ')}
                </p>
              </div>
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry'
];

function matchIndianStateName(raw) {
  const t = (raw || '').trim();
  if (!t) return '';
  const m = INDIAN_STATES.find((s) => s.toLowerCase() === t.toLowerCase());
  return m || t;
}

// Product autocomplete component for invoice line items
function ProductSearch({ value, onChange, onSelect, api, businessId, offline }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (val) => {
    setQuery(val);
    onChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.length < 1) { setResults([]); setShow(false); return; }
    timerRef.current = setTimeout(async () => {
      // Offline product autocomplete: show cached results (from previous online searches).
      if (offline) {
        try {
          const q = (val || '').trim().toLowerCase();
          const key = `nexa_offline_v1:products_cache:${businessId}:${q}`;
          const cached = safeJsonParse(localStorage.getItem(key), []);
          setResults(Array.isArray(cached) ? cached : []);
          setShow((Array.isArray(cached) ? cached : []).length > 0);
        } catch {
          setResults([]);
          setShow(false);
        }
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const res = await api.get(`/inventory/products?search=${encodeURIComponent(val)}&limit=8`);
        const products = res.data.products || [];
        setResults(products);
        setShow(products.length > 0);
        try {
          const q = (val || '').trim().toLowerCase();
          const key = `nexa_offline_v1:products_cache:${businessId}:${q}`;
          localStorage.setItem(key, JSON.stringify(products));
        } catch {}
      } catch { setResults([]); }
      setSearching(false);
    }, 250);
  };

  const selectProduct = (product) => {
    setQuery(product.name);
    setShow(false);
    onSelect(product);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="input-premium text-sm w-full"
          placeholder="Description / product name *"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => query.length >= 1 && results.length > 0 && setShow(true)}
          autoComplete="off"
        />
        {searching && (
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, border: '2px solid #555', borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        )}
      </div>
      {show && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
          background: '#0d0d14', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, marginTop: 4, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          {results.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => selectProduct(p)}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <p style={{ color: '#f9fafb', fontSize: 13, fontWeight: 500, margin: 0 }}>{p.name}</p>
                {p.sku && <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>SKU: {p.sku}</p>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                <p style={{ color: '#D4AF37', fontSize: 13, fontWeight: 600, margin: 0 }}>
                  ₹{Number(p.unit_price).toLocaleString('en-IN')}
                </p>
                <p style={{ color: p.current_stock <= 0 ? '#ef4444' : p.current_stock <= p.minimum_stock ? '#f59e0b' : '#10b981', fontSize: 10, margin: 0 }}>
                  {p.current_stock <= 0 ? 'Out of stock' : `${p.current_stock} in stock`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


// DateInput: shows DD/MM/YYYY to user, stores YYYY-MM-DD internally
function DateInput({ value, onChange, className, required, placeholder }) {
  const toDisplay = (v) => {
    if (!v) return '';
    const parts = v.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return v;
  };

  const [display, setDisplay] = React.useState(() => toDisplay(value));
  React.useEffect(() => { setDisplay(toDisplay(value)); }, [value]);

  const handleChange = (e) => {
    let v = e.target.value.replace(/[^0-9/]/g, '');
    if (v.length === 2 && display.length === 1) v += '/';
    if (v.length === 5 && display.length === 4) v += '/';
    if (v.length > 10) v = v.slice(0, 10);
    setDisplay(v);
    if (v.length === 10) {
      const [d, m, y] = v.split('/');
      if (d && m && y && y.length === 4) {
        onChange({ target: { value: `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` } });
      }
    } else if (v === '') {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <input type="text" className={className} value={display}
      onChange={handleChange} placeholder={placeholder || "DD/MM/YYYY"}
      maxLength={10} required={required} />
  );
}

export default function InvoicesPage() {
  const { api, user, business } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paying, setPaying] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [whatsappApiReady, setWhatsappApiReady] = useState(false);
  const [offlineNow, setOfflineNow] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : true);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [invoiceClosePrompt, setInvoiceClosePrompt] = useState(false);

  useEffect(() => {
    const on = () => setOfflineNow(!navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);

  // UI toggles — persisted in localStorage
  const getSavedPref = (key, fallback) => {
    try { const v = localStorage.getItem('inv_pref_' + key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; }
  };
  const savePref = (key, val) => { try { localStorage.setItem('inv_pref_' + key, JSON.stringify(val)); } catch {} };

  const [showHSN, setShowHSN] = useState(() => getSavedPref('hsn', false));
  const [showItemDiscount, setShowItemDiscount] = useState(() => getSavedPref('itemDisc', false));
  const [showCustomFields, setShowCustomFields] = useState(() => getSavedPref('customFields', false));

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    client_name: '', client_email: '', client_address: '', client_phone: '', client_gstin: '',
    issue_date: today, due_date: '', tax_rate: 0, discount_amount: 0,
    notes: '', currency: 'INR',
    buyer_state: '',
    items: [{ ...emptyItem }],
    custom_fields: [] // [{label: '', value: ''}]
  });

  const removeLocalInvoiceById = useCallback((localId) => {
    if (!business?.id || !localId) return;
    const all = loadLocalInvoices(business.id);
    upsertLocalInvoices(business.id, all.filter((x) => x.id !== localId));
  }, [business?.id]);

  const saveDraftFromForm = useCallback(() => {
    if (!business?.id) return false;
    if (!canSaveInvoiceDraft(form)) return false;

    const nowIso = new Date().toISOString();
    const subtotal = (form.items || []).reduce((s, i) => {
      const qty = Number(i.quantity) || 0;
      const rate = Number(i.unit_price) || 0;
      const disc = Number(i.item_discount) || 0;
      return s + (qty * rate - disc);
    }, 0);
    const taxAmount = subtotal * ((Number(form.tax_rate) || 0) / 100);
    const totalAmount = subtotal + taxAmount - (Number(form.discount_amount) || 0);

    const localId = activeDraftId || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const draftInvoice = {
      id: localId,
      local_invoice_id: localId,
      server_invoice_id: null,
      sync_status: 'local_draft',
      status: 'draft',
      invoice_number: `DRAFT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${localId.slice(-4).toUpperCase()}`,
      client_name: form.client_name.trim(),
      client_email: form.client_email || null,
      client_address: form.client_address || null,
      client_phone: form.client_phone || null,
      client_gstin: (() => {
        const g = normalizePartyGstin(form.client_gstin);
        return g && PARTY_GSTIN_RE.test(g) ? g : null;
      })(),
      buyer_state: form.buyer_state || null,
      place_of_supply: form.buyer_state || null,
      issue_date: form.issue_date || today,
      due_date: form.due_date || null,
      subtotal,
      tax_rate: Number(form.tax_rate) || 0,
      tax_amount: taxAmount,
      discount_amount: Number(form.discount_amount) || 0,
      total_amount: totalAmount,
      amount_paid: 0,
      balance_due: totalAmount,
      items: (form.items || []).map((i) => ({
        product_id: i.product_id || null,
        description: i.description,
        hsn_code: i.hsn_code || null,
        quantity: Number(i.quantity) || 0,
        unit_price: Number(i.unit_price) || 0,
        item_discount: Number(i.item_discount) || 0,
        total: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0) - (Number(i.item_discount) || 0),
      })),
      created_at: nowIso,
      updated_at: nowIso,
    };

    const all = loadLocalInvoices(business.id);
    const idx = all.findIndex((x) => x.id === localId);
    if (idx >= 0) all[idx] = { ...all[idx], ...draftInvoice };
    else all.unshift(draftInvoice);
    upsertLocalInvoices(business.id, all);
    return true;
  }, [activeDraftId, business?.id, form, today]);

  const [paymentForm, setPaymentForm] = useState({
    amount: 0, payment_date: today, payment_method: 'cash', reference: '', notes: ''
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const bizId = business?.id;
    const offlineNow = typeof navigator !== 'undefined' ? !navigator.onLine : true;
    const limit = 15;

    if (bizId) pruneExpiredLocalDrafts(bizId);
    const localAll = bizId ? loadLocalInvoices(bizId) : [];
    const q = (search || '').trim().toLowerCase();
    const matchSearch = (inv) => {
      if (!q) return true;
      const invNo = (inv.invoice_number || '').toString().toLowerCase();
      const client = (inv.client_name || '').toString().toLowerCase();
      return invNo.includes(q) || client.includes(q);
    };
    const matchStatus = (inv) => {
      if (filterStatus === 'all') return true;
      return (inv.status || '') === filterStatus;
    };
    const localFiltered = localAll
      .filter(matchSearch)
      .filter(matchStatus)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (offlineNow) {
      const localUnique = dedupeInvoicesForOffline(localFiltered);
      const start = (page - 1) * limit;
      setInvoices(localUnique.slice(start, start + limit));
      setTotal(localUnique.length);
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('search', search);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await api.get(`/finance/invoices?${params}`, { timeout: 8000 });

      const serverInvoices = res.data.invoices || [];
      const serverTotal = res.data.total || 0;

      if (bizId) upsertServerInvoices(bizId, serverInvoices);

      // Append local pending only on page 1 to keep pagination mostly stable.
      const localPending = localFiltered.filter((i) => i.sync_status !== 'synced');
      const merged = page === 1 ? [...localPending, ...serverInvoices] : serverInvoices;
      const mergedTotal = serverTotal + (page === 1 ? localPending.length : 0);

      setInvoices(merged);
      setTotal(mergedTotal);
    } catch {
      // Network failure fallback: show local invoices.
      const localUnique = dedupeInvoicesForOffline(localFiltered);
      const start = (page - 1) * limit;
      setInvoices(localUnique.slice(start, start + limit));
      setTotal(localUnique.length);
    }
    setLoading(false);
  }, [api, business?.id, page, search, filterStatus]);

  useEffect(() => {
    setSelectedInvoiceIds((prev) => prev.filter((id) => invoices.some((inv) => inv.id === id)));
  }, [invoices]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    if (!business?.id) return;
    if (typeof navigator === 'undefined') return;

    const runSync = async () => {
      try {
        await syncOfflineInvoiceQueue({ api, businessId: business.id });
      } catch {
        // ignore for MVP
      } finally {
        if (navigator.onLine) fetchInvoices();
      }
    };

    if (navigator.onLine) runSync();
    window.addEventListener('online', runSync);
    return () => window.removeEventListener('online', runSync);
  }, [api, business?.id, fetchInvoices]);

  // Cache all server invoices locally (so offline invoice list works).
  useEffect(() => {
    if (!business?.id) return;
    if (typeof navigator === 'undefined') return;
    if (!navigator.onLine) return;

    let cancelled = false;
    const run = async () => {
      try {
        const limit = 50;
        let pageNum = 1;
        const allServerInvoices = [];
        // Cache without search/status filters; offline UI does filtering locally.
        while (true) {
          const params = new URLSearchParams({ page: pageNum, limit });
          const res = await api.get(`/finance/invoices?${params}`, { timeout: 8000 });
          if (cancelled) return;
          const invs = res.data?.invoices || [];
          allServerInvoices.push(...invs);
          upsertServerInvoices(business.id, invs);
          const pages = Number(res.data?.pages || 1);
          if (pageNum >= pages) break;
          pageNum += 1;
        }
        reconcileServerInvoiceCache(
          business.id,
          allServerInvoices.map((x) => x?.id).filter(Boolean)
        );
      } catch {
        // ignore: caching is best-effort for MVP
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [api, business?.id]);

  useEffect(() => {
    api.get('/dashboard/settings')
      .then(r => {
        const b = r.data?.business || {};
        setBusinessName(b.name || '');
        setWhatsappApiReady(Boolean((b.wati_api_endpoint || '').trim() && (b.wati_api_token || '').trim()));
      })
      .catch(() => {});
  }, [api]);

  const resetForm = () => {
    // Restore saved custom field labels with empty values
    const savedLabels = getSavedPref('cfLabels', []);
    const restoredCF = savedLabels.map(label => ({ label, value: '' }));
    const hsn = getSavedPref('hsn', false);
    const itemDisc = getSavedPref('itemDisc', false);
    const hasCF = restoredCF.length > 0;
    setShowHSN(hsn);
    setShowItemDiscount(itemDisc);
    setShowCustomFields(hasCF);
    setForm({
      client_name: '', client_email: '', client_address: '', client_phone: '', client_gstin: '',
      issue_date: today, due_date: '', tax_rate: 0, discount_amount: 0,
      notes: '', currency: 'INR', buyer_state: '',
      items: [{ ...emptyItem }], custom_fields: restoredCF
    });
  };

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    const qty = Number(items[idx].quantity) || 0;
    const price = Number(items[idx].unit_price) || 0;
    const disc = Number(items[idx].item_discount) || 0;
    items[idx].amount = qty * price - disc;
    if (field === 'quantity' && items[idx].available_stock !== null && qty > Number(items[idx].available_stock)) {
      toast.error(`Insufficient stock. Available: ${items[idx].available_stock}`);
    }
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const addCustomField = () => setForm({ ...form, custom_fields: [...form.custom_fields, { label: '', value: '' }] });
  const updateCustomField = (idx, key, val) => {
    const cf = [...form.custom_fields];
    cf[idx] = { ...cf[idx], [key]: val };
    setForm({ ...form, custom_fields: cf });
    // Save label names so they persist next session
    if (key === 'label') {
      const labels = cf.map(f => f.label).filter(Boolean);
      savePref('cfLabels', labels);
    }
  };
  const removeCustomField = (idx) => {
    const cf = form.custom_fields.filter((_, i) => i !== idx);
    setForm({ ...form, custom_fields: cf });
    savePref('cfLabels', cf.map(f => f.label).filter(Boolean));
    if (cf.length === 0) { setShowCustomFields(false); savePref('customFields', false); }
  };

  const subtotal = form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const taxAmount = subtotal * (form.tax_rate / 100);
  const totalAmount = subtotal + taxAmount - (form.discount_amount || 0);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.due_date) { toast.error('Due date is required'); return; }
    if (form.items.some(i => !i.description)) { toast.error('All items need a description'); return; }
    const partyGstin = normalizePartyGstin(form.client_gstin);
    if (partyGstin && !PARTY_GSTIN_RE.test(partyGstin)) {
      toast.error('Party GSTIN must be exactly 15 letters or digits');
      return;
    }
    setCreating(true);
    const offlineNow = typeof navigator !== 'undefined' ? !navigator.onLine : true;
    try {
      if (offlineNow) {
        if (!business?.id) throw new Error('Business context missing');
        if (activeDraftId) removeLocalInvoiceById(activeDraftId);
        const localInv = createLocalInvoiceAndQueue({ businessId: business.id, business, form });
        toast.success('Saved offline. Will sync when online.');
        setShowCreate(false);
        setActiveDraftId(null);
        resetForm();
        fetchInvoices();
        navigate(`/finance/invoices/${localInv.id}`);
        return;
      }

      const { client_gstin: _omitGstin, ...formWithoutGstin } = form;
      const res = await api.post('/finance/invoices', {
        ...formWithoutGstin,
        ...(partyGstin ? { client_gstin: partyGstin } : {}),
        buyer_state: form.buyer_state || null,
        place_of_supply: form.buyer_state || null,
        custom_fields: form.custom_fields.filter(f => f.label && f.value),
        items: form.items.map(i => ({
          product_id: i.product_id || null,
          description: i.description,
          hsn_code: i.hsn_code || null,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          item_discount: Number(i.item_discount) || 0
        }))
      });
      toast.success('Invoice created');
      if (activeDraftId) removeLocalInvoiceById(activeDraftId);
      setShowCreate(false);
      setActiveDraftId(null);
      resetForm();
      fetchInvoices();
      if (res.data.id) navigate(`/finance/invoices/${res.data.id}`);
    } catch (e) {
      // If we got here due to network/offline, queue locally.
      try {
        if (!business?.id) throw e;
        if (activeDraftId) removeLocalInvoiceById(activeDraftId);
        const localInv = createLocalInvoiceAndQueue({ businessId: business.id, business, form });
        // If we were online but the API call failed, try syncing immediately in background.
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          syncOfflineInvoiceQueue({ api, businessId: business.id })
            .then(() => fetchInvoices())
            .catch(() => {});
        }
        toast.success('Saved offline. Will sync when online.');
        setShowCreate(false);
        setActiveDraftId(null);
        resetForm();
        fetchInvoices();
        navigate(`/finance/invoices/${localInv.id}`);
      } catch (e2) {
        toast.error(e.response?.data?.detail || 'Failed to create invoice');
      }
    } finally {
      setCreating(false);
    }
  };

  // Send email removed from invoices list

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      if (deleteConfirm.sync_status === 'local_draft') {
        removeLocalInvoiceById(deleteConfirm.id);
      } else {
        await api.delete(`/finance/invoices/${deleteConfirm.id}`);
      }
      toast.success('Invoice deleted');
      setDeleteConfirm(null);
      fetchInvoices();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete invoice');
    }
    setDeleting(false);
  };

  const handleCreateDialogOpenChange = (open) => {
    if (open) setShowCreate(true);
  };

  const closeCreateModalClean = () => {
    setInvoiceClosePrompt(false);
    setShowCreate(false);
    setActiveDraftId(null);
    resetForm();
  };

  /** X button: always discard, no confirmation; remove active local draft if editing one. */
  const discardCreateViaX = () => {
    if (creating) return;
    if (activeDraftId && business?.id) removeLocalInvoiceById(activeDraftId);
    setInvoiceClosePrompt(false);
    setShowCreate(false);
    setActiveDraftId(null);
    resetForm();
    fetchInvoices();
  };

  /** Overlay / Cancel / Escape: empty form closes; otherwise prompt Save draft / Discard. */
  const requestCloseCreateModal = () => {
    if (creating) return;
    if (!hasInvoiceFormAnyData(form)) {
      closeCreateModalClean();
      return;
    }
    setInvoiceClosePrompt(true);
  };

  const confirmSaveDraftAndClose = () => {
    if (!canSaveInvoiceDraft(form)) {
      toast.error('Add client name and at least one line item with description and amount greater than 0 to save a draft.');
      return;
    }
    if (saveDraftFromForm()) {
      toast.success('Draft saved');
      setInvoiceClosePrompt(false);
      setShowCreate(false);
      setActiveDraftId(null);
      resetForm();
      fetchInvoices();
    } else {
      toast.error('Could not save draft.');
    }
  };

  const confirmDiscardAndClose = () => {
    if (activeDraftId && business?.id) removeLocalInvoiceById(activeDraftId);
    setInvoiceClosePrompt(false);
    setShowCreate(false);
    setActiveDraftId(null);
    resetForm();
    fetchInvoices();
  };

  const openDraftForEdit = (inv) => {
    setInvoiceClosePrompt(false);
    setActiveDraftId(inv.id);
    setForm({
      client_name: inv.client_name || '',
      client_email: inv.client_email || '',
      client_address: inv.client_address || '',
      client_phone: inv.client_phone || '',
      client_gstin: inv.client_gstin || '',
      issue_date: inv.issue_date || today,
      due_date: inv.due_date || '',
      tax_rate: Number(inv.tax_rate) || 0,
      discount_amount: Number(inv.discount_amount) || 0,
      notes: inv.notes || '',
      currency: inv.currency || 'INR',
      buyer_state: inv.buyer_state || '',
      items: (inv.items || []).length ? inv.items.map((i) => ({
        ...emptyItem,
        ...i,
        amount: Number(i.total) || ((Number(i.quantity) || 0) * (Number(i.unit_price) || 0) - (Number(i.item_discount) || 0)),
      })) : [{ ...emptyItem }],
      custom_fields: Array.isArray(inv.custom_fields) ? inv.custom_fields : [],
    });
    setShowCreate(true);
  };

  const toggleSelectAll = (checked) => {
    if (!checked) {
      setSelectedInvoiceIds([]);
      return;
    }
    setSelectedInvoiceIds(invoices.map((inv) => inv.id));
  };

  const toggleSelectInvoice = (id, checked) => {
    setSelectedInvoiceIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id));
  };

  const handleBulkDelete = async () => {
    if (!selectedInvoiceIds.length) return;
    if (!window.confirm(`Delete ${selectedInvoiceIds.length} selected invoice(s)?`)) return;
    let deleted = 0;
    for (const id of selectedInvoiceIds) {
      const inv = invoices.find((x) => x.id === id);
      if (!inv) continue;
      try {
        if (inv.sync_status === 'local_draft') {
          removeLocalInvoiceById(id);
        } else if (inv.sync_status !== 'local_pending') {
          await api.delete(`/finance/invoices/${id}`);
        }
        deleted += 1;
      } catch {
        // Continue with remaining invoices
      }
    }
    setSelectedInvoiceIds([]);
    fetchInvoices();
    toast.success(`${deleted} invoice(s) deleted`);
  };

  const draftCount = business?.id ? countDraftInvoices(business.id) : 0;

  const openPayment = (inv) => {
    setPaymentInvoice(inv);
    setPaymentForm({ amount: Number(inv.balance_due) || 0, payment_date: today, payment_method: 'cash', reference: '', notes: '' });
    setShowPayment(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setPaying(true);
    const offlineNow = typeof navigator !== 'undefined' ? !navigator.onLine : true;
    const isLocalPending = paymentInvoice?.sync_status === 'local_pending';
    try {
      if (offlineNow || isLocalPending) {
        if (!business?.id) throw new Error('Business context missing');
        recordLocalPaymentAndQueue({
          businessId: business.id,
          localInvoiceId: paymentInvoice.id,
          form: paymentForm,
        });
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          syncOfflineInvoiceQueue({ api, businessId: business.id })
            .then(fetchInvoices)
            .catch(() => {});
        }
        toast.success('Payment saved offline. Will sync when online.');
        setShowPayment(false);
        fetchInvoices();
        return;
      }

      await api.post(`/finance/invoices/${paymentInvoice.id}/payments`, paymentForm);
      toast.success('Payment recorded');
      setShowPayment(false);
      fetchInvoices();
    } catch (e) {
      if (!offlineNow) {
        toast.error(e.response?.data?.detail || 'Failed to record payment');
        return;
      }
      // Offline/network fallback: queue locally.
      try {
        if (!business?.id) throw e;
        recordLocalPaymentAndQueue({
          businessId: business.id,
          localInvoiceId: paymentInvoice.id,
          form: paymentForm,
        });
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          syncOfflineInvoiceQueue({ api, businessId: business.id })
            .then(fetchInvoices)
            .catch(() => {});
        }
        toast.success('Payment saved offline. Will sync when online.');
        setShowPayment(false);
        fetchInvoices();
      } catch (e2) {
        toast.error(e.response?.data?.detail || e2.message || 'Failed to record payment');
      }
    }
    setPaying(false);
  };

  const sendReminder = async (inv) => {
    if (whatsappApiReady && typeof navigator !== 'undefined' && navigator.onLine && inv?.id && inv?.sync_status !== 'local_pending') {
      try {
        await api.post(`/finance/invoices/${inv.server_invoice_id || inv.id}/send-whatsapp-api`);
        toast.success('WhatsApp reminder sent via API');
        return;
      } catch (e) {
        toast.error(e.response?.data?.detail || 'WhatsApp API failed, opening WhatsApp Web');
      }
    }
    const phone = (inv.client_phone || '').replace(/[^0-9]/g, '');
    const invoiceUrl = `${window.location.origin}/invoice/${inv.id}`;
    const message = [
      `Hello ${inv.client_name}!`,
      '',
      `This is a gentle reminder from *${businessName || 'Our Store'}* regarding your pending payment.`,
      '',
      `Invoice No: ${inv.invoice_number}`,
      `Amount Due: ${fmt(inv.balance_due || inv.total_amount)}`,
      `Due Date: ${fmtDate(inv.due_date)}`,
      '',
      `View your invoice here:`,
      invoiceUrl,
      '',
      `Kindly arrange the payment at your earliest convenience.`,
      `Thank you for your business!`
    ].join('\n');
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    toastAfterWhatsAppOpen('WhatsApp reminder opened!');
  };

  const sendAllReminders = async () => {
    const candidates = (invoices || []).filter((inv) =>
      ['draft', 'sent', 'partially_paid', 'overdue'].includes(inv.status) &&
      Number(inv.balance_due || 0) > 0 &&
      !!(inv.client_phone || '').trim()
    );
    if (!candidates.length) {
      toast.error('No invoice reminders to send');
      return;
    }

    // API mode: one backend call for all.
    if (whatsappApiReady && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const eligibleIds = candidates
          .filter((i) => i.sync_status !== 'local_pending')
          .map((i) => i.server_invoice_id || i.id)
          .filter(Boolean);
        const res = await api.post('/finance/reminders/whatsapp/send-all', { invoice_ids: eligibleIds });
        toast.success(`WhatsApp API: sent ${res.data?.sent || 0}, failed ${res.data?.failed || 0}`);
        return;
      } catch (e) {
        toast.error(e.response?.data?.detail || 'API bulk send failed, opening WhatsApp Web');
      }
    }

    // Web fallback: open one-by-one.
    for (let i = 0; i < candidates.length; i += 1) {
      const inv = candidates[i];
      const phone = (inv.client_phone || '').replace(/[^0-9]/g, '');
      const invoiceUrl = `${window.location.origin}/invoice/${inv.id}`;
      const message = [
        `Hello ${inv.client_name}!`,
        '',
        `This is a gentle reminder from *${businessName || 'Our Store'}* regarding your pending payment.`,
        '',
        `Invoice No: ${inv.invoice_number}`,
        `Amount Due: ${fmt(inv.balance_due || inv.total_amount)}`,
        `Due Date: ${fmtDate(inv.due_date)}`,
        '',
        `View your invoice here:`,
        invoiceUrl,
      ].join('\n');
      const waUrl = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      if (i < candidates.length - 1) {
        // Small delay so tabs don't get blocked.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }
    toastAfterWhatsAppOpen(`Opened ${candidates.length} WhatsApp reminder(s)`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Invoices</h1>
            <p className="text-sm text-gray-500 font-sans flex flex-wrap items-center gap-2">
              <span>{total} invoices</span>
              {draftCount > 0 ? (
                <span className="inline-flex items-center rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                  {draftCount} draft{draftCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </p>
          </div>
          {user?.role !== "ca_admin" && (
            <button
              onClick={() => {
                setInvoiceClosePrompt(false);
                setActiveDraftId(null);
                resetForm();
                setShowCreate(true);
              }}
              className="btn-premium btn-primary"
            >
              <Plus size={16} /> Create Invoice
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Search invoices..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-premium pl-10 text-sm h-10 w-full" />
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="input-premium w-auto text-sm h-10 pr-8">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <button
            onClick={sendAllReminders}
            className="btn-premium text-sm h-10 px-3 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            Send All WhatsApp
          </button>
          {selectedInvoiceIds.length > 0 && (
            <button onClick={handleBulkDelete} className="btn-premium text-sm h-10 px-3 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
              Delete Selected ({selectedInvoiceIds.length})
            </button>
          )}
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="table-premium w-full">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={invoices.length > 0 && selectedInvoiceIds.length === invoices.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Invoice #</th><th>Client</th><th>Amount</th>
                <th>Due Date</th><th>Status</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-8">Loading...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-12">No invoices yet</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedInvoiceIds.includes(inv.id)}
                      onChange={(e) => toggleSelectInvoice(inv.id, e.target.checked)}
                    />
                  </td>
                  <td className="text-white text-sm font-medium font-mono">{inv.invoice_number}</td>
                  <td>
                    <p className="text-sm text-white">{inv.client_name}</p>
                    {(inv.client_phone || inv.client_email) && (
                      <p className="text-xs text-gray-500">{inv.client_phone || inv.client_email}</p>
                    )}
                  </td>
                  <td>
                    <p className="text-sm text-gold-400 font-semibold">{fmt(inv.total_amount)}</p>
                    {inv.balance_due > 0 && inv.balance_due < inv.total_amount && (
                      <p className="text-[10px] text-amber-400">Due: {fmt(inv.balance_due)}</p>
                    )}
                  </td>
                  <td className="text-sm text-gray-400">{fmtDate(inv.due_date)}</td>
                  <td><span className={`badge-premium ${STATUS_COLORS[inv.status] || 'badge-neutral'}`}>{inv.status?.replace('_', ' ')}</span></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => inv.sync_status === 'local_draft' ? openDraftForEdit(inv) : navigate(`/finance/invoices/${inv.id}`)}
                        className="p-1.5 text-gray-400 hover:text-white"
                        title={inv.sync_status === 'local_draft' ? 'Edit Draft' : 'View'}
                      >
                        <Eye size={15} />
                      </button>
                      {/* Send Email removed */}
                      {['draft','sent','partially_paid','overdue'].includes(inv.status) && (
                        <button onClick={() => sendReminder(inv)} className="p-1.5 rounded-lg hover:bg-emerald-500/10" style={{ color: '#25d366' }} title="WhatsApp Reminder"><Bell size={15} /></button>
                      )}
                      {['draft','sent','partially_paid','overdue'].includes(inv.status) && (
                        <button onClick={() => openPayment(inv)} className="p-1.5 text-emerald-400 hover:text-emerald-300" title="Record Payment"><CheckCircle size={15} /></button>
                      )}
                      {user?.role !== "ca_admin" && (
                        <button
                          onClick={() => setDeleteConfirm(inv)}
                          disabled={(inv.sync_status !== 'local_draft' && inv.sync_status === 'local_pending') || (inv.sync_status !== 'local_draft' && (typeof navigator !== 'undefined' && !navigator.onLine))}
                          className="p-1.5 text-rose-400/50 hover:text-rose-400 disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > 15 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <span className="text-xs text-gray-500">Page {page} of {Math.ceil(total / 15)}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-premium btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Prev</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 15)} className="btn-premium btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-white text-lg">Delete Invoice?</DialogTitle></DialogHeader>
          {deleteConfirm && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <p className="text-sm text-white font-medium">{deleteConfirm.invoice_number}</p>
                <p className="text-xs text-gray-400 mt-1">{deleteConfirm.client_name} · {fmt(deleteConfirm.total_amount)}</p>
              </div>
              <p className="text-sm text-gray-400">This action <span className="text-rose-400 font-semibold">cannot be undone</span>.</p>
              {deleteConfirm.status === 'paid' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400 font-medium">Warning: This invoice is marked as paid.</p>
                </div>
              )}
              <DialogFooter>
                <button onClick={() => setDeleteConfirm(null)} className="btn-premium btn-secondary">Cancel</button>
                <button onClick={handleDeleteConfirmed} disabled={deleting}
                  className="btn-premium px-4 py-2 rounded-xl text-sm font-medium bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 disabled:opacity-50">
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save vs discard when closing create modal with unsaved data */}
      <Dialog open={invoiceClosePrompt} onOpenChange={(o) => { if (!o) setInvoiceClosePrompt(false); }}>
        <DialogContent className="bg-void border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg">Save as draft or discard?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">Your invoice isn&apos;t finished. Choose what to do with it.</p>
          <DialogFooter className="gap-2 sm:gap-2">
            <button type="button" onClick={() => setInvoiceClosePrompt(false)} className="btn-premium btn-secondary">
              Keep editing
            </button>
            <button type="button" onClick={confirmDiscardAndClose} className="btn-premium border border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
              Discard
            </button>
            <button
              type="button"
              onClick={confirmSaveDraftAndClose}
              disabled={!canSaveInvoiceDraft(form)}
              className="btn-premium btn-primary disabled:opacity-40 disabled:pointer-events-none"
            >
              Save draft
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={handleCreateDialogOpenChange}>
        <DialogContent
          hideCloseButton
          className="bg-void border-white/10 max-w-3xl max-h-[92vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            e.preventDefault();
            requestCloseCreateModal();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            requestCloseCreateModal();
          }}
        >
          <DialogHeader className="flex flex-row items-start justify-between gap-4 pr-10">
            <DialogTitle className="font-display text-white">Create Invoice</DialogTitle>
            <button
              type="button"
              onClick={discardCreateViaX}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close and discard"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">

            {/* Client */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Client Name *</Label>
                <ClientSearch
                  value={form.client_name}
                  onChange={(val) => setForm({...form, client_name: val})}
                  onSelect={(c) => setForm({
                    ...form,
                    client_name: c.name || '',
                    client_phone: c.phone || '',
                    client_email: c.email || '',
                    client_address: (c.address != null ? String(c.address) : '') || '',
                    client_gstin: (c.gstin || '')
                      .toString()
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, '')
                      .slice(0, 15),
                    buyer_state: matchIndianStateName(c.state),
                  })}
                  api={api}
                  businessId={business?.id}
                  offline={offlineNow}
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Client Phone</Label>
                <Input className="input-premium mt-1" placeholder="+919876543210" value={form.client_phone} onChange={e => setForm({...form, client_phone: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Client Email</Label>
                <Input type="email" className="input-premium mt-1" value={form.client_email} onChange={e => setForm({...form, client_email: e.target.value})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Client Address</Label>
                <Input className="input-premium mt-1" value={form.client_address} onChange={e => setForm({...form, client_address: e.target.value})} />
              </div>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Party GSTIN (Optional)</Label>
              <Input
                className="input-premium mt-1 font-mono uppercase"
                placeholder="e.g. 27AAPFU0939F1ZV"
                maxLength={15}
                value={form.client_gstin}
                onChange={(e) => setForm({ ...form, client_gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
              />
            </div>

            {/* Dates + Tax */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Issue Date *</Label>
                <DateInput className="input-premium mt-1" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Due Date *</Label>
                <DateInput className="input-premium mt-1" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Tax Rate (%)</Label>
                <Input type="number" min="0" className="input-premium mt-1" value={form.tax_rate} onChange={e => setForm({...form, tax_rate: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Overall Discount (₹)</Label>
                <Input type="number" min="0" className="input-premium mt-1" value={form.discount_amount} onChange={e => setForm({...form, discount_amount: parseFloat(e.target.value) || 0})} />
              </div>
            </div>

            {/* Buyer State for GST */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Buyer State <span className="text-gold-400">(for GST auto-calculation)</span></Label>
                <select className="input-premium mt-1 w-full" value={form.buyer_state} onChange={e => setForm({...form, buyer_state: e.target.value})}>
                  <option value="">Select buyer state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {form.tax_rate > 0 && form.buyer_state && (
                <div className="flex items-center">
                  <div className={`p-3 rounded-xl w-full text-xs ${form.buyer_state ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-white/5 border border-white/10'}`}>
                    <p className="text-gray-400 mb-1">GST Type</p>
                    {/* This will be determined by seller state on backend */}
                    <p className="font-semibold text-blue-400">
                      Auto-calculated on save
                    </p>
                    <p className="text-gray-600 text-[10px] mt-0.5">CGST+SGST or IGST based on states</p>
                  </div>
                </div>
              )}
            </div>

            {/* Optional columns toggles */}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowHSN(!showHSN)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${showHSN ? 'border-gold-500/40 text-gold-400 bg-gold-500/10' : 'border-white/10 text-gray-500 hover:text-gray-300'}`}>
                {showHSN ? '✓' : '+'} HSN/SAC Code
              </button>
              <button type="button" onClick={() => setShowItemDiscount(!showItemDiscount)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${showItemDiscount ? 'border-gold-500/40 text-gold-400 bg-gold-500/10' : 'border-white/10 text-gray-500 hover:text-gray-300'}`}>
                {showItemDiscount ? '✓' : '+'} Per-Item Discount
              </button>
              <button type="button" onClick={() => { setShowCustomFields(!showCustomFields); if (!showCustomFields && form.custom_fields.length === 0) addCustomField(); }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${showCustomFields ? 'border-gold-500/40 text-gold-400 bg-gold-500/10' : 'border-white/10 text-gray-500 hover:text-gray-300'}`}>
                {showCustomFields ? '✓' : '+'} Custom Fields (Veh No, Job No etc.)
              </button>
            </div>

            {/* Custom fields */}
            {showCustomFields && (
              <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Custom Fields</p>
                  <button type="button" onClick={addCustomField} className="text-xs text-gold-400 hover:text-gold-300">+ Add Field</button>
                </div>
                {form.custom_fields.map((cf, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                    <div className="col-span-2">
                      <Input placeholder="Label (e.g. Veh No)" className="input-premium text-xs" value={cf.label} onChange={e => updateCustomField(idx, 'label', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input placeholder="Value (e.g. UK07AX4657)" className="input-premium text-xs" value={cf.value} onChange={e => updateCustomField(idx, 'value', e.target.value)} />
                    </div>
                    <div className="text-center">
                      <button type="button" onClick={() => removeCustomField(idx)} className="text-rose-400/50 hover:text-rose-400 p-1"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400 text-xs">Line Items *</Label>
                <button type="button" onClick={addItem} className="text-xs text-gold-400 hover:text-gold-300">+ Add Item</button>
              </div>
              <div className="space-y-2">
                {/* Header row */}
                <div className={`grid gap-2 text-[10px] text-gray-600 uppercase tracking-wider px-1`}
                  style={{ gridTemplateColumns: showHSN ? (showItemDiscount ? '3fr 1fr 1fr 1.2fr 1fr 0.8fr 0.3fr' : '3fr 1fr 1fr 1.2fr 0.8fr 0.3fr') : (showItemDiscount ? '3fr 1fr 1.2fr 1fr 0.8fr 0.3fr' : '3fr 1fr 1.2fr 0.8fr 0.3fr') }}>
                  <span>Description</span>
                  {showHSN && <span>HSN/SAC</span>}
                  <span>Qty</span>
                  <span>Rate</span>
                  {showItemDiscount && <span>Disc (₹)</span>}
                  <span>Amount</span>
                  <span></span>
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid gap-2 items-center"
                    style={{ gridTemplateColumns: showHSN ? (showItemDiscount ? '3fr 1fr 1fr 1.2fr 1fr 0.8fr 0.3fr' : '3fr 1fr 1fr 1.2fr 0.8fr 0.3fr') : (showItemDiscount ? '3fr 1fr 1.2fr 1fr 0.8fr 0.3fr' : '3fr 1fr 1.2fr 0.8fr 0.3fr') }}>
                    <ProductSearch
                      value={item.description}
                      onChange={(val) => updateItem(idx, 'description', val)}
                      onSelect={(product) => {
                        const items = [...form.items];
                        items[idx] = {
                          ...items[idx],
                          product_id: product.id,
                          available_stock: typeof product.current_stock === 'number' ? product.current_stock : Number(product.current_stock ?? 0),
                          minimum_stock: typeof product.minimum_stock === 'number' ? product.minimum_stock : Number(product.minimum_stock ?? 0),
                          description: product.name,
                          unit_price: product.unit_price,
                          hsn_code: product.hsn_code || items[idx].hsn_code || '',
                          amount: (items[idx].quantity * product.unit_price) - (items[idx].item_discount || 0)
                        };
                        setForm({ ...form, items });
                        if (!showHSN && product.hsn_code) setShowHSN(true);
                      }}
                      api={api}
                      businessId={business?.id}
                      offline={offlineNow}
                    />
                    {showHSN && <Input placeholder="HSN" className="input-premium text-sm" value={item.hsn_code} onChange={e => updateItem(idx, 'hsn_code', e.target.value)} />}
                    <Input type="number" min="0" placeholder="Qty" className="input-premium text-sm" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                    <Input type="number" min="0" placeholder="Rate" className="input-premium text-sm" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                    {showItemDiscount && <Input type="number" min="0" placeholder="0" className="input-premium text-sm" value={item.item_discount} onChange={e => updateItem(idx, 'item_discount', e.target.value)} />}
                    <div className="text-sm text-gold-400 font-semibold text-right">{fmt(item.amount)}</div>
                    <div className="text-center">
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-rose-400/50 hover:text-rose-400 p-1"><Trash2 size={13} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-white/5 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              {form.tax_rate > 0 && <div className="flex justify-between text-gray-400"><span>Tax ({form.tax_rate}%)</span><span>{fmt(taxAmount)}</span></div>}
              {form.discount_amount > 0 && <div className="flex justify-between text-rose-400"><span>Discount</span><span>-{fmt(form.discount_amount)}</span></div>}
              <div className="flex justify-between text-white font-semibold text-base pt-2 border-t border-white/5">
                <span>Total</span><span className="text-gold-400">{fmt(totalAmount)}</span>
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-xs">Notes</Label>
              <textarea className="input-premium mt-1 h-16 resize-none w-full" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>

            <DialogFooter>
              <button type="button" onClick={requestCloseCreateModal} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={creating} className="btn-premium btn-primary">{creating ? 'Creating...' : 'Create Invoice'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-white">Record Payment</DialogTitle></DialogHeader>
          {paymentInvoice && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-sm text-white font-medium">{paymentInvoice.client_name}</p>
                <p className="text-xs text-gray-500">{paymentInvoice.invoice_number}</p>
                <p className="text-xs text-gray-500 mt-1">Balance Due: <span className="text-gold-400 font-semibold">{fmt(paymentInvoice.balance_due)}</span></p>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Amount *</Label>
                <Input type="number" min="1" step="0.01" className="input-premium mt-1" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Payment Date *</Label>
                <DateInput className="input-premium mt-1" value={paymentForm.payment_date} onChange={e => setPaymentForm({...paymentForm, payment_date: e.target.value})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Payment Method</Label>
                <select className="input-premium mt-1 w-full" value={paymentForm.payment_method} onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Reference</Label>
                <Input className="input-premium mt-1" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} placeholder="Transaction ID, UPI ref etc." />
              </div>
              <DialogFooter>
                <button type="button" onClick={() => setShowPayment(false)} className="btn-premium btn-secondary">Cancel</button>
                <button type="submit" disabled={paying} className="btn-premium btn-primary">{paying ? 'Recording...' : 'Record Payment'}</button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
