import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Printer, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import InvoiceRenderer from './InvoiceRenderer';
import { getLocalInvoice, upsertLocalInvoiceDetail } from '../../lib/offlineInvoices';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

export default function InvoiceViewPage() {
  const { id } = useParams();
  const { api, business: authBusiness } = useAuth();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      const offlineNow = typeof navigator !== 'undefined' ? !navigator.onLine : true;

      // Offline fast path: never block on API requests.
      if (offlineNow) {
        try {
          if (authBusiness?.id) {
            const localInv = getLocalInvoice(authBusiness.id, id);
            if (localInv) {
              setInvoice(localInv);
              setItems(localInv.items || []);
              try {
                const raw = localStorage.getItem(`offline_business_cache_${authBusiness.id}`);
                const cachedBiz = raw ? JSON.parse(raw) : authBusiness;
                setBusiness(cachedBiz);
              } catch {
                setBusiness(authBusiness);
              }
              setLoading(false);
              return;
            }
          }
        } catch {}

        toast.error('Offline: invoice not cached on this device');
        navigate('/finance/invoices');
        setLoading(false);
        return;
      }

      try {
        const [invRes, settingsRes] = await Promise.all([
          api.get(`/finance/invoices/${id}`, { timeout: 8000 }),
          api.get('/dashboard/settings', { timeout: 8000 })
        ]);
        setInvoice(invRes.data.invoice);
        setItems(invRes.data.items || []);
        setBusiness(settingsRes.data.business);
        // Cache business settings for offline invoice rendering.
        try {
          if (authBusiness?.id && settingsRes?.data?.business) {
            localStorage.setItem(
              `offline_business_cache_${authBusiness.id}`,
              JSON.stringify(settingsRes.data.business)
            );
          }
        } catch {}

        // Cache invoice detail for offline viewing later.
        try {
          if (authBusiness?.id) {
            upsertLocalInvoiceDetail(authBusiness.id, {
              invoice: invRes.data.invoice,
              items: invRes.data.items || [],
              payments: invRes.data.payments || [],
            });
          }
        } catch {}
      } catch {
        // Offline/local fallback for unsynced invoices.
        try {
          if (authBusiness?.id) {
            const localInv = getLocalInvoice(authBusiness.id, id);
            if (localInv) {
              setInvoice(localInv);
              setItems(localInv.items || []);
              // Prefer cached business settings if available.
              const cached = (() => {
                try {
                  const raw = localStorage.getItem(`offline_business_cache_${authBusiness.id}`);
                  return raw ? JSON.parse(raw) : null;
                } catch {
                  return null;
                }
              })();
              setBusiness(cached || authBusiness);
              setLoading(false);
              return;
            }
          }
        } catch {}

        toast.error('Failed to load invoice');
        navigate('/finance/invoices');
      }
      setLoading(false);
    };
    load();
  }, [id, api, navigate, authBusiness]);

  const handlePrint = () => window.print();

  const handleSendEmail = async () => {
    setSending(true);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('Offline: cannot send email now');
      setSending(false);
      return;
    }
    if (invoice?.sync_status === 'local_pending') {
      toast.error('Invoice not synced yet (offline).');
      setSending(false);
      return;
    }
    try {
      await api.post(`/finance/invoices/${id}/send`);
      toast.success('Invoice sent via email');
      const res = await api.get(`/finance/invoices/${id}`);
      setInvoice(res.data.invoice);
    } catch {
      toast.error('Failed to send invoice');
    }
    setSending(false);
  };

  const handleSendWhatsApp = () => {
    if (!invoice) return;
    const phone = invoice.client_phone?.replace(/[^0-9]/g, '') || '';
    const invoiceUrl = `${window.location.origin}/invoice/${id}`;
    const message = [
      `Hello ${invoice.client_name}!`,
      '',
      `Thank you for your recent purchase from *${business?.name || 'Us'}*.`,
      '',
      `Invoice No: ${invoice.invoice_number}`,
      `Amount: ${fmt(invoice.total_amount)}`,
      `Due Date: ${fmtDate(invoice.due_date)}`,
      '',
      `View your invoice here:`,
      invoiceUrl,
      '',
      `We appreciate your business!`
    ].join('\n');
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    toast.success('WhatsApp opened!');
  };

  if (loading) return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!invoice) return null;

  return (
    <div className="min-h-screen bg-obsidian">
      <style>{`
        @media print {
          .print\\:hidden, .pub-toolbar { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-page-wrap { padding: 0 !important; background: white !important; }
          #invoice-print { box-shadow: none !important; max-width: 100% !important; border-radius: 0 !important; }
          .inv-dark-header { background-color: #1a1a2e !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .inv-meta-band, .inv-bank-band { background-color: #f8f9fa !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .inv-grand-row { background-color: #1a1a2e !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .inv-grand-row .total-label { color: #ffffff !important; }
          .inv-grand-row .total-value { color: #D4AF37 !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-50 bg-void/90 backdrop-blur-sm border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/finance/invoices')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm">Back to Invoices</span>
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === 'draft' && (
            <button
              onClick={handleSendEmail}
              disabled={sending || invoice?.sync_status === 'local_pending' || (typeof navigator !== 'undefined' && !navigator.onLine)}
              className="btn-premium btn-secondary text-sm flex items-center gap-2 disabled:opacity-40"
            >
              <Send size={15} /> {sending ? 'Sending...' : 'Send Email'}
            </button>
          )}
          <button onClick={handleSendWhatsApp}
            className="btn-premium text-sm flex items-center gap-2 px-4 py-2 rounded-xl border transition-all"
            style={{ background: 'rgba(37,211,102,0.1)', borderColor: 'rgba(37,211,102,0.3)', color: '#25d366' }}>
            <MessageCircle size={15} /> Send on WhatsApp
          </button>
          <button onClick={handlePrint} className="btn-premium btn-primary text-sm flex items-center gap-2">
            <Printer size={15} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Invoice */}
      <div className="print-page-wrap" style={{ padding: '24px 16px 64px', display: 'flex', justifyContent: 'center' }}>
        <InvoiceRenderer invoice={invoice} items={items} business={business} />
      </div>
    </div>
  );
}
