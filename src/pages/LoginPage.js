import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import ThemeToggle from '../components/ThemeToggle';
import { AlertCircle, Loader2, ArrowRight, Shield, Zap, Globe } from 'lucide-react';
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

          <p className="text-center text-gray-600 text-xs mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
          <p className="text-center text-sm text-gray-500 mt-3">
            New business? <Link to="/signup" className="text-gold-400 hover:text-gold-300">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
