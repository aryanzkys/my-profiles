// Utility to generate Patch entries from git history focusing on Next.js pages/* changes
// CommonJS module so it can be used by Next API routes and Node scripts
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function safeReadJSON(p) {
  try {
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

function mapFileToRoute(repoRoot, filePath) {
  // Normalize and ensure forward slashes
  const p = filePath.replace(/\\/g, '/');
  if (!p.startsWith('pages/')) return null;
  if (p.startsWith('pages/api/')) return null; // ignore API routes
  const base = p.slice('pages/'.length);
  // ignore special files like _app, _document, _error
  if (/^_/.test(base)) return null;
  // Only track .js/.jsx/.ts/.tsx page files
  if (!/\.(jsx?|tsx?)$/.test(base)) return null;
  // strip extension
  const noExt = base.replace(/\.(jsx?|tsx?)$/, '');
  // index page -> '/'
  if (noExt.toLowerCase() === 'index') return '/';
  // nested index, e.g., blog/index -> /blog
  if (noExt.toLowerCase().endsWith('/index')) return '/' + noExt.slice(0, -('/index'.length));
  // dynamic routes kept as-is
  return '/' + noExt;
}

function parseGitLog(raw) {
  // raw produced by: git --no-pager log --name-status --pretty=format:%H|%at|%an|%ae|%s
  const lines = raw.split(/\r?\n/);
  const commits = [];
  let current = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.includes('\u001f')) { // \x1f delimiter
      const parts = line.split('\u001f');
      if (parts.length >= 5 && /^[0-9a-f]{7,40}$/i.test(parts[0])) {
        if (current) commits.push(current);
        current = {
          sha: parts[0],
          ts: Number(parts[1]) * 1000,
          authorName: parts[2],
          authorEmail: parts[3],
          subject: parts.slice(4).join('\u001f'),
          files: [],
        };
        continue;
      }
    }
    // file change line: "M\tpath" or "A\tpath" or "D\tpath"
    const m = line.match(/^(\w)\s+(.+)$/);
    if (m && current) {
      current.files.push({ status: m[1], path: m[2] });
    }
  }
  if (current) commits.push(current);
  return commits;
}

function generatePatches(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const dataPath = path.join(repoRoot, 'data', 'patches.json');
  const existing = safeReadJSON(dataPath) || { meta: {}, patches: [] };
  const existingPatches = Array.isArray(existing.patches) ? existing.patches : [];
  const existingShas = new Set(existingPatches.map(p => p.commit));

  const args = ['--no-pager', 'log', '--name-status', '--pretty=format:%H%x1f%at%x1f%an%x1f%ae%x1f%s'];
  const proc = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (proc.error || proc.status !== 0) {
    throw new Error('Failed to read git log');
  }
  const raw = proc.stdout || '';

  const commits = parseGitLog(raw);
  // newest first; filter to new ones only
  const newCommits = commits.filter(c => !existingShas.has(c.sha));

  // Build patches only for commits that touch pages/* (routes)
  const newPatches = [];
  for (const c of newCommits.reverse()) { // oldest -> newest for stable numbering
    const changed = [];
    const routesSet = new Set();
    for (const f of c.files) {
      const route = mapFileToRoute(repoRoot, f.path);
      if (route) {
        routesSet.add(route);
        changed.push({ path: f.path, status: f.status, route });
      }
    }
    if (routesSet.size === 0) continue; // skip commits that didn't change pages
    const lastNumber = existingPatches.length ? existingPatches[existingPatches.length - 1].number : 0;
    const patch = {
      number: lastNumber + newPatches.length + 1,
      commit: c.sha,
      date: new Date(c.ts).toISOString(),
      author: `${c.authorName} <${c.authorEmail}>`,
      message: c.subject,
      routes: Array.from(routesSet),
      changed,
    };
    newPatches.push(patch);
  }

  const updated = newPatches.length
    ? { meta: { last_generated: new Date().toISOString() }, patches: [...existingPatches, ...newPatches] }
    : { meta: { last_generated: new Date().toISOString() }, patches: existingPatches };

  // Write to data store
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(updated, null, 2));

  // Also publish to public/ for static fallback in production
  try {
    const publicPath = path.join(repoRoot, 'public', 'patches.json');
    fs.mkdirSync(path.dirname(publicPath), { recursive: true });
    fs.writeFileSync(publicPath, JSON.stringify(updated, null, 2));
  } catch {}

  return updated;
}

module.exports = { generatePatches };
