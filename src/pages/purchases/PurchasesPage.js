import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Search, Eye, Trash2, CheckCircle, TrendingDown, IndianRupee, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry'
];

const STATUS_COLORS = {
  unpaid: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  partial: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  paid: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const emptyItem = { description: '', hsn_code: '', quantity: 1, unit_price: 0, product_id: null, update_stock: true };

// ── Defined OUTSIDE component to prevent remount on re-render ──
function ProductSearch({ idx, description, api, onDescriptionChange, onSelect }) {
  const [q, setQ] = useState(description || '');
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const timer = useRef(null);
  const ref = useRef(null);

  useEffect(() => { setQ(description || ''); }, [description]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleChange = (val) => {
    setQ(val);
    onDescriptionChange(val);
    if (timer.current) clearTimeout(timer.current);
    if (val.length < 1) { setResults([]); setShow(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/inventory/products?search=${encodeURIComponent(val)}&limit=6`);
        setResults(res.data.products || []);
        setShow((res.data.products || []).length > 0);
      } catch { setResults([]); }
    }, 250);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input className="input-premium text-sm w-full" placeholder="Description / product *"
        value={q} onChange={e => handleChange(e.target.value)}
        onFocus={() => q.length >= 1 && results.length > 0 && setShow(true)} autoComplete="off" />
      {show && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: '#0d0d14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {results.map(p => (
            <button key={p.id} type="button" onMouseDown={() => { setShow(false); setQ(p.name); onSelect(p); }}
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div>
                <p style={{ color: '#f9fafb', fontSize: 13, fontWeight: 500, margin: 0 }}>{p.name}</p>
                <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>Cost: ₹{p.cost_price || 0} · Stock: {p.current_stock}</p>
              </div>
              <span style={{ color: '#D4AF37', fontSize: 12, flexShrink: 0, marginLeft: 8 }}>₹{p.unit_price}</span>
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

export default function PurchasesPage() {
  const { api } = useAuth();
  const [bills, setBills] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [showPayment, setShowPayment] = useState(null);
  const [paying, setPaying] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    vendor_name: '', vendor_phone: '', vendor_email: '',
    vendor_gstin: '', vendor_state: '',
    bill_date: today, due_date: '', tax_rate: 18,
    discount_amount: 0, notes: '',
    items: [{ ...emptyItem }]
  });

  const [payForm, setPayForm] = useState({
    amount: 0, payment_date: today, payment_method: 'cash', reference: '', notes: ''
  });

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await api.get(`/purchases?${params}`);
      setBills(res.data.bills || []);
      setTotal(res.data.total || 0);
      setStats(res.data.stats || {});
    } catch { toast.error('Failed to load purchases'); }
    setLoading(false);
  }, [api, page, search, filterStatus]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const resetForm = () => setForm({
    vendor_name: '', vendor_phone: '', vendor_email: '',
    vendor_gstin: '', vendor_state: '',
    bill_date: today, due_date: '', tax_rate: 18,
    discount_amount: 0, notes: '', items: [{ ...emptyItem }]
  });

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const subtotal = form.items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0);
  const taxAmount = subtotal * (form.tax_rate / 100);
  const totalAmount = subtotal + taxAmount - (form.discount_amount || 0);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.vendor_name.trim()) { toast.error('Vendor name required'); return; }
    if (form.items.some(i => !i.description)) { toast.error('All items need a description'); return; }
    setCreating(true);
    try {
      const res = await api.post('/purchases', {
        ...form,
        items: form.items.map(i => ({
          description: i.description,
          hsn_code: i.hsn_code || null,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          product_id: i.product_id || null,
          update_stock: i.update_stock
        }))
      });
      toast.success(`Purchase bill ${res.data.bill_number} created`);
      setShowCreate(false);
      resetForm();
      fetchBills();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create bill');
    }
    setCreating(false);
  };

  const openDetail = async (bill) => {
    setShowDetail(bill);
    try {
      const res = await api.get(`/purchases/${bill.id}`);
      setDetailData(res.data);
    } catch { toast.error('Failed to load details'); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!showPayment) return;
    setPaying(true);
    try {
      await api.post(`/purchases/${showPayment.id}/payments`, payForm);
      toast.success('Payment recorded');
      setShowPayment(null);
      fetchBills();
      if (showDetail?.id === showPayment.id) {
        const res = await api.get(`/purchases/${showPayment.id}`);
        setDetailData(res.data);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to record payment');
    }
    setPaying(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/purchases/${deleteConfirm.id}`);
      toast.success('Bill deleted');
      setDeleteConfirm(null);
      fetchBills();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete');
    }
    setDeleting(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Purchases</h1>
            <p className="text-sm text-gray-500">{total} purchase bills · Track vendor payments & ITC</p>
          </div>
          <button onClick={() => { resetForm(); setShowCreate(true); }} className="btn-premium btn-primary">
            <Plus size={16} /> New Purchase Bill
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Purchases', value: fmt(stats.total_purchases), color: 'text-white', icon: ShoppingBag },
            { label: 'Amount Paid', value: fmt(stats.total_paid), color: 'text-emerald-400', icon: CheckCircle },
            { label: 'Outstanding', value: fmt(stats.total_outstanding), color: 'text-rose-400', icon: TrendingDown },
            { label: 'Total ITC', value: fmt(stats.total_itc), color: 'text-blue-400', icon: IndianRupee },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{s.label}</p>
                <s.icon size={15} className={s.color} />
              </div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ITC Breakdown */}
        {(stats.total_cgst_itc > 0 || stats.total_sgst_itc > 0 || stats.total_igst_itc > 0) && (
          <div className="glass-card rounded-2xl p-4 border border-blue-500/20">
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-3">Input Tax Credit Available</p>
            <div className="flex flex-wrap gap-6">
              <div><p className="text-[10px] text-gray-500">CGST ITC</p><p className="text-sm font-bold text-blue-400">{fmt(stats.total_cgst_itc)}</p></div>
              <div><p className="text-[10px] text-gray-500">SGST ITC</p><p className="text-sm font-bold text-blue-400">{fmt(stats.total_sgst_itc)}</p></div>
              <div><p className="text-[10px] text-gray-500">IGST ITC</p><p className="text-sm font-bold text-purple-400">{fmt(stats.total_igst_itc)}</p></div>
              <div><p className="text-[10px] text-gray-500">Total ITC</p><p className="text-sm font-bold text-emerald-400">{fmt(stats.total_itc)}</p></div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Search vendor or bill no..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-premium pl-9 text-sm h-10 w-full" />
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="input-premium w-auto text-sm h-10">
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="table-premium w-full">
            <thead>
              <tr>
                <th>Bill #</th><th>Vendor</th><th>Date</th>
                <th>Amount</th><th>ITC</th><th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-8">Loading...</td></tr>
              ) : bills.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-12">No purchase bills yet</td></tr>
              ) : bills.map(bill => (
                <tr key={bill.id}>
                  <td className="font-mono text-white text-sm">{bill.bill_number}</td>
                  <td>
                    <p className="text-sm text-white">{bill.vendor_name}</p>
                    {bill.vendor_phone && <p className="text-xs text-gray-500">{bill.vendor_phone}</p>}
                  </td>
                  <td className="text-sm text-gray-400">{fmtDate(bill.bill_date)}</td>
                  <td>
                    <p className="text-sm font-bold text-gold-400">{fmt(bill.total_amount)}</p>
                    {bill.balance_due > 0 && bill.balance_due < bill.total_amount && (
                      <p className="text-[10px] text-rose-400">Due: {fmt(bill.balance_due)}</p>
                    )}
                  </td>
                  <td>
                    <p className="text-sm text-blue-400">{fmt((bill.cgst_amount || 0) + (bill.sgst_amount || 0) + (bill.igst_amount || 0))}</p>
                    <p className="text-[10px] text-gray-600">{bill.supply_type === 'interstate' ? 'IGST' : 'CGST+SGST'}</p>
                  </td>
                  <td>
                    <span className={`badge-premium text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[bill.status] || ''}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openDetail(bill)} className="p-1.5 text-gray-400 hover:text-white" title="View"><Eye size={15} /></button>
                      {bill.status !== 'paid' && (
                        <button onClick={() => { setShowPayment(bill); setPayForm({ amount: Number(bill.balance_due) || 0, payment_date: today, payment_method: 'cash', reference: '', notes: '' }); }}
                          className="p-1.5 text-emerald-400 hover:text-emerald-300" title="Record Payment">
                          <CheckCircle size={15} />
                        </button>
                      )}
                      <button onClick={() => setDeleteConfirm(bill)} className="p-1.5 text-rose-400/50 hover:text-rose-400" title="Delete">
                        <Trash2 size={15} />
                      </button>
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-void border-white/10 max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-white">New Purchase Bill</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Vendor Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Vendor Name *</Label>
                <Input className="input-premium mt-1" value={form.vendor_name} onChange={e => setForm({...form, vendor_name: e.target.value})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Vendor Phone</Label>
                <Input className="input-premium mt-1" value={form.vendor_phone} onChange={e => setForm({...form, vendor_phone: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Vendor GSTIN</Label>
                <Input className="input-premium mt-1" placeholder="22AAAAA0000A1Z5" value={form.vendor_gstin}
                  onChange={e => setForm({...form, vendor_gstin: e.target.value.toUpperCase()})} maxLength={15} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Vendor State <span className="text-gold-400">(for GST)</span></Label>
                <select className="input-premium mt-1 w-full" value={form.vendor_state} onChange={e => setForm({...form, vendor_state: e.target.value})}>
                  <option value="">Select vendor state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Dates + Tax */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Bill Date *</Label>
                <DateInput className="input-premium mt-1" value={form.bill_date} onChange={e => setForm({...form, bill_date: e.target.value})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Due Date</Label>
                <Input className="input-premium mt-1" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Tax Rate (%)</Label>
                <Input type="number" min="0" className="input-premium mt-1" value={form.tax_rate} onChange={e => setForm({...form, tax_rate: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Discount (₹)</Label>
                <Input type="number" min="0" className="input-premium mt-1" value={form.discount_amount} onChange={e => setForm({...form, discount_amount: parseFloat(e.target.value) || 0})} />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400 text-xs">Items *</Label>
                <button type="button" onClick={() => setForm({...form, items: [...form.items, { ...emptyItem }]})}
                  className="text-xs text-gold-400 hover:text-gold-300">+ Add Item</button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-600 uppercase tracking-wider px-1">
                  <span className="col-span-4">Description</span>
                  <span className="col-span-2">HSN</span>
                  <span className="col-span-1">Qty</span>
                  <span className="col-span-2">Cost Price</span>
                  <span className="col-span-2">Stock+</span>
                  <span className="col-span-1"></span>
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <ProductSearch
                        idx={idx}
                        description={item.description}
                        api={api}
                        onDescriptionChange={(val) => updateItem(idx, 'description', val)}
                        onSelect={(p) => {
                          const items = [...form.items];
                          items[idx] = { ...items[idx], description: p.name, unit_price: p.cost_price || p.unit_price, product_id: p.id, hsn_code: p.hsn_code || items[idx].hsn_code, update_stock: true };
                          setForm({ ...form, items });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input placeholder="HSN" className="input-premium text-sm" value={item.hsn_code}
                        onChange={e => updateItem(idx, 'hsn_code', e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Input type="number" min="0" className="input-premium text-sm" value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" className="input-premium text-sm" value={item.unit_price}
                        onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <input type="checkbox" checked={item.update_stock && !!item.product_id}
                        disabled={!item.product_id}
                        onChange={e => updateItem(idx, 'update_stock', e.target.checked)}
                        className="w-3.5 h-3.5" />
                      <span className="text-[10px] text-gray-500">{item.product_id ? 'Update stock' : 'No product linked'}</span>
                    </div>
                    <div className="col-span-1 text-center">
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => setForm({...form, items: form.items.filter((_, i) => i !== idx)})}
                          className="text-rose-400/50 hover:text-rose-400 p-1"><Trash2 size={13} /></button>
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
              <textarea className="input-premium mt-1 h-16 resize-none w-full" value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})} />
            </div>

            <DialogFooter>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={creating} className="btn-premium btn-primary">
                {creating ? 'Creating...' : 'Create Purchase Bill'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => { setShowDetail(null); setDetailData(null); }}>
        <DialogContent className="bg-void border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-white">
              {showDetail?.bill_number} — {showDetail?.vendor_name}
            </DialogTitle>
          </DialogHeader>
          {detailData ? (
            <div className="space-y-4">
              {/* Bill info */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total', value: fmt(detailData.bill?.total_amount), color: 'text-gold-400' },
                  { label: 'Paid', value: fmt(detailData.bill?.amount_paid), color: 'text-emerald-400' },
                  { label: 'Balance', value: fmt(detailData.bill?.balance_due), color: 'text-rose-400' },
                ].map(s => (
                  <div key={s.label} className="glass-card rounded-xl p-3">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* GST breakdown */}
              {(detailData.bill?.cgst_amount > 0 || detailData.bill?.igst_amount > 0) && (
                <div className="glass-card rounded-xl p-3 border border-blue-500/20">
                  <p className="text-xs text-blue-400 font-semibold mb-2">Input Tax Credit (ITC)</p>
                  <div className="flex gap-6 text-sm">
                    {detailData.bill?.cgst_amount > 0 && (
                      <>
                        <div><p className="text-[10px] text-gray-500">CGST {detailData.bill.cgst_rate}%</p><p className="font-bold text-blue-400">{fmt(detailData.bill.cgst_amount)}</p></div>
                        <div><p className="text-[10px] text-gray-500">SGST {detailData.bill.sgst_rate}%</p><p className="font-bold text-blue-400">{fmt(detailData.bill.sgst_amount)}</p></div>
                      </>
                    )}
                    {detailData.bill?.igst_amount > 0 && (
                      <div><p className="text-[10px] text-gray-500">IGST {detailData.bill.igst_rate}%</p><p className="font-bold text-purple-400">{fmt(detailData.bill.igst_amount)}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Items</p>
                <div className="glass-card rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-white/[0.02] border-b border-white/5">
                      <th className="px-3 py-2 text-left text-gray-500">Description</th>
                      <th className="px-3 py-2 text-center text-gray-500">HSN</th>
                      <th className="px-3 py-2 text-center text-gray-500">Qty</th>
                      <th className="px-3 py-2 text-right text-gray-500">Rate</th>
                      <th className="px-3 py-2 text-right text-gray-500">Total</th>
                    </tr></thead>
                    <tbody>
                      {detailData.items?.map((item, i) => (
                        <tr key={i} className="border-b border-white/[0.03]">
                          <td className="px-3 py-2 text-white">{item.description}</td>
                          <td className="px-3 py-2 text-center text-gray-400">{item.hsn_code || '—'}</td>
                          <td className="px-3 py-2 text-center text-gray-400">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-400">{fmt(item.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-bold text-gold-400">{fmt(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments */}
              {detailData.payments?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Payment History</p>
                  <div className="glass-card rounded-xl overflow-hidden divide-y divide-white/[0.03]">
                    {detailData.payments.map(p => (
                      <div key={p.id} className="flex justify-between items-center px-4 py-2.5">
                        <div>
                          <p className="text-xs text-white">{fmtDate(p.payment_date)} · {p.payment_method}</p>
                          {p.reference && <p className="text-[10px] text-gray-500">{p.reference}</p>}
                        </div>
                        <p className="text-sm font-bold text-emerald-400">+{fmt(p.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailData.bill?.status !== 'paid' && (
                <button onClick={() => { setShowPayment(showDetail); setPayForm({ amount: Number(detailData.bill?.balance_due) || 0, payment_date: today, payment_method: 'cash', reference: '', notes: '' }); }}
                  className="btn-premium btn-primary w-full flex items-center justify-center gap-2">
                  <CheckCircle size={15} /> Record Payment
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!showPayment} onOpenChange={() => setShowPayment(null)}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-white">Record Payment</DialogTitle></DialogHeader>
          {showPayment && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-sm text-white font-medium">{showPayment.vendor_name}</p>
                <p className="text-xs text-gray-500">{showPayment.bill_number}</p>
                <p className="text-xs text-gray-500 mt-1">Balance: <span className="text-gold-400 font-semibold">{fmt(showPayment.balance_due)}</span></p>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Amount *</Label>
                <Input type="number" min="1" step="0.01" className="input-premium mt-1" value={payForm.amount}
                  onChange={e => setPayForm({...payForm, amount: parseFloat(e.target.value) || 0})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Payment Date *</Label>
                <Input className="input-premium mt-1" value={payForm.payment_date}
                  onChange={e => setPayForm({...payForm, payment_date: e.target.value})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Payment Method</Label>
                <select className="input-premium mt-1 w-full" value={payForm.payment_method}
                  onChange={e => setPayForm({...payForm, payment_method: e.target.value})}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Reference</Label>
                <Input className="input-premium mt-1" placeholder="UPI ref, cheque no." value={payForm.reference}
                  onChange={e => setPayForm({...payForm, reference: e.target.value})} />
              </div>
              <DialogFooter>
                <button type="button" onClick={() => setShowPayment(null)} className="btn-premium btn-secondary">Cancel</button>
                <button type="submit" disabled={paying} className="btn-premium btn-primary">{paying ? 'Recording...' : 'Record Payment'}</button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-white text-lg">Delete Bill?</DialogTitle></DialogHeader>
          {deleteConfirm && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <p className="text-sm text-white font-medium">{deleteConfirm.bill_number}</p>
                <p className="text-xs text-gray-400 mt-1">{deleteConfirm.vendor_name} · {fmt(deleteConfirm.total_amount)}</p>
              </div>
              <p className="text-sm text-gray-400">This action <span className="text-rose-400 font-semibold">cannot be undone</span>. Stock changes will NOT be reversed.</p>
              <DialogFooter>
                <button onClick={() => setDeleteConfirm(null)} className="btn-premium btn-secondary">Cancel</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="btn-premium px-4 py-2 rounded-xl text-sm font-medium bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 disabled:opacity-50">
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
