import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Search, Eye, Send, CheckCircle, Trash2, Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const STATUS_COLORS = {
  draft: 'badge-neutral', sent: 'badge-info', paid: 'badge-success',
  overdue: 'badge-danger', cancelled: 'badge-danger', partially_paid: 'badge-warning'
};
const emptyItem = { description: '', hsn_code: '', quantity: 1, unit_price: 0, item_discount: 0, amount: 0 };


// Customer autocomplete for invoice client name
function ClientSearch({ value, onChange, onSelect, api }) {
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
    if (val.length < 2) { setResults([]); setShow(false); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/customers/search?q=${encodeURIComponent(val)}`);
        const list = res.data.customers || [];
        setResults(list);
        setShow(list.length > 0);
      } catch { setResults([]); }
      setSearching(false);
    }, 250);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="input-premium mt-1 w-full"
          placeholder="Client name *"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => query.length >= 2 && results.length > 0 && setShow(true)}
          autoComplete="off"
          required
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
          {results.map(c => (
            <button key={c.id} type="button"
              onMouseDown={() => { setShow(false); onSelect(c); setQuery(c.name); }}
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <p style={{ color: '#f9fafb', fontSize: 13, fontWeight: 500, margin: 0 }}>{c.name}</p>
                <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>{[c.phone, c.email].filter(Boolean).join(' · ')}</p>
              </div>
              {c.gstin && <p style={{ color: '#D4AF37', fontSize: 10, margin: 0, flexShrink: 0, marginLeft: 8 }}>GST: {c.gstin}</p>}
            </button>
          ))}
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

// Product autocomplete component for invoice line items
function ProductSearch({ value, onChange, onSelect, api }) {
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
      setSearching(true);
      try {
        const res = await api.get(`/inventory/products?search=${encodeURIComponent(val)}&limit=8`);
        const products = res.data.products || [];
        setResults(products);
        setShow(products.length > 0);
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

export default function InvoicesPage() {
  const { api } = useAuth();
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
    client_name: '', client_email: '', client_address: '', client_phone: '',
    issue_date: today, due_date: '', tax_rate: 0, discount_amount: 0,
    notes: '', currency: 'INR',
    buyer_state: '',
    items: [{ ...emptyItem }],
    custom_fields: [] // [{label: '', value: ''}]
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0, payment_date: today, payment_method: 'cash', reference: '', notes: ''
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await api.get(`/finance/invoices?${params}`);
      setInvoices(res.data.invoices || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load invoices');
    }
    setLoading(false);
  }, [api, page, search, filterStatus]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    api.get('/dashboard/settings')
      .then(r => setBusinessName(r.data?.business?.name || ''))
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
      client_name: '', client_email: '', client_address: '', client_phone: '',
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
    setCreating(true);
    try {
      const res = await api.post('/finance/invoices', {
        ...form,
        buyer_state: form.buyer_state || null,
        place_of_supply: form.buyer_state || null,
        custom_fields: form.custom_fields.filter(f => f.label && f.value),
        items: form.items.map(i => ({
          description: i.description,
          hsn_code: i.hsn_code || null,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          item_discount: Number(i.item_discount) || 0
        }))
      });
      toast.success('Invoice created');
      setShowCreate(false);
      resetForm();
      fetchInvoices();
      if (res.data.id) navigate(`/finance/invoices/${res.data.id}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create invoice');
    }
    setCreating(false);
  };

  const sendInvoice = async (id) => {
    try {
      await api.post(`/finance/invoices/${id}/send`);
      toast.success('Invoice sent');
      fetchInvoices();
    } catch { toast.error('Failed to send invoice'); }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/finance/invoices/${deleteConfirm.id}`);
      toast.success('Invoice deleted');
      setDeleteConfirm(null);
      fetchInvoices();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete invoice');
    }
    setDeleting(false);
  };

  const openPayment = (inv) => {
    setPaymentInvoice(inv);
    setPaymentForm({ amount: Number(inv.balance_due) || 0, payment_date: today, payment_method: 'cash', reference: '', notes: '' });
    setShowPayment(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setPaying(true);
    try {
      await api.post(`/finance/invoices/${paymentInvoice.id}/payments`, paymentForm);
      toast.success('Payment recorded');
      setShowPayment(false);
      fetchInvoices();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to record payment');
    }
    setPaying(false);
  };

  const sendReminder = (inv) => {
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
    toast.success('WhatsApp reminder opened!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Invoices</h1>
            <p className="text-sm text-gray-500 font-sans">{total} invoices</p>
          </div>
          <button onClick={() => { resetForm(); setShowCreate(true); }} className="btn-premium btn-primary">
            <Plus size={16} /> Create Invoice
          </button>
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
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="table-premium w-full">
            <thead>
              <tr>
                <th>Invoice #</th><th>Client</th><th>Amount</th>
                <th>Due Date</th><th>Status</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center text-gray-500 py-8">Loading...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-500 py-12">No invoices yet</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id}>
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
                      <button onClick={() => navigate(`/finance/invoices/${inv.id}`)} className="p-1.5 text-gray-400 hover:text-white" title="View"><Eye size={15} /></button>
                      {inv.status === 'draft' && <button onClick={() => sendInvoice(inv.id)} className="p-1.5 text-blue-400 hover:text-blue-300" title="Send Email"><Send size={15} /></button>}
                      {['sent','partially_paid','overdue'].includes(inv.status) && (
                        <button onClick={() => sendReminder(inv)} className="p-1.5 rounded-lg hover:bg-emerald-500/10" style={{ color: '#25d366' }} title="WhatsApp Reminder"><Bell size={15} /></button>
                      )}
                      {['sent','partially_paid','overdue'].includes(inv.status) && (
                        <button onClick={() => openPayment(inv)} className="p-1.5 text-emerald-400 hover:text-emerald-300" title="Record Payment"><CheckCircle size={15} /></button>
                      )}
                      <button onClick={() => setDeleteConfirm(inv)} className="p-1.5 text-rose-400/50 hover:text-rose-400" title="Delete"><Trash2 size={15} /></button>
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

      {/* Create Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-void border-white/10 max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-white">Create Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">

            {/* Client */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Client Name *</Label>
                <ClientSearch
                  value={form.client_name}
                  onChange={(val) => setForm({...form, client_name: val})}
                  onSelect={(c) => setForm({...form,
                    client_name: c.name || '',
                    client_phone: c.phone || form.client_phone,
                    client_email: c.email || form.client_email,
                    client_address: c.address || form.client_address
                  })}
                  api={api}
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

            {/* Dates + Tax */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Issue Date *</Label>
                <Input type="date" lang="en-GB" className="input-premium mt-1" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Due Date *</Label>
                <Input type="date" lang="en-GB" className="input-premium mt-1" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required />
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
                          description: product.name,
                          unit_price: product.unit_price,
                          hsn_code: product.hsn_code || items[idx].hsn_code || '',
                          amount: (items[idx].quantity * product.unit_price) - (items[idx].item_discount || 0)
                        };
                        setForm({ ...form, items });
                        if (!showHSN && product.hsn_code) setShowHSN(true);
                      }}
                      api={api}
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
              <button type="button" onClick={() => setShowCreate(false)} className="btn-premium btn-secondary">Cancel</button>
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
                <Input type="date" lang="en-GB" className="input-premium mt-1" value={paymentForm.payment_date} onChange={e => setPaymentForm({...paymentForm, payment_date: e.target.value})} required />
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
