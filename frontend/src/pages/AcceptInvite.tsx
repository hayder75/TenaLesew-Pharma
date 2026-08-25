import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiPost } from '../lib/api';
import { Cross, ArrowRight } from 'lucide-react';
import { errMsg } from '../lib/format';

const AcceptInvite: React.FC = () => {
  const [params] = useSearchParams();
  const code = params.get('code') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiPost('/auth/accept-invite', { code, password });
      setDone(true);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="card p-8 sm:p-10 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-ink rounded-2xl flex items-center justify-center">
            <Cross className="w-5 h-5 text-lime" strokeWidth={2.75} />
          </div>
          <div className="leading-tight">
            <p className="font-extrabold tracking-tight text-ink">TenaLesew Pharma</p>
            <p className="text-[11px] font-bold text-[#8a861f] uppercase tracking-widest">Staff invitation</p>
          </div>
        </div>

        {done ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-lime rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
            <h1 className="text-xl font-extrabold tracking-tight text-ink">You're in!</h1>
            <p className="text-sm text-stone-500 mt-2 mb-6">Your account is ready. Sign in to start working.</p>
            <Link to="/login" className="btn btn-dark w-full">Go to sign in <ArrowRight className="w-4 h-4" /></Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">Set your password</h1>
            <p className="text-sm text-stone-500 mt-1.5 mb-6">
              {code ? (
                <>You were invited with code <span className="font-mono font-bold text-ink">{code.slice(0, 4)}…</span>. Choose a password to activate your account.</>
              ) : (
                'This page needs an invitation code — use the link your admin shared.'
              )}
            </p>
            {!code && (
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">Invite code</label>
                <input className="input font-mono" placeholder="Paste your invite code" value={code} readOnly={false} disabled />
              </div>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">New password</label>
                <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">Confirm password</label>
                <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
              </div>
              {error && (
                <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl">
                  <p className="text-sm text-[#a34141] font-medium">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading || !code} className="btn btn-dark w-full !py-3.5">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Activate account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
