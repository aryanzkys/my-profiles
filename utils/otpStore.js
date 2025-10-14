const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'otp-tokens.json');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET_OTP || 'app_data';
const SUPABASE_OBJECT = process.env.SUPABASE_OBJECT_OTP || 'otp-tokens.json';

// In-memory store for serverless environments
const inMemoryOTPs = new Map();

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

function generateOTP() {
  // Generate 6-digit OTP
  return crypto.randomInt(100000, 999999).toString();
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
    // Remove used or expired OTPs
    if (row.verified) return false;
    const exp = new Date(row.expires_at).getTime();
    if (Number.isNaN(exp)) return false;
    // Keep locked accounts for the lockout duration
    if (row.locked_until) {
      const lockExp = new Date(row.locked_until).getTime();
      if (Number.isNaN(lockExp) || lockExp <= now) {
        return false; // Lockout expired, can be removed
      }
      return true; // Still locked, keep it
    }
    return exp > now;
  });
}

function pruneInMemory() {
  const now = Date.now();
  for (const [email, detail] of inMemoryOTPs.entries()) {
    const exp = new Date(detail.expires_at).getTime();
    if (detail.verified || Number.isNaN(exp) || exp <= now) {
      if (!detail.locked_until || new Date(detail.locked_until).getTime() <= now) {
        inMemoryOTPs.delete(email);
      }
    }
  }
}

function storeInMemory(record) {
  pruneInMemory();
  inMemoryOTPs.set(record.email, record);
}

function getInMemory(email) {
  pruneInMemory();
  return inMemoryOTPs.get(email) || null;
}

module.exports = {
  /**
   * Create OTP for email and store it
   */
  async createOTP(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) throw new Error('Email tidak valid saat membuat OTP.');

    // Check if account is locked
    const existing = await this.getOTP(normalized);
    if (existing && existing.locked_until) {
      const lockExp = new Date(existing.locked_until).getTime();
      if (lockExp > Date.now()) {
        const remainingMs = lockExp - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        throw new Error(`Akun terkunci. Coba lagi dalam ${remainingMin} menit.`);
      }
    }

    const otp = generateOTP();
    const record = {
      email: normalized,
      otp,
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      attempts: 0,
      verified: false,
      created_at: nowIso(),
      locked_until: null,
    };

    // Try to store in all available storage
    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        const cleaned = pruneRecords(records).filter((row) => normalizeEmail(row.email) !== normalized);
        cleaned.push(record);
        const ok = await storageWrite(cleaned);
        if (ok) {
          storeInMemory(record);
          return otp;
        }
      }
    } catch (err) {
      console.error('Gagal menyimpan OTP ke storage Supabase:', err?.message || err);
    }

    // Fallback to local file
    const local = await readLocalFile();
    const cleaned = pruneRecords(local).filter((row) => normalizeEmail(row.email) !== normalized);
    cleaned.push(record);
    const ok = await writeLocalFile(cleaned);
    if (!ok) {
      console.warn('Gagal menyimpan OTP ke filesystem. Menggunakan in-memory fallback.');
    }
    storeInMemory(record);
    return otp;
  },

  /**
   * Get OTP details for email
   */
  async getOTP(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    // Check in-memory first
    const memoryMatch = getInMemory(normalized);
    if (memoryMatch) return memoryMatch;

    // Try storage
    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        const cleaned = pruneRecords(records);
        const match = cleaned.find((row) => normalizeEmail(row.email) === normalized);
        if (match) {
          storeInMemory(match);
          return match;
        }
        if (cleaned.length !== records.length) {
          await storageWrite(cleaned);
        }
      }
    } catch (err) {
      console.error('Gagal membaca OTP dari storage Supabase:', err?.message || err);
    }

    // Fallback to local file
    const local = await readLocalFile();
    const cleaned = pruneRecords(local);
    const match = cleaned.find((row) => normalizeEmail(row.email) === normalized);
    if (cleaned.length !== local.length) {
      await writeLocalFile(cleaned);
    }
    if (match) {
      storeInMemory(match);
      return match;
    }

    return null;
  },

  /**
   * Verify OTP for email
   * Returns { success: true } or { success: false, locked: true/false, remainingAttempts: number }
   */
  async verifyOTP(email, inputOTP) {
    const normalized = normalizeEmail(email);
    if (!normalized || !inputOTP) return { success: false, remainingAttempts: 0 };

    const otpData = await this.getOTP(normalized);
    if (!otpData) {
      return { success: false, message: 'OTP tidak ditemukan atau sudah kadaluarsa.', remainingAttempts: 0 };
    }

    // Check if locked
    if (otpData.locked_until) {
      const lockExp = new Date(otpData.locked_until).getTime();
      if (lockExp > Date.now()) {
        const remainingMs = lockExp - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        return {
          success: false,
          locked: true,
          message: `Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi dalam ${remainingMin} menit.`,
          remainingAttempts: 0,
        };
      }
    }

    // Check if expired
    const exp = new Date(otpData.expires_at).getTime();
    if (exp <= Date.now()) {
      await this.deleteOTP(normalized);
      return { success: false, message: 'OTP sudah kadaluarsa.', remainingAttempts: 0 };
    }

    // Check if already verified
    if (otpData.verified) {
      return { success: false, message: 'OTP sudah pernah digunakan.', remainingAttempts: 0 };
    }

    // Verify OTP
    if (otpData.otp === String(inputOTP).trim()) {
      // Mark as verified
      otpData.verified = true;
      otpData.verified_at = nowIso();
      await this.updateOTP(normalized, otpData);
      return { success: true };
    } else {
      // Increment attempts
      otpData.attempts = (otpData.attempts || 0) + 1;
      const remainingAttempts = OTP_MAX_ATTEMPTS - otpData.attempts;

      if (otpData.attempts >= OTP_MAX_ATTEMPTS) {
        // Lock the account
        otpData.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
        await this.updateOTP(normalized, otpData);
        return {
          success: false,
          locked: true,
          message: 'Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.',
          remainingAttempts: 0,
        };
      }

      await this.updateOTP(normalized, otpData);
      return {
        success: false,
        message: `OTP salah. ${remainingAttempts} percobaan tersisa.`,
        remainingAttempts,
      };
    }
  },

  /**
   * Update OTP record
   */
  async updateOTP(email, otpData) {
    const normalized = normalizeEmail(email);
    if (!normalized) return;

    storeInMemory(otpData);

    // Update in storage
    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        const next = records.map((row) => {
          if (normalizeEmail(row.email) !== normalized) return row;
          return otpData;
        });
        await storageWrite(next);
        return;
      }
    } catch (err) {
      console.error('Gagal update OTP di storage Supabase:', err?.message || err);
    }

    // Update in local file
    const local = await readLocalFile();
    const next = local.map((row) => {
      if (normalizeEmail(row.email) !== normalized) return row;
      return otpData;
    });
    await writeLocalFile(next);
  },

  /**
   * Delete OTP for email
   */
  async deleteOTP(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return;

    inMemoryOTPs.delete(normalized);

    // Delete from storage
    try {
      const records = await storageRead();
      if (Array.isArray(records)) {
        const next = records.filter((row) => normalizeEmail(row.email) !== normalized);
        await storageWrite(next);
        return;
      }
    } catch (err) {
      console.error('Gagal menghapus OTP di storage Supabase:', err?.message || err);
    }

    // Delete from local file
    const local = await readLocalFile();
    const next = local.filter((row) => normalizeEmail(row.email) !== normalized);
    await writeLocalFile(next);
  },
};
