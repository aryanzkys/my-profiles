import fs from 'fs';
import path from 'path';
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'site-flags.json');

export default function handler(req, res) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = req.body || {};
    const shutdown = !!(body.shutdown ?? body.shutdownMain ?? body.shutdown_main);
    const shutdownAi = !!(body.shutdownAi ?? body.shutdown_ai ?? body.shutdownai ?? body.aiShutdown);
    const payload = { shutdown, shutdownAi };
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
    res.status(200).json({ ok: true, ...payload });
  } catch { res.status(500).send('Error'); }
}
