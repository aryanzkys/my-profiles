import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  try {
    const filePath = path.join(process.cwd(), 'data', 'announcements.json');
    if (!fs.existsSync(filePath)) return res.status(200).json([]);
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);
    const arr = Array.isArray(json) ? json : (json ? [json] : []);
    res.status(200).json(arr);
  } catch (e) { res.status(500).send(e.message || 'Failed to list'); }
}
