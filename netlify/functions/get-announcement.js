const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'announcements.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function storageRead(bucket = 'app_data', object = 'announcements.json') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

exports.handler = async () => {
  try {
    // Prefer Supabase REST table
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/announcements?select=*&order=updated_at.desc&limit=1`;
      const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' } });
      if (res.ok) {
        const rows = await res.json();
        const row = rows?.[0] || {};
        const out = {
          active: !!row.active,
          title: row.title || '',
          message: row.message || '',
          severity: row.severity || 'info',
          ctaText: row.cta_text || '',
          ctaUrl: row.cta_url || '',
          version: String(row.version || '0'),
          updatedAt: row.updated_at || null,
          expiresAt: row.expires_at || null,
          dismissible: row.dismissible !== false,
        };
        return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(out) };
      } else {
        const t = await res.text();
        if (res.status === 404 && /Could not find the table/i.test(t)) {
          const s = await storageRead();
          if (s) return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(s) };
        }
      }
    }
    // FS fallback
    if (fs.existsSync(DATA_FILE)) {
      const json = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(json) };
    }
    return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify({ active: false }) };
  } catch { return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify({ active: false }) }; }
};
