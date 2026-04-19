import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import NexaerpPublicFooter from '../../components/public/NexaerpPublicFooter';
import InvoiceRenderer from './InvoiceRenderer';
import { downloadElementAsPdf } from '../../utils/exportInvoicePdf';

const API_BASE =
  process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || 'https://anirudherp-backend-production.up.railway.app';

const POLL_MS = 12000;

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function PublicCustomerPayPage() {
  const { token } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [pdfJob, setPdfJob] = useState(null);

  const load = useCallback(
    async (silent) => {
      if (!token) return;
      try {
        if (!silent) setLoading(true);
        const res = await fetch(`${API_BASE}/api/public/pay/${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.detail || 'Link invalid or expired');
        }
        const data = await res.json();
        setPayload(data);
        setError(null);
      } catch (e) {
        if (!silent) {
          setError(e.message || 'Could not load this page.');
          setPayload(null);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) {
      setError('Invalid payment link.');
      setLoading(false);
      return undefined;
    }
    load(false);
    const id = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(id);
  }, [token, load]);

  useEffect(() => {
    if (!pdfJob) return undefined;
    let cancelled = false;
    const waitMs = 1800;
    const t = window.setTimeout(async () => {
      try {
        const el = document.getElementById('invoice-print');
        if (!el || cancelled) return;
        await downloadElementAsPdf(el, pdfJob.filename);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          window.alert(
            'Could not build the PDF (often due to a blocked logo image). Open View and use Print → Save as PDF instead.'
          );
        }
      } finally {
        if (!cancelled) {
          setPdfJob(null);
          setDownloadingId(null);
        }
      }
    }, waitMs);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [pdfJob]);

  const openInvoice = (invoiceId) => {
    const origin = window.location.origin;
    window.open(`${origin}/invoice/${invoiceId}`, '_blank', 'noopener,noreferrer');
  };

  const downloadInvoicePdf = async (invoiceId, invoiceNumber) => {
    setDownloadingId(invoiceId);
    try {
      const res = await fetch(`${API_BASE}/api/finance/invoices/${encodeURIComponent(invoiceId)}/public`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Could not load invoice');
      const data = await res.json();
      const safe = String(invoiceNumber || invoiceId || 'invoice').replace(/[^\w.\-]+/g, '_');
      setPdfJob({ data, filename: safe });
    } catch (e) {
      setDownloadingId(null);
      window.alert(e.message || 'Download failed');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid #D4AF37',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } body { margin: 0; }`}</style>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <style>{`body { margin: 0; }`}</style>
        <div
          style={{
            background: '#111',
            border: '1px solid #333',
            borderRadius: 16,
            padding: '40px 32px',
            textAlign: 'center',
            maxWidth: 420,
          }}
        >
          <h2 style={{ color: '#f9fafb', fontFamily: 'Georgia, serif', fontSize: 22, margin: '0 0 8px' }}>
            Link unavailable
          </h2>
          <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{error || 'Not found.'}</p>
        </div>
      </div>
    );
  }

  const { business, customer, total_outstanding, unpaid_count, invoices = [], expires_at, payment_summary, refreshed_at } =
    payload;
  const logo = business?.logo_url;
  const received = payment_summary?.received_on_open_invoices ?? 0;
  const hasPartial = invoices.some((inv) => Number(inv.amount_paid || 0) > 0.5);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e5e7eb', display: 'flex', flexDirection: 'column' }}>
      {pdfJob ? (
        <div
          aria-hidden
          className="pay-pdf-capture"
          style={{
            position: 'absolute',
            left: -9999,
            top: 0,
            width: 800,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          <InvoiceRenderer
            invoice={pdfJob.data}
            items={pdfJob.data.items || []}
            business={pdfJob.data.business || null}
          />
        </div>
      ) : null}
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
        .pay-btn {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
          border: 1px solid rgba(212,175,55,0.4); background: rgba(212,175,55,0.12);
          color: #f5e6b3; cursor: pointer; text-decoration: none;
        }
        .pay-btn:hover { background: rgba(212,175,55,0.2); }
        .pay-btn-secondary { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: #d1d5db; }
        .pay-btn:disabled { opacity: 0.55; cursor: wait; }
        @media print {
          .pay-no-print { display: none !important; }
          .pub-footer { display: none !important; }
        }
      `}</style>

      <header
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {logo ? (
          <img src={logo} alt="" style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain' }} />
        ) : (
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#D4AF37' }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: '#6b7280', textTransform: 'uppercase' }}>
            Payment portal
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'Georgia, serif' }}>
            {business?.name || 'Business'}
          </div>
        </div>
        <div
          className="pay-no-print"
          style={{
            fontSize: 11,
            color: '#52525b',
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
          }}
          title="Balances refresh automatically after payments are recorded"
        >
          Live · updates ~{Math.round(POLL_MS / 1000)}s
          {refreshed_at ? <span style={{ display: 'block', marginTop: 2, color: '#3f3f46' }}>Last: {fmtTime(refreshed_at)}</span> : null}
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 24px', flex: 1 }}>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: '0 0 6px' }}>Customer</p>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
          {customer?.name || '—'}
        </h1>
        {customer?.phone ? <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px' }}>{customer.phone}</p> : null}

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
            border: '1px solid rgba(212,175,55,0.25)',
            borderRadius: 16,
            padding: '20px 22px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Total outstanding
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f5e6b3', marginTop: 4 }}>{fmtInr(total_outstanding)}</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>
            {unpaid_count} unpaid invoice{unpaid_count === 1 ? '' : 's'}
          </div>
          {unpaid_count === 0 ? (
            <p style={{ margin: '14px 0 0', fontSize: 14, color: '#6ee7b7', fontWeight: 600 }}>
              You&apos;re all caught up — no balance due on this link right now.
            </p>
          ) : null}
          {unpaid_count > 0 && received > 0.5 ? (
            <p style={{ margin: '12px 0 0', fontSize: 13, color: '#a3e635', lineHeight: 1.5 }}>
              Payments received on these invoices: <strong>{fmtInr(received)}</strong>
              {hasPartial ? ' · Any new payment will update the balances below automatically.' : ''}
            </p>
          ) : null}
        </div>

        {expires_at ? (
          <p style={{ fontSize: 12, color: '#52525b', margin: '0 0 24px' }}>
            This link is valid until {fmtDate(expires_at)}.
          </p>
        ) : null}

        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Unpaid invoices
        </h2>

        {invoices.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 12 }}>
            No outstanding invoices — thank you! If you just paid, this page will stay in sync automatically.
          </p>
        ) : (
          <div
            style={{
              marginTop: 14,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            {invoices.map((inv) => {
              const paid = Number(inv.amount_paid || 0);
              const partial = paid > 0.5 && Number(inv.balance_due || 0) > 0.5;
              return (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: '#fff' }}>
                      {inv.invoice_number}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      Due {fmtDate(inv.due_date)}
                      {partial ? (
                        <>
                          {' · '}
                          <span style={{ color: '#a3e635' }}>Received {fmtInr(paid)}</span>
                          {' · '}
                          <span style={{ color: '#fca5a5' }}>Balance {fmtInr(inv.balance_due)}</span>
                        </>
                      ) : (
                        <> · Balance {fmtInr(inv.balance_due)}</>
                      )}
                    </div>
                    {!partial && Number(inv.total_amount) > 0 ? (
                      <div style={{ fontSize: 11, color: '#52525b', marginTop: 4 }}>Invoice total {fmtInr(inv.total_amount)}</div>
                    ) : null}
                    {partial ? (
                      <div style={{ fontSize: 11, color: '#52525b', marginTop: 4 }}>
                        Invoice total {fmtInr(inv.total_amount)} · {inv.status?.replace('_', ' ') || ''}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button type="button" className="pay-btn pay-btn-secondary" onClick={() => openInvoice(inv.id)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="pay-btn"
                      disabled={downloadingId === inv.id}
                      onClick={() => downloadInvoicePdf(inv.id, inv.invoice_number)}
                    >
                      {downloadingId === inv.id ? 'Preparing…' : 'Download PDF'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="pay-no-print" style={{ fontSize: 12, color: '#52525b', marginTop: 32, lineHeight: 1.5 }}>
          View opens the invoice in a new tab. Download PDF saves a file to your device (same layout as the invoice page).
        </p>
      </main>

      <NexaerpPublicFooter />
    </div>
  );
}
