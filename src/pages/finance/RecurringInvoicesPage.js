import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { RefreshCw, Play, Pause, Trash2, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatApiError } from '../../shared-core';

const emptyLine = () => ({
  description: '',
  hsn_code: '',
  quantity: 1,
  unit_price: 0,
  item_discount: 0,
});

export default function RecurringInvoicesPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    frequency: 'monthly',
    interval_n: 1,
    due_days_after_issue: 30,
    deduct_stock: false,
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    client_gstin: '',
    buyer_state: '',
    place_of_supply: '',
    tax_rate: 18,
    discount_amount: 0,
    currency: 'INR',
    items: [emptyLine()],
  });

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/finance/recurring-invoices');
      setSchedules(r.data.schedules || []);
    } catch (e) {
      toast.error(formatApiError(e, 'Schedules'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [api]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setLine = (idx, k, v) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [k]: v };
      return { ...f, items };
    });
  };

  const addLine = () => setForm((f) => ({ ...f, items: [...f.items, emptyLine()] }));
  const removeLine = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    const items = form.items.filter((l) => l.description.trim());
    if (!items.length) {
      toast.error('Add at least one line item');
      return;
    }
    setSaving(true);
    try {
      await api.post('/finance/recurring-invoices', {
        ...form,
        interval_n: Number(form.interval_n) || 1,
        due_days_after_issue: Number(form.due_days_after_issue) || 30,
        tax_rate: Number(form.tax_rate) || 0,
        discount_amount: Number(form.discount_amount) || 0,
        items: items.map((l) => ({
          description: l.description,
          hsn_code: l.hsn_code || undefined,
          quantity: Number(l.quantity) || 1,
          unit_price: Number(l.unit_price) || 0,
          item_discount: Number(l.item_discount) || 0,
        })),
      });
      toast.success('Recurring schedule created');
      setForm({
        title: '',
        frequency: 'monthly',
        interval_n: 1,
        due_days_after_issue: 30,
        deduct_stock: false,
        client_name: '',
        client_email: '',
        client_phone: '',
        client_address: '',
        client_gstin: '',
        buyer_state: '',
        place_of_supply: '',
        tax_rate: 18,
        discount_amount: 0,
        currency: 'INR',
        items: [emptyLine()],
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async (sch) => {
    const next = sch.status === 'active' ? 'paused' : 'active';
    try {
      await api.patch(`/finance/recurring-invoices/${sch.id}`, { status: next });
      toast.success(next === 'paused' ? 'Paused' : 'Activated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    }
  };

  const runNow = async (id) => {
    try {
      const r = await api.post(`/finance/recurring-invoices/${id}/run-now`);
      toast.success(`Invoice ${r.data.invoice_number || ''} created`);
      load();
      if (r.data.id) navigate(`/finance/invoices/${r.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Run failed');
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this schedule?')) return;
    try {
      await api.delete(`/finance/recurring-invoices/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        <div className="flex items-center gap-3">
          <Repeat className="w-8 h-8 text-gold-500" />
          <div>
            <h1 className="font-display text-2xl text-white">Recurring Invoices</h1>
            <p className="text-sm text-gray-500">Auto-generate invoices on a schedule (checked every minute).</p>
          </div>
        </div>

        <form onSubmit={submit} className="glass-card rounded-2xl p-6 space-y-4 border border-white/10">
          <h2 className="text-lg font-semibold text-white">New schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400 text-xs">Title (optional)</Label>
              <Input className="input-premium mt-1" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Monthly retainer — Acme" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-gray-400 text-xs">Frequency</Label>
                <select className="input-premium mt-1 w-full h-10 rounded-md bg-obsidian border border-white/10 text-white text-sm px-2" value={form.frequency} onChange={(e) => setField('frequency', e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Every (interval)</Label>
                <Input type="number" min={1} className="input-premium mt-1" value={form.interval_n} onChange={(e) => setField('interval_n', e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Due days after issue</Label>
              <Input type="number" min={0} className="input-premium mt-1" value={form.due_days_after_issue} onChange={(e) => setField('due_days_after_issue', e.target.value)} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.deduct_stock} onChange={(e) => setField('deduct_stock', e.target.checked)} className="rounded border-white/20" />
                Deduct stock on each run (only if lines use products)
              </label>
            </div>
          </div>
          <div className="border-t border-white/10 pt-4 space-y-3">
            <p className="text-xs text-gold-500 font-semibold uppercase tracking-wider">Customer & GST</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input required className="input-premium" placeholder="Customer name *" value={form.client_name} onChange={(e) => setField('client_name', e.target.value)} />
              <Input className="input-premium" placeholder="Phone" value={form.client_phone} onChange={(e) => setField('client_phone', e.target.value)} />
              <Input className="input-premium" placeholder="Email" value={form.client_email} onChange={(e) => setField('client_email', e.target.value)} />
              <Input className="input-premium" placeholder="Buyer GSTIN" value={form.client_gstin} onChange={(e) => setField('client_gstin', e.target.value)} />
              <Input className="input-premium" placeholder="Buyer state" value={form.buyer_state} onChange={(e) => setField('buyer_state', e.target.value)} />
              <Input className="input-premium" placeholder="Place of supply" value={form.place_of_supply} onChange={(e) => setField('place_of_supply', e.target.value)} />
              <Input className="input-premium md:col-span-2" placeholder="Address" value={form.client_address} onChange={(e) => setField('client_address', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-400 text-xs">Tax rate %</Label>
              <Input type="number" className="input-premium mt-1" value={form.tax_rate} onChange={(e) => setField('tax_rate', e.target.value)} />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Invoice discount</Label>
              <Input type="number" className="input-premium mt-1" value={form.discount_amount} onChange={(e) => setField('discount_amount', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Line items</span>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="text-xs">+ Line</Button>
            </div>
            {form.items.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <Input className="input-premium col-span-5" placeholder="Description" value={line.description} onChange={(e) => setLine(idx, 'description', e.target.value)} />
                <Input className="input-premium col-span-2" placeholder="HSN" value={line.hsn_code} onChange={(e) => setLine(idx, 'hsn_code', e.target.value)} />
                <Input type="number" className="input-premium col-span-1" placeholder="Qty" value={line.quantity} onChange={(e) => setLine(idx, 'quantity', e.target.value)} />
                <Input type="number" className="input-premium col-span-2" placeholder="Price" value={line.unit_price} onChange={(e) => setLine(idx, 'unit_price', e.target.value)} />
                <Button type="button" variant="ghost" size="sm" className="col-span-2 text-rose-400" onClick={() => removeLine(idx)} disabled={form.items.length < 2}><Trash2 size={16} /></Button>
              </div>
            ))}
          </div>
          <Button type="submit" disabled={saving} className="btn-premium btn-primary">{saving ? 'Saving…' : 'Create schedule'}</Button>
        </form>

        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Active schedules</h2>
            <button type="button" onClick={load} className="text-gray-400 hover:text-white p-2"><RefreshCw size={18} /></button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : schedules.length === 0 ? (
            <p className="text-gray-500 text-sm">No recurring schedules yet.</p>
          ) : (
            <ul className="space-y-3">
              {schedules.map((s) => (
                <li key={s.id} className="rounded-xl border border-white/10 p-4 flex flex-wrap gap-3 justify-between items-start bg-white/5">
                  <div>
                    <p className="text-white font-medium">{s.title || 'Untitled'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {s.frequency} · every {s.interval_n} · next {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : '—'}
                    </p>
                    {s.last_error && <p className="text-xs text-rose-400 mt-1">{s.last_error}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => runNow(s.id)} className="gap-1"><Play size={14} /> Run now</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => togglePause(s)} className="gap-1">
                      {s.status === 'active' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Activate</>}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="text-rose-400" onClick={() => del(s.id)}><Trash2 size={14} /></Button>
                    {s.last_invoice_id && (
                      <Button type="button" size="sm" variant="link" className="text-gold-400" onClick={() => navigate(`/finance/invoices/${s.last_invoice_id}`)}>Last invoice</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
