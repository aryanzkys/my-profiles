const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'site-flags.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function storageRead(bucket = 'app_data', object = 'site-flags.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

exports.handler = async () => {
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/site_flags?select=*&limit=1`;
      const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' } });
      if (res.ok) {
        const rows = await res.json();
        const row = rows?.[0] || {};
        return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ shutdown: !!row.shutdown }) };
      } else {
        const t = await res.text();
        if (res.status === 404 && /Could not find the table/i.test(t)) {
          const s = await storageRead();
          if (s) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ shutdown: !!s.shutdown }) };
        }
      }
    }
    if (fs.existsSync(DATA_FILE)) {
      const json = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ shutdown: !!json.shutdown }) };
    }
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ shutdown: false }) };
  } catch { return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ shutdown: false }) }; }
};
