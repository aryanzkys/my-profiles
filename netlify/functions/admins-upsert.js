const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'admins.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = 'prayogoaryan63@gmail.com';

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

async function auditWrite(entry) {
  // entry: { action, actor_email, actor_uid, actor_name, target_email, target_uid, changes, ts }
  const bucket = 'app_data';
  const object = 'admin-audit.json';
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    // Try REST table first
    try {
      const url = `${SUPABASE_URL}/rest/v1/admin_audit`;
      const res = await fetch(url, { method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...entry, ts: entry.ts || new Date().toISOString() }) });
      if (res.ok) return true;
      const t = await res.text();
      if (res.status !== 404 || !/Could not find the table/i.test(t)) throw new Error('audit rest failed');
    } catch {}
    // Storage append fallback
    try {
      const read = await storageRead(bucket, object);
      const next = Array.isArray(read) ? [...read, { ...entry, ts: entry.ts || new Date().toISOString() }] : [{ ...entry, ts: entry.ts || new Date().toISOString() }];
      const ok = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`, { method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(next) });
      if (ok.ok) return true;
    } catch {}
  }
  // FS fallback
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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    // Expected shape: { uid, email, displayName?, canEditSections?: boolean, canAccessDev?: boolean, banned?: boolean }
    const uid = (body.uid || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    if (!uid && !email) return { statusCode: 400, body: 'uid or email is required' };
    const isOwnerTarget = email === OWNER_EMAIL;
    const record = {
      uid: uid || null,
      email: email || null,
      displayName: (body.displayName || '').trim() || null,
      canEditSections: isOwnerTarget ? true : !!body.canEditSections,
      canAccessDev: isOwnerTarget ? true : !!body.canAccessDev,
      banned: isOwnerTarget ? false : !!body.banned,
      updated_at: new Date().toISOString(),
    };
    const actor_email = String(body.actorEmail || '').toLowerCase() || null;
    const actor_uid = body.actorUid || null;
    const actor_name = body.actorName || null;

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/admin_authorities`;
      // Upsert by uid or email (unique constraint expected on at least one)
      const res = await fetch(url, {
        method: 'POST',
        headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ ...record, id: uid || email }),
      });
      if (res.ok) {
        try { await auditWrite({ action: 'upsert', actor_email, actor_uid, actor_name, target_email: email || null, target_uid: uid || null, changes: record }); } catch {}
        return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true }) };
      }
      const t = await res.text();
      if (res.status === 404 && /Could not find the table/i.test(t)) {
        const arr = (await storageRead()) || [];
        let found = false;
        const key = uid || email;
        const next = arr.map((x) => {
          if ((uid && x.uid === uid) || (!uid && x.email && x.email.toLowerCase() === email)) { found = true; return { ...x, ...record, id: key }; }
          return x;
        });
        const out = found ? next : [...arr, { ...record, id: key }];
        const ok = await storageWrite(out);
        if (ok) {
          try { await auditWrite({ action: 'upsert', actor_email, actor_uid, actor_name, target_email: email || null, target_uid: uid || null, changes: record }); } catch {}
          return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-storage' }) };
        }
      }
    }
    // Filesystem fallback
    try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
    let arr = [];
    if (fs.existsSync(DATA_FILE)) {
      try { arr = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || []; } catch { arr = []; }
    }
    const key = uid || email;
    let found = false;
    arr = arr.map((x) => {
      if ((uid && x.uid === uid) || (!uid && x.email && String(x.email).toLowerCase() === email)) { found = true; return { ...x, ...record, id: key }; }
      return x;
    });
    if (!found) arr.push({ ...record, id: key });
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
  try { await auditWrite({ action: 'upsert', actor_email, actor_uid, actor_name, target_email: email || null, target_uid: uid || null, changes: record }); } catch {}
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: 'filesystem' }) };
  } catch {
    return { statusCode: 500, body: 'Error' };
  }
};
