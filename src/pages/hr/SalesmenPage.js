import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

export default function SalesmenPage() {
  const { api } = useAuth();
  const [items, setItems] = React.useState([]);
  const [form, setForm] = React.useState({ name: '', phone: '', email: '', commission_percentage: 0 });
  const load = React.useCallback(async () => {
    try { const r = await api.get('/advanced/salesmen'); setItems(r.data?.items || []); } catch { toast.error('Failed'); }
  }, [api]);
  React.useEffect(() => { load(); }, [load]);
  const create = async (e) => {
    e.preventDefault();
    try { await api.post('/advanced/salesmen', { ...form, commission_percentage: Number(form.commission_percentage) }); toast.success('Salesman added'); setForm({ name: '', phone: '', email: '', commission_percentage: 0 }); load(); } catch { toast.error('Failed'); }
  };
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-white">Salesman Management</h1>
        <form onSubmit={create} className="glass-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-2">
          <Input className="input-premium" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input className="input-premium" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input className="input-premium" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input className="input-premium" type="number" placeholder="Commission %" value={form.commission_percentage} onChange={(e) => setForm({ ...form, commission_percentage: e.target.value })} />
          <button className="btn-premium btn-primary">Add</button>
        </form>
        <div className="glass-card rounded-2xl p-4 overflow-auto">
          <table className="table-premium w-full"><thead><tr><th>Name</th><th>Commission %</th><th>Total Sales</th><th>Outstanding</th><th>Commission</th></tr></thead>
            <tbody>{items.map((x) => <tr key={x.id}><td>{x.name}</td><td>{x.commission_percentage}</td><td>{x.total_sales}</td><td>{x.outstanding}</td><td>{x.commission_amount}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
