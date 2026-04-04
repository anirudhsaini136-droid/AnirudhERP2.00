import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Eye, Users, GitMerge } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export default function CustomersLedgerPage() {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = React.useState(true);
  const [customers, setCustomers] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pages, setPages] = React.useState(1);

  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [mergeSource, setMergeSource] = React.useState(null);
  const [mergeTargets, setMergeTargets] = React.useState([]);
  const [mergeIntoId, setMergeIntoId] = React.useState('');
  const [mergeQuery, setMergeQuery] = React.useState('');
  const [mergeLoadingTargets, setMergeLoadingTargets] = React.useState(false);
  const [mergeSubmitting, setMergeSubmitting] = React.useState(false);
  const [mergeStep, setMergeStep] = React.useState('pick');
  const [mergeTargetRow, setMergeTargetRow] = React.useState(null);

  const load = React.useCallback(
    async ({ nextPage = page, nextSearch = search } = {}) => {
      setLoading(true);
      try {
        const res = await api.get('/finance/customers', {
          params: {
            page: nextPage,
            limit: 20,
            ...(nextSearch ? { search: nextSearch } : {}),
          },
        });
        setCustomers(res.data?.customers || []);
        setPages(res.data?.pages || 1);
      } catch (e) {
        const status = e?.response?.status;
        const detail = e?.response?.data?.detail || e?.response?.data?.message;
        toast.error(detail || (status ? `Failed to load customers (${status})` : 'Failed to load customers'));
      }
      setLoading(false);
    },
    [api, page, search]
  );

  React.useEffect(() => {
    load({ nextPage: 1, nextSearch: '' });
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    const s = search.trim();
    setPage(1);
    load({ nextPage: 1, nextSearch: s });
  };

  const customerDetailHref = (name, phone) => {
    if (!name) return '/finance/customers';
    const q = new URLSearchParams();
    q.set('phone', phone || '');
    return `/finance/customers/${encodeURIComponent(name)}?${q.toString()}`;
  };

  const openCustomer = (name, phone) => {
    if (!name) return;
    navigate(customerDetailHref(name, phone));
  };

  const openMerge = async (c) => {
    if (!c?.id) {
      toast.error('Merge needs a saved CRM customer. Create an invoice for this contact first.');
      return;
    }
    setMergeSource(c);
    setMergeStep('pick');
    setMergeTargetRow(null);
    setMergeOpen(true);
    setMergeIntoId('');
    setMergeQuery('');
    setMergeLoadingTargets(true);
    try {
      const res = await api.get('/finance/customer-merge-options');
      const list = res.data?.customers || [];
      setMergeTargets(list.filter((x) => x.id && x.id !== c.id));
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not load customers to merge into');
      setMergeTargets([]);
    }
    setMergeLoadingTargets(false);
  };

  const filteredMergeTargets = React.useMemo(() => {
    const q = mergeQuery.trim().toLowerCase();
    if (!q) return mergeTargets;
    return mergeTargets.filter(
      (t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.phone || '').toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q)
    );
  }, [mergeTargets, mergeQuery]);

  const runMerge = async () => {
    if (!mergeSource?.id || !mergeIntoId) return;
    setMergeSubmitting(true);
    try {
      const res = await api.post(`/finance/customers/${mergeSource.id}/merge`, {
        merge_into_customer_id: mergeIntoId,
      });
      toast.success(res.data?.message || 'Customers merged');
      setMergeOpen(false);
      setMergeSource(null);
      setMergeIntoId('');
      setMergeStep('pick');
      setMergeTargetRow(null);
      setPage(1);
      await load({ nextPage: 1, nextSearch: search });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Merge failed');
    }
    setMergeSubmitting(false);
  };

  const goConfirmMerge = () => {
    const t = mergeTargets.find((x) => x.id === mergeIntoId);
    if (!t) {
      toast.error('Select a customer to merge into');
      return;
    }
    setMergeTargetRow(t);
    setMergeStep('confirm');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Customer Ledger</h1>
            <p className="text-sm text-gray-500 mt-1">Outstanding by customer, with invoice and payment history.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <Users size={14} />
            <span>{customers.length} shown</span>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="bg-white/[0.03] border-white/[0.08] text-white"
          />
          <button type="submit" className="btn-premium btn-primary px-4 py-2 rounded-xl text-sm">
            Search
          </button>
        </form>

        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : customers.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-10">No customers found</p>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {customers.map((c) => (
                <div
                  key={c.id || `${c.name || ''}__${c.phone || ''}__${c.email || ''}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]"
                >
                  <div className="flex-1 min-w-0">
                    <button type="button" onClick={() => openCustomer(c.name, c.phone)} className="text-left w-full">
                      <p className="text-sm font-semibold text-white truncate">{c.name || '-'}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact info'} · Last invoice:{' '}
                        {fmtDate(c.last_invoice_date)}
                      </p>
                    </button>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-bold ${
                        Number(c.total_outstanding || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {fmt(c.total_outstanding)}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {c.invoice_count || 0} inv · {c.unpaid_count || 0} unpaid
                    </p>
                  </div>

                  {c.id ? (
                    <button
                      type="button"
                      onClick={() => openMerge(c)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 shrink-0"
                      title="Merge into another customer"
                    >
                      <GitMerge size={14} />
                      Merge
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-600 shrink-0 px-1" title="No CRM id yet">
                      —
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => openCustomer(c.name, c.phone)}
                    className="p-2 text-gray-500 hover:text-white shrink-0"
                    title="View ledger"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                const p = Math.max(1, page - 1);
                setPage(p);
                load({ nextPage: p });
              }}
              className="btn-premium text-sm px-3 py-2 rounded-xl border border-white/[0.08] text-gray-300 hover:text-white disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => {
                const p = Math.min(pages, page + 1);
                setPage(p);
                load({ nextPage: p });
              }}
              className="btn-premium text-sm px-3 py-2 rounded-xl border border-white/[0.08] text-gray-300 hover:text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Dialog
        open={mergeOpen}
        onOpenChange={(o) => {
          if (mergeSubmitting) return;
          if (!o) {
            setMergeOpen(false);
            setMergeStep('pick');
            setMergeTargetRow(null);
          }
        }}
      >
        <DialogContent className="bg-void border-white/10 max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-white">
              {mergeStep === 'confirm' ? 'Confirm merge' : 'Merge customer'}
            </DialogTitle>
          </DialogHeader>

          {mergeStep === 'confirm' && mergeSource && mergeTargetRow ? (
            <>
              <p className="text-sm text-gray-300 leading-relaxed">
                Merge <span className="text-white font-semibold">{mergeSource.name}</span> into{' '}
                <span className="text-white font-semibold">{mergeTargetRow.name}</span>? All invoices and payments will
                be moved to the selected customer. The duplicate CRM entry will be removed.
              </p>
              <DialogFooter className="gap-2 sm:gap-2">
                <button
                  type="button"
                  className="btn-premium btn-secondary"
                  disabled={mergeSubmitting}
                  onClick={() => {
                    setMergeStep('pick');
                    setMergeTargetRow(null);
                  }}
                >
                  Back
                </button>
                <button type="button" className="btn-premium btn-primary" disabled={mergeSubmitting} onClick={runMerge}>
                  {mergeSubmitting ? 'Merging…' : 'Yes, merge'}
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-400">
                Select the customer to merge <span className="text-white font-medium">{mergeSource?.name}</span> into.
                Only invoices that match this customer&apos;s name and phone will be moved.
              </p>
              <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                <label className="text-xs text-gray-500">Select customer to merge into</label>
                <Input
                  placeholder="Search by name, phone, email…"
                  value={mergeQuery}
                  onChange={(e) => setMergeQuery(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] text-white"
                />
                <div className="rounded-xl border border-white/10 overflow-y-auto flex-1 max-h-[40vh]">
                  {mergeLoadingTargets ? (
                    <p className="text-sm text-gray-500 p-4">Loading…</p>
                  ) : filteredMergeTargets.length === 0 ? (
                    <p className="text-sm text-gray-500 p-4">No other customers found.</p>
                  ) : (
                    filteredMergeTargets.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setMergeIntoId(t.id)}
                        className={`w-full text-left px-3 py-2.5 text-sm border-b border-white/5 last:border-0 transition-colors ${
                          mergeIntoId === t.id ? 'bg-amber-500/15 text-amber-200' : 'text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className="text-gray-500 text-xs block mt-0.5">
                          {[t.phone, t.email].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <button
                  type="button"
                  className="btn-premium btn-secondary"
                  disabled={mergeSubmitting}
                  onClick={() => setMergeOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-premium btn-primary disabled:opacity-40"
                  disabled={mergeSubmitting || !mergeIntoId}
                  onClick={goConfirmMerge}
                >
                  Continue
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

