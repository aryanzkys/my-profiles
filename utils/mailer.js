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
   * Mengirim email reset password ke admin.
   */
  async sendPasswordResetEmail({ email, token }) {
    const resetLink = `https://aryanstack.netlify.app/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    // Versi teks (untuk client email yang tidak mendukung HTML)
    const textContent = [
      '👋 Hey Admin!',
      '',
      'Kami dapet request buat reset password akun kamu di Aryan Stack 🔐',
      '',
      `Klik link ini buat lanjut: ${resetLink}`,
      '',
      '⚠️ Link ini cuma aktif 30 menit dan cuma bisa dipakai sekali ya!',
      '',
      'Kalau udah expired, tinggal minta link baru aja 😉 (tapi jangan spam ya 🫶)',
      '',
      'Salam hangat,',
      'Tim Aryan Stack 🚀',
    ].join('\n');

    // Versi HTML (tampilan utama)
    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.7; color: #111827;">
        <h2 style="color:#2563eb;">👋 Hey Admin!</h2>
        <p>Kami dapet request buat <strong>reset password</strong> akun kamu di <strong>Aryan Stack</strong> 🔐</p>
        <p>Langsung klik tombol di bawah buat lanjut:</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${resetLink}" style="background:#2563eb; color:#fff; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:bold;">
            🔑 Reset Password Sekarang
          </a>
        </p>
        <p style="font-size: 14px; color: #6b7280;">⏰ Link ini cuma aktif <strong>30 menit</strong> dan cuma bisa dipakai sekali.</p>
        <p style="font-size: 14px; color: #6b7280;">Kalau udah kadaluarsa, kamu bisa minta link baru kok — tapi please, jangan spam ya 😅</p>
        <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
        <p>Semangat terus & jaga keamanan akunmu 💪</p>
        <p>— Tim <strong>Aryan Stack</strong> 🚀</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: '🔑 Reset Password Akun Admin Aryan Stack',
      text: textContent,
      html: htmlContent,
    });
  },
};
