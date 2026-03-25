import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { FileText, Download, TrendingUp, TrendingDown, RefreshCw, Shield, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { loadLocalInvoices, syncOfflineInvoiceQueue } from '../../lib/offlineInvoices';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

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

const TYPE_BADGES = {
  asset: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  liability: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  equity: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  income: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  expense: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
};

const getMonthRange = () => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const pad = n => String(n).padStart(2, '0');
  return {
    start: `${y}-${pad(m+1)}-01`,
    end: `${y}-${pad(m+1)}-${pad(new Date(y, m+1, 0).getDate())}`
  };
};

export default function CAPortalPage() {
  const { api, user, business } = useAuth();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [gstr1, setGstr1] = useState(null);
  const [itc, setItc] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [exportMode, setExportMode] = useState('combined');
  const [syncing, setSyncing] = useState(false);
  const [mainTab, setMainTab] = useState('gst'); // 'gst' | 'accounting'

  // Accounting states
  const [trialBalance, setTrialBalance] = useState(null);
  const [pl, setPL] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [accLoading, setAccLoading] = useState(false);

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
  const range = getMonthRange();
  const [accStartDate, setAccStartDate] = useState(range.start);
  const [accEndDate, setAccEndDate] = useState(range.end);

  // Load accounting data when switching to accounting tab
  useEffect(() => {
    if (mainTab === 'accounting') fetchAccountingData();
  }, [mainTab]);

  const fetchAccountingData = async () => {
    setAccLoading(true);
    try {
      const [tbRes, bsRes] = await Promise.all([
        api.get('/accounting/reports/trial-balance'),
        api.get('/accounting/reports/balance-sheet'),
      ]);
      setTrialBalance(tbRes.data);
      setBalanceSheet(bsRes.data);
    } catch (e) {
      toast.error('Failed to load accounting data');
    }
    setAccLoading(false);
  };

  const fetchPL = async () => {
    try {
      const res = await api.get(`/accounting/reports/profit-loss?start_date=${accStartDate}&end_date=${accEndDate}`);
      setPL(res.data);
    } catch (e) { toast.error('Failed to load P&L'); }
  };

  const runAutoSync = useCallback(async (showToast = false) => {
    if (!business?.id) return false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    setSyncing(true);
    try {
      const res = await syncOfflineInvoiceQueue({ api, businessId: business.id });
      if (showToast) {
        const syncedCount = Number(res?.synced || 0);
        if (syncedCount > 0) toast.success(`Synced ${syncedCount} offline invoice action(s)`);
        else toast.success('Already up to date');
      }
      return true;
    } catch {
      if (showToast) toast.error('Sync failed');
      return false;
    } finally {
      setSyncing(false);
    }
  }, [api, business?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (business?.id && typeof navigator !== 'undefined' && navigator.onLine) {
        await runAutoSync(false);
      }
      const [sumRes, gstr1Res] = await Promise.all([
        api.get(`/finance/gst/summary?start_date=${startDate}&end_date=${endDate}`),
        api.get(`/finance/gst/gstr1?start_date=${startDate}&end_date=${endDate}`)
      ]);
      const toNum = (n) => Number(n || 0);
      const inRange = (d, start, end) => d && d >= start && d <= end;
      const locals = business?.id ? loadLocalInvoices(business.id) : [];
      const pending = (locals || []).filter((inv) =>
        inv &&
        inv.sync_status === 'local_pending' &&
        !inv.server_invoice_id &&
        inv.status !== 'cancelled' &&
        inRange(inv.issue_date, startDate, endDate)
      );

      const offlineRows = [];
      for (const inv of pending) {
        for (const item of (inv.items || [])) {
          offlineRows.push({
            invoice_number: inv.invoice_number,
            invoice_date: inv.issue_date || '',
            customer_name: inv.client_name || '',
            customer_gstin: '',
            place_of_supply: inv.place_of_supply || inv.buyer_state || '',
            supply_type: inv.supply_type || 'intrastate',
            hsn_code: item.hsn_code || '',
            description: item.description || '',
            quantity: toNum(item.quantity),
            unit_price: toNum(item.unit_price),
            taxable_value: toNum(item.total),
            tax_rate: toNum(inv.tax_rate),
            cgst_rate: toNum(inv.cgst_rate),
            cgst_amount: toNum(inv.cgst_amount),
            sgst_rate: toNum(inv.sgst_rate),
            sgst_amount: toNum(inv.sgst_amount),
            igst_rate: toNum(inv.igst_rate),
            igst_amount: toNum(inv.igst_amount),
            invoice_value: toNum(inv.total_amount),
            source: 'offline_pending',
          });
        }
      }

      const serverSummary = sumRes.data?.summary || {};
      const mergedSummary = {
        ...serverSummary,
        total_invoices: toNum(serverSummary.total_invoices) + pending.length,
        total_taxable_value: toNum(serverSummary.total_taxable_value) + pending.reduce((s, i) => s + toNum(i.subtotal), 0),
        total_cgst: toNum(serverSummary.total_cgst) + pending.reduce((s, i) => s + toNum(i.cgst_amount), 0),
        total_sgst: toNum(serverSummary.total_sgst) + pending.reduce((s, i) => s + toNum(i.sgst_amount), 0),
        total_igst: toNum(serverSummary.total_igst) + pending.reduce((s, i) => s + toNum(i.igst_amount), 0),
        total_tax: toNum(serverSummary.total_tax) + pending.reduce((s, i) => s + toNum(i.cgst_amount) + toNum(i.sgst_amount) + toNum(i.igst_amount), 0),
        total_sales: toNum(serverSummary.total_sales) + pending.reduce((s, i) => s + toNum(i.total_amount), 0),
        intrastate_count: toNum(serverSummary.intrastate_count) + pending.filter((i) => (i.supply_type || 'intrastate') === 'intrastate').length,
        interstate_count: toNum(serverSummary.interstate_count) + pending.filter((i) => (i.supply_type || '') === 'interstate').length,
        server_total_invoices: toNum(serverSummary.total_invoices),
        offline_pending_invoices: pending.length,
      };

      setSummary({
        ...sumRes.data,
        summary: mergedSummary,
        invoices: [...(sumRes.data?.invoices || []), ...pending.map((p) => ({ ...p, source: 'offline_pending' }))],
      });
      setGstr1({
        ...gstr1Res.data,
        rows: [...(gstr1Res.data?.rows || []), ...offlineRows],
        total_rows: (gstr1Res.data?.rows || []).length + offlineRows.length,
      });
      try {
        const itcRes = await api.get(`/purchases/itc/summary?start_date=${startDate}&end_date=${endDate}`);
        setItc(itcRes.data);
      } catch {
        setItc({ total_purchases: 0, itc: { cgst: 0, sgst: 0, igst: 0, total: 0 } });
      }
    } catch { toast.error('Failed to load GST data'); }
    setLoading(false);
  };

  useEffect(() => {
    if (!business?.id) return;
    const onOnline = () => {
      if (mainTab !== 'gst') return;
      runAutoSync(false).then(() => fetchData());
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // fetchData intentionally omitted to avoid re-subscribing listener every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id, mainTab, runAutoSync]);

  const exportGSTR1CSV = () => {
    if (!gstr1?.rows?.length) { toast.error('No data'); return; }
    const rows = gstr1.rows.filter((r) => {
      if (exportMode === 'combined') return true;
      if (exportMode === 'server_only') return (r.source || 'server') !== 'offline_pending';
      return (r.source || '') === 'offline_pending';
    });
    if (!rows.length) { toast.error('No data for selected export mode'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h] ?? '').join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `GSTR1_${exportMode}_${startDate}_${endDate}.csv`;
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
            <p className="text-sm text-gray-500">Welcome {user?.first_name} — GST Reports & Accounting</p>
          </div>
        </div>

        {/* Main Tabs: GST vs Accounting */}
        <div className="flex gap-2 border-b border-white/5">
          {[
            { key: 'gst', label: 'GST Reports', icon: <FileText size={14} /> },
            { key: 'accounting', label: 'Accounting', icon: <BookOpen size={14} /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setMainTab(tab.key)}
              className={`flex items-center gap-2 text-sm px-5 py-2.5 rounded-t-xl font-medium transition-all ${
                mainTab === tab.key ? 'bg-white/10 text-white border-b-2 border-gold-500' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── GST TAB ── */}
        {mainTab === 'gst' && (
          <div className="space-y-6">
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
                  const now2 = new Date();
                  const y2 = now2.getFullYear(), m2 = now2.getMonth() + offset;
                  const pad2 = n => String(n).padStart(2, '0');
                  const s = `${y2}-${pad2(m2 + 1)}-01`;
                  const e = `${y2}-${pad2(m2 + 1)}-${pad2(new Date(y2, m2 + 1, 0).getDate())}`;
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
              <button onClick={() => runAutoSync(true).then(fetchData)} disabled={syncing}
                className="btn-premium btn-secondary flex items-center gap-2 h-9 text-sm">
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>

            {summary && (
              <>
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

                {s.offline_pending_invoices > 0 && (
                  <div className="glass-card rounded-2xl p-3 border border-amber-500/20 bg-amber-500/5">
                    <p className="text-xs text-amber-300">
                      Included offline pending invoices: <span className="font-semibold">{s.offline_pending_invoices}</span>{' '}
                      (server invoices: {s.server_total_invoices})
                    </p>
                  </div>
                )}

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

                <div className="flex gap-2 border-b border-white/5">
                  {['summary', 'gstr1'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`text-sm px-4 py-2 rounded-t-xl transition-all ${activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                      {tab === 'summary' ? 'Sales Register' : 'GSTR-1 Detail'}
                    </button>
                  ))}
                </div>

                {activeTab === 'summary' && (
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                      <p className="text-sm font-semibold text-white">Sales Register ({s.total_invoices} invoices)</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={exportMode}
                          onChange={(e) => setExportMode(e.target.value)}
                          className="input-premium text-xs h-8"
                        >
                          <option value="combined">Combined</option>
                          <option value="server_only">Server only</option>
                          <option value="offline_only">Offline pending only</option>
                        </select>
                        <button onClick={() => {
                        const sourceRows = (summary.invoices || []).filter((inv) => {
                          if (exportMode === 'combined') return true;
                          if (exportMode === 'server_only') return (inv.source || 'server') !== 'offline_pending';
                          return (inv.source || '') === 'offline_pending';
                        });
                        const rows = sourceRows?.map(inv => ({
                          'Invoice No': inv.invoice_number, 'Date': inv.issue_date,
                          'Customer': inv.client_name, 'Supply Type': inv.supply_type,
                          'Taxable': inv.subtotal, 'CGST': inv.cgst_amount,
                          'SGST': inv.sgst_amount, 'IGST': inv.igst_amount, 'Total': inv.total_amount,
                          'Source': inv.source === 'offline_pending' ? 'Offline Pending' : 'Server',
                        })) || [];
                        if (!rows.length) { toast.error('No data for selected export mode'); return; }
                        const headers = Object.keys(rows[0] || {});
                        const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h] ?? '').join(','))].join('\n');
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                        a.download = `Sales_Register_${exportMode}_${startDate}_${endDate}.csv`;
                        a.click();
                        toast.success('CSV downloaded');
                      }} className="btn-premium btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
                        <Download size={13} /> Export CSV
                      </button>
                      </div>
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

                {activeTab === 'gstr1' && (
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                      <p className="text-sm font-semibold text-white">GSTR-1 ({gstr1?.total_rows} line items)</p>
                      <div className="flex gap-2">
                        <select
                          value={exportMode}
                          onChange={(e) => setExportMode(e.target.value)}
                          className="input-premium text-xs h-8"
                        >
                          <option value="combined">Combined</option>
                          <option value="server_only">Server only</option>
                          <option value="offline_only">Offline pending only</option>
                        </select>
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
        )}

        {/* ── ACCOUNTING TAB ── */}
        {mainTab === 'accounting' && (
          <div className="space-y-6">
            {accLoading ? (
              <div className="glass-card rounded-2xl py-16 text-center">
                <RefreshCw size={28} className="mx-auto mb-3 text-gray-600 animate-spin" />
                <p className="text-gray-500 text-sm">Loading accounting data...</p>
              </div>
            ) : (
              <>
                {/* Trial Balance */}
                {trialBalance && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold">Trial Balance</h3>
                        {trialBalance.is_balanced
                          ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={13} /> Balanced</span>
                          : <span className="flex items-center gap-1 text-xs text-rose-400"><AlertCircle size={13} /> Not balanced</span>
                        }
                      </div>
                      <span className="text-xs text-gray-500">As of {fmtDate(trialBalance.as_of_date)}</span>
                    </div>
                    <div className="glass-card rounded-2xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-white/[0.02] border-b border-white/5 text-xs text-gray-500 uppercase">
                          <th className="px-4 py-3 text-left">Code</th>
                          <th className="px-4 py-3 text-left">Account Name</th>
                          <th className="px-4 py-3 text-left">Type</th>
                          <th className="px-4 py-3 text-right">Debit (Dr)</th>
                          <th className="px-4 py-3 text-right">Credit (Cr)</th>
                        </tr></thead>
                        <tbody>
                          {trialBalance.rows?.map((row, i) => (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="px-4 py-2 font-mono text-xs text-gray-500">{row.code}</td>
                              <td className="px-4 py-2 text-white">{row.name}</td>
                              <td className="px-4 py-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TYPE_BADGES[row.account_type]}`}>
                                  {row.account_type}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-sm text-blue-400">{row.debit > 0 ? fmt(row.debit) : '-'}</td>
                              <td className="px-4 py-2 text-right font-mono text-sm text-rose-400">{row.credit > 0 ? fmt(row.credit) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-white/[0.03] border-t border-white/10 font-bold">
                            <td colSpan={3} className="px-4 py-3 text-white text-sm">TOTAL</td>
                            <td className="px-4 py-3 text-right text-blue-400 font-mono">{fmt(trialBalance.total_debit)}</td>
                            <td className="px-4 py-3 text-right text-rose-400 font-mono">{fmt(trialBalance.total_credit)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* P&L */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-semibold">Profit & Loss</h3>
                    <DateInput className="input-premium text-sm h-8 w-32" value={accStartDate} onChange={e => setAccStartDate(e.target.value)} />
                    <DateInput className="input-premium text-sm h-8 w-32" value={accEndDate} onChange={e => setAccEndDate(e.target.value)} />
                    <button onClick={fetchPL} className="btn-premium btn-primary text-xs h-8 flex items-center gap-1.5 px-3">
                      <RefreshCw size={12} /> Generate
                    </button>
                  </div>
                  {pl && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                          <TrendingUp size={15} className="text-emerald-400" />
                          <h4 className="font-semibold text-white text-sm">Income</h4>
                        </div>
                        <table className="w-full text-sm">
                          <tbody>
                            {pl.income?.items?.map((item, i) => (
                              <tr key={i} className="border-b border-white/[0.03]">
                                <td className="px-4 py-2 text-gray-300">{item.name}</td>
                                <td className="px-4 py-2 text-right text-emerald-400 font-mono">{fmt(item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-emerald-500/5 border-t border-emerald-500/20">
                              <td className="px-4 py-3 font-bold text-white">Total Income</td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-400">{fmt(pl.income?.total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                          <TrendingDown size={15} className="text-rose-400" />
                          <h4 className="font-semibold text-white text-sm">Expenses</h4>
                        </div>
                        <table className="w-full text-sm">
                          <tbody>
                            {pl.cogs?.items?.map((item, i) => (
                              <tr key={i} className="border-b border-white/[0.03]">
                                <td className="px-4 py-2 text-gray-400 text-xs pl-4">{item.name}</td>
                                <td className="px-4 py-2 text-right text-gray-400 font-mono text-xs">{fmt(item.amount)}</td>
                              </tr>
                            ))}
                            <tr className="bg-white/[0.02] border-y border-white/5">
                              <td className="px-4 py-2 font-semibold text-white">Gross Profit</td>
                              <td className={`px-4 py-2 text-right font-bold ${pl.gross_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(pl.gross_profit)}</td>
                            </tr>
                            {pl.operating_expenses?.items?.map((item, i) => (
                              <tr key={i} className="border-b border-white/[0.03]">
                                <td className="px-4 py-2 text-gray-300 text-xs">{item.name}</td>
                                <td className="px-4 py-2 text-right text-rose-400 font-mono text-xs">{fmt(item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className={`border-t border-white/10 ${pl.net_profit >= 0 ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
                              <td className="px-4 py-3 font-bold text-white">
                                Net {pl.net_profit >= 0 ? 'Profit' : 'Loss'}
                                <span className="ml-2 text-xs text-gray-500">({pl.net_profit_margin}%)</span>
                              </td>
                              <td className={`px-4 py-3 text-right font-bold text-lg ${pl.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {fmt(pl.net_profit)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Balance Sheet */}
                {balanceSheet && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">Balance Sheet</h3>
                      <div className="flex items-center gap-2 text-xs">
                        {balanceSheet.is_balanced
                          ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={13} /> Balanced</span>
                          : <span className="flex items-center gap-1 text-amber-400"><AlertCircle size={13} /> Not balanced</span>
                        }
                        <span className="text-gray-500">As of {fmtDate(balanceSheet.as_of_date)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5"><h4 className="font-semibold text-blue-400 text-sm">Assets</h4></div>
                        <div className="divide-y divide-white/[0.03]">
                          {[
                            { label: 'Bank & Cash', items: balanceSheet.assets?.bank_cash },
                            { label: 'Current Assets', items: balanceSheet.assets?.current },
                            { label: 'Fixed Assets', items: balanceSheet.assets?.fixed }
                          ].map(section => section.items?.length > 0 && (
                            <div key={section.label}>
                              <p className="px-4 py-1.5 text-xs text-gray-600 font-semibold">{section.label}</p>
                              {section.items.map((item, i) => (
                                <div key={i} className="flex justify-between px-4 py-1.5">
                                  <span className="text-sm text-gray-300">{item.name}</span>
                                  <span className="text-sm text-blue-400 font-mono">{fmt(item.balance)}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                        <div className="px-4 py-3 border-t border-blue-500/20 bg-blue-500/5 flex justify-between">
                          <span className="font-bold text-white">Total Assets</span>
                          <span className="font-bold text-blue-400">{fmt(balanceSheet.total_assets)}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="glass-card rounded-2xl overflow-hidden">
                          <div className="px-5 py-3 border-b border-white/5"><h4 className="font-semibold text-rose-400 text-sm">Liabilities</h4></div>
                          {[...( balanceSheet.liabilities?.current || []), ...(balanceSheet.liabilities?.long_term || [])].map((item, i) => (
                            <div key={i} className="flex justify-between px-4 py-1.5 border-b border-white/[0.03]">
                              <span className="text-sm text-gray-300">{item.name}</span>
                              <span className="text-sm text-rose-400 font-mono">{fmt(item.balance)}</span>
                            </div>
                          ))}
                          <div className="px-4 py-3 border-t border-rose-500/20 bg-rose-500/5 flex justify-between">
                            <span className="font-bold text-white">Total Liabilities</span>
                            <span className="font-bold text-rose-400">{fmt(balanceSheet.total_liabilities)}</span>
                          </div>
                        </div>
                        <div className="glass-card rounded-2xl overflow-hidden">
                          <div className="px-5 py-3 border-b border-white/5"><h4 className="font-semibold text-purple-400 text-sm">Equity</h4></div>
                          {balanceSheet.equity?.map((item, i) => (
                            <div key={i} className="flex justify-between px-4 py-1.5 border-b border-white/[0.03]">
                              <span className="text-sm text-gray-300">{item.name}</span>
                              <span className="text-sm text-purple-400 font-mono">{fmt(item.balance)}</span>
                            </div>
                          ))}
                          <div className="px-4 py-3 border-t border-purple-500/20 bg-purple-500/5 flex justify-between">
                            <span className="font-bold text-white">Total Equity</span>
                            <span className="font-bold text-purple-400">{fmt(balanceSheet.total_equity)}</span>
                          </div>
                        </div>
                        <div className="glass-card rounded-2xl p-4 flex justify-between items-center border border-gold-500/20 bg-gold-500/5">
                          <span className="font-bold text-white">Total L + E</span>
                          <span className="font-bold text-gold-400 text-lg">{fmt(balanceSheet.total_liabilities_equity)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
