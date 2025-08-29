"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function classNames(...xs) { return xs.filter(Boolean).join(' '); }

export default function MessageToAryan() {
  const [instagram, setInstagram] = useState('');
  const [igUser, setIgUser] = useState('');
  const [igChecking, setIgChecking] = useState(false);
  const [igValid, setIgValid] = useState(null); // true|false|null
  const [initials, setInitials] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [fail, setFail] = useState('');
  const maxLen = 500;

  // Sanitize instagram input to start with @ and allow [a-z0-9._]
  const onInstagramChange = (v) => {
    let s = v.trim();
    if (s && !s.startsWith('@')) s = '@' + s.replace(/^@+/, '');
    // remove disallowed chars from the username part
    const name = s.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._]/g, '');
    setInstagram(s ? '@' + name : '');
  };

  // Derived username without @
  useEffect(() => {
    setIgUser((instagram || '').replace(/^@/, ''));
  }, [instagram]);

  // Debounced IG validation via serverless to avoid CORS
  useEffect(() => {
    let alive = true;
    if (!igUser) { setIgValid(null); return; }
    setIgChecking(true); setIgValid(null);
    const t = setTimeout(async () => {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const urls = Array.from(new Set([
          `/.netlify/functions/validate-instagram?u=${encodeURIComponent(igUser)}`,
          `${basePath}/.netlify/functions/validate-instagram?u=${encodeURIComponent(igUser)}`,
          `/api/validate-instagram?u=${encodeURIComponent(igUser)}`,
          `${basePath}/api/validate-instagram?u=${encodeURIComponent(igUser)}`,
        ]));
        let ok = null;
        for (const url of urls) {
          try {
            const res = await fetch(url, { headers: { accept: 'application/json' } });
            if (!res.ok) continue;
            const json = await res.json();
            ok = !!json?.exists;
            break;
          } catch {}
        }
        if (!alive) return;
        setIgValid(ok);
      } finally {
        if (alive) setIgChecking(false);
      }
    }, 450);
    return () => { alive = false; clearTimeout(t); };
  }, [igUser]);

  const remaining = Math.max(0, maxLen - message.length);

  const validate = () => {
    const e = {};
    if (!initials.trim()) e.initials = 'Required';
    if (!message.trim()) e.message = 'Required';
    if (message.length > maxLen) e.message = `Max ${maxLen} characters`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    setFail(''); setDone(false);
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = {
        instagram: igUser ? '@' + igUser : '-',
        initials: initials.trim(),
        message: message.trim(),
      };
      const body = JSON.stringify(payload);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/send-message',
        `${basePath}/.netlify/functions/send-message`,
        '/api/send-message',
        `${basePath}/api/send-message`,
      ]));
      let ok = false; let lastErr = '';
      for (const url of urls) {
        try {
          const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
          if (res.ok) { ok = true; break; }
          else { lastErr = `HTTP ${res.status}`; }
        } catch (e) { lastErr = e?.message || 'Network error'; }
      }
      if (!ok) throw new Error(lastErr || 'Failed to send');
      setDone(true);
      setInstagram(''); setInitials(''); setMessage(''); setIgValid(null);
    } catch (e) {
      setFail(e?.message || 'Failed to send');
    } finally { setBusy(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="pointer-events-auto w-[min(880px,95vw)]">
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-cyan-500/40 overflow-hidden">
        <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-md p-5 sm:p-6">
          <div className="mb-4">
            <div className="text-xs tracking-widest text-cyan-200/70 mb-1">DIRECT LINE</div>
            <h2 className="text-xl sm:text-2xl font-semibold text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.25)]">Message to Aryan</h2>
            <div className="text-xs text-gray-400 mt-1">Share feedback, ideas, or just say hi — encrypted over quantum pigeon circuits.</div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Instagram */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">Instagram Username (optional)</label>
              <div className="relative">
                <input
                  value={instagram}
                  onChange={(e)=>onInstagramChange(e.target.value)}
                  placeholder="@yourusername"
                  className={classNames(
                    "w-full bg-black/40 border rounded-md px-3 py-2 pr-10 outline-none focus:ring-1 text-gray-100 placeholder-gray-500 caret-cyan-300",
                    igValid===true ? "border-emerald-400/40 focus:ring-emerald-400/40" : igValid===false ? "border-red-400/40 focus:ring-red-400/40" : "border-white/10 focus:ring-cyan-400/40"
                  )}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  <AnimatePresence initial={false}>
                    {igChecking && (
                      <motion.span key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-gray-400">…</motion.span>
                    )}
                    {igValid===true && !igChecking && (
                      <motion.span key="ok" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="text-emerald-400">✔</motion.span>
                    )}
                    {igValid===false && !igChecking && (
                      <motion.span key="bad" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="text-red-400">⚠</motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Leave empty if you prefer anonymity; we’ll store "-".</div>
            </div>

            {/* Initials / Name */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">Initials / Name <span className="text-red-400">*</span></label>
              <input
                value={initials}
                onChange={(e)=>setInitials(e.target.value)}
                placeholder="e.g., AJ • Ary • AnonymousJedi"
                className={classNames("w-full bg-black/40 border rounded-md px-3 py-2 outline-none focus:ring-1 text-gray-100 placeholder-gray-500 caret-cyan-300", errors.initials?"border-red-400/40 focus:ring-red-400/40":"border-white/10 focus:ring-cyan-400/40")}
              />
              {errors.initials && <div className="text-xs text-red-400 mt-1">{errors.initials}</div>}
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">Message / Feedback <span className="text-red-400">*</span></label>
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e)=>setMessage(e.target.value.slice(0, maxLen+2))}
                  rows={5}
                  placeholder="Type your message to Aryan here..."
                  className={classNames("w-full bg-black/40 border rounded-md px-3 py-2 outline-none resize-y min-h-[120px] focus:ring-1 text-gray-100 placeholder-gray-500 caret-cyan-300", errors.message?"border-red-400/40 focus:ring-red-400/40":"border-white/10 focus:ring-cyan-400/40")}
                />
                <div className="absolute bottom-1 right-2 text-[11px] text-gray-400">{remaining} / {maxLen}</div>
              </div>
              {errors.message && <div className="text-xs text-red-400 mt-1">{errors.message}</div>}
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                onClick={onSubmit}
                disabled={busy}
                className={classNames(
                  "relative inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition will-change-transform",
                  "bg-gradient-to-r from-cyan-600/20 via-fuchsia-600/20 to-cyan-600/20",
                  "border-cyan-400/40 text-cyan-100 hover:from-cyan-600/30 hover:to-cyan-600/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.25)]",
                  busy && "opacity-70 cursor-wait"
                )}
              >
                <span className="relative z-10">{busy ? 'Transmitting…' : 'Send Message'}</span>
                <span className="absolute inset-0 rounded-xl pointer-events-none opacity-40" style={{ background: 'conic-gradient(from 0deg, transparent, rgba(34,211,238,0.4), rgba(232,121,249,0.35), transparent 30%)' }} />
              </button>
            </div>

            <AnimatePresence>
              {done && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-600/15 px-4 py-2 text-emerald-200">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <motion.circle cx="12" cy="12" r="10" stroke="#34d399" strokeWidth="1.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
                    <motion.path d="M7 12.5l3.2 3.2L17 8.8" stroke="#a7f3d0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.1 }} />
                  </svg>
                  <div className="text-sm">Message delivered. Thank you!</div>
                </motion.div>
              )}
              {fail && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-3 rounded-xl border border-red-400/40 bg-red-600/15 px-4 py-2 text-red-200">
                  <div className="text-sm">Failed to send: {fail}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
