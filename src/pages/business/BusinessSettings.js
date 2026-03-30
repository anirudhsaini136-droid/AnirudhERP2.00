import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save, Building2, CreditCard, FileText, Landmark, BookOpen, IndianRupee, QrCode, Smartphone, Copy, CheckCircle2 } from 'lucide-react';
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

export default function BusinessSettings() {
  const { api, refreshUser, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [paymentOffer, setPaymentOffer] = useState(null);
  const [payOfferLoading, setPayOfferLoading] = useState(true);
  const [razorpayBusy, setRazorpayBusy] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  const [form, setForm] = useState({
    name: '', phone: '', address: '', city: '', country: '', state: ''
  });

  const [invoiceForm, setInvoiceForm] = useState({
    invoice_gst: '',
    invoice_pan: '',
    invoice_footer_note: '',
    invoice_logo_url: '',
    terms_of_sale: '',
    upi_vpa: '',
    upi_name: '',
    whatsapp_number: '',
    wati_api_endpoint: '',
    wati_api_token: '',
  });

  const [bankForm, setBankForm] = useState({
    invoice_bank_name: '',
    invoice_bank_account: '',
    invoice_bank_ifsc: ''
  });

  useEffect(() => {
    api.get('/dashboard/settings').then(r => {
      setData(r.data);
      const b = r.data.business || {};
      setForm({
        name: b.name || '',
        phone: b.phone || '',
        address: b.address || '',
        city: b.city || '',
        country: b.country || '',
        state: b.state || ''
      });
      setInvoiceForm({
        invoice_gst: b.invoice_gst || '',
        invoice_pan: b.invoice_pan || '',
        invoice_footer_note: b.invoice_footer_note || '',
        invoice_logo_url: b.invoice_logo_url || '',
        terms_of_sale: b.terms_of_sale || '',
        upi_vpa: b.upi_vpa || '',
        upi_name: b.upi_name || '',
        whatsapp_number: b.whatsapp_number || '',
        wati_api_endpoint: b.wati_api_endpoint || '',
        wati_api_token: b.wati_api_token || '',
      });
      setBankForm({
        invoice_bank_name: b.invoice_bank_name || '',
        invoice_bank_account: b.invoice_bank_account || '',
        invoice_bank_ifsc: b.invoice_bank_ifsc || ''
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    if (!user?.business_id || user?.role === 'super_admin') {
      setPaymentOffer(null);
      setPayOfferLoading(false);
      return;
    }
    setPayOfferLoading(true);
    setSelectedBillingCycle('monthly');
    api
      .get('/subscription/payment-offer')
      .then((r) => setPaymentOffer(r.data))
      .catch(() => setPaymentOffer(null))
      .finally(() => setPayOfferLoading(false));
  }, [api, user?.business_id, user?.role]);

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

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

    const amount =
      selectedBillingCycle === 'yearly' ? paymentOffer?.yearly_payable_amount : paymentOffer?.monthly_payable_amount;
    const canPayWithRazorpay =
      Boolean(paymentOffer?.razorpay_enabled) &&
      Boolean(paymentOffer?.razorpay_eligible) &&
      Number(amount || 0) > 0;

    if (!canPayWithRazorpay) {
      toast.error('Razorpay payment is not available right now.');
      return;
    }

    setRazorpayBusy(true);
    try {
      const orderRes = await api.post('/payments/create-order', { billing_cycle: selectedBillingCycle });
      const order = orderRes.data;

      await loadRazorpayCheckout();
      const key = paymentOffer?.razorpay_key_id;
      if (!key) throw new Error('Razorpay key not configured');

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'NexaERP',
        description: paymentOffer?.payment_note || 'Subscription extension',
        order_id: order.order_id,
        prefill: {
          name: user?.name || data?.business?.owner_name || data?.business?.name || 'Business',
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
              billing_cycle: selectedBillingCycle,
            });

            const verify = verifyRes.data;
            if (verify?.new_expiry_date) {
              toast.success(
                `Payment successful. Subscription extended till ${new Date(verify.new_expiry_date).toLocaleDateString('en-IN')}.`
              );
            } else {
              toast.success('Payment successful. Subscription extended.');
            }

            const offer = await api.get('/subscription/payment-offer');
            setPaymentOffer(offer.data);

            const settings = await api.get('/dashboard/settings');
            setData(settings.data);

            await refreshUser();
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/dashboard/settings', form);
      toast.success('Business profile saved');
      refreshUser();
    } catch {
      toast.error('Failed to save profile');
    }
    setSaving(false);
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    setSavingInvoice(true);
    try {
      await api.put('/dashboard/settings/invoice', invoiceForm);
      toast.success('Invoice settings saved');
    } catch {
      toast.error('Failed to save invoice settings');
    }
    setSavingInvoice(false);
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    setSavingBank(true);
    try {
      await api.put('/dashboard/settings/invoice', bankForm);
      toast.success('Bank details saved');
    } catch {
      toast.error('Failed to save bank details');
    }
    setSavingBank(false);
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  const sub = data?.subscription || {};
  const selectedAmount =
    selectedBillingCycle === 'yearly'
      ? paymentOffer?.yearly_payable_amount ?? 4788
      : paymentOffer?.monthly_payable_amount ?? 499;
  const selectedExtendDays =
    selectedBillingCycle === 'yearly'
      ? paymentOffer?.renewal_extend_days_yearly ?? 360
      : paymentOffer?.renewal_extend_days ?? 30;
  const yearlyBasePerMonth =
    paymentOffer?.yearly_payable_amount && paymentOffer.yearly_payable_amount > 0
      ? Math.round((paymentOffer.yearly_payable_amount / 12) * 100) / 100
      : 399;

  const canPayWithRazorpay =
    Boolean(paymentOffer?.razorpay_enabled) &&
    Boolean(paymentOffer?.razorpay_eligible) &&
    Number(selectedAmount || 0) > 0 &&
    (selectedBillingCycle === 'yearly' ? paymentOffer?.can_pay_yearly : paymentOffer?.can_pay_monthly);

  const daysRemaining = Number(sub.days_remaining || 0);
  const accessDenomDays = daysRemaining > 60 ? 365 : 30;
  const accessPct = Math.round(Math.min(100, Math.max(0, (daysRemaining / (accessDenomDays || 1)) * 100)));

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-display text-2xl text-white">Business Settings</h1>
          <p className="text-sm text-gray-500 font-sans mt-1">Manage your business profile, invoice settings and bank details</p>
        </div>

        {/* Subscription */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-gold-400" />
            <h2 className="font-display text-lg text-white">Subscription</h2>
          </div>

          {/* Current plan card */}
          <div className="rounded-2xl p-4 border border-[#d4a017]/40 bg-gradient-to-br from-[#0b1223] via-[#0f172a] to-[#111827]">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d4a017]/50 bg-[#d4a017]/10 px-3 py-1 text-[12px] font-bold text-[#d4a017]">
                    {sub.plan || "Plan"}
                  </span>
                  <span className={`badge-premium ${sub.status === "active" ? "badge-success" : sub.status === "trial" ? "badge-warning" : "badge-danger"} mt-0.5 inline-block`}>
                    {sub.status || "status"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Expires</span>
                      <span className="text-sm text-white font-semibold">{fmtDate(sub.expires_at)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Days remaining</p>
                    <p className={`text-sm font-semibold mt-0.5 ${Number(sub.days_remaining || 0) < 7 ? "text-rose-400" : "text-[#d4a017]"}`}>
                      {sub.days_remaining ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="md:min-w-[260px]">
                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <span>Trial remaining</span>
                  <span className="text-gray-300 font-semibold">
                    {accessPct}
                    %
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.round(
                        Math.min(100, Math.max(0, accessPct))
                      )}%`,
                      backgroundColor: daysRemaining < 7 ? "#fb7185" : "#d4a017",
                    }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {daysRemaining < 7 ? `Your trial expires in ${daysRemaining} days. Upgrade to continue.` : "You're good to go"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10">
            {payOfferLoading ? (
              <p className="text-xs text-gray-500">Loading payment options...</p>
            ) : (
              paymentOffer?.razorpay_eligible && (
                <div className="space-y-4">
                  {/* Plan selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Monthly */}
                    <button
                      type="button"
                      disabled={!paymentOffer.can_pay_monthly}
                      onClick={() => setSelectedBillingCycle("monthly")}
                      className={`relative text-left rounded-2xl border p-4 transition-all transform hover:-translate-y-0.5 hover:shadow-xl hover:border-[#d4a017]/60 ${
                        selectedBillingCycle === "monthly"
                          ? "border-[#d4a017] bg-[#d4a017]/10"
                          : "border-white/10 bg-white/[0.02]"
                      } ${!paymentOffer.can_pay_monthly ? "opacity-40 cursor-not-allowed hover:shadow-none hover:-translate-y-0" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-gray-400">Monthly</p>
                            <p className="text-lg font-bold text-white mt-0.5">{fmt(paymentOffer.monthly_payable_amount ?? 499)}</p>
                            <p className="text-[11px] text-gray-400 mt-1">+{paymentOffer.renewal_extend_days ?? 30} days</p>
                        </div>
                        {selectedBillingCycle === "monthly" ? (
                          <span className="inline-flex items-center rounded-full border border-[#d4a017]/50 bg-[#d4a017]/10 px-2 py-1 text-[11px] font-bold text-[#d4a017]">
                            Selected
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-2">Included</p>
                        <ul className="space-y-2 text-[12px] text-gray-300">
                          {[
                            "All enabled ERP modules",
                            "Invoices, GST reports & ledger updates",
                            "Inventory + purchase management",
                            "Priority support & updates",
                          ].map((f) => (
                            <li key={f} className="flex items-start gap-2">
                              <CheckCircle2 size={14} className="text-[#d4a017] mt-0.5" />
                              <span className="leading-4">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </button>

                    {/* Yearly */}
                    <button
                      type="button"
                      disabled={!paymentOffer.can_pay_yearly}
                      onClick={() => setSelectedBillingCycle("yearly")}
                      className={`relative text-left rounded-2xl border p-4 transition-all transform hover:-translate-y-0.5 hover:shadow-xl hover:border-[#d4a017]/60 ${
                        selectedBillingCycle === "yearly"
                          ? "border-[#d4a017] bg-[#d4a017]/10"
                          : "border-white/10 bg-white/[0.02]"
                      } ${!paymentOffer.can_pay_yearly ? "opacity-40 cursor-not-allowed hover:shadow-none hover:-translate-y-0" : ""}`}
                    >
                      <div className="absolute -top-2 right-3">
                        <span className="inline-flex items-center rounded-full border border-[#d4a017]/50 bg-[#d4a017]/15 px-3 py-1 text-[10px] font-extrabold text-[#ffd966]">
                          Best Value
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-gray-400">Yearly</p>
                          <p className="text-lg font-bold text-white mt-0.5">
                            {fmt(yearlyBasePerMonth)} <span className="text-[12px] text-gray-400 font-semibold">/ month</span>
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            x12 = {fmt(paymentOffer.yearly_payable_amount ?? 4788)} • +{paymentOffer.renewal_extend_days_yearly ?? 360} days
                          </p>
                        </div>
                      </div>

                      {/* Savings */}
                      {Number(paymentOffer.monthly_payable_amount ?? 499) > 0 && Number(paymentOffer.yearly_payable_amount ?? 4788) > 0 ? (
                        (() => {
                          const monthly12 = Number(paymentOffer.monthly_payable_amount ?? 499) * 12;
                          const yearlyTotal = Number(paymentOffer.yearly_payable_amount ?? 4788);
                          const savings = Math.max(0, monthly12 - yearlyTotal);
                          const savingsPct = monthly12 > 0 ? Math.round((savings / monthly12) * 100) : 0;
                          return (
                            <div className="mt-2">
                              <p className="text-[11px] text-[#d4a017] font-bold">
                                Save ₹{fmt(savings)} ({savingsPct}%)
                              </p>
                            </div>
                          );
                        })()
                      ) : null}

                      <div className="mt-3">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-2">Included</p>
                        <ul className="space-y-2 text-[12px] text-gray-300">
                          {[
                            "All enabled ERP modules",
                            "Invoices, GST reports & ledger updates",
                            "Inventory + purchase management",
                            "Priority support & updates",
                          ].map((f) => (
                            <li key={f} className="flex items-start gap-2">
                              <CheckCircle2 size={14} className="text-[#d4a017] mt-0.5" />
                              <span className="leading-4">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </button>
                  </div>

                  {/* Payment button */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    {user?.role === "business_owner" ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-gray-400">
                              Pay {selectedBillingCycle === "yearly" ? "Yearly" : "Monthly"} via Razorpay
                            </p>
                            <p className="text-lg font-bold text-white mt-0.5">{fmt(selectedAmount)}</p>
                            <p className="text-[11px] text-gray-400 mt-1">+{selectedExtendDays || 0} days</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-gray-500">Instant activation after verification</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handlePayWithRazorpay}
                          disabled={!canPayWithRazorpay || razorpayBusy}
                          className={`mt-4 w-full rounded-xl px-4 py-3 font-extrabold text-[#0b1223] bg-gradient-to-r from-[#d4a017] via-[#f1c24b] to-[#d4a017] border border-[#d4a017]/60 shadow-[0_0_0_1px_rgba(212,160,23,0.15),0_12px_30px_rgba(212,160,23,0.14)] transition hover:brightness-110 ${
                            !canPayWithRazorpay || razorpayBusy ? "opacity-50 cursor-not-allowed hover:brightness-100" : ""
                          }`}
                        >
                          <span className="inline-flex items-center justify-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#d4a017]/15 border border-[#d4a017]/60 text-[#d4a017] font-black text-[14px]">
                              N
                            </span>
                            Razorpay
                            {razorpayBusy ? "— Processing…" : ""}
                          </span>
                        </button>
                      </>
                    ) : (
                      <div className="text-xs text-amber-200/80">Only the business owner can pay here.</div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Business Profile */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-gold-400" />
            <h2 className="font-display text-lg text-white">Business Profile</h2>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label className="text-gray-400 text-xs">Business Name</Label>
              <Input className="input-premium mt-1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Phone</Label>
                <Input className="input-premium mt-1" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">City</Label>
                <Input className="input-premium mt-1" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Country</Label>
                <Input className="input-premium mt-1" value={form.country} onChange={e => setForm({...form, country: e.target.value})} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">State <span className="text-gold-400">(for GST)</span></Label>
                <select className="input-premium mt-1 w-full" value={form.state} onChange={e => setForm({...form, state: e.target.value})}>
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Address</Label>
              <textarea className="input-premium mt-1 h-20 resize-none w-full" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            <button type="submit" disabled={saving} className="btn-premium btn-primary flex items-center gap-2">
              <Save size={15} /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Invoice Settings — GST, PAN, footer */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={18} className="text-gold-400" />
            <h2 className="font-display text-lg text-white">Invoice Settings</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">GST, PAN and footer note printed on every invoice.</p>
          <form onSubmit={handleSaveInvoice} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">GST Number</Label>
                <Input
                  className="input-premium mt-1"
                  placeholder="22AAAAA0000A1Z5"
                  value={invoiceForm.invoice_gst}
                  onChange={e => setInvoiceForm({...invoiceForm, invoice_gst: e.target.value.toUpperCase()})}
                  maxLength={15}
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">PAN Number</Label>
                <Input
                  className="input-premium mt-1"
                  placeholder="AAAAA0000A"
                  value={invoiceForm.invoice_pan}
                  onChange={e => setInvoiceForm({...invoiceForm, invoice_pan: e.target.value.toUpperCase()})}
                  maxLength={10}
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Invoice Footer Note</Label>
              <textarea
                className="input-premium mt-1 h-16 resize-none w-full"
                placeholder="Thank you for your business. Payment due within 30 days."
                value={invoiceForm.invoice_footer_note}
                onChange={e => setInvoiceForm({...invoiceForm, invoice_footer_note: e.target.value})}
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Terms of Sale</Label>
              <textarea
                className="input-premium mt-1 h-24 resize-none w-full"
                placeholder={"Disputes subject to local jurisdiction only.\nGoods once sold will not be returned.\nWarranty as per manufacturer terms."}
                value={invoiceForm.terms_of_sale}
                onChange={e => setInvoiceForm({...invoiceForm, terms_of_sale: e.target.value})}
              />
              <p className="text-[10px] text-gray-600 mt-1">Printed at the bottom of every invoice.</p>
            </div>

            {/* UPI QR Settings */}
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <p className="text-xs text-gold-400 font-semibold uppercase tracking-wider mb-3">UPI QR</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-xs">UPI VPA (receiver address)</Label>
                  <Input
                    className="input-premium mt-1"
                    placeholder="e.g. merchant@upi"
                    value={invoiceForm.upi_vpa}
                    onChange={e => setInvoiceForm({ ...invoiceForm, upi_vpa: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Receiver Name (optional)</Label>
                  <Input
                    className="input-premium mt-1"
                    placeholder="e.g. Merchant Pvt Ltd"
                    value={invoiceForm.upi_name}
                    onChange={e => setInvoiceForm({ ...invoiceForm, upi_name: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mt-2">
                Used to generate UPI payment QR on invoices (works offline).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-3">WhatsApp API (Optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-xs">Default WhatsApp Number (optional)</Label>
                  <Input
                    className="input-premium mt-1"
                    placeholder="e.g. 919876543210"
                    value={invoiceForm.whatsapp_number}
                    onChange={e => setInvoiceForm({ ...invoiceForm, whatsapp_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">API Endpoint</Label>
                  <Input
                    className="input-premium mt-1"
                    placeholder="https://api.provider.com/whatsapp/send"
                    value={invoiceForm.wati_api_endpoint}
                    onChange={e => setInvoiceForm({ ...invoiceForm, wati_api_endpoint: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-gray-400 text-xs">API Token</Label>
                <Input
                  className="input-premium mt-1"
                  placeholder="Paste API token"
                  value={invoiceForm.wati_api_token}
                  onChange={e => setInvoiceForm({ ...invoiceForm, wati_api_token: e.target.value })}
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-2">
                If endpoint + token are set, invoice reminders can be sent directly via API. Otherwise system opens WhatsApp Web.
              </p>
            </div>
            <button type="submit" disabled={savingInvoice} className="btn-premium btn-primary flex items-center gap-2">
              <Save size={15} /> {savingInvoice ? 'Saving...' : 'Save Invoice Settings'}
            </button>
          </form>
        </div>

        {/* Bank Details */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Landmark size={18} className="text-gold-400" />
            <h2 className="font-display text-lg text-white">Bank Details</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">Displayed on invoices so customers can make bank transfers.</p>
          <form onSubmit={handleSaveBank} className="space-y-4">
            <div>
              <Label className="text-gray-400 text-xs">Bank Name</Label>
              <Input
                className="input-premium mt-1"
                placeholder="e.g. HDFC Bank"
                value={bankForm.invoice_bank_name}
                onChange={e => setBankForm({...bankForm, invoice_bank_name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Account Number</Label>
                <Input
                  className="input-premium mt-1"
                  placeholder="1234567890"
                  value={bankForm.invoice_bank_account}
                  onChange={e => setBankForm({...bankForm, invoice_bank_account: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">IFSC Code</Label>
                <Input
                  className="input-premium mt-1"
                  placeholder="HDFC0001234"
                  value={bankForm.invoice_bank_ifsc}
                  onChange={e => setBankForm({...bankForm, invoice_bank_ifsc: e.target.value.toUpperCase()})}
                  maxLength={11}
                />
              </div>
            </div>

            {/* Preview if filled */}
            {(bankForm.invoice_bank_name || bankForm.invoice_bank_account) && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Preview on Invoice</p>
                <div className="flex gap-8 flex-wrap">
                  {bankForm.invoice_bank_name && (
                    <div>
                      <p className="text-[10px] text-gray-600">Bank</p>
                      <p className="text-sm text-white font-medium">{bankForm.invoice_bank_name}</p>
                    </div>
                  )}
                  {bankForm.invoice_bank_account && (
                    <div>
                      <p className="text-[10px] text-gray-600">Account No.</p>
                      <p className="text-sm text-white font-medium">{bankForm.invoice_bank_account}</p>
                    </div>
                  )}
                  {bankForm.invoice_bank_ifsc && (
                    <div>
                      <p className="text-[10px] text-gray-600">IFSC</p>
                      <p className="text-sm text-white font-medium">{bankForm.invoice_bank_ifsc}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button type="submit" disabled={savingBank} className="btn-premium btn-primary flex items-center gap-2">
              <Save size={15} /> {savingBank ? 'Saving...' : 'Save Bank Details'}
            </button>
          </form>
        </div>

        {/* Invite CA */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={18} className="text-blue-400" />
            <h2 className="font-display text-lg text-white">Invite CA / Accountant</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">Give your CA read-only access to GST Reports, Invoices and Finance data.</p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
              const res = await api.post('/dashboard/invite-ca', {
                email: fd.get('email'), first_name: fd.get('first_name'),
                last_name: fd.get('last_name'), role: 'ca_admin'
              });
              toast.success(`CA invited! Credentials: ${res.data.credentials.email} / ${res.data.credentials.temporary_password}`);
              e.target.reset();
            } catch (err) { toast.error(err.response?.data?.detail || 'Failed to invite CA'); }
          }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">First Name *</Label>
                <Input name="first_name" className="input-premium mt-1" placeholder="Ramesh" required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Last Name *</Label>
                <Input name="last_name" className="input-premium mt-1" placeholder="Sharma" required />
              </div>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">CA Email *</Label>
              <Input name="email" type="email" className="input-premium mt-1" placeholder="ca@example.com" required />
            </div>
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <p className="text-xs text-blue-400">CA will get read-only access to: GST Reports · GSTR-1 Export · Invoices · Purchases · Finance Dashboard</p>
            </div>
            <button type="submit" className="btn-premium btn-secondary flex items-center gap-2">
              <BookOpen size={15} /> Send CA Invite
            </button>
          </form>
        </div>

        {/* Payment History */}
        {data?.payment_history?.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-display text-lg text-white mb-4">Payment History</h2>
            <div className="space-y-2">
              {data.payment_history.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
                  <div>
                    <p className="text-sm text-white">{fmt(p.amount)}</p>
                    <p className="text-xs text-gray-500">{p.payment_method?.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">{p.duration_days} days</p>
                    <p className="text-xs text-gray-600">{fmtDate(p.payment_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
