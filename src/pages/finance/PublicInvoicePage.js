import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'https://anirudherp-backend-production.up.railway.app';

const PublicInvoicePage = () => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const invoiceId = window.location.pathname.split('/invoice/')[1];

  useEffect(() => {
    if (!invoiceId) { setError('Invalid invoice link.'); setLoading(false); return; }
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/finance/invoices/${invoiceId}/public`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setInvoice(data);
    } catch {
      setError('This invoice could not be found or the link has expired.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (val) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusStyle = (status) => {
    const map = {
      paid:           { bg: '#dcfce7', color: '#166534', border: '#86efac' },
      overdue:        { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
      sent:           { bg: '#dbeafe', color: '#1e3a8a', border: '#93c5fd' },
      partially_paid: { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
      draft:          { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
    };
    return map[status] || map.draft;
  };

  if (loading) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@300;400;500;600&display=swap');
        body { margin: 0; background: #111827; font-family: 'Inter', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#111827', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #374151', borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#6b7280', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>Loading invoice...</p>
      </div>
    </>
  );

  if (error) return (
    <>
      <style>{`body { margin: 0; background: #111827; font-family: 'Inter', sans-serif; }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#111827', padding: 24 }}>
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 16, padding: '48px 40px', textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#f9fafb', fontFamily: 'Playfair Display, serif', fontSize: 24, margin: '0 0 8px' }}>Invoice Not Found</h2>
          <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{error}</p>
        </div>
      </div>
    </>
  );

  const subtotal = (invoice.items || []).reduce((s, i) => s + Number(i.total || i.amount || (i.quantity * i.unit_price) || 0), 0);
  const tax = Number(invoice.tax_amount || 0);
  const discount = Number(invoice.discount_amount || 0);
  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.amount_paid || invoice.paid_amount || 0);
  const balance = Number(invoice.balance_due || Math.max(0, total - paid) || 0);
  const statusStyle = getStatusStyle(invoice.status);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f172a; font-family: 'Inter', sans-serif; }

        .action-bar { position: sticky; top: 0; z-index: 100; background: rgba(15,23,42,0.97); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(212,175,55,0.15); padding: 14px 32px; display: flex; align-items: center; justify-content: space-between; }
        .brand { display: flex; align-items: center; gap: 8px; font-family: 'Playfair Display', serif; font-size: 18px; color: #D4AF37; letter-spacing: 0.03em; }
        .brand-dot { width: 8px; height: 8px; border-radius: 50%; background: #D4AF37; display: inline-block; }
        .btn-print { display: flex; align-items: center; gap: 8px; background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
        .btn-print:hover { background: #273549; border-color: #475569; }

        .page { min-height: 100vh; background: #0f172a; padding: 40px 16px 80px; }
        .card { max-width: 820px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 32px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.1); }

        .inv-header { background: linear-gradient(160deg, #0a0f1e 0%, #0d1b3e 40%, #0a1628 100%); padding: 44px 52px 36px; position: relative; overflow: hidden; }
        .inv-header::before { content: ''; position: absolute; top: -60px; right: -60px; width: 240px; height: 240px; background: radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%); border-radius: 50%; pointer-events: none; }
        .inv-header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent); }

        .header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap; }
        .biz-name { font-family: 'Playfair Display', serif; font-size: 30px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 8px; }
        .biz-meta { color: #64748b; font-size: 12.5px; line-height: 1.7; }
        .biz-meta span { display: block; }
        .biz-gst { color: #94a3b8; font-size: 11.5px; margin-top: 6px; letter-spacing: 0.03em; }

        .inv-badge-block { text-align: right; flex-shrink: 0; }
        .inv-label { color: #D4AF37; font-size: 10px; letter-spacing: 0.25em; font-weight: 600; text-transform: uppercase; margin-bottom: 6px; }
        .inv-number { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; }

        .header-divider { height: 1px; background: linear-gradient(90deg, rgba(212,175,55,0.3), rgba(212,175,55,0.05)); margin: 28px 0; }

        .header-meta { display: flex; flex-wrap: wrap; gap: 36px; }
        .meta-item { display: flex; flex-direction: column; gap: 5px; }
        .meta-label { color: #475569; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 600; }
        .meta-value { color: #cbd5e1; font-size: 14px; font-weight: 500; }

        .table-wrap { padding: 0; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #f8fafc; }
        th { padding: 13px 20px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; border-bottom: 2px solid #e2e8f0; }
        tbody tr:nth-child(even) { background: #fafafa; }
        tbody tr:nth-child(odd) { background: #ffffff; }
        td { padding: 15px 20px; font-size: 14px; color: #374151; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }

        .totals-wrap { padding: 28px 52px; background: #f8fafc; border-top: 2px solid #e2e8f0; }
        .totals-inner { max-width: 300px; margin-left: auto; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13.5px; }
        .total-row .lbl { color: #6b7280; }
        .total-row .val { color: #374151; }
        .total-divider { height: 1px; background: #d1d5db; margin: 10px 0; }
        .grand-row { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #0a0f1e, #0d1b3e); border-radius: 10px; padding: 14px 18px; margin: 8px 0 4px; }
        .grand-lbl { color: #D4AF37; font-size: 13px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
        .grand-val { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #ffffff; }

        .bank-wrap { padding: 24px 52px; border-top: 1px solid #e2e8f0; }
        .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #9ca3af; margin-bottom: 14px; }
        .bank-grid { display: flex; gap: 40px; flex-wrap: wrap; }
        .bank-item { display: flex; flex-direction: column; gap: 3px; }
        .bank-label { font-size: 10px; color: #9ca3af; }
        .bank-value { font-size: 14px; font-weight: 600; color: #1f2937; }

        .notes-wrap { padding: 24px 52px; border-top: 1px solid #e2e8f0; }
        .notes-text { font-size: 13.5px; color: #6b7280; line-height: 1.7; }

        .inv-footer { background: linear-gradient(160deg, #0a0f1e 0%, #0d1b3e 100%); padding: 28px 52px; text-align: center; }
        .footer-msg { color: #94a3b8; font-size: 14px; margin-bottom: 6px; }
        .footer-pan { color: #64748b; font-size: 12px; margin-bottom: 8px; }
        .footer-powered { color: #D4AF37; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; }

        @media print {
          .action-bar { display: none !important; }
          body { background: white; }
          .page { padding: 0; background: white; }
          .card { box-shadow: none; border-radius: 0; max-width: 100%; }
          .inv-header, .grand-row, .inv-footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }

        @media (max-width: 600px) {
          .inv-header { padding: 28px 20px 24px; }
          .header-top { flex-direction: column; }
          .inv-badge-block { text-align: left; }
          .totals-wrap { padding: 20px; }
          .bank-wrap, .notes-wrap { padding: 20px; }
          .inv-footer { padding: 24px 20px; }
          th, td { padding: 10px 12px; }
          .action-bar { padding: 12px 16px; }
        }
      `}</style>

      {/* Action Bar — Print only, no WhatsApp */}
      <div className="action-bar">
        <div className="brand">
          <span className="brand-dot"></span>
          NexusERP
        </div>
        <button className="btn-print" onClick={() => window.print()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Print / Save PDF
        </button>
      </div>

      <div className="page">
        <div className="card">

          {/* Header */}
          <div className="inv-header">
            <div className="header-top">
              <div>
                {invoice.business?.invoice_logo_url && (
                  <img src={invoice.business.invoice_logo_url} alt="logo"
                    style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, background: 'white', padding: 4, marginBottom: 12 }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                )}
                <div className="biz-name">{invoice.business?.name || 'Business'}</div>
                <div className="biz-meta">
                  {invoice.business?.address && <span>{invoice.business.address}</span>}
                  {invoice.business?.phone && <span>{invoice.business.phone}</span>}
                </div>
                {(invoice.business?.invoice_gst || invoice.business?.invoice_pan) && (
                  <div className="biz-gst">
                    {invoice.business.invoice_gst && `GSTIN: ${invoice.business.invoice_gst}`}
                    {invoice.business.invoice_gst && invoice.business.invoice_pan && '  ·  '}
                    {invoice.business.invoice_pan && `PAN: ${invoice.business.invoice_pan}`}
                  </div>
                )}
              </div>

              <div className="inv-badge-block">
                <div className="inv-label">Invoice</div>
                <div className="inv-number">{invoice.invoice_number}</div>
                <div style={{
                  display: 'inline-block', marginTop: 10, padding: '4px 14px',
                  borderRadius: 20, fontSize: 10.5, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: statusStyle.bg, color: statusStyle.color,
                  border: `1px solid ${statusStyle.border}`
                }}>
                  {invoice.status?.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </div>

            <div className="header-divider"></div>

            <div className="header-meta">
              <div className="meta-item">
                <span className="meta-label">Issue Date</span>
                <span className="meta-value">{formatDate(invoice.issue_date)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Due Date</span>
                <span className="meta-value">{formatDate(invoice.due_date)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Bill To</span>
                <span className="meta-value">{invoice.client_name || '—'}</span>
              </div>
              {invoice.client_phone && (
                <div className="meta-item">
                  <span className="meta-label">Phone</span>
                  <span className="meta-value">{invoice.client_phone}</span>
                </div>
              )}
              {invoice.client_email && (
                <div className="meta-item">
                  <span className="meta-label">Email</span>
                  <span className="meta-value">{invoice.client_email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                  <th style={{ width: '45%', textAlign: 'left' }}>Description</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Qty</th>
                  <th style={{ width: '17%', textAlign: 'right' }}>Unit Price</th>
                  <th style={{ width: '18%', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, idx) => {
                  // Handle all possible field names the backend might return
                  const lineTotal = Number(item.total || item.amount || (Number(item.quantity) * Number(item.unit_price)) || 0);
                  return (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600, color: '#111827' }}>{item.description}</td>
                      <td style={{ textAlign: 'center', color: '#6b7280' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', color: '#6b7280' }}>{formatCurrency(item.unit_price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#111827' }}>{formatCurrency(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="totals-wrap">
            <div className="totals-inner">
              <div className="total-row">
                <span className="lbl">Subtotal</span>
                <span className="val">{formatCurrency(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="total-row">
                  <span className="lbl">Tax ({invoice.tax_rate}%)</span>
                  <span className="val">{formatCurrency(tax)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="total-row">
                  <span className="lbl">Discount</span>
                  <span className="val" style={{ color: '#10b981' }}>− {formatCurrency(discount)}</span>
                </div>
              )}
              <div className="total-divider"></div>
              <div className="grand-row">
                <span className="grand-lbl">Total Amount</span>
                <span className="grand-val">{formatCurrency(total)}</span>
              </div>
              {paid > 0 && (
                <>
                  <div className="total-row" style={{ marginTop: 6 }}>
                    <span className="lbl" style={{ color: '#10b981' }}>Amount Paid</span>
                    <span className="val" style={{ color: '#10b981' }}>{formatCurrency(paid)}</span>
                  </div>
                  <div className="total-divider"></div>
                  <div className="total-row">
                    <span className="lbl" style={{ fontWeight: 600, color: '#374151' }}>Balance Due</span>
                    <span className="val" style={{ fontWeight: 700, color: '#dc2626', fontSize: 15 }}>{formatCurrency(balance)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bank Details */}
          {(invoice.business?.invoice_bank_name || invoice.business?.invoice_bank_account) && (
            <div className="bank-wrap">
              <div className="section-title">Bank Details</div>
              <div className="bank-grid">
                {invoice.business.invoice_bank_name && (
                  <div className="bank-item">
                    <span className="bank-label">Bank</span>
                    <span className="bank-value">{invoice.business.invoice_bank_name}</span>
                  </div>
                )}
                {invoice.business.invoice_bank_account && (
                  <div className="bank-item">
                    <span className="bank-label">Account No.</span>
                    <span className="bank-value">{invoice.business.invoice_bank_account}</span>
                  </div>
                )}
                {invoice.business.invoice_bank_ifsc && (
                  <div className="bank-item">
                    <span className="bank-label">IFSC</span>
                    <span className="bank-value">{invoice.business.invoice_bank_ifsc}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="notes-wrap">
              <div className="section-title">Notes</div>
              <p className="notes-text">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="inv-footer">
            <p className="footer-msg">{invoice.business?.invoice_footer_note || 'Thank you for your business!'}</p>
            {invoice.business?.invoice_pan && (
              <p className="footer-pan">PAN: {invoice.business.invoice_pan}</p>
            )}
            <p className="footer-powered">Powered by NexusERP</p>
          </div>

        </div>
      </div>
    </>
  );
};

export default PublicInvoicePage;
