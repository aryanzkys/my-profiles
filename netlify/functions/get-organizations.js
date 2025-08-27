const fs = require('fs');
const path = require('path');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async function () {
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/app_data?select=data&id=eq.organizations`;
      const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' } });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows[0] && rows[0].data) {
          return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(rows[0].data) };
        }
      } else if (res.status === 404) {
        const sres = await fetch(`${SUPABASE_URL}/storage/v1/object/app_data/organizations.json`, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
        if (sres.ok) {
          const text = await sres.text();
          return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: text };
        }
      }
    }
    const filePath = path.join(process.cwd(), 'data', 'organizations.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: raw };
  } catch (e) {
    return { statusCode: 500, body: `Get error: ${e.message || 'Failed to get organizations'}` };
  }
};
