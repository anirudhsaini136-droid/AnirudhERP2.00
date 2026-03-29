import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatApiError } from '../../shared-core';

export default function EwayBillsPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/finance/eway-bills');
      setRows(r.data.eway_bills || []);
    } catch (e) {
      toast.error(formatApiError(e, 'E-way bills'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [api]);

  const cancel = async (id) => {
    if (!window.confirm('Mark this e-way bill cancelled locally?')) return;
    try {
      await api.post(`/finance/eway-bills/${id}/cancel`);
      toast.success('Updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-gold-500" />
            <div>
              <h1 className="font-display text-2xl text-white">E-Way Bills</h1>
              <p className="text-sm text-gray-500">Generated from invoices (mock mode by default).</p>
            </div>
          </div>
          <button type="button" onClick={load} className="text-gray-400 hover:text-white p-2 rounded-lg border border-white/10"><RefreshCw size={18} /></button>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-gray-500 text-sm">No e-way bills yet. Open an invoice and use &quot;Create E-Way Bill&quot;.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/5 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">EWB No</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Valid until</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3 text-white font-mono">{r.ewb_no || '—'}</td>
                      <td className="px-4 py-3">
                        <button type="button" className="text-gold-400 hover:underline" onClick={() => navigate(`/finance/invoices/${r.invoice_id}`)}>
                          View invoice
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{r.vehicle_no || '—'}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-white/10">{r.status}</span></td>
                      <td className="px-4 py-3 text-gray-400">{r.valid_until || '—'}</td>
                      <td className="px-4 py-3">
                        {r.status === 'active' && (
                          <Button type="button" size="sm" variant="outline" onClick={() => cancel(r.id)}>Cancel</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
