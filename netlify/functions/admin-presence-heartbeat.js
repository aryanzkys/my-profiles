const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const PRESENCE_FILE = path.join(DATA_DIR, 'admin-presence.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = event.body ? JSON.parse(event.body) : {};
  const email = String(body.email || '').toLowerCase();
  const uid = body.uid || null;
  const name = body.name || null;
  const provider = body.provider || null;
    const now = new Date().toISOString();
  const rec = { id: email || uid, email, uid, name, provider, last_seen: now };
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
  const url = `${SUPABASE_URL}/rest/v1/admin_presence`;
  const res = await fetch(url, { method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(rec) });
        if (res.ok) return { statusCode: 200, body: 'OK' };
      } catch {}
      try {
        // Storage upsert JSON map keyed by id
        const sres = await fetch(`${SUPABASE_URL}/storage/v1/object/app_data/admin-presence.json`, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
        let map = {};
        if (sres.ok) { try { map = JSON.parse(await sres.text()) || {}; } catch { map = {}; } }
        map[rec.id] = rec;
        const wr = await fetch(`${SUPABASE_URL}/storage/v1/object/app_data/admin-presence.json`, { method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(map) });
        if (wr.ok) return { statusCode: 200, body: 'OK' };
      } catch {}
    }
    try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
    let map = {};
    if (fs.existsSync(PRESENCE_FILE)) { try { map = JSON.parse(fs.readFileSync(PRESENCE_FILE, 'utf8')) || {}; } catch { map = {}; } }
    map[rec.id] = rec;
    fs.writeFileSync(PRESENCE_FILE, JSON.stringify(map, null, 2), 'utf8');
    return { statusCode: 200, body: 'OK' };
  } catch { return { statusCode: 500, body: 'Error' }; }
};
