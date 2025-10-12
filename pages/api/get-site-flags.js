import fs from 'fs';
import path from 'path';
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'site-flags.json');

export default function handler(req, res) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  if (req.method !== 'GET') return res.status(405).end();
  try {
    if (!fs.existsSync(DATA_FILE)) return res.status(200).json({ shutdown: false, shutdownAi: false });
    const json = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const shutdown = !!(json.shutdown ?? json.shutdownMain ?? json.shutdown_main);
    const shutdownAi = !!(json.shutdownAi ?? json.shutdown_ai ?? json.shutdownai ?? json.aiShutdown);
    res.status(200).json({ shutdown, shutdownAi });
  } catch { res.status(200).json({ shutdown: false, shutdownAi: false }); }
}
