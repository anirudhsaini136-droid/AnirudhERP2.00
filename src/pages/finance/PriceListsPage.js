import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

export default function PriceListsPage() {
  const { api } = useAuth();
  const [items, setItems] = React.useState([]);
  const [form, setForm] = React.useState({ name: '', discount_percentage: 0, applies_to: 'all' });
  const load = React.useCallback(async () => {
    try { const r = await api.get('/advanced/price-lists'); setItems(r.data?.items || []); } catch { toast.error('Failed'); }
  }, [api]);
  React.useEffect(() => { load(); }, [load]);
  const create = async (e) => {
    e.preventDefault();
    try { await api.post('/advanced/price-lists', { ...form, discount_percentage: Number(form.discount_percentage) }); toast.success('Price list saved'); setForm({ name: '', discount_percentage: 0, applies_to: 'all' }); load(); } catch (e2) { toast.error(e2?.response?.data?.detail || 'Failed'); }
  };
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-white">Rate Management</h1>
        <form onSubmit={create} className="glass-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input className="input-premium" placeholder="List name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input className="input-premium" type="number" placeholder="Discount %" value={form.discount_percentage} onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })} />
          <select className="input-premium" value={form.applies_to} onChange={(e) => setForm({ ...form, applies_to: e.target.value })}><option value="all">All</option><option value="specific">Specific</option></select>
          <button className="btn-premium btn-primary">Save</button>
        </form>
        <div className="glass-card rounded-2xl p-4 overflow-auto">
          <table className="table-premium w-full"><thead><tr><th>Name</th><th>Discount %</th><th>Applies To</th><th>Customers</th></tr></thead>
            <tbody>{items.map((x) => <tr key={x.id}><td>{x.name}</td><td>{x.discount_percentage}</td><td>{x.applies_to}</td><td>{x.customer_count || 0}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
