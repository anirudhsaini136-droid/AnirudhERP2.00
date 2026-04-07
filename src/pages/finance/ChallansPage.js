import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

export default function ChallansPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({
    customer_name: '',
    date: today,
    items: [{ description: '', quantity: 1, unit_price: 0 }],
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/advanced/challans');
      setList(res.data?.challans || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load challans');
    }
    setLoading(false);
  }, [api]);

  React.useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    const builtItems = (form.items || [])
      .filter((i) => String(i.description || '').trim())
      .map((i) => ({
        description: String(i.description || '').trim(),
        quantity: Number(i.quantity) || 1,
        unit_price: Number(i.unit_price) || 0,
      }));
    if (!builtItems.length) {
      toast.error('Add at least one item');
      return;
    }
    try {
      await api.post('/advanced/challans', {
        customer_name: form.customer_name,
        date: form.date,
        items: builtItems,
      });
      toast.success('Challan created');
      setForm({ customer_name: '', date: today, items: [{ description: '', quantity: 1, unit_price: 0 }] });
      load();
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || 'Failed to create challan');
    }
  };

  const addItemRow = () => setForm((s) => ({ ...s, items: [...(s.items || []), { description: '', quantity: 1, unit_price: 0 }] }));
  const removeItemRow = (idx) => setForm((s) => ({ ...s, items: (s.items || []).filter((_, i) => i !== idx) }));
  const setItemField = (idx, field, value) =>
    setForm((s) => ({ ...s, items: (s.items || []).map((it, i) => (i === idx ? { ...it, [field]: value } : it)) }));

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <h1 className="font-display text-2xl text-white">Challans</h1>
        <form onSubmit={create} className="glass-card p-4 rounded-2xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Customer name</label>
              <Input className="input-premium mt-1" placeholder="Customer name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Date</label>
              <Input className="input-premium mt-1" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white font-medium">Items</p>
              <button type="button" onClick={addItemRow} className="btn-premium btn-secondary text-xs">Add line item</button>
            </div>
            {(form.items || []).map((it, idx) => (
              <div key={`challan-item-${idx}`} className="grid grid-cols-1 md:grid-cols-10 gap-2">
                <div className="md:col-span-5">
                  <label className="text-xs text-gray-400">Item</label>
                  <Input className="input-premium mt-1" placeholder="Item name" value={it.description} onChange={(e) => setItemField(idx, 'description', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-400">Qty</label>
                  <Input className="input-premium mt-1" type="number" min="1" value={it.quantity} onChange={(e) => setItemField(idx, 'quantity', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-400">Amount</label>
                  <Input className="input-premium mt-1" type="number" min="0" value={it.unit_price} onChange={(e) => setItemField(idx, 'unit_price', e.target.value)} />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button
                    type="button"
                    className="btn-premium btn-secondary text-xs w-full"
                    disabled={(form.items || []).length <= 1}
                    onClick={() => removeItemRow(idx)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-premium btn-primary w-fit">Create Challan</button>
        </form>
        <div className="glass-card rounded-2xl p-4 overflow-auto">
          {loading ? 'Loading...' : (
            <table className="table-premium w-full">
              <thead><tr><th>No</th><th>Date</th><th>Customer</th><th>Status</th><th>Total</th><th>Action</th></tr></thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}>
                    <td className="text-white">{c.challan_number}</td>
                    <td className="text-white">{c.date}</td>
                    <td className="text-white">{c.customer_name}</td>
                    <td className="text-white">{c.status}</td>
                    <td className="text-white">{c.subtotal}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-premium btn-secondary text-xs"
                        disabled={String(c.status || '').toLowerCase() === 'converted'}
                        onClick={() => navigate(`/finance/invoices/create?challan=${encodeURIComponent(c.id)}`)}
                      >
                        Convert to Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
