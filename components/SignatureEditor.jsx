import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import * as pdfjsLib from 'pdfjs-dist';

// Full-screen multi-page PDF editor for signature placement.
// Props:
// - fileUrl: string
// - value: { sig_page, sig_anchor, sig_offset_x, sig_offset_y, sig_scale }
// - onChange: (val) => void  // live changes (optional)
// - onSave: (val) => void    // persist
// - onClose: () => void
export default function SignatureEditor({ fileUrl, value, onChange, onSave, onClose }) {
  const [pages, setPages] = useState([]); // {num, width, height, canvasW, canvasH, scale}
  const [selected, setSelected] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ pointerId: null, grabDx: 0, grabDy: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const containerRef = useRef(null);
  const canvasesRef = useRef({}); // page -> canvas
  const docRef = useRef(null); // hold loaded pdf.js document for rendering after canvases mount
  const [layout, setLayout] = useState({
    sig_page: value?.sig_page ?? 1,
    sig_anchor: (value?.sig_anchor || 'bottom-right').toLowerCase(),
    sig_offset_x: Number(value?.sig_offset_x ?? 24),
    sig_offset_y: Number(value?.sig_offset_y ?? 24),
    sig_scale: Number(value?.sig_scale ?? 0.35),
  });

  // Load actual signature image size to reflect real embed size with scale
  const [sigBase, setSigBase] = useState({ w: 180, h: 60 });
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setSigBase({ w: img.naturalWidth, h: img.naturalHeight });
      }
    };
    img.src = '/signature.png';
  }, []);

  // Load document and compute page sizes; render happens in a separate effect after canvases mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError('');
        setLoading(true);
        if (typeof window !== 'undefined') {
          const VERSION = '3.11.174';
          // Use classic worker JS to avoid module worker issues in static hosting
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSION}/build/pdf.worker.min.js`;
        }
        // Fetch PDF as ArrayBuffer to avoid cross-origin fetch inside worker
        const res = await fetch(fileUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error('Gagal mengambil file PDF.');
        const buf = await res.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;
        docRef.current = doc;
        const pageCount = doc.numPages;
        const results = [];
        for (let i = 1; i <= pageCount; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          // Fit width to ~900px
          const desiredW = Math.min(900, viewport.width);
          const scale = desiredW / viewport.width;
          const scaled = page.getViewport({ scale });
          results.push({ num: i, width: viewport.width, height: viewport.height, canvasW: Math.floor(scaled.width), canvasH: Math.floor(scaled.height), scale });
          if (cancelled) return;
        }
        if (!cancelled) setPages(results);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Gagal memuat dokumen.');
      }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [fileUrl, reloadKey]);

  // Render pages onto canvases after pages state is set and canvases are mounted
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const doc = docRef.current;
        if (!doc || pages.length === 0) return;
        for (const p of pages) {
          if (cancelled) return;
          try {
            const page = await doc.getPage(p.num);
            const viewport = page.getViewport({ scale: p.scale });
            const canvas = canvasesRef.current[p.num];
            if (!canvas) continue;
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
          } catch {}
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [pages]);

  // Block native drag/drop within the editor to avoid accidental navigation/refresh
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDragStart = (e) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); };
    const onMouseDown = (e) => { /* prevent text selection/drag triggers */ e.preventDefault(); };
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('drop', onDrop);
    el.addEventListener('mousedown', onMouseDown);
    return () => {
      el.removeEventListener('dragstart', onDragStart);
      el.removeEventListener('drop', onDrop);
      el.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  const normalizeLayout = (v) => ({
    sig_page: Number(v?.sig_page ?? 1),
    sig_anchor: String(v?.sig_anchor || 'bottom-right').toLowerCase(),
    sig_offset_x: Number(v?.sig_offset_x ?? 24),
    sig_offset_y: Number(v?.sig_offset_y ?? 24),
    sig_scale: Number(v?.sig_scale ?? 0.35),
  });

  useEffect(() => {
    if (!value) return;
    const incoming = normalizeLayout(value);
    const same =
      incoming.sig_page === layout.sig_page &&
      incoming.sig_anchor === layout.sig_anchor &&
      incoming.sig_offset_x === layout.sig_offset_x &&
      incoming.sig_offset_y === layout.sig_offset_y &&
      incoming.sig_scale === layout.sig_scale;
    if (!same) {
      setLayout(incoming);
      setSelected(Number(incoming.sig_page || 1));
    }
  }, [value]);

  const setVal = (patch) => {
    const next = { ...layout, ...patch };
    setLayout(next);
    onChange?.(next);
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const anchorToXY = useCallback((page, sigW, sigH) => {
    const p = pages.find(p => p.num === page);
    if (!p) return { x: 0, y: 0 };
    const dx = Number(layout.sig_offset_x) || 0;
    const dy = Number(layout.sig_offset_y) || 0;
    const a = (layout.sig_anchor || 'bottom-right').toLowerCase();
    let x = 0, y = 0;
    switch (a) {
      case 'bottom-left': x = dx; y = dy; break;
      case 'top-left': x = dx; y = (p.height - sigH) - dy; break;
      case 'top-right': x = (p.width - sigW) - dx; y = (p.height - sigH) - dy; break;
      case 'bottom-right':
      default: x = (p.width - sigW) - dx; y = dy; break;
    }
    return { x, y };
  }, [pages, layout]);

  const toPixel = (page, x, y) => {
    const p = pages.find(p => p.num === page);
    if (!p) return { px: 0, py: 0 };
    return { px: x * p.scale, py: (p.height - y - (sigHeightPdf())) * p.scale };
  };

  // Move current signature by dx/dy in PDF units, clamped to page
  const moveByPdf = (dxPdf, dyPdf) => {
    const page = layout.sig_page || 1;
    const p = pages.find(p => p.num === page);
    if (!p) return;
    const sigW = sigWidthPdf();
    const sigH = sigHeightPdf();
    const cur = anchorToXY(page, sigW, sigH);
    let x = clamp((cur.x || 0) + dxPdf, 0, Math.max(0, p.width - sigW));
    let y = clamp((cur.y || 0) + dyPdf, 0, Math.max(0, p.height - sigH));
    const a = (layout.sig_anchor || 'bottom-right').toLowerCase();
    let offX = 0, offY = 0;
    switch (a) {
      case 'bottom-left': offX = x; offY = y; break;
      case 'top-left': offX = x; offY = (p.height - sigH) - y; break;
      case 'top-right': offX = (p.width - sigW) - x; offY = (p.height - sigH) - y; break;
      case 'bottom-right':
      default: offX = (p.width - sigW) - x; offY = y; break;
    }
    setVal({ sig_offset_x: offX, sig_offset_y: offY });
  };

  // Signature box size in PDF units based on actual image size and chosen scale
  const sigWidthPdf = () => (Number(sigBase.w) || 180) * (Number(layout.sig_scale) || 0.35);
  const sigHeightPdf = () => (Number(sigBase.h) || 60) * (Number(layout.sig_scale) || 0.35);

  const getSigRectPixel = () => {
    const page = layout.sig_page || 1;
    const p = pages.find(p => p.num === page);
    if (!p) return { left: 0, top: 0, w: 0, h: 0 };
    const { x, y } = anchorToXY(page, sigWidthPdf(), sigHeightPdf());
    const left = x * p.scale;
    // PDF y=0 at bottom; canvas y=0 at top; convert:
    const top = (p.height - y - sigHeightPdf()) * p.scale;
    return { left, top, w: sigWidthPdf() * p.scale, h: sigHeightPdf() * p.scale };
  };

  // Pointer drag helpers on the signature handle
  const handlePointerMove = (e) => {
    if (!dragging) return;
    // prevent default to avoid any browser gestures or scroll triggering in Chrome
    e.preventDefault();
    e.stopPropagation();
    const page = layout.sig_page || 1;
    const p = pages.find(p => p.num === page);
    if (!p) return;
    const canvasRect = canvasesRef.current[page]?.getBoundingClientRect();
    if (!canvasRect) return;
    const sigWpx = sigWidthPdf() * p.scale;
    const sigHpx = sigHeightPdf() * p.scale;
    // position top-left by subtracting the grab offset captured on pointerdown
    let px = e.clientX - canvasRect.left - dragRef.current.grabDx;
    let py = e.clientY - canvasRect.top - dragRef.current.grabDy;
    // clamp to keep fully inside canvas
    const maxX = p.canvasW - sigWpx;
    const maxY = p.canvasH - sigHpx;
    px = clamp(px, 0, maxX);
    py = clamp(py, 0, maxY);
    // convert to PDF units (bottom-left origin)
    const xPdf = px / p.scale;
    const yPdfBottom = (p.canvasH - (py + sigHpx)) / p.scale;
    const a = (layout.sig_anchor || 'bottom-right').toLowerCase();
    let dx = 0, dy = 0;
    switch (a) {
      case 'bottom-left':
        dx = xPdf; dy = yPdfBottom; break;
      case 'top-left':
        dx = xPdf; dy = (p.height - sigHeightPdf()) - yPdfBottom; break;
      case 'top-right':
        dx = (p.width - sigWidthPdf()) - xPdf; dy = (p.height - sigHeightPdf()) - yPdfBottom; break;
      case 'bottom-right':
      default:
        dx = (p.width - sigWidthPdf()) - xPdf; dy = yPdfBottom; break;
    }
    setVal({ sig_offset_x: dx, sig_offset_y: dy });
  };

  const rect = getSigRectPixel();

  // Auto-focus container to capture keyboard arrows; also suppress global drag/drop
  useEffect(() => {
    try { containerRef.current?.focus(); } catch {}
    const prevent = (e) => { e.preventDefault(); };
    window.addEventListener('dragstart', prevent, { passive: false });
    window.addEventListener('drop', prevent, { passive: false });
    return () => {
      window.removeEventListener('dragstart', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  const onKeyDown = (e) => {
    const p = pages.find(p => p.num === (layout.sig_page || 1));
    if (!p) return;
    const pxStep = e.shiftKey ? 8 : 2; // pixels step
    const stepPdf = pxStep / (p.scale || 1);
    if (e.key === 'ArrowLeft') { e.preventDefault(); moveByPdf(-stepPdf, 0); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); moveByPdf(stepPdf, 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveByPdf(0, stepPdf); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveByPdf(0, -stepPdf); }
  };

  const stopAll = (e) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex flex-col"
      onContextMenu={stopAll}
      onDragOver={stopAll}
      onDrop={stopAll}
      style={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none', cursor: dragging ? 'grabbing' : 'auto' }}
    >
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/10 bg-[#0b1015]">
        <div className="text-sm font-medium">Atur Posisi Tanda Tangan</div>
        <div className="ml-auto flex items-center gap-3">
          <label className="text-[12px] text-gray-300">Halaman</label>
          <input type="number" min={1} max={pages.length || 1} value={layout.sig_page}
            onChange={(e)=>{ const v = parseInt(e.target.value||'1',10); setVal({ sig_page: clamp(v,1,pages.length||1) }); setSelected(clamp(v,1,pages.length||1)); }}
            className="w-16 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs" />
          <label className="text-[12px] text-gray-300">Anchor</label>
          <select value={layout.sig_anchor}
            onChange={(e)=> setVal({ sig_anchor: e.target.value })}
            className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs">
            <option value="bottom-right">bottom-right</option>
            <option value="bottom-left">bottom-left</option>
            <option value="top-right">top-right</option>
            <option value="top-left">top-left</option>
          </select>
          <label className="text-[12px] text-gray-300">Scale</label>
          <input type="number" step="0.05" min="0.05" max="2" value={layout.sig_scale}
            onChange={(e)=> setVal({ sig_scale: Number(e.target.value || 0.35) })}
            className="w-20 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs" />
          <button onClick={()=> onSave?.(layout)} className="text-[12px] px-3 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-200">Save</button>
          <button onClick={onClose} className="text-[12px] px-3 py-1 rounded-md bg-white/10 border border-white/15 text-gray-200">Close</button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 space-y-6"
        tabIndex={0}
        role="dialog"
        onClick={stopAll}
        onMouseDown={stopAll}
        onMouseUp={stopAll}
        onPointerDown={stopAll}
        onPointerUp={stopAll}
        onKeyDown={onKeyDown}
        style={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
      >
        {error && (
          <div className="max-w-3xl mx-auto p-4 rounded-md border border-rose-400/30 bg-rose-500/10 text-rose-200 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={()=> setReloadKey(k=>k+1)} className="text-[12px] px-2 py-1 rounded-md bg-white/10 border border-white/15 text-gray-100">Retry</button>
          </div>
        )}
        {pages.map(p => (
          <div
            key={p.num}
            className={`relative mx-auto border ${p.num===selected?'border-cyan-400/40':'border-white/10'} rounded-md w-fit`}
            onClick={(e)=>{
              e.preventDefault(); e.stopPropagation();
              if (p.num !== layout.sig_page) { setVal({ sig_page: p.num }); setSelected(p.num); }
            }}
          >
            <div className="absolute -top-3 left-2 text-[11px] px-2 py-0.5 rounded bg-black/70 border border-white/10">Page {p.num}</div>
            <canvas
              ref={el => { canvasesRef.current[p.num] = el; }}
              width={p.canvasW}
              height={p.canvasH}
              draggable={false}
              onDragStart={(e)=> { e.preventDefault(); }}
              onMouseDown={(e)=> { /* prevent default drag/select on canvas */ e.preventDefault(); }}
            />
            {layout.sig_page === p.num && (
              <div
                className="absolute rounded-md border border-cyan-400/60"
                style={{
                  left: `${rect.left}px`,
                  top: `${rect.top}px`,
                  width: `${rect.w}px`,
                  height: `${rect.h}px`,
                  backgroundImage: 'url(/signature.png)',
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  opacity: 0.9,
                  boxShadow: dragging ? '0 8px 24px rgba(34,211,238,0.35), 0 0 0 1px rgba(34,211,238,0.35) inset' : '0 0 0 1px rgba(34,211,238,0.35) inset',
                  cursor: dragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  transform: dragging ? 'scale(1.02)' : 'none',
                  transition: dragging ? 'none' : 'transform 80ms ease-out',
                }}
                draggable={false}
                onDragStart={(e)=> { e.preventDefault(); }}
                onPointerDown={(e)=> {
                  e.preventDefault(); e.stopPropagation();
                  setDragging(true);
                  try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
                  const boxRect = e.currentTarget.getBoundingClientRect();
                  dragRef.current.pointerId = e.pointerId;
                  dragRef.current.grabDx = e.clientX - boxRect.left;
                  dragRef.current.grabDy = e.clientY - boxRect.top;
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={(e)=> { e.preventDefault(); e.stopPropagation(); setDragging(false); try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {} }}
                onPointerCancel={(e)=> { e.preventDefault(); e.stopPropagation(); setDragging(false); try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {} }}
                title="Drag untuk memindahkan"
              />
            )}
          </div>
        ))}
        {pages.length === 0 && !error && (
          <div className="text-sm text-gray-300">{loading ? 'Memuat dokumen…' : 'Tidak ada halaman untuk ditampilkan.'}</div>
        )}
      </div>
    </div>
  );
}
