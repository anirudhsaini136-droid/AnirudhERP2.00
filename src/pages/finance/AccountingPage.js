import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { BookOpen, Plus, TrendingUp, TrendingDown, Scale, FileText, RefreshCw, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

function DateInput({ value, onChange, className, required }) {
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
    } else if (v === '') onChange({ target: { value: '' } });
  };
  return <input type="text" className={className} value={display} onChange={handleChange}
    placeholder="DD/MM/YYYY" maxLength={10} required={required} />;
}

const TABS = ['Chart of Accounts', 'Journal Entries', 'Trial Balance', 'P&L', 'Balance Sheet', 'Cash Flow'];

const TYPE_COLORS = {
  asset: 'text-blue-400', liability: 'text-rose-400',
  equity: 'text-purple-400', income: 'text-emerald-400', expense: 'text-amber-400'
};

const TYPE_BADGES = {
  asset: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  liability: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  equity: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  income: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  expense: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
};

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
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

export default function AccountingPage() {
  const { api, user } = useAuth();
  const [activeTab, setActiveTab] = useState('Chart of Accounts');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [isSetup, setIsSetup] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  // Journal
  const [journal, setJournal] = useState([]);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalForm, setJournalForm] = useState({
    entry_date: today(), narration: '',
    lines: [
      { account_id: '', debit: 0, credit: 0, narration: '' },
      { account_id: '', debit: 0, credit: 0, narration: '' }
    ]
  });

  // Reports
  const [trialBalance, setTrialBalance] = useState(null);
  const [pl, setPL] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const range = getMonthRange();
  const [startDate, setStartDate] = useState(range.start);
  const [endDate, setEndDate] = useState(range.end);

  useEffect(() => { fetchAccounts(); }, []);

  // ── Silent auto-sync + balance recalculation + period close on every page load ──
  // CA admins have read-only access so skip write operations for them
  const silentSync = async () => {
    const isCA = user?.role === 'ca_admin';
    if (!isCA) {
      try { await api.post('/finance/sync-to-accounting'); } catch (e) { /* silent */ }
      try { await api.post('/purchases/sync-to-accounting'); } catch (e) { /* silent */ }
      try { await api.post('/finance/sync-payments-to-accounting'); } catch (e) { /* silent */ }
      try { await api.post('/purchases/sync-payments-to-accounting'); } catch (e) { /* silent */ }
      try { await api.post('/accounting/recalculate-balances'); } catch (e) { /* silent */ }
      try { await api.post(`/accounting/reports/close-period?start_date=${range.start}&end_date=${range.end}`); } catch (e) { /* silent */ }
    }
    // After sync, refresh whichever report tab is active
    if (activeTab === 'Trial Balance') fetchTrialBalance();
    if (activeTab === 'P&L') fetchPL();
    if (activeTab === 'Balance Sheet') fetchBalanceSheet();
    if (activeTab === 'Cash Flow') fetchCashFlow();
    if (activeTab === 'Journal Entries') fetchJournal();
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounting/accounts');
      const total = res.data.total || 0;
      setAccounts(res.data.accounts || []);
      setIsSetup(total > 0);
      // If COA is set up, silently sync existing invoices/purchases to accounting
      if (total > 0) {
        silentSync();
      }
    } catch (e) {
      setIsSetup(false);
    }
    setLoading(false);
  };

  const setupCOA = async () => {
    setSetupLoading(true);
    try {
      await api.post('/accounting/setup');
      toast.success('Chart of accounts initialized with standard Indian accounts!');
      fetchAccounts();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Setup failed');
    }
    setSetupLoading(false);
  };

  const fetchJournal = async () => {
    try {
      const res = await api.get('/accounting/journal?limit=50');
      setJournal(res.data.entries || []);
    } catch (e) { toast.error('Failed to load journal'); }
  };

  const fetchTrialBalance = async () => {
    try {
      const res = await api.get('/accounting/reports/trial-balance');
      setTrialBalance(res.data);
    } catch (e) { toast.error('Failed to load trial balance'); }
  };

  const fetchPL = async (sd, ed) => {
    const s = (typeof sd === 'string') ? sd : startDate;
    const en = (typeof ed === 'string') ? ed : endDate;
    try {
      const res = await api.get(`/accounting/reports/profit-loss?start_date=${s}&end_date=${en}`);
      setPL(res.data);
    } catch (err) { toast.error('Failed to load P&L'); }
  };

  const fetchBalanceSheet = async () => {
    try {
      const res = await api.get('/accounting/reports/balance-sheet');
      setBalanceSheet(res.data);
    } catch (e) { toast.error('Failed to load balance sheet'); }
  };

  const fetchCashFlow = async (sd, ed) => {
    const s = (typeof sd === 'string') ? sd : startDate;
    const en = (typeof ed === 'string') ? ed : endDate;
    try {
      const res = await api.get(`/accounting/reports/cash-flow?start_date=${s}&end_date=${en}`);
      setCashFlow(res.data);
    } catch (err) { toast.error('Failed to load cash flow'); }
  };

  const closePeriod = async () => {
    if (!window.confirm(`Close period ${startDate} to ${endDate}? This will transfer net P&L into Retained Earnings, making the Balance Sheet balance. You can re-run this anytime to update.`)) return;
    try {
      const res = await api.post(`/accounting/reports/close-period?start_date=${startDate}&end_date=${endDate}`);
      toast.success(res.data.message);
      fetchBalanceSheet();
      fetchTrialBalance();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Period close failed');
    }
  };

  useEffect(() => {
    if (activeTab === 'Journal Entries') fetchJournal();
    if (activeTab === 'Trial Balance') fetchTrialBalance();
    if (activeTab === 'P&L') fetchPL(startDate, endDate);
    if (activeTab === 'Balance Sheet') fetchBalanceSheet();
    if (activeTab === 'Cash Flow') fetchCashFlow(startDate, endDate);
  }, [activeTab, startDate, endDate]);

  const addJournalLine = () => setJournalForm(f => ({
    ...f, lines: [...f.lines, { account_id: '', debit: 0, credit: 0, narration: '' }]
  }));

  const removeJournalLine = (i) => setJournalForm(f => ({
    ...f, lines: f.lines.filter((_, idx) => idx !== i)
  }));

  const updateLine = (i, field, value) => setJournalForm(f => ({
    ...f,
    lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: field === 'debit' || field === 'credit' ? parseFloat(value) || 0 : value } : l)
  }));

  const totalDebit = journalForm.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = journalForm.lines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const submitJournal = async (e) => {
    e.preventDefault();
    if (!isBalanced) { toast.error('Entry not balanced! Debit must equal Credit'); return; }
    try {
      const res = await api.post('/accounting/journal', { ...journalForm, entry_type: 'manual' });
      toast.success(`Journal entry ${res.data.entry_number} created`);
      setShowJournalForm(false);
      setJournalForm({ entry_date: today(), narration: '', lines: [{ account_id: '', debit: 0, credit: 0, narration: '' }, { account_id: '', debit: 0, credit: 0, narration: '' }] });
      fetchJournal();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const deleteJournal = async (id) => {
    if (!window.confirm('Delete this journal entry?')) return;
    try {
      await api.delete(`/accounting/journal/${id}`);
      toast.success('Entry deleted');
      fetchJournal();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  if (!isSetup && !loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
            <BookOpen size={36} className="text-gold-400" />
          </div>
          <div className="text-center">
            <h2 className="font-display text-2xl text-white">Set Up Accounting</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-md">Initialize your chart of accounts with the full Indian accounting standard — Assets, Liabilities, Equity, Income, and Expenses.</p>
          </div>
          <button onClick={setupCOA} disabled={setupLoading} className="btn-premium btn-primary flex items-center gap-2">
            {setupLoading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
            {setupLoading ? 'Setting up...' : 'Initialize Chart of Accounts'}
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Accounting</h1>
            <p className="text-sm text-gray-500">Double-entry bookkeeping · Indian standards</p>
          </div>
          {activeTab === 'Journal Entries' && user?.role !== 'ca_admin' && (
            <button onClick={() => setShowJournalForm(true)} className="btn-premium btn-primary flex items-center gap-2">
              <Plus size={15} /> New Journal Entry
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap border-b border-white/5 pb-0">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-xs px-4 py-2.5 rounded-t-xl font-medium transition-all ${
                activeTab === tab ? 'bg-white/10 text-white border-b-2 border-gold-500' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── CHART OF ACCOUNTS ── */}
        {activeTab === 'Chart of Accounts' && (
          <div className="space-y-4">
            {['asset', 'liability', 'equity', 'income', 'expense'].map(type => {
              const typeAccounts = accounts.filter(a => a.account_type === type);
              if (typeAccounts.length === 0) return null;
              return (
                <div key={type} className="glass-card rounded-2xl overflow-hidden">
                  <div className={`px-5 py-3 border-b border-white/5 flex items-center justify-between`}>
                    <h3 className={`font-semibold capitalize ${TYPE_COLORS[type]}`}>{type}s</h3>
                    <span className="text-xs text-gray-500">{typeAccounts.length} accounts</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="bg-white/[0.02] text-xs text-gray-500 uppercase">
                      <th className="px-4 py-2 text-left">Code</th>
                      <th className="px-4 py-2 text-left">Account Name</th>
                      <th className="px-4 py-2 text-left">Group</th>
                      <th className="px-4 py-2 text-right">Balance</th>
                    </tr></thead>
                    <tbody>
                      {typeAccounts.map(acc => (
                        <tr key={acc.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-4 py-2 font-mono text-xs text-gray-500">{acc.code}</td>
                          <td className="px-4 py-2 text-white">{acc.name}{acc.is_system && <span className="ml-2 text-[9px] text-gray-600">SYS</span>}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">{acc.account_group?.replace(/_/g, ' ')}</td>
                          <td className={`px-4 py-2 text-right font-mono text-sm ${acc.current_balance > 0 ? TYPE_COLORS[type] : 'text-gray-600'}`}>
                            {fmt(acc.current_balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* ── JOURNAL ENTRIES ── */}
        {activeTab === 'Journal Entries' && (
          <div className="space-y-4">
            {showJournalForm && (
              <div className="glass-card rounded-2xl p-5 border border-gold-500/20">
                <h3 className="font-display text-lg text-white mb-4">New Journal Entry</h3>
                <form onSubmit={submitJournal} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400">Date *</label>
                      <DateInput className="input-premium mt-1 w-full" value={journalForm.entry_date}
                        onChange={e => setJournalForm(f => ({...f, entry_date: e.target.value}))} required />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Narration</label>
                      <input className="input-premium mt-1 w-full text-sm" value={journalForm.narration}
                        onChange={e => setJournalForm(f => ({...f, narration: e.target.value}))}
                        placeholder="Description of transaction..." />
                    </div>
                  </div>

                  {/* Journal Lines */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 px-1">
                      <div className="col-span-4">Account</div>
                      <div className="col-span-3">Debit (Dr)</div>
                      <div className="col-span-3">Credit (Cr)</div>
                      <div className="col-span-2">Narration</div>
                    </div>
                    {journalForm.lines.map((line, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <select className="input-premium w-full text-sm" value={line.account_id}
                            onChange={e => updateLine(i, 'account_id', e.target.value)} required>
                            <option value="">Select account...</option>
                            {['asset', 'liability', 'equity', 'income', 'expense'].map(type => (
                              <optgroup key={type} label={type.toUpperCase()}>
                                {accounts.filter(a => a.account_type === type).map(a => (
                                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-3">
                          <input type="number" min="0" step="0.01" className="input-premium w-full text-sm"
                            value={line.debit || ''} onChange={e => updateLine(i, 'debit', e.target.value)}
                            placeholder="0.00" />
                        </div>
                        <div className="col-span-3">
                          <input type="number" min="0" step="0.01" className="input-premium w-full text-sm"
                            value={line.credit || ''} onChange={e => updateLine(i, 'credit', e.target.value)}
                            placeholder="0.00" />
                        </div>
                        <div className="col-span-1">
                          <input className="input-premium w-full text-xs" value={line.narration || ''}
                            onChange={e => updateLine(i, 'narration', e.target.value)} placeholder="..." />
                        </div>
                        <div className="col-span-1">
                          {journalForm.lines.length > 2 && (
                            <button type="button" onClick={() => removeJournalLine(i)}
                              className="text-rose-400/50 hover:text-rose-400">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex gap-6 text-sm">
                      <span>Total Dr: <span className="text-blue-400 font-bold">{fmt(totalDebit)}</span></span>
                      <span>Total Cr: <span className="text-rose-400 font-bold">{fmt(totalCredit)}</span></span>
                      <span>Difference: <span className={`font-bold ${isBalanced ? 'text-emerald-400' : 'text-amber-400'}`}>{fmt(Math.abs(totalDebit - totalCredit))}</span></span>
                    </div>
                    {isBalanced
                      ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={13} /> Balanced</span>
                      : <span className="flex items-center gap-1 text-xs text-amber-400"><AlertCircle size={13} /> Not balanced</span>
                    }
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => addJournalLine()} className="btn-premium btn-secondary text-xs">
                      + Add Line
                    </button>
                    <div className="ml-auto flex gap-2">
                      <button type="button" onClick={() => setShowJournalForm(false)} className="btn-premium btn-secondary">Cancel</button>
                      <button type="submit" disabled={!isBalanced} className="btn-premium btn-primary disabled:opacity-40">Post Entry</button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Journal List */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-white/[0.02] border-b border-white/5 text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left">Entry No</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Narration</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {journal.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-500">No journal entries yet</td></tr>
                  ) : journal.map(entry => (
                    <tr key={entry.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-2 font-mono text-xs text-gold-400">{entry.entry_number}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{fmtDate(entry.entry_date)}</td>
                      <td className="px-4 py-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-400">
                          {entry.entry_type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-300 text-xs max-w-xs truncate">{entry.narration || '-'}</td>
                      <td className="px-4 py-2 text-right text-blue-400 font-mono text-xs">{fmt(entry.total_debit)}</td>
                      <td className="px-4 py-2 text-right text-rose-400 font-mono text-xs">{fmt(entry.total_credit)}</td>
                      <td className="px-4 py-2 text-right">
                        {entry.entry_type === 'manual' && user?.role !== 'ca_admin' && (
                          <button onClick={() => deleteJournal(entry.id)}
                            className="text-rose-400/40 hover:text-rose-400">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TRIAL BALANCE ── */}
        {activeTab === 'Trial Balance' && trialBalance && (
          <div className="space-y-4">
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

        {/* ── P&L ── */}
        {activeTab === 'P&L' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <DateInput className="input-premium text-sm h-9 w-36" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <DateInput className="input-premium text-sm h-9 w-36" value={endDate} onChange={e => setEndDate(e.target.value)} />
              <button onClick={fetchPL} className="btn-premium btn-primary text-sm h-9 flex items-center gap-2">
                <RefreshCw size={13} /> Generate
              </button>
            </div>
            {pl && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Income */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" />
                    <h3 className="font-semibold text-white">Income</h3>
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
                        <td className="px-4 py-3 text-right font-bold text-emerald-400 text-base">{fmt(pl.income?.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Expenses */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                    <TrendingDown size={16} className="text-rose-400" />
                    <h3 className="font-semibold text-white">Expenses</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-600 bg-white/[0.01]">
                      <th className="px-4 py-2 text-left">Cost of Goods Sold</th>
                      <th className="px-4 py-2 text-right">{fmt(pl.cogs?.total)}</th>
                    </tr></thead>
                    <tbody>
                      {pl.cogs?.items?.map((item, i) => (
                        <tr key={i} className="border-b border-white/[0.03]">
                          <td className="px-4 py-1.5 text-gray-400 text-xs pl-6">{item.name}</td>
                          <td className="px-4 py-1.5 text-right text-gray-400 font-mono text-xs">{fmt(item.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-white/[0.02] border-y border-white/5">
                        <td className="px-4 py-2.5 font-semibold text-white">Gross Profit</td>
                        <td className={`px-4 py-2.5 text-right font-bold ${pl.gross_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(pl.gross_profit)}</td>
                      </tr>
                      {pl.operating_expenses?.items?.map((item, i) => (
                        <tr key={i} className="border-b border-white/[0.03]">
                          <td className="px-4 py-1.5 text-gray-300 text-xs">{item.name}</td>
                          <td className="px-4 py-1.5 text-right text-rose-400 font-mono text-xs">{fmt(item.amount)}</td>
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
        )}

        {/* ── BALANCE SHEET ── */}
        {activeTab === 'Balance Sheet' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
              <button onClick={fetchBalanceSheet} className="btn-premium btn-secondary text-sm flex items-center gap-2">
                <RefreshCw size={13} /> Refresh
              </button>
              {user?.role !== 'ca_admin' && (
                <button onClick={closePeriod} className="btn-premium btn-primary text-sm flex items-center gap-2">
                  <Scale size={13} /> Close Period ({startDate.slice(0,7)})
                </button>
              )}
            </div>
              {balanceSheet && (
                <div className="flex items-center gap-2 text-xs">
                  {balanceSheet.is_balanced
                    ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={13} /> Assets = Liabilities + Equity</span>
                    : <span className="flex items-center gap-1 text-amber-400"><AlertCircle size={13} /> Not balanced</span>
                  }
                </div>
              )}
            </div>
            {balanceSheet && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Assets */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5"><h3 className="font-semibold text-blue-400">Assets</h3></div>
                  <div className="divide-y divide-white/[0.03]">
                    {[
                      { label: 'Bank & Cash', items: balanceSheet.assets?.bank_cash },
                      { label: 'Current Assets', items: balanceSheet.assets?.current },
                      { label: 'Fixed Assets', items: balanceSheet.assets?.fixed }
                    ].map(section => section.items?.length > 0 && (
                      <div key={section.label}>
                        <p className="px-4 py-1.5 text-xs text-gray-600 bg-white/[0.01] font-semibold">{section.label}</p>
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
                    <span className="font-bold text-blue-400 text-lg">{fmt(balanceSheet.total_assets)}</span>
                  </div>
                </div>

                {/* Liabilities + Equity */}
                <div className="space-y-4">
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/5"><h3 className="font-semibold text-rose-400">Liabilities</h3></div>
                    <div className="divide-y divide-white/[0.03]">
                      {[
                        { label: 'Current Liabilities', items: balanceSheet.liabilities?.current },
                        { label: 'Long Term Liabilities', items: balanceSheet.liabilities?.long_term }
                      ].map(section => section.items?.length > 0 && (
                        <div key={section.label}>
                          <p className="px-4 py-1.5 text-xs text-gray-600 font-semibold">{section.label}</p>
                          {section.items.map((item, i) => (
                            <div key={i} className="flex justify-between px-4 py-1.5">
                              <span className="text-sm text-gray-300">{item.name}</span>
                              <span className="text-sm text-rose-400 font-mono">{fmt(item.balance)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t border-rose-500/20 bg-rose-500/5 flex justify-between">
                      <span className="font-bold text-white">Total Liabilities</span>
                      <span className="font-bold text-rose-400">{fmt(balanceSheet.total_liabilities)}</span>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/5"><h3 className="font-semibold text-purple-400">Equity</h3></div>
                    {balanceSheet.equity?.map((item, i) => (
                      <div key={i} className="flex justify-between px-4 py-2 border-b border-white/[0.03]">
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
            )}
          </div>
        )}

        {/* ── CASH FLOW ── */}
        {activeTab === 'Cash Flow' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <DateInput className="input-premium text-sm h-9 w-36" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <DateInput className="input-premium text-sm h-9 w-36" value={endDate} onChange={e => setEndDate(e.target.value)} />
              <button onClick={fetchCashFlow} className="btn-premium btn-primary text-sm h-9 flex items-center gap-2">
                <RefreshCw size={13} /> Generate
              </button>
            </div>
            {cashFlow && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Opening Balance', value: cashFlow.opening_balance, color: 'text-gray-300' },
                  { label: 'Total Inflows', value: cashFlow.total_inflows, color: 'text-emerald-400' },
                  { label: 'Total Outflows', value: cashFlow.total_outflows, color: 'text-rose-400' },
                  { label: 'Closing Balance', value: cashFlow.closing_balance, color: cashFlow.closing_balance >= 0 ? 'text-gold-400' : 'text-rose-400' },
                ].map(card => (
                  <div key={card.label} className="glass-card rounded-2xl p-4">
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <p className={`text-xl font-bold mt-1 ${card.color}`}>{fmt(card.value)}</p>
                  </div>
                ))}
                <div className="col-span-2 lg:col-span-4 glass-card rounded-2xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Net Cash Flow</p>
                  <p className={`text-2xl font-bold ${cashFlow.net_cash_flow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fmt(cashFlow.net_cash_flow)}
                    <span className="text-sm font-normal text-gray-500 ml-2">for the period</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
