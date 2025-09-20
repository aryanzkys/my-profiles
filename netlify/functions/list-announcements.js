const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'announcements.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function storageRead(bucket = 'app_data', object = 'announcements.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

exports.handler = async () => {
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/announcements?select=*&order=updated_at.desc&limit=100`;
      const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' } });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(rows) };
        }
        // If table exists but empty, try storage fallback
        const s = await storageRead();
        if (s) {
          const arr = Array.isArray(s) ? s : (s ? [s] : []);
          return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(arr) };
        }
      } else {
        // If REST fails (e.g., missing table), try storage fallback
        const s = await storageRead();
        if (s) {
          const arr = Array.isArray(s) ? s : (s ? [s] : []);
          return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(arr) };
        }
      }
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(arr) };
    }
    return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify([]) };
  } catch (e) {
    return { statusCode: 500, body: e.message || 'Failed to list announcements' };
  }
};
