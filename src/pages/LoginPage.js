import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import ThemeToggle from '../components/ThemeToggle';
import { AlertCircle, Loader2, ArrowRight, ArrowLeft, Shield, Zap, Globe, CheckCircle2, Mail, Smartphone, Download, RefreshCw } from 'lucide-react';

const BACKEND_ORIGIN =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  '';
const ENV_ANDROID_APK =
  (process.env.REACT_APP_ANDROID_APK_URL && String(process.env.REACT_APP_ANDROID_APK_URL).trim()) || '';
const DEFAULT_EAS_APK_URL = 'https://expo.dev/artifacts/eas/gPAyW3tGd8dxHEYnhLn4d8.apk';
const LOCAL_APK_FALLBACK = `${typeof window !== 'undefined' ? window.location.origin : ''}/downloads/NexaERP.apk`;
const ANDROID_STATIC_FALLBACK = ENV_ANDROID_APK || DEFAULT_EAS_APK_URL || LOCAL_APK_FALLBACK;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [androidApkHref, setAndroidApkHref] = useState(ANDROID_STATIC_FALLBACK);
  const [androidApkVersion, setAndroidApkVersion] = useState('');
  const [apkInfoLoading, setApkInfoLoading] = useState(true);
  const [authStep, setAuthStep] = useState('credentials');
  const [otpEmail, setOtpEmail] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpResendLoading, setOtpResendLoading] = useState(false);

  const { login, verifyLoginOtp } = useAuth();
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlEmail = params.get('email');
    const urlPassword = params.get('password');
    if (urlEmail) setEmail(urlEmail);
    if (urlPassword) setPassword(urlPassword);
    if (urlEmail && urlPassword) {
      setTimeout(() => {
        document.getElementById('nexa-login-btn')?.click();
      }, 500);
    }
  }, []);

  useEffect(() => {
    if (ENV_ANDROID_APK) {
      setApkInfoLoading(false);
      return undefined;
    }
    const base = (BACKEND_ORIGIN || '').replace(/\/$/, '');
    if (!base) {
      setApkInfoLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${base}/api/app/latest-apk`);
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        if (cancelled) return;
        if (j?.url) setAndroidApkHref(j.url);
        const v = j?.version;
        if (v != null && String(v).trim() !== '') setAndroidApkVersion(String(v).trim());
      } catch {
        /* keep fallback href */
      } finally {
        if (!cancelled) setApkInfoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const navigateAfterLogin = (user) => {
    const from = location.state?.from?.pathname;
    if (from) { navigate(from); return; }
    switch (user.role) {
      case 'super_admin': navigate('/super-admin'); break;
      case 'business_owner': navigate('/dashboard'); break;
      case 'hr_admin': navigate('/hr'); break;
      case 'finance_admin': navigate('/finance'); break;
      case 'ca_admin': navigate('/ca'); break;
      case 'staff': navigate('/staff'); break;
      default: navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await login(email, password);
      if (r?.otpRequired) {
        setAuthStep('otp');
        setOtpEmail(r.email || String(email).trim().toLowerCase());
        setLoginOtp('');
        return;
      }
      navigateAfterLogin(r.user);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    setError('');
    setOtpVerifying(true);
    try {
      const r = await verifyLoginOtp(otpEmail, loginOtp);
      navigateAfterLogin(r.user);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Invalid or expired code');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleResendLoginOtp = async () => {
    setError('');
    setOtpResendLoading(true);
    try {
      const r = await login(otpEmail, password);
      if (r?.otpRequired) return;
      navigateAfterLogin(r.user);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Could not resend code');
    } finally {
      setOtpResendLoading(false);
    }
  };

  const backToCredentials = () => {
    setAuthStep('credentials');
    setLoginOtp('');
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-obsidian relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-gold-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Top banner: Android app + download (theme toggle matches dashboard compact control) */}
      <header
        className={`relative z-30 w-full shrink-0 border-b backdrop-blur-md ${
          isLight
            ? 'border-slate-200/80 bg-white/85 text-slate-900'
            : 'border-white/10 bg-void/80 text-white'
        }`}
      >
        <div className="mx-auto flex max-w-[2000px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-11 sm:w-11"
              style={{
                background: 'linear-gradient(145deg, rgba(61,220,132,0.14), rgba(61,220,132,0.06))',
                borderColor: 'rgba(61,220,132,0.35)',
              }}
              aria-hidden
            >
              <Smartphone className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={2} style={{ color: '#3DDC84' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-semibold tracking-tight sm:text-[15px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                NexaERP for Android
              </p>
              <p className={`hidden text-xs sm:block ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                Native app · same login as this portal · direct APK
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={androidApkHref}
                download="NexaERP.apk"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 px-3.5 text-sm font-semibold text-[#111] shadow-md shadow-gold-500/20 no-underline transition hover:brightness-105 active:scale-[0.98] sm:h-10 sm:px-4"
              >
                <Download className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span>Download</span>
              </a>
              {apkInfoLoading ? (
                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>…</span>
              ) : androidApkVersion ? (
                <span
                  className={`inline-flex tabular-nums rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/15 bg-white/5 text-gray-400'
                  }`}
                  title="Latest EAS build version"
                >
                  v{androidApkVersion}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pl-1">
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 w-full overflow-hidden">
      {/* Left Panel - Hero */}
      <div className="hidden lg:flex lg:w-3/5 relative">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80"
            alt="Modern Architecture"
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-r from-white/45 via-slate-100/35 to-white/20' : 'bg-gradient-to-r from-obsidian via-obsidian/95 to-obsidian/70'}`} />
          <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-t from-slate-100/60 via-transparent to-transparent' : 'bg-gradient-to-t from-obsidian via-transparent to-transparent'}`} />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <h1 className={`font-display text-4xl tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Nexa<span className="text-gold">ERP</span>
            </h1>
          </div>
          <div className="max-w-xl">
            <h2 className={`font-display text-5xl leading-tight mb-6 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Enterprise Excellence,<br />
              <span className="text-gold italic">Simplified.</span>
            </h2>
            <p className={`text-lg leading-relaxed mb-10 ${isLight ? 'text-slate-700' : 'text-gray-400'}`}>
              The next generation of business management. Streamline HR, Finance,
              and Operations with India's most sophisticated ERP platform.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Shield, text: 'Bank-Grade Security' },
                { icon: Zap, text: 'Real-time Analytics' },
                { icon: Globe, text: 'Multi-Branch Support' },
              ].map((feature, idx) => (
                <div key={idx} className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm ${isLight ? 'bg-white/70 border border-slate-300/70' : 'bg-white/5 border border-white/10'}`}>
                  <feature.icon className="w-4 h-4 text-gold" strokeWidth={1.5} />
                  <span className={`text-sm ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-12">
            {[
              { value: '₹500Cr+', label: 'Managed Monthly' },
              { value: '10,000+', label: 'Active Users' },
              { value: '99.9%', label: 'Uptime SLA' },
            ].map((stat, idx) => (
              <div key={idx}>
                <p className={`text-3xl font-display ${isLight ? 'text-slate-900' : 'text-white'}`}>{stat.value}</p>
                <p className={`text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-gray-500'}`}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-10">
            <h1 className={`font-display text-3xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Nexa<span className="text-gold">ERP</span>
            </h1>
          </div>

          <div className="glass-card rounded-3xl p-8 lg:p-10 animate-fade-in">
            <div className="text-center mb-10">
              <h2 className={`font-display text-2xl mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {authStep === 'otp' ? 'Check your email' : 'Welcome Back'}
              </h2>
              <p className={isLight ? 'text-slate-600' : 'text-gray-500'}>
                {authStep === 'otp'
                  ? `Enter the 6-digit code sent to ${otpEmail}`
                  : 'Sign in to continue to your dashboard'}
              </p>
            </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose/10 border border-rose/20 flex items-center gap-3 animate-scale-in">
                  <AlertCircle className="h-5 w-5 text-rose flex-shrink-0" />
                  <p className="text-rose-light text-sm">{error}</p>
                </div>
              )}

            {authStep === 'credentials' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400 pl-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-premium h-14 text-base"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400 pl-1">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-premium h-14 text-base"
                />
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setForgotMsg(''); setShowForgot(true); }}
                    className="text-xs text-gold-400 hover:text-gold-300"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
              <Button
                id="nexa-login-btn"
                type="submit"
                disabled={loading}
                className="btn-premium btn-primary w-full h-14 text-base rounded-xl"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Sign In <ArrowRight className="h-5 w-5 ml-2" /></>
                )}
              </Button>
            </form>
            ) : (
            <form onSubmit={handleVerifyLoginOtp} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400 pl-1">Verification code</label>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="------"
                  value={loginOtp}
                  maxLength={6}
                  onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  className="input-premium h-14 text-center text-base tracking-[0.35em]"
                />
              </div>
              <Button
                type="submit"
                disabled={otpVerifying || loginOtp.length !== 6}
                className="btn-premium btn-primary w-full h-14 text-base rounded-xl"
              >
                {otpVerifying ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Verify & continue <ArrowRight className="h-5 w-5 ml-2" /></>
                )}
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={backToCredentials}
                  className={`inline-flex items-center justify-center gap-2 text-sm ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}
                >
                  <ArrowLeft className="h-4 w-4" /> Different account
                </button>
                <button
                  type="button"
                  onClick={handleResendLoginOtp}
                  disabled={otpResendLoading}
                  className={`inline-flex items-center justify-center gap-2 text-sm ${isLight ? 'text-gold-600 hover:text-gold-700' : 'text-gold-400 hover:text-gold-300'}`}
                >
                  <RefreshCw className={`h-4 w-4 ${otpResendLoading ? 'animate-spin' : ''}`} />
                  Resend code
                </button>
              </div>
            </form>
            )}

            {process.env.NODE_ENV === 'development' ? (
              <p className="text-[10px] text-gray-600 mt-6 font-mono leading-relaxed">
                Dev: place <code className="text-gray-500">NexaERP.apk</code> in{' '}
                <code className="text-gray-500">public/downloads/</code> or set{' '}
                <code className="text-gray-500">REACT_APP_ANDROID_APK_URL</code>.
              </p>
            ) : null}

            <div className={`mt-8 pt-6 border-t ${isLight ? 'border-slate-200/90' : 'border-white/10'}`}>
              <p className={`text-center text-sm font-medium ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>
                New to NexaERP?
              </p>
              <Link
                to="/signup"
                className={`mt-3 flex h-12 w-full items-center justify-center rounded-xl border-2 text-[15px] font-bold tracking-tight no-underline transition hover:brightness-110 active:scale-[0.99] ${
                  isLight
                    ? 'border-gold-500/55 bg-gradient-to-b from-gold-100/90 to-gold-200/50 text-amber-950 shadow-sm shadow-amber-900/10 hover:border-gold-500'
                    : 'border-gold-500/45 bg-gold-500/10 text-gold-300 shadow-md shadow-black/20 hover:border-gold-400/60 hover:bg-gold-500/15 hover:text-gold-200'
                }`}
              >
                Create account
              </Link>
            </div>
          </div>

          <p className={`text-center text-xs mt-6 ${isLight ? 'text-slate-500' : 'text-gray-600'}`}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
      </div>

      <ForgotPasswordDialog
        open={showForgot}
        onOpenChange={setShowForgot}
        initialEmail={forgotEmail}
        setInitialEmail={setForgotEmail}
        forgotLoading={forgotLoading}
        setForgotLoading={setForgotLoading}
        forgotMsg={forgotMsg}
        setForgotMsg={setForgotMsg}
      />
    </div>
  );
};

function ForgotPasswordDialog({
  open,
  onOpenChange,
  initialEmail,
  setInitialEmail,
  forgotLoading,
  setForgotLoading,
  forgotMsg,
  setForgotMsg,
}) {
  const { api } = useAuth();
  const success = forgotMsg.toLowerCase().includes('reset link sent');

  const submitForgot = async (e) => {
    e.preventDefault();
    setForgotMsg('');
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: initialEmail });
      setForgotMsg('Reset link sent to your email if account exists.');
    } catch (err) {
      setForgotMsg(err.response?.data?.detail || 'Unable to send reset link right now.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-void border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-white">Forgot Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={submitForgot} className="space-y-4">
          {!success ? (
            <>
              <Input
                type="email"
                required
                className="input-premium h-12"
                placeholder="Enter your account email"
                value={initialEmail}
                onChange={(e) => setInitialEmail(e.target.value)}
              />
              <Button type="submit" disabled={forgotLoading} className="btn-premium btn-primary w-full h-12 rounded-xl">
                {forgotLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Reset Link'}
              </Button>
            </>
          ) : (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-sm text-emerald-300 font-medium">Reset link sent</p>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Check your inbox and spam folder. The link expires in 1 hour.
                  </p>
                </div>
              </div>
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-xs text-gold-300 hover:text-gold-200"
              >
                <Mail size={13} /> Open Gmail
              </a>
            </div>
          )}
          {forgotMsg && !success && <p className="text-xs text-gray-400 text-center">{forgotMsg}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default LoginPage;
