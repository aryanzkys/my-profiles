"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DevSection() {
  const [shutdown, setShutdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const fetchFlags = async () => {
    setLoading(true); setError('');
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/get-site-flags',
        `${basePath}/.netlify/functions/get-site-flags`,
        '/api/get-site-flags',
        `${basePath}/api/get-site-flags`,
      ]));
      let data = null; let lastErr = '';
      for (const url of urls) {
        try { const r = await fetch(url); if (r.ok) { data = await r.json(); break; } else lastErr = `HTTP ${r.status}`; } catch (e) { lastErr = e?.message || 'Network'; }
      }
      if (!data) throw new Error(lastErr || 'Failed to load');
      setShutdown(!!data.shutdown);
    } catch (e) { setError(e?.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  const saveFlags = async (next) => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/set-site-flags',
        `${basePath}/.netlify/functions/set-site-flags`,
        '/api/set-site-flags',
        `${basePath}/api/set-site-flags`,
      ]));
      const body = JSON.stringify({ shutdown: next });
      let ok = false; let lastErr = '';
      for (const url of urls) {
        try { const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body }); if (r.ok) { ok = true; break; } else lastErr = `HTTP ${r.status}`; } catch (e) { lastErr = e?.message || 'Network'; }
      }
      if (!ok) throw new Error(lastErr || 'Failed to save');
      setShutdown(next); setSaved(true);
      // Broadcast to other tabs
      try { localStorage.setItem('site:flags', JSON.stringify({ shutdown: next, ts: Date.now() })); window.dispatchEvent(new Event('site:flags:updated')); } catch {}
    } catch (e) { setError(e?.message || 'Failed to save'); }
    finally { setSaving(false); setTimeout(()=>setSaved(false), 1500); }
  };

  useEffect(() => { fetchFlags(); }, []);

  return (
    <section className="space-y-4">
      <div>
        <div className="text-xl font-semibold text-cyan-300">Developer Controls</div>
        <div className="text-sm text-gray-400">Advanced authority to toggle maintenance mode.</div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading flags…</div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-cyan-200 font-medium">Shutdown Main Site</div>
              <div className="text-xs text-gray-400">When enabled, visitors will see a full-screen development warning overlay on Home.</div>
            </div>
            <button
              onClick={() => saveFlags(!shutdown)}
              disabled={saving}
              className={`relative inline-flex h-9 w-16 items-center rounded-full border transition ${shutdown ? 'bg-red-600/40 border-red-400/40' : 'bg-white/10 border-white/20'} ${saving ? 'opacity-70 cursor-wait' : ''}`}
              aria-pressed={shutdown}
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`h-7 w-7 rounded-full shadow-md ${shutdown ? 'translate-x-8 bg-red-400' : 'translate-x-1 bg-cyan-300'}`}
              />
            </button>
          </div>

          <AnimatePresence>
            {saved && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-3 text-sm text-emerald-300">Saved.</motion.div>
            )}
            {error && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-3 text-sm text-red-300">{error}</motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
