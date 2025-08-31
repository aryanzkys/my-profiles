import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(DATA_DIR, 'admin-logins.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const url = `${SUPABASE_URL}/rest/v1/admin_logins?select=*&order=ts.desc&limit=500`;
        const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' } });
        if (r.ok) { const rows = await r.json(); return res.status(200).json(rows); }
        const t = await r.text();
        if (r.status !== 404 || !/Could not find the table/i.test(t)) throw new Error('supabase rest failed');
      } catch {}
      try {
        const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent('app_data')}/admin-logins.json`;
        const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
        if (r.ok) { const text = await r.text(); try { const arr = JSON.parse(text); return res.status(200).json(Array.isArray(arr)?arr:[]); } catch { return res.status(200).json([]); } }
      } catch {}
    }
    if (!fs.existsSync(LOG_FILE)) return res.status(200).json([]);
    const arr = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) || [];
    return res.status(200).json(arr);
  } catch { return res.status(500).send('Error'); }
}
