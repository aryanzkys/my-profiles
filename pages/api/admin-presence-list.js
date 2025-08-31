import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PRESENCE_FILE = path.join(DATA_DIR, 'admin-presence.json');

export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  if (req.method !== 'GET') return res.status(405).end();
  try {
    if (!fs.existsSync(PRESENCE_FILE)) return res.status(200).json([]);
    const map = JSON.parse(fs.readFileSync(PRESENCE_FILE, 'utf8') || '{}') || {};
    const now = Date.now();
    const ONLINE_MS = 5 * 60 * 1000;
    const out = Object.values(map).map(r => ({ ...r, online: r.last_seen ? (now - Date.parse(r.last_seen)) < ONLINE_MS : false }));
    res.status(200).json(out);
  } catch {
    res.status(500).send('Error');
  }
}
