const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'admin-passwords.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET_PASSWORDS || 'app_data';
const SUPABASE_OBJECT = process.env.SUPABASE_OBJECT_PASSWORDS || 'admin-passwords.json';
const SUPABASE_ADMINS_BUCKET = process.env.SUPABASE_BUCKET_ADMINS || 'app_data';
const SUPABASE_ADMINS_OBJECT = process.env.SUPABASE_OBJECT_ADMINS || 'admins.json';
const OWNER_EMAIL = (process.env.OWNER_EMAIL || process.env.NEXT_PUBLIC_OWNER_EMAIL || 'prayogoaryan63@gmail.com').toLowerCase();

const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 12);

// Header standar untuk memanggil Supabase REST
const supabaseHeaders = SUPABASE_SERVICE_ROLE_KEY ? {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
} : null;

async function storageRead() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(SUPABASE_BUCKET)}/${SUPABASE_OBJECT}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
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

// Mengambil record admin dari Supabase REST (jika tersedia)
async function restFetchByEmail(email) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/admin_credentials?email=eq.${encodeURIComponent(email)}&select=*&limit=1`;
  const res = await fetch(url, { headers: { ...supabaseHeaders, Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 404 && /Could not find the table/i.test(text)) return null;
    throw new Error(`Supabase REST fetch failed (${res.status})`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows[0];
}

async function restUpsertPassword(email, passwordHash) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const url = `${SUPABASE_URL}/rest/v1/admin_credentials`;
  const payload = {
    email,
    password_hash: passwordHash,
    updated_at: new Date().toISOString(),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(payload),
  });
  if (res.ok) return true;
  const text = await res.text().catch(() => '');
  if (res.status === 404 && /Could not find the table/i.test(text)) return false;
  throw new Error(`Supabase REST upsert failed (${res.status})`);
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

async function storageReadAdmins() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(SUPABASE_ADMINS_BUCKET)}/${SUPABASE_ADMINS_OBJECT}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!res.ok) return null;
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function restAdminAuthorityExists(email) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/admin_authorities?email=eq.${encodeURIComponent(email)}&select=email&limit=1`;
  const res = await fetch(url, { headers: { ...supabaseHeaders, Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 404 && /Could not find the table/i.test(text)) return null;
    throw new Error(`Supabase REST fetch admin_authorities failed (${res.status})`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows[0];
}

async function localAdminsExists(email) {
  try {
    const adminsFile = path.join(DATA_DIR, 'admins.json');
    if (!fs.existsSync(adminsFile)) return false;
    const raw = fs.readFileSync(adminsFile, 'utf8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return false;
    return arr.some((row) => row && normalizeEmail(row.email) === email);
  } catch {
    return false;
  }
}

module.exports = {
  /**
   * Mengecek apakah admin dengan email tertentu memiliki password tersimpan.
   */
  async emailExists(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return false;

     // Owner selalu dianggap ada agar tidak terblokir reset password
    if (normalized === OWNER_EMAIL) return true;

    try {
      const viaRest = await restFetchByEmail(normalized);
      if (viaRest && viaRest.password_hash) return true;
      if (viaRest) return true;
    } catch (err) {
      console.error('Gagal membaca admin_credentials REST:', err?.message || err);
    }

    try {
      const fromStorage = await storageRead();
      if (Array.isArray(fromStorage) && fromStorage.some((row) => row && normalizeEmail(row.email) === normalized)) {
        return true;
      }
    } catch (err) {
      console.error('Gagal membaca admin-passwords dari storage:', err?.message || err);
    }

    const local = await readLocalFile();
    if (local.some((row) => row && normalizeEmail(row.email) === normalized)) {
      return true;
    }

    // Tambahan: cek tabel admin_authorities atau fallback admins.json
    try {
      const adminAuthority = await restAdminAuthorityExists(normalized);
      if (adminAuthority) return true;
    } catch (err) {
      console.error('Gagal memeriksa admin_authorities:', err?.message || err);
    }

    try {
      const adminStorage = await storageReadAdmins();
      if (Array.isArray(adminStorage) && adminStorage.some((row) => row && normalizeEmail(row.email) === normalized)) {
        return true;
      }
    } catch (err) {
      console.error('Gagal membaca admins.json dari storage:', err?.message || err);
    }

    if (await localAdminsExists(normalized)) {
      return true;
    }

    return false;
  },

  /**
   * Menyimpan password baru (dengan hashing) untuk admin.
   */
  async setPassword(email, plainPassword) {
    const normalized = normalizeEmail(email);
    if (!normalized) throw new Error('Email tidak valid saat menyimpan password.');

    const passwordHash = await bcrypt.hash(String(plainPassword), PASSWORD_SALT_ROUNDS);

    try {
      const restOk = await restUpsertPassword(normalized, passwordHash);
      if (restOk) return true;
    } catch (err) {
      console.error('Gagal meng-upsert password dengan Supabase REST:', err?.message || err);
    }

    // Storage fallback (Supabase Storage JSON)
    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        const now = new Date().toISOString();
        const updated = records.filter((row) => normalizeEmail(row.email) !== normalized);
        updated.push({ email: normalized, password_hash: passwordHash, updated_at: now });
        const ok = await storageWrite(updated);
        if (ok) return true;
      }
    } catch (err) {
      console.error('Gagal menyimpan password di storage Supabase:', err?.message || err);
    }

    // Fallback terakhir ke filesystem lokal (untuk dev lokal)
    const localRecords = await readLocalFile();
    const now = new Date().toISOString();
    const filtered = localRecords.filter((row) => normalizeEmail(row.email) !== normalized);
    filtered.push({ email: normalized, password_hash: passwordHash, updated_at: now });
    const ok = await writeLocalFile(filtered);
    if (!ok) throw new Error('Gagal menyimpan password baru.');
    return true;
  },
};
