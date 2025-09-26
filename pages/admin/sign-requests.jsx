import Head from 'next/head';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const STATUS_OPTIONS = ['Dalam Review', 'Di Acc', 'Di Tolak'];

export default function AdminSignRequestsPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true); setMessage('');
    try {
      const { data, error } = await supabase
        .from('sign_requests')
        .select('id, email, file_url, status, signed_file_url, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage(err?.message || 'Gagal memuat data.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const updateStatus = async (id, status) => {
    setMessage('');
    try {
      const { error } = await supabase.from('sign_requests').update({ status }).eq('id', id);
      if (error) throw error;
      setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      setMessage('Status diperbarui.');
    } catch (err) { setMessage(err?.message || 'Gagal memperbarui status.'); }
  };

  return (
    <div className="min-h-screen bg-[#0a0f14] text-gray-100">
      <Head>
        <title>Admin — Sign Requests</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Sign Requests</h1>
          <button onClick={loadData} disabled={loading} className="ml-auto text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
        <p className="text-sm text-gray-300 mt-1">Kelola pengajuan tanda tangan dokumen PDF.</p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/70">
          <div className="divide-y divide-white/10">
            {rows.length === 0 && (
              <div className="p-4 text-xs text-gray-400">Belum ada data.</div>
            )}
            {rows.map(r => (
              <div key={r.id} className="p-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="text-gray-300">{r.email}</span>
                    <span className="text-gray-500"> • </span>
                    {r.file_url ? (
                      <a href={r.file_url} target="_blank" rel="noreferrer" className="underline decoration-cyan-400/40 hover:decoration-cyan-300">Dokumen</a>
                    ) : 'Dokumen'}
                    {r.signed_file_url && (
                      <>
                        <span className="text-gray-500"> • </span>
                        <a href={r.signed_file_url} target="_blank" rel="noreferrer" className="underline decoration-emerald-400/40 hover:decoration-emerald-300">Signed</a>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Diajukan: {new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <select value={r.status || 'Dalam Review'} onChange={(e)=>updateStatus(r.id, e.target.value)} className="text-xs rounded-md bg-white/5 border border-white/10 px-2 py-1">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {message && <div className="mt-3 text-xs text-amber-300/90">{message}</div>}
      </div>
    </div>
  );
}
