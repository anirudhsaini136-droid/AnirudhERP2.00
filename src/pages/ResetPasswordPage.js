import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import ThemeToggle from '../components/ThemeToggle';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!token) {
      setError('Invalid reset link');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setSuccess('Password reset successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. Please request a new link.');
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
      <div className="w-full max-w-md glass-card rounded-3xl p-8 lg:p-10">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-white">Reset Password</h1>
          <p className="text-gray-500 mt-2">Enter your new password</p>
        </div>

        {error && (
          <div className="mb-5 p-4 rounded-xl bg-rose/10 border border-rose/20 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose flex-shrink-0" />
            <p className="text-rose-light text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-300 text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            required
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-premium h-12"
          />
          <Input
            type="password"
            required
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-premium h-12"
          />
          <Button type="submit" disabled={loading} className="btn-premium btn-primary w-full h-12 rounded-xl">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Password'}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-5">
          Back to <Link to="/login" className="text-gold-400 hover:text-gold-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
