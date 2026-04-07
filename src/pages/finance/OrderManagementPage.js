import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

export default function OrderManagementPage() {
  const { api } = useAuth();
  const [orders, setOrders] = React.useState([]);
  const [form, setForm] = React.useState({ order_date: new Date().toISOString().split('T')[0], customer_name: '', item: '', qty: 1, price: 0, status: 'draft' });
  const load = React.useCallback(async () => {
    try { const r = await api.get('/advanced/orders/sales'); setOrders(r.data?.items || []); } catch { toast.error('Failed'); }
  }, [api]);
  React.useEffect(() => { load(); }, [load]);
  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/advanced/orders/sales', {
        order_date: form.order_date,
        customer_name: form.customer_name,
        status: form.status,
        items: [{ description: form.item, quantity: Number(form.qty), unit_price: Number(form.price) }],
      });
      toast.success('Sales order created');
      load();
    } catch { toast.error('Failed'); }
  };
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-white">Order Management</h1>
        <form onSubmit={create} className="glass-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-6 gap-2">
          <Input className="input-premium" type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
          <Input className="input-premium" placeholder="Customer" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <Input className="input-premium" placeholder="Item" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
          <Input className="input-premium" type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          <Input className="input-premium" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <button className="btn-premium btn-primary">Create</button>
        </form>
        <div className="glass-card rounded-2xl p-4 overflow-auto">
          <table className="table-premium w-full"><thead><tr><th>No</th><th>Date</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>{orders.map((o) => <tr key={o.id}><td>{o.order_number}</td><td>{o.order_date}</td><td>{o.customer_name}</td><td>{o.status}</td><td>{o.total_amount}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
