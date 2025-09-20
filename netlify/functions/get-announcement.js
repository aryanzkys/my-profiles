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

exports.handler = async (event) => {
  try {
    const qs = (event && event.queryStringParameters) || {};
    const reqTarget = (qs.target || '').toLowerCase();
    const targetPref = reqTarget === 'ai' ? 'ai' : (reqTarget === 'main' ? 'main' : 'both');
    const acceptableTargets = targetPref === 'ai' ? ['ai','both'] : (targetPref === 'main' ? ['main','both'] : ['both','ai','main']);
    // Prefer Supabase REST table
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      // Get recent rows filtered by active and acceptable targets, then pick the best one
      const inList = acceptableTargets.join(',');
      const url = `${SUPABASE_URL}/rest/v1/announcements?select=*&active=eq.true&target=in.(${inList})&order=updated_at.desc&limit=20`;
      const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' } });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          // Prefer exact target match over 'both'
          const row = rows.find(r => r.target === targetPref) || rows[0] || {};
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
            target: row.target || 'both',
          };
          return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(out) };
        }
        // If table exists but is empty, attempt storage fallback
  const s = await storageRead();
        if (s) {
          let chosen = null;
          if (Array.isArray(s)) {
            const candidates = s.filter(x => x && x.active && acceptableTargets.includes((x.target||'both'))).sort((a,b)=> new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
            chosen = candidates.find(x => (x.target||'both') === targetPref) || candidates[0] || null;
          } else if (s && typeof s === 'object') {
            chosen = s;
          }
          const out = chosen ? { target: 'both', ...chosen } : { active: false, target: 'both' };
          return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(out) };
        }
      } else {
        const t = await res.text();
        if (res.status === 404 && /Could not find the table/i.test(t)) {
          const s = await storageRead();
          if (s) {
            let chosen = null;
            if (Array.isArray(s)) {
              const candidates = s.filter(x => x && x.active && acceptableTargets.includes((x.target||'both'))).sort((a,b)=> new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
              chosen = candidates.find(x => (x.target||'both') === targetPref) || candidates[0] || null;
            } else if (s && typeof s === 'object') {
              chosen = s;
            }
            const out = chosen ? { target: 'both', ...chosen } : { active: false, target: 'both' };
            return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(out) };
          }
        }
      }
    }
    // FS fallback
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      let chosen = null;
      if (Array.isArray(raw)) {
        const candidates = raw.filter(x => x && x.active && acceptableTargets.includes((x.target||'both'))).sort((a,b)=> new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
        chosen = candidates.find(x => (x.target||'both') === targetPref) || candidates[0] || null;
      } else if (raw && typeof raw === 'object') {
        chosen = raw;
      }
      const out = chosen ? { target: 'both', ...chosen } : { active: false, target: 'both' };
      return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(out) };
    }
    return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify({ active: false, target: 'both' }) };
  } catch { return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify({ active: false, target: 'both' }) }; }
};
