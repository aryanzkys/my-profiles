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

// Fallback in-memory store (untuk lingkungan serverless yang read-only)
const inMemoryTokens = new Map();

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
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Gagal menghapus token lama via REST:', res.status, text);
    }
  } catch (err) {
    console.error('Gagal menghapus token lama via REST:', err?.message || err);
  }
}

async function restReplaceToken(record) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const filters = `?email=eq.${encodeURIComponent(record.email)}&used=is.false`;
  const url = `${SUPABASE_URL}/rest/v1/admin_password_reset_tokens${filters}`;
  const payload = {
    token: record.token,
    expires_at: record.expires_at,
    used: false,
    created_at: record.created_at,
    used_at: null,
  };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  });
  if (res.ok) return true;
  const text = await res.text().catch(() => '');
  if (res.status === 404) return false;
  if (res.status === 409 && /admin_password_reset_tokens_email_active_idx/i.test(text)) return false;
  throw new Error(`Supabase REST replace token gagal (${res.status}${text ? `: ${text}` : ''})`);
}

async function restUpsertToken(record) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const url = `${SUPABASE_URL}/rest/v1/admin_password_reset_tokens`;
  const res = await fetch(`${url}?on_conflict=token`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(record),
  });
  if (res.ok) return true;
  const text = await res.text().catch(() => '');
  if (res.status === 404 && /Could not find the table/i.test(text)) return false;
  if (res.status === 409) {
    const replaced = await restReplaceToken(record);
    if (replaced) return true;
  }
  throw new Error(`Supabase REST upsert token gagal (${res.status}${text ? `: ${text}` : ''})`);
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

function pruneInMemory() {
  const now = Date.now();
  for (const [token, detail] of inMemoryTokens.entries()) {
    const exp = new Date(detail.expires_at).getTime();
    if (detail.used || Number.isNaN(exp) || exp <= now) {
      inMemoryTokens.delete(token);
    }
  }
}

function removeInMemoryByEmail(email) {
  for (const [token, detail] of inMemoryTokens.entries()) {
    if (detail.email === email) {
      inMemoryTokens.delete(token);
    }
  }
}

function storeInMemory(record) {
  pruneInMemory();
  removeInMemoryByEmail(record.email);
  inMemoryTokens.set(record.token, record);
}

function getInMemory(token) {
  pruneInMemory();
  const detail = inMemoryTokens.get(token);
  if (!detail) return null;
  const exp = new Date(detail.expires_at).getTime();
  if (detail.used || Number.isNaN(exp) || exp <= Date.now()) {
    inMemoryTokens.delete(token);
    return null;
  }
  return detail;
}

function markUsedInMemory(token) {
  const detail = inMemoryTokens.get(token);
  if (!detail) return;
  detail.used = true;
  detail.used_at = nowIso();
  inMemoryTokens.set(token, detail);
}

function deleteInMemory(token) {
  inMemoryTokens.delete(token);
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
      removeInMemoryByEmail(normalized);
      await restDeleteByEmail(normalized);
      const ok = await restUpsertToken(record);
      if (ok) {
        storeInMemory(record);
        return token;
      }
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
        if (ok) {
          storeInMemory(record);
          return token;
        }
      }
    } catch (err) {
      console.error('Gagal menyimpan token ke storage Supabase:', err?.message || err);
    }

    // Fallback terakhir ke filesystem lokal
    const local = await readLocalFile();
    const cleaned = pruneRecords(local).filter((row) => normalizeEmail(row.email) !== normalized);
    cleaned.push(record);
    const ok = await writeLocalFile(cleaned);
    if (!ok) {
      console.warn('Gagal menyimpan token reset password ke filesystem. Menggunakan in-memory fallback.');
    }
    storeInMemory(record);
    return token;
  },

  /**
   * Mengambil detail token jika masih valid melalui in-memory fallback.
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
        storeInMemory({
          token,
          email: normalizeEmail(viaRest.email),
          expires_at: viaRest.expires_at,
          used: !!viaRest.used,
          created_at: viaRest.created_at || nowIso(),
        });
        return {
          email: normalizeEmail(viaRest.email),
          expiresAt: new Date(viaRest.expires_at).getTime(),
          used: !!viaRest.used,
        };
      }
    } catch (err) {
      console.error('Gagal membaca token via Supabase REST:', err?.message || err);
    }

    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        const cleaned = pruneRecords(records);
        const match = cleaned.find((row) => row.token === token);
        if (match) {
          storeInMemory(match);
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

    const local = await readLocalFile();
    const cleaned = pruneRecords(local);
    const match = cleaned.find((row) => row.token === token);
    if (cleaned.length !== local.length) {
      const ok = await writeLocalFile(cleaned);
      if (!ok && match) {
        storeInMemory(match);
      }
    }
    if (match) {
      storeInMemory(match);
      return {
        email: normalizeEmail(match.email),
        expiresAt: new Date(match.expires_at).getTime(),
        used: !!match.used,
      };
    }

    const memoryMatch = getInMemory(token);
    if (!memoryMatch) return null;
    return {
      email: normalizeEmail(memoryMatch.email),
      expiresAt: new Date(memoryMatch.expires_at).getTime(),
      used: !!memoryMatch.used,
    };
  },

  /**
   * Menandai token sebagai sudah digunakan agar tidak dapat digunakan ulang.
   */
  async markUsed(token) {
    if (!token) return;

    try {
      const restOk = await restMarkUsed(token);
      if (restOk) {
        markUsedInMemory(token);
        return;
      }
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
        markUsedInMemory(token);
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
    markUsedInMemory(token);
  },

  /**
   * Menghapus token dari store (misal setelah password sukses direset).
   */
  async deleteToken(token) {
    if (!token) return;

    try {
      const restOk = await restDeleteByToken(token);
      if (restOk) {
        deleteInMemory(token);
        return;
      }
    } catch (err) {
      console.error('Gagal menghapus token via REST:', err?.message || err);
    }

    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        const next = records.filter((row) => row.token !== token);
        await storageWrite(next);
        deleteInMemory(token);
        return;
      }
    } catch (err) {
      console.error('Gagal menghapus token di storage Supabase:', err?.message || err);
    }

    const local = await readLocalFile();
    const next = local.filter((row) => row.token !== token);
    await writeLocalFile(next);
    deleteInMemory(token);
  },
};
