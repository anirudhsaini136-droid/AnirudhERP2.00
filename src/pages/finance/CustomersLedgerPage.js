import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, MessageCircle, ChevronRight, Users, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export default function CustomersLedgerPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      const res = await api.get(`/finance/customers?${params}`);
      setCustomers(res.data.customers || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      toast.error('Failed to load customers');
    }
    setLoading(false);
  }, [api, page, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    api.get('/dashboard/settings')
      .then(r => setBusinessName(r.data?.business?.name || ''))
      .catch(() => {});
  }, [api]);

  const totalOutstanding = customers.reduce((s, c) => s + (c.total_outstanding || 0), 0);
  const totalInvoiced = customers.reduce((s, c) => s + (c.total_invoiced || 0), 0);

  const sendReminder = (customer) => {
    const phone = (customer.phone || '').replace(/[^0-9]/g, '');
    const storeName = businessName || 'Our Store';
    const message = [
      `Hello ${customer.name}!`,
      '',
      `This is a gentle reminder from *${storeName}* regarding your pending payments.`,
      '',
      `Total Outstanding: Rs. ${customer.total_outstanding?.toFixed(2) || '0'}`,
      `Pending Invoices: ${customer.unpaid_count || 0}`,
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl text-white">Customer Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">{total} customers · {fmt(totalOutstanding)} total outstanding</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Total Customers', value: total, icon: Users, color: 'text-blue-400', bg: 'from-blue-500/10 to-blue-500/5' },
            { label: 'Total Outstanding', value: fmt(totalOutstanding), icon: TrendingDown, color: 'text-rose-400', bg: 'from-rose-500/10 to-rose-500/5' },
            { label: 'Total Invoiced', value: fmt(totalInvoiced), icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-500/5' },
          ].map(stat => (
            <div key={stat.label} className={`glass-card rounded-2xl p-4 bg-gradient-to-br ${stat.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{stat.label}</span>
                <stat.icon size={16} className={stat.color} />
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-premium pl-9 text-sm h-10 w-full max-w-md"
          />
        </div>

        {/* Customers list */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-500 text-sm">Loading...</div>
          ) : customers.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={40} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500">No customers found</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {customers.map((customer, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-sm shrink-0">
                    {customer.name?.[0]?.toUpperCase() || '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{customer.name}</p>
                      {customer.unpaid_count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/20 shrink-0">
                          {customer.unpaid_count} pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {customer.phone || customer.email || 'No contact'}
                      {customer.last_invoice_date && (
                        <span className="ml-2 text-gray-600">· Last: {fmtDate(customer.last_invoice_date)}</span>
                      )}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm font-bold text-gold-400">{fmt(customer.total_invoiced)}</p>
                    <p className="text-xs text-gray-500">total invoiced</p>
                  </div>

                  <div className="text-right shrink-0">
                    {customer.total_outstanding > 0 ? (
                      <>
                        <p className="text-sm font-bold text-rose-400">{fmt(customer.total_outstanding)}</p>
                        <p className="text-xs text-gray-500">outstanding</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-emerald-400">Cleared</p>
                        <p className="text-xs text-gray-500">{customer.invoice_count} invoices</p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {customer.total_outstanding > 0 && customer.phone && (
                      <button
                        onClick={(e) => { e.stopPropagation(); sendReminder(customer); }}
                        className="p-2 rounded-lg transition-colors hover:bg-emerald-500/10"
                        style={{ color: '#25d366' }}
                        title="Send WhatsApp Reminder"
                      >
                        <MessageCircle size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/finance/customers/${encodeURIComponent(customer.name)}`)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                      title="View Ledger"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {total > 20 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <span className="text-xs text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-premium btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Prev</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn-premium btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
