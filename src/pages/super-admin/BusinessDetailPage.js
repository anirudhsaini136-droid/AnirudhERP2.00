import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ArrowLeft, CreditCard, Ban, ChevronUp, LogIn, Eye, EyeOff, FlaskConical, Unlock, Sparkles, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const STATUS_COLORS = { active: 'badge-success', trial: 'badge-warning', expired: 'badge-danger', suspended: 'badge-danger', cancelled: 'badge-neutral' };
const PLAN_COLORS = { starter: 'badge-info', growth: 'badge-gold', enterprise: 'badge-success' };

function PasswordCell({ password }) {
  const [show, setShow] = React.useState(false);
  if (!password) return <span className="text-xs text-gray-600 italic">-</span>;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono text-gray-400">{show ? password : '********'}</span>
      <button onClick={() => setShow(!show)} className="text-gray-500 hover:text-white">
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}


const ALL_MODULES = [
  { id: 'manage_users', label: 'Manage Users', icon: '👤', desc: 'User creation and management' },
  { id: 'hr_payroll', label: 'HR & Payroll', icon: '👥' },
  { id: 'invoices_finance', label: 'Invoices & Finance', icon: '🧾' },
  { id: 'recurring_invoices', label: 'Recurring Invoices', icon: '🔁', desc: 'Scheduled auto-invoices' },
  { id: 'eway_bill', label: 'E-Way Bill', icon: '🚚', desc: 'E-way bill from invoices' },
  { id: 'einvoice', label: 'E-Invoice (IRN)', icon: '📋', desc: 'GST e-invoice on invoice screen' },
  { id: 'inventory_billing', label: 'Inventory & Billing', icon: '📦' },
  { id: 'purchases_itc', label: 'Purchases & ITC', icon: '🛒' },
  { id: 'gst_reports', label: 'GST Reports', icon: '📊' },
  { id: 'customer_ledger', label: 'Customer Ledger', icon: '📒' },
  { id: 'expenses', label: 'Expenses', icon: '💸' },
  { id: 'accounting', label: 'Accounting', icon: '📒', desc: 'Double-entry bookkeeping, P&L, Balance Sheet' },
  { id: 'ca_portal', label: 'CA Portal', icon: '🔐' },
  { id: 'tally_export', label: 'Tally Export', icon: '📤', desc: 'Export data for Tally' },
];

