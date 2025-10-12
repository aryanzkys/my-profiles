const nodemailer = require('nodemailer');

// Membuat transporter menggunakan kredensial SMTP dari variabel lingkungan
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // Contoh: 'smtp.gmail.com'
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // Port 465 biasanya membutuhkan SSL
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

    // Konten email: plain text dan HTML sesuai permintaan
    const textContent = [
      'Hai, kami menerima permintaan untuk mereset password akun admin di aryanstack.netlify.app.',
      '',
      `Silakan gunakan tautan berikut untuk membuat password baru (berlaku 30 menit, satu kali pakai): ${resetLink}`,
      '',
      'Jika tautan sudah kadaluarsa, ajukan permintaan baru dan mohon jangan melakukan spam.',
    ].join('\n');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>Hai, kami menerima permintaan untuk mereset password akun admin di <strong>aryanstack.netlify.app</strong>.</p>
        <p>Silakan klik tombol di bawah untuk membuat password baru (berlaku 30 menit dan hanya bisa digunakan satu kali):</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">Buat Password Baru</a>
        </p>
        <p>Jika tautan sudah kadaluarsa atau tidak bekerja, Anda dapat mengajukan permintaan reset lagi. Mohon untuk tidak melakukan spam.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Permintaan Reset Password untuk Akun Admin',
      text: textContent,
      html: htmlContent,
    });
  },
};
