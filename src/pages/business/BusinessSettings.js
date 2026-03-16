import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save, Building2, CreditCard, FileText, Landmark } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export default function BusinessSettings() {
  const { api, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', address: '', city: '', country: ''
  });

  const [invoiceForm, setInvoiceForm] = useState({
    invoice_gst: '',
    invoice_pan: '',
    invoice_footer_note: '',
    invoice_logo_url: '',
    terms_of_sale: ''
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
        country: b.country || ''
      });
      setInvoiceForm({
        invoice_gst: b.invoice_gst || '',
        invoice_pan: b.invoice_pan || '',
        invoice_footer_note: b.invoice_footer_note || '',
        invoice_logo_url: b.invoice_logo_url || '',
        terms_of_sale: b.terms_of_sale || ''
      });
      setBankForm({
        invoice_bank_name: b.invoice_bank_name || '',
        invoice_bank_account: b.invoice_bank_account || '',
        invoice_bank_ifsc: b.invoice_bank_ifsc || ''
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Plan</p>
              <p className="text-sm text-white font-semibold capitalize mt-0.5">{sub.plan}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <span className={`badge-premium ${sub.status === 'active' ? 'badge-success' : sub.status === 'trial' ? 'badge-warning' : 'badge-danger'} mt-0.5 inline-block`}>{sub.status}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Expires</p>
              <p className="text-sm text-white mt-0.5">{fmtDate(sub.expires_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Days Left</p>
              <p className={`text-sm font-semibold mt-0.5 ${sub.days_remaining <= 7 ? 'text-rose-400' : 'text-emerald-400'}`}>{sub.days_remaining}</p>
            </div>
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
            <div>
              <Label className="text-gray-400 text-xs">Country</Label>
              <Input className="input-premium mt-1" value={form.country} onChange={e => setForm({...form, country: e.target.value})} />
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
