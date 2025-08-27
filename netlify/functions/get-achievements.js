const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PG_URL = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
let pool;

function getPool() {
  if (pool) return pool;
  const hasDiscrete = process.env.SUPABASE_DB_HOST || process.env.SUPABASE_DB_PASSWORD;
  const base = { max: 1, idleTimeoutMillis: 5000, connectionTimeoutMillis: 5000, ssl: { rejectUnauthorized: false } };
  if (hasDiscrete) {
    let host = (process.env.SUPABASE_DB_HOST || '').trim();
    if (/^\w+:\/\//.test(host)) {
      try { host = new URL(host).hostname; } catch {}
    }
    pool = new Pool({
      ...base,
      host,
      port: Number(process.env.SUPABASE_DB_PORT || 5432),
      database: process.env.SUPABASE_DB_DATABASE || 'postgres',
      user: process.env.SUPABASE_DB_USER || 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD,
    });
  } else if (PG_URL) {
    pool = new Pool({ ...base, connectionString: PG_URL });
  } else {
    return null;
  }
  return pool;
}

async function ensureSchema(client) {
  await client.query(`
    create table if not exists app_data (
      id text primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    );
  `);
}

exports.handler = async function () {
  try {
    // 0) Prefer Supabase REST (no direct DB, avoids DNS issues with db.<ref>)
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/app_data?select=data&id=eq.achievements`;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows[0] && rows[0].data) {
          return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(rows[0].data) };
        }
      } else if (res.status === 404) {
        // If table missing, try Supabase Storage fallback
        try {
          const sres = await fetch(`${SUPABASE_URL}/storage/v1/object/app_data/achievements.json`, {
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
          });
          if (sres.ok) {
            const text = await sres.text();
            try {
              const json = JSON.parse(text);
              return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) };
            } catch {
              return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: text };
            }
          }
        } catch {}
        const t = await res.text();
        throw new Error(`Supabase REST get failed (${res.status}): ${t}`);
      } else {
        const t = await res.text();
        throw new Error(`Supabase REST get failed (${res.status}): ${t}`);
      }
    }

    const p = getPool();
    if (p) {
      const client = await p.connect();
      try {
        await ensureSchema(client);
        const { rows } = await client.query('select data from app_data where id = $1 limit 1', ['achievements']);
        if (rows[0] && rows[0].data) {
          return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(rows[0].data) };
        }
      } finally {
        client.release();
      }
    }

  // Fallback to local JSON
    const filePath = path.join(process.cwd(), 'data', 'achievements.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: raw };
  } catch (e) {
    return { statusCode: 500, body: `Get error: ${e.message || 'Failed to get achievements'}` };
  }
};
