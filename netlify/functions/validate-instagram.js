// Netlify Function: validate-instagram
// Checks whether an Instagram username exists using Instagram web profile URL.
// Avoids direct JSON endpoint to reduce breakage; we infer existence via status code and basic HTML markers.

// Use global fetch (Node 18+ on Netlify)

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const u = (event.queryStringParameters?.u || '').toLowerCase().trim();
  const username = u.replace(/[^a-z0-9._]/g, '');
  if (!username) {
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ exists: false }) };
  }
  try {
    const url = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  const res = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'manual',
    });
    const status = res.status;
    let exists = false;
    if (status === 200) {
      const html = await res.text();
      // Basic heuristic: profile pages contain "og:site_name" and @username in title or JSON blob
      exists = /property="og:site_name"/i.test(html) && new RegExp(`@?${username}`, 'i').test(html);
    } else if (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) {
      // Some accounts redirect but still exist; treat as inconclusive-true
      exists = true;
    } else if (status === 404) {
      exists = false;
    } else {
      // Other statuses: unknown; keep false to avoid false-positives
      exists = false;
    }
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ exists }) };
  } catch (e) {
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ exists: false }) };
  }
};
