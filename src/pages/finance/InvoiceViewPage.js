import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Printer, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

export default function InvoiceViewPage() {
  const { id } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [invRes, settingsRes] = await Promise.all([
          api.get(`/finance/invoices/${id}`),
          api.get('/dashboard/settings')
        ]);
        setInvoice(invRes.data.invoice);
        setItems(invRes.data.items || []);
        setBusiness(settingsRes.data.business);
      } catch (e) {
        toast.error('Failed to load invoice');
        navigate('/finance/invoices');
      }
      setLoading(false);
    };
    load();
  }, [id, api, navigate]);

  const handlePrint = () => window.print();

  const handleSendEmail = async () => {
    setSending(true);
    try {
      await api.post(`/finance/invoices/${id}/send`);
      toast.success('Invoice sent via email');
      const res = await api.get(`/finance/invoices/${id}`);
      setInvoice(res.data.invoice);
    } catch (e) {
      toast.error('Failed to send invoice');
    }
    setSending(false);
  };

  const handleSendWhatsApp = () => {
    if (!invoice) return;

    const phone = invoice.client_phone?.replace(/[^0-9]/g, '') || '';
    const invoiceUrl = `${window.location.origin}/finance/invoices/${id}`;
    const businessName = business?.name || 'Us';
    const amount = fmt(invoice.total_amount);
    const invoiceNum = invoice.invoice_number;
    const dueDate = fmtDate(invoice.due_date);

    const message = `Hello ${invoice.client_name}! 👋

Thank you for your recent purchase. 🙏

Here are your invoice details:

🧾 *Invoice:* ${invoiceNum}
💰 *Amount:* ${amount}
📅 *Due Date:* ${dueDate}
🏪 *From:* ${businessName}

📲 *View your invoice here:*
${invoiceUrl}

For any queries, feel free to reach out. We appreciate your business! ✨`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(waUrl, '_blank');
    toast.success('WhatsApp opened with invoice details!');
  };

  if (loading) return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!invoice) return null;

  const statusColor = {
    draft: '#6b7280', sent: '#3b82f6', paid: '#10b981',
    overdue: '#ef4444', partially_paid: '#f59e0b'
  }[invoice.status] || '#6b7280';

  return (
    <div className="min-h-screen bg-obsidian">
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-50 bg-void/90 backdrop-blur-sm border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/finance/invoices')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm">Back to Invoices</span>
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === 'draft' && (
            <button onClick={handleSendEmail} disabled={sending} className="btn-premium btn-secondary text-sm flex items-center gap-2">
              <Send size={15} />
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          )}
          <button
            onClick={handleSendWhatsApp}
            className="btn-premium text-sm flex items-center gap-2 px-4 py-2 rounded-xl border transition-all"
            style={{ background: 'rgba(37,211,102,0.1)', borderColor: 'rgba(37,211,102,0.3)', color: '#25d366' }}
          >
            <MessageCircle size={15} />
            Send on WhatsApp
          </button>
          <button onClick={handlePrint} className="btn-premium btn-primary text-sm flex items-center gap-2">
            <Printer size={15} />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="p-6 print:p-0 flex justify-center">
        <div
          ref={printRef}
          id="invoice-print"
          className="w-full max-w-3xl bg-white text-gray-900 rounded-2xl print:rounded-none shadow-2xl overflow-hidden"
          style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', padding: '40px 48px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #D4AF37, #F5E17A)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#000', fontWeight: 'bold', fontSize: '18px' }}>
                      {business?.name?.[0] || 'N'}
                    </span>
                  </div>
                  <div>
                    <div style={{ color: '#D4AF37', fontSize: '22px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
                      {business?.name || 'Your Business'}
                    </div>
                    {business?.invoice_gst && (
                      <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px' }}>GST: {business.invoice_gst}</div>
                    )}
                  </div>
                </div>
                <div style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.6' }}>
                  {business?.address && <div>{business.address}</div>}
                  {(business?.city || business?.country) && <div>{[business.city, business.country].filter(Boolean).join(', ')}</div>}
                  {business?.phone && <div>{business.phone}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#D4AF37', fontSize: '32px', fontWeight: 'bold', letterSpacing: '-1px' }}>INVOICE</div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>{invoice.invoice_number}</div>
                <div style={{ marginTop: '12px', display: 'inline-block', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${statusColor}`, backgroundColor: `${statusColor}20` }}>
                  <span style={{ color: statusColor, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {invoice.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Meta */}
          <div style={{ background: '#f8f9fa', padding: '24px 48px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#6b7280', marginBottom: '8px' }}>Bill To</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>{invoice.client_name}</div>
                {invoice.client_email && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{invoice.client_email}</div>}
                {invoice.client_phone && <div style={{ fontSize: '13px', color: '#6b7280' }}>{invoice.client_phone}</div>}
                {invoice.client_address && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{invoice.client_address}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', justifyItems: 'end' }}>
                  {[
                    ['Issue Date', fmtDate(invoice.issue_date)],
                    ['Due Date', fmtDate(invoice.due_date)],
                    ['Currency', invoice.currency || 'INR'],
                    invoice.payment_terms ? ['Payment Terms', invoice.payment_terms] : null
                  ].filter(Boolean).map(([label, value]) => (
                    <React.Fragment key={label}>
                      <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                      <span style={{ fontSize: '13px', color: '#111827', fontWeight: '500' }}>{value}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ padding: '0 48px', marginTop: '32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #111827' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', width: '50%' }}>Description</th>
                  <th style={{ textAlign: 'center', padding: '8px 0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151' }}>Unit Price</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{item.description}</td>
                    <td style={{ padding: '14px 0', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '14px 0', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                    <td style={{ padding: '14px 0', fontSize: '14px', color: '#111827', fontWeight: '600', textAlign: 'right' }}>{fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ padding: '24px 48px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '280px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#6b7280' }}>
                <span>Subtotal</span><span>{fmt(invoice.subtotal)}</span>
              </div>
              {invoice.tax_rate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#6b7280' }}>
                  <span>GST ({invoice.tax_rate}%)</span><span>{fmt(invoice.tax_amount)}</span>
                </div>
              )}
              {invoice.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#ef4444' }}>
                  <span>Discount</span><span>-{fmt(invoice.discount_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #111827', marginTop: '6px' }}>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Total</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#D4AF37' }}>{fmt(invoice.total_amount)}</span>
              </div>
              {invoice.amount_paid > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#10b981' }}>
                    <span>Amount Paid</span><span>-{fmt(invoice.amount_paid)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #e5e7eb', marginTop: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Balance Due</span>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#ef4444' }}>{fmt(invoice.balance_due)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bank Details */}
          {(business?.invoice_bank_name || business?.invoice_bank_account) && (
            <div style={{ padding: '24px 48px', background: '#f8f9fa', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#6b7280', marginBottom: '10px' }}>Bank Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {business.invoice_bank_name && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>Bank</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{business.invoice_bank_name}</div>
                  </div>
                )}
                {business.invoice_bank_account && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>Account No.</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{business.invoice_bank_account}</div>
                  </div>
                )}
                {business.invoice_bank_ifsc && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>IFSC</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{business.invoice_bank_ifsc}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes & Footer */}
          <div style={{ padding: '24px 48px 40px', borderTop: '1px solid #e5e7eb' }}>
            {invoice.notes && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#6b7280', marginBottom: '6px' }}>Notes</div>
                <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>{invoice.notes}</div>
              </div>
            )}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                {business?.invoice_footer_note || 'Thank you for your business!'}
              </p>
              {business?.invoice_pan && (
                <p style={{ fontSize: '11px', color: '#d1d5db', marginTop: '4px' }}>PAN: {business.invoice_pan}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          #invoice-print { box-shadow: none !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
