// Purchase bill print/preview — mirrors InvoiceRenderer layout; vendor = supplier, business = recipient.
import React from 'react';
import { splitGstTotal } from '../../shared-core';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-');

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

export default function PurchaseBillRenderer({ bill, items, business }) {
  if (!bill) return null;

  const statusColor = { unpaid: '#f59e0b', partial: '#f59e0b', paid: '#10b981' }[bill.status] || '#6b7280';

  const getLineTaxable = (item) => {
    const t = Number(item.total ?? item.amount);
    if (Number.isFinite(t) && !Number.isNaN(t)) return t;
    return (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
  };

  const lineRows = (items || []).map((item) => {
    const taxable = getLineTaxable(item);
    const hdr = Number(bill.tax_rate || 0);
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
      const sub = Number(bill.subtotal || 0);
      const ttot = Number(bill.tax_amount || 0);
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

  const hasHSN = (items || []).some((i) => i.hsn_code);
  const showTaxCols =
    lineRows.some((r) => r.pct > 0 || r.taxAmt > 0) || Number(bill.tax_amount || 0) > 0;

  const computedSubtotal = lineRows.reduce((s, r) => s + r.taxable, 0);
  const total = Number(bill.total_amount || 0);
  const paid = Number(bill.amount_paid || 0);
  const balance = Number(bill.balance_due ?? Math.max(0, total - paid));

  const recipientState = business?.state || '';

  return (
    <div
      id="purchase-bill-print"
      style={{
        width: '100%',
        maxWidth: 800,
        margin: '0 auto',
        background: '#ffffff',
        color: '#111827',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <div
        className="inv-dark-header"
        style={{
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
          padding: '36px 48px',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {business?.invoice_logo_url ? (
                <img
                  src={business.invoice_logo_url}
                  alt="logo"
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: 'contain',
                    borderRadius: 10,
                    background: 'white',
                    padding: 4,
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: 'linear-gradient(135deg, #D4AF37, #F5E17A)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  <span style={{ color: '#000', fontWeight: 'bold', fontSize: 18 }}>{(business?.name || 'N')[0]}</span>
                </div>
              )}
              <div>
                <div style={{ color: '#D4AF37', fontSize: 22, fontWeight: 'bold' }}>{business?.name || 'Your Business'}</div>
                {business?.invoice_gst && (
                  <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>GST: {business.invoice_gst}</div>
                )}
              </div>
            </div>
            <div style={{ color: '#9ca3af', fontSize: 12, lineHeight: 1.7 }}>
              {business?.address && <div>{business.address}</div>}
              {(business?.city || business?.country) && (
                <div>{[business.city, business.country].filter(Boolean).join(', ')}</div>
              )}
              {business?.phone && <div>Mob: {business.phone}</div>}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#D4AF37', fontSize: 28, fontWeight: 'bold', letterSpacing: '-1px' }}>PURCHASE BILL</div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginTop: 4 }}>{bill.bill_number}</div>
            <div
              style={{
                marginTop: 10,
                display: 'inline-block',
                padding: '3px 12px',
                borderRadius: 20,
                border: `1px solid ${statusColor}`,
                backgroundColor: `${statusColor}20`,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span
                style={{
                  color: statusColor,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {bill.status?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="inv-meta-band"
        style={{
          background: '#f8f9fa',
          padding: '20px 48px',
          borderBottom: '1px solid #e5e7eb',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: '#6b7280',
                marginBottom: 6,
              }}
            >
              Supplier (Vendor)
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{bill.vendor_name}</div>
            {bill.vendor_phone && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{bill.vendor_phone}</div>}
            {bill.vendor_email && <div style={{ fontSize: 13, color: '#6b7280' }}>{bill.vendor_email}</div>}
            {bill.vendor_gstin ? (
              <div style={{ fontSize: 13, color: '#6b7280' }}>GSTIN: {bill.vendor_gstin}</div>
            ) : null}
            {bill.vendor_state ? (
              <div style={{ fontSize: 13, color: '#6b7280' }}>State: {bill.vendor_state}</div>
            ) : null}
          </div>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', textAlign: 'right' }}>
              {[
                ['Bill Date', fmtDate(bill.bill_date)],
                ['Due Date', fmtDate(bill.due_date)],
                recipientState ? ['Place of Supply (Recipient)', recipientState] : null,
                bill.supply_type === 'interstate'
                  ? ['Supply Type', 'Inter-State (IGST)']
                  : bill.supply_type === 'intrastate'
                    ? ['Supply Type', 'Intra-State (CGST + SGST)']
                    : null,
              ]
                .filter(Boolean)
                .map(([label, value]) => (
                  <React.Fragment key={label}>
                    <span
                      style={{
                        fontSize: 11,
                        color: '#6b7280',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        textAlign: 'left',
                      }}
                    >
                      {label}
                    </span>
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{value}</span>
                  </React.Fragment>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 48px', marginTop: 28, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: showTaxCols ? 640 : 400 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #111827' }}>
              <th
                style={{
                  textAlign: 'center',
                  padding: '8px 4px',
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#374151',
                  width: 26,
                }}
              >
                No.
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 6px',
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#374151',
                }}
              >
                Description
              </th>
              {hasHSN && (
                <th
                  style={{
                    textAlign: 'center',
                    padding: '8px 4px',
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#374151',
                    width: 64,
                  }}
                >
                  HSN/SAC
                </th>
              )}
              <th
                style={{
                  textAlign: 'center',
                  padding: '8px 4px',
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#374151',
                  width: 44,
                }}
              >
                Qty
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '8px 6px',
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#374151',
                  width: 82,
                }}
              >
                Rate
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '8px 6px',
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#374151',
                  width: 82,
                }}
              >
                Taxable Amt
              </th>
              {showTaxCols && (
                <th
                  style={{
                    textAlign: 'right',
                    padding: '8px 4px',
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#374151',
                    width: 52,
                  }}
                >
                  Tax%
                </th>
              )}
              {showTaxCols && (
                <th
                  style={{
                    textAlign: 'right',
                    padding: '8px 6px',
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#374151',
                    width: 78,
                  }}
                >
                  Tax Amt
                </th>
              )}
              <th
                style={{
                  textAlign: 'right',
                  padding: '8px 4px',
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#374151',
                  width: 86,
                }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {lineRows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 4px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ padding: '10px 6px', fontSize: 13, color: '#111827', fontWeight: 500 }}>{row.item.description}</td>
                {hasHSN && (
                  <td style={{ padding: '10px 4px', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                    {row.item.hsn_code || '—'}
                  </td>
                )}
                <td style={{ padding: '10px 4px', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>{row.item.quantity}</td>
                <td style={{ padding: '10px 6px', fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
                  {fmt(row.item.unit_price)}
                </td>
                <td style={{ padding: '10px 6px', fontSize: 12, color: '#6b7280', textAlign: 'right' }}>{fmt(row.taxable)}</td>
                {showTaxCols && (
                  <td style={{ padding: '10px 4px', fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
                    {row.pct > 0 ? `${row.pct}%` : '—'}
                  </td>
                )}
                {showTaxCols && (
                  <td style={{ padding: '10px 6px', fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
                    {row.taxAmt > 0 ? fmt(row.taxAmt) : '—'}
                  </td>
                )}
                <td style={{ padding: '10px 4px', fontSize: 13, color: '#111827', fontWeight: 600, textAlign: 'right' }}>
                  {fmt(row.gross)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '20px 48px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: '#6b7280' }}>
            <span>Subtotal</span>
            <span>{fmt(bill.subtotal || computedSubtotal)}</span>
          </div>
          {(() => {
            let cgst = Number(bill.cgst_amount || 0);
            let sgst = Number(bill.sgst_amount || 0);
            let igst = Number(bill.igst_amount || 0);
            const totalTax = Number(bill.tax_amount || 0);
            if (totalTax > 0 && cgst === 0 && sgst === 0 && igst === 0) {
              const fb = splitGstTotal(totalTax, bill.vendor_state || '', recipientState);
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
                        <span>CGST</span>
                        <span>{fmt(cgst)}</span>
                      </div>
                    )}
                    {sgst > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: '#6b7280' }}>
                        <span>SGST</span>
                        <span>{fmt(sgst)}</span>
                      </div>
                    )}
                  </>
                )}
                {igst > 0 && !(cgst > 0 || sgst > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: '#6b7280' }}>
                    <span>IGST</span>
                    <span>{fmt(igst)}</span>
                  </div>
                )}
              </>
            );
          })()}
          {Number(bill.discount_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: '#ef4444' }}>
              <span>Discount</span>
              <span>-{fmt(bill.discount_amount)}</span>
            </div>
          )}
          <div
            className="inv-grand-row"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              borderRadius: 8,
              marginTop: 8,
              background: '#1a1a2e',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <span className="total-label" style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
              Total
            </span>
            <span className="total-value" style={{ fontSize: 20, fontWeight: 800, color: '#D4AF37' }}>{fmt(total)}</span>
          </div>
          {paid > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: '#10b981', marginTop: 6 }}>
                <span>Amount Paid</span>
                <span>-{fmt(paid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #e5e7eb', marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Balance Due</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>{fmt(balance)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '0 48px 16px' }}>
        <div
          style={{
            background: '#f8f9fa',
            borderRadius: 8,
            padding: '10px 16px',
            borderLeft: '3px solid #D4AF37',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Amount in Words: </span>
          <span style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>{amountInWords(total)}</span>
        </div>
      </div>

      {bill.notes && (
        <div style={{ padding: '16px 48px', borderTop: '1px solid #e5e7eb' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#6b7280',
              marginBottom: 6,
            }}
          >
            Notes
          </div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{bill.notes}</div>
        </div>
      )}

      <div style={{ padding: '20px 48px 36px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
              For <strong style={{ color: '#111827' }}>{business?.name || ''}</strong>
            </p>
            <div style={{ borderTop: '1px solid #d1d5db', paddingTop: 8, marginTop: 32, width: 160 }}>
              <p style={{ fontSize: 11, color: '#6b7280' }}>Authorized Signature</p>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            {business?.invoice_footer_note || 'Purchase bill for your records.'}
          </p>
          {business?.invoice_pan && (
            <p style={{ fontSize: 11, color: '#d1d5db', marginTop: 4 }}>PAN: {business.invoice_pan}</p>
          )}
        </div>
      </div>
    </div>
  );
}
