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
async function storageWrite(arr, bucket = 'app_data', object = 'admins.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`, {
    method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(arr)
  });
  return res.ok;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'DELETE') return { statusCode: 405, body: 'Method Not Allowed' };
  const uid = (event.queryStringParameters?.uid || '').trim();
  const email = (event.queryStringParameters?.email || '').trim().toLowerCase();
  if (!uid && !email) return { statusCode: 400, body: 'uid or email required' };
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      // Prefer delete by primary id (we stored id as uid or email)
      const id = uid || email;
      const url = `${SUPABASE_URL}/rest/v1/admin_authorities?id=eq.${encodeURIComponent(id)}`;
      const res = await fetch(url, { method: 'DELETE', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
      if (res.ok || res.status === 204) return { statusCode: 200, body: 'OK' };
      const t = await res.text();
      if (res.status === 404 && /Could not find the table/i.test(t)) {
        const arr = await storageRead();
        if (arr) {
          const next = arr.filter((x) => !((uid && x.uid === uid) || (!uid && x.email && String(x.email).toLowerCase() === email)));
          const ok = await storageWrite(next);
          if (ok) return { statusCode: 200, body: 'OK' };
        }
      }
    }
    // Filesystem fallback
    if (!fs.existsSync(DATA_FILE)) return { statusCode: 200, body: 'OK' };
    const arr = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || [];
    const next = arr.filter((x) => !((uid && x.uid === uid) || (!uid && x.email && String(x.email).toLowerCase() === email)));
    fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 2), 'utf8');
    return { statusCode: 200, body: 'OK' };
  } catch {
    return { statusCode: 500, body: 'Error' };
  }
};
