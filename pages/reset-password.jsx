import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { submitNewPassword } from '../lib/passwordResetClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const tokenParamRaw = typeof router.query.token === 'string' ? router.query.token : '';
  const emailParamRaw = typeof router.query.email === 'string' ? router.query.email : '';

  const token = useMemo(() => {
    try { return decodeURIComponent(tokenParamRaw || ''); } catch { return tokenParamRaw || ''; }
  }, [tokenParamRaw]);
  const email = useMemo(() => {
    try { return decodeURIComponent(emailParamRaw || ''); } catch { return emailParamRaw || ''; }
  }, [emailParamRaw]);

  const passwordValid = useMemo(() => (password || '').length >= 8, [password]);
  const confirmMatch = useMemo(() => !password || password === confirmPassword, [password, confirmPassword]);
  const formReady = passwordValid && confirmMatch && !!token && !!email;

  useEffect(() => {
    if (!router.isReady) return;
    if (!token || !email) {
      setErrorMsg('Tautan reset password tidak lengkap atau sudah kadaluarsa.');
    }
  }, [router.isReady, token, email]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!formReady || busy) return;
    setBusy(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const result = await submitNewPassword({ email, token, password });
      if (result.ok) {
        setSuccessMsg(result.data?.message || 'Password berhasil direset. Silakan login kembali.');
        setPassword('');
        setConfirmPassword('');
      } else {
        const message = result.data?.message || 'Gagal mereset password. Mohon coba lagi.';
        setErrorMsg(message);
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal mereset password. Mohon coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password Admin | Aryan Stack</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-gray-100 flex items-center justify-center px-4 py-12">
        <div className="w-[min(420px,96vw)] rounded-2xl border border-cyan-400/30 bg-slate-950/80 backdrop-blur-lg p-6 shadow-lg">
          <h1 className="text-xl font-semibold text-cyan-200 mb-2">Reset Password Admin</h1>
          <p className="text-xs text-gray-300 mb-5">
            Buat password baru untuk akun admin Anda. Pastikan password minimal 8 karakter dan tidak pernah digunakan sebelumnya.
          </p>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-gray-400 mb-1">Email Admin</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-gray-300"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-gray-400 mb-1">Token Reset</label>
              <input
                type="text"
                value={token}
                disabled
                className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-xs text-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Password Baru</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full rounded-md border border-cyan-500/30 bg-black/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan-400"
                disabled={busy}
              />
              {!passwordValid && password && <div className="text-[11px] text-red-300 mt-1">Password minimal 8 karakter.</div>}
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Konfirmasi Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full rounded-md border border-cyan-500/30 bg-black/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan-400"
                disabled={busy}
              />
              {!confirmMatch && confirmPassword && <div className="text-[11px] text-red-300 mt-1">Konfirmasi password belum cocok.</div>}
            </div>

            {errorMsg && <div className="text-xs text-red-300">{errorMsg}</div>}
            {successMsg && <div className="text-xs text-emerald-300">{successMsg}</div>}

            <button
              type="submit"
              disabled={!formReady || busy}
              className="w-full rounded-md border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60"
            >
              {busy ? 'Memproses…' : 'Simpan Password Baru'}
            </button>
          </form>
          <div className="mt-4 text-center text-xs text-gray-400">
            <Link href="/login" className="text-cyan-300 hover:text-cyan-200">Kembali ke halaman login</Link>
          </div>
        </div>
      </div>
    </>
  );
}
