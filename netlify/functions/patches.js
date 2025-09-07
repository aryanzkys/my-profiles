'use strict';
const { generatePatches } = require('../../lib/generatePatches');
const fs = require('fs');
const path = require('path');

function toCSV(patches) {
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
  const header = ['number','commit','date','author','message','routes','changed_count','changed_detail'];
  const rows = [header.join(',')];
  for (const p of patches) {
    const routes = (p.routes || []).join('; ');
    const changed = (p.changed || []).map(c => `${c.status} ${c.path}`).join('; ');
    rows.push([p.number,p.commit,p.date,p.author,p.message,routes,(p.changed||[]).length,changed].map(esc).join(','));
  }
  return rows.join('\r\n');
}

function toRSS(baseUrl, patches, route) {
  const title = route ? `Patch feed — ${route}` : 'Patch feed — All routes';
  const link = `${baseUrl}/patch${route ? `?route=${encodeURIComponent(route)}` : ''}`;
  const desc = route ? `Recent page changes for ${route}` : 'Recent page changes for all routes';
  const items = [...(patches||[])].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,100).map(p => {
    const itemLink = `https://github.com/aryanzkys/my-profiles/commit/${p.commit}`;
    const itDesc = `${p.author} — Routes: ${(p.routes||[]).join(', ')} — Changed: ${(p.changed||[]).length} files`;
    return `\n    <item>\n      <title><![CDATA[#${p.number}: ${p.message || 'No message'}]]></title>\n      <link>${itemLink}</link>\n      <guid isPermaLink=\"false\">${p.commit}</guid>\n      <pubDate>${new Date(p.date).toUTCString()}</pubDate>\n      <description><![CDATA[${itDesc}]]></description>\n    </item>`;
  }).join('');
  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rss version=\"2.0\">\n  <channel>\n    <title><![CDATA[${title}]]></title>\n    <link>${link}</link>\n    <description><![CDATA[${desc}]]></description>\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}\n  </channel>\n</rss>`;
}

exports.handler = async (event, context) => {
  try {
    const qs = event.queryStringParameters || {};
    const route = typeof qs.route === 'string' ? qs.route : '';
    const format = typeof qs.format === 'string' ? qs.format : '';
    const download = qs.download === '1' || qs.download === 'true';

    // Build base URL for potential static fetch fallback
    const host = event.headers['x-forwarded-host'] || event.headers.host || '';
    const proto = event.headers['x-forwarded-proto'] || (host ? 'https' : 'http');
    const baseUrl = host ? `${proto}://${host}` : '';

    let data;
    try {
      data = generatePatches({ repoRoot: process.cwd() });
    } catch (e) {
      // Prefer a bundled JSON fallback to avoid filesystem path issues in serverless
      try {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        data = require('../../data/patches.json');
      } catch (e2) {
        // Final fallback: fetch the public static JSON from the deployed site
        const resp = await fetch(`${baseUrl}/patches.json`, { cache: 'no-store' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        const ct = (resp.headers.get('content-type') || '').split(';')[0].trim();
        if (!ct.includes('application/json')) {
          const t = await resp.text();
          throw new Error(`Non-JSON static response (${ct || 'unknown'}) — ${t.slice(0, 120)}`);
        }
        data = await resp.json();
      }
    }

    let out = data;
    if (route) {
      out = { meta: data.meta, patches: (data.patches || []).filter(p => Array.isArray(p.routes) && p.routes.includes(route)) };
    }

    if (format === 'csv') {
      const csv = toCSV(out.patches || []);
      return { statusCode: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', ...(download ? { 'Content-Disposition': 'attachment; filename="patches.csv"' } : {}) }, body: csv };
    }
    if (format === 'rss') {
      const rss = toRSS(baseUrl, out.patches || [], route);
      return { statusCode: 200, headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' }, body: rss };
    }
    const body = JSON.stringify(out);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', ...(download ? { 'Content-Disposition': 'attachment; filename="patches.json"' } : {}) }, body };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to generate patches', details: String(e && e.message || e) }) };
  }
};
