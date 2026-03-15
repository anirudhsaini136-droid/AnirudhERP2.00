import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Search, Eye, Send, CheckCircle, Trash2, MessageCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const STATUS_COLORS = {
  draft: 'badge-neutral', sent: 'badge-info', paid: 'badge-success',
  overdue: 'badge-danger', cancelled: 'badge-danger', partially_paid: 'badge-warning'
};
const emptyItem = { description: '', quantity: 1, unit_price: 0, amount: 0 };

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

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    client_name: '', client_email: '', client_address: '', client_phone: '',
    issue_date: today, due_date: '', tax_rate: 18, discount_amount: 0,
    notes: '', currency: 'INR', items: [{ ...emptyItem }]
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
    } catch (e) {
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

  const resetForm = () => setForm({
    client_name: '', client_email: '', client_address: '', client_phone: '',
    issue_date: today, due_date: '', tax_rate: 18, discount_amount: 0,
    notes: '', currency: 'INR', items: [{ ...emptyItem }]
  });

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      items[idx].amount = items[idx].quantity * items[idx].unit_price;
    }
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const subtotal = form.items.reduce((s, i) => s + (i.amount || 0), 0);
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
        items: form.items.map(i => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price)
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
    } catch (e) {
      toast.error('Failed to send invoice');
    }
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
    setPaymentForm({
      amount: Number(inv.balance_due) || 0,
      payment_date: today,
      payment_method: 'cash',
      reference: '',
      notes: ''
    });
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
    const invoiceUrl = `${window.location.origin}/finance/invoices/${inv.id}`;
    const storeName = businessName || 'Our Store';
    const dueDate = fmtDate(inv.due_date);
    const balance = fmt(inv.balance_due || inv.total_amount);

    const message = [
      `Hello ${inv.client_name}!`,
      '',
      `This is a gentle reminder from *${storeName}* regarding your pending payment.`,
      '',
      `Invoice No: ${inv.invoice_number}`,
      `Amount Due: ${balance}`,
      `Due Date: ${dueDate}`,
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

  const needsReminder = (inv) =>
    ['sent', 'partially_paid', 'overdue'].includes(inv.status);

  const isPaid = (inv) => inv.status === 'paid';

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Invoices</h1>
            <p className="text-sm text-gray-500 font-sans">{total} invoices</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-premium btn-primary">
            <Plus size={16} /> Create Invoice
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-premium pl-10 text-sm h-10 w-full"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="input-premium w-auto text-sm h-10 pr-8"
          >
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
                <th>Invoice #</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
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
                    <div>
                      <p className="text-sm text-white">{inv.client_name}</p>
                      {inv.client_phone && (
                        <p className="text-xs text-gray-500">{inv.client_phone}</p>
                      )}
                      {!inv.client_phone && inv.client_email && (
                        <p className="text-xs text-gray-500">{inv.client_email}</p>
                      )}
                    </div>
                  </td>
                  <td>
                    <p className="text-sm text-gold-400 font-semibold">{fmt(inv.total_amount)}</p>
                    {inv.balance_due > 0 && inv.balance_due < inv.total_amount && (
                      <p className="text-[10px] text-amber-400">Due: {fmt(inv.balance_due)}</p>
                    )}
                  </td>
                  <td className="text-sm text-gray-400">{fmtDate(inv.due_date)}</td>
                  <td>
                    <span className={`badge-premium ${STATUS_COLORS[inv.status] || 'badge-neutral'}`}>
                      {inv.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* View */}
                      <button
                        onClick={() => navigate(`/finance/invoices/${inv.id}`)}
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                        title="View Invoice"
                      >
                        <Eye size={15} />
                      </button>

                      {/* Send email — draft only */}
                      {inv.status === 'draft' && (
                        <button
                          onClick={() => sendInvoice(inv.id)}
                          className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                          title="Send via Email"
                        >
                          <Send size={15} />
                        </button>
                      )}

                      {/* WhatsApp reminder — sent/overdue/partially paid only */}
                      {needsReminder(inv) && !isPaid(inv) && (
                        <button
                          onClick={() => sendReminder(inv)}
                          className="p-1.5 transition-colors rounded-lg hover:bg-emerald-500/10"
                          style={{ color: '#25d366' }}
                          title="Send WhatsApp Reminder"
                        >
                          <Bell size={15} />
                        </button>
                      )}

                      {/* Record payment — unpaid invoices */}
                      {['sent', 'partially_paid', 'overdue'].includes(inv.status) && (
                        <button
                          onClick={() => openPayment(inv)}
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="Record Payment"
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}

                      {/* Delete — ALL invoices */}
                      <button
                        onClick={() => setDeleteConfirm(inv)}
                        className="p-1.5 text-rose-400/50 hover:text-rose-400 transition-colors"
                        title="Delete Invoice"
                      >
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg">Delete Invoice?</DialogTitle>
          </DialogHeader>
          {deleteConfirm && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <p className="text-sm text-white font-medium">{deleteConfirm.invoice_number}</p>
                <p className="text-xs text-gray-400 mt-1">{deleteConfirm.client_name} · {fmt(deleteConfirm.total_amount)}</p>
                <div className="mt-2">
                  <span className={`badge-premium text-[10px] ${STATUS_COLORS[deleteConfirm.status] || 'badge-neutral'}`}>
                    {deleteConfirm.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                This will permanently delete the invoice. This action <span className="text-rose-400 font-semibold">cannot be undone</span>.
              </p>
              {deleteConfirm.status === 'paid' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400 font-medium">Warning: This invoice is marked as paid. Deleting it will affect your financial records.</p>
                </div>
              )}
              <DialogFooter>
                <button onClick={() => setDeleteConfirm(null)} className="btn-premium btn-secondary">Cancel</button>
                <button
                  onClick={handleDeleteConfirmed}
                  disabled={deleting}
                  className="btn-premium px-4 py-2 rounded-xl text-sm font-medium bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-all disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-void border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-white">Create Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Client Name *</Label>
                <Input className="input-premium mt-1" value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Client Email</Label>
                <Input type="email" className="input-premium mt-1" value={form.client_email} onChange={e => setForm({...form, client_email: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Client Phone (for WhatsApp)</Label>
                <Input className="input-premium mt-1" placeholder="+919876543210" value={form.client_phone} onChange={e => setForm({...form, client_phone: e.target.value})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Client Address</Label>
                <Input className="input-premium mt-1" value={form.client_address} onChange={e => setForm({...form, client_address: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Issue Date *</Label>
                <Input type="date" className="input-premium mt-1" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Due Date *</Label>
                <Input type="date" className="input-premium mt-1" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Tax Rate (%)</Label>
                <Input type="number" min="0" className="input-premium mt-1" value={form.tax_rate} onChange={e => setForm({...form, tax_rate: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Discount (INR)</Label>
                <Input type="number" min="0" className="input-premium mt-1" value={form.discount_amount} onChange={e => setForm({...form, discount_amount: parseFloat(e.target.value) || 0})} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400 text-xs">Line Items *</Label>
                <button type="button" onClick={addItem} className="text-xs text-gold-400 hover:text-gold-300">+ Add Item</button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input placeholder="Description *" className="input-premium text-sm" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="1" placeholder="Qty" className="input-premium text-sm" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" min="0" placeholder="Unit Price" className="input-premium text-sm" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-1 text-sm text-gold-400 font-semibold text-right">{fmt(item.amount)}</div>
                    <div className="col-span-1 text-center">
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-300 p-1">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Tax ({form.tax_rate}%)</span><span>{fmt(taxAmount)}</span></div>
              {form.discount_amount > 0 && (
                <div className="flex justify-between text-gray-400"><span>Discount</span><span className="text-rose-400">-{fmt(form.discount_amount)}</span></div>
              )}
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
              <button type="submit" disabled={creating} className="btn-premium btn-primary">
                {creating ? 'Creating...' : 'Create Invoice'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-white">Record Payment</DialogTitle>
          </DialogHeader>
          {paymentInvoice && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-sm text-white font-medium">{paymentInvoice.client_name}</p>
                <p className="text-xs text-gray-500">{paymentInvoice.invoice_number}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Balance Due: <span className="text-gold-400 font-semibold">{fmt(paymentInvoice.balance_due)}</span>
                </p>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Amount *</Label>
                <Input type="number" min="1" step="0.01" className="input-premium mt-1" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Payment Date *</Label>
                <Input type="date" className="input-premium mt-1" value={paymentForm.payment_date} onChange={e => setPaymentForm({...paymentForm, payment_date: e.target.value})} required />
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
                <button type="submit" disabled={paying} className="btn-premium btn-primary">
                  {paying ? 'Recording...' : 'Record Payment'}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
