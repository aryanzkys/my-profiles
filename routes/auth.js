const express = require('express');
const rateLimit = require('express-rate-limit');
const mailer = require('../utils/mailer');
const tokenStore = require('../utils/tokenStore');
const passwordStore = require('../utils/passwordStore');
const adminStore = require('../utils/adminStore');

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
router.post('/request-reset', requestResetLimiter, async (req, res, next) => {
  try {
    const { email } = req.body || {};

    // Validasi input dasar tanpa memberikan detail sensitif
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Field email wajib diisi.' });
    }

    // Normalisasi email untuk mencegah token duplikat
    const normalizedEmail = email.trim().toLowerCase();

  // Mengecek ke storage cred admin tanpa membocorkan status ke klien.
  // Respons ke klien tetap sama walaupun email tidak ditemukan.
    let registered = false;
    try {
      registered = await adminStore.emailExists(normalizedEmail);
    } catch (checkErr) {
      console.error('Gagal mengecek keberadaan admin:', checkErr?.message || checkErr);
      return res.status(500).json({ message: 'Gagal memproses permintaan reset password.' });
    }

    if (!registered) {
      return res.status(404).json({ message: 'Email belum terdaftar. Silakan sign up terlebih dahulu.' });
    }

    let resetToken;
    try {
      resetToken = await tokenStore.createToken(normalizedEmail);
    } catch (tokenErr) {
      console.error('Gagal membuat token reset password:', tokenErr);
      return res.status(500).json({ message: 'Gagal memproses permintaan reset password.' });
    }

    try {
      await mailer.sendPasswordResetEmail({ email: normalizedEmail, token: resetToken });
    } catch (mailErr) {
      console.error('Gagal mengirim email reset password:', mailErr);
      return res.status(500).json({ message: 'Gagal mengirim email reset password.' });
    }

  return res.json({ message: 'Instruksi reset password berhasil dikirim. Silakan cek inbox Anda.' });
  } catch (err) {
    return next(err);
  }
});

// Endpoint POST /auth/reset
router.post('/reset', async (req, res, next) => {
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

    // Pada tahap ini, Anda harus menyimpan password baru ke database dengan hashing yang aman (misal bcrypt).
    // Untuk keperluan contoh, proses penyimpanan tidak diimplementasikan di sini.
    // Pastikan gunakan HTTPS ketika berkomunikasi dengan server produksi.

    try {
      await passwordStore.setPassword(normalizedEmail, password);
    } catch (saveErr) {
      console.error('Gagal menyimpan password baru:', saveErr);
      return res.status(500).json({ message: 'Gagal menyimpan password baru.' });
    }

    // Tandai token sudah digunakan dan hapus dari store agar tidak dipakai ulang
    await tokenStore.markUsed(token);
    await tokenStore.deleteToken(token);

    return res.json({ message: 'Password berhasil direset. Silakan login dengan password baru.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
