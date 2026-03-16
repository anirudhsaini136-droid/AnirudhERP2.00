import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'https://anirudherp-backend-production.up.railway.app';

const PublicInvoicePage = () => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract invoice ID from URL path /invoice/:id
  const invoiceId = window.location.pathname.split('/invoice/')[1];

  useEffect(() => {
    if (!invoiceId) {
      setError('Invalid invoice link.');
      setLoading(false);
      return;
    }
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/finance/invoices/${invoiceId}/public`);
      if (!res.ok) throw new Error('Invoice not found');
      const data = await res.json();
      setInvoice(data);
    } catch (err) {
      setError('This invoice could not be found or the link has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    if (!invoice) return;
    const url = window.location.href;
    const msg = encodeURIComponent(
      `Hello!\nPlease find your invoice details here:\nInvoice No: ${invoice.invoice_number}\nAmount: Rs. ${Number(invoice.total_amount).toLocaleString('en-IN')}\nView Invoice: ${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' };
      case 'overdue': return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
      case 'sent': return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' };
      case 'partially_paid': return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' };
      default: return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const formatCurrency = (val) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading invoice...</p>
        <style>{spinnerCSS}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorBox}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>Invoice Not Found</h2>
          <p style={styles.errorMsg}>{error}</p>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusColor(invoice.status);
  const subtotal = (invoice.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const tax = Number(invoice.tax_amount || 0);
  const discount = Number(invoice.discount_amount || 0);
  const total = Number(invoice.total_amount || 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0f0f; font-family: 'DM Sans', sans-serif; }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .invoice-card { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; border-radius: 0 !important; background: white !important; }
          .invoice-header { background: #1a1a2e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        ${spinnerCSS}
      `}</style>

      {/* Action Bar */}
      <div className="no-print" style={styles.actionBar}>
        <div style={styles.actionBarInner}>
          <div style={styles.brandMark}>
            <span style={styles.brandDot}></span>
            NexusERP
          </div>
          <div style={styles.actionButtons}>
            <button onClick={handleWhatsApp} style={styles.btnWhatsApp}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Share on WhatsApp
            </button>
            <button onClick={handlePrint} style={styles.btnPrint}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Card */}
      <div style={styles.pageWrapper}>
        <div className="invoice-card" style={styles.card}>

          {/* Header */}
          <div className="invoice-header" style={styles.header}>
            <div style={styles.headerTop}>
              <div style={styles.businessInfo}>
                {invoice.business?.invoice_logo_url && (
                  <img
                    src={invoice.business.invoice_logo_url}
                    alt="logo"
                    style={styles.logo}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div>
                  <h1 style={styles.businessName}>{invoice.business?.name || 'Business'}</h1>
                  {invoice.business?.address && (
                    <p style={styles.businessAddress}>{invoice.business.address}</p>
                  )}
                  {invoice.business?.invoice_gst && (
                    <p style={styles.businessMeta}>GSTIN: {invoice.business.invoice_gst}</p>
                  )}
                  {invoice.business?.invoice_pan && (
                    <p style={styles.businessMeta}>PAN: {invoice.business.invoice_pan}</p>
                  )}
                </div>
              </div>

              <div style={styles.invoiceBadgeBlock}>
                <div style={styles.invoiceLabel}>INVOICE</div>
                <div style={styles.invoiceNumber}>{invoice.invoice_number}</div>
                <div style={{
                  ...styles.statusBadge,
                  background: statusStyle.bg,
                  color: statusStyle.text,
                  border: `1px solid ${statusStyle.border}`
                }}>
                  {invoice.status?.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </div>

            <div style={styles.headerDivider}></div>

            <div style={styles.headerMeta}>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Issue Date</span>
                <span style={styles.metaValue}>{formatDate(invoice.issue_date)}</span>
              </div>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Due Date</span>
                <span style={styles.metaValue}>{formatDate(invoice.due_date)}</span>
              </div>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Bill To</span>
                <span style={styles.metaValue}>{invoice.client_name || '—'}</span>
              </div>
              {invoice.client_phone && (
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Phone</span>
                  <span style={styles.metaValue}>{invoice.client_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div style={styles.tableSection}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={{ ...styles.th, width: '5%' }}>#</th>
                  <th style={{ ...styles.th, width: '45%', textAlign: 'left' }}>Description</th>
                  <th style={{ ...styles.th, width: '15%' }}>Qty</th>
                  <th style={{ ...styles.th, width: '17%' }}>Unit Price</th>
                  <th style={{ ...styles.th, width: '18%', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, idx) => (
                  <tr key={idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#9ca3af' }}>{idx + 1}</td>
                    <td style={{ ...styles.td, textAlign: 'left' }}>
                      <span style={styles.itemName}>{item.description}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{formatCurrency(item.unit_price)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: '500' }}>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={styles.totalsSection}>
            <div style={styles.totalRows}>
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Subtotal</span>
                <span style={styles.totalValue}>{formatCurrency(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>Tax</span>
                  <span style={styles.totalValue}>{formatCurrency(tax)}</span>
                </div>
              )}
              {discount > 0 && (
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>Discount</span>
                  <span style={{ ...styles.totalValue, color: '#10b981' }}>− {formatCurrency(discount)}</span>
                </div>
              )}
              <div style={styles.totalDivider}></div>
              <div style={styles.grandTotalRow}>
                <span style={styles.grandTotalLabel}>Total Amount</span>
                <span style={styles.grandTotalValue}>{formatCurrency(total)}</span>
              </div>
              {invoice.paid_amount > 0 && (
                <>
                  <div style={styles.totalRow}>
                    <span style={styles.totalLabel}>Amount Paid</span>
                    <span style={{ ...styles.totalValue, color: '#10b981' }}>{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div style={styles.totalRow}>
                    <span style={{ ...styles.totalLabel, fontWeight: '600', color: '#1f2937' }}>Balance Due</span>
                    <span style={{ ...styles.totalValue, fontWeight: '600', color: '#dc2626' }}>
                      {formatCurrency(total - Number(invoice.paid_amount || 0))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bank Details */}
          {(invoice.business?.invoice_bank_name || invoice.business?.invoice_bank_account) && (
            <div style={styles.bankSection}>
              <h3 style={styles.sectionTitle}>Bank Details</h3>
              <div style={styles.bankGrid}>
                {invoice.business.invoice_bank_name && (
                  <div style={styles.bankItem}>
                    <span style={styles.bankLabel}>Bank</span>
                    <span style={styles.bankValue}>{invoice.business.invoice_bank_name}</span>
                  </div>
                )}
                {invoice.business.invoice_bank_account && (
                  <div style={styles.bankItem}>
                    <span style={styles.bankLabel}>Account No.</span>
                    <span style={styles.bankValue}>{invoice.business.invoice_bank_account}</span>
                  </div>
                )}
                {invoice.business.invoice_bank_ifsc && (
                  <div style={styles.bankItem}>
                    <span style={styles.bankLabel}>IFSC</span>
                    <span style={styles.bankValue}>{invoice.business.invoice_bank_ifsc}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div style={styles.notesSection}>
              <h3 style={styles.sectionTitle}>Notes</h3>
              <p style={styles.notesText}>{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div style={styles.footer}>
            <p style={styles.footerText}>
              {invoice.business?.invoice_footer_note || 'Thank you for your business!'}
            </p>
            <p style={styles.footerPowered}>Powered by NexusERP</p>
          </div>

        </div>
      </div>
    </>
  );
};

const spinnerCSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 0.8s linear infinite; }
`;

const styles = {
  loadingContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', gap: '16px'
  },
  spinner: {
    width: '40px', height: '40px', borderRadius: '50%',
    border: '3px solid #333', borderTopColor: '#c9a84c',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: { color: '#9ca3af', fontFamily: 'DM Sans, sans-serif' },
  errorContainer: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#0f0f0f', padding: '24px'
  },
  errorBox: {
    background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px',
    padding: '48px', textAlign: 'center', maxWidth: '400px'
  },
  errorIcon: { fontSize: '48px', marginBottom: '16px' },
  errorTitle: { color: '#f9fafb', fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', marginBottom: '8px' },
  errorMsg: { color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 },

  actionBar: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #1f1f1f', padding: '12px 24px'
  },
  actionBarInner: {
    maxWidth: '860px', margin: '0 auto',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },
  brandMark: {
    display: 'flex', alignItems: 'center', gap: '8px',
    color: '#c9a84c', fontFamily: 'Cormorant Garamond, serif',
    fontSize: '18px', fontWeight: '600', letterSpacing: '0.05em'
  },
  brandDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    background: '#c9a84c', display: 'inline-block'
  },
  actionButtons: { display: 'flex', gap: '10px', alignItems: 'center' },
  btnWhatsApp: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: '#25D366', color: 'white', border: 'none',
    borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
    fontWeight: '500', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
  },
  btnPrint: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: '#1f1f1f', color: '#e5e7eb', border: '1px solid #333',
    borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
    fontWeight: '500', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
  },

  pageWrapper: {
    minHeight: '100vh', background: '#0f0f0f',
    padding: '32px 16px 64px', fontFamily: 'DM Sans, sans-serif'
  },
  card: {
    maxWidth: '860px', margin: '0 auto', background: '#ffffff',
    borderRadius: '16px', overflow: 'hidden',
    boxShadow: '0 25px 80px rgba(0,0,0,0.6)'
  },

  // Header
  header: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    padding: '40px 48px 32px', color: 'white'
  },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' },
  businessInfo: { display: 'flex', alignItems: 'flex-start', gap: '16px' },
  logo: { width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px', background: 'white', padding: '4px' },
  businessName: { fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' },
  businessAddress: { color: '#94a3b8', fontSize: '13px', marginTop: '4px', maxWidth: '280px', lineHeight: 1.5 },
  businessMeta: { color: '#94a3b8', fontSize: '12px', marginTop: '3px' },

  invoiceBadgeBlock: { textAlign: 'right' },
  invoiceLabel: { color: '#c9a84c', fontSize: '11px', letterSpacing: '0.2em', fontWeight: '500', marginBottom: '4px' },
  invoiceNumber: { fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: '700', color: '#ffffff', marginBottom: '10px' },
  statusBadge: { display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em' },

  headerDivider: { height: '1px', background: 'rgba(201,168,76,0.25)', margin: '24px 0' },
  headerMeta: { display: 'flex', flexWrap: 'wrap', gap: '32px' },
  metaItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  metaLabel: { color: '#64748b', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' },
  metaValue: { color: '#e2e8f0', fontSize: '14px', fontWeight: '500' },

  // Table
  tableSection: { padding: '0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: '#f8fafc' },
  th: {
    padding: '14px 20px', fontSize: '11px', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280',
    textAlign: 'center', borderBottom: '2px solid #e5e7eb'
  },
  trEven: { background: '#ffffff' },
  trOdd: { background: '#fafafa' },
  td: { padding: '14px 20px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #f3f4f6' },
  itemName: { fontWeight: '500', color: '#111827' },

  // Totals
  totalsSection: { padding: '24px 48px', background: '#f8fafc', borderTop: '2px solid #e5e7eb' },
  totalRows: { maxWidth: '320px', marginLeft: 'auto' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' },
  totalLabel: { fontSize: '14px', color: '#6b7280' },
  totalValue: { fontSize: '14px', color: '#374151', fontWeight: '400' },
  totalDivider: { height: '1px', background: '#d1d5db', margin: '10px 0' },
  grandTotalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 16px', background: '#1a1a2e', borderRadius: '8px', margin: '8px 0'
  },
  grandTotalLabel: { fontSize: '14px', color: '#c9a84c', fontWeight: '600', letterSpacing: '0.05em' },
  grandTotalValue: { fontSize: '20px', color: '#ffffff', fontWeight: '700', fontFamily: 'Cormorant Garamond, serif' },

  // Bank
  bankSection: { padding: '24px 48px', borderTop: '1px solid #e5e7eb' },
  sectionTitle: { fontSize: '12px', fontWeight: '600', color: '#9ca3af', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '14px' },
  bankGrid: { display: 'flex', gap: '40px', flexWrap: 'wrap' },
  bankItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  bankLabel: { fontSize: '11px', color: '#9ca3af', letterSpacing: '0.05em' },
  bankValue: { fontSize: '14px', color: '#1f2937', fontWeight: '500' },

  // Notes
  notesSection: { padding: '0 48px 24px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' },
  notesText: { fontSize: '14px', color: '#6b7280', lineHeight: 1.7 },

  // Footer
  footer: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
    padding: '24px 48px', textAlign: 'center'
  },
  footerText: { color: '#94a3b8', fontSize: '14px', marginBottom: '6px' },
  footerPowered: { color: '#c9a84c', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' },
};

export default PublicInvoicePage;
