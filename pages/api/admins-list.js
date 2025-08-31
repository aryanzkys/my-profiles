import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'admins.json');

export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  if (req.method !== 'GET') return res.status(405).end();
  try {
    if (!fs.existsSync(DATA_FILE)) return res.status(200).json([]);
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const arr = JSON.parse(raw);
    res.status(200).json(arr);
  } catch {
    res.status(500).send('Error');
  }
}
