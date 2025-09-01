exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, client_id: clientIdFromReq, code, code_verifier, redirect_uri, refresh_token } = body;

    // Prefer server-side credentials; only fall back to client-provided ID when no env is set.
    const SERVER_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || process.env.SPOTIFY_PUBLIC_CLIENT_ID || null;
    const SERVER_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || null;
    const clientId = SERVER_CLIENT_ID || clientIdFromReq || null;
    if (!clientId && !SERVER_CLIENT_SECRET) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing_client', message: 'No client credentials configured.' }) };
    }

    const url = 'https://accounts.spotify.com/api/token';
    let form = new URLSearchParams();
    if (action === 'exchange') {
      if (!code || !code_verifier || !redirect_uri) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing params for exchange' }) };
      }
      form.set('grant_type', 'authorization_code');
      form.set('code', code);
      form.set('redirect_uri', redirect_uri);
      form.set('code_verifier', code_verifier);
    } else if (action === 'refresh') {
      if (!refresh_token) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing refresh_token' }) };
      }
      form.set('grant_type', 'refresh_token');
      form.set('refresh_token', refresh_token);
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'unknown action' }) };
    }

    // If server has client secret, authenticate via Basic header; otherwise include client_id in form (PKCE public client).
    const reqHeaders = { 'content-type': 'application/x-www-form-urlencoded' };
    if (SERVER_CLIENT_SECRET && (SERVER_CLIENT_ID || clientIdFromReq)) {
      const cid = SERVER_CLIENT_ID || clientIdFromReq;
      const basic = Buffer.from(`${cid}:${SERVER_CLIENT_SECRET}`).toString('base64');
      reqHeaders['Authorization'] = `Basic ${basic}`;
    } else if (clientId) {
      form.set('client_id', clientId);
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: reqHeaders,
      body: form.toString(),
    });
    const data = await resp.json();
    const statusCode = resp.status;
    return { statusCode, headers, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'server_error', message: e?.message || 'unknown' }) };
  }
};
