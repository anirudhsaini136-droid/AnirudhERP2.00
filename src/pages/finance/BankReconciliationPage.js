import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export default function BankReconciliationPage() {
  const { api } = useAuth();
  const [rows, setRows] = React.useState([]);
  const load = React.useCallback(async () => {
    try { const r = await api.get('/advanced/bank-reconciliation/lines'); setRows(r.data?.items || []); } catch { toast.error('Failed to load'); }
  }, [api]);
  React.useEffect(() => { load(); }, [load]);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post('/advanced/bank-reconciliation/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Statement uploaded');
      load();
    } catch {
      toast.error('Upload failed');
    }
  };
  const reconcile = async (id) => { await api.put(`/advanced/bank-reconciliation/lines/${id}`, { match_status: 'manual' }); load(); };
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-white">Bank Reconciliation</h1>
        <label className="btn-premium btn-primary w-fit cursor-pointer">Upload CSV<input type="file" className="hidden" onChange={upload} /></label>
        <div className="glass-card rounded-2xl p-4 overflow-auto">
          <table className="table-premium w-full"><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Reference</th><th>Status</th><th /></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id}><td>{r.txn_date}</td><td>{r.description}</td><td>{r.amount}</td><td>{r.reference}</td><td>{r.match_status}</td><td><button className="btn-premium btn-secondary text-xs" onClick={() => reconcile(r.id)}>Mark reconciled</button></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
