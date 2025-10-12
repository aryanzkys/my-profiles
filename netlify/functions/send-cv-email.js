// Netlify Function: send-cv-email
// Mengirim CV ke email user yang request

const { sendCVEmail } = require('../../utils/mailer');

const CV_DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=1c7KeejQq-sDxC1FbnEUGiKUEkHDn2iOf';

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { email } = body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email tidak valid' }),
      };
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email service tidak tersedia saat ini' }),
      };
    }

    // Send CV email
    await sendCVEmail({
      email: email.trim(),
      cvDownloadUrl: CV_DOWNLOAD_URL,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'CV telah dikirim ke email Anda!',
      }),
    };
  } catch (error) {
    console.error('Error sending CV email:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Gagal mengirim email. Silakan coba lagi nanti.',
      }),
    };
  }
};
