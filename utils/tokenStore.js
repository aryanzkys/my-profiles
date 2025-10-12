const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN_TTL_MS = 30 * 60 * 1000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'password-reset-tokens.json');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET_TOKENS || 'app_data';
const SUPABASE_OBJECT = process.env.SUPABASE_OBJECT_TOKENS || 'password-reset-tokens.json';

const supabaseHeaders = SUPABASE_SERVICE_ROLE_KEY ? {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
} : null;

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function isExpired(expiresAt) {
  if (!expiresAt) return true;
  const ts = new Date(expiresAt).getTime();
  if (Number.isNaN(ts)) return true;
  return ts <= Date.now();
}

async function restDeleteByEmail(email) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  const url = `${SUPABASE_URL}/rest/v1/admin_password_reset_tokens?email=eq.${encodeURIComponent(email)}`;
  try {
    await fetch(url, {
      method: 'DELETE',
      headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
    });
  } catch (err) {
    console.error('Gagal menghapus token lama via REST:', err?.message || err);
  }
}

async function restUpsertToken(record) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const url = `${SUPABASE_URL}/rest/v1/admin_password_reset_tokens`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(record),
  });
  if (res.ok) return true;
  const text = await res.text().catch(() => '');
  if (res.status === 404 && /Could not find the table/i.test(text)) return false;
  throw new Error(`Supabase REST upsert token gagal (${res.status})`);
}

async function restFetchToken(token) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/admin_password_reset_tokens?token=eq.${encodeURIComponent(token)}&select=*&limit=1`;
  const res = await fetch(url, { headers: { ...supabaseHeaders, Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 404 && /Could not find the table/i.test(text)) return null;
    throw new Error(`Supabase REST fetch token gagal (${res.status})`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows[0];
}

async function restMarkUsed(token) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const url = `${SUPABASE_URL}/rest/v1/admin_password_reset_tokens?token=eq.${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ used: true, used_at: nowIso() }),
  });
  if (res.ok) return true;
  const text = await res.text().catch(() => '');
  if (res.status === 404 && /Could not find the table/i.test(text)) return false;
  throw new Error(`Supabase REST mark used gagal (${res.status})`);
}

async function restDeleteByToken(token) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const url = `${SUPABASE_URL}/rest/v1/admin_password_reset_tokens?token=eq.${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
  });
  if (res.ok) return true;
  const text = await res.text().catch(() => '');
  if (res.status === 404 && /Could not find the table/i.test(text)) return false;
  throw new Error(`Supabase REST delete token gagal (${res.status})`);
}

async function storageRead() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(SUPABASE_BUCKET)}/${SUPABASE_OBJECT}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) return null;
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function storageWrite(records) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(SUPABASE_BUCKET)}/${SUPABASE_OBJECT}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    body: JSON.stringify(records),
  });
  return res.ok;
}

async function readLocalFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const json = JSON.parse(raw);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

async function writeLocalFile(records) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

function pruneRecords(records) {
  const now = Date.now();
  return records.filter((row) => {
    if (!row) return false;
    if (row.used) return false;
    const exp = new Date(row.expires_at).getTime();
    if (Number.isNaN(exp)) return false;
    return exp > now;
  });
}

module.exports = {
  /**
   * Membuat token reset baru dan menyimpannya di penyimpanan persisten.
   */
  async createToken(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) throw new Error('Email tidak valid saat membuat token.');

    const token = crypto.randomBytes(32).toString('hex');
    const record = {
      token,
      email: normalized,
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      used: false,
      created_at: nowIso(),
    };

    try {
      await restDeleteByEmail(normalized);
      const ok = await restUpsertToken(record);
      if (ok) return token;
    } catch (err) {
      console.error('Gagal menyimpan token via Supabase REST:', err?.message || err);
    }

    // Fallback ke Supabase Storage JSON
    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        const cleaned = pruneRecords(records).filter((row) => normalizeEmail(row.email) !== normalized);
        cleaned.push(record);
        const ok = await storageWrite(cleaned);
        if (ok) return token;
      }
    } catch (err) {
      console.error('Gagal menyimpan token ke storage Supabase:', err?.message || err);
    }

    // Fallback terakhir ke filesystem lokal
    const local = await readLocalFile();
    const cleaned = pruneRecords(local).filter((row) => normalizeEmail(row.email) !== normalized);
    cleaned.push(record);
    const ok = await writeLocalFile(cleaned);
    if (!ok) throw new Error('Gagal menyimpan token reset password.');
    return token;
  },

  /**
   * Mengambil detail token jika masih valid.
   */
  async lookupToken(token) {
    if (!token) return null;

    try {
      const viaRest = await restFetchToken(token);
      if (viaRest) {
        if (viaRest.used || isExpired(viaRest.expires_at)) {
          await restDeleteByToken(token);
          return null;
        }
        return {
          email: normalizeEmail(viaRest.email),
          expiresAt: new Date(viaRest.expires_at).getTime(),
          used: !!viaRest.used,
        };
      }
    } catch (err) {
      console.error('Gagal membaca token via Supabase REST:', err?.message || err);
    }

    // Cek di Supabase Storage
    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        const cleaned = pruneRecords(records);
        const match = cleaned.find((row) => row.token === token);
        if (match) {
          return {
            email: normalizeEmail(match.email),
            expiresAt: new Date(match.expires_at).getTime(),
            used: !!match.used,
          };
        }
        if (cleaned.length !== records.length) {
          await storageWrite(cleaned);
        }
      }
    } catch (err) {
      console.error('Gagal membaca token dari storage Supabase:', err?.message || err);
    }

    // Cek filesystem lokal
    const local = await readLocalFile();
    const cleaned = pruneRecords(local);
    const match = cleaned.find((row) => row.token === token);
    if (cleaned.length !== local.length) {
      await writeLocalFile(cleaned);
    }
    if (!match) return null;
    return {
      email: normalizeEmail(match.email),
      expiresAt: new Date(match.expires_at).getTime(),
      used: !!match.used,
    };
  },

  /**
   * Menandai token sebagai sudah digunakan agar tidak dapat digunakan ulang.
   */
  async markUsed(token) {
    if (!token) return;

    try {
      const restOk = await restMarkUsed(token);
      if (restOk) return;
    } catch (err) {
      console.error('Gagal menandai token via REST:', err?.message || err);
    }

    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        const next = records.map((row) => {
          if (row.token !== token) return row;
          return { ...row, used: true, used_at: nowIso() };
        });
        await storageWrite(next);
        return;
      }
    } catch (err) {
      console.error('Gagal menandai token di storage Supabase:', err?.message || err);
    }

    const local = await readLocalFile();
    const next = local.map((row) => {
      if (row.token !== token) return row;
      return { ...row, used: true, used_at: nowIso() };
    });
    await writeLocalFile(next);
  },

  /**
   * Menghapus token dari store (misal setelah password sukses direset).
   */
  async deleteToken(token) {
    if (!token) return;

    try {
      const restOk = await restDeleteByToken(token);
      if (restOk) return;
    } catch (err) {
      console.error('Gagal menghapus token via REST:', err?.message || err);
    }

    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        const next = records.filter((row) => row.token !== token);
        await storageWrite(next);
        return;
      }
    } catch (err) {
      console.error('Gagal menghapus token di storage Supabase:', err?.message || err);
    }

    const local = await readLocalFile();
    const next = local.filter((row) => row.token !== token);
    await writeLocalFile(next);
  },
};
