import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (process.env.NODE_ENV === 'production') return res.status(403).send('Disabled in production');
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { id, hardDelete } = req.body || {};
    const filePath = path.join(process.cwd(), 'data', 'announcements.json');
    if (!fs.existsSync(filePath)) return res.status(200).json({ ok: true });
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);
    let arr = Array.isArray(json) ? json : (json ? [json] : []);
    if (hardDelete) arr = arr.filter((x, idx) => String(x?.id||idx) !== String(id));
    else arr = arr.map((x, idx) => (String(x?.id||idx) === String(id) ? { ...x, active: false } : x));
    fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');
    res.status(200).json({ ok: true });
  } catch (e) { res.status(500).send(e.message || 'Failed to delete'); }
}
