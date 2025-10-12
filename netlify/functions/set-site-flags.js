const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'site-flags.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function storageWrite(json, bucket = 'app_data', object = 'site-flags.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`, {
    method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(json)
  });
  return res.ok;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const shutdown = !!(body.shutdown ?? body.shutdownMain ?? body.shutdown_main);
    const shutdownAi = !!(body.shutdownAi ?? body.shutdown_ai ?? body.shutdownai ?? body.aiShutdown);
    const storagePayload = { shutdown, shutdownAi };
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/site_flags`;
      // Upsert single row with id=1
      const res = await fetch(url, { method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ id: 1, shutdown, shutdown_ai: shutdownAi }) });
      if (res.ok) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, shutdown, shutdownAi }) };
      const t = await res.text();
      if (res.status === 404 && /Could not find the table/i.test(t)) {
        const ok = await storageWrite(storagePayload);
        if (ok) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-storage', shutdown, shutdownAi }) };
      }
    }
    // FS fallback
    try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
    fs.writeFileSync(DATA_FILE, JSON.stringify(storagePayload, null, 2), 'utf8');
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: 'filesystem', shutdown, shutdownAi }) };
  } catch { return { statusCode: 500, body: 'Error' }; }
};
