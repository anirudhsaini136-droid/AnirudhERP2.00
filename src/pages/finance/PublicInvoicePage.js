import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'https://anirudherp-backend-production.up.railway.app';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

export default function PublicInvoicePage() {
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const invoiceId = window.location.pathname.split('/invoice/')[1];

  useEffect(() => {
    if (!invoiceId) { setError('Invalid invoice link.'); setLoading(false); return; }
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/finance/invoices/${invoiceId}/public`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setInvoice(data);
        setItems(data.items || []);
        setBusiness(data.business || null);
      } catch {
        setError('This invoice could not be found or the link has expired.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoiceId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } body { margin: 0; }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`body { margin: 0; }`}</style>
      <div style={{ background: '#111', border: '1px solid #333', borderRadius: 16, padding: '48px 40px', textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#f9fafb', fontFamily: 'serif', fontSize: 24, margin: '0 0 8px' }}>Invoice Not Found</h2>
        <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{error}</p>
      </div>
    </div>
  );

  const statusColor = {
    draft: '#6b7280', sent: '#3b82f6', paid: '#10b981',
    overdue: '#ef4444', partially_paid: '#f59e0b'
  }[invoice.status] || '#6b7280';

  const getLineTotal = (item) =>
    Number(item.total || item.amount || ((item.quantity || 0) * (item.unit_price || 0)) || 0);

  const computedSubtotal = items.reduce((s, i) => s + getLineTotal(i), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .pub-toolbar {
          position: sticky; top: 0; z-index: 50;
          background: rgba(10,10,15,0.95); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 12px 24px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .pub-print-btn {
          display: flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #D4AF37, #F5E17A);
          color: #000; border: none; border-radius: 8px;
          padding: 9px 20px; font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: 'Segoe UI', Arial, sans-serif;
        }

        /* ── CRITICAL PRINT STYLES ── */
        @media print {
          .pub-toolbar { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-page-wrap { padding: 0 !important; background: white !important; }
          #pub-invoice { box-shadow: none !important; max-width: 100% !important; border-radius: 0 !important; }

          /* Force dark header to print */
          .inv-dark-header {
            background: #1a1a2e !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .inv-meta-band {
            background: #f8f9fa !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .inv-totals-band {
            background: #f8f9fa !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .inv-grand-total-row {
            background: #1a1a2e !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .inv-footer-band {
            background: #1a1a2e !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Keep text colors */
          .gold-text { color: #D4AF37 !important; }
          .white-text { color: #ffffff !important; }
          .light-text { color: #9ca3af !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="pub-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D4AF37', fontWeight: 600, fontSize: 15 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4AF37' }} />
          NexusERP
        </div>
        <button className="pub-print-btn" onClick={() => window.print()}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print / PDF
        </button>
      </div>

      {/* Invoice */}
      <div className="print-page-wrap" style={{ padding: '24px 16px 64px', display: 'flex', justifyContent: 'center' }}>
        <div id="pub-invoice" style={{ width: '100%', maxWidth: 760, background: '#ffffff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.6)', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#111827' }}>

          {/* ── DARK HEADER ── */}
          <div className="inv-dark-header" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', padding: '40px 48px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  {business?.invoice_logo_url ? (
                    <img src={business.invoice_logo_url} alt="logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 10, background: 'white', padding: 4 }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #D4AF37, #F5E17A)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <span style={{ color: '#000', fontWeight: 'bold', fontSize: 18 }}>{(business?.name || 'N')[0]}</span>
                    </div>
                  )}
                  <div>
                    <div className="gold-text" style={{ color: '#D4AF37', fontSize: 22, fontWeight: 'bold', letterSpacing: '-0.5px' }}>
                      {business?.name || 'Your Business'}
                    </div>
                    {business?.invoice_gst && (
                      <div className="light-text" style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>GST: {business.invoice_gst}</div>
                    )}
                  </div>
                </div>
                <div className="light-text" style={{ color: '#9ca3af', fontSize: 12, lineHeight: 1.6 }}>
                  {business?.address && <div>{business.address}</div>}
                  {business?.phone && <div>{business.phone}</div>}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="gold-text" style={{ color: '#D4AF37', fontSize: 32, fontWeight: 'bold', letterSpacing: '-1px' }}>INVOICE</div>
                <div className="white-text" style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginTop: 4 }}>{invoice.invoice_number}</div>
                <div style={{ marginTop: 12, display: 'inline-block', padding: '4px 12px', borderRadius: 20, border: `1px solid ${statusColor}`, backgroundColor: `${statusColor}20`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <span style={{ color: statusColor, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {invoice.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── META BAND ── */}
          <div className="inv-meta-band" style={{ background: '#f8f9fa', padding: '24px 48px', borderBottom: '1px solid #e5e7eb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 8 }}>Bill To</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{invoice.client_name}</div>
                {invoice.client_email && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{invoice.client_email}</div>}
                {invoice.client_phone && <div style={{ fontSize: 13, color: '#6b7280' }}>{invoice.client_phone}</div>}
                {invoice.client_address && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{invoice.client_address}</div>}
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
                      <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                      <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{value}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── ITEMS TABLE ── */}
          <div style={{ padding: '0 48px', marginTop: 32 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #111827' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', width: '50%' }}>Description</th>
                  <th style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151' }}>Unit Price</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 0', fontSize: 14, color: '#111827', fontWeight: 500 }}>{item.description}</td>
                    <td style={{ padding: '14px 0', fontSize: 14, color: '#6b7280', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '14px 0', fontSize: 14, color: '#6b7280', textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                    <td style={{ padding: '14px 0', fontSize: 14, color: '#111827', fontWeight: 600, textAlign: 'right' }}>{fmt(getLineTotal(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── TOTALS ── */}
          <div className="inv-totals-band" style={{ padding: '24px 48px', display: 'flex', justifyContent: 'flex-end', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <div style={{ width: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#6b7280' }}>
                <span>Subtotal</span><span>{fmt(invoice.subtotal || computedSubtotal)}</span>
              </div>
              {Number(invoice.tax_rate) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#6b7280' }}>
                  <span>GST ({invoice.tax_rate}%)</span><span>{fmt(invoice.tax_amount)}</span>
                </div>
              )}
              {Number(invoice.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#ef4444' }}>
                  <span>Discount</span><span>-{fmt(invoice.discount_amount)}</span>
                </div>
              )}
              {/* Grand total row — dark bg */}
              <div className="inv-grand-total-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #111827', marginTop: 6, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Total</span>
                <span className="gold-text" style={{ fontSize: 20, fontWeight: 800, color: '#D4AF37' }}>{fmt(invoice.total_amount)}</span>
              </div>
              {Number(invoice.amount_paid) > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#10b981' }}>
                    <span>Amount Paid</span><span>-{fmt(invoice.amount_paid)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #e5e7eb', marginTop: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Balance Due</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>{fmt(invoice.balance_due)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── BANK DETAILS ── */}
          {(business?.invoice_bank_name || business?.invoice_bank_account) && (
            <div style={{ padding: '24px 48px', background: '#f8f9fa', borderTop: '1px solid #e5e7eb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 10 }}>Bank Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {business.invoice_bank_name && (
                  <div><div style={{ fontSize: 10, color: '#9ca3af' }}>Bank</div><div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{business.invoice_bank_name}</div></div>
                )}
                {business.invoice_bank_account && (
                  <div><div style={{ fontSize: 10, color: '#9ca3af' }}>Account No.</div><div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{business.invoice_bank_account}</div></div>
                )}
                {business.invoice_bank_ifsc && (
                  <div><div style={{ fontSize: 10, color: '#9ca3af' }}>IFSC</div><div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{business.invoice_bank_ifsc}</div></div>
                )}
              </div>
            </div>
          )}

          {/* ── NOTES & FOOTER ── */}
          <div style={{ padding: '24px 48px 40px', borderTop: '1px solid #e5e7eb' }}>
            {invoice.notes && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 6 }}>Notes</div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{invoice.notes}</div>
              </div>
            )}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                {business?.invoice_footer_note || 'Thank you for your business!'}
              </p>
              {business?.invoice_pan && (
                <p style={{ fontSize: 11, color: '#d1d5db', marginTop: 4 }}>PAN: {business.invoice_pan}</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
