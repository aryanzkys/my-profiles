const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function ensureStorageBucket(bucket = 'app_data') {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name: bucket, public: false }),
  });
  if (res.ok || res.status === 409) return true;
  const t = await res.text();
  if (/exist/i.test(t)) return true;
  throw new Error(`Supabase Storage create bucket failed (${res.status}): ${t}`);
}

async function saveToStorage(json, bucket = 'app_data', object = 'organizations.json') {
  await ensureStorageBucket(bucket);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body: JSON.stringify(json),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase Storage save failed (${res.status}): ${t}`);
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = event.body ? JSON.parse(event.body) : [];
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/app_data`;
      let res = await fetch(url, { method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ id: 'organizations', data: body, updated_at: new Date().toISOString() }) });
      if (!res.ok) {
        const t = await res.text();
        if (res.status === 404 && t.includes('Could not find the table')) {
          await saveToStorage(body);
          await new Promise((r) => setTimeout(r, 150));
          res = await fetch(url, { method: 'POST', headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ id: 'organizations', data: body, updated_at: new Date().toISOString() }) });
          if (!res.ok) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-storage' }) };
        } else {
          throw new Error(`Supabase REST save failed (${res.status}): ${t}`);
        }
      }
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-rest' }) };
    }
    return { statusCode: 500, body: 'Supabase not configured' };
  } catch (e) {
    return { statusCode: 500, body: `Save error: ${e.message || 'Failed to save organizations'}` };
  }
};
