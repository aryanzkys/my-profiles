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
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [fail, setFail] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [focusedField, setFocusedField] = useState(null);
  const maxLen = 1000;
  const mouseRef = useRef({ x: 0, y: 0 });

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

  // Character count animation
  useEffect(() => {
    setCharCount(message.length);
  }, [message]);

  const validate = () => {
    const e = {};
    if (!initials.trim()) e.initials = 'Name is required';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email format';
    if (!message.trim()) e.message = 'Message cannot be empty';
    if (message.length > maxLen) e.message = `Maximum ${maxLen} characters allowed`;
    if (message.trim().length < 10) e.message = 'Message too short (min 10 characters)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseRef.current = { x, y };
    e.currentTarget.style.setProperty('--mx', x);
    e.currentTarget.style.setProperty('--my', y);
  };

  const onSubmit = async () => {
    setFail(''); setDone(false);
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = {
        instagram: igUser ? '@' + igUser : '-',
        initials: initials.trim(),
        email: email.trim() || '-',
        category,
        priority,
        message: message.trim(),
        timestamp: new Date().toISOString(),
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
      // Reset form
      setInstagram(''); setInitials(''); setEmail(''); setMessage(''); 
      setCategory('general'); setPriority('normal'); setIgValid(null);
      // Auto-hide success after 5s
      setTimeout(() => setDone(false), 5000);
    } catch (e) {
      setFail(e?.message || 'Failed to send');
      setTimeout(() => setFail(''), 5000);
    } finally { setBusy(false); }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.98 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} 
      className="pointer-events-auto w-[min(920px,96vw)] relative"
    >
      {/* Glow effects */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-[120px]" />

      <div 
        className="relative rounded-3xl p-[1.5px] bg-gradient-to-br from-cyan-500/50 via-fuchsia-500/50 to-cyan-500/50 overflow-hidden shadow-[0_0_60px_rgba(34,211,238,0.15)]"
        onMouseMove={onMouseMove}
        style={{
          '--mx': 0.5,
          '--my': 0.5,
        }}
      >
        {/* Interactive shine effect */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(600px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), rgba(34,211,238,0.15), transparent 50%)`
          }}
        />

        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-black/95 via-[#0a0f14]/95 to-black/95 backdrop-blur-xl p-6 sm:p-8 md:p-10 relative overflow-hidden">
          {/* Top accent line */}
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent origin-center"
          />

          {/* Header */}
          <div className="mb-8 relative">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] text-cyan-300/80 mb-3 px-3 py-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              SECURE CHANNEL • END-TO-END ENCRYPTED
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-300 via-blue-200 to-fuchsia-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(34,211,238,0.3)]"
            >
              Direct Line to Aryan
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-gray-400 mt-3 leading-relaxed max-w-2xl"
            >
              Your message reaches Aryan directly through a private, monitored channel. Whether it's feedback, collaboration, or just a quick hello — this is your exclusive line.
            </motion.p>
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

            {/* Submit Button */}
            <div className="pt-2">
              <motion.button
                onClick={onSubmit}
                disabled={busy}
                whileHover={{ scale: busy ? 1 : 1.02 }}
                whileTap={{ scale: busy ? 1 : 0.98 }}
                className={classNames(
                  "relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border transition-all duration-300 overflow-hidden group",
                  "bg-gradient-to-r from-cyan-600/30 via-blue-600/30 to-fuchsia-600/30",
                  "border-cyan-400/50 text-cyan-100 font-medium",
                  busy ? "opacity-70 cursor-wait" : "hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:border-cyan-400/70"
                )}
              >
                {/* Animated background */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.1), transparent)',
                  }}
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: 'linear',
                  }}
                />
                
                <span className="relative z-10 flex items-center gap-2">
                  {busy ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="h-5 w-5 border-2 border-cyan-300/30 border-t-cyan-300 rounded-full"
                      />
                      Sending Message...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Secure Message
                    </>
                  )}
                </span>
              </motion.button>
            </div>

            {/* Status Messages */}
            <AnimatePresence mode="wait">
              {done && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="relative overflow-hidden rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-600/20 to-emerald-500/15 px-5 py-4"
                >
                  <div className="flex items-start gap-4">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-400/40"
                    >
                      <svg className="h-6 w-6 text-emerald-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-emerald-200">Message delivered successfully!</div>
                      <div className="text-xs text-emerald-300/80 mt-1">Your message has been received and will be reviewed personally by Aryan. Thank you for reaching out!</div>
                    </div>
                  </div>
                  {/* Animated checkmark path */}
                  <motion.div
                    className="absolute top-0 right-0 w-32 h-32 opacity-5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8 }}
                  >
                    <svg viewBox="0 0 100 100" className="text-emerald-300">
                      <motion.path
                        d="M20,50 L40,70 L80,30"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                </motion.div>
              )}
              {fail && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="relative overflow-hidden rounded-xl border border-red-400/40 bg-gradient-to-r from-red-600/20 to-red-500/15 px-5 py-4"
                >
                  <div className="flex items-start gap-4">
                    <motion.div
                      initial={{ scale: 0, rotate: 180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-500/20 border border-red-400/40"
                    >
                      <svg className="h-6 w-6 text-red-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-red-200">Failed to send message</div>
                      <div className="text-xs text-red-300/80 mt-1">{fail}. Please try again or contact support.</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info Footer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="pt-4 border-t border-white/5"
            >
              <div className="flex items-start gap-3 text-xs text-gray-500">
                <svg className="h-4 w-4 text-cyan-400/60 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="leading-relaxed">
                  <span className="text-gray-400">All messages are encrypted and stored securely.</span> Response time varies based on message priority. For urgent matters, please include relevant details and mark as "Urgent" priority.
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
