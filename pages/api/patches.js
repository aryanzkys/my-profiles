import { generatePatches } from '../../lib/generatePatches';

export default function handler(req, res) {
  try {
    const data = generatePatches({ repoRoot: process.cwd() });
    const { route } = req.query || {};
    let out = data;
    if (typeof route === 'string' && route) {
      out = {
        meta: data.meta,
        patches: (data.patches || []).filter(p => Array.isArray(p.routes) && p.routes.includes(route))
      };
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate patches', details: String(e && e.message || e) });
  }
}
