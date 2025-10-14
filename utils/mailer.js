const nodemailer = require('nodemailer');

// Membuat transporter menggunakan kredensial SMTP dari variabel lingkungan
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

module.exports = {
  /**
   * Mengirim email reset password ke admin dengan vibe Gen Z interaktif
   */
  async sendPasswordResetEmail({ email, token }) {
    const resetLink = `https://aryanstack.netlify.app/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    // Versi teks (fallback)
    const textContent = [
      '✨ Yo Admin!',
      '',
      'Kamu baru aja request reset password akunmu di Aryan Stack 🔐',
      '',
      `Langsung klik link ini buat lanjut: ${resetLink}`,
      '',
      '⏰ Link cuma aktif 10 menit & bisa dipakai sekali aja!',
      '',
      'Setelah klik link, kamu akan menerima kode OTP via email untuk verifikasi tambahan.',
      '',
      'Kalau udah expired, minta link baru aja 😉 tapi jangan spam ya 🫶',
      '',
      'Stay safe & keep grinding 💪',
      'Tim Aryanstack 🚀',
    ].join('\n');

    // Versi HTML interaktif & colorful
    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.7; color: #111827; background: #f9fafb; padding:20px; border-radius:12px;">
        <h2 style="color:#2563eb;">✨ Yo Admin!</h2>
        <p>Kamu baru aja request <strong>reset password</strong> akunmu di <strong>Aryanstack</strong> 🔐</p>
        <p>Langsung klik tombol di bawah buat lanjut:</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${resetLink}" style="
            display:inline-block;
            background: linear-gradient(90deg, #4f46e5, #2563eb);
            color:#fff;
            padding:14px 32px;
            border-radius:12px;
            text-decoration:none;
            font-weight:bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: transform 0.2s ease-in-out;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            🔑 Reset Password Sekarang
          </a>
        </p>
        <p style="font-size:14px; color:#6b7280; text-align:center;">⏰ Link ini cuma berlaku <strong>10 menit</strong> dan cuma bisa dipakai <strong>sekali</strong></p>
        <p style="font-size:14px; color:#6b7280; text-align:center;">Setelah klik link, kamu akan menerima <strong>kode OTP</strong> via email untuk verifikasi tambahan 🔐</p>
        <p style="font-size:14px; color:#6b7280; text-align:center;">Kalau kadaluarsa, tinggal minta link baru aja 😉</p>
        <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
        <p style="text-align:center;">💡 Tips: Jangan share link ini ke siapapun. Stay safe & keep grinding 💪</p>
        <p style="text-align:center; font-weight:bold;">— Tim <strong>Aryanstack</strong> 🚀</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: '🚀 Reset Password Akun Admin Aryanstack',
      text: textContent,
      html: htmlContent,
    });
  },

  /**
   * Mengirim kode OTP untuk verifikasi reset password
   */
  async sendOTPEmail({ email, otp }) {
    // Versi teks (fallback)
    const textContent = [
      '🔐 Kode Verifikasi Reset Password',
      '',
      `Kode OTP kamu: ${otp}`,
      '',
      '⏰ Kode ini berlaku selama 5 menit dan hanya bisa digunakan sekali.',
      '',
      '⚠️ Jangan bagikan kode ini ke siapapun!',
      '',
      'Jika OTP salah dimasukkan lebih dari 3 kali, akun akan terkunci sementara selama 15 menit.',
      '',
      'Stay safe & keep grinding 💪',
      'Tim Aryanstack 🚀',
    ].join('\n');

    // Versi HTML interaktif & colorful
    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.7; color: #111827; background: #f9fafb; padding:20px; border-radius:12px;">
        <h2 style="color:#dc2626;">🔐 Kode Verifikasi Reset Password</h2>
        <p>Gunakan kode OTP berikut untuk melanjutkan proses reset password:</p>
        <p style="text-align:center; margin: 32px 0;">
          <span style="
            display:inline-block;
            background: linear-gradient(135deg, #dc2626, #ef4444);
            color:#fff;
            padding:20px 48px;
            border-radius:16px;
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
            font-family:monospace;
            box-shadow: 0 8px 24px rgba(220,38,38,0.3);
          ">${otp}</span>
        </p>
        <p style="font-size:14px; color:#6b7280; text-align:center;">⏰ Kode ini berlaku selama <strong>5 menit</strong> dan hanya bisa digunakan <strong>sekali</strong></p>
        <p style="font-size:14px; color:#dc2626; text-align:center; font-weight:bold;">⚠️ Jangan bagikan kode ini ke siapapun!</p>
        <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
        <p style="font-size:13px; color:#6b7280; text-align:center;">
          ℹ️ Jika OTP salah dimasukkan lebih dari 3 kali, akun akan terkunci sementara selama 15 menit.
        </p>
        <p style="text-align:center; font-weight:bold;">— Tim <strong>Aryanstack</strong> 🚀</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: '🔐 Kode OTP Reset Password - Aryanstack',
      text: textContent,
      html: htmlContent,
    });
  },

  /**
   * Mengirim notifikasi bahwa password telah berhasil diubah
   */
  async sendPasswordChangedEmail({ email, ip, userAgent, timestamp }) {
    const formattedTime = new Date(timestamp).toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: 'Asia/Jakarta',
    });

    // Versi teks (fallback)
    const textContent = [
      '✅ Password Berhasil Diubah',
      '',
      'Password akun admin kamu baru saja berhasil diubah.',
      '',
      'Detail aktivitas:',
      `- Waktu: ${formattedTime}`,
      `- IP Address: ${ip}`,
      `- Browser/Device: ${userAgent}`,
      '',
      '⚠️ Jika ini bukan kamu, segera hubungi administrator atau lakukan reset password lagi.',
      '',
      'Untuk keamanan, semua sesi login aktif lainnya telah dihapus secara otomatis.',
      '',
      'Stay safe & keep grinding 💪',
      'Tim Aryanstack 🚀',
    ].join('\n');

    // Versi HTML interaktif & colorful
    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.7; color: #111827; background: #f9fafb; padding:20px; border-radius:12px;">
        <h2 style="color:#059669;">✅ Password Berhasil Diubah</h2>
        <p>Password akun admin kamu baru saja berhasil diubah.</p>
        <div style="background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin:20px 0;">
          <h3 style="margin:0 0 12px 0; font-size:16px; color:#374151;">📋 Detail Aktivitas</h3>
          <table style="width:100%; font-size:14px;">
            <tr>
              <td style="color:#6b7280; padding:6px 0;"><strong>Waktu:</strong></td>
              <td style="color:#111827; padding:6px 0;">${formattedTime}</td>
            </tr>
            <tr>
              <td style="color:#6b7280; padding:6px 0;"><strong>IP Address:</strong></td>
              <td style="color:#111827; padding:6px 0;">${ip}</td>
            </tr>
            <tr>
              <td style="color:#6b7280; padding:6px 0; vertical-align:top;"><strong>Browser/Device:</strong></td>
              <td style="color:#111827; padding:6px 0;">${userAgent}</td>
            </tr>
          </table>
        </div>
        <p style="font-size:14px; color:#dc2626; background:#fef2f2; border-left:4px solid #dc2626; padding:12px; border-radius:4px;">
          ⚠️ <strong>Jika ini bukan kamu</strong>, segera hubungi administrator atau lakukan reset password lagi.
        </p>
        <p style="font-size:14px; color:#059669; background:#f0fdf4; border-left:4px solid #059669; padding:12px; border-radius:4px;">
          🔒 Untuk keamanan, semua sesi login aktif lainnya telah dihapus secara otomatis.
        </p>
        <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
        <p style="text-align:center; font-weight:bold;">— Tim <strong>Aryanstack</strong> 🚀</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: '✅ Password Akun Admin Berhasil Diubah - Aryanstack',
      text: textContent,
      html: htmlContent,
    });
  },

  /**
   * Mengirim CV ke email user
   */
  async sendCVEmail({ email, cvDownloadUrl }) {
    // Versi teks (fallback)
    const textContent = [
      '📄 CV Aryan Zaky Prayogo',
      '',
      'Terima kasih sudah request CV saya!',
      '',
      `Download CV di sini: ${cvDownloadUrl}`,
      '',
      '✨ CV ini optimized untuk ATS parsing dan siap dibagikan ke recruiter.',
      '',
      'Butuh format lain atau ada pertanyaan? Langsung hubungi saya melalui AryanStack!',
      '',
      'Best regards,',
      'Aryan Zaky Prayogo 🚀',
    ].join('\n');

    // Versi HTML interaktif & colorful
    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.7; color: #111827; background: #f9fafb; padding:20px; border-radius:12px;">
        <h2 style="color:#2563eb;">📄 CV Aryan Zaky Prayogo</h2>
        <p>Terima kasih sudah request <strong>CV saya</strong>! 🎉</p>
        <p>Klik tombol di bawah untuk download CV dalam format PDF:</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${cvDownloadUrl}" style="
            display:inline-block;
            background: linear-gradient(90deg, #10b981, #06b6d4);
            color:#fff;
            padding:14px 32px;
            border-radius:12px;
            text-decoration:none;
            font-weight:bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: transform 0.2s ease-in-out;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            📥 Download CV
          </a>
        </p>
        <p style="font-size:14px; color:#6b7280; text-align:center;">✨ CV ini sudah <strong>optimized untuk ATS parsing</strong> dan siap dibagikan ke recruiter!</p>
        <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
        <p style="text-align:center;">💡 Butuh format lain atau ada pertanyaan? Langsung hubungi saya melalui <strong>AryanStack</strong>!</p>
        <p style="text-align:center; font-weight:bold;">Best regards,<br/><strong>Aryan Zaky Prayogo</strong> 🚀</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: '📄 CV Aryan Zaky Prayogo - Download Link',
      text: textContent,
      html: htmlContent,
    });
  },
};
