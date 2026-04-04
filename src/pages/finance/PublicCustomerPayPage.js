import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE =
  process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || 'https://anirudherp-backend-production.up.railway.app';

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

export default function PublicCustomerPayPage() {
  const { token } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid payment link.');
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/public/pay/${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.detail || 'Link invalid or expired');
        }
        const data = await res.json();
        setPayload(data);
      } catch (e) {
        setError(e.message || 'Could not load this page.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const openInvoice = (invoiceId) => {
    const origin = window.location.origin;
    window.open(`${origin}/invoice/${invoiceId}`, '_blank', 'noopener,noreferrer');
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

  const { business, customer, total_outstanding, unpaid_count, invoices = [], expires_at } = payload;
  const logo = business?.logo_url;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e5e7eb' }}>
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
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: '#6b7280', textTransform: 'uppercase' }}>
            Payment portal
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'Georgia, serif' }}>
            {business?.name || 'Business'}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 64px' }}>
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
            marginBottom: 28,
          }}
        >
          <div style={{ fontSize: 12, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Total outstanding
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f5e6b3', marginTop: 4 }}>{fmtInr(total_outstanding)}</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>
            {unpaid_count} unpaid invoice{unpaid_count === 1 ? '' : 's'}
          </div>
        </div>

        {expires_at ? (
          <p style={{ fontSize: 12, color: '#52525b', margin: '-12px 0 24px' }}>
            This link is valid until {fmtDate(expires_at)}.
          </p>
        ) : null}

        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Unpaid invoices
        </h2>

        {invoices.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 12 }}>No outstanding invoices right now.</p>
        ) : (
          <div
            style={{
              marginTop: 14,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            {invoices.map((inv) => (
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
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: '#fff' }}>
                    {inv.invoice_number}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Due {fmtDate(inv.due_date)} · Balance {fmtInr(inv.balance_due)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button type="button" className="pay-btn pay-btn-secondary" onClick={() => openInvoice(inv.id)}>
                    View
                  </button>
                  <button type="button" className="pay-btn" onClick={() => openInvoice(inv.id)}>
                    Download PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 12, color: '#52525b', marginTop: 32, lineHeight: 1.5 }}>
          Use View or Download PDF to open the invoice in a new tab, then print or save as PDF from your browser.
        </p>
      </main>
    </div>
  );
}
