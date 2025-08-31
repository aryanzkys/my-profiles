// Netlify Function: feedback-list (Supabase-first with Storage/FS fallback)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'feedbacks.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function ensureDataFile() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
  try { if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8'); } catch {}
}

function loadFS() {
  ensureDataFile();
  try { const raw = fs.readFileSync(DATA_FILE, 'utf8'); const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

exports.handler = async () => {
  try {
    // 1) Supabase REST
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/feedbacks?select=*&order=created_at.desc`; // latest first
      const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
      if (r.ok) {
        const rows = await r.json();
        return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(rows) };
      }
    }

    // 2) Storage JSON fallback
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/storage/v1/object/app_data/feedbacks.json`;
      const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
      if (r.ok) { const t = await r.text(); try { const rows = JSON.parse(t); return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(Array.isArray(rows)?rows:[]) }; } catch {} }
    }

    // 3) FS fallback
    const rows = loadFS();
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(rows) };
  } catch {
    return { statusCode: 500, body: 'Server error' };
  }
};
