import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  try {
    const filePath = path.join(process.cwd(), 'data', 'announcements.json');
    if (!fs.existsSync(filePath)) {
      res.status(200).json({ active: false, target: 'both' });
      return;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);
    res.setHeader('content-type', 'application/json');
    res.status(200).send(JSON.stringify({ target: 'both', ...json }));
  } catch (e) {
    res.status(500).send(e.message || 'Failed to read announcements.json');
  }
}
