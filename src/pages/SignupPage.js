import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import ThemeToggle from '../components/ThemeToggle';
import { AlertCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import {
  readTrustedDeviceRecord,
  writeTrustedDeviceRecord,
  clearTrustedDeviceRecord,
  createTrustedDeviceUuid,
  trustedDeviceExpiresAtIso,
} from '../lib/trustedDevice';

export default function SignupPage() {
  const { api, login, verifyLoginOtp, verifyLoginTrustedDevice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [signInOtpStep, setSignInOtpStep] = useState(false);
  const [signInOtp, setSignInOtp] = useState('');
  const [signInOtpVerifying, setSignInOtpVerifying] = useState(false);
  const [signInOtpResendLoading, setSignInOtpResendLoading] = useState(false);
  const [rememberSignInDevice, setRememberSignInDevice] = useState(true);
  const [form, setForm] = useState({
    business_name: '',
    owner_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'India',
    password: '',
  });

  const setField = (key, value) => setForm((s) => ({ ...s, [key]: value }));

  const navigateAfterLogin = (user) => {
    const from = location.state?.from?.pathname;
    if (from) {
      navigate(from);
      return;
    }
    switch (user.role) {
      case 'super_admin':
        navigate('/super-admin');
        break;
      case 'business_owner':
        navigate('/dashboard');
        break;
      case 'hr_admin':
        navigate('/hr');
        break;
      case 'finance_admin':
        navigate('/finance');
        break;
      case 'ca_admin':
        navigate('/ca');
        break;
      case 'staff':
        navigate('/staff');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/signup/request-otp', form);
      setOtpSent(true);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Signup failed, please try again';
      if (typeof detail === 'string' && detail.toLowerCase().includes('already exists')) {
        setError('User already exists. Please login.');
      } else {
        setError(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      await api.post('/auth/signup/verify-otp', { email: form.email, otp });
      setOtp('');
      const r = await login(form.email, form.password);
      if (r?.otpRequired) {
        const em = r.email || String(form.email).trim().toLowerCase();
        const rec = readTrustedDeviceRecord(em);
        if (rec?.token && new Date(rec.expiresAt) > new Date()) {
          try {
            const td = await verifyLoginTrustedDevice(em, rec.token);
            navigateAfterLogin(td.user);
            return;
          } catch {
            clearTrustedDeviceRecord(em);
          }
        }
        setSignInOtpStep(true);
        setSignInOtp('');
        setRememberSignInDevice(true);
        return;
      }
      navigateAfterLogin(r.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'OTP verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifySignInOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSignInOtpVerifying(true);
    try {
      const newToken = rememberSignInDevice ? createTrustedDeviceUuid() : null;
      const r = await verifyLoginOtp(form.email, signInOtp, {
        rememberDevice: rememberSignInDevice,
        newTrustedDeviceToken: newToken || undefined,
      });
      if (rememberSignInDevice && newToken) {
        writeTrustedDeviceRecord(form.email, newToken, trustedDeviceExpiresAtIso());
      } else {
        clearTrustedDeviceRecord(form.email);
      }
      navigateAfterLogin(r.user);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Invalid or expired code');
    } finally {
      setSignInOtpVerifying(false);
    }
  };

  const handleResendSignInOtp = async () => {
    setError('');
    setSignInOtpResendLoading(true);
    try {
      const r = await login(form.email, form.password);
      if (r?.otpRequired) return;
      navigateAfterLogin(r.user);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Could not resend code');
    } finally {
      setSignInOtpResendLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/signup/request-otp', form);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle compact />
      </div>

      <div className="w-full max-w-2xl glass-card rounded-3xl p-8 lg:p-10">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-white">Create Your Account</h1>
          <p className="text-gray-500 mt-2">7-day free trial, then ₹399/month</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose/10 border border-rose/20 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose flex-shrink-0" />
            <p className="text-rose-light text-sm">{error}</p>
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input required className="input-premium h-12" placeholder="Business Name" value={form.business_name} onChange={(e) => setField('business_name', e.target.value)} />
              <Input required className="input-premium h-12" placeholder="Owner Name" value={form.owner_name} onChange={(e) => setField('owner_name', e.target.value)} />
              <Input required type="email" className="input-premium h-12" placeholder="Email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              <Input required className="input-premium h-12" placeholder="Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
              <Input required className="input-premium h-12 md:col-span-2" placeholder="Address" value={form.address} onChange={(e) => setField('address', e.target.value)} />
              <Input required className="input-premium h-12" placeholder="City" value={form.city} onChange={(e) => setField('city', e.target.value)} />
              <Input required className="input-premium h-12" placeholder="Country" value={form.country} onChange={(e) => setField('country', e.target.value)} />
              <Input required type="password" minLength={8} className="input-premium h-12 md:col-span-2" placeholder="Password (min 8 chars)" value={form.password} onChange={(e) => setField('password', e.target.value)} />
            </div>

            <Button type="submit" disabled={loading} className="btn-premium btn-primary w-full h-12 rounded-xl">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Send OTP <ArrowRight className="h-5 w-5 ml-2" /></>}
            </Button>
          </form>
        ) : signInOtpStep ? (
          <form onSubmit={handleVerifySignInOtp} className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
              Account created. Enter the <span className="text-gold-400">sign-in</span> code sent to{' '}
              <span className="text-gold-400">{form.email}</span>.
            </p>
            <Input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              className="input-premium h-12 text-center tracking-[0.4em] text-lg"
              placeholder="------"
              value={signInOtp}
              maxLength={6}
              onChange={(e) => setSignInOtp(e.target.value.replace(/\D/g, ''))}
            />
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-gray-400 pl-1">
              <input
                type="checkbox"
                checked={rememberSignInDevice}
                onChange={(e) => setRememberSignInDevice(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border border-gold-500/40 accent-amber-500"
              />
              <span>Remember this browser for 30 days (skip the email code next time)</span>
            </label>
            <Button
              type="submit"
              disabled={signInOtpVerifying || signInOtp.length !== 6}
              className="btn-premium btn-primary w-full h-12 rounded-xl"
            >
              {signInOtpVerifying ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Verify & sign in <ArrowRight className="h-5 w-5 ml-2" /></>
              )}
            </Button>
            <button
              type="button"
              onClick={handleResendSignInOtp}
              disabled={signInOtpResendLoading}
              className="mx-auto flex items-center gap-2 text-sm text-gray-500 hover:text-white"
            >
              <RefreshCw size={14} className={signInOtpResendLoading ? 'animate-spin' : ''} /> Resend sign-in code
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
              Enter the OTP sent to <span className="text-gold-400">{form.email}</span>
            </p>
            <Input
              required
              className="input-premium h-12 text-center tracking-[0.4em] text-lg"
              placeholder="------"
              value={otp}
              maxLength={6}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
            <Button type="submit" disabled={verifying || otp.length !== 6} className="btn-premium btn-primary w-full h-12 rounded-xl">
              {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Verify OTP & Create <ArrowRight className="h-5 w-5 ml-2" /></>}
            </Button>
            <button type="button" onClick={handleResendOtp} disabled={loading} className="mx-auto flex items-center gap-2 text-sm text-gray-500 hover:text-white">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Resend OTP
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account? <Link to="/login" className="text-gold-400 hover:text-gold-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
