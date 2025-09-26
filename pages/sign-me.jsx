import Head from 'next/head';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function SignMePage() {
  const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'documents';
  const [email, setEmail] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [statusResults, setStatusResults] = useState([]);
  const [checking, setChecking] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) { setFile(null); return; }
    if (f.type !== 'application/pdf') {
      setMessage('Hanya file PDF yang diperbolehkan.');
      e.target.value = '';
      setFile(null);
      return;
    }
    setMessage('');
    setFile(f);
  };

  const uploadDocument = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('Masukkan email yang valid.');
      return;
    }
    if (!file) {
      setMessage('Pilih file PDF terlebih dahulu.');
      return;
    }
    if (!supabase) {
      setMessage('Konfigurasi Supabase belum tersedia.');
      return;
    }
    setUploading(true);
    try {
      const ext = 'pdf';
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        contentType: 'application/pdf',
        upsert: false,
      });
      if (upErr) {
        if ((upErr?.message || '').toLowerCase().includes('bucket') || upErr?.statusCode === '404') {
          throw new Error(`Bucket '${BUCKET}' tidak ditemukan. Buat bucket di Supabase Storage terlebih dahulu.`);
        }
        throw upErr;
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(up.path);
      const file_url = urlData?.publicUrl || null;

      const { data: insertData, error: insertErr } = await supabase
        .from('sign_requests')
        .insert({ email, file_url, status: 'Dalam Review' })
        .select();
      if (insertErr) {
        const msg = insertErr?.message || '';
        if (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('sign_requests')) {
          throw new Error("Tabel 'sign_requests' belum dibuat. Jalankan migrasi untuk membuat tabel.");
        }
        throw insertErr;
      }

      setMessage('Berhasil mengunggah dokumen. Silakan cek status secara berkala.');
      setFile(null);
      try { (document.getElementById('pdfInput')).value = ''; } catch {}
    } catch (err) {
      setMessage(err?.message || 'Gagal mengunggah.');
    } finally { setUploading(false); }
  };

  const checkStatus = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('Masukkan email yang valid untuk cek status.');
      return;
    }
    if (!supabase) {
      setMessage('Konfigurasi Supabase belum tersedia.');
      return;
    }
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('sign_requests')
        .select('id, email, file_url, status, signed_file_url, created_at')
        .eq('email', email)
        .order('created_at', { ascending: false });
      if (error) {
        const msg = error?.message || '';
        if (msg.toLowerCase().includes('could not find the table') || (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('sign_requests'))) {
          throw new Error("Tabel 'sign_requests' belum dibuat. Jalankan migrasi untuk membuat tabel.");
        }
        throw error;
      }
      setStatusResults(Array.isArray(data) ? data : []);
      if (!data || data.length === 0) setMessage('Tidak ada pengajuan ditemukan untuk email ini.');
    } catch (err) {
      setMessage(err?.message || 'Gagal mengambil status.');
    } finally { setChecking(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0f14] text-gray-100">
      <Head>
        <title>Sign Me — Request Tanda Tangan</title>
        <meta name="robots" content="index, follow" />
        <meta name="description" content="Ajukan permintaan tanda tangan dokumen (PDF) oleh Aryan. Unggah PDF dan pantau statusnya." />
      </Head>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold">Request Tanda Tangan</h1>
        <p className="text-sm text-gray-300 mt-1">Unggah file PDF dan masukkan email untuk diajukan ke Aryan.</p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/70 p-5">
          <form onSubmit={uploadDocument} className="space-y-4">
            <div>
              <label className="text-sm">Email</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required placeholder="you@example.com" className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/40" />
            </div>
            <div>
              <label className="text-sm">File PDF</label>
              <input id="pdfInput" type="file" accept="application/pdf" onChange={handleFileChange} className="mt-1 w-full rounded-lg border border-dashed border-white/15 bg-white/5 px-3 py-2 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Hanya menerima file PDF.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={uploading} className="px-3 py-2 rounded-lg border bg-cyan-500/20 border-cyan-400/30 text-cyan-200 text-sm disabled:opacity-60">{uploading ? 'Mengunggah…' : 'Kirim Permintaan'}</button>
            </div>
          </form>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/70 p-5">
          <h2 className="text-lg font-semibold">Cek Status</h2>
          <form onSubmit={checkStatus} className="mt-3 flex items-center gap-2">
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/40" />
            <button type="submit" disabled={checking} className="px-3 py-2 rounded-lg border bg-white/5 border-white/10 text-gray-200 text-sm disabled:opacity-60">{checking ? 'Memeriksa…' : 'Cek'}</button>
          </form>

          {statusResults.length > 0 && (
            <div className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10">
              {statusResults.map((row) => (
                <div key={row.id} className="p-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-100">{row.file_url ? <a href={row.file_url} target="_blank" rel="noreferrer" className="underline decoration-cyan-400/40 hover:decoration-cyan-300">File yang diajukan</a> : 'File diajukan'}</div>
                    <div className="text-xs text-gray-400">Diajukan: {new Date(row.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: row.status === 'Di Acc' ? 'rgba(74,222,128,0.35)' : row.status === 'Di Tolak' ? 'rgba(248,113,113,0.35)' : 'rgba(148,163,184,0.35)' }}>
                    {row.status || 'Dalam Review'}
                  </div>
                  {row.signed_file_url && (
                    <a href={row.signed_file_url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-200">Download Signed</a>
                  )}
                </div>
              ))}
            </div>
          )}

          {message && <div className="mt-3 text-xs text-amber-300/90">{message}</div>}
        </div>
      </div>
    </div>
  );
}
