import { generatePatches } from '../../lib/generatePatches';

export default function handler(req, res) {
  try {
    const data = generatePatches({ repoRoot: process.cwd() });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate patches', details: String(e && e.message || e) });
  }
}
