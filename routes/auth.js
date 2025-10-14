const express = require('express');
const rateLimit = require('express-rate-limit');
const mailer = require('../utils/mailer');
const tokenStore = require('../utils/tokenStore');
const passwordStore = require('../utils/passwordStore');
const otpStore = require('../utils/otpStore');
const securityLogger = require('../utils/securityLogger');
const { validatePassword } = require('../utils/passwordValidator');

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

// Rate limiter for OTP verification (e.g., /auth/verify-otp)
const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientIp,
  message: {
    message: 'Terlalu banyak percobaan verifikasi OTP. Silakan coba lagi nanti.',
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
  const clientIp = resolveClientIp(req);
  const userAgent = req.headers?.['user-agent'] || 'unknown';
  
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
      await securityLogger.log({
        email: normalizedEmail,
        action: 'password_reset_request',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: 'Database check error',
      });
      return res.status(500).json({
        message: 'Gagal memproses permintaan reset password.',
        debug: `Gagal cek email di database. ${getDebugMessage(checkErr)}`
      });
    }

    if (!registered) {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'password_reset_request',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: 'Email not registered',
      });
      return res.status(404).json({ message: 'Email belum terdaftar. Silakan sign up terlebih dahulu.' });
    }

    let resetToken;
    try {
      resetToken = await tokenStore.createToken(normalizedEmail);
    } catch (tokenErr) {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'password_reset_request',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: 'Token creation error',
      });
      return res.status(500).json({
        message: 'Gagal memproses permintaan reset password.',
        debug: `Gagal buat token. ${getDebugMessage(tokenErr)}`
      });
    }

    try {
      await mailer.sendPasswordResetEmail({ email: normalizedEmail, token: resetToken });
    } catch (mailErr) {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'password_reset_request',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: 'Email sending error',
      });
      return res.status(502).json({
        message: 'Gagal mengirim email reset password.',
        debug: `Cek konfigurasi SMTP: ${getDebugMessage(mailErr)}. Pastikan SMTP_HOST/PORT, SMTP_USER/PASS, dan App Password (untuk Gmail) benar.`
      });
    }

    await securityLogger.log({
      email: normalizedEmail,
      action: 'password_reset_request',
      ip: clientIp,
      userAgent,
      status: 'success',
      details: 'Reset link sent',
    });

    return res.json({ message: 'Instruksi reset password berhasil dikirim. Silakan cek inbox Anda.' });
  } catch (err) {
    return res.status(500).json({
      message: 'Terjadi kesalahan tidak terduga saat request-reset.',
      debug: getDebugMessage(err)
    });
  }
});

// Endpoint POST /auth/request-otp - Request OTP after clicking reset link
router.post('/request-otp', async (req, res) => {
  const clientIp = resolveClientIp(req);
  const userAgent = req.headers?.['user-agent'] || 'unknown';
  
  try {
    const { token, email } = req.body || {};
    if (!token || !email) {
      return res.status(400).json({ message: 'Token dan email wajib diisi.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const tokenDetail = await tokenStore.lookupToken(token);

    if (!tokenDetail || tokenDetail.email !== normalizedEmail) {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'otp_request',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: 'Invalid or expired token',
      });
      return res.status(400).json({ message: 'Token reset tidak valid atau sudah kadaluarsa.' });
    }

    // Check if token is already used
    if (tokenDetail.used) {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'otp_request',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: 'Token already used',
      });
      return res.status(400).json({ message: 'Token sudah pernah digunakan.' });
    }

    // Generate and send OTP
    try {
      const otp = await otpStore.createOTP(normalizedEmail);
      await mailer.sendOTPEmail({ email: normalizedEmail, otp });
      
      await securityLogger.log({
        email: normalizedEmail,
        action: 'otp_request',
        ip: clientIp,
        userAgent,
        status: 'success',
        details: 'OTP sent',
      });

      return res.json({ message: 'Kode OTP telah dikirim ke email Anda. Silakan cek inbox.' });
    } catch (otpErr) {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'otp_request',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: otpErr?.message || 'OTP generation/send error',
      });
      return res.status(500).json({
        message: otpErr?.message || 'Gagal mengirim OTP.',
        debug: getDebugMessage(otpErr)
      });
    }
  } catch (err) {
    return res.status(500).json({
      message: 'Terjadi kesalahan tidak terduga saat request OTP.',
      debug: getDebugMessage(err)
    });
  }
});