function ModulesEditor({ businessId, api, bizData, onRefresh }) {
  const [modules, setModules] = React.useState(() => {
    try { return JSON.parse(bizData?.modules || '[]'); } catch { return []; }
  });
  const [monthly, setMonthly] = React.useState(bizData?.monthly_amount || 0);
  const [upiCollect, setUpiCollect] = React.useState(
    bizData?.upi_collect_amount != null && bizData?.upi_collect_amount !== '' ? String(bizData.upi_collect_amount) : '',
  );
  const [upiCollectYearly, setUpiCollectYearly] = React.useState(
    bizData?.upi_collect_yearly_monthly_amount != null && bizData?.upi_collect_yearly_monthly_amount !== ''
      ? String(bizData.upi_collect_yearly_monthly_amount)
      : '',
  );
  const [renewExtendDays, setRenewExtendDays] = React.useState(bizData?.renewal_extend_days ?? 30);
  const [maxUsers, setMaxUsers] = React.useState(bizData?.max_users || 5);
  const [maxEmp, setMaxEmp] = React.useState(bizData?.max_employees || 10);
  const [maxInv, setMaxInv] = React.useState(bizData?.max_invoices_month || 100);
  const [maxProd, setMaxProd] = React.useState(bizData?.max_products || 50);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!bizData) return;
    try { setModules(JSON.parse(bizData.modules || '[]')); } catch { setModules([]); }
    setMonthly(bizData.monthly_amount != null && bizData.monthly_amount !== '' ? Number(bizData.monthly_amount) : 0);
    setUpiCollect(
      bizData.upi_collect_amount != null && bizData.upi_collect_amount !== '' ? String(bizData.upi_collect_amount) : '',
    );
    setUpiCollectYearly(
      bizData.upi_collect_yearly_monthly_amount != null && bizData.upi_collect_yearly_monthly_amount !== ''
        ? String(bizData.upi_collect_yearly_monthly_amount)
        : '',
    );
    setRenewExtendDays(Number(bizData.renewal_extend_days) > 0 ? Number(bizData.renewal_extend_days) : 30);
    setMaxUsers(Number(bizData.max_users) || 5);
    setMaxEmp(Number(bizData.max_employees) || 10);
    setMaxInv(Number(bizData.max_invoices_month) || 100);
    setMaxProd(Number(bizData.max_products) || 50);
  }, [bizData]);

  const toggleMod = (id) => setModules(m => m.includes(id) ? m.filter(x => x !== id) : [...m, id]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        modules: JSON.stringify(modules),
        monthly_amount: parseFloat(monthly) || 0,
        renewal_extend_days: parseInt(renewExtendDays, 10) || 30,
        max_users: parseInt(maxUsers) || 5,
        max_employees: parseInt(maxEmp) || 10,
        max_invoices_month: parseInt(maxInv) || 100,
        max_products: parseInt(maxProd) || 50,
      };
      if (upiCollect.trim() !== '') {
        payload.upi_collect_amount = parseFloat(upiCollect) || 0;
      } else {
        payload.upi_collect_amount = null;
      }
      if (upiCollectYearly.trim() !== '') {
        payload.upi_collect_yearly_monthly_amount = parseFloat(upiCollectYearly) || 0;
      } else {
        payload.upi_collect_yearly_monthly_amount = null;
      }
      await api.put(`/super-admin/businesses/${businessId}`, payload);
      onRefresh();
      alert('Saved successfully!');
    } catch(e) { alert('Failed to save: ' + (e.response?.data?.detail || e.message)); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-400">Your monthly revenue from this business (₹)</label>
          <input type="number" className="input-premium mt-1 w-full" value={monthly} onChange={e => setMonthly(e.target.value)} min={0} step={1} />
          <p className="text-[10px] text-gray-600 mt-1">Counted in platform MRR. For active accounts, if this is 0 the plan list price is used instead.</p>
        </div>
        <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400">UPI collect amount (Monthly) (₹)</label>
            <input type="number" className="input-premium mt-1 w-full" value={upiCollect} onChange={e => setUpiCollect(e.target.value)} min={0} step={1} placeholder="e.g. 499 (leave empty to use monthly amount above when &gt; 0)" />
            <p className="text-[10px] text-gray-600 mt-1">Used for tenant “Pay Monthly”.</p>
            <div className="mt-3">
              <label className="text-xs text-gray-400">UPI collect base (Yearly monthly equiv) (₹)</label>
              <input type="number" className="input-premium mt-1 w-full" value={upiCollectYearly} onChange={e => setUpiCollectYearly(e.target.value)} min={0} step={1} placeholder="e.g. 399 (leave empty to use monthly amount above when &gt; 0)" />
              <p className="text-[10px] text-gray-600 mt-1">Tenant pays this * 12 for “Pay Yearly”.</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Days to extend on self-service UPI pay</label>
            <input type="number" className="input-premium mt-1 w-full" value={renewExtendDays} onChange={e => setRenewExtendDays(e.target.value)} min={1} max={3650} step={1} />
            <p className="text-[10px] text-gray-600 mt-1">Added to subscription end date when the owner confirms payment.</p>
          </div>
        </div>
        <div><label className="text-xs text-gray-400">Max Users</label>
          <input type="number" className="input-premium mt-1 w-full" value={maxUsers} onChange={e => setMaxUsers(e.target.value)} /></div>
        <div><label className="text-xs text-gray-400">Max Employees</label>
          <input type="number" className="input-premium mt-1 w-full" value={maxEmp} onChange={e => setMaxEmp(e.target.value)} /></div>
        <div><label className="text-xs text-gray-400">Max Invoices/Month</label>
          <input type="number" className="input-premium mt-1 w-full" value={maxInv} onChange={e => setMaxInv(e.target.value)} /></div>
        <div><label className="text-xs text-gray-400">Max Products</label>
          <input type="number" className="input-premium mt-1 w-full" value={maxProd} onChange={e => setMaxProd(e.target.value)} /></div>
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-2">Active Modules ({modules.length}/{ALL_MODULES.length})</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ALL_MODULES.map(mod => (
            <button key={mod.id} type="button" onClick={() => toggleMod(mod.id)}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-all ${
                modules.includes(mod.id) ? 'border-gold-500/40 bg-gold-500/10 text-gold-400' : 'border-white/10 text-gray-500 hover:border-white/20'
              }`}>
              <span>{mod.icon}</span> {mod.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
      <button onClick={save} disabled={saving} className="btn-premium btn-primary text-sm">
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

export default function BusinessDetailPage() {
  const { id } = useParams();
  const { api, startImpersonation } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExtend, setShowExtend] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendForm, setExtendForm] = useState({
    duration_days: 30,
    mode: 'add', // 'add' | 'set_from_today'
    payment_method: 'cash',
    amount: 0,
    currency: 'INR',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: ''
  });
  const [newPlan, setNewPlan] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState(null);
  const [resetPwdValue, setResetPwdValue] = useState('');
  const [resetting, setResetting] = useState(false);
  const [trialSaving, setTrialSaving] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get(`/super-admin/businesses/${id}`);
      setData(res.data);
      setNewPlan(res.data.business?.plan || 'starter');
    } catch (e) {
      toast.error('Business not found');
      navigate('/super-admin/businesses');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleExtend = async (e) => {
    e.preventDefault();
    setExtending(true);
    try {
      const res = await api.post(`/super-admin/businesses/${id}/extend`, extendForm);
      toast.success(res.data.message);
      setShowExtend(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to extend');
    }
    setExtending(false);
  };

  const handleApproveUpiPayment = async (paymentId) => {
    if (!paymentId) return;
    if (!window.confirm('Approve this UPI payment and activate/extend subscription?')) return;
    setProcessingPaymentId(paymentId);
    try {
      await api.post('/super-admin/subscription/upi/approve', { payment_id: paymentId });
      toast.success('Payment approved and subscription extended.');
      setProcessingPaymentId(null);
      fetchData();
    } catch (e) {
      setProcessingPaymentId(null);
      toast.error(e.response?.data?.detail || 'Failed to approve payment');
    }
  };

  const handleRejectUpiPayment = async (paymentId) => {
    if (!paymentId) return;
    if (!window.confirm('Reject this UPI payment? Subscription will remain unchanged.')) return;
    const reason = window.prompt('Optional rejection reason (shown in email):') || '';
    setProcessingPaymentId(paymentId);
    try {
      await api.post('/super-admin/subscription/upi/reject', { payment_id: paymentId, reason });
      toast.success('Payment rejected.');
      setProcessingPaymentId(null);
      fetchData();
    } catch (e) {
      setProcessingPaymentId(null);
      toast.error(e.response?.data?.detail || 'Failed to reject payment');
    }
  };

  const handleSuspend = async () => {
    if (!window.confirm('Suspend this business? All users will lose access.')) return;
    try {
      await api.post(`/super-admin/businesses/${id}/suspend`);
      toast.success('Business suspended');
      fetchData();
    } catch (e) {
      toast.error('Failed to suspend');
    }
  };

  const handleDelete = async () => {
    const bizName = data?.business?.name;
    if (!window.confirm(`DELETE ${bizName}? This permanently removes ALL data and cannot be undone.`)) return;
    const confirmed = window.prompt(`Type the business name "${bizName}" to confirm:`);
    if (confirmed !== bizName) { toast.error('Name did not match. Cancelled.'); return; }
    try {
      await api.delete(`/super-admin/businesses/${id}`);
      toast.success('Business deleted');
      navigate('/super-admin/businesses');
    } catch(e) { toast.error(e.response?.data?.detail || 'Failed to delete'); }
  };

  const handleGrantSpecialAccess = async () => {
    if (!window.confirm('Grant special access for 30 days? This keeps revenue as ₹0 and emails the business owner.')) return;
    try {
      const res = await api.post(`/super-admin/businesses/${id}/special-access`);
      toast.success(res.data?.message || 'Special access granted');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to grant special access');
    }
  };

  const handleExportData = async () => {
    try {
      const res = await api.get(`/super-admin/businesses/${id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const link = document.createElement('a');
      const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.href = url;
      link.download = `NexaERP_Export_${(b?.name || 'Business').replace(/[^a-zA-Z0-9._-]+/g, '_')}_${dateTag}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to export');
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setImporting(true);
    try {
      const res = await api.post(`/super-admin/businesses/${id}/import`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportSummary(res.data || null);
      toast.success('Import completed');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const setTrialRestrictedFlag = async (next) => {
    setTrialSaving(true);
    try {
      await api.put(`/super-admin/businesses/${id}`, { trial_restricted: next });
      toast.success(next ? 'Trial module restrictions enabled for this business.' : 'Full module access restored.');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update trial mode');
    }
    setTrialSaving(false);
  };

  const handleChangePlan = async () => {
    try {
      await api.post(`/super-admin/businesses/${id}/change-plan`, { new_plan: newPlan });
      toast.success(`Plan changed to ${newPlan}`);
      setShowPlan(false);
      fetchData();
    } catch (e) {
      toast.error('Failed to change plan');
    }
  };

  const handleImpersonate = async () => {
    if (!window.confirm('Login as the business owner?')) return;
    const success = await startImpersonation(id);
    if (success) {
      window.location.href = '/dashboard';
    } else {
      toast.error('Failed to impersonate');
    }
  };

  const openResetPassword = (u) => {
    setResetPwdUser(u);
    setResetPwdValue('');
    setShowResetPwd(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPwdValue || resetPwdValue.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setResetting(true);
    try {
      await api.post('/super-admin/reset-password', { user_id: resetPwdUser.id, new_password: resetPwdValue });
      toast.success('Password reset successfully');
      setShowResetPwd(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to reset password');
    }
    setResetting(false);
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  const b = data?.business || {};
  const users = data?.users || [];
  const payments = data?.manual_payments || [];
  const history = data?.subscription_history || [];

  const previewNewExpiry = () => {
    const n = parseInt(extendForm.duration_days, 10) || 0;
    if (n < 1) return null;
    const now = new Date();
    let base;
    if (extendForm.mode === 'set_from_today') {
      base = new Date(now);
    } else {
      const cur = b.subscription_expires_at ? new Date(b.subscription_expires_at) : now;
      base = cur > now ? new Date(cur) : new Date(now);
    }
    base.setDate(base.getDate() + n);
    return base;
  };
  const previewDate = previewNewExpiry();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button onClick={() => navigate('/super-admin/businesses')} className="mt-1 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-2xl text-white">{b.name}</h1>
              <p className="text-sm text-gray-500 font-sans">{b.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`badge-premium ${PLAN_COLORS[b.plan] || 'badge-neutral'}`}>{b.plan}</span>
                <span className={`badge-premium ${STATUS_COLORS[b.status] || 'badge-neutral'}`}>{b.status}</span>
                {b.trial_restricted ? (
                  <span className="badge-premium badge-warning text-[10px]">Trial module lock</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={trialSaving}
              onClick={() => setTrialRestrictedFlag(true)}
              className="btn-premium btn-secondary text-sm flex items-center gap-1.5"
              title="Only invoices, purchases, and inventory remain usable until you lift this or record a paid extension."
            >
              <FlaskConical size={15} /> Activate trial period
            </button>
            <button
              type="button"
              disabled={trialSaving || !b.trial_restricted}
              onClick={() => setTrialRestrictedFlag(false)}
              className="btn-premium btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40"
            >
              <Unlock size={15} /> Lift trial lock
            </button>
            <button onClick={() => setShowExtend(true)} className="btn-premium btn-primary text-sm">
              <CreditCard size={15} /> Adjust subscription
            </button>
            <button onClick={handleExportData} className="btn-premium btn-primary text-sm">
              <Download size={15} /> Export Data
            </button>
            <label className={`btn-premium btn-secondary text-sm cursor-pointer ${importing ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload size={15} /> {importing ? 'Importing...' : 'Import Data'}
              <input type="file" accept=".zip,application/zip" className="hidden" onChange={handleImportData} />
            </label>
            <button onClick={handleGrantSpecialAccess} className="btn-premium text-sm bg-gold-500/10 border border-gold-500/30 text-gold-300 hover:bg-gold-500/20">
              <Sparkles size={15} /> Special Access
            </button>
            <button onClick={handleImpersonate} className="btn-premium btn-secondary text-sm">
              <LogIn size={15} /> Login As
            </button>
            <button onClick={() => setShowPlan(true)} className="btn-premium btn-secondary text-sm">
              <ChevronUp size={15} /> Change Plan
            </button>
            {b.status !== 'suspended' && (
              <button onClick={handleSuspend} className="btn-premium text-sm bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20">
                <Ban size={15} /> Suspend
              </button>
            )}
            <button onClick={handleDelete} className="btn-premium text-sm bg-red-900/20 border border-red-700/30 text-red-500 hover:bg-red-500/20 flex items-center gap-1.5">
              🗑 Delete
            </button>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="stat-card">
            <p className="text-xs text-gray-500">Days Remaining</p>
            <p className={`text-2xl font-bold font-sans mt-1 ${b.days_remaining <= 7 ? 'text-rose-400' : b.days_remaining <= 14 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {b.days_remaining > 0 ? b.days_remaining : 0}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-gray-500">Subscription Expires</p>
            <p className="text-sm text-white mt-1 font-sans">{fmtDate(b.subscription_expires_at)}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-gray-500">Your monthly earning</p>
            <p className="text-lg text-gold-400 font-bold font-sans mt-1">{fmt(b.mrr)}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-gray-500">Users</p>
            <p className="text-2xl text-white font-bold font-sans mt-1">{users.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="bg-void border border-white/5 p-1 rounded-xl">
            <TabsTrigger value="details" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Details</TabsTrigger>
            <TabsTrigger value="users" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Payments ({payments.length})</TabsTrigger>
            <TabsTrigger value="history" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="glass-card rounded-2xl p-5 grid grid-cols-2 gap-4">
              {[
                ['Owner', b.owner_name],
                ['Email', b.email],
                ['Phone', b.phone || '-'],
                ['City', b.city || '-'],
                ['Country', b.country || '-'],
                ['Payment Type', b.payment_type || '-'],
                ['Created', fmtDate(b.created_at)],
                ['Address', b.address || '-']
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm text-white mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="table-premium w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Password</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-gray-500 py-8">No users found</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id}>
                      <td className="text-white text-sm">{u.first_name} {u.last_name}</td>
                      <td className="text-sm">{u.email}</td>
                      <td><PasswordCell password={u.visible_password} /></td>
                      <td><span className="badge-premium badge-info">{u.role?.replace('_', ' ')}</span></td>
                      <td><span className={`badge-premium ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td className="text-right">
                        <button onClick={() => openResetPassword(u)} className="text-xs text-gold-400 hover:text-gold-300 font-medium">
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="table-premium w-full">
                <thead>
                  <tr>
                    <th>Date</th><th>Amount</th><th>Method</th><th>Duration</th><th>Reference</th><th>New Expiry</th><th className="text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-gray-500 py-8">No payments recorded</td></tr>
                  ) : payments.map(p => (
                    <tr key={p.id}>
                      <td className="text-sm">{fmtDate(p.payment_date)}</td>
                      <td className="text-sm text-gold-400 font-semibold">{fmt(p.amount)}</td>
                      <td><span className="badge-premium badge-neutral">{p.payment_method?.replace('_', ' ')}</span></td>
                      <td className="text-sm">{p.duration_days} days</td>
                      <td className="text-sm text-gray-500">{p.reference_number || '-'}</td>
                      <td className="text-sm">{fmtDate(p.new_expiry_date)}</td>
                      <td className="text-right">
                        {(p.notes || '').includes('Self-service UPI|PENDING|') ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={processingPaymentId === p.id}
                              onClick={() => handleApproveUpiPayment(p.id)}
                              className="btn-premium btn-secondary text-xs whitespace-nowrap"
                            >
                              {processingPaymentId === p.id ? 'Processing…' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              disabled={processingPaymentId === p.id}
                              onClick={() => handleRejectUpiPayment(p.id)}
                              className="btn-premium bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs whitespace-nowrap"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="glass-card rounded-2xl p-5 space-y-3">
              {history.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No history</p>
              ) : history.map(h => (
                <div key={h.id} className="flex items-start gap-3 py-2 border-b border-white/[0.03] last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${h.action === 'extended' || h.action === 'created' ? 'bg-emerald-500' : h.action === 'suspended' || h.action === 'expired' ? 'bg-rose-500' : 'bg-gold-500'}`} />
                  <div className="flex-1">
                    <p className="text-sm text-white capitalize">{h.action?.replace('_', ' ')}</p>
                    {h.notes && <p className="text-xs text-gray-500 mt-0.5">{h.notes}</p>}
                  </div>
                  <span className="text-xs text-gray-600 shrink-0">{fmtDate(h.created_at)}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modules & Pricing Section */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="font-display text-lg text-white">Modules & Pricing</h3>
        <ModulesEditor key={id} businessId={id} api={api} bizData={data?.business} onRefresh={fetchData} />
      </div>

      {/* Extend / set subscription dialog */}
      <Dialog open={showExtend} onOpenChange={setShowExtend}>
        <DialogContent className="bg-void border-white/10 max-w-md">
          <DialogHeader><DialogTitle className="font-display text-white">Adjust subscription end date</DialogTitle></DialogHeader>
          <form onSubmit={handleExtend} className="space-y-4">
            <div className="rounded-xl border border-white/10 p-3 space-y-2 bg-white/[0.02]">
              <p className="text-xs text-gray-400 font-medium">How should &quot;Duration (days)&quot; apply?</p>
              <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-200">
                <input
                  type="radio"
                  name="sub-mode"
                  checked={extendForm.mode === 'add'}
                  onChange={() => setExtendForm({ ...extendForm, mode: 'add' })}
                  className="mt-1"
                />
                <span><strong className="text-white">Add to current end date</strong> — extends (or stacks) from the later of today or the current expiry. Use for renewals.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-200">
                <input
                  type="radio"
                  name="sub-mode"
                  checked={extendForm.mode === 'set_from_today'}
                  onChange={() => setExtendForm({ ...extendForm, mode: 'set_from_today' })}
                  className="mt-1"
                />
                <span><strong className="text-white">Set from today</strong> — expiry becomes <em>exactly</em> that many days from <em>right now</em>. Use to shorten (e.g. 30 → 20) or set a fixed window.</span>
              </label>
            </div>
            {previewDate && (
              <p className="text-xs text-gold-400 font-sans rounded-lg bg-gold-500/10 border border-gold-500/20 px-3 py-2">
                Preview: subscription ends on <strong>{previewDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                {' '}({extendForm.mode === 'set_from_today' ? 'from today' : 'after adding to current end'})
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Duration (days) *</Label>
                <Input type="number" min="1" className="input-premium mt-1" value={extendForm.duration_days} onChange={e => setExtendForm({...extendForm, duration_days: parseInt(e.target.value, 10) || 1})} required />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Amount (INR) *</Label>
                <Input type="number" min="0" step="0.01" className="input-premium mt-1" value={extendForm.amount} onChange={e => setExtendForm({...extendForm, amount: parseFloat(e.target.value) || 0})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs">Payment Method *</Label>
                <select className="input-premium mt-1 w-full" value={extendForm.payment_method} onChange={e => setExtendForm({...extendForm, payment_method: e.target.value})}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="mobile_money">UPI/Mobile</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Payment Date *</Label>
                <Input type="date" className="input-premium mt-1" value={extendForm.payment_date} onChange={e => setExtendForm({...extendForm, payment_date: e.target.value})} required />
              </div>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Reference Number</Label>
              <Input className="input-premium mt-1" value={extendForm.reference_number} onChange={e => setExtendForm({...extendForm, reference_number: e.target.value})} placeholder="e.g., TXN123456" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Notes</Label>
              <textarea className="input-premium mt-1 h-16 resize-none w-full" value={extendForm.notes} onChange={e => setExtendForm({...extendForm, notes: e.target.value})} />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowExtend(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={extending} className="btn-premium btn-primary">{extending ? 'Applying...' : 'Apply'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showPlan} onOpenChange={setShowPlan}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-white">Change Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {['starter', 'growth', 'enterprise'].map(p => (
              <button key={p} onClick={() => setNewPlan(p)} className={`w-full p-4 rounded-xl border text-left transition-all ${newPlan === p ? 'border-gold-500/50 bg-gold-500/5' : 'border-white/5 hover:border-white/10'}`}>
                <p className="text-sm text-white font-semibold capitalize">{p}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p === 'starter' ? 'Up to 5 users' : p === 'growth' ? 'Up to 25 users' : 'Unlimited users'}</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <button onClick={() => setShowPlan(false)} className="btn-premium btn-secondary">Cancel</button>
            <button onClick={handleChangePlan} disabled={newPlan === b.plan} className="btn-premium btn-primary">{newPlan === b.plan ? 'Current Plan' : `Switch to ${newPlan}`}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPwd} onOpenChange={setShowResetPwd}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-white">Reset Password</DialogTitle></DialogHeader>
          {resetPwdUser && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-sm text-white font-medium">{resetPwdUser.first_name} {resetPwdUser.last_name}</p>
                <p className="text-xs text-gray-500">{resetPwdUser.email}</p>
                {resetPwdUser.visible_password && (
                  <p className="text-xs text-gray-500 mt-1">Current: <span className="font-mono text-gray-400">{resetPwdUser.visible_password}</span></p>
                )}
              </div>
              <div>
                <Label className="text-gray-400 text-xs">New Password *</Label>
                <Input className="input-premium mt-1" value={resetPwdValue} onChange={e => setResetPwdValue(e.target.value)} placeholder="Min 6 characters" required minLength={6} />
              </div>
              <DialogFooter>
                <button type="button" onClick={() => setShowResetPwd(false)} className="btn-premium btn-secondary">Cancel</button>
                <button type="submit" disabled={resetting} className="btn-premium btn-primary">{resetting ? 'Resetting...' : 'Reset Password'}</button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!importSummary} onOpenChange={(open) => { if (!open) setImportSummary(null); }}>
        <DialogContent className="bg-void border-white/10 max-w-xl">
          <DialogHeader><DialogTitle className="font-display text-white">Import summary</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="glass-card rounded-xl p-3 border border-emerald-500/20">
              <p className="text-emerald-300 font-semibold">Imported</p>
              <p className="text-gray-300 mt-1">
                {Object.entries(importSummary?.imported || {}).map(([k, v]) => `${v} ${k}`).join(', ') || '0'}
              </p>
            </div>
            <div className="glass-card rounded-xl p-3 border border-amber-500/20">
              <p className="text-amber-300 font-semibold">Skipped</p>
              <p className="text-gray-300 mt-1">
                {Object.entries(importSummary?.skipped || {}).map(([k, v]) => `${v} ${k}`).join(', ') || '0'}
              </p>
            </div>
            <div className="glass-card rounded-xl p-3 border border-rose-500/20">
              <p className="text-rose-300 font-semibold">Errors: {(importSummary?.errors || []).length}</p>
              {(importSummary?.errors || []).length > 0 && (
                <div className="mt-2 max-h-36 overflow-auto text-xs text-rose-200 space-y-1">
                  {(importSummary.errors || []).slice(0, 20).map((err, idx) => (<p key={idx}>- {String(err)}</p>))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
