import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { parseEnabledModules, isNavPathAllowedForModules, effectiveModuleEnabled } from '../../shared-core/modules';
import {
  IndianRupee, FileText, TrendingUp, AlertTriangle, Sparkles, Copy, QrCode, Smartphone, CreditCard,
  ShieldCheck, Headphones, Clock3, CheckCircle2, BarChart3, FileSpreadsheet, Repeat,
  Truck, BookUser, HardDriveDownload, Receipt, BookOpen, Package, ShoppingCart, ClipboardList, Landmark,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function BusinessDashboard() {
  const { api, business, user, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [paymentOffer, setPaymentOffer] = useState(null);
  const [payOfferLoading, setPayOfferLoading] = useState(true);
  const [razorpayBusy, setRazorpayBusy] = useState(false);

  const enabledModules = useMemo(() => parseEnabledModules(business), [business]);
  const canNav = (path) =>
    Array.isArray(enabledModules) &&
    enabledModules.length > 0 &&
    isNavPathAllowedForModules(path, enabledModules);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    if (!business?.id || user?.role === 'super_admin') {
      setPaymentOffer(null);
      setPayOfferLoading(false);
      return;
    }
    setPayOfferLoading(true);
    api
      .get('/subscription/payment-offer')
      .then((r) => setPaymentOffer(r.data))
      .catch(() => setPaymentOffer(null))
      .finally(() => setPayOfferLoading(false));
  }, [api, business?.id, user?.role]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  const s = data?.stats || {};
  const statusLower = (business?.status || '').toLowerCase();
  const daysRemaining = Number(business?.days_remaining ?? 0);
  const showUpgradeWarning =
    statusLower === 'expired' ||
    statusLower === 'suspended' ||
    daysRemaining < 10;
  const amount =
    billingCycle === 'yearly'
      ? paymentOffer?.yearly_payable_amount ?? 399 * 12
      : paymentOffer?.monthly_payable_amount ?? 499;
  const monthlyTotalYearlyEquivalent = 499 * 12;
  const yearlySavings = monthlyTotalYearlyEquivalent - (399 * 12);
  const yearlySavingsPct = Math.round((yearlySavings / monthlyTotalYearlyEquivalent) * 100);
  const planLabel = billingCycle === 'yearly' ? 'Yearly (399x12)' : 'Monthly (499)';
  const paymentNote = paymentOffer?.payment_note || `NexaERP ${planLabel} - ${business?.name || 'Business'} - ${business?.id || ''}`;

  const canPayWithRazorpay =
    Boolean(paymentOffer?.razorpay_enabled) &&
    Boolean(paymentOffer?.razorpay_eligible) &&
    Number(amount || 0) > 0 &&
    (billingCycle === 'yearly' ? paymentOffer?.can_pay_yearly : paymentOffer?.can_pay_monthly);

  const loadRazorpayCheckout = () =>
    new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('window unavailable'));
      if (window.Razorpay) return resolve();
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
      document.body.appendChild(script);
    });

  const handlePayWithRazorpay = async () => {
    if (user?.role !== 'business_owner') {
      toast.error('Only the business owner can pay via Razorpay.');
      return;
    }
    if (!canPayWithRazorpay) {
      toast.error('Razorpay payment is not available right now.');
      return;
    }

    setRazorpayBusy(true);
    try {
      const orderRes = await api.post('/payments/create-order', { billing_cycle: billingCycle });
      const order = orderRes.data;

      await loadRazorpayCheckout();
      const key = paymentOffer?.razorpay_key_id;
      if (!key) throw new Error('Razorpay key not configured');

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'NexaERP',
        description: paymentNote,
        order_id: order.order_id,
        prefill: {
          name: user?.name || business?.owner_name || business?.name || 'Business',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#C9A84C' },
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/payments/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              billing_cycle: billingCycle,
            });

            const verify = verifyRes.data;
            if (verify?.new_expiry_date) {
              toast.success(
                `Payment successful. Subscription extended till ${new Date(verify.new_expiry_date).toLocaleDateString('en-IN')}.`
              );
            } else {
              toast.success('Payment successful. Subscription extended.');
            }
            await refreshUser();
            const offer = await api.get('/subscription/payment-offer');
            setPaymentOffer(offer.data);
          } catch (e) {
            const d = e.response?.data?.detail;
            toast.error(typeof d === 'string' ? d : (e.response?.data?.message || 'Payment verification failed'));
          } finally {
            setRazorpayBusy(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      const d = e.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : (e.response?.data?.message || 'Could not start Razorpay payment'));
      setRazorpayBusy(false);
    }
  };

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const inventoryOn = Array.isArray(enabledModules) && effectiveModuleEnabled(enabledModules, 'inventory_billing');
  const PIE_COLORS = ['#D4AF37', '#b8860b', '#9ca3af', '#6b7280', '#4b5563', '#f59e0b', '#10b981'];

  const kpiRow = canNav('/finance')
    ? [
        { label: 'Monthly Revenue', value: fmt(s.monthly_revenue), icon: IndianRupee, color: 'text-gold-400', bg: 'from-gold-500/10' },
        { label: 'Outstanding Amount', value: fmt(s.outstanding_invoices), icon: FileText, color: 'text-amber-400', bg: 'from-amber-500/10' },
        { label: 'Net Profit', value: fmt(s.net_profit), icon: TrendingUp, color: s.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400', bg: s.net_profit >= 0 ? 'from-emerald-500/10' : 'from-rose-500/10' },
        { label: 'Total Expenses', value: fmt(s.total_expenses), icon: Receipt, color: 'text-rose-400', bg: 'from-rose-500/10' },
        { label: 'GST Payable', value: fmt(s.gst_payable ?? 0), icon: Landmark, color: 'text-violet-400', bg: 'from-violet-500/10' },
      ]
    : [];

  const salesM = data?.sales_this_month || { total: 0, paid: 0, unpaid: 0 };
  const purM = data?.purchases_this_month || { total: 0, paid: 0, unpaid: 0 };
  const expensePie = (data?.expense_by_category || []).map((x) => ({ name: x.category || 'Other', value: x.amount }));
  const topCust = data?.top_customers || [];
  const stockAlerts = data?.stock_alerts || [];
  const recentInv = data?.recent_invoices || [];

  const paidSplitPct = (row) => {
    const t = Number(row.total) || 0;
    if (t <= 0) return { paid: 0, unpaid: 100 };
    const p = Math.min(100, Math.round(((Number(row.paid) || 0) / t) * 100));
    return { paid: p, unpaid: 100 - p };
  };
  const sp = paidSplitPct(salesM);
  const pp = paidSplitPct(purM);

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="business-dashboard">
        {!payOfferLoading &&
          paymentOffer?.razorpay_eligible &&
          (paymentOffer?.can_pay_monthly || paymentOffer?.can_pay_yearly) && (
          <div className="glass-card rounded-2xl p-4 border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-gold-500/5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-display text-lg text-white">Extend subscription</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      disabled={!paymentOffer?.can_pay_monthly}
                      onClick={() => setBillingCycle('monthly')}
                      className={`btn-premium whitespace-nowrap px-3 h-[36px] ${billingCycle === 'monthly' ? 'btn-primary' : 'btn-secondary'} ${!paymentOffer?.can_pay_monthly ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      disabled={!paymentOffer?.can_pay_yearly}
                      onClick={() => setBillingCycle('yearly')}
                      className={`btn-premium whitespace-nowrap px-3 h-[36px] ${billingCycle === 'yearly' ? 'btn-primary' : 'btn-secondary'} ${!paymentOffer?.can_pay_yearly ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      Yearly
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Pay <span className="text-emerald-300 font-semibold">{fmt(amount)}</span>
                    {billingCycle === 'yearly' ? (
                      <> — extends access by <span className="text-gray-200">{paymentOffer.renewal_extend_days_yearly}</span> days after you confirm.</>
                    ) : (
                      <> — extends access by <span className="text-gray-200">{paymentOffer.renewal_extend_days}</span> days after you confirm.</>
                    )}
                    {' '}
                    Razorpay extends immediately after verification.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePayWithRazorpay}
                  className="btn-premium btn-primary whitespace-nowrap"
                  disabled={user?.role !== 'business_owner' || !canPayWithRazorpay || razorpayBusy}
                >
                  <CreditCard size={16} /> {razorpayBusy ? 'Processing…' : 'Pay with Razorpay'}
                </button>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-xs text-gray-400">
                Razorpay extends immediately after successful payment verification.
              </p>
            </div>
          </div>
        )}

        {showUpgradeWarning && (
          <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-rose-500/5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                <h2 className="font-display text-lg text-white">Warning: Upgrade Required</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {statusLower === 'trial'
                    ? `Only ${business?.days_remaining ?? 0} days left in trial. Upgrade now to avoid service interruption.`
                    : 'Your account is restricted. Upgrade now to reactivate all features.'}
                </p>
                </div>
              </div>
              <button onClick={() => setShowUpgrade(true)} className="btn-premium btn-primary whitespace-nowrap">
                <Sparkles size={16} /> Upgrade Plan
              </button>
            </div>
          </div>
        )}

        <div>
          <h1 className="font-display text-2xl text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 font-sans mt-1">Business overview and key metrics</p>
        </div>

        {/* ROW 1 — KPIs */}
        {kpiRow.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {kpiRow.map((c) => (
              <div key={c.label} className="stat-card" data-testid={`stat-${c.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.bg} to-transparent flex items-center justify-center mb-3`}>
                  <c.icon size={17} className={c.color} />
                </div>
                <p className="text-xs text-gray-500 font-sans">{c.label}</p>
                <p className={`text-lg sm:text-xl font-bold mt-0.5 font-sans ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ROW 2 — Sales & Purchases this month */}
        {canNav('/finance') && (
          <div className="grid md:grid-cols-2 gap-5">
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display text-lg text-white mb-1">Sales This Month</h3>
              <p className="text-2xl font-bold text-gold-400 font-sans">{fmt(salesM.total)}</p>
              <p className="text-xs text-gray-500 mt-2 mb-3">Paid vs unpaid (by amount recorded)</p>
              <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden flex">
                <div className="h-full bg-emerald-500/80" style={{ width: `${sp.paid}%` }} title="Paid" />
                <div className="h-full bg-amber-500/70" style={{ width: `${sp.unpaid}%` }} title="Unpaid" />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 mt-2">
                <span className="text-emerald-400/90">Paid {fmt(salesM.paid)}</span>
                <span className="text-amber-400/90">Unpaid {fmt(salesM.unpaid)}</span>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display text-lg text-white mb-1">Purchases This Month</h3>
              <p className="text-2xl font-bold text-gold-400 font-sans">{fmt(purM.total)}</p>
              <p className="text-xs text-gray-500 mt-2 mb-3">Paid vs unpaid (by amount recorded)</p>
              <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden flex">
                <div className="h-full bg-emerald-500/80" style={{ width: `${pp.paid}%` }} />
                <div className="h-full bg-amber-500/70" style={{ width: `${pp.unpaid}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 mt-2">
                <span className="text-emerald-400/90">Paid {fmt(purM.paid)}</span>
                <span className="text-amber-400/90">Unpaid {fmt(purM.unpaid)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ROW 3 — Charts */}
        {canNav('/finance') && (
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="glass-card rounded-2xl p-5 min-h-[300px]">
              <h3 className="font-display text-lg text-white mb-4">Revenue Trend</h3>
              {data?.chart_data?.length > 0 ? (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chart_data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${(v / 1000).toFixed(0)}k`)} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                      <Tooltip
                        contentStyle={{ background: '#111118', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8 }}
                        labelStyle={{ color: '#e5e7eb' }}
                        formatter={(value) => [fmt(value), 'Revenue']}
                      />
                      <Bar dataKey="revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-12">No revenue data yet</p>
              )}
            </div>
            <div className="glass-card rounded-2xl p-5 min-h-[300px]">
              <h3 className="font-display text-lg text-white mb-4">Expenses Breakdown</h3>
              {expensePie.length > 0 ? (
                <div className="h-[240px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expensePie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                        {expensePie.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#111118', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8 }}
                        formatter={(value) => fmt(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-12">No approved expenses this month</p>
              )}
            </div>
          </div>
        )}

        {/* ROW 4 — Stock & Recent invoices */}
        <div className="grid lg:grid-cols-2 gap-5">
          {inventoryOn ? (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display text-lg text-white mb-4">Stock Alerts</h3>
              {stockAlerts.length > 0 ? (
                <ul className="space-y-2 max-h-72 overflow-y-auto">
                  {stockAlerts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{p.name}</p>
                        {p.sku ? <p className="text-[11px] text-gray-500 font-mono">{p.sku}</p> : null}
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                          p.level === 'out' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                        }`}
                      >
                        {p.level === 'out' ? 'Out' : 'Low'} · {p.current_stock}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">No low or out-of-stock items</p>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-5 flex items-center justify-center min-h-[200px]">
              <p className="text-sm text-gray-500 text-center">Stock alerts appear when Inventory is enabled for your business.</p>
            </div>
          )}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg text-white mb-4">Recent Invoices</h3>
            {recentInv.length > 0 ? (
              <ul className="space-y-2">
                {recentInv.map((inv) => {
                  const unpaid = Number(inv.balance_due) > 0.5;
                  return (
                    <li key={inv.id} className="border-b border-white/[0.05] last:border-0 pb-3 last:pb-0">
                      <Link to={`/finance/invoices/${inv.id}`} className="flex items-start justify-between gap-3 group">
                        <div className="min-w-0">
                          <p className="text-sm text-white group-hover:text-gold-400 transition-colors truncate">{inv.client_name}</p>
                          <p className="text-[11px] text-gray-500 font-mono mt-0.5">{inv.invoice_number}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-gold-400">{fmt(inv.total_amount)}</p>
                          <span
                            className={`inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              unpaid ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
                            }`}
                          >
                            {unpaid ? 'Unpaid' : 'Paid'}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">No invoices yet</p>
            )}
          </div>
        </div>

        {/* ROW 5 — Top customers */}
        {canNav('/finance') && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg text-white mb-4">Top 5 Customers (revenue)</h3>
            {topCust.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={topCust} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(v) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}k`)} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#d1d5db', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                    <Tooltip
                      contentStyle={{ background: '#111118', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8 }}
                      formatter={(value) => [fmt(value), 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#D4AF37" radius={[0, 6, 6, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">No paid-invoice revenue data yet</p>
            )}
          </div>
        )}
      </div>

      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="bg-void border-white/10 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-2xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-400" /> Upgrade Your Subscription
            </DialogTitle>
          </DialogHeader>
          <div className="grid lg:grid-cols-2 gap-5 mt-2">
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Choose a billing plan and pay securely via Razorpay. After payment verification, your subscription will extend immediately.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm border transition-colors relative ${
                    billingCycle === 'yearly'
                      ? 'bg-gold-500/15 border-gold-500/40 text-gold-300 shadow-[0_0_0_1px_rgba(212,175,55,0.25)]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <span className="absolute -top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    MOST POPULAR
                  </span>
                  Yearly
                  <div className="text-xs mt-1">₹4,788 (₹399 x 12)</div>
                  <div className="text-[10px] mt-1 text-emerald-300">
                    Save ₹{yearlySavings.toLocaleString('en-IN')} / year ({yearlySavingsPct}% OFF)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm border transition-colors ${
                    billingCycle === 'monthly'
                      ? 'bg-gold-500/15 border-gold-500/40 text-gold-300'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Monthly
                  <div className="text-xs mt-1">₹499</div>
                  <div className="text-[10px] mt-1 text-gray-500">Flexible pay-as-you-go</div>
                </button>
              </div>
              <div className="glass-card rounded-xl p-4 border border-gold-500/20">
                <p className="text-xs text-gray-500">Paying now</p>
                <p className="text-3xl font-bold text-gold-400 mt-1">₹{amount}</p>
                <p className="text-xs text-gray-500 mt-1">{planLabel}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePayWithRazorpay}
                  className="btn-premium btn-primary flex-1"
                  disabled={!canPayWithRazorpay || razorpayBusy}
                >
                  <CreditCard size={16} /> {razorpayBusy ? 'Processing…' : 'Pay with Razorpay'}
                </button>
              </div>
              <button onClick={() => copyText(paymentNote, 'Payment note')} className="w-full text-xs text-gray-400 hover:text-gray-300">
                Copy payment note
              </button>

              <div className="glass-card rounded-xl p-4 border border-white/10">
                <h4 className="text-sm font-semibold text-white mb-3">Why Upgrade</h4>
                <div className="space-y-2">
                  {[
                    'Unlimited access to all enabled ERP modules',
                    'No interruption after trial period ends',
                    'Faster invoicing, GST reports and ledger workflows',
                    'Priority support for setup and migration'
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-gray-400">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 border border-gold-500/20">
                <h4 className="text-sm font-semibold text-white mb-3">Plan Comparison</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Monthly plan (12 months)</span>
                    <span>₹{monthlyTotalYearlyEquivalent.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Yearly plan total</span>
                    <span>₹{(399 * 12).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between text-emerald-300 font-semibold">
                    <span>Your savings with yearly</span>
                    <span>₹{yearlySavings.toLocaleString('en-IN')} ({yearlySavingsPct}% OFF)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/10 flex flex-col items-center">
              <div className="flex items-center gap-2 text-gray-300 mb-3">
                <CreditCard size={16} className="text-gold-400" />
                <span className="text-sm">Razorpay checkout</span>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                After successful payment verification, subscription access is extended automatically.
              </p>
              <div className="w-full mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <ShieldCheck size={14} className="mx-auto text-emerald-400 mb-1" />
                  <p className="text-[10px] text-gray-500">Secure</p>
                </div>
                <div className="text-center">
                  <Headphones size={14} className="mx-auto text-blue-400 mb-1" />
                  <p className="text-[10px] text-gray-500">Support</p>
                </div>
                <div className="text-center">
                  <Clock3 size={14} className="mx-auto text-amber-400 mb-1" />
                  <p className="text-[10px] text-gray-500">Quick Activation</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
