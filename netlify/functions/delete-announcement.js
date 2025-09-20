const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'announcements.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const id = body.id;
    const hardDelete = !!body.hardDelete;
    if (!id && !hardDelete) return { statusCode: 400, body: 'Missing id' };

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      if (hardDelete) {
        const url = `${SUPABASE_URL}/rest/v1/announcements?id=eq.${encodeURIComponent(id)}`;
        const res = await fetch(url, { method:'DELETE', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
        if (!res.ok) return { statusCode: res.status, body: await res.text() };
      } else {
        const url = `${SUPABASE_URL}/rest/v1/announcements?id=eq.${encodeURIComponent(id)}`;
        const res = await fetch(url, { method:'PATCH', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type':'application/json' }, body: JSON.stringify({ active: false }) });
        if (!res.ok) return { statusCode: res.status, body: await res.text() };
      }
      return { statusCode: 200, body: JSON.stringify({ ok: true, via: 'supabase-rest' }) };
    }

    // FS fallback
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      let arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      if (hardDelete) arr = arr.filter((x, idx) => String(x?.id||idx) !== String(id));
      else arr = arr.map((x, idx) => (String(x?.id||idx) === String(id) ? { ...x, active: false } : x));
      fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
      return { statusCode: 200, body: JSON.stringify({ ok: true, via: 'filesystem' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, via: 'noop' }) };
  } catch (e) {
    return { statusCode: 500, body: e.message || 'Failed to delete' };
  }
};
