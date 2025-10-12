// Next.js API Route: send-cv-email (for local development)
const { sendCVEmail } = require('../../utils/mailer');

const CV_DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=1c7KeejQq-sDxC1FbnEUGiKUEkHDn2iOf';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body || {};

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email tidak valid' });
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(503).json({ error: 'Email service tidak tersedia saat ini' });
    }

    // Send CV email
    await sendCVEmail({
      email: email.trim(),
      cvDownloadUrl: CV_DOWNLOAD_URL,
    });

    return res.status(200).json({
      success: true,
      message: 'CV telah dikirim ke email Anda!',
    });
  } catch (error) {
    console.error('Error sending CV email:', error);
    return res.status(500).json({
      error: 'Gagal mengirim email. Silakan coba lagi nanti.',
    });
  }
}
