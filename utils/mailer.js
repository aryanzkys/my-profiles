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
      '⏰ Link cuma aktif 30 menit & bisa dipakai sekali aja!',
      '',
      'Kalau udah expired, minta link baru aja 😉 tapi jangan spam ya 🫶',
      '',
      'Stay safe & keep grinding 💪',
      'Tim Aryan Stack 🚀',
    ].join('\n');

    // Versi HTML interaktif & colorful
    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.7; color: #111827; background: #f9fafb; padding:20px; border-radius:12px;">
        <h2 style="color:#2563eb;">✨ Yo Admin!</h2>
        <p>Kamu baru aja request <strong>reset password</strong> akunmu di <strong>Aryan Stack</strong> 🔐</p>
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
        <p style="font-size:14px; color:#6b7280; text-align:center;">⏰ Link ini cuma berlaku <strong>30 menit</strong> dan cuma bisa dipakai <strong>sekali</strong></p>
        <p style="font-size:14px; color:#6b7280; text-align:center;">Kalau kadaluarsa, tinggal minta link baru aja 😉</p>
        <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
        <p style="text-align:center;">💡 Tips: Jangan share link ini ke siapapun. Stay safe & keep grinding 💪</p>
        <p style="text-align:center; font-weight:bold;">— Tim <strong>Aryan Stack</strong> 🚀</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: '🚀 Reset Password Akun Admin Aryan Stack',
      text: textContent,
      html: htmlContent,
    });
  },
};
