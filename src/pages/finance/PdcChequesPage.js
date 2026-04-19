import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

export default function PdcChequesPage() {
  const { api } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [list, setList] = React.useState([]);
  const [form, setForm] = React.useState({ cheque_number: '', bank_name: '', amount: '', cheque_date: today, party_name: '', type: 'received' });
  const load = React.useCallback(async () => {
    try { const r = await api.get('/advanced/pdc'); setList(r.data?.items || []); } catch { toast.error('Failed to load PDC'); }
  }, [api]);
  React.useEffect(() => { load(); }, [load]);
  const create = async (e) => {
    e.preventDefault();
    try { await api.post('/advanced/pdc', { ...form, amount: Number(form.amount) }); toast.success('Added'); setForm({ ...form, cheque_number: '', amount: '', party_name: '' }); load(); } catch { toast.error('Failed'); }
  };
  const mark = async (id, status) => { await api.put(`/advanced/pdc/${id}/status`, { status }); load(); };
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-white">PDC Cheques</h1>
        <form onSubmit={create} className="glass-card p-4 rounded-2xl grid grid-cols-2 md:grid-cols-6 gap-2">
          <Input className="input-premium" placeholder="Cheque no" value={form.cheque_number} onChange={(e) => setForm({ ...form, cheque_number: e.target.value })} />
          <Input className="input-premium" placeholder="Bank" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
          <Input className="input-premium" placeholder="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input className="input-premium" type="date" value={form.cheque_date} onChange={(e) => setForm({ ...form, cheque_date: e.target.value })} />
          <Input className="input-premium" placeholder="Party" value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} />
          <button className="btn-premium btn-primary">Add</button>
        </form>
        <div className="glass-card p-4 rounded-2xl overflow-auto">
          <table className="table-premium w-full">
            <thead><tr><th>Cheque</th><th>Date</th><th>Party</th><th>Amount</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((x) => <tr key={x.id}><td>{x.cheque_number}</td><td>{x.cheque_date}</td><td>{x.party_name}</td><td>{x.amount}</td><td>{x.status}</td><td className="space-x-1"><button className="btn-premium btn-secondary text-xs" onClick={() => mark(x.id, 'cleared')}>Cleared</button><button className="btn-premium btn-secondary text-xs" onClick={() => mark(x.id, 'bounced')}>Bounced</button></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
