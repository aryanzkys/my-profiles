"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import achievements from '../data/achievements.json';
import education from '../data/education.json';
import organizations from '../data/organizations.json';
import about from '../data/about.json';
import contact from '../data/contact.json';

const SERVER_PROXY_PATHS = [
  '/.netlify/functions/gemini-chat',
  (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/.netlify/functions/gemini-chat',
  '/api/gemini-chat',
  (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/api/gemini-chat',
];

function RobotAvatar() {
  return (
  <div className="relative h-12 w-12 rounded-2xl overflow-hidden border border-cyan-300/30 bg-gradient-to-b from-cyan-500/10 to-blue-500/10 shadow-[0_0_24px_rgba(34,211,238,0.25)]" aria-hidden="true">
      <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(100% 100% at 50% 0%, rgba(34,211,238,0.5), transparent 60%)' }} />
      <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-7 w-7 text-cyan-300" fill="currentColor">
        <path d="M7 10h10v6H7z"/><path d="M12 3a1 1 0 0 1 1 1v2h1a5 5 0 0 1 5 5v5a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3v-5a5 5 0 0 1 5-5h1V4a1 1 0 0 1 1-1Z" opacity=".35"/>
        <circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>
      </svg>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10">
      <span className="sr-only">AI is typing…</span>
      <motion.span className="h-1.5 w-1.5 rounded-full bg-cyan-300" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2 }} />
      <motion.span className="h-1.5 w-1.5 rounded-full bg-cyan-300" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} />
      <motion.span className="h-1.5 w-1.5 rounded-full bg-cyan-300" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} />
    </div>
  );
}

