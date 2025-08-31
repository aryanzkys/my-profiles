"use client";
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
      <div className="grid gap-2">
        {rows.map(r => (
          <div key={r.id} className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-[11px] text-gray-400">
              {(() => {
                const iso = r.created_at || r.createdAt;
                const d = iso ? new Date(iso) : null;
                const valid = d && !isNaN(d.getTime());
                return valid ? d.toLocaleString() : '-';
              })()}
            </div>
            <div className="text-sm text-cyan-200">{r.initials} <span className="text-gray-400">{r.instagram}</span></div>
            <div className="text-gray-200 text-sm whitespace-pre-wrap">{r.message}</div>
            <div className="mt-2 flex justify-end">
              <button onClick={() => onDelete(r.id)} disabled={busyId===r.id} className="text-xs px-2 py-1 rounded-md border border-red-400/40 bg-red-600/20 text-red-100 hover:bg-red-600/30 disabled:opacity-60">{busyId===r.id?'Deleting…':'Delete'}</button>
            </div>
          </div>
        ))}
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
              <div className="whitespace-pre-wrap">{summary}</div>
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
                    <div className={`rounded-2xl px-3 py-2 text-sm border ${m.role==='user'?'bg-cyan-500/10 border-cyan-400/30 text-cyan-100':'bg-white/5 border-white/10 text-gray-100'}`}>{m.text}</div>
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
