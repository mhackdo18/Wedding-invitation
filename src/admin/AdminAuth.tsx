import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import AdminApp from './AdminApp';
import { Loader2, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export default function AdminAuth({ section }: { section: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setSubmitting(true);
    if (mode === 'register') {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) { setError(err.message); } else { setError(''); }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); }
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#faf6ee' }}>
        <Loader2 className="animate-spin" style={{ color: '#8a6d3b' }} size={28} />
      </div>
    );
  }

  if (session) return <AdminApp section={section} />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #faf6ee 0%, #f0e8d8 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(138,109,59,0.12)' }}>
            <Lock size={24} style={{ color: '#8a6d3b' }} />
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--heading-font, serif)', color: '#3a2e22' }}>Wedding Admin</h1>
          <p className="text-sm mt-1" style={{ color: '#8a7a66' }}>
            {mode === 'login' ? 'Sign in to manage your wedding site' : 'Create your admin account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-6 shadow-sm" style={{ background: '#fff', border: '1px solid #e6ddcd' }}>
          {error && (
            <div className="rounded-lg px-3 py-2 mb-4 text-sm" style={{ background: 'rgba(176,58,58,0.08)', color: '#b03a3a', border: '1px solid rgba(176,58,58,0.15)' }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6b5d4f', letterSpacing: '0.04em' }}>Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#c9b896' }} />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition" placeholder="you@email.com"
                  style={{ background: '#faf6ee', border: '1px solid #e6ddcd', color: '#3a2e22' }}
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6b5d4f', letterSpacing: '0.04em' }}>Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#c9b896' }} />
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition" placeholder="Min 6 characters"
                  style={{ background: '#faf6ee', border: '1px solid #e6ddcd', color: '#3a2e22' }}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#c9b896' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit" disabled={submitting || !email || !password}
            className="w-full mt-5 py-2.5 rounded-lg font-semibold text-sm transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#8a6d3b', color: '#fff' }}
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: '#8a7a66' }}>
          {mode === 'login' ? (
            <>First time? <button onClick={() => { setMode('register'); setError(''); }} className="font-semibold hover:underline" style={{ color: '#8a6d3b' }}>Create an account</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setError(''); }} className="font-semibold hover:underline" style={{ color: '#8a6d3b' }}>Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}
