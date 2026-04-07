import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Search, Eye, CheckCircle, Trash2, Bell, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { toastAfterWhatsAppOpen } from '../../utils/whatsappToast';
import {
  loadLocalInvoices,
  reconcileServerInvoiceCache,
  upsertLocalInvoices,
  recordLocalPaymentAndQueue,
  syncOfflineInvoiceQueue,
  retrySyncForInvoice,
  upsertServerInvoices,
  dedupeInvoicesForOffline,
  pruneExpiredLocalDrafts,
  countDraftInvoices,
} from '../../lib/offlineInvoices';
import { DateInput } from './invoiceFormPrimitives';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const STATUS_COLORS = {
  draft: 'badge-neutral', sent: 'badge-info', paid: 'badge-success',
  overdue: 'badge-danger', cancelled: 'badge-danger', partially_paid: 'badge-warning'
};

export default function InvoicesPage() {
  const { api, user, business } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paying, setPaying] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [whatsappApiReady, setWhatsappApiReady] = useState(false);
  const [offlineNow, setOfflineNow] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : true);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);

  useEffect(() => {
    const on = () => setOfflineNow(!navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const removeLocalInvoiceById = useCallback((localId) => {
    if (!business?.id || !localId) return;
    const all = loadLocalInvoices(business.id);
    upsertLocalInvoices(business.id, all.filter((x) => x.id !== localId));
  }, [business?.id]);

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

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const localOnly =
        deleteConfirm.sync_status === 'local_draft' ||
        deleteConfirm.sync_status === 'local_pending' ||
        deleteConfirm.sync_status === 'sync_failed' ||
        !deleteConfirm.server_invoice_id;
      if (localOnly) {
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
        const localOnly =
          inv.sync_status === 'local_draft' ||
          inv.sync_status === 'local_pending' ||
          inv.sync_status === 'sync_failed' ||
          !inv.server_invoice_id;
        if (localOnly) {
          removeLocalInvoiceById(id);
        } else {
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

  const handleRetrySync = async (inv) => {
    if (!business?.id) return;
    try {
      const res = await retrySyncForInvoice({ api, businessId: business.id, localInvoiceId: inv.id });
      if (res.synced > 0) toast.success('Invoice synced online');
      else if (res.failed > 0) toast.error(inv.sync_error || 'Sync failed. Open invoice and correct details.');
      else toast.success('Sync queued');
      fetchInvoices();
    } catch {
      toast.error('Retry failed');
    }
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
              onClick={() => navigate('/finance/invoices/create')}
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
                  <td>
                    <div className="flex items-center justify-start gap-2">
                      <span className={`badge-premium ${STATUS_COLORS[inv.status] || 'badge-neutral'}`}>{inv.status?.replace('_', ' ')}</span>
                      {inv.sync_status === 'sync_failed' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-rose-500/30 text-rose-400" title={inv.sync_error || 'Sync failed'}>
                          sync failed
                        </span>
                      )}
                      {inv.sync_status === 'local_pending' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-400">
                          pending sync
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          inv.sync_status === 'local_draft'
                            ? navigate(`/finance/invoices/create?draft=${encodeURIComponent(inv.id)}`)
                            : navigate(`/finance/invoices/${inv.id}`)
                        }
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
                      {(inv.sync_status === 'local_pending' || inv.sync_status === 'sync_failed') && (
                        <button
                          onClick={() => handleRetrySync(inv)}
                          className="p-1.5 text-amber-400 hover:text-amber-300"
                          title={inv.sync_error ? `Retry Sync: ${inv.sync_error}` : 'Retry Sync'}
                        >
                          <RefreshCw size={15} />
                        </button>
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
