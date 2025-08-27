import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  try {
    const filePath = path.join(process.cwd(), 'data', 'achievements.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    res.setHeader('content-type', 'application/json');
    res.status(200).send(raw);
  } catch (e) {
    res.status(500).send(e.message || 'Failed to read achievements.json');
  }
}
