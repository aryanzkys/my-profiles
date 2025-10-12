const express = require('express');
const rateLimit = require('express-rate-limit');
const mailer = require('../utils/mailer');
const tokenStore = require('../utils/tokenStore');
const passwordStore = require('../utils/passwordStore');

const router = express.Router();

function resolveClientIp(req) {
  const headerKeys = [
    'x-nf-client-connection-ip',
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
    'x-forwarded-for',
    'forwarded',
    'x-forwarded',
  ];

  for (const key of headerKeys) {
    const raw = req.headers?.[key];
    if (!raw) continue;
    const first = Array.isArray(raw) ? raw[0] : raw.split(',')[0];
    if (first && typeof first === 'string') {
      let trimmed = first.trim();
      if (/^for=/i.test(trimmed)) {
        trimmed = trimmed.slice(4);
      }
      trimmed = trimmed.replace(/^"|"$/g, '');
      if (trimmed.length) return trimmed;
    }
  }

  if (Array.isArray(req.ips) && req.ips.length) return req.ips[0];
  if (req.ip) return req.ip;

  const fallbackIp = req.socket?.remoteAddress
    || req.connection?.remoteAddress
    || req.headers?.['client-ip']
    || 'unknown';
  return typeof fallbackIp === 'string' ? fallbackIp : 'unknown';
}

const requestResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientIp,
  message: {
    message: 'Terlalu banyak permintaan reset. Silakan coba lagi nanti.',
  },
});

// Helper debug message untuk frontend
function getDebugMessage(err) {
  if (!err) return '';
  if (err.code) return `Kode error: ${err.code}`;
  if (err.response) return `Response: ${err.response.toString()}`;
  if (err.message) return `Pesan: ${err.message}`;
  return JSON.stringify(err);
}

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
      return res.status(500).json({
        message: 'Gagal memproses permintaan reset password.',
        debug: `Gagal cek email di database. ${getDebugMessage(checkErr)}`
      });
    }

    if (!registered) {
      return res.status(404).json({ message: 'Email belum terdaftar. Silakan sign up terlebih dahulu.' });
    }

    let resetToken;
    try {
      resetToken = await tokenStore.createToken(normalizedEmail);
    } catch (tokenErr) {
      return res.status(500).json({
        message: 'Gagal memproses permintaan reset password.',
        debug: `Gagal buat token. ${getDebugMessage(tokenErr)}`
      });
    }

    try {
      await mailer.sendPasswordResetEmail({ email: normalizedEmail, token: resetToken });
    } catch (mailErr) {
      return res.status(502).json({
        message: 'Gagal mengirim email reset password.',
        debug: `Cek konfigurasi SMTP: ${getDebugMessage(mailErr)}. Pastikan SMTP_HOST/PORT, SMTP_USER/PASS, dan App Password (untuk Gmail) benar.`
      });
    }

    return res.json({ message: 'Instruksi reset password berhasil dikirim. Silakan cek inbox Anda.' });
  } catch (err) {
    return res.status(500).json({
      message: 'Terjadi kesalahan tidak terduga saat request-reset.',
      debug: getDebugMessage(err)
    });
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
      return res.status(500).json({
        message: 'Gagal menyimpan password baru.',
        debug: `Periksa penyimpanan password. ${getDebugMessage(saveErr)}`
      });
    }

    await tokenStore.markUsed(token);
    await tokenStore.deleteToken(token);

    return res.json({ message: 'Password berhasil direset. Silakan login dengan password baru.' });
  } catch (err) {
    return res.status(500).json({
      message: 'Terjadi kesalahan tidak terduga saat reset password.',
      debug: getDebugMessage(err)
    });
  }
});

module.exports = router;
