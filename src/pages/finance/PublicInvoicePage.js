import React, { useState, useEffect } from 'react';
import InvoiceRenderer from './InvoiceRenderer';

const API_BASE = process.env.REACT_APP_API_URL || 'https://anirudherp-backend-production.up.railway.app';

function NexaerpFooterLogo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="pub-nexa-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5E6B3" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#9A7B2C" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="26" height="26" rx="7" fill="url(#pub-nexa-gold)" opacity="0.12" />
      <path
        d="M9 23V9h3.2l5.8 9.2L23.8 9H27v14h-2.8V13.5L18.2 23h-4.4L11.8 13.5V23H9z"
        fill="url(#pub-nexa-gold)"
      />
    </svg>
  );
}

export default function PublicInvoicePage() {
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const invoiceId = window.location.pathname.split('/invoice/')[1];

  useEffect(() => {
    if (!invoiceId) { setError('Invalid invoice link.'); setLoading(false); return; }
    let timer = null;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/finance/invoices/${invoiceId}/public`, { cache: 'no-store' });
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
    // Auto-refresh status so QR/button vanish after payment is recorded.
    timer = setInterval(() => {
      load();
    }, 15000);
    return () => { if (timer) clearInterval(timer); };
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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .pub-toolbar {
          position: sticky; top: 0; z-index: 50;
          background: rgba(10,10,15,0.97); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 12px 24px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .pub-print-btn {
          display: flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #D4AF37, #F5E17A);
          color: #000; border: none; border-radius: 8px;
          padding: 9px 20px; font-size: 13px; font-weight: 700;
          cursor: pointer;
        }

        @media print {
          .pub-toolbar { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .pub-page-bg { background: white !important; padding: 0 !important; }
          #invoice-print { box-shadow: none !important; max-width: 100% !important; border-radius: 0 !important; }
          .inv-dark-header { background-color: #1a1a2e !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .inv-meta-band, .inv-bank-band { background-color: #f8f9fa !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .inv-grand-row { background-color: #1a1a2e !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .inv-grand-row .total-label { color: #ffffff !important; }
          .inv-grand-row .total-value { color: #D4AF37 !important; }
          .pub-footer { display: none !important; }
        }
      `}</style>

      {/* Toolbar — Print only */}
      <div className="pub-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D4AF37', fontWeight: 600, fontSize: 15 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4AF37' }} />
          NexaERP
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

      <div className="pub-page-bg" style={{ padding: '24px 16px 32px', display: 'flex', justifyContent: 'center' }}>
        <InvoiceRenderer invoice={invoice} items={items} business={business} />
      </div>

      <footer
        className="pub-footer"
        style={{
          borderTop: '1px solid rgba(212, 175, 55, 0.12)',
          background: 'linear-gradient(180deg, rgba(10,10,15,0) 0%, rgba(10,10,15,0.6) 100%)',
        }}
      >
        <div
          style={{
            maxWidth: 560,
            margin: '0 auto',
            padding: '28px 20px 36px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              height: 1,
              maxWidth: 280,
              margin: '0 auto 20px',
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.35), transparent)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
            <NexaerpFooterLogo size={24} />
            <span
              style={{
                fontSize: 12,
                letterSpacing: '0.02em',
                color: '#6b7280',
                fontWeight: 500,
              }}
            >
              Powered by NexaERP <span style={{ opacity: 0.5 }}>•</span>{' '}
              <a
                href="https://nexaerp.in"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#9ca3af', textDecoration: 'none' }}
              >
                nexaerp.in
              </a>
            </span>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#52525b', lineHeight: 1.5 }}>
            <span style={{ marginRight: 4 }} aria-hidden>
              📱
            </span>
            Create GST invoices like this
          </p>
          <a
            href="https://nexaerp.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#1a1a1a',
              background: 'linear-gradient(135deg, #D4AF37, #E8D48A)',
              padding: '8px 16px',
              borderRadius: 999,
              textDecoration: 'none',
              boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 8px rgba(0,0,0,0.25)',
            }}
          >
            Try NexaERP Free
            <span aria-hidden style={{ fontSize: 11 }}>
              →
            </span>
          </a>
        </div>
      </footer>
    </div>
  );
}
