const { Pool } = require('pg');

const PG_URL = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
let pool;

function getPool() {
  if (pool) return pool;
  if (!PG_URL) throw new Error('Supabase/Postgres URL is not set (SUPABASE_DB_URL/POSTGRES_URL/DATABASE_URL)');
  pool = new Pool({ connectionString: PG_URL, max: 1, idleTimeoutMillis: 5000, connectionTimeoutMillis: 5000, ssl: { rejectUnauthorized: false } });
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
