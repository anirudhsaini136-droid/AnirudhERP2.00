import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { AlertCircle, Loader2, ArrowRight, Shield, Zap, Globe, Mail, RefreshCw } from 'lucide-react';
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP state
  const [step, setStep] = useState('login'); // 'login' | 'otp'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpEmail, setOtpEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  const { login, api } = useAuth();
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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

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
      const res = await api.post('/auth/login', { email, password });
      if (res.data.otp_required) {
        setOtpEmail(res.data.email);
        setStep('otp');
        setResendCooldown(60);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        // Non-OTP roles (staff, hr_admin etc) — direct login
        const user = await login(email, password);
        navigateAfterLogin(user);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val.slice(-1);
    setOtp(newOtp);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (newOtp.every(d => d !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
      handleVerifyOtp(pasted);
    }
  };

  const handleVerifyOtp = async (otpValue) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', {
        email: otpEmail,
        otp: otpValue
      });
      // Store tokens — use same keys as AuthContext
      const tokenKey = 'token'; // matches AuthContext
      localStorage.setItem(tokenKey, res.data.access_token);
      localStorage.setItem('refreshToken', res.data.refresh_token);
      // Hard navigate to trigger AuthContext reload
      const role = res.data.user?.role;
      if (role === 'super_admin') window.location.href = '/super-admin';
      else if (role === 'ca_admin') window.location.href = '/ca';
      else window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    setError('');
    try {
      await api.post('/auth/login', { email, password });
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-obsidian relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-gold-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Left Panel - Hero */}
      <div className="hidden lg:flex lg:w-3/5 relative">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80"
            alt="Modern Architecture"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/95 to-obsidian/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <h1 className="font-display text-4xl text-white tracking-tight">
              Nexus<span className="text-gold">ERP</span>
            </h1>
          </div>
          <div className="max-w-xl">
            <h2 className="font-display text-5xl text-white leading-tight mb-6">
              Enterprise Excellence,<br />
              <span className="text-gold italic">Simplified.</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-10">
              The next generation of business management. Streamline HR, Finance,
              and Operations with India's most sophisticated ERP platform.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Shield, text: 'Bank-Grade Security' },
                { icon: Zap, text: 'Real-time Analytics' },
                { icon: Globe, text: 'Multi-Branch Support' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                  <feature.icon className="w-4 h-4 text-gold" strokeWidth={1.5} />
                  <span className="text-sm text-gray-300">{feature.text}</span>
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
                <p className="text-3xl font-display text-white">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-10">
            <h1 className="font-display text-3xl text-white">
              Nexus<span className="text-gold">ERP</span>
            </h1>
          </div>

          {/* ── LOGIN STEP ── */}
          {step === 'login' && (
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
            </div>
          )}

          {/* ── OTP STEP ── */}
          {step === 'otp' && (
            <div className="glass-card rounded-3xl p-8 lg:p-10 animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mx-auto mb-4">
                  <Mail size={28} className="text-gold-400" />
                </div>
                <h2 className="font-display text-2xl text-white mb-2">Verify Your Identity</h2>
                <p className="text-gray-500 text-sm">
                  We've sent a 6-digit OTP to<br />
                  <span className="text-white font-medium">{otpEmail}</span>
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose/10 border border-rose/20 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-rose flex-shrink-0" />
                  <p className="text-rose-light text-sm">{error}</p>
                </div>
              )}

              {/* OTP Input Boxes */}
              <div className="flex gap-3 justify-center mb-8" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => otpRefs.current[idx] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-white/10 bg-white/[0.05] text-white focus:outline-none focus:border-gold-500 focus:bg-white/[0.08] transition-all"
                    disabled={loading}
                  />
                ))}
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-4">
                  <Loader2 size={16} className="animate-spin" />
                  Verifying...
                </div>
              )}

              {/* Resend */}
              <div className="text-center space-y-3">
                <button
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resendLoading}
                  className="flex items-center gap-2 mx-auto text-sm text-gray-500 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={13} className={resendLoading ? 'animate-spin' : ''} />
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                </button>
                <button
                  onClick={() => { setStep('login'); setError(''); setOtp(['','','','','','']); }}
                  className="block mx-auto text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  ← Back to login
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-gray-600 text-xs mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
