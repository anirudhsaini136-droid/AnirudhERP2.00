import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

export default function OrderManagementPage() {
  const { api } = useAuth();
  const [orders, setOrders] = React.useState([]);
  const [form, setForm] = React.useState({
    order_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    status: 'draft',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
  });
  const load = React.useCallback(async () => {
    try { const r = await api.get('/advanced/orders/sales'); setOrders(r.data?.items || []); } catch { toast.error('Failed'); }
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
      await api.post('/advanced/orders/sales', {
        order_date: form.order_date,
        customer_name: form.customer_name,
        status: form.status,
        items: builtItems,
      });
      toast.success('Sales order created');
      setForm({
        order_date: new Date().toISOString().split('T')[0],
        customer_name: '',
        status: 'draft',
        items: [{ description: '', quantity: 1, unit_price: 0 }],
      });
      load();
    } catch { toast.error('Failed'); }
  };
  const addItemRow = () => setForm((s) => ({ ...s, items: [...(s.items || []), { description: '', quantity: 1, unit_price: 0 }] }));
  const removeItemRow = (idx) => setForm((s) => ({ ...s, items: (s.items || []).filter((_, i) => i !== idx) }));
  const setItemField = (idx, field, value) =>
    setForm((s) => ({ ...s, items: (s.items || []).map((it, i) => (i === idx ? { ...it, [field]: value } : it)) }));
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-white">Order Management</h1>
        <form onSubmit={create} className="glass-card rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400">Order date</label>
              <Input className="input-premium mt-1" type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Customer name</label>
              <Input className="input-premium mt-1" placeholder="Customer" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Status</label>
              <select className="input-premium mt-1 w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="partially_fulfilled">Partially Fulfilled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white font-medium">Items</p>
              <button type="button" onClick={addItemRow} className="btn-premium btn-secondary text-xs">Add line item</button>
            </div>
            {(form.items || []).map((it, idx) => (
              <div key={`order-item-${idx}`} className="grid grid-cols-1 md:grid-cols-10 gap-2">
                <div className="md:col-span-5">
                  <label className="text-xs text-gray-400">Item</label>
                  <Input className="input-premium mt-1" placeholder="Item" value={it.description} onChange={(e) => setItemField(idx, 'description', e.target.value)} />
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
                  <button type="button" className="btn-premium btn-secondary text-xs w-full" disabled={(form.items || []).length <= 1} onClick={() => removeItemRow(idx)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-premium btn-primary w-fit">Create</button>
        </form>
        <div className="glass-card rounded-2xl p-4 overflow-auto">
          <table className="table-premium w-full"><thead><tr><th>No</th><th>Date</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="text-white">{o.order_number}</td>
                  <td className="text-white">{o.order_date}</td>
                  <td className="text-white">{o.customer_name}</td>
                  <td className="text-white">{o.status}</td>
                  <td className="text-white">{o.total_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
