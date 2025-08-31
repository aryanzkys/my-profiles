const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async () => {
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/admin_audit?select=*&order=ts.desc&limit=200`;
      const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' } });
      if (res.ok) {
        const rows = await res.json();
        return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(rows) };
      }
      const t = await res.text();
      if (res.status === 404 && /Could not find the table/i.test(t)) {
        // try storage
        const sres = await fetch(`${SUPABASE_URL}/storage/v1/object/app_data/admin-audit.json`, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
        if (sres.ok) {
          const text = await sres.text();
          try { const arr = JSON.parse(text); return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(arr) }; } catch {}
        }
      }
    }
    const AUDIT = path.join(DATA_DIR, 'admin-audit.json');
    if (!fs.existsSync(AUDIT)) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: '[]' };
    const raw = fs.readFileSync(AUDIT, 'utf8');
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: raw };
  } catch {
    return { statusCode: 500, body: 'Error' };
  }
};
