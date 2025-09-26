import Head from 'next/head';
import { useEffect, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { supabase } from '../../lib/supabaseClient';

const STATUS_OPTIONS = ['Dalam Review', 'Di Acc', 'Di Tolak'];

export default function AdminSignRequestsPage() {
  const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'documents';
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [adminInput, setAdminInput] = useState('');

  const loadData = async () => {
    setLoading(true); setMessage('');
    try {
      const { data, error } = await supabase
        .from('sign_requests')
        .select('id, email, file_url, status, signed_file_url, created_at, sig_page, sig_anchor, sig_offset_x, sig_offset_y, sig_scale')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage(err?.message || 'Gagal memuat data.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    // Simple admin gate via NEXT_PUBLIC_ADMIN_EMAIL
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('admin-email') : '';
      const adminEnv = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';
      if (saved && adminEnv && saved.toLowerCase() === adminEnv.toLowerCase()) {
        setAuthorized(true);
        loadData();
      }
    } catch {}
  }, []);

  const updateStatus = async (id, status) => {
    setMessage('');
    try {
      const { error } = await supabase.from('sign_requests').update({ status }).eq('id', id);
      if (error) throw error;
      setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      setMessage('Status diperbarui.');
    } catch (err) { setMessage(err?.message || 'Gagal memperbarui status.'); }
  };

  const [openId, setOpenId] = useState(null);

  const DEFAULT_LAYOUT = {
    sig_page: 1,
    sig_anchor: 'bottom-right',
    sig_offset_x: 24,
    sig_offset_y: 24,
    sig_scale: 0.35,
  };

  const saveLayout = async (row) => {
    setMessage('');
    try {
      const payload = {
        sig_page: row.sig_page ?? null,
        sig_anchor: row.sig_anchor ?? null,
        sig_offset_x: row.sig_offset_x ?? null,
        sig_offset_y: row.sig_offset_y ?? null,
        sig_scale: row.sig_scale ?? null,
      };
      const { error } = await supabase
        .from('sign_requests')
        .update(payload)
        .eq('id', row.id);
      if (error) throw error;
      setMessage('Layout disimpan.');
    } catch (err) {
      setMessage(err?.message || 'Gagal menyimpan layout.');
    }
  };

  const handleLayoutChange = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const resetLayout = (id) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...DEFAULT_LAYOUT } : r));
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const signAndUpload = async (row) => {
    setMessage('');
    try {
      if (!row?.file_url) throw new Error('File URL tidak tersedia.');
      // Fetch original PDF
      const pdfRes = await fetch(row.file_url);
      if (!pdfRes.ok) throw new Error('Gagal mengambil PDF untuk ditandatangani.');
      const pdfBytes = await pdfRes.arrayBuffer();

      // Load PDF in pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      if (!pages || pages.length === 0) throw new Error('PDF tidak memiliki halaman.');

      // Determine target page (1-based)
      const targetPageIndex = (() => {
        const p = Number(row?.sig_page ?? DEFAULT_LAYOUT.sig_page);
        if (!Number.isFinite(p) || p < 1) return 0;
        return Math.min(pages.length - 1, p - 1);
      })();
      const page = pages[targetPageIndex];

      // Fetch signature image (PNG) from public directory
      const sigRes = await fetch('/signature.png');
      if (!sigRes.ok) throw new Error('Gagal memuat signature.png');
      const sigBytes = await sigRes.arrayBuffer();
      const sigImage = await pdfDoc.embedPng(sigBytes);
      const scale = Number(row?.sig_scale ?? DEFAULT_LAYOUT.sig_scale);
      const sigDims = sigImage.scale(Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_LAYOUT.sig_scale);

      const { width: pageW, height: pageH } = page.getSize();
      const anchor = (row?.sig_anchor || DEFAULT_LAYOUT.sig_anchor).toLowerCase();
      const offX = Number(row?.sig_offset_x ?? DEFAULT_LAYOUT.sig_offset_x);
      const offY = Number(row?.sig_offset_y ?? DEFAULT_LAYOUT.sig_offset_y);
      const dx = Number.isFinite(offX) ? offX : DEFAULT_LAYOUT.sig_offset_x;
      const dy = Number.isFinite(offY) ? offY : DEFAULT_LAYOUT.sig_offset_y;

      let x = 0, y = 0;
      switch (anchor) {
        case 'bottom-left':
          x = dx; y = dy; break;
        case 'top-left':
          x = dx; y = pageH - sigDims.height - dy; break;
        case 'top-right':
          x = pageW - sigDims.width - dx; y = pageH - sigDims.height - dy; break;
        case 'bottom-right':
        default:
          x = pageW - sigDims.width - dx; y = dy; break;
      }

      // Clamp within page
      x = clamp(x, 0, Math.max(0, pageW - sigDims.width));
      y = clamp(y, 0, Math.max(0, pageH - sigDims.height));

      page.drawImage(sigImage, {
        x,
        y,
        width: sigDims.width,
        height: sigDims.height,
        opacity: 0.95,
      });

      const signedBytes = await pdfDoc.save();
      const blob = new Blob([signedBytes], { type: 'application/pdf' });

      // Upload to Supabase Storage under signed_documents folder
      const signedPath = `signed_documents/${Date.now()}_${row.id || Math.random().toString(36).slice(2)}.pdf`;
      const { data: up, error: upErr } = await supabase.storage.from(BUCKET).upload(signedPath, blob, {
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
      const signedUrl = urlData?.publicUrl || null;
      if (!signedUrl) throw new Error('Gagal mendapatkan URL publik dokumen tertandatangani.');

      // Update row: signed_file_url and mark as Di Acc
      const { error: updErr } = await supabase
        .from('sign_requests')
        .update({ signed_file_url: signedUrl, status: 'Di Acc' })
        .eq('id', row.id);
      if (updErr) throw updErr;

      setRows(prev => prev.map(r => r.id === row.id ? { ...r, signed_file_url: signedUrl, status: 'Di Acc' } : r));
      setMessage('Dokumen berhasil ditandatangani dan diunggah.');
    } catch (err) {
      setMessage(err?.message || 'Gagal menandatangani dan mengunggah dokumen.');
    }
  };

  const badgeClass = (status) => {
    if (status === 'Di Acc') return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30';
    if (status === 'Di Tolak') return 'bg-rose-500/20 text-rose-200 border-rose-400/30';
    return 'bg-amber-500/20 text-amber-200 border-amber-400/30';
  };

  const handleAuth = (e) => {
    e.preventDefault();
    const adminEnv = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';
    if (adminInput && adminEnv && adminInput.toLowerCase() === adminEnv.toLowerCase()) {
      try { window.localStorage.setItem('admin-email', adminInput); } catch {}
      setAuthorized(true);
      loadData();
    } else {
      setMessage('Email admin tidak cocok.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f14] text-gray-100">
      <Head>
        <title>Admin — Sign Requests</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {!authorized && (
          <div className="max-w-md mx-auto mb-6 rounded-2xl border border-white/10 bg-black/70 p-5">
            <h2 className="text-lg font-semibold">Admin Login</h2>
            <p className="text-xs text-gray-400 mt-1">Masukkan email admin untuk mengakses halaman ini.</p>
            <form onSubmit={handleAuth} className="mt-3 flex items-center gap-2">
              <input type="email" value={adminInput} onChange={(e)=>setAdminInput(e.target.value)} placeholder="admin@example.com" className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/40" />
              <button type="submit" className="px-3 py-2 rounded-lg border bg-cyan-500/20 border-cyan-400/30 text-cyan-200 text-sm">Enter</button>
            </form>
            {message && <div className="mt-3 text-xs text-amber-300/90">{message}</div>}
          </div>
        )}
        {authorized && (
          <>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Sign Requests</h1>
              <button onClick={loadData} disabled={loading} className="ml-auto text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">{loading ? 'Refreshing…' : 'Refresh'}</button>
            </div>
            <p className="text-sm text-gray-300 mt-1">Kelola pengajuan tanda tangan dokumen PDF.</p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/70">
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-[11px] text-gray-400 border-b border-white/10">
                <div className="col-span-3">Email</div>
                <div className="col-span-3">Dokumen</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Diajukan</div>
                <div className="col-span-2 text-right">Aksi</div>
              </div>
              <div className="divide-y divide-white/10">
                {rows.length === 0 && (
                  <div className="p-4 text-xs text-gray-400">Belum ada data.</div>
                )}
                {rows.map(r => (
                  <div key={r.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-3 min-w-0">
                      <div className="text-sm text-gray-300 truncate">{r.email}</div>
                    </div>
                    <div className="md:col-span-3">
                      <div className="text-sm">
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
                    </div>
                    <div className="md:col-span-2">
                      <span className={`inline-flex items-center text-[11px] px-2 py-1 rounded-md border ${badgeClass(r.status)}`}>{r.status || 'Dalam Review'}</span>
                    </div>
                    <div className="md:col-span-2 text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</div>
                    <div className="md:col-span-2 md:text-right flex md:justify-end gap-2">
                      <button onClick={()=>updateStatus(r.id, 'Di Acc')} className="text-[11px] px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/20">Acc</button>
                      <button onClick={()=>updateStatus(r.id, 'Di Tolak')} className="text-[11px] px-2 py-1 rounded-md bg-rose-500/15 border border-rose-400/30 text-rose-200 hover:bg-rose-500/20">Tolak</button>
                      <button onClick={()=>setOpenId(openId === r.id ? null : r.id)} className="text-[11px] px-2 py-1 rounded-md bg-white/10 border border-white/15 text-gray-200 hover:bg-white/15">Layout</button>
                      <button onClick={()=>signAndUpload(r)} className="text-[11px] px-2 py-1 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/20">Sign & Upload</button>
                    </div>
                    {openId === r.id && (
                      <div className="md:col-span-12 mt-3 p-3 rounded-lg bg-white/5 border border-white/10 grid grid-cols-2 md:grid-cols-6 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-400">Page</label>
                          <input type="number" min={1} value={r.sig_page ?? ''} onChange={(e)=>handleLayoutChange(r.id, 'sig_page', e.target.value === '' ? null : parseInt(e.target.value,10))} className="w-full rounded-md bg-black/40 border border-white/10 px-2 py-1 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400">Anchor</label>
                          <select value={r.sig_anchor ?? 'bottom-right'} onChange={(e)=>handleLayoutChange(r.id, 'sig_anchor', e.target.value)} className="w-full rounded-md bg-black/40 border border-white/10 px-2 py-1 text-xs">
                            <option value="bottom-right">bottom-right</option>
                            <option value="bottom-left">bottom-left</option>
                            <option value="top-right">top-right</option>
                            <option value="top-left">top-left</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400">Offset X</label>
                          <input type="number" step="1" value={r.sig_offset_x ?? ''} onChange={(e)=>handleLayoutChange(r.id, 'sig_offset_x', e.target.value === '' ? null : Number(e.target.value))} className="w-full rounded-md bg-black/40 border border-white/10 px-2 py-1 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400">Offset Y</label>
                          <input type="number" step="1" value={r.sig_offset_y ?? ''} onChange={(e)=>handleLayoutChange(r.id, 'sig_offset_y', e.target.value === '' ? null : Number(e.target.value))} className="w-full rounded-md bg-black/40 border border-white/10 px-2 py-1 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400">Scale</label>
                          <input type="number" step="0.05" min="0.05" value={r.sig_scale ?? ''} onChange={(e)=>handleLayoutChange(r.id, 'sig_scale', e.target.value === '' ? null : Number(e.target.value))} className="w-full rounded-md bg-black/40 border border-white/10 px-2 py-1 text-xs" />
                        </div>
                        <div className="flex items-end gap-2">
                          <button onClick={()=>saveLayout(r)} className="text-[11px] px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-200">Save</button>
                          <button onClick={()=>resetLayout(r.id)} className="text-[11px] px-2 py-1 rounded-md bg-white/10 border border-white/15 text-gray-200">Defaults</button>
                        </div>
                        <div className="col-span-2 md:col-span-6 text-[10px] text-gray-400">Tip: Offset dihitung dari sudut sesuai Anchor (dalam satuan PDF points). Page mulai dari 1. Scale contoh: 0.35.</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {message && <div className="mt-3 text-xs text-amber-300/90">{message}</div>}
          </>
        )}
      </div>
    </div>
  );
}
