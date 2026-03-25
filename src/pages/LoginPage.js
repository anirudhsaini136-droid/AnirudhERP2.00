import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import ThemeToggle from '../components/ThemeToggle';
import { AlertCircle, Loader2, ArrowRight, Shield, Zap, Globe, CheckCircle2, Mail, Smartphone, Download } from 'lucide-react';

const BACKEND_ORIGIN =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  '';
const ANDROID_APK_URL =
  (process.env.REACT_APP_ANDROID_APK_URL && String(process.env.REACT_APP_ANDROID_APK_URL).trim()) ||
  `${typeof window !== 'undefined' ? window.location.origin : ''}/downloads/NexusERP.apk`;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const { login } = useAuth();
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
        document.getElementById('nexus-login-btn')?.click();
      }, 500);
    }
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
      const user = await login(email, password);
      navigateAfterLogin(user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-obsidian relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-gold-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

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
              Nexus<span className="text-gold">ERP</span>
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
              Nexus<span className="text-gold">ERP</span>
            </h1>
          </div>

          <div className="glass-card rounded-3xl p-8 lg:p-10 animate-fade-in">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl text-white mb-2">Welcome Back</h2>
              <p className="text-gray-500">Sign in to continue to your dashboard</p>
            </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose/10 border border-rose/20 flex items-center gap-3 animate-scale-in">
                  <AlertCircle className="h-5 w-5 text-rose flex-shrink-0" />
                  <p className="text-rose-light text-sm">{error}</p>
                </div>
              )}

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
                id="nexus-login-btn"
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

            {/* Native Android — polished download card */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <div
                className={`relative overflow-hidden rounded-2xl border p-5 shadow-lg ${
                  isLight
                    ? 'border-slate-200/90 bg-gradient-to-br from-white via-slate-50/90 to-slate-100/50 shadow-slate-900/5'
                    : 'border-white/10 bg-gradient-to-br from-gold-500/[0.08] via-white/[0.03] to-transparent shadow-black/25'
                }`}
              >
                <div
                  className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl ${
                    isLight ? 'bg-gold-500/15' : 'bg-gold-500/20'
                  }`}
                  aria-hidden
                />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        isLight
                          ? 'border-gold-600/25 bg-gold-500/10 text-amber-800'
                          : 'border-gold-500/30 bg-gold-500/10 text-gold-400'
                      }`}
                    >
                      <Smartphone className="h-3 w-3" strokeWidth={2} />
                      Android
                    </span>
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider ${
                        isLight ? 'text-slate-500' : 'text-gray-500'
                      }`}
                    >
                      Same account · One backend
                    </span>
                  </div>
                  <h3 className={`font-display text-lg tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Get the NexusERP app
                  </h3>
                  <p className={`text-sm mt-1.5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                    Install on your phone for a native experience. Your login, roles, and data stay aligned with this
                    portal—no separate signup.
                  </p>
                  <ul className={`mt-4 space-y-2 text-sm ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    {[
                      'Use your existing email and password',
                      'Built for the same API as this website',
                      'Install once—direct download (APK)',
                    ].map((line) => (
                      <li key={line} className="flex gap-2.5">
                        <CheckCircle2
                          className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isLight ? 'text-amber-600' : 'text-gold-400'}`}
                          strokeWidth={2}
                        />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={ANDROID_APK_URL}
                    download="NexusERP.apk"
                    className="mt-5 btn-premium btn-primary w-full h-14 rounded-xl inline-flex items-center justify-center gap-2.5 text-base font-semibold no-underline transition-transform hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Download className="h-5 w-5" strokeWidth={2} />
                    Download for Android
                  </a>
                  <p className={`text-center text-[11px] mt-3 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                    Direct install · Works alongside the web app · Android 8+
                  </p>
                  {(typeof window !== 'undefined' ? window.location.origin : '') && (
                    <div
                      className={`mt-4 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed ${
                        isLight
                          ? 'border-slate-200 bg-slate-50/80 text-slate-600'
                          : 'border-white/10 bg-white/[0.03] text-gray-500'
                      }`}
                    >
                      <span className={`font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                        You are signing in to
                      </span>
                      <p className={`mt-1 font-medium break-all ${isLight ? 'text-slate-800' : 'text-gray-400'}`}>
                        {typeof window !== 'undefined' ? window.location.origin : '—'}
                      </p>
                      {BACKEND_ORIGIN ? (
                        <>
                          <span
                            className={`mt-2 block font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-gray-500'}`}
                          >
                            API
                          </span>
                          <p className={`font-medium break-all ${isLight ? 'text-slate-800' : 'text-gray-400'}`}>
                            {BACKEND_ORIGIN}/api
                          </p>
                        </>
                      ) : null}
                    </div>
                  )}
                  {process.env.NODE_ENV === 'development' ? (
                    <p className="text-[10px] text-gray-600 mt-3 font-mono leading-relaxed">
                      Dev: place <code className="text-gray-500">NexusERP.apk</code> in{' '}
                      <code className="text-gray-500">public/downloads/</code> or set{' '}
                      <code className="text-gray-500">REACT_APP_ANDROID_APK_URL</code>.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
          <p className="text-center text-sm text-gray-500 mt-3">
            New business? <Link to="/signup" className="text-gold-400 hover:text-gold-300">Create account</Link>
          </p>
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
