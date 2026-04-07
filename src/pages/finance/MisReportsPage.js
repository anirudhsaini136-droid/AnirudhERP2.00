import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

const REPORTS = [
  { id: 'sales_by_customer', label: 'Sales by customer' },
  { id: 'purchase_by_vendor', label: 'Purchase by vendor' },
  { id: 'expense_by_category', label: 'Expense by category' },
  { id: 'stock_movement', label: 'Stock movement' },
  { id: 'profit_by_product', label: 'Profit by product' },
];

export default function MisReportsPage() {
  const { api } = useAuth();
  const [report, setReport] = React.useState('sales_by_customer');
  const [fromDate, setFromDate] = React.useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = React.useState([]);
  const run = async () => {
    try {
      const r = await api.get('/advanced/mis', { params: { report, from_date: fromDate, to_date: toDate } });
      setRows(r.data?.rows || []);
    } catch {
      toast.error('Failed to load report');
    }
  };
  React.useEffect(() => { run(); }, [report]); // eslint-disable-line
  const exportCsv = () => {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const data = [cols.join(','), ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n');
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${report}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-white">MIS Reports</h1>
        <div className="glass-card rounded-2xl p-4 flex flex-wrap gap-2 items-center">
          <select className="input-premium" value={report} onChange={(e) => setReport(e.target.value)}>{REPORTS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
          <input className="input-premium" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="input-premium" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button className="btn-premium btn-primary" onClick={run}>Run</button>
          <button className="btn-premium btn-secondary" onClick={exportCsv}>Export CSV</button>
        </div>
        <div className="glass-card rounded-2xl p-4 overflow-auto">
          <table className="table-premium w-full">
            <thead><tr>{rows[0] ? Object.keys(rows[0]).map((k) => <th key={k}>{k}</th>) : null}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{String(v)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
