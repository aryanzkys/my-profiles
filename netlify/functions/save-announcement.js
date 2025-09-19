const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'announcements.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function ensureStorageBucket(bucket = 'app_data') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const endpoint = `${SUPABASE_URL}/storage/v1/bucket`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name: bucket, public: false }),
  });
  if (res.ok || res.status === 409) return true;
  const t = await res.text();
  if (/exist/i.test(t)) return true;
  throw new Error(`Supabase Storage create bucket failed (${res.status}): ${t}`);
}

async function storageWrite(json, bucket = 'app_data', object = 'announcements.json') {
  await ensureStorageBucket(bucket);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`, {
    method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(json)
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Supabase Storage save failed (${res.status}): ${t}`); }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const payload = {
      active: !!body.active,
      title: String(body.title || ''),
      message: String(body.message || ''),
      severity: ['info','warning','success'].includes(body.severity) ? body.severity : 'info',
      ctaText: String(body.ctaText || ''),
      ctaUrl: String(body.ctaUrl || ''),
      version: String(body.version || '0'),
      updatedAt: new Date().toISOString(),
      expiresAt: body.expiresAt || null,
      dismissible: body.dismissible !== false,
    };

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/announcements`;
      let res = await fetch(url, {
        method: 'POST',
        headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ id: 1, active: payload.active, title: payload.title, message: payload.message, severity: payload.severity, cta_text: payload.ctaText, cta_url: payload.ctaUrl, version: payload.version, updated_at: payload.updatedAt, expires_at: payload.expiresAt, dismissible: payload.dismissible }),
      });
      if (!res.ok) {
        const t = await res.text();
        if (res.status === 404 && /Could not find the table/i.test(t)) {
          await storageWrite(payload);
          return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-storage' }) };
        }
        throw new Error(`Supabase REST save failed (${res.status}): ${t}`);
      }
      return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-rest' }) };
    }

    // FS fallback
    try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
    return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify({ ok: true, via: 'filesystem' }) };
  } catch (e) {
    return { statusCode: 500, body: `Save error: ${e.message || 'Failed to save announcement'}` };
  }
};
