const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(DATA_DIR, 'admin-logins.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function storageRead(bucket = 'app_data', object = 'admin-logins.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!res.ok) return null;
  const text = await res.text();
  try { const json = JSON.parse(text); return Array.isArray(json) ? json : []; } catch { return []; }
}
async function storageWrite(arr, bucket = 'app_data', object = 'admin-logins.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`, {
    method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(arr)
  });
  return res.ok;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const nowIso = new Date().toISOString();
    const entry = {
      ts: nowIso,
      uid: (body.uid || null),
      email: (body.email || null),
      name: (body.name || null),
      provider: (body.provider || null),
      photoURL: (body.photoURL || null),
      userAgent: (body.userAgent || event.headers['user-agent'] || null),
      ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || null,
    };
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const url = `${SUPABASE_URL}/rest/v1/admin_logins`;
        const res = await fetch(url, { method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
        if (res.ok) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true }) };
        const t = await res.text();
        if (res.status !== 404 || !/Could not find the table/i.test(t)) throw new Error('supabase rest failed');
      } catch {}
      try { // storage append fallback
        const read = await storageRead();
        const next = Array.isArray(read) ? [...read, entry] : [entry];
        const ok = await storageWrite(next);
        if (ok) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-storage' }) };
      } catch {}
    }
    // filesystem fallback
    try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
    let arr = [];
    if (fs.existsSync(LOG_FILE)) { try { arr = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) || []; } catch { arr = []; } }
    arr.push(entry);
    fs.writeFileSync(LOG_FILE, JSON.stringify(arr, null, 2), 'utf8');
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: 'filesystem' }) };
  } catch {
    return { statusCode: 500, body: 'Error' };
  }
};