function SlowProcessing() {
  return (
  <div className="mt-1 max-w-[80%] rounded-xl px-3 py-2 text-xs border bg-cyan-500/5 border-cyan-400/30 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.12)]" role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        <motion.span
          className="h-2 w-2 rounded-full bg-cyan-300"
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
    <span>Processing your answer… this may take a moment ⏳</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.span
          className="block h-full bg-gradient-to-r from-cyan-400/40 via-sky-400/70 to-cyan-400/40"
          initial={{ x: '-100%' }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
        />
      </div>
    </div>
  );
}

export default function Chatbot() {
  const STORAGE_KEY = 'aryan-chatbot-history-v1';
  const MAX_MESSAGES = 200;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    { role: 'ai', text: "Hello! I’m Aryan’s AI assistant 🤖. Want to get to know him better?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  // Hint bubble and question-mark animation state
  const HINT_KEY = 'aryan-chatbot-hint-v1';
  const [showHint, setShowHint] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const viewport = useRef(null);
  const inputRef = useRef(null);

  const chatWidth = useMemo(() => ({ base: 320, lg: 420 }), []);

  const getInitialMessages = () => ([
    { role: 'ai', text: "Hello! I’m Aryan’s AI assistant 🤖. Want to get to know him better?" }
  ]);

  const sendMessage = async (text) => {
    if (!text?.trim()) return;
    const userMsg = { role: 'user', text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
  setSlow(false);
  const slowTimer = setTimeout(() => setSlow(true), 5000);
    try {
      // Build profile context from local data
      const profile = buildProfilePrompt();
      // Call server proxy (Netlify in prod, Next API in dev)
      let res = null; let lastErr = '';
      for (const p of SERVER_PROXY_PATHS) {
        try {
          const r = await fetch(p, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ profile, history: messages, message: userMsg.text })
          });
          if (r.ok) { res = r; break; }
          lastErr = `HTTP ${r.status}`;
        } catch (e) { lastErr = e?.message || 'Network error'; }
      }
      if (!res) throw new Error(lastErr || 'Failed to reach proxy');
      const data = await res.json();
      let reply = (data?.reply || '').trim();
      if (!reply) reply = 'Sorry, I could not generate a response right now.';
      setMessages((m) => [...m, { role: 'ai', text: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'ai', text: 'Hmm, there was a problem reaching the AI. Please try again in a moment.' }]);
    } finally {
  clearTimeout(slowTimer);
  setLoading(false);
  setSlow(false);
    }
  };

  useEffect(() => {
    // Optional: scroll to bottom when new message arrives
    const el = viewport.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      // Focus input when opening for better accessibility
      inputRef.current?.focus?.();
      const onKey = (e) => {
        if (e.key === 'Escape') setOpen(false);
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [open]);

  // Load persisted chat on mount
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const sanitized = parsed
          .filter(m => m && (m.role === 'user' || m.role === 'ai') && typeof m.text === 'string')
          .slice(-MAX_MESSAGES);
        if (sanitized.length) setMessages(sanitized);
      }
    } catch { /* ignore parse errors */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time onboarding hint for the chatbot FAB
  useEffect(() => {
    try {
      const flagged = typeof window !== 'undefined' ? window.localStorage.getItem(HINT_KEY) : '1';
      const already = !!flagged;
      setHintDismissed(already);
      if (!already) {
        const t = setTimeout(() => setShowHint(true), 2500);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, []);

  const dismissHint = () => {
    try { window.localStorage.setItem(HINT_KEY, '1'); } catch {}
    setHintDismissed(true);
    setShowHint(false);
  };

  // Persist chat when messages change
  useEffect(() => {
    try {
      const toSave = messages.slice(-MAX_MESSAGES);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* quota or privacy mode; ignore */ }
  }, [messages]);

  return (
  <div className="fixed bottom-4 right-4 z-40">
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={() => { setOpen(true); if (!hintDismissed) dismissHint(); }}
            aria-label="Open AI chatbot"
            title="Open AI chatbot"
            className="relative h-14 w-14 rounded-full border border-cyan-300/40 bg-black/60 backdrop-blur-md shadow-[0_0_24px_rgba(34,211,238,0.25)] hover:shadow-[0_0_34px_rgba(34,211,238,0.35)] transition-shadow"
            onMouseEnter={() => { if (!hintDismissed) setShowHint(true); }}
            onFocus={() => { if (!hintDismissed) setShowHint(true); }}
            onMouseLeave={() => { if (!hintDismissed) setShowHint(false); }}
            onBlur={() => { if (!hintDismissed) setShowHint(false); }}
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 via-sky-500/10 to-blue-500/10" />
            <span className="relative grid place-items-center text-cyan-300">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.08 1.02 3.97 2.68 5.4-.1.58-.38 1.58-1.38 2.6 0 0 1.62.12 3.1-.9.62.17 1.27.3 1.94.35A9 9 0 1 0 12 3Z"/></svg>
              {/* Animated question mark overlay */}
              <motion.span
                className="pointer-events-none absolute -top-1 -right-1 h-6 w-6 rounded-full grid place-items-center text-cyan-200/90 bg-black/70 border border-cyan-300/40 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
                style={{
                  backgroundImage: 'radial-gradient(80% 80% at 50% 0%, rgba(34,211,238,0.18), transparent)',
                }}
                initial={{ opacity: 0, scale: 0.9, rotate: -8 }}
                animate={{
                  opacity: 1,
                  scale: [1, 1.05, 1],
                  y: [0, -2, 0],
                  rotate: [-6, 6, -6],
                }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                aria-hidden="true"
              >
                <span className="text-sm font-semibold">?</span>
              </motion.span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Hint tooltip */}
      <AnimatePresence>
        {!open && showHint && (
          <motion.div
            key="fab-hint"
            initial={{ opacity: 0, x: 12, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="absolute bottom-16 right-0 w-[min(84vw,280px)] select-none"
            role="tooltip"
            aria-live="polite"
          >
            <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-cyan-400/30 via-blue-500/25 to-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.25)]">
              <div className="rounded-2xl border border-white/10 bg-black/80 backdrop-blur-md px-3 py-2 text-[13px] text-gray-100">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-4 w-4 rounded-full grid place-items-center text-cyan-300 bg-cyan-500/10 border border-cyan-400/30">
                    <span className="text-[12px] font-semibold">?</span>
                  </div>
                  <div className="flex-1 leading-snug">Wanna know Aryan better? Chat with Aryan’s AI Assistant! 🤖✨</div>
                  {!hintDismissed && (
                    <button
                      onClick={dismissHint}
                      aria-label="Dismiss hint"
                      className="ml-1 h-6 w-6 grid place-items-center rounded-md text-gray-300 hover:text-white hover:bg-white/10"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4l-6.3 6.3-1.41-1.42L9.17 12 2.88 5.71 4.29 4.3l6.3 6.3 6.3-6.3z"/></svg>
                    </button>
                  )}
                </div>
              </div>
              {/* little arrow */}
              <div className="absolute -bottom-2 right-4 h-3 w-3 rotate-45 bg-black/80 border-b border-r border-white/10" aria-hidden="true" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            drag
            dragConstraints={{ left: -24, right: 24, top: -24, bottom: 24 }}
            dragElastic={0.2}
            className="relative w-[min(92vw,340px)] sm:w-[min(88vw,380px)] rounded-2xl p-[1px] bg-gradient-to-r from-cyan-400/30 via-blue-500/25 to-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.25)] backdrop-blur-xl"
            role="dialog"
            aria-label="AI chat window"
            aria-modal="false"
          >
            <div className="rounded-2xl border border-white/10 bg-black/85 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 p-3 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
                <RobotAvatar />
                <div className="flex-1">
                  <div className="text-cyan-200 font-medium">Aryan’s AI Assistant</div>
                  <div className="text-xs text-gray-400">Hello! I’m Aryan’s AI assistant 🤖. Want to get to know him better?</div>
                </div>
                {/* Tiny clear button, tucked near the close button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
                    setMessages(getInitialMessages());
                  }}
                  aria-label="Clear chat"
                  title="Clear chat"
                  className="h-8 w-8 mr-1 grid place-items-center rounded-full text-cyan-200/80 hover:text-cyan-200 border border-cyan-400/20 hover:border-cyan-400/40 bg-cyan-500/10 hover:bg-cyan-500/15 shadow-[0_0_10px_rgba(34,211,238,0.15)]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm-4 0h2v8H6v-8Zm10 0h-2v8h2v-8Z"/></svg>
                </motion.button>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="h-8 w-8 grid place-items-center rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4l-6.3 6.3-1.41-1.42L9.17 12 2.88 5.71 4.29 4.3l6.3 6.3 6.3-6.3z"/></svg>
                </button>
              </div>

              {/* Chat history */}
              <div
                ref={viewport}
                className="max-h-[45vh] sm:max-h-[50vh] overflow-y-auto p-3 space-y-3"
                role="log"
                aria-live="polite"
                aria-relevant="additions text"
              >
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed border ${m.role === 'user' ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.12)]' : 'bg-white/5 border-white/10 text-gray-100'}`}
                      role="article"
                      aria-label={m.role === 'user' ? 'Your message' : 'Assistant message'}
                    >
                      {m.role === 'user' ? (
                        <span>{m.text}</span>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          linkTarget="_blank"
                          components={{
                            a: ({node, ...props}) => (
                              <a {...props} className="underline decoration-cyan-400/50 hover:decoration-cyan-300" />
                            ),
                            strong: ({node, ...props}) => (
                              <strong {...props} className="font-semibold text-white" />
                            ),
                            ul: ({node, ...props}) => (
                              <ul {...props} className="list-disc pl-5 my-1 space-y-1" />
                            ),
                            ol: ({node, ...props}) => (
                              <ol {...props} className="list-decimal pl-5 my-1 space-y-1" />
                            ),
                            code: ({inline, className, children, ...props}) => (
                              <code {...props} className={`rounded px-1 py-0.5 bg-black/40 border border-white/10 ${className||''}`}>{children}</code>
                            )
                          }}
                        >
                          {m.text}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex flex-col items-start gap-2">
                    <TypingDots />
                    {slow && <SlowProcessing />}
                  </div>
                )}
                {/* API key is handled server-side via function env; no client key warning */}
              </div>

              {/* Input */}
              <form
                className="flex items-center gap-2 p-3 border-t border-white/10 bg-black/60"
                onSubmit={(e) => { e.preventDefault(); if (!loading) sendMessage(input); }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question here..."
                  aria-label="Type your message"
                  ref={inputRef}
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className={`h-9 px-3 rounded-xl border transition ${loading ? 'opacity-70 cursor-wait' : 'hover:shadow-[0_0_14px_rgba(34,211,238,0.25)]'} bg-cyan-500/20 border-cyan-400/30 text-cyan-200`}
                >
                  Send
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function buildProfilePrompt() {
  // Summarize Aryan's profile with achievements, education, and organizations
  const parts = [];
  parts.push('You are Aryan’s AI assistant. Use the PROFILE below to answer questions about Aryan accurately and concisely. If a question is unrelated to Aryan, politely answer but prioritize known facts. Prefer the user’s language. Do not fabricate achievements. You may use Markdown formatting (bold, lists, links, inline code) and emojis to improve clarity and friendliness. If the user requests CAPITAL letters, you may use ALL CAPS for emphasis.');

  // About Me
  if (about && typeof about === 'object') {
    const lines = [];
    if (about.name) lines.push(`Name: ${about.name}`);
    if (about.role) lines.push(`Role: ${about.role}`);
    if (about.headline) lines.push(`Focus: ${about.headline}`);
    if (Array.isArray(about.summary) && about.summary.length) {
      lines.push('Summary:');
      lines.push(...about.summary.map(s => `- ${s}`));
    }
    if (lines.length) parts.push('\nPROFILE — About:\n' + lines.join('\n'));
  }

  // Education
  if (Array.isArray(education) && education.length) {
    const edu = education.map(e => `- ${e.title}${e.subtitle ? ` — ${e.subtitle}` : ''} (${e.period})`).join('\n');
    parts.push('\nPROFILE — Education:\n' + edu);
  }
  // Organizations
  if (Array.isArray(organizations) && organizations.length) {
    const orgSorted = organizations
      .map((o, i) => ({ o, i, active: /present/i.test(o.period || '') }))
      .sort((a, b) => (Number(b.active) - Number(a.active)) || (a.i - b.i))
      .map(({ o }) => `- ${o.org}${o.role ? ` — ${o.role}` : ''} (${o.period})`)
      .join('\n');
    parts.push('\nPROFILE — Organizations:\n' + orgSorted);
  }
  // Achievements
  if (achievements && typeof achievements === 'object') {
    const years = Object.keys(achievements).sort();
    const lines = years.map(y => {
      const list = achievements[y] || [];
      const items = list.map((a, i) => `  • ${a.text}`).join('\n');
      return `- ${y}:\n${items}`;
    }).join('\n');
    parts.push('\nPROFILE — Achievements:\n' + lines);
  }

  // Contact
  if (contact && typeof contact === 'object') {
    const keys = ['email', 'linkedin', 'instagram', 'instagram_handle', 'github'];
    const lines = keys.filter(k => contact[k]).map(k => `- ${k.replace('_', ' ')}: ${contact[k]}`);
    if (lines.length) parts.push('\nPROFILE — Contact:\n' + lines.join('\n'));
  }

  parts.push('\nGuidelines: Keep answers short and helpful. If asked “Who is Aryan?” provide a brief intro using the profile. Use accessible formatting (e.g., headings, bold, lists) when it helps readability.');
  return parts.join('\n');
}
