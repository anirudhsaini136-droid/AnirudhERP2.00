import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import ThemeToggle from '../components/ThemeToggle';
import { AlertCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

export default function SignupPage() {
  const { api, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/signup/request-otp', form);
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed, please try again');
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
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'OTP verification failed');
    } finally {
      setVerifying(false);
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
        <ThemeToggle />
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
