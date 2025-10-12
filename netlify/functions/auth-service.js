// Netlify Function wrapper agar aplikasi Express dapat berjalan di lingkungan serverless.
const { handler } = require('../../server');

exports.handler = handler;
