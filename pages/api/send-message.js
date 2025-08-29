import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');

function ensureDataFile() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
  try { if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8'); } catch {}
}

export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).end();
  }
  if (req.method !== 'POST') return res.status(405).end();
  ensureDataFile();
  try {
    let { instagram, initials, message } = req.body || {};
    instagram = (instagram || '-').toString().trim();
    if (!/^@?[a-z0-9._-]{0,40}$/i.test(instagram)) instagram = '-';
    initials = (initials || '').toString().trim();
    message = (message || '').toString();

    if (!initials) return res.status(400).send('Initials required');
    if (!message.trim()) return res.status(400).send('Message required');
    if (message.length > 500) message = message.slice(0, 500);

    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      instagram: instagram.startsWith('@') ? instagram : (instagram ? '@' + instagram : '-'),
      initials,
      message: message.trim(),
      created_at: new Date().toISOString(),
    };

    const arr = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    arr.unshift(entry);
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
    res.status(200).json({ ok: true, id: entry.id });
  } catch {
    res.status(500).send('Server error');
  }
}
