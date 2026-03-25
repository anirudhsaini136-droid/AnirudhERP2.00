import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Search, Eye, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const ALL_MODULES = [
  { id: 'manage_users', label: 'Manage Users', icon: '👤', desc: 'User creation and management' },
  { id: 'hr_payroll', label: 'HR & Payroll', icon: '👥', desc: 'Employees, attendance, leave, payroll' },
  { id: 'invoices_finance', label: 'Invoices & Finance', icon: '🧾', desc: 'Invoices, payments, finance dashboard' },
  { id: 'inventory_billing', label: 'Inventory & Billing', icon: '📦', desc: 'Products, stock, quick billing' },
  { id: 'purchases_itc', label: 'Purchases & ITC', icon: '🛒', desc: 'Purchase bills, ITC tracking' },
  { id: 'gst_reports', label: 'GST Reports', icon: '📊', desc: 'GSTR-1, GSTR-3B, tax summary' },
  { id: 'customer_ledger', label: 'Customer Ledger', icon: '📒', desc: 'Customer accounts, payments' },
  { id: 'expenses', label: 'Expenses', icon: '💸', desc: 'Expense tracking and approval' },
  { id: 'accounting', label: 'Accounting', icon: '📒', desc: 'Double-entry bookkeeping, P&L, Balance Sheet' },
  { id: 'ca_portal', label: 'CA Portal', icon: '🔐', desc: 'CA read-only GST access' },
];

const STATUS_COLORS = {
  active: 'badge-success', trial: 'badge-warning',
  suspended: 'badge-danger', expired: 'badge-danger', cancelled: 'badge-neutral'
};

function ModuleCheckbox({ mod, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(mod.id)}
      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
        checked ? 'border-gold-500/40 bg-gold-500/5' : 'border-white/10 bg-white/[0.02] hover:border-white/20'
      }`}>
      <span className="text-xl mt-0.5">{mod.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${checked ? 'text-gold-400' : 'text-gray-300'}`}>{mod.label}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{mod.desc}</p>
      </div>
      {checked ? <CheckSquare size={14} className="text-gold-400 shrink-0 mt-1" /> : <Square size={14} className="text-gray-600 shrink-0 mt-1" />}
    </button>
  );
}

const DEFAULT_FORM = {
  name: '', owner_name: '', email: '', phone: '', address: '', city: '', country: 'India',
  initial_days: 7, payment_method: 'cash', amount_paid: 0, notes: '',
  monthly_amount: 399, modules: [], max_users: 5, max_invoices_month: 100, max_products: 50, max_employees: 10
};

