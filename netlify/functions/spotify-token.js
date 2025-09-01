exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, client_id, code, code_verifier, redirect_uri, refresh_token } = body;
    if (!client_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing client_id' }) };

    const url = 'https://accounts.spotify.com/api/token';
    let form = new URLSearchParams();
    if (action === 'exchange') {
      if (!code || !code_verifier || !redirect_uri) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing params for exchange' }) };
      }
      form.set('client_id', client_id);
      form.set('grant_type', 'authorization_code');
      form.set('code', code);
      form.set('redirect_uri', redirect_uri);
      form.set('code_verifier', code_verifier);
    } else if (action === 'refresh') {
      if (!refresh_token) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing refresh_token' }) };
      }
      form.set('client_id', client_id);
      form.set('grant_type', 'refresh_token');
      form.set('refresh_token', refresh_token);
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'unknown action' }) };
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const data = await resp.json();
    const statusCode = resp.status;
    return { statusCode, headers, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'server_error', message: e?.message || 'unknown' }) };
  }
};
