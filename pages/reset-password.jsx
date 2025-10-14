import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { requestOTP, verifyOTP, submitNewPassword } from '../lib/passwordResetClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: request OTP, 2: verify OTP, 3: set password
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [isLocked, setIsLocked] = useState(false);

  const tokenParamRaw = typeof router.query.token === 'string' ? router.query.token : '';
  const emailParamRaw = typeof router.query.email === 'string' ? router.query.email : '';

  const token = useMemo(() => {
    try { return decodeURIComponent(tokenParamRaw || ''); } catch { return tokenParamRaw || ''; }
  }, [tokenParamRaw]);
  const email = useMemo(() => {
    try { return decodeURIComponent(emailParamRaw || ''); } catch { return emailParamRaw || ''; }
  }, [emailParamRaw]);

  const passwordValid = useMemo(() => {
    const pass = password || '';
    return pass.length >= 12 && 
           /[A-Z]/.test(pass) && 
           /[a-z]/.test(pass) && 
           /[0-9]/.test(pass) && 
           /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pass);
  }, [password]);
  const confirmMatch = useMemo(() => !password || password === confirmPassword, [password, confirmPassword]);
  const formReady = passwordValid && confirmMatch && !!token && !!email && !!otp && step === 3;

  useEffect(() => {
    if (!router.isReady) return;
    if (!token || !email) {
      setErrorMsg('Tautan reset password tidak lengkap atau sudah kadaluarsa.');
    } else if (step === 1) {
      // Auto-request OTP when page loads
      handleRequestOTP();
    }
  }, [router.isReady, token, email]);

  const handleRequestOTP = async () => {
    if (busy) return;
    setBusy(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const result = await requestOTP({ email, token });
      if (result.ok) {
        setStep(2);
        setSuccessMsg(result.data?.message || 'Kode OTP telah dikirim ke email Anda.');
      } else {
        setErrorMsg(result.data?.message || 'Gagal mengirim OTP. Mohon coba lagi.');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal mengirim OTP. Mohon coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOTP = async (event) => {
    event.preventDefault();
    if (!otp || busy || isLocked) return;
    setBusy(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const result = await verifyOTP({ email, otp });
      if (result.ok) {
        setStep(3);
        setSuccessMsg(result.data?.message || 'OTP berhasil diverifikasi.');
      } else {
        const message = result.data?.message || 'OTP tidak valid. Mohon coba lagi.';
        setErrorMsg(message);
        if (result.data?.locked) {
          setIsLocked(true);
        }
        if (typeof result.data?.remainingAttempts === 'number') {
          setRemainingAttempts(result.data.remainingAttempts);
        }
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal memverifikasi OTP. Mohon coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!formReady || busy) return;
    setBusy(true);
    setSuccessMsg('');
    setErrorMsg('');
    setPasswordErrors([]);
    try {
      const result = await submitNewPassword({ email, token, password, otp });
      if (result.ok) {
        setSuccessMsg(result.data?.message || 'Password berhasil direset. Silakan login kembali.');
        setPassword('');
        setConfirmPassword('');
        setOtp('');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        const message = result.data?.message || 'Gagal mereset password. Mohon coba lagi.';
        setErrorMsg(message);
        if (result.data?.errors && Array.isArray(result.data.errors)) {
          setPasswordErrors(result.data.errors);
        }
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
        <div className="w-[min(540px,96vw)] rounded-2xl border border-cyan-400/30 bg-slate-950/80 backdrop-blur-lg p-6 shadow-lg">
          <h1 className="text-xl font-semibold text-cyan-200 mb-2">Reset Password Admin</h1>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'}`}>1</div>
              <span className="text-xs text-gray-300">OTP</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${step >= 2 ? 'bg-cyan-500' : 'bg-gray-700'}`}></div>
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'}`}>2</div>
              <span className="text-xs text-gray-300">Verifikasi</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${step >= 3 ? 'bg-cyan-500' : 'bg-gray-700'}`}></div>
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'}`}>3</div>
              <span className="text-xs text-gray-300">Password</span>
            </div>
          </div>

          {/* Step 1: OTP Sent */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-300">
                Mengirim kode OTP ke email Anda...
              </p>
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              </div>
            </div>
          )}

          {/* Step 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-3">
              <p className="text-xs text-gray-300 mb-4">
                Kode OTP (6 digit) telah dikirim ke <strong>{email}</strong>. Silakan cek inbox Anda. Kode berlaku selama 5 menit.
              </p>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Kode OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Masukkan 6 digit OTP"
                  maxLength={6}
                  className="w-full rounded-md border border-cyan-500/30 bg-black/50 px-3 py-2 text-center text-lg font-mono tracking-widest outline-none focus:ring-1 focus:ring-cyan-400"
                  disabled={busy || isLocked}
                  autoFocus
                />
                {!isLocked && remainingAttempts < 3 && (
                  <div className="text-[11px] text-yellow-300 mt-1">
                    ⚠️ {remainingAttempts} percobaan tersisa
                  </div>
                )}
              </div>

              {errorMsg && <div className="text-xs text-red-300 p-2 bg-red-900/20 rounded border border-red-500/30">{errorMsg}</div>}
              {successMsg && <div className="text-xs text-emerald-300 p-2 bg-emerald-900/20 rounded border border-emerald-500/30">{successMsg}</div>}

              <button
                type="submit"
                disabled={!otp || otp.length !== 6 || busy || isLocked}
                className="w-full rounded-md border border-cyan-500/40 bg-cyan-500/20 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-60"
              >
                {busy ? 'Memverifikasi…' : 'Verifikasi OTP'}
              </button>

              <button
                type="button"
                onClick={handleRequestOTP}
                disabled={busy || isLocked}
                className="w-full rounded-md border border-gray-500/40 bg-gray-500/10 px-3 py-2 text-xs text-gray-300 hover:bg-gray-500/20 disabled:opacity-60"
              >
                Kirim Ulang OTP
              </button>
            </form>
          )}

          {/* Step 3: Set New Password */}
          {step === 3 && (
            <form onSubmit={onSubmit} className="space-y-3">
              <p className="text-xs text-gray-300 mb-4">
                OTP berhasil diverifikasi! Sekarang buat password baru untuk akun Anda.
              </p>
              
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-md p-3 mb-4">
                <p className="text-[11px] text-yellow-200 font-semibold mb-2">📋 Persyaratan Password:</p>
                <ul className="text-[10px] text-yellow-100 space-y-1 list-disc list-inside">
                  <li>Minimal 12 karakter</li>
                  <li>Mengandung huruf besar (A-Z)</li>
                  <li>Mengandung huruf kecil (a-z)</li>
                  <li>Mengandung angka (0-9)</li>
                  <li>Mengandung simbol (!@#$%^&* dll)</li>
                  <li>Tidak boleh mengandung email/username</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">Password Baru</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 12 karakter"
                  className="w-full rounded-md border border-cyan-500/30 bg-black/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan-400"
                  disabled={busy}
                  autoFocus
                />
                {!passwordValid && password && (
                  <div className="text-[11px] text-red-300 mt-1">
                    Password belum memenuhi semua persyaratan keamanan.
                  </div>
                )}
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
                {!confirmMatch && confirmPassword && (
                  <div className="text-[11px] text-red-300 mt-1">
                    Konfirmasi password belum cocok.
                  </div>
                )}
              </div>

              {passwordErrors.length > 0 && (
                <div className="text-xs text-red-300 p-2 bg-red-900/20 rounded border border-red-500/30">
                  <ul className="list-disc list-inside space-y-1">
                    {passwordErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {errorMsg && !passwordErrors.length && (
                <div className="text-xs text-red-300 p-2 bg-red-900/20 rounded border border-red-500/30">
                  {errorMsg}
                </div>
              )}
              
              {successMsg && (
                <div className="text-xs text-emerald-300 p-2 bg-emerald-900/20 rounded border border-emerald-500/30">
                  {successMsg}
                  <div className="mt-2 text-[11px]">Mengalihkan ke halaman login...</div>
                </div>
              )}

              <button
                type="submit"
                disabled={!formReady || busy}
                className="w-full rounded-md border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60"
              >
                {busy ? 'Memproses…' : 'Simpan Password Baru'}
              </button>
            </form>
          )}

          <div className="mt-4 text-center text-xs text-gray-400">
            <Link href="/login" className="text-cyan-300 hover:text-cyan-200">Kembali ke halaman login</Link>
          </div>
        </div>
      </div>
    </>
  );
}
