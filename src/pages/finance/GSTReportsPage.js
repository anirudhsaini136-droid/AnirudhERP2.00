import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { FileText, Download, TrendingUp, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

// Get current month start/end
const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function GSTReportsPage() {
  const { api } = useAuth();
  const { start: defStart, end: defEnd } = getMonthRange();
  const [startDate, setStartDate] = useState(defStart);
  const [endDate, setEndDate] = useState(defEnd);
  const [summary, setSummary] = useState(null);
  const [gstr1, setGstr1] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itc, setItc] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  const [purchases, setPurchases] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, gstr1Res, purRes] = await Promise.all([
        api.get(`/finance/gst/summary?start_date=${startDate}&end_date=${endDate}`),
        api.get(`/finance/gst/gstr1?start_date=${startDate}&end_date=${endDate}`),
        api.get(`/purchases/summary?start_date=${startDate}&end_date=${endDate}`)
      ]);
      setSummary(sumRes.data);
      setGstr1(gstr1Res.data);
      setPurchases(purRes.data);
    } catch {
      toast.error('Failed to load GST data');
    }
    setLoading(false);
  };

  const exportToCSV = (rows, filename) => {
    if (!rows || rows.length === 0) { toast.error('No data to export'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(h => {
        const val = row[h] ?? '';
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded`);
  };

  const exportGSTR1 = () => {
    if (!gstr1?.rows) return;
    exportToCSV(gstr1.rows, `GSTR1_${startDate}_to_${endDate}.csv`);
  };

  const exportSummary = () => {
    if (!summary) return;
    const rows = summary.invoices?.map(inv => ({
      'Invoice No': inv.invoice_number,
      'Date': inv.issue_date,
      'Customer': inv.client_name,
      'Place of Supply': inv.place_of_supply || inv.buyer_state || '',
      'Supply Type': inv.supply_type || 'intrastate',
      'Taxable Value': inv.subtotal,
      'Tax Rate %': inv.tax_rate,
      'CGST %': inv.cgst_rate,
      'CGST Amount': inv.cgst_amount,
      'SGST %': inv.sgst_rate,
      'SGST Amount': inv.sgst_amount,
      'IGST %': inv.igst_rate,
      'IGST Amount': inv.igst_amount,
      'Total Amount': inv.total_amount,
      'Status': inv.status
    })) || [];
    exportToCSV(rows, `GST_Summary_${startDate}_to_${endDate}.csv`);
  };

  const s = summary?.summary;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">GST Reports</h1>
            <p className="text-sm text-gray-500 mt-1">GSTR-1 · Tax Summary · Export for CA</p>
          </div>
        </div>

        {/* Date Filter */}
        <div className="glass-card rounded-2xl p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">From Date</label>
            <input type="date" className="input-premium text-sm h-9" value={startDate}
              onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">To Date</label>
            <input type="date" className="input-premium text-sm h-9" value={endDate}
              onChange={e => setEndDate(e.target.value)} />
          </div>
          {/* Quick month selectors */}
          <div className="flex flex-wrap gap-1.5">
            {[0, 1, 2].map(offset => {
              const d = new Date();
              d.setMonth(d.getMonth() - offset);
              const s = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
              const e = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
              const label = offset === 0 ? 'This Month' : offset === 1 ? 'Last Month' : MONTHS[d.getMonth()];
              return (
                <button key={offset} onClick={() => { setStartDate(s); setEndDate(e); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all">
                  {label}
                </button>
              );
            })}
          </div>
          <button onClick={fetchData} disabled={loading}
            className="btn-premium btn-primary flex items-center gap-2 h-9 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Generate Report'}
          </button>
        </div>

        {summary && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Sales', value: fmt(s.total_sales), color: 'text-gold-400', sub: `${s.total_invoices} invoices` },
                { label: 'Total Taxable Value', value: fmt(s.total_taxable_value), color: 'text-blue-400', sub: 'Before tax' },
                { label: 'Total GST Collected', value: fmt(s.total_tax), color: 'text-emerald-400', sub: 'Output tax liability' },
                { label: 'Net GST Payable', value: fmt(s.total_tax), color: 'text-rose-400', sub: 'After ITC (add purchases)' },
              ].map(card => (
                <div key={card.label} className="glass-card rounded-2xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-[10px] text-gray-600 mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* GST Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="glass-card rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">CGST (Intra-State)</p>
                <p className="text-2xl font-bold text-blue-400">{fmt(s.total_cgst)}</p>
                <p className="text-xs text-gray-600 mt-1">{s.intrastate_count} intra-state invoices</p>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">SGST (Intra-State)</p>
                <p className="text-2xl font-bold text-blue-400">{fmt(s.total_sgst)}</p>
                <p className="text-xs text-gray-600 mt-1">Equal to CGST</p>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">IGST (Inter-State)</p>
                <p className="text-2xl font-bold text-purple-400">{fmt(s.total_igst)}</p>
                <p className="text-xs text-gray-600 mt-1">{s.interstate_count} inter-state invoices</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/5 pb-0">
              {['summary', 'gstr1'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`text-sm px-4 py-2 rounded-t-xl transition-all ${activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  {tab === 'summary' ? 'Sales Register' : 'GSTR-1 Detail'}
                </button>
              ))}
            </div>

            {/* Sales Register */}
            {activeTab === 'summary' && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                  <p className="text-sm font-semibold text-white">Sales Register ({s.total_invoices} invoices)</p>
                  <button onClick={exportSummary} className="btn-premium btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
                    <Download size={13} /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5">
                        {['Invoice No','Date','Customer','Supply Type','Taxable','CGST','SGST','IGST','Total'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summary.invoices?.map(inv => (
                        <tr key={inv.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 font-mono text-white whitespace-nowrap">{inv.invoice_number}</td>
                          <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{inv.issue_date}</td>
                          <td className="px-4 py-2.5 text-white max-w-32 truncate">{inv.client_name}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              inv.supply_type === 'interstate'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                            }`}>
                              {inv.supply_type === 'interstate' ? 'IGST' : 'CGST+SGST'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-300">{fmt(inv.subtotal)}</td>
                          <td className="px-4 py-2.5 text-right text-blue-400">{inv.cgst_amount > 0 ? fmt(inv.cgst_amount) : '—'}</td>
                          <td className="px-4 py-2.5 text-right text-blue-400">{inv.sgst_amount > 0 ? fmt(inv.sgst_amount) : '—'}</td>
                          <td className="px-4 py-2.5 text-right text-purple-400">{inv.igst_amount > 0 ? fmt(inv.igst_amount) : '—'}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-gold-400">{fmt(inv.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white/[0.03] border-t border-white/10">
                        <td colSpan={4} className="px-4 py-3 text-xs font-bold text-white">TOTAL</td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-white">{fmt(s.total_taxable_value)}</td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-blue-400">{fmt(s.total_cgst)}</td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-blue-400">{fmt(s.total_sgst)}</td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-purple-400">{fmt(s.total_igst)}</td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-gold-400">{fmt(s.total_sales)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* GSTR-1 Detail */}
            {activeTab === 'gstr1' && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                  <p className="text-sm font-semibold text-white">GSTR-1 ({gstr1?.total_rows} line items)</p>
                  <button onClick={exportGSTR1} className="btn-premium btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3">
                    <Download size={13} /> Export for GST Portal
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5">
                        {['Invoice No','Date','Customer','Place of Supply','HSN','Description','Qty','Rate','Taxable','Tax%','CGST','SGST','IGST','Total'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gstr1?.rows?.map((row, i) => (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-3 py-2 font-mono text-white whitespace-nowrap">{row.invoice_number}</td>
                          <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{row.invoice_date}</td>
                          <td className="px-3 py-2 text-white max-w-24 truncate">{row.customer_name}</td>
                          <td className="px-3 py-2 text-gray-400">{row.place_of_supply || '—'}</td>
                          <td className="px-3 py-2 font-mono text-gray-400">{row.hsn_code || '—'}</td>
                          <td className="px-3 py-2 text-gray-300 max-w-32 truncate">{row.description}</td>
                          <td className="px-3 py-2 text-right text-gray-400">{row.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-400">{fmt(row.unit_price)}</td>
                          <td className="px-3 py-2 text-right text-gray-300">{fmt(row.taxable_value)}</td>
                          <td className="px-3 py-2 text-right text-gray-400">{row.tax_rate}%</td>
                          <td className="px-3 py-2 text-right text-blue-400">{row.cgst_amount > 0 ? fmt(row.cgst_amount) : '—'}</td>
                          <td className="px-3 py-2 text-right text-blue-400">{row.sgst_amount > 0 ? fmt(row.sgst_amount) : '—'}</td>
                          <td className="px-3 py-2 text-right text-purple-400">{row.igst_amount > 0 ? fmt(row.igst_amount) : '—'}</td>
                          <td className="px-3 py-2 text-right font-bold text-gold-400">{fmt(row.invoice_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!gstr1?.rows || gstr1.rows.length === 0) && (
                    <div className="py-12 text-center text-gray-500 text-sm">No data for selected period</div>
                  )}
                </div>
              </div>
            )}

            {/* ITC Summary */}
            {itc && (
              <div className="glass-card rounded-2xl p-5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Input Tax Credit (ITC) — From Purchases</h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Purchases', value: itc.total_purchases, color: 'text-white' },
                    { label: 'ITC CGST', value: itc.itc?.cgst, color: 'text-emerald-400' },
                    { label: 'ITC SGST', value: itc.itc?.sgst, color: 'text-emerald-400' },
                    { label: 'ITC IGST', value: itc.itc?.igst, color: 'text-emerald-400' },
                  ].map(c => (
                    <div key={c.label}>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{c.label}</p>
                      <p className={`text-lg font-bold mt-1 ${c.color}`}>{fmt(c.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GSTR-3B Summary */}
            <div className="glass-card rounded-2xl p-5 border border-gold-500/20">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} className="text-gold-400" />
                <h3 className="text-sm font-semibold text-white">GSTR-3B Summary</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/20">Share with CA</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div><p className="text-[10px] text-gray-500 uppercase tracking-wider">Outward Taxable</p><p className="text-lg font-bold text-white mt-1">{fmt(s.total_taxable_value)}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase tracking-wider">Output Tax</p><p className="text-lg font-bold text-rose-400 mt-1">{fmt(s.total_tax)}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase tracking-wider">Total ITC</p><p className="text-lg font-bold text-emerald-400 mt-1">{fmt(itc?.itc?.total || 0)}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase tracking-wider">Net GST Payable</p><p className="text-xl font-bold text-gold-400 mt-1">{fmt(Math.max(0, s.total_tax - (itc?.itc?.total || 0)))}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'CGST', output: s.total_cgst, itc_val: itc?.itc?.cgst || 0 },
                  { label: 'SGST', output: s.total_sgst, itc_val: itc?.itc?.sgst || 0 },
                  { label: 'IGST', output: s.total_igst, itc_val: itc?.itc?.igst || 0 },
                ].map(row => (
                  <div key={row.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-xs font-semibold text-gray-400 mb-2">{row.label}</p>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Output</span><span className="text-rose-400">{fmt(row.output)}</span></div>
                    <div className="flex justify-between text-xs mt-1"><span className="text-gray-500">ITC</span><span className="text-emerald-400">-{fmt(row.itc_val)}</span></div>
                    <div className="flex justify-between text-xs mt-1 pt-1 border-t border-white/5 font-bold"><span className="text-white">Net</span><span className="text-gold-400">{fmt(Math.max(0, row.output - row.itc_val))}</span></div>
                  </div>
                ))}
              </div>
            </div>
        )}
          </>
        )}

        {!summary && !loading && (
          <div className="glass-card rounded-2xl py-16 text-center">
            <TrendingUp size={40} className="mx-auto mb-3 text-gray-600" />
            <p className="text-gray-500 text-sm">Select a date range and click Generate Report</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
