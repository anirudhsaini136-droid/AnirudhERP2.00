import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

export default function ChallansPage() {
  const { api } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({ customer_name: '', date: today, item_name: '', qty: 1, price: 0 });

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
    try {
      await api.post('/advanced/challans', {
        customer_name: form.customer_name,
        date: form.date,
        items: [{ description: form.item_name, quantity: Number(form.qty), unit_price: Number(form.price) }],
      });
      toast.success('Challan created');
      setForm((s) => ({ ...s, customer_name: '', item_name: '', qty: 1, price: 0 }));
      load();
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || 'Failed to create challan');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <h1 className="font-display text-2xl text-white">Challans</h1>
        <form onSubmit={create} className="glass-card p-4 rounded-2xl grid grid-cols-1 md:grid-cols-5 gap-2">
          <Input className="input-premium" placeholder="Customer name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <Input className="input-premium" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input className="input-premium" placeholder="Item" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
          <Input className="input-premium" type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          <Input className="input-premium" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <button className="btn-premium btn-primary md:col-span-5 w-fit">Create Challan</button>
        </form>
        <div className="glass-card rounded-2xl p-4 overflow-auto">
          {loading ? 'Loading...' : (
            <table className="table-premium w-full">
              <thead><tr><th>No</th><th>Date</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}><td>{c.challan_number}</td><td>{c.date}</td><td>{c.customer_name}</td><td>{c.status}</td><td>{c.subtotal}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
