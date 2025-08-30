"use client";
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DevSection() {
  const [shutdown, setShutdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState(0); // 0..1 visual position for slider
  const trackRef = useRef(null);

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

  // Keep slider knob in sync with state when not dragging
  useEffect(() => {
    if (!dragging) setPos(shutdown ? 1 : 0);
  }, [shutdown, dragging]);

  // Pointer/drag handlers
  const startDrag = (clientX) => {
    if (saving || loading) return;
    setDragging(true);
    updatePosFromClientX(clientX);
    const move = (e) => {
      const x = 'touches' in e ? e.touches?.[0]?.clientX : e.clientX;
      if (typeof x === 'number') updatePosFromClientX(x);
    };
    const up = () => {
      setDragging(false);
      const next = pos > 0.5;
      if (next !== shutdown) saveFlags(next);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchcancel', up);
    };
    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseup', up, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up, { passive: true });
    window.addEventListener('touchcancel', up, { passive: true });
  };

  const updatePosFromClientX = (clientX) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = rect.left + 6; // inner padding estimate
    const right = rect.right - 34; // knob width + margin
    const clamped = Math.max(0, Math.min(1, (clientX - left) / Math.max(1, right - left)));
    setPos(clamped);
  };

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
            <div
              ref={trackRef}
              role="switch"
              aria-checked={shutdown}
              tabIndex={0}
              onClick={(e) => {
                // Ignore click if drag just occurred; quick toggle on simple click
                if (!dragging && !saving && !loading) saveFlags(!shutdown);
              }}
              onMouseDown={(e) => startDrag(e.clientX)}
              onTouchStart={(e) => startDrag(e.touches?.[0]?.clientX)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!saving && !loading) saveFlags(!shutdown); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); if (!saving && !loading && shutdown) saveFlags(false); }
                if (e.key === 'ArrowRight') { e.preventDefault(); if (!saving && !loading && !shutdown) saveFlags(true); }
              }}
              className={`relative inline-flex h-9 w-20 select-none items-center rounded-full border transition-colors outline-none focus:ring-2 focus:ring-cyan-400/50 ${
                shutdown ? 'bg-gradient-to-r from-red-600/50 via-red-500/40 to-red-400/30 border-red-400/40' : 'bg-white/10 border-white/20'
              } ${saving ? 'opacity-70 cursor-wait' : 'cursor-pointer active:scale-[0.99]'} ${dragging ? 'ring-1 ring-cyan-300/40' : ''}`}
            >
              {/* Track labels */}
              <span className={`pointer-events-none absolute left-2 text-[10px] font-semibold tracking-wide ${shutdown ? 'text-white/30' : 'text-cyan-200/90'}`}>OFF</span>
              <span className={`pointer-events-none absolute right-2 text-[10px] font-semibold tracking-wide ${shutdown ? 'text-red-200/90' : 'text-white/30'}`}>ON</span>

              {/* Progress glow */}
              <div
                className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
                aria-hidden
              >
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(90deg, rgba(34,211,238,0.12) 0%, rgba(34,211,238,0.2) ${Math.round(pos * 100)}%, transparent ${Math.round(pos * 100)}%)`,
                    transition: dragging ? 'none' : 'background 150ms linear',
                  }}
                />
              </div>

              {/* Knob */}
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className={`h-7 w-7 rounded-full shadow-md border ${shutdown ? 'border-red-300/60' : 'border-cyan-200/60'}`}
                style={{
                  background: shutdown ? 'linear-gradient(180deg, #fca5a5, #ef4444)' : 'linear-gradient(180deg, #67e8f9, #22d3ee)',
                  transform: `translateX(${4 + pos * 28}px)`, // 4px -> 32px travel
                }}
              />
            </div>
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
