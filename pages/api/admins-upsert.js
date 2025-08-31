import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'admins.json');

export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = req.body || {};
    const uid = (body.uid || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    if (!uid && !email) return res.status(400).send('uid or email is required');
    const record = {
      uid: uid || null,
      email: email || null,
      displayName: (body.displayName || '').trim() || null,
      canEditSections: !!body.canEditSections,
      canAccessDev: !!body.canAccessDev,
      banned: !!body.banned,
      updated_at: new Date().toISOString(),
    };
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    let arr = [];
    if (fs.existsSync(DATA_FILE)) {
      try { arr = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || []; } catch { arr = []; }
    }
    const key = uid || email;
    let found = false;
    arr = arr.map((x) => {
      if ((uid && x.uid === uid) || (!uid && x.email && String(x.email).toLowerCase() === email)) { found = true; return { ...x, ...record, id: key }; }
      return x;
    });
    if (!found) arr.push({ ...record, id: key });
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
    res.status(200).json({ ok: true });
  } catch {
    res.status(500).send('Error');
  }
}
