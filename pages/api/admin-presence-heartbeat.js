import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PRESENCE_FILE = path.join(DATA_DIR, 'admin-presence.json');

export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { email = '', uid = null, name = null } = req.body || {};
    const id = String(email || uid).toLowerCase();
    if (!id) return res.status(400).send('Missing id');
    const now = new Date().toISOString();
    const rec = { id, email: String(email).toLowerCase() || null, uid, name, last_seen: now };
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    let map = {};
    if (fs.existsSync(PRESENCE_FILE)) { try { map = JSON.parse(fs.readFileSync(PRESENCE_FILE, 'utf8')) || {}; } catch { map = {}; } }
    map[id] = rec;
    fs.writeFileSync(PRESENCE_FILE, JSON.stringify(map, null, 2), 'utf8');
    res.status(200).send('OK');
  } catch {
    res.status(500).send('Error');
  }
}
