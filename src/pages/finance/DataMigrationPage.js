import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Upload, Download, FileArchive, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function DataMigrationPage() {
  const { api } = useAuth();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const downloadTemplates = async () => {
    setDownloading(true);
    setErr(null);
    try {
      const res = await api.get('/migration/templates.zip', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nexaerp_migration_templates.zip';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.response?.data?.detail || e.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErr('Please choose a .zip file (add your CSVs using the templates).');
      return;
    }
    setUploading(true);
    setErr(null);
    setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/migration/import-zip', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (e) {
      const d = e.response?.data;
      setErr(typeof d?.detail === 'string' ? d.detail : d?.message || e.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl" data-testid="data-migration">
        <div>
          <h1 className="font-display text-2xl text-white">Data migration</h1>
          <p className="text-sm text-gray-500 font-sans mt-1">
            Move from Tally, Busy, spreadsheets, or other ERPs in one step: fill the CSV templates, zip them, and upload.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/15 flex items-center justify-center shrink-0">
              <FileArchive className="text-gold-400" size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg text-white">How it works</h2>
              <ol className="text-sm text-gray-400 mt-2 space-y-1.5 list-decimal list-inside font-sans">
                <li>Download the template ZIP (sample CSVs + README).</li>
                <li>Export or copy your data into those files (UTF-8 CSV). Include only the sheets you need.</li>
                <li>Zip the CSVs again (same names: customers.csv, suppliers.csv, etc.).</li>
                <li>Upload the ZIP — we import in order: suppliers → products → customers → opening balances → expenses → invoices.</li>
              </ol>
              <p className="text-xs text-gray-600 mt-3 font-sans">
                Tally does not offer one public “full dump” format; use Tally&apos;s Excel/CSV exports or third-party tools, then map columns to our templates.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={downloadTemplates}
              disabled={downloading}
              className="btn-premium btn-secondary inline-flex items-center gap-2"
            >
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Download template ZIP
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="btn-premium btn-primary inline-flex items-center gap-2"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Upload migration ZIP
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={onFile}
            />
          </div>
        </div>

        {err && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 flex items-start gap-2 text-sm text-rose-200 font-sans">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        {result && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={20} />
              <span className="font-display text-lg text-white">Import finished</span>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm font-sans">
              {[
                ['Suppliers', result.suppliers],
                ['Products', result.products],
                ['Customers', result.customers],
                ['Opening balances (invoices)', result.opening_balances],
                ['Expenses', result.expenses],
                ['Invoices', result.invoices],
              ].map(([label, block]) => {
                let summary = '—';
                if (block?.imported != null) summary = `${block.imported} imported`;
                else if (block) {
                  const c = block.created ?? 0;
                  const u = block.updated ?? 0;
                  if (c || u) summary = `${c} created, ${u} updated`;
                }
                return (
                  <div key={label} className="rounded-lg bg-white/[0.03] p-3">
                    <dt className="text-gray-500 text-xs">{label}</dt>
                    <dd className="text-white mt-1">{summary}</dd>
                  </div>
                );
              })}
            </dl>
            {result.errors?.length > 0 && (
              <div>
                <p className="text-xs text-amber-400 font-sans mb-2">Warnings / skipped rows</p>
                <ul className="text-xs text-gray-400 space-y-1 max-h-40 overflow-y-auto font-mono">
                  {result.errors.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
