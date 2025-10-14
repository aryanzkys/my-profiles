const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'security-logs.json');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET_LOGS || 'app_data';
const SUPABASE_OBJECT = process.env.SUPABASE_OBJECT_LOGS || 'security-logs.json';

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

async function restInsertLog(logEntry) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const url = `${SUPABASE_URL}/rest/v1/security_logs`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify(logEntry),
    });
    if (res.ok) return true;
    const text = await res.text().catch(() => '');
    if (res.status === 404 && /Could not find the table/i.test(text)) return false;
    throw new Error(`Supabase REST insert security log failed (${res.status})`);
  } catch (err) {
    console.error('Gagal menyimpan log keamanan via REST:', err?.message || err);
    return false;
  }
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

module.exports = {
  /**
   * Log security event
   * @param {Object} event - Event details
   * @param {string} event.email - User email
   * @param {string} event.action - Action type (e.g., 'password_reset_request', 'password_reset_success')
   * @param {string} event.ip - IP address
   * @param {string} event.userAgent - User agent string
   * @param {string} event.status - 'success' or 'failed'
   * @param {string} event.details - Additional details
   */
  async log(event) {
    const logEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      email: normalizeEmail(event.email),
      action: event.action || 'unknown',
      ip: event.ip || 'unknown',
      user_agent: event.userAgent || 'unknown',
      status: event.status || 'unknown',
      details: event.details || '',
      timestamp: nowIso(),
    };

    // Try to log to Supabase table first
    try {
      const ok = await restInsertLog(logEntry);
      if (ok) return true;
    } catch (err) {
      console.error('Gagal log via Supabase REST:', err?.message || err);
    }

    // Fallback to storage
    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        records.push(logEntry);
        // Keep only last 10000 logs to prevent file from growing too large
        if (records.length > 10000) {
          records.splice(0, records.length - 10000);
        }
        const ok = await storageWrite(records);
        if (ok) return true;
      }
    } catch (err) {
      console.error('Gagal log ke storage Supabase:', err?.message || err);
    }

    // Fallback to local file
    const local = await readLocalFile();
    local.push(logEntry);
    if (local.length > 10000) {
      local.splice(0, local.length - 10000);
    }
    await writeLocalFile(local);
    return true;
  },

  /**
   * Get recent logs for an email
   */
  async getRecentLogs(email, limit = 10) {
    const normalized = normalizeEmail(email);
    if (!normalized) return [];

    // Try to get from storage first
    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        return records
          .filter((row) => normalizeEmail(row.email) === normalized)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      }
    } catch (err) {
      console.error('Gagal membaca log dari storage:', err?.message || err);
    }

    // Fallback to local file
    const local = await readLocalFile();
    return local
      .filter((row) => normalizeEmail(row.email) === normalized)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  },
};
