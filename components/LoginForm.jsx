"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthProvider';

export default function LoginForm() {
  const { signInWithGoogle, emailLogin, emailSignup, themeDark, setThemeDark, loading, user } = useAuth();
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });

  // Real-time validation
  useEffect(() => {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) e.email = 'Email tidak valid';
    if ((password || '').length < 8) e.password = 'Password minimal 8 karakter';
    setErrors(e);
  }, [email, password]);

  const canSubmit = useMemo(() => !errors.email && !errors.password && email && password, [errors, email, password]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true); setMsg('');
    try {
      if (mode === 'login') await emailLogin(email, password);
      else await emailSignup(email, password);
    } catch (err) {
      setMsg(err?.message || 'Gagal otentikasi');
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true); setMsg('');
    try { await signInWithGoogle(); } catch (err) { setMsg(err?.message || 'Gagal login Google'); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-black relative text-gray-100">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{
          background: `radial-gradient(900px 500px at 50% 10%, rgba(34,211,238,0.15), transparent 60%), radial-gradient(700px 500px at 80% 20%, rgba(232,121,249,0.12), transparent 70%)`
        }} />
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: `linear-gradient(transparent 96%, rgba(148,163,184,0.2) 97%), linear-gradient(90deg, transparent 96%, rgba(148,163,184,0.2) 97%)`,
          backgroundSize: '40px 40px',
          transform: 'perspective(800px) rotateX(45deg) translateY(-10%)',
          transformOrigin: 'top center'
        }} />
        <div className="absolute inset-0 bg-black/70" />
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-[min(440px,92vw)]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-cyan-300">Admin Login</h1>
          <button
            onClick={() => setThemeDark(!themeDark)}
            className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-xs hover:bg-white/15"
          >{themeDark ? 'Dark' : 'Light'}</button>
        </div>
        <motion.form onSubmit={onSubmit} className="relative rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-cyan-500/40">
          <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md p-4 md:p-6">
            <div className="flex gap-2 mb-4">
              {['login','signup'].map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} className={`px-3 py-1.5 rounded-md border text-sm ${mode===m?'bg-cyan-500/20 border-cyan-400/40 text-cyan-200':'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'}`}>
                  {m==='login'?'Login':'Sign Up'}
                </button>
              ))}
            </div>
            <label className="block text-xs text-gray-300 mb-1">Email</label>
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-400" placeholder="you@example.com" />
            {errors.email && <div className="text-xs text-red-300 mt-1">{errors.email}</div>}

            <label className="block text-xs text-gray-300 mt-3 mb-1">Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-400" placeholder="••••••••" />
            {errors.password && <div className="text-xs text-red-300 mt-1">{errors.password}</div>}

            <button disabled={!canSubmit || busy} className="mt-4 w-full px-3 py-2 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-60">
              {busy ? 'Processing…' : (mode==='login' ? 'Login' : 'Create Account')}
            </button>

            <div className="my-3 text-center text-xs text-gray-400">or</div>
            <button type="button" onClick={onGoogle} disabled={busy} className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15">
              Continue with Google
            </button>

            <AnimatePresence>
              {msg && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-3 text-sm text-red-300">
                  {msg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.form>

        {/* Loading overlay */}
        <AnimatePresence>
          {(busy || loading) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 grid place-items-center z-40">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.96, y: 6 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0 }} className="relative z-10 w-[min(420px,92vw)] rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-cyan-500/10 via-slate-900/60 to-black/70 p-6 text-center">
                <div className="relative mx-auto h-20 w-20">
                  <div className="absolute inset-0 rounded-full border border-cyan-400/30" />
                  <div className="absolute inset-0 rounded-full border-t-2 border-cyan-300 animate-spin" />
                </div>
                <div className="mt-3 text-cyan-200">Authorizing<span className="animate-pulse">…</span></div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* reCAPTCHA badge note (v3) */}
        <div className="mt-3 text-center text-[10px] text-gray-500">Protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.</div>
      </motion.div>
    </div>
  );
}