// Endpoint POST /auth/verify-otp - Verify OTP before allowing password reset
router.post('/verify-otp', verifyOtpLimiter, async (req, res) => {
  const clientIp = resolveClientIp(req);
  const userAgent = req.headers?.['user-agent'] || 'unknown';
  
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email dan OTP wajib diisi.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await otpStore.verifyOTP(normalizedEmail, otp);

    if (result.success) {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'otp_verification',
        ip: clientIp,
        userAgent,
        status: 'success',
        details: 'OTP verified successfully',
      });
      return res.json({ message: 'OTP berhasil diverifikasi. Silakan masukkan password baru.' });
    } else {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'otp_verification',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: result.locked ? 'Account locked' : `OTP invalid, ${result.remainingAttempts} attempts left`,
      });
      return res.status(400).json({
        message: result.message || 'OTP tidak valid.',
        locked: result.locked || false,
        remainingAttempts: result.remainingAttempts || 0,
      });
    }
  } catch (err) {
    return res.status(500).json({
      message: 'Terjadi kesalahan tidak terduga saat verifikasi OTP.',
      debug: getDebugMessage(err)
    });
  }
});

// Endpoint POST /auth/reset - Reset password with OTP verification
router.post('/reset', async (req, res) => {
  const clientIp = resolveClientIp(req);
  const userAgent = req.headers?.['user-agent'] || 'unknown';
  
  try {
    const { token, email, password, otp } = req.body || {};
    if (!token || !email || !password || !otp) {
      return res.status(400).json({ message: 'Token, email, OTP, dan password baru wajib diisi.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Validate password strength
    const passwordValidation = validatePassword(password, normalizedEmail);
    if (!passwordValidation.valid) {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'password_reset',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: 'Weak password: ' + passwordValidation.errors.join(', '),
      });
      return res.status(422).json({
        message: 'Password tidak memenuhi persyaratan keamanan.',
        errors: passwordValidation.errors,
      });
    }

    // Verify token
    const tokenDetail = await tokenStore.lookupToken(token);
    if (!tokenDetail || tokenDetail.email !== normalizedEmail) {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'password_reset',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: 'Invalid or expired token',
      });
      return res.status(400).json({ message: 'Token reset tidak valid atau sudah kadaluarsa.' });
    }

    if (tokenDetail.used) {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'password_reset',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: 'Token already used',
      });
      return res.status(400).json({ message: 'Token sudah pernah digunakan.' });
    }

    // Verify OTP
    const otpData = await otpStore.getOTP(normalizedEmail);
    if (!otpData || !otpData.verified) {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'password_reset',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: 'OTP not verified',
      });
      return res.status(400).json({ message: 'OTP belum diverifikasi atau sudah kadaluarsa.' });
    }

    // Save new password
    try {
      await passwordStore.setPassword(normalizedEmail, password);
    } catch (saveErr) {
      await securityLogger.log({
        email: normalizedEmail,
        action: 'password_reset',
        ip: clientIp,
        userAgent,
        status: 'failed',
        details: 'Password save error',
      });
      return res.status(500).json({
        message: 'Gagal menyimpan password baru.',
        debug: `Periksa penyimpanan password. ${getDebugMessage(saveErr)}`
      });
    }

    // Mark token as used and delete it
    await tokenStore.markUsed(token);
    await tokenStore.deleteToken(token);
    
    // Delete OTP after successful reset
    await otpStore.deleteOTP(normalizedEmail);

    // Log successful password reset
    await securityLogger.log({
      email: normalizedEmail,
      action: 'password_reset',
      ip: clientIp,
      userAgent,
      status: 'success',
      details: 'Password reset successfully',
    });

    // Send notification email
    try {
      await mailer.sendPasswordChangedEmail({
        email: normalizedEmail,
        ip: clientIp,
        userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (mailErr) {
      console.error('Gagal mengirim email notifikasi:', mailErr?.message || mailErr);
      // Don't fail the request if notification email fails
    }

    return res.json({ message: 'Password berhasil direset. Silakan login dengan password baru.' });
  } catch (err) {
    return res.status(500).json({
      message: 'Terjadi kesalahan tidak terduga saat reset password.',
      debug: getDebugMessage(err)
    });
  }
});

module.exports = router;
