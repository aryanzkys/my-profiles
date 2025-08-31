const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'admins.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function storageRead(bucket = 'app_data', object = 'admins.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!res.ok) return null;
  const text = await res.text();
  try { const json = JSON.parse(text); return Array.isArray(json) ? json : []; } catch { return []; }
}

exports.handler = async () => {
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/admin_authorities?select=*&order=created_at.desc`;
      const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' } });
      if (res.ok) {
        const rows = await res.json();
        return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(rows) };
      }
      const t = await res.text();
      if (res.status === 404 && /Could not find the table/i.test(t)) {
        const arr = await storageRead();
        if (arr) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(arr) };
      }
    }
    if (!fs.existsSync(DATA_FILE)) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: '[]' };
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: raw };
  } catch {
    return { statusCode: 500, body: 'Error' };
  }
};
