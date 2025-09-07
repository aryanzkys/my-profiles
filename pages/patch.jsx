import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border border-cyan-400/30 bg-cyan-500/10 text-cyan-200">{children}</span>
  );
}

function RouteBadge({ route }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border border-white/10 bg-white/5 text-gray-200">{route}</span>
  );
}

export default function PatchPage() {
  const [data, setData] = useState({ meta: {}, patches: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');

  const refresh = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/patches', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'HTTP ' + r.status);
      setData(j);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const routes = useMemo(() => {
    const s = new Set();
    for (const p of data.patches || []) (p.routes || []).forEach(r => s.add(r));
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sDate = since ? new Date(since).getTime() : null;
    const uDate = until ? new Date(until).getTime() : null;
    return (data.patches || []).filter(p => {
      if (routeFilter && !(p.routes || []).includes(routeFilter)) return false;
      if (authorFilter && !(p.author || '').toLowerCase().includes(authorFilter.toLowerCase())) return false;
      if (sDate && new Date(p.date).getTime() < sDate) return false;
      if (uDate && new Date(p.date).getTime() > uDate) return false;
      if (!q) return true;
      const hay = [p.message, p.author, ...(p.routes || []), ...(p.changed || []).map(c => c.path)].join(' ').toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => b.number - a.number);
  }, [data, routeFilter, authorFilter, since, until, query]);

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#05070a] text-gray-100">
      <Head>
        <title>Patch — Recent Changes</title>
        <meta name="robots" content="noindex,follow" />
      </Head>

      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-10%] h-[60vh] w-[60vh] rounded-full blur-[110px]" style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(34,211,238,0.22) 0%, rgba(0,0,0,0) 70%)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] h-[70vh] w-[70vh] rounded-full blur-[120px]" style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(59,130,246,0.18) 0%, rgba(0,0,0,0) 70%)' }} />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      <div className="relative container mx-auto px-4 py-10 max-w-5xl">
        {/* Header + controls */}
        <div className="rounded-2xl p-[1px] bg-gradient-to-r from-cyan-400/30 via-blue-500/25 to-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.35)]">
          <div className="rounded-2xl border border-white/10 bg-black/85 overflow-hidden">
            <div className="px-4 py-4 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-semibold text-cyan-300">Patch — Recent Changes</h1>
              {loading && <Badge>Refreshing…</Badge>}
              {!loading && <Badge>{(data.patches || []).length} patches</Badge>}
              {data?.meta?.last_generated && <span className="ml-auto text-xs text-gray-400">Updated: {new Date(data.meta.last_generated).toLocaleString()}</span>}
            </div>
            <div className="px-4 py-3 flex flex-col md:flex-row gap-2 md:items-end">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Search</label>
                  <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Message, author, path…" className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Route</label>
                  <select value={routeFilter} onChange={e=>setRouteFilter(e.target.value)} className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-gray-100">
                    <option value="">All</option>
                    {routes.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Author</label>
                  <input value={authorFilter} onChange={e=>setAuthorFilter(e.target.value)} placeholder="Name or email" className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-gray-100" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400">Since</label>
                    <input type="date" value={since} onChange={e=>setSince(e.target.value)} className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-gray-100" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Until</label>
                    <input type="date" value={until} onChange={e=>setUntil(e.target.value)} className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-gray-100" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={refresh} className="text-xs px-3 py-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/15 text-cyan-200 hover:shadow-[0_0_14px_rgba(34,211,238,0.25)]">Refresh</button>
                <a href="/ai" className="text-xs px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-cyan-200 hover:bg-white/10 underline decoration-cyan-400/40">Back to AI</a>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="mt-4 space-y-3">
          <AnimatePresence>
            {filtered.map(p => (
              <motion.div key={p.commit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-xl border border-white/10 bg-black/70 backdrop-blur-md overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 text-xs font-semibold">{p.number}</span>
                  <div className="flex-1">
                    <div className="text-gray-100 text-sm font-semibold">{p.message || 'No message'}</div>
                    <div className="text-xs text-gray-400">{p.author} • {new Date(p.date).toLocaleString()} • <a target="_blank" rel="noreferrer" href={`https://github.com/aryanzkys/my-profiles/commit/${p.commit}`} className="underline decoration-cyan-400/40">{p.commit.slice(0,7)}</a></div>
                  </div>
                  <div className="hidden md:flex flex-wrap gap-1 max-w-[50%] justify-end">
                    {(p.routes||[]).map(r => <RouteBadge key={r} route={r} />)}
                  </div>
                </div>
                <div className="px-4 py-3 text-sm">
                  <div className="mb-2 text-xs text-gray-400">Changed files:</div>
                  <div className="flex flex-wrap gap-1">
                    {(p.changed||[]).map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border border-white/10 bg-white/5 text-gray-200">
                        <span className={c.status==='A'? 'text-emerald-300' : c.status==='D'? 'text-rose-300' : 'text-cyan-300'}>{c.status}</span>
                        <span>{c.path}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!loading && filtered.length === 0 && (
          <div className="mt-6 text-center text-gray-400 text-sm">No patches match your filters.</div>
        )}
      </div>
    </main>
  );
}
