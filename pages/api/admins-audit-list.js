import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const AUDIT = path.join(DATA_DIR, 'admin-audit.json');

export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  if (req.method !== 'GET') return res.status(405).end();
  try {
    if (!fs.existsSync(AUDIT)) return res.status(200).json([]);
    const raw = fs.readFileSync(AUDIT, 'utf8');
    const arr = JSON.parse(raw);
    res.status(200).json(arr);
  } catch {
    res.status(500).send('Error');
  }
}
