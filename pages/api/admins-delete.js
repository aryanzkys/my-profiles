import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'admins.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = 'prayogoaryan63@gmail.com';

async function storageRead(bucket = 'app_data', object = 'admins.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!r.ok) return null;
  const text = await r.text();
  try { const json = JSON.parse(text); return Array.isArray(json) ? json : []; } catch { return []; }
}
async function storageWrite(arr, bucket = 'app_data', object = 'admins.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}` , {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body: JSON.stringify(arr),
  });
  return r.ok;
}

async function auditWrite(entry) {
  const bucket = 'app_data';
  const object = 'admin-audit.json';
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/admin_audit`;
      const r = await fetch(url, { method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...entry, ts: entry.ts || new Date().toISOString() }) });
      if (r.ok) return true;
      const t = await r.text();
      if (r.status !== 404 || !/Could not find the table/i.test(t)) throw new Error('audit rest failed');
    } catch {}
    try {
      const read = await storageRead(bucket, object);
      const next = Array.isArray(read) ? [...read, { ...entry, ts: entry.ts || new Date().toISOString() }] : [{ ...entry, ts: entry.ts || new Date().toISOString() }];
      const ok = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`, { method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(next) });
      if (ok.ok) return true;
    } catch {}
  }
  try {
    const AUDIT = path.join(DATA_DIR, 'admin-audit.json');
    let arr = [];
    if (fs.existsSync(AUDIT)) { try { arr = JSON.parse(fs.readFileSync(AUDIT, 'utf8')) || []; } catch { arr = []; } }
    arr.push({ ...entry, ts: entry.ts || new Date().toISOString() });
    fs.writeFileSync(AUDIT, JSON.stringify(arr, null, 2), 'utf8');
    return true;
  } catch {}
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  try {
    const uid = String(req.query?.uid || '').trim();
    const email = String(req.query?.email || '').trim().toLowerCase();
    if (!uid && !email) return res.status(400).send('uid or email required');
    if (email === OWNER_EMAIL) return res.status(400).send('Owner cannot be deleted');
    let actor_email = null, actor_uid = null, actor_name = null;
    try {
      const body = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      actor_email = String(body.actorEmail || '').toLowerCase() || null;
      actor_uid = body.actorUid || null;
      actor_name = body.actorName || null;
    } catch {}

    // Supabase-first
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const id = uid || email;
      const attempts = [];
      if (id) attempts.push(`${SUPABASE_URL}/rest/v1/admin_authorities?id=eq.${encodeURIComponent(id)}`);
      if (uid) attempts.push(`${SUPABASE_URL}/rest/v1/admin_authorities?uid=eq.${encodeURIComponent(uid)}`);
      if (email) attempts.push(`${SUPABASE_URL}/rest/v1/admin_authorities?email=eq.${encodeURIComponent(email)}`);
      let tableNotFound = false;
      for (const u of attempts) {
        try {
          const r = await fetch(u, { method: 'DELETE', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
          if (r.ok || r.status === 204) {
            try { await auditWrite({ action: 'delete', actor_email, actor_uid, actor_name, target_email: email || null, target_uid: uid || null }); } catch {}
            return res.status(200).send('OK');
          }
          const txt = await r.text();
          if (r.status === 404 && /Could not find the table/i.test(txt)) { tableNotFound = true; break; }
        } catch {}
      }
      if (tableNotFound) {
        const arr = await storageRead();
        if (arr) {
          const next = arr.filter((x) => !((uid && x.uid === uid) || (!uid && x.email && String(x.email).toLowerCase() === email)));
          const ok = await storageWrite(next);
          if (ok) {
            try { await auditWrite({ action: 'delete', actor_email, actor_uid, actor_name, target_email: email || null, target_uid: uid || null }); } catch {}
            return res.status(200).send('OK');
          }
        }
      }
    }

    // Filesystem fallback
    if (!fs.existsSync(DATA_FILE)) return res.status(200).send('OK');
    const arr = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || [];
    const next = arr.filter((x) => !((uid && x.uid === uid) || (!uid && x.email && String(x.email).toLowerCase() === email)));
    fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 2), 'utf8');
  try { await auditWrite({ action: 'delete', actor_email, actor_uid, actor_name, target_email: email || null, target_uid: uid || null }); } catch {}
    return res.status(200).send('OK');
  } catch {
    return res.status(500).send('Error');
  }
}
