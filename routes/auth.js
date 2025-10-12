const express = require('express');
const rateLimit = require('express-rate-limit');
const mailer = require('../utils/mailer');
const tokenStore = require('../utils/tokenStore');
const passwordStore = require('../utils/passwordStore');

const router = express.Router();

// Membatasi permintaan reset password agar tidak disalahgunakan
const requestResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Maksimal 5 permintaan per IP dalam window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Terlalu banyak permintaan reset. Silakan coba lagi nanti.',
  },
});

// Endpoint POST /auth/request-reset
router.post('/request-reset', requestResetLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Field email wajib diisi.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let registered = false;
    try {
      registered = await passwordStore.emailExists(normalizedEmail);
    } catch (checkErr) {
      console.error('Gagal mengecek keberadaan email admin:', checkErr);
      const reason = checkErr?.message || checkErr?.code || 'Periksa koneksi ke database admin.';
      return res.status(500).json({ message: `Gagal memproses permintaan reset password. (${reason})` });
    }

    if (!registered) {
      return res.status(404).json({ message: 'Email belum terdaftar. Silakan sign up terlebih dahulu.' });
    }

    let resetToken;
    try {
      resetToken = await tokenStore.createToken(normalizedEmail);
    } catch (tokenErr) {
      console.error('Gagal membuat token reset password:', tokenErr);
      const reason = tokenErr?.message || tokenErr?.code || 'Periksa konfigurasi penyimpanan token.';
      return res.status(500).json({ message: `Gagal memproses permintaan reset password. (${reason})` });
    }

    try {
      await mailer.sendPasswordResetEmail({ email: normalizedEmail, token: resetToken });
    } catch (mailErr) {
      console.error('Gagal mengirim email reset password:', mailErr);
      const reason = mailErr?.response?.toString()
        || mailErr?.responseCode
        || mailErr?.code
        || mailErr?.message
        || 'Periksa konfigurasi SMTP Anda.';
      return res.status(502).json({ message: `Gagal mengirim email reset password. (${reason})` });
    }

    return res.json({ message: 'Instruksi reset password berhasil dikirim. Silakan cek inbox Anda.' });
  } catch (err) {
    console.error('Kesalahan tidak terduga saat request-reset:', err);
    const reason = err?.message || err?.code || 'Terjadi kesalahan tidak terduga.';
    return res.status(500).json({ message: `Gagal memproses permintaan reset password. (${reason})` });
  }
});

// Endpoint POST /auth/reset
router.post('/reset', async (req, res) => {
  try {
    const { token, email, password } = req.body || {};

    if (!token || !email || !password) {
      return res.status(400).json({ message: 'Token, email, dan password baru wajib diisi.' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(422).json({ message: 'Password baru minimal 8 karakter.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const tokenDetail = await tokenStore.lookupToken(token);

    if (!tokenDetail || tokenDetail.email !== normalizedEmail) {
      return res.status(400).json({ message: 'Token reset tidak valid atau sudah kadaluarsa.' });
    }

    try {
      await passwordStore.setPassword(normalizedEmail, password);
    } catch (saveErr) {
      console.error('Gagal menyimpan password baru:', saveErr);
      const reason = saveErr?.message || saveErr?.code || 'Periksa penyimpanan password.';
      return res.status(500).json({ message: `Gagal menyimpan password baru. (${reason})` });
    }

    await tokenStore.markUsed(token);
    await tokenStore.deleteToken(token);

    return res.json({ message: 'Password berhasil direset. Silakan login dengan password baru.' });
  } catch (err) {
    console.error('Kesalahan tidak terduga saat reset password:', err);
    const reason = err?.message || err?.code || 'Terjadi kesalahan tidak terduga.';
    return res.status(500).json({ message: `Gagal memproses permintaan reset password. (${reason})` });
  }
});

module.exports = router;
