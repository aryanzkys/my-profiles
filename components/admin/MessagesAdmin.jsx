"use client";
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MessagesAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  // Feedbacks
  const [feedbacks, setFeedbacks] = useState([]);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState('');
  const [summary, setSummary] = useState('');
  const [summLoading, setSummLoading] = useState(false);
  // Chat (grounded on feedbacks)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const viewport = useRef(null);

  const fetchRows = async () => {
    setLoading(true); setError('');
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/messages-list',
        `${basePath}/.netlify/functions/messages-list`,
        '/api/messages-list',
        `${basePath}/api/messages-list`,
      ]));
      let data = null; let lastErr = '';
      for (const url of urls) {
        try { const r = await fetch(url); if (r.ok) { data = await r.json(); break; } else lastErr = `HTTP ${r.status}`; } catch (e) { lastErr = e?.message || 'Network'; }
      }
      if (!data) throw new Error(lastErr || 'Failed');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ fetchRows(); }, []);
  useEffect(()=>{ loadFeedbacks(); }, []);

  const onDelete = async (id) => {
    if (!id) return; setBusyId(id);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        `/.netlify/functions/messages-delete?id=${encodeURIComponent(id)}`,
        `${basePath}/.netlify/functions/messages-delete?id=${encodeURIComponent(id)}`,
        `/api/messages-delete?id=${encodeURIComponent(id)}`,
        `${basePath}/api/messages-delete?id=${encodeURIComponent(id)}`,
      ]));
      let ok = false; let lastErr = '';
      for (const url of urls) {
        try { const r = await fetch(url, { method: 'DELETE' }); if (r.ok) { ok = true; break; } else lastErr = `HTTP ${r.status}`; } catch (e) { lastErr = e?.message || 'Network'; }
      }
      if (!ok) throw new Error(lastErr || 'Delete failed');
      setRows((rs) => rs.filter(x => x.id !== id));
    } catch (e) { setError(e?.message || 'Delete failed'); }
    finally { setBusyId(''); }
  };

  const loadFeedbacks = async () => {
    setFbLoading(true); setFbError('');
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/feedback-list',
        `${basePath}/.netlify/functions/feedback-list`,
        '/api/feedback-list',
        `${basePath}/api/feedback-list`,
      ]));
      let data = null; let lastErr = '';
      for (const u of urls) {
        try { const r = await fetch(u); if (r.ok) { data = await r.json(); break; } else lastErr = `HTTP ${r.status}`; } catch (e) { lastErr = e?.message || 'Network'; }
      }
      if (!data) throw new Error(lastErr || 'Failed');
      setFeedbacks(Array.isArray(data)?data:[]);
    } catch (e) { setFbError(e?.message || 'Failed to load'); }
    finally { setFbLoading(false); }
  };

  const onSummarize = async () => {
    setSummLoading(true); setSummary('');
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/feedback-summarize',
        `${basePath}/.netlify/functions/feedback-summarize`,
        '/api/feedback-summarize',
        `${basePath}/api/feedback-summarize`,
      ]));
      let data = null; let lastErr = '';
      for (const u of urls) {
        try { const r = await fetch(u, { method: 'POST' }); if (r.ok) { data = await r.json(); break; } else lastErr = `HTTP ${r.status}`; } catch (e) { lastErr = e?.message || 'Network'; }
      }
      if (!data) throw new Error(lastErr || 'Failed');
      setSummary(data.summary || '');
    } catch (e) { setSummary('Failed to summarize.'); }
    finally { setSummLoading(false); }
  };

  const onChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const user = { role: 'user', text: chatInput.trim() };
    setChatHistory(h => [...h, user]);
    setChatInput('');
    setChatLoading(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/feedback-chat',
        `${basePath}/.netlify/functions/feedback-chat`,
        '/api/feedback-chat',
        `${basePath}/api/feedback-chat`,
      ]));
      let data = null; let lastErr = '';
      for (const u of urls) {
        try { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: user.text }) }); if (r.ok) { data = await r.json(); break; } else lastErr = `HTTP ${r.status}`; } catch (e) { lastErr = e?.message || 'Network'; }
      }
      const reply = data?.reply || 'No reply';
      setChatHistory(h => [...h, { role: 'ai', text: reply }]);
    } catch (err) {
      setChatHistory(h => [...h, { role: 'ai', text: 'Error processing your request.' }]);
    } finally { setChatLoading(false); }
  };

  // auto scroll on new chat
  useEffect(()=>{ try { const el = viewport.current; if (el) el.scrollTop = el.scrollHeight; } catch {} }, [chatHistory, chatLoading]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-cyan-200 font-semibold">Messages</h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchRows} className="text-xs px-2 py-1 rounded-md border border-white/10 hover:bg-white/5">Reload Messages</button>
          <button onClick={loadFeedbacks} className="text-xs px-2 py-1 rounded-md border border-white/10 hover:bg-white/5">Reload Feedbacks</button>
        </div>
      </div>
      {loading && <div className="text-sm text-gray-400">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
      <div className="grid gap-3">
        {rows.map(r => {
          const CATEGORY_MAP = {
            general: { label: 'General Inquiry', color: 'bg-slate-500/20 border-slate-400/40 text-slate-200' },
            collaboration: { label: 'Collaboration', color: 'bg-purple-500/20 border-purple-400/40 text-purple-200' },
            feedback: { label: 'Feedback', color: 'bg-blue-500/20 border-blue-400/40 text-blue-200' },
            business: { label: 'Business', color: 'bg-amber-500/20 border-amber-400/40 text-amber-200' },
            technical: { label: 'Technical', color: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200' },
            other: { label: 'Other', color: 'bg-gray-500/20 border-gray-400/40 text-gray-200' },
          };
          const PRIORITY_MAP = {
            low: { label: 'Low', color: 'bg-gray-500/20 border-gray-400/40 text-gray-200' },
            normal: { label: 'Normal', color: 'bg-green-500/20 border-green-400/40 text-green-200' },
            high: { label: 'High', color: 'bg-orange-500/20 border-orange-400/40 text-orange-200' },
            urgent: { label: 'Urgent', color: 'bg-red-500/20 border-red-400/40 text-red-200' },
          };
          const cat = CATEGORY_MAP[r.category] || CATEGORY_MAP.general;
          const pri = PRIORITY_MAP[r.priority] || PRIORITY_MAP.normal;
          
          return (
            <motion.div 
              key={r.id} 
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/10 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm p-4 hover:border-cyan-400/30 transition-all duration-300"
            >
              {/* Header with timestamp and badges */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-gray-400">
                    {(() => {
                      const iso = r.created_at || r.createdAt || r.timestamp;
                      const d = iso ? new Date(iso) : null;
                      const valid = d && !isNaN(d.getTime());
                      return valid ? d.toLocaleString() : '-';
                    })()}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cat.color} font-medium`}>
                    {cat.label}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${pri.color} font-medium`}>
                    {pri.label}
                  </span>
                </div>
              </div>

              {/* Sender info */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-cyan-400/30 flex items-center justify-center">
                  <svg className="h-5 w-5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-cyan-200">{r.initials || 'Anonymous'}</span>
                    {r.instagram && r.instagram !== '-' && (
                      <a 
                        href={`https://instagram.com/${r.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-fuchsia-300 transition-colors"
                      >
                        {r.instagram}
                      </a>
                    )}
                  </div>
                  {r.email && r.email !== '-' && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{r.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Message content */}
              <div className="rounded-lg bg-black/40 border border-white/5 p-3 mb-3">
                <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {r.message}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <button 
                  onClick={() => onDelete(r.id)} 
                  disabled={busyId===r.id} 
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-400/40 bg-red-600/20 text-red-100 hover:bg-red-600/30 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)] disabled:opacity-60 disabled:cursor-wait transition-all duration-300"
                >
                  {busyId===r.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          );
        })}
        {!loading && !error && rows.length === 0 && (
          <div className="text-sm text-gray-400">No messages yet.</div>
        )}
      </div>

      {/* Feedbacks Section */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-cyan-200 font-semibold">User Feedbacks</div>
          <div className="flex items-center gap-2">
            <button onClick={onSummarize} disabled={summLoading || fbLoading} className={`text-xs px-2 py-1 rounded-md border border-cyan-400/30 ${summLoading?'opacity-70 cursor-wait':'hover:shadow-[0_0_14px_rgba(34,211,238,0.25)]'} bg-cyan-500/10 text-cyan-200`}>{summLoading?'Summarizing…':'Summarize Feedback'}</button>
            <button onClick={()=>setChatOpen(v=>!v)} className="text-xs px-2 py-1 rounded-md border border-white/10 hover:bg-white/5">{chatOpen?'Hide':'Open'} Feedback Chat</button>
          </div>
        </div>
        {fbLoading && <div className="text-sm text-gray-400 mt-2">Loading feedbacks…</div>}
        {fbError && <div className="text-sm text-red-400 mt-2">{fbError}</div>}
        <div className="mt-2 grid gap-2 max-h-64 overflow-auto pr-1">
          {feedbacks.map((f)=> (
            <div key={f.id || f.created_at} className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="text-[11px] text-gray-400">{f.created_at ? new Date(f.created_at).toLocaleString() : '-'}</div>
              <div className="text-sm text-gray-100 whitespace-pre-wrap">{f.userMessage || f.message}</div>
            </div>
          ))}
          {!fbLoading && !fbError && feedbacks.length===0 && (
            <div className="text-sm text-gray-400">No feedbacks yet.</div>
          )}
        </div>

        {/* Summary card */}
        <AnimatePresence>
          {summary && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-4 rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.18)]">
              <div className="text-xs text-cyan-200 mb-1">Gemini Summary</div>
              <div className="overflow-x-auto">
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
                  blockquote: ({node, ...props}) => (
                    <blockquote {...props} className="border-l-2 border-cyan-400/40 bg-black/30 p-2 pl-3 rounded-r-md italic text-gray-200" />
                  ),
                  h1: ({node, ...props}) => (
                    <h1 {...props} className="text-base font-semibold text-white mt-1 mb-1" />
                  ),
                  h2: ({node, ...props}) => (
                    <h2 {...props} className="text-[15px] font-semibold text-white mt-1 mb-1" />
                  ),
                  h3: ({node, ...props}) => (
                    <h3 {...props} className="text-sm font-semibold text-white mt-1 mb-1" />
                  ),
                  ul: ({node, ...props}) => (
                    <ul {...props} className="list-disc pl-5 my-1 space-y-1" />
                  ),
                  ol: ({node, ...props}) => (
                    <ol {...props} className="list-decimal pl-5 my-1 space-y-1" />
                  ),
                  code: ({inline, className, children, ...props}) => (
                    <code {...props} className={`rounded px-1 py-0.5 bg-black/40 border border-white/10 ${className||''}`}>{children}</code>
                  ),
                  table: ({node, ...props}) => (
                    <table {...props} className="min-w-[480px] w-full text-left border-collapse text-gray-100" />
                  ),
                  thead: ({node, ...props}) => (
                    <thead {...props} className="bg-white/5" />
                  ),
                  th: ({node, ...props}) => (
                    <th {...props} className="px-3 py-2 text-xs font-semibold border-b border-white/10" />
                  ),
                  td: ({node, ...props}) => (
                    <td {...props} className="px-3 py-2 text-xs border-b border-white/10" />
                  ),
                  tr: ({node, ...props}) => (
                    <tr {...props} className="odd:bg-white/[0.02] hover:bg-white/[0.04] transition-colors" />
                  )
                }}
              >
                {summary}
              </ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Chat */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-3 rounded-xl border border-white/10 bg-black/60 overflow-hidden">
              <div className="p-2 text-xs text-gray-400 border-b border-white/10">Ask things like: “Summarize feedback” or “Show me positive vs negative feedback”.</div>
              <div ref={viewport} className="max-h-52 overflow-auto p-3 space-y-2">
                {chatHistory.map((m,i)=> (
                  <div key={i} className={`max-w-[90%] ${m.role==='user'?'ml-auto':''}`}>
                    {m.role==='user' ? (
                      <div className="rounded-2xl px-3 py-2 text-sm border bg-cyan-500/10 border-cyan-400/30 text-cyan-100">{m.text}</div>
                    ) : (
                      <div className="rounded-2xl px-3 py-2 text-sm border bg-white/5 border-white/10 text-gray-100 overflow-x-auto">
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
                            blockquote: ({node, ...props}) => (
                              <blockquote {...props} className="border-l-2 border-cyan-400/40 bg-black/30 p-2 pl-3 rounded-r-md italic text-gray-200" />
                            ),
                            h1: ({node, ...props}) => (
                              <h1 {...props} className="text-base font-semibold text-white mt-1 mb-1" />
                            ),
                            h2: ({node, ...props}) => (
                              <h2 {...props} className="text-[15px] font-semibold text-white mt-1 mb-1" />
                            ),
                            h3: ({node, ...props}) => (
                              <h3 {...props} className="text-sm font-semibold text-white mt-1 mb-1" />
                            ),
                            ul: ({node, ...props}) => (
                              <ul {...props} className="list-disc pl-5 my-1 space-y-1" />
                            ),
                            ol: ({node, ...props}) => (
                              <ol {...props} className="list-decimal pl-5 my-1 space-y-1" />
                            ),
                            code: ({inline, className, children, ...props}) => (
                              <code {...props} className={`rounded px-1 py-0.5 bg-black/40 border border-white/10 ${className||''}`}>{children}</code>
                            ),
                            table: ({node, ...props}) => (
                              <table {...props} className="min-w-[480px] w-full text-left border-collapse text-gray-100" />
                            ),
                            thead: ({node, ...props}) => (
                              <thead {...props} className="bg-white/5" />
                            ),
                            th: ({node, ...props}) => (
                              <th {...props} className="px-3 py-2 text-xs font-semibold border-b border-white/10" />
                            ),
                            td: ({node, ...props}) => (
                              <td {...props} className="px-3 py-2 text-xs border-b border-white/10" />
                            ),
                            tr: ({node, ...props}) => (
                              <tr {...props} className="odd:bg-white/[0.02] hover:bg-white/[0.04] transition-colors" />
                            )
                          }}
                        >
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="text-xs text-gray-400">Thinking…</div>
                )}
              </div>
              <form onSubmit={onChatSubmit} className="flex items-center gap-2 p-2 border-t border-white/10 bg-black/50">
                <input value={chatInput} onChange={(e)=>setChatInput(e.target.value)} placeholder="Type a question…" className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30" />
                <button type="submit" disabled={chatLoading || !chatInput.trim()} className={`h-8 px-3 rounded-md border ${chatLoading?'opacity-70 cursor-wait':'hover:shadow-[0_0_14px_rgba(34,211,238,0.25)]'} bg-cyan-500/20 border-cyan-400/30 text-cyan-200`}>Send</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
