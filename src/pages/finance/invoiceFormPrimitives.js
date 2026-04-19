import React, { useState, useEffect, useRef } from 'react';

export const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export const emptyItem = {
  product_id: null,
  available_stock: null,
  minimum_stock: null,
  description: '',
  hsn_code: '',
  quantity: 1,
  unit_price: 0,
  item_discount: 0,
  amount: 0,
  line_tax_rate: 0,
};

export const PARTY_GSTIN_RE = /^[A-Z0-9]{15}$/;
export function normalizePartyGstin(s) {
  return (s || '').trim().toUpperCase();
}

/** Line items included in totals, preview, and API (must have description). */
export function filterInvoiceItemsForSave(items) {
  return (items || []).filter((i) => String(i?.description || '').trim());
}

/** True if the row is not a pristine blank buffer (default qty 1, rest empty). */
export function itemRowHasDraftSignal(i) {
  if (!i) return false;
  if (String(i.description || '').trim()) return true;
  if (Number(i.unit_price || 0) > 0) return true;
  if (Number(i.item_discount || 0) > 0) return true;
  if (Number(i.line_tax_rate || 0) > 0) return true;
  if (String(i.hsn_code || '').trim()) return true;
  if (Number(i.quantity) !== 1) return true;
  return false;
}

/** After the last filled row, ensure one empty row exists (convenience for typing next line). */
export function padInvoiceItemsTrailingBlank(items) {
  const list =
    Array.isArray(items) && items.length
      ? items.map((x) => ({ ...emptyItem, ...x }))
      : [{ ...emptyItem }];
  const last = list[list.length - 1];
  if (String(last.description || '').trim()) {
    list.push({ ...emptyItem });
  }
  return list;
}

export function hasInvoiceFormAnyData(f) {
  if (!f) return false;
  if ((f.client_name || '').trim()) return true;
  if ((f.client_phone || '').trim()) return true;
  if ((f.client_email || '').trim()) return true;
  if ((f.client_address || '').trim()) return true;
  if ((f.client_gstin || '').trim()) return true;
  if ((f.notes || '').trim()) return true;
  if ((f.buyer_state || '').trim()) return true;
  if (Number(f.tax_rate || 0) > 0 || Number(f.discount_amount || 0) > 0) return true;
  if (f.per_item_tax) return true;
  if ((f.custom_fields || []).some((cf) => (cf?.label || '').trim() || (cf?.value || '').trim())) return true;
  return (f.items || []).some((i) => itemRowHasDraftSignal(i));
}

export function canSaveInvoiceDraft(f) {
  if (!f || !(f.client_name || '').trim()) return false;
  return (f.items || []).some((i) => {
    if (!(i.description || '').trim()) return false;
    const qty = Number(i.quantity) || 0;
    const rate = Number(i.unit_price) || 0;
    const disc = Number(i.item_discount) || 0;
    return qty * rate - disc > 0;
  });
}

export function safeJsonParse(v, fallback) {
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

export function matchIndianStateName(raw) {
  const t = (raw || '').trim();
  if (!t) return '';
  const m = INDIAN_STATES.find((s) => s.toLowerCase() === t.toLowerCase());
  return m || t;
}

export function ClientSearch({ value, onChange, onSelect, api, businessId, offline }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

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
          <div
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 12,
              height: 12,
              border: '2px solid #555',
              borderTopColor: '#D4AF37',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
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
            <div style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>
              No customers found — continue typing to add manually
            </div>
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

export function ProductSearch({ value, onChange, onSelect, api, businessId, offline }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

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
    if (val.length < 1) {
      setResults([]);
      setShow(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
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
        } catch { /* ignore */ }
      } catch {
        setResults([]);
      }
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
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.length >= 1 && results.length > 0 && setShow(true)}
          autoComplete="off"
        />
        {searching && (
          <div
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 12,
              height: 12,
              border: '2px solid #555',
              borderTopColor: '#D4AF37',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        )}
      </div>
      {show && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 999,
            background: '#0d0d14',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            marginTop: 4,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => selectProduct(p)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div>
                <p style={{ color: '#f9fafb', fontSize: 13, fontWeight: 500, margin: 0 }}>{p.name}</p>
                {p.sku && <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>SKU: {p.sku}</p>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                <p style={{ color: '#D4AF37', fontSize: 13, fontWeight: 600, margin: 0 }}>
                  ₹{Number(p.unit_price).toLocaleString('en-IN')}
                </p>
                <p
                  style={{
                    color:
                      p.current_stock <= 0 ? '#ef4444' : p.current_stock <= p.minimum_stock ? '#f59e0b' : '#10b981',
                    fontSize: 10,
                    margin: 0,
                  }}
                >
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

export function DateInput({ value, onChange, className, required, placeholder }) {
  const toDisplay = (v) => {
    if (!v) return '';
    const parts = v.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return v;
  };

  const [display, setDisplay] = React.useState(() => toDisplay(value));
  React.useEffect(() => {
    setDisplay(toDisplay(value));
  }, [value]);

  const handleChange = (e) => {
    let v = e.target.value.replace(/[^0-9/]/g, '');
    if (v.length === 2 && display.length === 1) v += '/';
    if (v.length === 5 && display.length === 4) v += '/';
    if (v.length > 10) v = v.slice(0, 10);
    setDisplay(v);
    if (v.length === 10) {
      const [d, m, y] = v.split('/');
      if (d && m && y && y.length === 4) {
        onChange({ target: { value: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` } });
      }
    } else if (v === '') {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <input
      type="text"
      className={className}
      value={display}
      onChange={handleChange}
      placeholder={placeholder || 'DD/MM/YYYY'}
      maxLength={10}
      required={required}
    />
  );
}
