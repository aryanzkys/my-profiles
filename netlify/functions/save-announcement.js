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
  // Read existing to append as array
  let current = [];
  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
    if (r.ok) {
      const text = await r.text();
      try { const parsed = JSON.parse(text); if (Array.isArray(parsed)) current = parsed; else if (parsed && typeof parsed === 'object') current = [parsed]; }
      catch {}
    }
  } catch {}
  const withId = json && json.id ? json : { ...json, id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}` };
  current.unshift(withId);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`, {
    method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(current)
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
      target: ['main','ai','both'].includes(body.target) ? body.target : 'both',
    };

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/announcements`;
      // Insert as a new row (no fixed id), enabling multi-row history and per-target concurrency
      let res = await fetch(url, {
        method: 'POST',
        headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: payload.active, title: payload.title, message: payload.message, severity: payload.severity, cta_text: payload.ctaText, cta_url: payload.ctaUrl, version: payload.version, updated_at: payload.updatedAt, expires_at: payload.expiresAt, dismissible: payload.dismissible, target: payload.target }),
      });
      if (!res.ok) {
        const t = await res.text();
        // Fallback if table missing or column mismatch (e.g., new 'target' field not yet migrated)
        const shouldFallback = (res.status === 404 && /Could not find the table/i.test(t)) || (res.status === 400 && /(column|target|invalid)/i.test(t));
        if (shouldFallback) {
          const storagePayload = { ...payload, id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}` };
          await storageWrite(storagePayload);
          return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-storage' }) };
        }
        throw new Error(`Supabase REST save failed (${res.status}): ${t}`);
      }
      return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-rest' }) };
    }

    // FS fallback
    try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
    // Append to an array for multi-row behavior
    let arr = [];
    if (fs.existsSync(DATA_FILE)) {
      try { const prev = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); if (Array.isArray(prev)) arr = prev; else if (prev && typeof prev === 'object') arr = [prev]; } catch {}
    }
    const storagePayload = { ...payload, id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}` };
    arr.unshift(storagePayload);
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
    return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify({ ok: true, via: 'filesystem' }) };
  } catch (e) {
    return { statusCode: 500, body: `Save error: ${e.message || 'Failed to save announcement'}` };
  }
};
