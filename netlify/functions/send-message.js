// Netlify Function: send-message (Supabase-backed with graceful fallbacks)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function ensureStorageBucket(bucket = 'app_data') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name: bucket, public: false }),
  });
  if (res.ok || res.status === 409) return true;
  const t = await res.text();
  if (/exist/i.test(t)) return true;
  return false;
}

async function storageRead(bucket = 'app_data', object = 'messages.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!res.ok) return null;
  const text = await res.text();
  try { const json = JSON.parse(text); return Array.isArray(json) ? json : []; } catch { return []; }
}

async function storageWrite(arr, bucket = 'app_data', object = 'messages.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  await ensureStorageBucket(bucket);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body: JSON.stringify(arr),
  });
  return res.ok;
}

function ensureDataFile() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
  try { if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8'); } catch {}
}

function loadMessagesFS() {
  ensureDataFile();
  try { const raw = fs.readFileSync(DATA_FILE, 'utf8'); const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

function saveMessagesFS(arr) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    let { instagram, initials, message } = body;
    instagram = (instagram || '-').toString().trim();
    if (!/^@?[a-z0-9._-]{0,40}$/i.test(instagram)) instagram = '-';
    initials = (initials || '').toString().trim();
    message = (message || '').toString();

    if (!initials) return { statusCode: 400, body: 'Initials required' };
    if (!message.trim()) return { statusCode: 400, body: 'Message required' };
    if (message.length > 500) message = message.slice(0, 500);

    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      instagram: instagram.startsWith('@') ? instagram : (instagram ? '@' + instagram : '-'),
      initials,
      message: message.trim(),
      created_at: new Date().toISOString(),
    };

    // 1) Supabase REST (messages table)
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, id: entry.id, via: 'supabase-rest' }) };
      } else {
        const t = await res.text();
        // If table missing, fallback to Storage JSON log and return ok
        if (res.status === 404 && /Could not find the table/i.test(t)) {
          const current = (await storageRead()) || [];
          current.unshift(entry);
          const ok = await storageWrite(current);
          if (ok) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, id: entry.id, via: 'supabase-storage' }) };
          // fallthrough to FS if storage failed
        } else {
          // unknown REST error; proceed to fallback
        }
      }
    }

    // 2) Filesystem fallback (dev)
    const arr = loadMessagesFS();
    arr.unshift({ ...entry });
    saveMessagesFS(arr);
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, id: entry.id, via: 'filesystem' }) };
  } catch (e) {
    return { statusCode: 500, body: 'Server error' };
  }
};
