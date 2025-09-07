import { generatePatches } from '../../lib/generatePatches';

function toCSV(patches) {
  const esc = (v) => '"' + String(v ?? '')
    .replace(/"/g, '""')
    .replace(/\r?\n/g, ' ') + '"';
  const header = ['number','commit','date','author','message','routes','changed_count','changed_detail'];
  const rows = [header.join(',')];
  for (const p of patches) {
    const routes = (p.routes || []).join('; ');
    const changed = (p.changed || []).map(c => `${c.status} ${c.path}`).join('; ');
    const row = [p.number, p.commit, p.date, p.author, p.message, routes, (p.changed||[]).length, changed].map(esc).join(',');
    rows.push(row);
  }
  return rows.join('\r\n');
}

function toRSS(req, patches, route) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || (host ? 'https' : 'http');
  const base = host ? `${proto}://${host}` : '';
  const title = route ? `Patch feed — ${route}` : 'Patch feed — All routes';
  const link = `${base}/patch${route ? `?route=${encodeURIComponent(route)}` : ''}`;
  const desc = route ? `Recent page changes for ${route}` : 'Recent page changes for all routes';
  const items = [...(patches||[])].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,100).map(p => {
    const itemLink = `https://github.com/aryanzkys/my-profiles/commit/${p.commit}`;
    const itDesc = `${p.author} — Routes: ${(p.routes||[]).join(', ')} — Changed: ${(p.changed||[]).length} files`;
    return `\n    <item>\n      <title><![CDATA[#${p.number}: ${p.message || 'No message'}]]></title>\n      <link>${itemLink}</link>\n      <guid isPermaLink=\"false\">${p.commit}</guid>\n      <pubDate>${new Date(p.date).toUTCString()}</pubDate>\n      <description><![CDATA[${itDesc}]]></description>\n    </item>`;
  }).join('');
  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rss version=\"2.0\">\n  <channel>\n    <title><![CDATA[${title}]]></title>\n    <link>${link}</link>\n    <description><![CDATA[${desc}]]></description>\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}\n  </channel>\n</rss>`;
}

export default function handler(req, res) {
  try {
    const data = generatePatches({ repoRoot: process.cwd() });
    const { route, format, download } = req.query || {};
    let out = data;
    if (typeof route === 'string' && route) {
      out = {
        meta: data.meta,
        patches: (data.patches || []).filter(p => Array.isArray(p.routes) && p.routes.includes(route))
      };
    }
    res.setHeader('Cache-Control', 'no-store');
    if (format === 'csv') {
      const csv = toCSV(out.patches || []);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      if (download === '1' || download === 'true') res.setHeader('Content-Disposition', 'attachment; filename="patches.csv"');
      return res.status(200).send(csv);
    }
    if (format === 'rss') {
      const rss = toRSS(req, out.patches || [], typeof route === 'string' ? route : '');
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      return res.status(200).send(rss);
    }
    if (download === '1' || download === 'true') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="patches.json"');
    }
    return res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate patches', details: String(e && e.message || e) });
  }
}
