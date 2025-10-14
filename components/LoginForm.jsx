"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/router';
import { requestPasswordReset } from '../lib/passwordResetClient';
import { ensureAdminProfile } from '../lib/adminApi';

export default function LoginForm() {
  const { signInWithGoogle, emailLogin, emailSignup, themeDark, setThemeDark, loading, user, initError } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuggestSignup, setResetSuggestSignup] = useState(false);

  // Real-time validation
  useEffect(() => {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) e.email = 'Email tidak valid';
    if ((password || '').length < 8) e.password = 'Password minimal 8 karakter';
    setErrors(e);
  }, [email, password]);

  useEffect(() => {
    if (resetOpen) {
      setResetEmail(email || '');
      setResetSuccess('');
      setResetError('');
      setResetSuggestSignup(false);
    }
  }, [resetOpen, email]);

  const canSubmit = useMemo(() => !errors.email && !errors.password && email && password, [errors, email, password]);
  const resetEmailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail || ''), [resetEmail]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true); setMsg('');
    try {
      if (mode === 'login') {
        await emailLogin(email, password);
      } else {
        const cred = await emailSignup(email, password);
        try {
          await ensureAdminProfile({
            email: email.trim().toLowerCase(),
            uid: cred?.user?.uid || null,
            displayName: cred?.user?.displayName || null,
          });
        } catch (ensureErr) {
          console.warn('ensureAdminProfile (signup) failed:', ensureErr?.message || ensureErr);
        }
      }
    } catch (err) {
      const code = err?.code ? ` (${err.code})` : '';
      setMsg((err?.message || 'Gagal otentikasi') + code);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true); setMsg('');
    try { await signInWithGoogle(); } catch (err) { const code = err?.code ? ` (${err.code})` : ''; setMsg((err?.message || 'Gagal login Google') + code); } finally { setBusy(false); }
  };

  const onResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmailValid || resetBusy) return;
    setResetBusy(true);
    setResetSuccess('');
    setResetError('');
    setResetSuggestSignup(false);
    try {
      const result = await requestPasswordReset(resetEmail);
      if (result.ok) {
        setResetSuccess(result.data?.message || 'Jika email terdaftar, silakan cek inbox Anda untuk tautan reset.');
      } else {
        const message = result.data?.message || 'Gagal memproses permintaan reset password.';
        if (result.status === 404) {
          setResetSuggestSignup(true);
        }
        setResetError(message);
      }
    } catch (err) {
      setResetError(err?.message || 'Gagal memproses permintaan reset password.');
    } finally {
      setResetBusy(false);
    }
  };

  // Redirect when authenticated
  useEffect(() => {
    if (!loading && user) {
      router.replace('/admin-dashboard');
    }
  }, [loading, user, router]);

  if (initError) {
    return (
      <div className="min-h-screen grid place-items-center bg-black text-gray-100 p-6">
        <div className="max-w-md w-full rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center">
          <div className="text-lg font-semibold text-red-200 mb-2">Auth configuration error</div>
          <div className="text-sm text-red-300 mb-4">{initError}</div>
          <div className="text-xs text-gray-400">Check your environment variables in .env.local and rebuild.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center relative bg-white text-gray-900 dark:bg-black dark:text-gray-100">
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
        <div className="absolute inset-0 bg-white/50 dark:bg-black/70" />
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-[min(440px,92vw)]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-cyan-600 dark:text-cyan-300">Admin Login</h1>
          <button
            onClick={() => setThemeDark(!themeDark)}
            className="px-3 py-1.5 rounded-md text-xs border transition-colors bg-black/5 border-black/10 hover:bg-black/10 dark:bg-white/10 dark:border-white/20 dark:hover:bg-white/15"
          >{themeDark ? 'Dark' : 'Light'}</button>
        </div>
        <motion.form onSubmit={onSubmit} className="relative rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-cyan-500/40">
          <div className="rounded-2xl border border-black/10 bg-white/70 backdrop-blur-md p-4 md:p-6 dark:border-white/10 dark:bg-black/60">
            <div className="flex gap-2 mb-4">
              {['login','signup'].map((m) => (
        <button key={m} type="button" onClick={() => setMode(m)} className={`px-3 py-1.5 rounded-md border text-sm ${mode===m?'bg-cyan-500/20 border-cyan-400/40 text-cyan-700 dark:text-cyan-200':'bg-black/5 border-black/10 text-gray-700 hover:bg-black/10 dark:bg-white/5 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/10'}`}>
                  {m==='login'?'Login':'Sign Up'}
                </button>
              ))}
            </div>
      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Email</label>
      <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full bg-white/60 border border-black/10 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-400 dark:bg-black/40 dark:border-white/10" placeholder="you@example.com" />
            {errors.email && <div className="text-xs text-red-300 mt-1">{errors.email}</div>}

      <div className="mt-3 mb-1 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
        <span>Password</span>
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-300 dark:hover:text-cyan-200 underline decoration-dotted"
        >Lupa password?</button>
      </div>
      <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full bg-white/60 border border-black/10 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-400 dark:bg-black/40 dark:border-white/10" placeholder="••••••••" />
            {errors.password && <div className="text-xs text-red-300 mt-1">{errors.password}</div>}

            <button disabled={!canSubmit || busy || loading} className="mt-4 w-full px-3 py-2 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-800 hover:bg-emerald-600/30 disabled:opacity-60 dark:text-emerald-200">
              {busy ? 'Processing…' : (mode==='login' ? 'Login' : 'Create Account')}
            </button>

            <div className="my-3 text-center text-xs text-gray-400">or</div>
            <button type="button" onClick={onGoogle} disabled={busy || loading} className="w-full px-3 py-2 rounded-md bg-black/5 border border-black/10 hover:bg-black/10 disabled:opacity-60 dark:bg-white/10 dark:border-white/20 dark:hover:bg-white/15">
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
              <div className="absolute inset-0 bg-white/50 dark:bg-black/70 backdrop-blur-sm" />
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

        {/* Dialog lupa password */}
        <AnimatePresence>
          {resetOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => { if (!resetBusy) setResetOpen(false); }}
              />
              <motion.div
                initial={{ scale: 0.9, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative z-10 w-[min(420px,92vw)] rounded-2xl border border-cyan-400/40 bg-black/80 p-6 text-gray-100"
              >
                <h2 className="text-lg font-semibold text-cyan-200 mb-2">Lupa Password Admin</h2>
                <p className="text-xs text-gray-300 mb-4">
                  Masukkan email admin yang terdaftar. Sistem akan mengirim link reset yang berlaku 10 menit + kode OTP untuk verifikasi 2 faktor.
                </p>
                <form onSubmit={onResetSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Email Admin</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full rounded-md border border-cyan-500/40 bg-black/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan-400"
                      placeholder="admin@example.com"
                      disabled={resetBusy}
                    />
                  </div>
                  {resetError && <div className="text-xs text-red-300">{resetError}</div>}
                  {resetSuccess && <div className="text-xs text-emerald-300">{resetSuccess}</div>}
                  {resetSuggestSignup && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setEmail(resetEmail);
                        setResetOpen(false);
                      }}
                      className="text-xs text-cyan-200 underline decoration-dotted hover:text-cyan-100"
                      disabled={resetBusy}
                    >
                      Buat akun sekarang
                    </button>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="submit"
                      disabled={!resetEmailValid || resetBusy}
                      className="rounded-md border border-cyan-400/40 bg-cyan-500/20 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-60"
                    >
                      {resetBusy ? 'Mengirim…' : 'Kirim Link Reset'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (!resetBusy) setResetOpen(false); }}
                      className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
                      disabled={resetBusy}
                    >
                      Batal
                    </button>
                  </div>
                </form>
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
