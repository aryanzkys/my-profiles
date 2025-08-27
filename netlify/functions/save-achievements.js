const { Pool } = require('pg');

const PG_URL = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
let pool;

function getPool() {
  if (pool) return pool;
  const hasDiscrete = process.env.SUPABASE_DB_HOST || process.env.SUPABASE_DB_PASSWORD;
  if (!PG_URL && !hasDiscrete) {
    throw new Error('Supabase/Postgres config not set. Provide SUPABASE_DB_URL (URL-encode password if it contains #) or discrete vars SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_DATABASE, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD');
  }
  const base = { max: 1, idleTimeoutMillis: 5000, connectionTimeoutMillis: 5000, ssl: { rejectUnauthorized: false } };
  if (hasDiscrete) {
    let host = (process.env.SUPABASE_DB_HOST || '').trim();
    // If someone pasted a full URL into HOST, extract the hostname
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
  } else {
    pool = new Pool({ ...base, connectionString: PG_URL });
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

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const client = await getPool().connect();
    try {
      await ensureSchema(client);
      await client.query(
        `insert into app_data (id, data, updated_at)
         values ($1, $2::jsonb, now())
         on conflict (id) do update set data = excluded.data, updated_at = now()`,
        ['achievements', body]
      );
    } finally {
      client.release();
    }
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, via: 'supabase-postgres' }) };
  } catch (e) {
    return { statusCode: 500, body: `Save error: ${e.message || 'Failed to save achievements'}` };
  }
};
