import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Printer, MessageCircle, ShieldCheck, Truck, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import InvoiceRenderer from './InvoiceRenderer';
import { getLocalInvoice, upsertLocalInvoiceDetail } from '../../lib/offlineInvoices';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

export default function InvoiceViewPage() {
  const { id } = useParams();
  const { api, business: authBusiness } = useAuth();
  const navigate = useNavigate();

  const { allowEinvoice, allowEway } = useMemo(() => {
    if (authBusiness?.modules === undefined || authBusiness?.modules === null) {
      return { allowEinvoice: true, allowEway: true };
    }
    let enabled = [];
    try {
      enabled = JSON.parse(authBusiness.modules || '[]');
    } catch {
      enabled = [];
    }
    return {
      allowEinvoice: enabled.includes('einvoice'),
      allowEway: enabled.includes('eway_bill'),
    };
  }, [authBusiness]);
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gstBusy, setGstBusy] = useState(false);
  const [showEway, setShowEway] = useState(false);
  const [ewayVehicle, setEwayVehicle] = useState('');
  const [ewayDistance, setEwayDistance] = useState('100');
  // Email sending removed

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

  // handleSendEmail removed

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

  const reloadInvoice = async () => {
    try {
      const invRes = await api.get(`/finance/invoices/${id}`);
      setInvoice(invRes.data.invoice);
      setItems(invRes.data.items || []);
      setPayments(invRes.data.payments || []);
    } catch {
      toast.error('Could not refresh invoice');
    }
  };

  const handleGenerateEinvoice = async () => {
    if (!invoice?.id) return;
    setGstBusy(true);
    try {
      await api.post(`/finance/invoices/${invoice.id}/einvoice/generate`);
      toast.success('E-Invoice generated');
      await reloadInvoice();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'E-Invoice failed');
    } finally {
      setGstBusy(false);
    }
  };

  const handleCancelEinvoice = async () => {
    if (!invoice?.id) return;
    if (!window.confirm('Cancel e-invoice registration locally?')) return;
    setGstBusy(true);
    try {
      await api.post(`/finance/invoices/${invoice.id}/einvoice/cancel`, { reason: '1' });
      toast.success('E-Invoice cleared');
      await reloadInvoice();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Cancel failed');
    } finally {
      setGstBusy(false);
    }
  };

  const handleCreateEway = async () => {
    if (!invoice?.id || !ewayVehicle.trim()) {
      toast.error('Vehicle number required');
      return;
    }
    setGstBusy(true);
    try {
      await api.post('/finance/eway-bills', {
        invoice_id: invoice.id,
        vehicle_no: ewayVehicle.trim().toUpperCase(),
        transport_mode: 'road',
        distance_km: Number(ewayDistance) || 100,
      });
      toast.success('E-Way bill created');
      setShowEway(false);
      setEwayVehicle('');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'E-Way bill failed');
    } finally {
      setGstBusy(false);
    }
  };

  const hasIrn = Boolean(invoice?.einvoice_irn || invoice?.einvoice_status === 'generated');

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
          {allowEinvoice && !hasIrn && invoice?.status !== 'cancelled' && (
            <Button
              type="button"
              disabled={gstBusy}
              onClick={handleGenerateEinvoice}
              className="gap-2 text-sm bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30"
            >
              <ShieldCheck size={16} /> E-Invoice (IRN)
            </Button>
          )}
          {allowEinvoice && hasIrn && (
            <Button
              type="button"
              disabled={gstBusy}
              variant="outline"
              size="sm"
              onClick={handleCancelEinvoice}
              className="text-xs border-white/20 text-gray-300"
            >
              Clear e-invoice
            </Button>
          )}
          {allowEway && (
            <Button
              type="button"
              disabled={gstBusy}
              variant="outline"
              size="sm"
              onClick={() => setShowEway(true)}
              className="gap-1 text-amber-200 border-amber-500/30"
            >
              <Truck size={15} /> E-Way Bill
            </Button>
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

      {showEway && (
        <div className="print:hidden fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-void border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2"><Truck size={18} className="text-amber-400" /> Create E-Way Bill</h3>
              <button type="button" onClick={() => setShowEway(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Uses EWAY_MODE (mock by default). Set EWAY_GSP_URL for production GSP.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Vehicle number</label>
                <Input className="input-premium mt-1" value={ewayVehicle} onChange={(e) => setEwayVehicle(e.target.value)} placeholder="e.g. HR26AX1234" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Distance (km)</label>
                <Input type="number" className="input-premium mt-1" value={ewayDistance} onChange={(e) => setEwayDistance(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" className="btn-premium btn-primary flex-1" disabled={gstBusy} onClick={handleCreateEway}>Generate</Button>
                <Button type="button" variant="outline" onClick={() => setShowEway(false)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice */}
      <div className="print-page-wrap" style={{ padding: '24px 16px 64px', display: 'flex', justifyContent: 'center' }}>
        <InvoiceRenderer invoice={invoice} items={items} business={business} payments={payments} />
      </div>
    </div>
  );
}
