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
    const body = req.body || {};
    const payload = {
      active: !!body.active,
      title: String(body.title || ''),
      message: String(body.message || ''),
      severity: ['info','warning','success'].includes(body.severity) ? body.severity : 'info',
      ctaText: String(body.ctaText || ''),
      ctaUrl: String(body.ctaUrl || ''),
      version: String(body.version || '0'),
      updatedAt: new Date().toISOString(),
      expiresAt: body.expiresAt || null,
      dismissible: body.dismissible !== false,
    };
    const filePath = path.join(process.cwd(), 'data', 'announcements.json');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).send(e.message || 'Failed to save');
  }
}
