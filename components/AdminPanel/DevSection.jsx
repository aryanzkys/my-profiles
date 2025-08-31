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
  const [pending, setPending] = useState(null); // null | boolean, optimistic visual
  const busy = pending !== null || saving; // busy while saving or pending transition
  // Admin authorities
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState('');
  const [form, setForm] = useState({ uid: '', email: '', displayName: '', canEditSections: true, canAccessDev: true, banned: false });
  const [formBusy, setFormBusy] = useState(false);
  const OWNER_EMAIL = 'prayogoaryan63@gmail.com';
  const [audit, setAudit] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLogsLoading, setLoginLogsLoading] = useState(false);
  // presence refresh interval (ms) configurable via env/UI; 0 disables auto-refresh
  const defaultPresenceMs = (() => {
    const envVal = Number(process.env.NEXT_PUBLIC_PRESENCE_REFRESH_MS || 60000);
    return Number.isFinite(envVal) && envVal >= 0 ? envVal : 60000;
  })();
  const [presenceIntervalMs, setPresenceIntervalMs] = useState(() => {
    try { const v = Number(localStorage.getItem('admin:presenceRefreshMs')); if (Number.isFinite(v)) return v; } catch {}
    return defaultPresenceMs;
  });
  useEffect(() => { try { localStorage.setItem('admin:presenceRefreshMs', String(presenceIntervalMs)); } catch {} }, [presenceIntervalMs]);

  // Helper: load admins and presence, then merge
  const reloadAdminsWithPresence = async () => {
    setAdminsLoading(true); setAdminsError('');
    try {
      const urls = Array.from(new Set([
        '/.netlify/functions/admins-list',
        `${basePath}/.netlify/functions/admins-list`,
        '/api/admins-list',
        `${basePath}/api/admins-list`,
      ]));
      let data = null; let lastErr = '';
      for (const url of urls) {
        try { const r = await fetch(url); if (r.ok) { data = await r.json(); break; } else lastErr = `HTTP ${r.status}`; } catch (e) { lastErr = e?.message || 'Network'; }
      }
      if (!data) throw new Error(lastErr || 'Failed to load');
      // Fetch presence and merge
      let presence = [];
      const pUrls = Array.from(new Set([
        '/.netlify/functions/admin-presence-list',
        `${basePath}/.netlify/functions/admin-presence-list`,
        '/api/admin-presence-list',
        `${basePath}/api/admin-presence-list`,
      ]));
      for (const u of pUrls) { try { const r = await fetch(u); if (r.ok) { presence = await r.json(); break; } } catch {}
      }
      const arr = Array.isArray(data) ? data : [];
      const merged = arr.map(a => {
        const key = String(a.email || a.uid || a.id || '').toLowerCase();
        const m = (Array.isArray(presence)?presence:[]).find(p => String(p.email || p.uid || p.id || '').toLowerCase() === key);
        return { ...a, _online: !!m?.online, _lastSeen: m?.last_seen || null };
      });
      setAdmins(merged);
    } catch (e) {
      setAdminsError(e?.message || 'Failed to load');
    } finally {
      setAdminsLoading(false);
    }
  };

  // Helper: refresh only presence markers without reloading the list
  const refreshPresenceOnly = async () => {
    try {
      const pUrls = Array.from(new Set([
        '/.netlify/functions/admin-presence-list',
        `${basePath}/.netlify/functions/admin-presence-list`,
        '/api/admin-presence-list',
        `${basePath}/api/admin-presence-list`,
      ]));
      let presence = [];
      for (const u of pUrls) { try { const r = await fetch(u); if (r.ok) { presence = await r.json(); break; } } catch {}
      }
      if (!Array.isArray(presence)) return;
      setAdmins((prev) => prev.map(a => {
        const key = String(a.email || a.uid || a.id || '').toLowerCase();
        const m = presence.find(p => String(p.email || p.uid || p.id || '').toLowerCase() === key);
        return { ...a, _online: !!m?.online, _lastSeen: m?.last_seen || null };
      }));
    } catch {}
  };

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
      // Optimistic UI: move knob immediately
      setPending(next);
      setPos(next ? 1 : 0);
      let ok = false; let lastErr = '';
      for (const url of urls) {
        try { const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body }); if (r.ok) { ok = true; break; } else lastErr = `HTTP ${r.status}`; } catch (e) { lastErr = e?.message || 'Network'; }
      }
      if (!ok) throw new Error(lastErr || 'Failed to save');
      setShutdown(next); setSaved(true);
      // Broadcast to other tabs
      try { localStorage.setItem('site:flags', JSON.stringify({ shutdown: next, ts: Date.now() })); window.dispatchEvent(new Event('site:flags:updated')); } catch {}
    } catch (e) { setError(e?.message || 'Failed to save'); }
    finally {
      setSaving(false);
      setPending(null);
      // Snap pos to actual state on failure
      setPos((prev) => (shutdown ? 1 : 0));
      setTimeout(()=>setSaved(false), 1500);
    }
  };

  useEffect(() => { fetchFlags(); }, []);
  useEffect(() => { // initial load
    reloadAdminsWithPresence();
  }, []);

  useEffect(() => { // periodic presence refresh (configurable)
    if (!Number.isFinite(presenceIntervalMs) || presenceIntervalMs <= 0) return; // disabled
    const ms = Math.max(5000, Math.floor(presenceIntervalMs));
    const id = setInterval(() => { refreshPresenceOnly(); }, ms);
    return () => clearInterval(id);
  }, [presenceIntervalMs]);

  const formatLastSeen = (ts) => {
    if (!ts) return 'Last seen: never';
    try {
      const d = new Date(ts);
      const now = Date.now();
      const diff = Math.max(0, now - d.getTime());
      const sec = Math.floor(diff / 1000);
      const min = Math.floor(sec / 60);
      const hr = Math.floor(min / 60);
      const day = Math.floor(hr / 24);
      const rel = day > 0 ? `${day}d ago` : hr > 0 ? `${hr}h ago` : min > 0 ? `${min}m ago` : `${sec}s ago`;
      return `Last seen: ${d.toLocaleString()} (${rel})`;
    } catch {
      return `Last seen: ${String(ts)}`;
    }
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/admins-audit-list',
        `${basePath}/.netlify/functions/admins-audit-list`,
        '/api/admins-audit-list',
        `${basePath}/api/admins-audit-list`,
      ]));
      for (const url of urls) {
        try { const r = await fetch(url); if (r.ok) { const j = await r.json(); setAudit(Array.isArray(j)?j:[]); break; } } catch {}
      }
    } finally { setAuditLoading(false); }
  };

  const loadLoginLogs = async () => {
    setLoginLogsLoading(true);
    try {
      const urls = Array.from(new Set([
        '/.netlify/functions/admin-login-log-list', // optional if implemented separately
        `${basePath}/.netlify/functions/admin-login-log-list`,
        '/api/admin-login-log-list',
        `${basePath}/api/admin-login-log-list`,
      ]));
      let data = null;
      for (const url of urls) {
        try { const r = await fetch(url); if (r.ok) { data = await r.json(); break; } } catch {}
      }
      if (!data) { // fallback: direct read of storage/FS isn’t available client-side; server endpoints are expected
        setLoginLogs([]);
      } else {
        setLoginLogs(Array.isArray(data) ? data.slice().reverse() : []);
      }
    } finally { setLoginLogsLoading(false); }
  };

  // Keep slider knob in sync with state when not dragging
  useEffect(() => {
    // When not dragging and no pending transition, sync to state
    if (!dragging && pending === null) setPos(shutdown ? 1 : 0);
  }, [shutdown, dragging, pending]);

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
                if (!dragging && !busy && !loading) saveFlags(!(pending ?? shutdown));
              }}
              onMouseDown={(e) => startDrag(e.clientX)}
              onTouchStart={(e) => startDrag(e.touches?.[0]?.clientX)}
              onKeyDown={(e) => {
                const current = pending ?? shutdown;
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!busy && !loading) saveFlags(!current); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); if (!busy && !loading && current) saveFlags(false); }
                if (e.key === 'ArrowRight') { e.preventDefault(); if (!busy && !loading && !current) saveFlags(true); }
              }}
              aria-busy={busy}
              className={`relative inline-flex h-9 w-24 select-none items-center rounded-full border transition-colors outline-none focus:ring-2 focus:ring-cyan-400/50 ${
                (pending ?? shutdown) ? 'bg-gradient-to-r from-red-600/50 via-red-500/40 to-red-400/30 border-red-400/40' : 'bg-white/10 border-white/20'
              } ${busy ? 'cursor-wait' : 'cursor-pointer active:scale-[0.99]'} ${dragging ? 'ring-1 ring-cyan-300/40' : ''}`}
            >
              {/* Track labels */}
              <span className={`pointer-events-none absolute left-2 text-[10px] font-semibold tracking-wide transition-colors ${ (pending ?? shutdown) ? 'text-white/30' : 'text-cyan-200/90'}`}>OFF</span>
              <span className={`pointer-events-none absolute right-2 text-[10px] font-semibold tracking-wide transition-colors ${ (pending ?? shutdown) ? 'text-red-200/90' : 'text-white/30'}`}>ON</span>

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
                {busy && (
                  <motion.div
                    className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    initial={{ x: '-40%' }}
                    animate={{ x: '140%' }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  />
                )}
              </div>

              {/* Knob */}
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className={`h-7 w-7 rounded-full shadow-md border ${ (pending ?? shutdown) ? 'border-red-300/60' : 'border-cyan-200/60'}`}
                style={{
                  background: (pending ?? shutdown) ? 'linear-gradient(180deg, #fca5a5, #ef4444)' : 'linear-gradient(180deg, #67e8f9, #22d3ee)',
                  transform: `translateX(${4 + pos * 32}px)`, // adjusted for wider track
                }}
              />

              {/* Loading spinner overlay on knob */}
              {busy && (
                <motion.div
                  className="absolute h-7 w-7 rounded-full grid place-items-center"
                  style={{ left: `${4 + pos * 32}px` }}
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                >
                  <div className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white/90 border-r-white/70" />
                </motion.div>
              )}
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
      {/* Admin Authorities */}
      <div className="pt-2">
        <div className="text-lg font-semibold text-cyan-200 mb-2">Admin Authorities</div>
        <div className="text-xs text-gray-400 mb-2 flex items-center justify-between gap-2 flex-wrap">
          <span>Manage who can edit sections, access Dev, or is banned.</span>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-400">Presence refresh (sec)</label>
            <input
              type="number"
              min={0}
              step={5}
              value={Math.floor((Number.isFinite(presenceIntervalMs)?presenceIntervalMs:0)/1000)}
              onChange={(e)=>{
                const v = Number(e.target.value);
                if (!Number.isFinite(v) || v < 0) return;
                const ms = Math.floor(v*1000);
                setPresenceIntervalMs(ms);
              }}
              title="0 to disable auto-refresh"
              className="w-20 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-gray-200"
            />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
          {/* Add / Update form */}
          <div className="grid md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-300 mb-1">UID (optional)</label>
              <input className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" value={form.uid} onChange={(e)=>setForm(v=>({...v, uid:e.target.value}))} placeholder="Firebase UID" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-300 mb-1">Email</label>
              <input className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" value={form.email} onChange={(e)=>setForm(v=>({...v, email:e.target.value}))} placeholder="user@example.com" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-300 mb-1">Display Name</label>
              <input className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" value={form.displayName} onChange={(e)=>setForm(v=>({...v, displayName:e.target.value}))} placeholder="Optional" />
            </div>
            <div className="md:col-span-6 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <label className="inline-flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={form.canEditSections} onChange={(e)=>setForm(v=>({...v, canEditSections:e.target.checked}))} /> Can edit sections</label>
              <label className="inline-flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={form.canAccessDev} onChange={(e)=>setForm(v=>({...v, canAccessDev:e.target.checked}))} /> Can access Dev</label>
              <label className="inline-flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={form.banned} onChange={(e)=>setForm(v=>({...v, banned:e.target.checked}))} /> Banned</label>
              <button
                onClick={async()=>{
                  if (!form.uid && !form.email) { setAdminsError('Enter uid or email'); return; }
                  if (String(form.email).toLowerCase() === OWNER_EMAIL && form.banned) { setAdminsError('Owner cannot be banned'); return; }
                  setFormBusy(true); setAdminsError('');
                  try {
                    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
                    const urls = Array.from(new Set([
                      '/.netlify/functions/admins-upsert',
                      `${basePath}/.netlify/functions/admins-upsert`,
                      '/api/admins-upsert',
                      `${basePath}/api/admins-upsert`,
                    ]));
                    let ok = false; let lastErr = '';
                    for (const url of urls) {
                      try {
                        const actor = window.__adminActor || {};
                        const payload = { ...form, actorEmail: actor.email || null, actorUid: actor.uid || null, actorName: actor.name || null };
                        const r = await fetch(url, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(payload) });
                        if (r.ok) { ok = true; break; } else lastErr = `HTTP ${r.status}`;
                      } catch (e) { lastErr = e?.message || 'Network'; }
                    }
                    if (!ok) throw new Error(lastErr || 'Save failed');
                    await reloadAdminsWithPresence();
                  } catch (e) { setAdminsError(e?.message || 'Save failed'); }
                  finally { setFormBusy(false); }
                }}
                disabled={formBusy}
                className="px-3 py-2 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30"
              >{formBusy?'Saving…':'Add/Update'}</button>
              <button onClick={()=>setForm({ uid:'', email:'', displayName:'', canEditSections:true, canAccessDev:true, banned:false })} className="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15">Clear</button>
            </div>
          </div>
          {adminsLoading && <div className="text-sm text-gray-400">Loading admins…</div>}
          {adminsError && <div className="text-sm text-red-300">{adminsError}</div>}
          <div className="grid gap-2">
            {admins.map((a)=>{
              const key = a.id || a.uid || a.email;
              return (
                <div key={key} className={`rounded-lg border ${a.banned?'border-red-400/40 bg-red-600/10':'border-white/10 bg-black/40'} p-3 grid md:grid-cols-[minmax(0,1fr)_auto] gap-2`}>
                  <div>
                    <div className="text-sm text-cyan-200 font-medium">{a.displayName || a.email || a.uid || 'Admin'}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                      <span>{a.email || '-'}</span> {a.uid ? <span>• {a.uid}</span> : null}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] ${a._online ? 'border-emerald-400/50 text-emerald-200 bg-emerald-500/10' : 'border-gray-400/30 text-gray-300 bg-white/5'}`}
                        title={formatLastSeen(a._lastSeen)}
                      >
                        {a._online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-300 items-center">
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!a.canEditSections} onChange={async(e)=>{
                        if (String(a.email).toLowerCase() === OWNER_EMAIL && !e.target.checked) { alert('Owner must retain edit access'); return; }
                        if (!confirm(`Change "Can edit sections" for ${a.displayName||a.email||a.uid}?`)) return;
                        const next = { uid:a.uid, email:a.email, displayName:a.displayName, canEditSections:e.target.checked, canAccessDev:!!a.canAccessDev, banned:!!a.banned };
                        setAdmins((list)=>list.map(x=> (x===a? { ...a, canEditSections:e.target.checked } : x)));
                        try {
                          const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
                          const urls = Array.from(new Set([
                            '/.netlify/functions/admins-upsert',
                            `${basePath}/.netlify/functions/admins-upsert`,
                            '/api/admins-upsert',
                            `${basePath}/api/admins-upsert`,
                          ]));
                          const actor = window.__adminActor || {};
                          for (const url of urls) { try { const r = await fetch(url, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ ...next, actorEmail: actor.email||null, actorUid: actor.uid||null, actorName: actor.name||null }) }); if (r.ok) break; } catch {} }
                        } catch {}
                      }} /> Can edit sections</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!a.canAccessDev} onChange={async(e)=>{
                        if (String(a.email).toLowerCase() === OWNER_EMAIL && !e.target.checked) { alert('Owner must retain Dev access'); return; }
                        if (!confirm(`Change "Can access Dev" for ${a.displayName||a.email||a.uid}?`)) return;
                        const next = { uid:a.uid, email:a.email, displayName:a.displayName, canEditSections:!!a.canEditSections, canAccessDev:e.target.checked, banned:!!a.banned };
                        setAdmins((list)=>list.map(x=> (x===a? { ...a, canAccessDev:e.target.checked } : x)));
                        try { const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
                          const urls = Array.from(new Set([
                            '/.netlify/functions/admins-upsert',
                            `${basePath}/.netlify/functions/admins-upsert`,
                            '/api/admins-upsert',
                            `${basePath}/api/admins-upsert`,
                          ]));
                          const actor = window.__adminActor || {};
                          for (const url of urls) { try { const r = await fetch(url, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ ...next, actorEmail: actor.email||null, actorUid: actor.uid||null, actorName: actor.name||null }) }); if (r.ok) break; } catch {} }
                        } catch {}
                      }} /> Can access Dev</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!a.banned} onChange={async(e)=>{
                        if (String(a.email).toLowerCase() === OWNER_EMAIL) { alert('Owner cannot be banned'); return; }
                        if (!confirm(`${e.target.checked?'Ban':'Unban'} ${a.displayName||a.email||a.uid}?`)) return;
                        const next = { uid:a.uid, email:a.email, displayName:a.displayName, canEditSections:!!a.canEditSections, canAccessDev:!!a.canAccessDev, banned:e.target.checked };
                        setAdmins((list)=>list.map(x=> (x===a? { ...a, banned:e.target.checked } : x)));
                        try { const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
                          const urls = Array.from(new Set([
                            '/.netlify/functions/admins-upsert',
                            `${basePath}/.netlify/functions/admins-upsert`,
                            '/api/admins-upsert',
                            `${basePath}/api/admins-upsert`,
                          ]));
                          const actor = window.__adminActor || {};
                          for (const url of urls) { try { const r = await fetch(url, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ ...next, actorEmail: actor.email||null, actorUid: actor.uid||null, actorName: actor.name||null }) }); if (r.ok) break; } catch {} }
                        } catch {}
                      }} /> Banned</label>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={()=>setForm({ uid:a.uid||'', email:a.email||'', displayName:a.displayName||'', canEditSections:!!a.canEditSections, canAccessDev:!!a.canAccessDev, banned:!!a.banned })} className="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-xs">Edit</button>
                    <button onClick={async()=>{
                      if (String(a.email).toLowerCase() === OWNER_EMAIL) { alert('Owner cannot be deleted'); return; }
                      if (!confirm('Remove this admin authority?')) return;
                      try {
                        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
                        const qs = a.uid ? `uid=${encodeURIComponent(a.uid)}` : `email=${encodeURIComponent(a.email||'')}`;
                        const urls = Array.from(new Set([
                          `/.netlify/functions/admins-delete?${qs}`,
                          `${basePath}/.netlify/functions/admins-delete?${qs}`,
                          `/api/admins-delete?${qs}`,
                          `${basePath}/api/admins-delete?${qs}`,
                        ]));
                        let ok = false; let lastErr = '';
                        const actor = window.__adminActor || {};
                        for (const url of urls) {
                          try {
                            const r = await fetch(url, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ actorEmail: actor.email||null, actorUid: actor.uid||null, actorName: actor.name||null }) });
                            if (r.ok) { ok = true; break; } else lastErr = `HTTP ${r.status}: ${await r.text()}`;
                          } catch (e) { lastErr = e?.message || 'Network'; }
                        }
                        if (!ok) throw new Error(lastErr || 'Delete failed');
                        await reloadAdminsWithPresence();
                      } catch (e) { setAdminsError(e?.message || 'Delete failed'); }
                    }} className="px-3 py-2 rounded-md bg-red-600/20 border border-red-500/40 text-red-200 hover:bg-red-600/30 text-xs">Delete</button>
                  </div>
                </div>
              );
            })}
            {!adminsLoading && !adminsError && admins.length===0 && (
              <div className="text-sm text-gray-400">No admins configured yet.</div>
            )}
          </div>
          {/* Audit (Owner only – just show if Owner entry exists) */}
          {(admins.some(x=>String(x.email).toLowerCase()===OWNER_EMAIL) || (typeof window!=='undefined' && String(window.__adminActor?.email).toLowerCase()===OWNER_EMAIL)) && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-cyan-200 font-medium">Audit Logs (Owner)</div>
                <button onClick={loadAudit} className="text-xs px-2 py-1 rounded-md border border-white/10 hover:bg-white/5">Reload</button>
              </div>
              {auditLoading && <div className="text-xs text-gray-400 mt-1">Loading logs…</div>}
              <div className="mt-2 grid gap-2 max-h-64 overflow-auto pr-1">
                {audit.map((r, i)=> (
                  <div key={i} className="rounded-md border border-white/10 bg-black/30 p-2 text-xs text-gray-300">
                    <div className="text-[11px] text-gray-500">{r.ts ? new Date(r.ts).toLocaleString() : '-'}</div>
                    <div><span className="text-cyan-200">{r.action}</span> target: {r.target_email || r.target_uid || '-'} actor: {r.actor_email || r.actor_uid || '-'}</div>
                  </div>
                ))}
                {audit.length===0 && !auditLoading && <div className="text-xs text-gray-500">No logs.</div>}
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-cyan-200 font-medium">Admin Login Logs (Owner)</div>
                  <button onClick={loadLoginLogs} className="text-xs px-2 py-1 rounded-md border border-white/10 hover:bg-white/5">Reload</button>
                </div>
                {loginLogsLoading && <div className="text-xs text-gray-400 mt-1">Loading login logs…</div>}
                <div className="mt-2 grid gap-2 max-h-64 overflow-auto pr-1">
                  {loginLogs.map((r, i)=> (
                    <div key={i} className="rounded-md border border-white/10 bg-black/30 p-2 text-xs text-gray-300">
                      <div className="text-[11px] text-gray-500">{r.ts ? new Date(r.ts).toLocaleString() : '-'}</div>
                      <div>{r.email || r.uid || '-'} {r.name ? `• ${r.name}`:''} {r.provider ? `• ${r.provider}`:''}</div>
                    </div>
                  ))}
                  {loginLogs.length===0 && !loginLogsLoading && <div className="text-xs text-gray-500">No login logs or endpoint not available.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
