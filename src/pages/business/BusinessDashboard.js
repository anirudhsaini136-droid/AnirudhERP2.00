import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { parseEnabledModules, isNavPathAllowedForModules } from '../../shared-core/modules';
import {
  IndianRupee, Users, FileText, TrendingUp, AlertTriangle, Sparkles, Copy, QrCode, Smartphone, CreditCard,
  ShieldCheck, Headphones, Clock3, CheckCircle2, UserCheck, BarChart3, FileSpreadsheet, Repeat,
  Truck, BookUser, HardDriveDownload, Receipt, BookOpen, Package, ShoppingCart, ClipboardList,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const QUICK_ACCESS = [
  { path: '/dashboard/users', label: 'Manage Users', icon: Users },
  { path: '/hr', label: 'HR Dashboard', icon: UserCheck },
  { path: '/finance', label: 'Finance Dashboard', icon: BarChart3 },
  { path: '/finance/invoices', label: 'Invoices', icon: FileSpreadsheet },
  { path: '/finance/recurring-invoices', label: 'Recurring Invoices', icon: Repeat },
  { path: '/finance/eway-bills', label: 'E-Way Bills', icon: Truck },
  { path: '/finance/customers', label: 'Customer Ledger', icon: BookUser },
  { path: '/finance/migration', label: 'Import data', icon: HardDriveDownload },
  { path: '/finance/expenses', label: 'Expenses', icon: Receipt },
  { path: '/finance/reports', label: 'Reports', icon: BarChart3 },
  { path: '/finance/gst', label: 'GST Reports', icon: IndianRupee },
  { path: '/accounting', label: 'Accounting', icon: BookOpen },
  { path: '/purchases', label: 'Purchases', icon: ClipboardList },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/inventory/billing', label: 'Quick Bill', icon: ShoppingCart },
];

export default function BusinessDashboard() {
  const { api, business, user, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [paymentOffer, setPaymentOffer] = useState(null);
  const [payOfferLoading, setPayOfferLoading] = useState(true);
  const [utr, setUtr] = useState('');
  const [confirmingPay, setConfirmingPay] = useState(false);
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
  const isTrialOrExpired = ['trial', 'expired', 'suspended'].includes((business?.status || '').toLowerCase());
  const upiId = paymentOffer?.upi_vpa || process.env.REACT_APP_UPI_ID || 'anirudhsaini85-2@okaxis';
  const upiName = paymentOffer?.payee_name || process.env.REACT_APP_UPI_NAME || 'Anirudh Saini';
  const amount =
    billingCycle === 'yearly' ? paymentOffer?.yearly_payable_amount : paymentOffer?.monthly_payable_amount;
  const monthlyTotalYearlyEquivalent = 499 * 12;
  const yearlySavings = monthlyTotalYearlyEquivalent - (399 * 12);
  const yearlySavingsPct = Math.round((yearlySavings / monthlyTotalYearlyEquivalent) * 100);
  const planLabel = billingCycle === 'yearly' ? 'Yearly (399x12)' : 'Monthly (499)';
  const paymentNote = paymentOffer?.payment_note || `NexaERP ${planLabel} - ${business?.name || 'Business'} - ${business?.id || ''}`;
  const selectedUpiUrl = billingCycle === 'yearly' ? paymentOffer?.yearly_upi_url : paymentOffer?.monthly_upi_url;
  const upiUrl = selectedUpiUrl || null;
  const qrUrl = upiUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}`
    : null;

  const handlePayNow = () => {
    if (!upiUrl) {
      window.alert('UPI payment is not available right now. If a cash/UPI payment is pending admin approval, wait for it to complete.');
      return;
    }
    window.location.assign(upiUrl);
  };

  const handleConfirmUpiPaid = async () => {
    if (user?.role !== 'business_owner') {
      toast.error('Only the business owner can confirm payment.');
      return;
    }
    setConfirmingPay(true);
    try {
      await api.post('/subscription/confirm-upi-paid', { utr: utr.trim() || undefined, billing_cycle: billingCycle });
      toast.success('Payment submitted. Admin will review and activate within ~30 minutes.');
      setUtr('');
      const offer = await api.get('/subscription/payment-offer');
      setPaymentOffer(offer.data);
      await refreshUser();
    } catch (e) {
      const d = e.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : (e.response?.data?.message || 'Could not confirm payment'));
    }
    setConfirmingPay(false);
  };

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

  const statCards = [
    canNav('/finance') && {
      label: 'Monthly Revenue', value: fmt(s.monthly_revenue), icon: IndianRupee, color: 'text-gold-400', bg: 'from-gold-500/10',
    },
    canNav('/hr') && {
      label: 'Employees', value: s.total_employees || 0, sub: `${s.new_employees || 0} new`, icon: Users, color: 'text-blue-400', bg: 'from-blue-500/10',
    },
    canNav('/finance/invoices') && {
      label: 'Outstanding', value: fmt(s.outstanding_invoices), sub: `${s.overdue_count || 0} overdue`, icon: FileText, color: 'text-amber-400', bg: 'from-amber-500/10',
    },
    (canNav('/accounting') || canNav('/finance')) && {
      label: 'Net Profit', value: fmt(s.net_profit), icon: TrendingUp, color: s.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400', bg: s.net_profit >= 0 ? 'from-emerald-500/10' : 'from-rose-500/10',
    },
  ].filter(Boolean);

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="business-dashboard">
        {!payOfferLoading &&
          (paymentOffer?.upi_eligible || paymentOffer?.razorpay_eligible) &&
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
                    Razorpay extends immediately. UPI requires confirmation/admin review.
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
                <button type="button" onClick={handlePayNow} className="btn-premium btn-secondary whitespace-nowrap" disabled={!upiUrl}>
                  <Smartphone size={16} /> Pay with UPI
                </button>
                <button
                  type="button"
                  onClick={() => copyText(paymentOffer.upi_vpa, 'UPI ID')}
                  className="btn-premium btn-secondary whitespace-nowrap"
                  disabled={!paymentOffer?.upi_vpa}
                >
                  <Copy size={16} /> Copy UPI ID
                </button>
              </div>
            </div>
            <div className="mt-4 grid md:grid-cols-3 gap-3 items-start">
              <div className="md:col-span-2 bg-white/[0.03] border border-white/10 rounded-xl p-3">
                {upiUrl ? (
                  <>
                    <div className="flex items-center gap-2 text-gray-300 mb-2">
                      <QrCode size={16} className="text-gold-400" />
                      <span className="text-sm">Scan & pay</span>
                    </div>
                    <img src={qrUrl} alt="UPI QR" className="w-44 h-44 rounded-xl bg-white p-2" />
                  </>
                ) : (
                  <p className="text-sm text-amber-200/90">
                    UPI option may be temporarily disabled (e.g. pending admin approval). Use Razorpay to extend immediately.
                  </p>
                )}
              </div>
            </div>
            {user?.role === 'business_owner' && upiUrl && (
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-500">UTR / reference (optional)</label>
                  <input
                    className="input-premium mt-1 w-full text-sm"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="e.g. bank reference number"
                  />
                </div>
                <button
                  type="button"
                  disabled={confirmingPay}
                  onClick={handleConfirmUpiPaid}
                  className="btn-premium btn-secondary whitespace-nowrap h-[42px]"
                >
                  {confirmingPay ? 'Saving…' : "I've completed payment"}
                </button>
              </div>
            )}
            {user?.role !== 'business_owner' && (
              <p className="text-xs text-amber-200/80 mt-3">Ask the business owner to open this page and confirm after paying.</p>
            )}
          </div>
        )}

        {isTrialOrExpired && (
          <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-rose-500/5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                <h2 className="font-display text-lg text-white">Warning: Upgrade Required</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {business?.status === 'trial'
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

        {QUICK_ACCESS.some((q) => canNav(q.path)) && (
          <div>
            <h2 className="font-display text-sm text-gray-400 uppercase tracking-wide mb-3">Quick access</h2>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACCESS.filter((q) => canNav(q.path)).map((q) => (
                <Link
                  key={q.path}
                  to={q.path}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-200 hover:bg-white/[0.08] hover:border-gold-500/30 transition-colors"
                >
                  <q.icon size={16} className="text-gold-400 shrink-0" />
                  {q.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stats — one card per enabled module area */}
        {statCards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((c) => (
            <div key={c.label} className="stat-card" data-testid={`stat-${c.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.bg} to-transparent flex items-center justify-center mb-3`}>
                <c.icon size={17} className={c.color} />
              </div>
              <p className="text-xs text-gray-500 font-sans">{c.label}</p>
              <p className={`text-xl font-bold mt-0.5 font-sans ${c.color}`}>{c.value}</p>
              {c.sub && <p className="text-xs text-gray-600 mt-1">{c.sub}</p>}
            </div>
          ))}
        </div>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          {canNav('/finance') && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg text-white mb-4">Revenue Trend</h3>
            {data?.chart_data?.length > 0 ? (
              <div className="space-y-2">
                {data.chart_data.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-10">{d.month}</span>
                    <div className="flex-1 h-5 bg-white/[0.02] rounded overflow-hidden">
                      <div className="h-full bg-gradient-gold rounded opacity-40" style={{ width: `${Math.max(5, (d.revenue / (Math.max(...data.chart_data.map(x => x.revenue)) || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">{fmt(d.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-sm text-center py-8">No revenue data yet</p>}
          </div>
          )}

          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg text-white mb-4">Recent Activity</h3>
            {data?.recent_activity?.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.recent_activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0">
                    <div className="w-2 h-2 rounded-full bg-gold-500/50 shrink-0" />
                    <p className="text-sm text-gray-400 flex-1">{a.description || a.action}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-sm text-center py-8">No activity yet</p>}
          </div>
        </div>
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
              <p className="text-gray-400 text-sm">Choose a billing plan and pay directly via UPI. After payment, share transaction ID with support/admin for instant activation.</p>
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
                <button onClick={handlePayNow} className="btn-premium btn-primary flex-1">
                  <Smartphone size={16} /> Open UPI App
                </button>
                <button onClick={() => copyText(upiId, 'UPI ID')} className="btn-premium btn-secondary flex-1">
                  <Copy size={16} /> Copy UPI ID
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
                <QrCode size={16} className="text-gold-400" />
                <span className="text-sm">Scan QR and pay</span>
              </div>
              <img src={qrUrl} alt="UPI QR for payment" className="w-52 h-52 rounded-xl bg-white p-2" />
              <p className="text-xs text-gray-500 mt-3 text-center">UPI: {upiId}<br />Name: {upiName}</p>
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
