const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase Storage fallback (REST-only, no direct DB or Meta API required)
async function ensureStorageBucket(bucket = 'app_data') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const endpoint = `${SUPABASE_URL}/storage/v1/bucket`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ name: bucket, public: false }),
  });
  if (res.ok || res.status === 409) return true; // created or already exists
  // Some deployments may return 400/404 with text mentioning exists; be lenient
  const t = await res.text();
  if (/exist/i.test(t)) return true;
  throw new Error(`Supabase Storage create bucket failed (${res.status}): ${t}`);
}

async function saveToStorage(json, bucket = 'app_data', object = 'achievements.json') {
  await ensureStorageBucket(bucket);
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${object}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    body: JSON.stringify(json),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase Storage save failed (${res.status}): ${t}`);
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = event.body ? JSON.parse(event.body) : {};
  // 0) Supabase REST-first (service role). If table missing, fallback to Storage only.
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      // Ensure table exists (via RPC or SQL is overkill here). We'll attempt upsert; if table missing, fall back to PG path which creates it.
      const url = `${SUPABASE_URL}/rest/v1/app_data`;
      let res = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ id: 'achievements', data: body, updated_at: new Date().toISOString() }),
      });
      if (!res.ok) {
        const t = await res.text();
        // If table missing, try a REST-only fallback to Supabase Storage then retry REST once
    if (res.status === 404 && t && t.includes("Could not find the table")) {
          try {
            // Save payload to Storage so data persists even if table doesn't exist yet
            await saveToStorage(body);
            // tiny delay; in case a background migration creates the table later
            await new Promise((r) => setTimeout(r, 150));
          } catch (e) {
      throw new Error(`Supabase REST save failed (${res.status}): ${t}. Storage fallback also failed: ${e.message}`);
          }
          // Retry REST once
          res = await fetch(url, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify({ id: 'achievements', data: body, updated_at: new Date().toISOString() }),
          });
      if (res.ok) return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-rest' }) };
      // If REST still fails, rely on Storage fallback which already succeeded
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-storage' }) };
        }
        throw new Error(`Supabase REST save failed (${res.status}): ${t}`);
      }
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-rest' }) };
    }
    return { statusCode: 500, body: 'Supabase not configured' };
  } catch (e) {
    return { statusCode: 500, body: `Save error: ${e.message || 'Failed to save achievements'}` };
  }
};
