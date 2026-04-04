import React, { useId } from 'react';

function NexaerpFooterLogo({ size = 24, gradientId }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5E6B3" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#9A7B2C" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="26" height="26" rx="7" fill={`url(#${gradientId})`} opacity="0.12" />
      <path
        d="M9 23V9h3.2l5.8 9.2L23.8 9H27v14h-2.8V13.5L18.2 23h-4.4L11.8 13.5V23H9z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

/**
 * Subtle branding footer for public pages (invoice view, payment portal). Hidden when printing.
 */
export default function NexaerpPublicFooter() {
  const uid = useId().replace(/:/g, '');
  const gradientId = `nexa-gold-${uid}`;

  return (
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
          <NexaerpFooterLogo size={24} gradientId={gradientId} />
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
  );
}