export default function BusinessesPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: 1, limit: 20 });
      if (search) params.set('search', search);
      const res = await api.get(`/super-admin/businesses?${params}`);
      setBusinesses(res.data.businesses || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.response?.data?.message;
      toast.error(detail || (status ? `Failed to load businesses (${status})` : 'Failed to load businesses'));
    }
    setLoading(false);
  };

  useEffect(() => { fetchBusinesses(); }, [search]);

  const toggleModule = (modId) => {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(modId) ? f.modules.filter(m => m !== modId) : [...f.modules, modId]
    }));
  };

  const selectAllModules = () => setForm(f => ({ ...f, modules: ALL_MODULES.map(m => m.id) }));
  const clearModules = () => setForm(f => ({ ...f, modules: [] }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.modules.length === 0) { toast.error('Select at least one module'); return; }
    setCreating(true);
    try {
      const payload = {
        ...form,
        plan: 'enterprise',
        modules: JSON.stringify(form.modules),
        amount_paid: form.amount_paid
      };
      const res = await api.post('/super-admin/businesses', payload);
      toast.success(`Business created! Login: ${res.data.owner_credentials?.email} / ${res.data.owner_credentials?.temporary_password}`);
      setShowCreate(false);
      setForm(DEFAULT_FORM);
      fetchBusinesses();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to create business'); }
    setCreating(false);
  };

  const getModules = (biz) => {
    try { return JSON.parse(biz.modules || '[]'); } catch { return []; }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Businesses</h1>
            <p className="text-sm text-gray-500">{total} total businesses</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-premium btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Business
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input-premium pl-9 w-full text-sm" placeholder="Search businesses..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Business</th>
                <th className="px-4 py-3 text-left">Modules</th>
                <th className="px-4 py-3 text-left">Earning / mo</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">Loading...</td></tr>
              ) : businesses.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">No businesses found</td></tr>
              ) : businesses.map(biz => {
                const mods = getModules(biz);
                const daysLeft = biz.days_remaining ?? 0;
                return (
                  <tr key={biz.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{biz.name}</p>
                      <p className="text-xs text-gray-500">{biz.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {mods.length === 0 ? (
                          <span className="text-xs text-gray-600 italic">No modules</span>
                        ) : mods.slice(0, 3).map(m => {
                          const mod = ALL_MODULES.find(x => x.id === m);
                          return mod ? (
                            <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400">
                              {mod.icon} {mod.label.split(' ')[0]}
                            </span>
                          ) : null;
                        })}
                        {mods.length > 3 && <span className="text-[10px] text-gray-500">+{mods.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gold-400 font-semibold" title="Matches platform MRR rules for this status">
                      {(biz.mrr ?? 0) > 0 ? fmt(biz.mrr) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${daysLeft <= 7 ? 'text-rose-400' : 'text-gray-400'}`}>
                        {daysLeft}d left
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge-premium ${STATUS_COLORS[biz.status] || 'badge-neutral'} text-xs`}>
                        {biz.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => navigate(`/super-admin/businesses/${biz.id}`)}
                        className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1 ml-auto">
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Business Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-void border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-xl">Add New Business</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">

            {/* Basic Info */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Business Info</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-gray-400 text-xs">Business Name *</Label>
                  <Input className="input-premium mt-1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div><Label className="text-gray-400 text-xs">Owner Name *</Label>
                  <Input className="input-premium mt-1" value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-gray-400 text-xs">Email *</Label>
                  <Input type="email" className="input-premium mt-1" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                <div><Label className="text-gray-400 text-xs">Phone *</Label>
                  <Input className="input-premium mt-1" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-gray-400 text-xs">City *</Label>
                  <Input className="input-premium mt-1" value={form.city} onChange={e => setForm({...form, city: e.target.value})} required /></div>
                <div><Label className="text-gray-400 text-xs">Country *</Label>
                  <Input className="input-premium mt-1" value={form.country} onChange={e => setForm({...form, country: e.target.value})} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-gray-400 text-xs">Address *</Label>
                  <Input className="input-premium mt-1" value={form.address} onChange={e => setForm({...form, address: e.target.value})} required /></div>
                <div><Label className="text-gray-400 text-xs">Trial Duration (days)</Label>
                  <Input type="number" className="input-premium mt-1" value={form.initial_days} onChange={e => setForm({...form, initial_days: parseInt(e.target.value) || 7})} /></div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-3 p-4 rounded-xl border border-gold-500/20 bg-gold-500/5">
              <p className="text-xs text-gold-400 font-semibold uppercase tracking-wider">💰 Pricing</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-gray-400 text-xs">Monthly Amount (₹) *</Label>
                  <Input type="number" min="0" className="input-premium mt-1" value={form.monthly_amount}
                    onChange={e => setForm({...form, monthly_amount: parseFloat(e.target.value) || 0})}
                    placeholder="e.g. 2499" /></div>
                <div><Label className="text-gray-400 text-xs">Amount Paid Now (₹)</Label>
                  <Input type="number" min="0" className="input-premium mt-1" value={form.amount_paid}
                    onChange={e => setForm({...form, amount_paid: parseFloat(e.target.value) || 0})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-gray-400 text-xs">Payment Method</Label>
                  <select className="input-premium mt-1 w-full" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select></div>
              </div>
            </div>

            {/* Limits */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">📏 Limits</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-gray-400 text-xs">Max Users</Label>
                  <Input type="number" min="1" className="input-premium mt-1" value={form.max_users} onChange={e => setForm({...form, max_users: parseInt(e.target.value) || 5})} /></div>
                <div><Label className="text-gray-400 text-xs">Max Employees</Label>
                  <Input type="number" min="1" className="input-premium mt-1" value={form.max_employees} onChange={e => setForm({...form, max_employees: parseInt(e.target.value) || 10})} /></div>
                <div><Label className="text-gray-400 text-xs">Max Invoices/Month</Label>
                  <Input type="number" min="1" className="input-premium mt-1" value={form.max_invoices_month} onChange={e => setForm({...form, max_invoices_month: parseInt(e.target.value) || 100})} /></div>
                <div><Label className="text-gray-400 text-xs">Max Products</Label>
                  <Input type="number" min="1" className="input-premium mt-1" value={form.max_products} onChange={e => setForm({...form, max_products: parseInt(e.target.value) || 50})} /></div>
              </div>
            </div>

            {/* Modules */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">🧩 Modules</p>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAllModules} className="text-xs text-gold-400 hover:text-gold-300">Select All</button>
                  <span className="text-gray-600">|</span>
                  <button type="button" onClick={clearModules} className="text-xs text-gray-500 hover:text-gray-400">Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ALL_MODULES.map(mod => (
                  <ModuleCheckbox key={mod.id} mod={mod} checked={form.modules.includes(mod.id)} onChange={toggleModule} />
                ))}
              </div>
              <p className="text-xs text-gray-600">{form.modules.length} of {ALL_MODULES.length} modules selected</p>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-gray-400 text-xs">Notes</Label>
              <textarea className="input-premium mt-1 w-full h-16 resize-none text-sm" value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})} placeholder="Internal notes..." />
            </div>

            <DialogFooter>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={creating} className="btn-premium btn-primary">
                {creating ? 'Creating...' : 'Create Business'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
