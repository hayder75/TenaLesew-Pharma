import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Cross, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { errMsg } from '../lib/format';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await login(username, password);
      navigate(session.user.role === 'SUPER_ADMIN' ? '/platform' : '/dashboard');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const demoUsers = [
    { username: 'superadmin', password: 'Hayder2026!', role: 'Super Admin', access: 'Platform console' },
    { username: 'owner', password: 'Owner2026!', role: 'Owner', access: 'Full pharmacy access' },
    { username: 'manager', password: 'Staff2026!', role: 'Branch Manager', access: 'Branch operations' },
    { username: 'pharmacist', password: 'Staff2026!', role: 'Pharmacist', access: 'POS, prescriptions' },
    { username: 'cashier', password: 'Staff2026!', role: 'Cashier', access: 'POS only' },
    { username: 'inventory', password: 'Staff2026!', role: 'Inventory Manager', access: 'Stock & suppliers' },
  ];

  return (
    <div className="min-h-screen bg-cream flex items-stretch p-3 sm:p-5 gap-5">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[46%] card-dark !rounded-[28px] relative overflow-hidden flex-col justify-between p-10">
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-lime/15 rounded-full" />
        <div className="absolute bottom-24 -right-20 w-72 h-72 bg-lime/10 rounded-full" />
        <div className="absolute top-1/3 right-16 w-10 h-10 bg-sun rounded-2xl rotate-12 opacity-80" />
        <div className="absolute bottom-16 left-16 w-6 h-6 bg-sky rounded-full opacity-70" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 bg-lime rounded-2xl flex items-center justify-center">
            <Cross className="w-5 h-5 text-ink" strokeWidth={2.75} />
          </div>
          <div className="leading-tight">
            <p className="font-extrabold tracking-tight text-white">TenaLesew</p>
            <p className="text-[11px] font-bold text-lime uppercase tracking-widest">Pharma</p>
          </div>
        </div>

        <div className="relative">
          <h1 className="text-[42px] leading-[1.1] font-extrabold tracking-tight text-white">
            Health made <span className="text-lime">simple</span>,<br />
            for every branch.
          </h1>
          <p className="text-white/50 mt-4 max-w-sm">
            The multi-branch pharmacy platform — sales, stock, prescriptions and finance in one calm place.
          </p>
        </div>

        <p className="relative text-xs text-white/30">© {new Date().getFullYear()} TenaLesew Pharma · Addis Ababa</p>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-[54%] flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md py-6">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-11 h-11 bg-ink rounded-2xl flex items-center justify-center">
              <Cross className="w-5 h-5 text-lime" strokeWidth={2.75} />
            </div>
            <p className="font-extrabold text-xl tracking-tight text-ink">TenaLesew Pharma</p>
          </div>

          <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-ink leading-tight">
            Welcome <span className="bg-lime px-2 rounded-lg">back!</span>
          </h2>
          <p className="text-stone-500 mt-2 text-sm">Sign in to your pharmacy workspace.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input" placeholder="Enter your username" required />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input !pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-ink"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl">
                <p className="text-sm text-[#a34141] font-medium">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-dark w-full !py-3.5 !text-base">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Sign In <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Demo accounts — click to fill</p>
            <div className="space-y-2">
              {demoUsers.map((demo) => (
                <button
                  key={demo.username}
                  type="button"
                  onClick={() => {
                    setUsername(demo.username);
                    setPassword(demo.password);
                  }}
                  className="w-full p-3 bg-white border border-line rounded-2xl hover:border-lime hover:shadow-card transition-all text-left flex items-center justify-between group"
                >
                  <div>
                    <p className="font-bold text-sm text-ink">{demo.role}</p>
                    <p className="text-xs text-stone-400">{demo.access}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-ink font-mono">{demo.username}</p>
                    <p className="text-[11px] text-stone-400 font-mono">{demo.password}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
