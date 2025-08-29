import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');

export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  if (req.method !== 'DELETE') return res.status(405).end();
  const id = (req.query.id || '').toString();
  if (!id) return res.status(400).send('Missing id');
  try {
    if (!fs.existsSync(DATA_FILE)) return res.status(200).send('OK');
    const arr = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const next = Array.isArray(arr) ? arr.filter(x => x.id !== id) : [];
    fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 2), 'utf8');
    res.status(200).send('OK');
  } catch {
    res.status(500).send('Error');
  }
}
