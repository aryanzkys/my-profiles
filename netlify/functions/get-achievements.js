const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const PG_URL = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
let pool;

function getPool() {
  if (pool) return pool;
  if (!PG_URL) return null;
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

exports.handler = async function () {
  try {
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
