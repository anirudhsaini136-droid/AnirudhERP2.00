import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { FileText, Download, TrendingUp, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

function DateInput({ value, onChange, className }) {
  const toDisplay = (v) => {
    if (!v) return '';
    const parts = v.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return v;
  };
  const [display, setDisplay] = React.useState(() => toDisplay(value));
  React.useEffect(() => { setDisplay(toDisplay(value)); }, [value]);
  const handleChange = (e) => {
    let v = e.target.value.replace(/[^0-9/]/g, '');
    if (v.length === 2 && display.length === 1) v += '/';
    if (v.length === 5 && display.length === 4) v += '/';
    if (v.length > 10) v = v.slice(0, 10);
    setDisplay(v);
    if (v.length === 10) {
      const [d, m, y] = v.split('/');
      if (d && m && y && y.length === 4)
        onChange({ target: { value: `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` } });
    }
  };
  return <input type="text" className={className} value={display} onChange={handleChange} placeholder="DD/MM/YYYY" maxLength={10} />;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CAPortalPage() {
  const { api, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [gstr1, setGstr1] = useState(null);
  const [itc, setItc] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  const getRange = (offset = 0) => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + offset;
    const pad = n => String(n).padStart(2, '0');
    return {
      start: `${y}-${pad(m + 1)}-01`,
      end: `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`
    };
  };

  const { start: defStart, end: defEnd } = getRange(0);
  const [startDate, setStartDate] = useState(defStart);
  const [endDate, setEndDate] = useState(defEnd);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, gstr1Res] = await Promise.all([
        api.get(`/finance/gst/summary?start_date=${startDate}&end_date=${endDate}`),
        api.get(`/finance/gst/gstr1?start_date=${startDate}&end_date=${endDate}`)
      ]);
      setSummary(sumRes.data);
      setGstr1(gstr1Res.data);
      try {
        const itcRes = await api.get(`/purchases/itc/summary?start_date=${startDate}&end_date=${endDate}`);
        setItc(itcRes.data);
      } catch {
        setItc({ total_purchases: 0, itc: { cgst: 0, sgst: 0, igst: 0, total: 0 } });
      }
    } catch { toast.error('Failed to load GST data'); }
    setLoading(false);
  };

  const exportGSTR1CSV = () => {
    if (!gstr1?.rows?.length) { toast.error('No data'); return; }
    const headers = Object.keys(gstr1.rows[0]);
    const csv = [headers.join(','), ...gstr1.rows.map(r => headers.map(h => r[h] ?? '').join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `GSTR1_${startDate}_${endDate}.csv`;
    a.click();
    toast.success('GSTR-1 CSV downloaded');
  };

  const exportGSTR1JSON = async () => {
    try {
      const res = await api.get(`/finance/gst/gstr1-json?start_date=${startDate}&end_date=${endDate}`);
      const json = JSON.stringify(res.data.gstr1, null, 2);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = `GSTR1_${startDate}_${endDate}.json`;
      a.click();
      toast.success('GSTR-1 JSON downloaded — ready for GST portal upload');
    } catch { toast.error('Failed to export JSON'); }
  };

  const s = summary?.summary;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={20} className="text-blue-400" />
              <h1 className="font-display text-2xl text-white">CA Portal</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">Read Only</span>
            </div>
            <p className="text-sm text-gray-500">Welcome {user?.first_name} — GST Reports, GSTR-1 & GSTR-3B</p>
          </div>
        </div>

        {/* Date Filter */}
        <div className="glass-card rounded-2xl p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">From Date</label>
            <DateInput className="input-premium text-sm h-9 w-36" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">To Date</label>
            <DateInput className="input-premium text-sm h-9 w-36" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[0, -1, -2].map(offset => {
              const { start: s, end: e } = getRange(offset);
              const d = new Date(); d.setMonth(d.getMonth() + offset);
              const label = offset === 0 ? 'This Month' : offset === -1 ? 'Last Month' : MONTHS[d.getMonth()];
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
                { label: 'Total GST Collected', value: fmt(s.total_tax), color: 'text-emerald-400', sub: 'Output tax' },
                { label: 'Net GST Payable', value: fmt(Math.max(0, s.total_tax - (itc?.itc?.total || 0))), color: 'text-rose-400', sub: 'After ITC' },
              ].map(card => (
                <div key={card.label} className="glass-card rounded-2xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-[10px] text-gray-600 mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* GST Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-card rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">CGST</p>
                <p className="text-2xl font-bold text-blue-400">{fmt(s.total_cgst)}</p>
                <p className="text-xs text-gray-600">{s.intrastate_count} intra-state invoices</p>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">SGST</p>
                <p className="text-2xl font-bold text-blue-400">{fmt(s.total_sgst)}</p>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">IGST</p>
                <p className="text-2xl font-bold text-purple-400">{fmt(s.total_igst)}</p>
                <p className="text-xs text-gray-600">{s.interstate_count} inter-state invoices</p>
              </div>
            </div>

            {/* ITC */}
            {itc && (
              <div className="glass-card rounded-2xl p-5 border border-emerald-500/20">
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-3">Input Tax Credit (ITC) — From Purchases</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div><p className="text-[10px] text-gray-500">Total Purchases</p><p className="text-lg font-bold text-white">{fmt(itc.total_purchases)}</p></div>
                  <div><p className="text-[10px] text-gray-500">ITC CGST</p><p className="text-lg font-bold text-emerald-400">{fmt(itc.itc?.cgst)}</p></div>
                  <div><p className="text-[10px] text-gray-500">ITC SGST</p><p className="text-lg font-bold text-emerald-400">{fmt(itc.itc?.sgst)}</p></div>
                  <div><p className="text-[10px] text-gray-500">ITC IGST</p><p className="text-lg font-bold text-emerald-400">{fmt(itc.itc?.igst)}</p></div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/5">
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
                  <button onClick={() => {
                    const rows = summary.invoices?.map(inv => ({
                      'Invoice No': inv.invoice_number, 'Date': inv.issue_date,
                      'Customer': inv.client_name, 'Supply Type': inv.supply_type,
                      'Taxable': inv.subtotal, 'CGST': inv.cgst_amount,
                      'SGST': inv.sgst_amount, 'IGST': inv.igst_amount, 'Total': inv.total_amount
                    })) || [];
                    const headers = Object.keys(rows[0] || {});
                    const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h] ?? '').join(','))].join('\n');
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                    a.download = `Sales_Register_${startDate}_${endDate}.csv`;
                    a.click();
                    toast.success('CSV downloaded');
                  }} className="btn-premium btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
                    <Download size={13} /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-white/[0.02] border-b border-white/5">
                      {['Invoice No','Date','Customer','Supply Type','Taxable','CGST','SGST','IGST','Total'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-gray-500 font-semibold uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {summary.invoices?.map(inv => (
                        <tr key={inv.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 font-mono text-white">{inv.invoice_number}</td>
                          <td className="px-4 py-2.5 text-gray-400">{inv.issue_date}</td>
                          <td className="px-4 py-2.5 text-white">{inv.client_name}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${inv.supply_type === 'interstate' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
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
                  <div className="flex gap-2">
                    <button onClick={exportGSTR1CSV} className="btn-premium btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
                      <Download size={13} /> CSV
                    </button>
                    <button onClick={exportGSTR1JSON} className="btn-premium btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3">
                      <Download size={13} /> JSON for GST Portal
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-white/[0.02] border-b border-white/5">
                      {['Invoice No','Date','Customer','HSN','Qty','Rate','Taxable','Tax%','CGST','SGST','IGST','Total'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {gstr1?.rows?.map((row, i) => (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-3 py-2 font-mono text-white">{row.invoice_number}</td>
                          <td className="px-3 py-2 text-gray-400">{row.invoice_date}</td>
                          <td className="px-3 py-2 text-white">{row.customer_name}</td>
                          <td className="px-3 py-2 font-mono text-gray-400">{row.hsn_code || '—'}</td>
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
                </div>
              </div>
            )}

            {/* GSTR-3B */}
            <div className="glass-card rounded-2xl p-5 border border-gold-500/20">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} className="text-gold-400" />
                <h3 className="text-sm font-semibold text-white">GSTR-3B Summary</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div><p className="text-[10px] text-gray-500 uppercase">Outward Taxable</p><p className="text-lg font-bold text-white mt-1">{fmt(s.total_taxable_value)}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase">Output Tax</p><p className="text-lg font-bold text-rose-400 mt-1">{fmt(s.total_tax)}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase">Total ITC</p><p className="text-lg font-bold text-emerald-400 mt-1">{fmt(itc?.itc?.total || 0)}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase">Net GST Payable</p><p className="text-xl font-bold text-gold-400 mt-1">{fmt(Math.max(0, s.total_tax - (itc?.itc?.total || 0)))}</p></div>
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
