require('dotenv').config();
const express = require('express');

// Import router autentikasi
const authRoutes = require('./routes/auth');

const app = express();

// Mengaktifkan parsing JSON bawaan Express
app.use(express.json());

// Menandai bahwa aplikasi berada di balik proxy (misal Netlify) agar rate limit tetap akurat
app.set('trust proxy', 1);

// Mendaftarkan rute autentikasi di prefix /auth
app.use('/auth', authRoutes);

// Middleware fallback untuk endpoint yang tidak dikenal
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan.' });
});

// Middleware penanganan error sederhana
app.use((err, req, res, next) => {
  // Logging error minimal di console agar mudah dilacak di server
  console.error('Terjadi error tidak terduga:', err);
  res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

// Membuat fungsi start server agar dapat digunakan baik di Netlify Functions maupun server biasa
const PORT = process.env.PORT || 5000;
const serverless = require('serverless-http');

let netlifyBasePath = '';
if (process.env.NETLIFY === 'true' || process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.LAMBDA_TASK_ROOT) {
  // Netlify Functions mengakses endpoint melalui /.netlify/functions/<nama-fungsi>/...
  const fnName = process.env.NETLIFY_FUNCTION_NAME || 'auth-service';
  netlifyBasePath = `/.netlify/functions/${fnName}`;
}

// Selalu ekspor handler agar dapat dipakai oleh Netlify Functions atau platform serverless lain
module.exports.handler = serverless(app, netlifyBasePath ? { basePath: netlifyBasePath } : {});

if (process.env.NETLIFY === 'true' || process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.LAMBDA_TASK_ROOT) {
  // Lingkungan serverless tidak perlu mendengarkan port lokal
} else {
  app.listen(PORT, () => {
    console.log(`Server berjalan pada port ${PORT}`);
  });
}

// Mengekspor app untuk kebutuhan testing atau penyesuaian lanjutan
module.exports.app = app;
