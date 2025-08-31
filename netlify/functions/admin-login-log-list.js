const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(DATA_DIR, 'admin-logins.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async () => {
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const url = `${SUPABASE_URL}/rest/v1/admin_logins?select=*&order=ts.desc&limit=500`;
        const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' } });
        if (r.ok) { const rows = await r.json(); return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(rows) }; }
        const t = await r.text();
        if (r.status !== 404 || !/Could not find the table/i.test(t)) throw new Error('supabase rest failed');
      } catch {}
      try {
        const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent('app_data')}/admin-logins.json`;
        const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
        if (r.ok) { const text = await r.text(); try { const arr = JSON.parse(text); return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(Array.isArray(arr)?arr:[]) }; } catch { return { statusCode: 200, headers: { 'content-type':'application/json' }, body: '[]' }; }
        }
      } catch {}
    }
    if (!fs.existsSync(LOG_FILE)) return { statusCode: 200, headers: { 'content-type':'application/json' }, body: '[]' };
    const arr = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) || [];
    return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(arr) };
  } catch {
    return { statusCode: 500, body: 'Error' };
  }
};
