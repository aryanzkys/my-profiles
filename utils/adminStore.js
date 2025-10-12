const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'admins.json');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET_ADMINS || 'app_data';
const SUPABASE_OBJECT = process.env.SUPABASE_OBJECT_ADMINS || 'admins.json';
const OWNER_EMAIL = (process.env.OWNER_EMAIL || process.env.NEXT_PUBLIC_OWNER_EMAIL || 'prayogoaryan63@gmail.com').toLowerCase();

const supabaseHeaders = SUPABASE_SERVICE_ROLE_KEY
  ? {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    }
  : null;

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

async function restCheck(email) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/admin_authorities?select=email&email=eq.${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers: { ...supabaseHeaders, Accept: 'application/json' } });
  if (res.ok) {
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  }
  const text = await res.text().catch(() => '');
  if (res.status === 404 && /Could not find the table/i.test(text)) {
    return null;
  }
  throw new Error(`Supabase REST admin_authorities error (${res.status})`);
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

function readLocalFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

module.exports = {
  async emailExists(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return false;
    if (normalized === OWNER_EMAIL) return true;

    try {
      const viaRest = await restCheck(normalized);
      if (viaRest !== null) return viaRest;
    } catch (err) {
      console.error('Gagal mengecek admin via Supabase REST:', err?.message || err);
    }

    try {
      const storage = await storageRead();
      if (Array.isArray(storage)) {
        return storage.some((row) => normalizeEmail(row?.email) === normalized);
      }
    } catch (err) {
      console.error('Gagal membaca admin list dari Supabase Storage:', err?.message || err);
    }

    const local = readLocalFile();
    if (Array.isArray(local)) {
      return local.some((row) => normalizeEmail(row?.email) === normalized);
    }

    return false;
  },
};
