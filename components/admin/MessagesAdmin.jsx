"use client";
import { useEffect, useState } from 'react';

export default function MessagesAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-cyan-200 font-semibold">Messages</h3>
        <button onClick={fetchRows} className="text-xs px-2 py-1 rounded-md border border-white/10 hover:bg-white/5">Reload</button>
      </div>
      {loading && <div className="text-sm text-gray-400">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
      <div className="grid gap-2">
        {rows.map(r => (
          <div key={r.id} className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleString()}</div>
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
    </div>
  );
}
