import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, MessageCircle, Wallet, Eye, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

const STATUS_COLORS = {
  draft: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  sent: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  paid: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  overdue: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  partially_paid: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  cancelled: 'text-gray-400 bg-gray-500/10 border-gray-500/20'
};

export default function CustomerLedgerDetailPage() {
  const { clientName } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBulkPayment, setShowBulkPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [lastAdjustments, setLastAdjustments] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const [bulkForm, setBulkForm] = useState({
    amount: 0, payment_method: 'cash', payment_date: today, reference: '', notes: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/finance/customers/${encodeURIComponent(clientName)}/ledger`);
      setData(res.data);
      setBulkForm(f => ({ ...f, amount: res.data.customer?.total_outstanding || 0 }));
    } catch {
      toast.error('Failed to load customer ledger');
      navigate('/finance/customers');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientName]);

  useEffect(() => {
    api.get('/dashboard/settings')
      .then(r => setBusinessName(r.data?.business?.name || ''))
      .catch(() => {});
  }, [api]);

  const handleBulkPayment = async (e) => {
    e.preventDefault();
    if (bulkForm.amount <= 0) { toast.error('Amount must be greater than 0'); return; }
    setPaying(true);
    try {
      const res = await api.post(`/finance/customers/${encodeURIComponent(clientName)}/bulk-payment`, bulkForm);
      toast.success(res.data.message, { duration: 4000 });
      setLastAdjustments(res.data.adjustments);
      setShowBulkPayment(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Payment failed');
    }
    setPaying(false);
  };

  const sendReminder = () => {
    if (!data?.customer) return;
    const phone = (data.customer.phone || '').replace(/[^0-9]/g, '');
    const storeName = businessName || 'Our Store';

    const pendingInvoices = data.invoices?.filter(i =>
      ['sent', 'partially_paid', 'overdue'].includes(i.status) && Number(i.balance_due) > 0
    ) || [];

    const invoiceLines = pendingInvoices.map((inv, i) =>
      `${i + 1}. ${inv.invoice_number} - Rs. ${Number(inv.balance_due).toLocaleString('en-IN')} (Due: ${fmtDate(inv.due_date)})`
    ).join('\n');

    const message = [
      `Hello ${data.customer.name}!`,
      '',
      `This is a gentle reminder from *${storeName}* regarding your pending payments.`,
      '',
      `Total Outstanding: Rs. ${Number(data.customer.total_outstanding || 0).toLocaleString('en-IN')}`,
      '',
      invoiceLines ? `Pending Invoices:\n${invoiceLines}` : `Pending Invoices: ${pendingInvoices.length}`,
      '',
      `Kindly arrange the payment at your earliest convenience.`,
      `Thank you for your business!`
    ].join('\n');

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    toast.success('WhatsApp reminder opened!', { duration: 3000 });
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!data) return null;

  const { customer, invoices = [], payments = [] } = data;
  const unpaidInvoices = invoices.filter(i =>
    ['sent', 'partially_paid', 'overdue'].includes(i.status) && Number(i.balance_due) > 0
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/finance/customers')} className="text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-2xl text-white">{customer.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact info'}
            </p>
          </div>
          <div className="flex gap-2">
            {customer.total_outstanding > 0 && (
              <>
                {customer.phone && (
                  <button
                    onClick={sendReminder}
                    className="btn-premium text-sm flex items-center gap-2 px-4 py-2 rounded-xl border"
                    style={{ background: 'rgba(37,211,102,0.1)', borderColor: 'rgba(37,211,102,0.3)', color: '#25d366' }}
                  >
                    <MessageCircle size={15} /> Remind
                  </button>
                )}
                <button
                  onClick={() => setShowBulkPayment(true)}
                  className="btn-premium btn-primary text-sm flex items-center gap-2"
                >
                  <Wallet size={15} /> Record Payment
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Invoiced', value: fmt(customer.total_invoiced), color: 'text-white' },
            { label: 'Total Paid', value: fmt(customer.total_paid), color: 'text-emerald-400' },
            { label: 'Outstanding', value: fmt(customer.total_outstanding), color: customer.total_outstanding > 0 ? 'text-rose-400' : 'text-emerald-400' },
            { label: 'Total Invoices', value: customer.invoice_count, color: 'text-blue-400' },
          ].map(stat => (
            <div key={stat.label} className="glass-card rounded-2xl p-4">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Last payment adjustments */}
        {lastAdjustments && lastAdjustments.length > 0 && (
          <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
            <p className="text-sm font-semibold text-emerald-400 mb-3">Payment Applied Successfully</p>
            <div className="space-y-2">
              {lastAdjustments.map((adj, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-mono">{adj.invoice_number}</span>
                  <span className="text-emerald-400">-{fmt(adj.amount_applied)}</span>
                  <span className="text-gray-500">
                    Balance: {fmt(adj.previous_balance)} → {fmt(adj.new_balance)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] ${STATUS_COLORS[adj.status] || ''}`}>
                    {adj.status}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => setLastAdjustments(null)} className="text-xs text-gray-600 hover:text-gray-400 mt-2">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoices */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              All Invoices ({invoices.length})
            </h2>
            <div className="glass-card rounded-2xl overflow-hidden">
              {invoices.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">No invoices</p>
              ) : (
                <div className="divide-y divide-white/[0.03] max-h-96 overflow-y-auto">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono text-white">{inv.invoice_number}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[inv.status] || ''}`}>
                            {inv.status?.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">Due: {fmtDate(inv.due_date)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gold-400">{fmt(inv.total_amount)}</p>
                        {inv.balance_due > 0 && inv.balance_due < inv.total_amount && (
                          <p className="text-[10px] text-rose-400">Due: {fmt(inv.balance_due)}</p>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(`/finance/invoices/${inv.id}`)}
                        className="p-1.5 text-gray-500 hover:text-white shrink-0"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Payment history */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Payment History ({payments.length})
            </h2>
            <div className="glass-card rounded-2xl overflow-hidden">
              {payments.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">No payments yet</p>
              ) : (
                <div className="divide-y divide-white/[0.03] max-h-96 overflow-y-auto">
                  {payments.map(pay => (
                    <div key={pay.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle size={14} className="text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium">{pay.invoice_number || 'Payment'}</p>
                        <p className="text-[10px] text-gray-500">
                          {fmtDate(pay.payment_date)} · {pay.payment_method?.replace('_', ' ') || 'cash'}
                          {pay.reference && <span> · {pay.reference}</span>}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-emerald-400 shrink-0">+{fmt(pay.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Payment Dialog */}
      <Dialog open={showBulkPayment} onOpenChange={setShowBulkPayment}>
        <DialogContent className="bg-void border-white/10 max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-white">Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkPayment} className="space-y-4">

            {/* ✅ Scrollable invoice list — fixed height so button stays visible */}
            <div className="rounded-xl bg-white/[0.03] border border-white/5">
              <div className="px-4 pt-3 pb-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                  Pending Invoices (oldest first)
                </p>
              </div>
              <div className="max-h-44 overflow-y-auto px-4 pb-2 space-y-1.5">
                {unpaidInvoices.map(inv => (
                  <div key={inv.id} className="flex justify-between text-xs">
                    <span className="text-gray-400 font-mono">{inv.invoice_number}</span>
                    <span className="text-rose-400 font-medium">{fmt(inv.balance_due)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 px-4 py-2.5 flex justify-between text-sm font-bold">
                <span className="text-white">Total Outstanding</span>
                <span className="text-gold-400">{fmt(customer.total_outstanding)}</span>
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-xs">Payment Amount (Rs.) *</Label>
              <Input
                type="number"
                min="1"
                max={customer.total_outstanding}
                step="0.01"
                className="input-premium mt-1 text-lg font-bold text-center"
                value={bulkForm.amount}
                onChange={e => setBulkForm({ ...bulkForm, amount: parseFloat(e.target.value) || 0 })}
                required
              />
              <p className="text-[10px] text-gray-600 mt-1 text-center">
                Will be applied to oldest invoices first (FIFO)
              </p>
            </div>

            <div>
              <Label className="text-gray-400 text-xs">Payment Date *</Label>
              <Input
                type="date"
                className="input-premium mt-1"
                value={bulkForm.payment_date}
                onChange={e => setBulkForm({ ...bulkForm, payment_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label className="text-gray-400 text-xs">Payment Method</Label>
              <select
                className="input-premium mt-1 w-full"
                value={bulkForm.payment_method}
                onChange={e => setBulkForm({ ...bulkForm, payment_method: e.target.value })}
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <Label className="text-gray-400 text-xs">Reference / Transaction ID</Label>
              <Input
                className="input-premium mt-1"
                placeholder="UPI ref, cheque no. etc."
                value={bulkForm.reference}
                onChange={e => setBulkForm({ ...bulkForm, reference: e.target.value })}
              />
            </div>

            <DialogFooter>
              <button type="button" onClick={() => setShowBulkPayment(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={paying || bulkForm.amount <= 0} className="btn-premium btn-primary">
                {paying ? 'Processing...' : `Apply ${fmt(bulkForm.amount)}`}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
