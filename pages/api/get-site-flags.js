import fs from 'fs';
import path from 'path';
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'site-flags.json');

export default function handler(req, res) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  if (req.method !== 'GET') return res.status(405).end();
  try {
    if (!fs.existsSync(DATA_FILE)) return res.status(200).json({ shutdown: false });
    const json = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.status(200).json({ shutdown: !!json.shutdown });
  } catch { res.status(200).json({ shutdown: false }); }
}
