// InvoiceRenderer.js — shared between InvoiceViewPage and PublicInvoicePage
// Props: invoice, items, business, payments
import React from 'react';
import QRCode from 'qrcode';
import { splitGstTotal } from '../../shared-core';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

// Convert number to words (Indian system)
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToWords(-num);

  let words = '';
  const n = Math.floor(num);

  if (n >= 10000000) { words += numberToWords(Math.floor(n / 10000000)) + ' Crore '; num = n % 10000000; }
  if (n >= 100000)   { words += numberToWords(Math.floor((n % 10000000) / 100000)) + ' Lakh '; }
  if (n >= 1000)     { words += numberToWords(Math.floor((n % 100000) / 1000)) + ' Thousand '; }
  if (n >= 100)      { words += numberToWords(Math.floor((n % 1000) / 100)) + ' Hundred '; }
  const remainder = n % 100;
  if (remainder > 0) {
    if (remainder < 20) words += ones[remainder];
    else words += tens[Math.floor(remainder / 10)] + (remainder % 10 ? ' ' + ones[remainder % 10] : '');
  }
  return words.trim();
}

function amountInWords(total) {
  const n = Math.round(Number(total) * 100) / 100;
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  let result = numberToWords(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + numberToWords(paise) + ' Paise';
  result += ' Only';
  return result.toUpperCase();
}

export default function InvoiceRenderer({ invoice, items, business, payments }) {
  const [qrDataUrl, setQrDataUrl] = React.useState(null);
  const [upiLink, setUpiLink] = React.useState(null);
  const [einvoiceQrDataUrl, setEinvoiceQrDataUrl] = React.useState(null);

  React.useEffect(() => {
    if (!invoice) return;
    let cancelled = false;
    async function buildQr() {
      try {
        const vpa = business?.upi_vpa;
        if (!vpa) {
          setQrDataUrl(null);
          setUpiLink(null);
          return;
        }
        const name = business?.upi_name || business?.name || '';
        const amount = Number(invoice?.balance_due ?? invoice?.total_amount ?? 0);
        const amt = amount > 0 ? amount.toFixed(2) : Number(invoice?.total_amount ?? 0).toFixed(2);
        const tn = invoice?.invoice_number || '';

        const params = new URLSearchParams();
        params.set('pa', vpa);
        if (name) params.set('pn', name);
        params.set('am', amt);
        params.set('cu', 'INR');
        if (tn) params.set('tn', tn);
        const upiPayload = `upi://pay?${params.toString()}`;

        if (!cancelled) setUpiLink(upiPayload);
        const url = await QRCode.toDataURL(upiPayload, { margin: 1, width: 180, errorCorrectionLevel: 'M' });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrDataUrl(null);
        if (!cancelled) setUpiLink(null);
      }
    }
    buildQr();
    return () => { cancelled = true; };
  }, [business?.upi_vpa, business?.upi_name, business?.name, invoice?.invoice_number, invoice?.balance_due, invoice?.total_amount, invoice]);

  React.useEffect(() => {
    const raw = invoice?.einvoice_signed_qr;
    if (!raw) {
      setEinvoiceQrDataUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const text = typeof raw === 'string' ? raw : String(raw);
        const url = await QRCode.toDataURL(text, { margin: 1, width: 200, errorCorrectionLevel: 'M' });
        if (!cancelled) setEinvoiceQrDataUrl(url);
      } catch {
        if (!cancelled) setEinvoiceQrDataUrl(null);
      }
    })();
    return () => { cancelled = true; };
  }, [invoice?.einvoice_signed_qr]);

  if (!invoice) return null;

  const statusColor = {
    draft: '#6b7280', sent: '#3b82f6', paid: '#10b981',
    overdue: '#ef4444', partially_paid: '#f59e0b'
  }[invoice.status] || '#6b7280';

  const getLineTaxable = (item) => {
    const t = Number(item.total ?? item.amount);
    if (Number.isFinite(t) && !Number.isNaN(t)) return t;
    return (
      (Number(item.quantity) || 0) * (Number(item.unit_price) || 0) - (Number(item.item_discount) || 0)
    );
  };

  const lineRows = items.map((item) => {
    const taxable = getLineTaxable(item);
    const hdr = Number(invoice.tax_rate || 0);
    let pct = Number(item.line_tax_rate);
    if (!Number.isFinite(pct)) pct = 0;
    const storedRaw = item.line_tax_amount;
    const storedDefined = storedRaw !== undefined && storedRaw !== null && storedRaw !== '';
    let taxAmt;
    if (storedDefined) {
      taxAmt = Number(storedRaw);
      if ((!pct || pct === 0) && taxable > 0 && taxAmt > 0) {
        pct = Math.round((taxAmt / taxable) * 10000) / 100;
      }
    } else if (pct > 0) {
      taxAmt = Math.round(taxable * (pct / 100) * 100) / 100;
    } else if (hdr > 0) {
      pct = hdr;
      taxAmt = Math.round(taxable * (hdr / 100) * 100) / 100;
    } else {
      const sub = Number(invoice.subtotal || 0);
      const ttot = Number(invoice.tax_amount || 0);
      if (sub > 0 && ttot > 0) {
        taxAmt = Math.round(ttot * (taxable / sub) * 100) / 100;
        pct = taxable > 0 && taxAmt > 0 ? Math.round((taxAmt / taxable) * 10000) / 100 : 0;
      } else {
        taxAmt = 0;
        pct = 0;
      }
    }
    const gross = taxable + taxAmt;
    return { item, taxable, pct, taxAmt, gross };
  });

  const hasHSN = items.some((i) => i.hsn_code);
  const showTaxCols = lineRows.some((r) => r.pct > 0 || r.taxAmt > 0) || Number(invoice.tax_amount || 0) > 0;

  // Parse custom fields
  let customFields = [];
  try {
    if (invoice.custom_fields) {
      customFields = typeof invoice.custom_fields === 'string'
        ? JSON.parse(invoice.custom_fields)
        : invoice.custom_fields;
    }
  } catch { customFields = []; }
  customFields = customFields.filter(f => f.label && f.value);

  const computedSubtotal = lineRows.reduce((s, r) => s + r.taxable, 0);
  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.amount_paid || 0);
  const balance = Number(invoice.balance_due || Math.max(0, total - paid));

  const termsOfSale = business?.terms_of_sale || '';

  return (
    <div id="invoice-print" style={{
      width: '100%', maxWidth: 800, margin: '0 auto',
      background: '#ffffff', color: '#111827',
      borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
      fontFamily: "'Segoe UI', Arial, sans-serif"
    }}>
      {/* ── DARK HEADER ── */}
      <div className="inv-dark-header" style={{
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
        padding: '36px 48px',
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {business?.invoice_logo_url ? (
                <img src={business.invoice_logo_url} alt="logo"
                  style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 10, background: 'white', padding: 4 }}
                  onError={e => { e.target.style.display = 'none'; }} />
              ) : (
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #D4AF37, #F5E17A)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <span style={{ color: '#000', fontWeight: 'bold', fontSize: 18 }}>{(business?.name || 'N')[0]}</span>
                </div>
              )}
              <div>
                <div style={{ color: '#D4AF37', fontSize: 22, fontWeight: 'bold' }}>{business?.name || 'Your Business'}</div>
                {business?.invoice_gst && <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>GST: {business.invoice_gst}</div>}
              </div>
            </div>
            <div style={{ color: '#9ca3af', fontSize: 12, lineHeight: 1.7 }}>
              {business?.address && <div>{business.address}</div>}
              {(business?.city || business?.country) && <div>{[business.city, business.country].filter(Boolean).join(', ')}</div>}
              {business?.phone && <div>Mob: {business.phone}</div>}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#D4AF37', fontSize: 30, fontWeight: 'bold', letterSpacing: '-1px' }}>INVOICE</div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginTop: 4 }}>{invoice.invoice_number}</div>
            <div style={{ marginTop: 10, display: 'inline-block', padding: '3px 12px', borderRadius: 20, border: `1px solid ${statusColor}`, backgroundColor: `${statusColor}20`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <span style={{ color: statusColor, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {invoice.status?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── META BAND ── */}
      <div className="inv-meta-band" style={{ background: '#f8f9fa', padding: '20px 48px', borderBottom: '1px solid #e5e7eb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 6 }}>Bill To</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{invoice.client_name}</div>
            {invoice.client_address && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{invoice.client_address}</div>}
            {invoice.client_email && <div style={{ fontSize: 13, color: '#6b7280' }}>{invoice.client_email}</div>}
            {invoice.client_phone && <div style={{ fontSize: 13, color: '#6b7280' }}>{invoice.client_phone}</div>}
            {invoice.client_gstin ? <div style={{ fontSize: 13, color: '#6b7280' }}>GSTIN No. {invoice.client_gstin}</div> : null}
          </div>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', textAlign: 'right' }}>
              {[
                ['Invoice Date', fmtDate(invoice.issue_date)],
                ['Due Date', fmtDate(invoice.due_date)],
                invoice.payment_terms ? ['Payment Terms', invoice.payment_terms] : null,
                    invoice.place_of_supply || invoice.buyer_state
                      ? ['Place of Supply', invoice.place_of_supply || invoice.buyer_state]
                      : null,
                    invoice.supply_type === 'interstate'
                      ? ['Supply Type', 'Inter-State (IGST)']
                      : invoice.supply_type === 'intrastate'
                        ? ['Supply Type', 'Intra-State (CGST + SGST)']
                        : null,
                    ...customFields.map(f => [f.label, f.value])
              ].filter(Boolean).map(([label, value]) => (
                <React.Fragment key={label}>
                  <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>{label}</span>
                  <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{value}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ITEMS TABLE ── */}
      <div style={{ padding: '0 48px', marginTop: 28, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: showTaxCols ? 640 : 400 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #111827' }}>
              <th style={{ textAlign: 'center', padding: '8px 4px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', width: 26 }}>No.</th>
              <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151' }}>Description</th>
              {hasHSN && <th style={{ textAlign: 'center', padding: '8px 4px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', width: 64 }}>HSN/SAC</th>}
              <th style={{ textAlign: 'center', padding: '8px 4px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', width: 44 }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', width: 82 }}>Rate</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', width: 82 }}>Taxable Amt</th>
              {showTaxCols && <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', width: 52 }}>Tax%</th>}
              {showTaxCols && <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', width: 78 }}>Tax Amt</th>}
              <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', width: 86 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineRows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 4px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ padding: '10px 6px', fontSize: 13, color: '#111827', fontWeight: 500 }}>{row.item.description}</td>
                {hasHSN && <td style={{ padding: '10px 4px', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>{row.item.hsn_code || '—'}</td>}
                <td style={{ padding: '10px 4px', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>{row.item.quantity}</td>
                <td style={{ padding: '10px 6px', fontSize: 12, color: '#6b7280', textAlign: 'right' }}>{fmt(row.item.unit_price)}</td>
                <td style={{ padding: '10px 6px', fontSize: 12, color: '#6b7280', textAlign: 'right' }}>{fmt(row.taxable)}</td>
                {showTaxCols && <td style={{ padding: '10px 4px', fontSize: 12, color: '#6b7280', textAlign: 'right' }}>{row.pct > 0 ? `${row.pct}%` : '—'}</td>}
                {showTaxCols && <td style={{ padding: '10px 6px', fontSize: 12, color: '#6b7280', textAlign: 'right' }}>{row.taxAmt > 0 ? fmt(row.taxAmt) : '—'}</td>}
                <td style={{ padding: '10px 4px', fontSize: 13, color: '#111827', fontWeight: 600, textAlign: 'right' }}>{fmt(row.gross)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS ── */}
      <div style={{ padding: '20px 48px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: '#6b7280' }}>
            <span>Subtotal</span><span>{fmt(invoice.subtotal || computedSubtotal)}</span>
          </div>
          {(() => {
            let cgst = Number(invoice.cgst_amount || 0);
            let sgst = Number(invoice.sgst_amount || 0);
            let igst = Number(invoice.igst_amount || 0);
            const totalTax = Number(invoice.tax_amount || 0);
            if (totalTax > 0 && cgst === 0 && sgst === 0 && igst === 0) {
              const fb = splitGstTotal(
                totalTax,
                business?.state || '',
                invoice.buyer_state || invoice.place_of_supply || ''
              );
              cgst = fb.cgst_amount;
              sgst = fb.sgst_amount;
              igst = fb.igst_amount;
            }
            return (
              <>
                {(cgst > 0 || sgst > 0) && (
                  <>
                    {cgst > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: '#6b7280' }}>
                        <span>CGST</span><span>{fmt(cgst)}</span>
                      </div>
                    )}
                    {sgst > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: '#6b7280' }}>
                        <span>SGST</span><span>{fmt(sgst)}</span>
                      </div>
                    )}
                  </>
                )}
                {igst > 0 && !(cgst > 0 || sgst > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: '#6b7280' }}>
                    <span>IGST</span><span>{fmt(igst)}</span>
                  </div>
                )}
              </>
            );
          })()}
          {Number(invoice.discount_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: '#ef4444' }}>
              <span>Discount</span><span>-{fmt(invoice.discount_amount)}</span>
            </div>
          )}
          {/* Grand total */}
          <div className="inv-grand-row" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px', borderRadius: 8, marginTop: 8,
            background: '#1a1a2e',
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
          }}>
            <span className="total-label" style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Total</span>
            <span className="total-value" style={{ fontSize: 20, fontWeight: 800, color: '#D4AF37' }}>{fmt(total)}</span>
          </div>
          {paid > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: '#10b981', marginTop: 6 }}>
                <span>Amount Paid</span><span>-{fmt(paid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #e5e7eb', marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Balance Due</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>{fmt(balance)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── AMOUNT IN WORDS ── */}
      <div style={{ padding: '0 48px 16px' }}>
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 16px', borderLeft: '3px solid #D4AF37', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Amount in Words: </span>
          <span style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>{amountInWords(total)}</span>
        </div>
      </div>

      {/* ── BANK DETAILS ── */}
      {(business?.invoice_bank_name || business?.invoice_bank_account) && (
        <div className="inv-bank-band" style={{ padding: '16px 48px', background: '#f8f9fa', borderTop: '1px solid #e5e7eb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 8 }}>Bank Details</div>
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            {business.invoice_bank_name && <div><div style={{ fontSize: 10, color: '#9ca3af' }}>Bank</div><div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{business.invoice_bank_name}</div></div>}
            {business.invoice_bank_account && <div><div style={{ fontSize: 10, color: '#9ca3af' }}>Account No.</div><div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{business.invoice_bank_account}</div></div>}
            {business.invoice_bank_ifsc && <div><div style={{ fontSize: 10, color: '#9ca3af' }}>IFSC</div><div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{business.invoice_bank_ifsc}</div></div>}
          </div>
        </div>
      )}

      {/* ── GST E-Invoice (IRN + signed QR) ── */}
      {(invoice.einvoice_irn || invoice.einvoice_status === 'generated') && (
        <div className="inv-einvoice-band" style={{ padding: '16px 48px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#166534', marginBottom: 8 }}>
            GST E-Invoice (IRN)
          </div>
          <div style={{ fontSize: 12, color: '#14532d', marginBottom: 10, wordBreak: 'break-all' }}>
            <strong>IRN:</strong> {invoice.einvoice_irn || '—'}
          </div>
          {(invoice.einvoice_ack_no || invoice.einvoice_ack_date) && (
            <div style={{ fontSize: 11, color: '#15803d', marginBottom: 12 }}>
              {invoice.einvoice_ack_no && <span>Ack No: {invoice.einvoice_ack_no} </span>}
              {invoice.einvoice_ack_date && <span> · Ack Dt: {invoice.einvoice_ack_date}</span>}
            </div>
          )}
          {einvoiceQrDataUrl && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <img src={einvoiceQrDataUrl} alt="E-Invoice QR" style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 8, border: '1px solid #d1fae5', background: '#fff' }} />
              <div style={{ fontSize: 11, color: '#166534', maxWidth: 320, lineHeight: 1.5 }}>
                Scan for invoice verification per NIC IRP. Generated IRN is registered with the Invoice Registration Portal (when using live GSP mode).
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── UPI QR (optional) ── */}
      {business?.upi_vpa && balance > 0 && invoice?.status !== 'paid' && invoice?.status !== 'cancelled' && (
        <div className="inv-upi-qr-band" style={{ padding: '16px 48px', background: '#f8f9fa', borderTop: '1px solid #e5e7eb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 8 }}>
            UPI Payment QR
          </div>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 190, height: 190, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.06)' }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="UPI QR" style={{ width: 170, height: 170, objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 12, color: '#6b7280' }}>Generating...</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 12, color: '#111827', fontWeight: 700, marginBottom: 6 }}>
                Pay to: <span style={{ color: '#D4AF37' }}>{business?.upi_vpa}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                Amount: <span style={{ fontWeight: 800, color: '#111827' }}>{fmt(balance > 0 ? balance : (invoice?.total_amount || 0))}</span>
              </div>
              {business?.upi_name && (
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                  Receiver: <span style={{ fontWeight: 700, color: '#111827' }}>{business?.upi_name}</span>
                </div>
              )}
              {upiLink && (
                <div style={{ marginTop: 12 }}>
                  <a
                    href={upiLink}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #10b981, #34d399)',
                      color: '#04110b',
                      fontSize: 13,
                      fontWeight: 800,
                      textDecoration: 'none',
                      border: '1px solid rgba(16,185,129,0.35)'
                    }}
                  >
                    Pay via UPI
                  </a>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>
                    Opens GPay / PhonePe / Paytm on mobile.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── NOTES ── */}
      {invoice.notes && (
        <div style={{ padding: '16px 48px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 6 }}>Notes</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{invoice.notes}</div>
        </div>
      )}

      {/* ── TERMS OF SALE ── */}
      {termsOfSale && (
        <div style={{ padding: '16px 48px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 8 }}>Terms of Sale</div>
          <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{termsOfSale}</div>
        </div>
      )}

      {/* ── SIGNATURE + FOOTER ── */}
      <div style={{ padding: '20px 48px 36px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #d1d5db', paddingTop: 8, marginTop: 40, width: 160 }}>
              <p style={{ fontSize: 11, color: '#6b7280' }}>Customer Signature</p>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>For <strong style={{ color: '#111827' }}>{business?.name || ''}</strong></p>
            <div style={{ borderTop: '1px solid #d1d5db', paddingTop: 8, marginTop: 32, width: 160 }}>
              <p style={{ fontSize: 11, color: '#6b7280' }}>Authorized Signature</p>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{business?.invoice_footer_note || 'Thank you for your business!'}</p>
          {business?.invoice_pan && <p style={{ fontSize: 11, color: '#d1d5db', marginTop: 4 }}>PAN: {business.invoice_pan}</p>}
        </div>
      </div>
    </div>
  );
}
