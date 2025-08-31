const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const PRESENCE_FILE = path.join(DATA_DIR, 'admin-presence.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async () => {
  const now = Date.now();
  const ONLINE_MS = 5 * 60 * 1000; // 5 minutes
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const url = `${SUPABASE_URL}/rest/v1/admin_presence?select=*`;
        const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' } });
        if (res.ok) {
          const rows = await res.json();
          const out = (rows || []).map(r => ({ id: r.id || r.email || r.uid, email: r.email || null, uid: r.uid || null, name: r.name || null, provider: r.provider || null, last_seen: r.last_seen || r.updated_at || r.created_at, online: r.last_seen ? (now - Date.parse(r.last_seen)) < ONLINE_MS : false }));
          return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(out) };
        }
      } catch {}
      try {
        const sres = await fetch(`${SUPABASE_URL}/storage/v1/object/app_data/admin-presence.json`, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
        if (sres.ok) {
          const text = await sres.text();
          const map = JSON.parse(text || '{}') || {};
          const out = Object.values(map).map(r => ({ ...r, online: r.last_seen ? (now - Date.parse(r.last_seen)) < ONLINE_MS : false }));
          return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(out) };
        }
      } catch {}
    }
    if (!fs.existsSync(PRESENCE_FILE)) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: '[]' };
    const map = JSON.parse(fs.readFileSync(PRESENCE_FILE, 'utf8') || '{}') || {};
  const out = Object.values(map).map(r => ({ ...r, online: r.last_seen ? (now - Date.parse(r.last_seen)) < ONLINE_MS : false }));
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(out) };
  } catch {
    return { statusCode: 500, body: 'Error' };
  }
};
