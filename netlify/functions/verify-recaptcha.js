// Netlify Function: verify-recaptcha
// Verifies a reCAPTCHA v3 token with Google using server-side secret

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
      return { statusCode: 500, body: 'Missing RECAPTCHA_SECRET_KEY' };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const token = body.token || '';
    const action = body.action || '';
    if (!token) {
      return { statusCode: 400, body: 'Missing token' };
    }

    // Optional: get client IP
    const ip = (event.headers['x-forwarded-for'] || '').split(',')[0] || undefined;

    const params = new URLSearchParams();
    params.set('secret', secret);
    params.set('response', token);
    if (ip) params.set('remoteip', ip);

    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const json = await resp.json();
    const success = !!json.success;
    const score = typeof json.score === 'number' ? json.score : null;
    const actionResp = json.action || null;
    const threshold = Number(process.env.RECAPTCHA_SCORE_THRESHOLD || 0.5);

    const ok = success && (score === null || score >= threshold);

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok, success, score, action: actionResp, expectedAction: action, errors: json['error-codes'] || [] }),
    };
  } catch (e) {
    return { statusCode: 500, body: `Verify error: ${e.message}` };
  }
};
