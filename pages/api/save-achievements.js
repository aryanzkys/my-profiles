import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).send('Disabled in production');
  }
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }
  try {
    const data = req.body || {};
    const filePath = path.join(process.cwd(), 'data', 'achievements.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).send(e.message || 'Failed to save');
  }
}
