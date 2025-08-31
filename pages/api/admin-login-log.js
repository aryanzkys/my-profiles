import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(DATA_DIR, 'admin-logins.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function storageRead(bucket = 'app_data', object = 'admin-logins.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!r.ok) return null;
  const text = await r.text();
  try { const json = JSON.parse(text); return Array.isArray(json) ? json : []; } catch { return []; }
}
async function storageWrite(arr, bucket = 'app_data', object = 'admin-logins.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`, {
    method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(arr)
  });
  return r.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const nowIso = new Date().toISOString();
    const entry = {
      ts: nowIso,
      uid: (body.uid || null),
      email: (body.email || null),
      name: (body.name || null),
      provider: (body.provider || null),
      photoURL: (body.photoURL || null),
      userAgent: (body.userAgent || req.headers['user-agent'] || null),
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
    };
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const url = `${SUPABASE_URL}/rest/v1/admin_logins`;
        const r = await fetch(url, { method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
        if (r.ok) return res.status(200).json({ ok: true });
        const t = await r.text();
        if (r.status !== 404 || !/Could not find the table/i.test(t)) throw new Error('supabase rest failed');
      } catch {}
      try { const read = await storageRead(); const next = Array.isArray(read) ? [...read, entry] : [entry]; const ok = await storageWrite(next); if (ok) return res.status(200).json({ ok: true, via: 'supabase-storage' }); } catch {}
    }
    try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
    let arr = []; if (fs.existsSync(LOG_FILE)) { try { arr = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) || []; } catch { arr = []; } }
    arr.push(entry); fs.writeFileSync(LOG_FILE, JSON.stringify(arr, null, 2), 'utf8');
    return res.status(200).json({ ok: true, via: 'filesystem' });
  } catch { return res.status(500).send('Error'); }
}
