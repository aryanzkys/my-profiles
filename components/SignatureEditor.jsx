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
  const containerRef = useRef(null);
  const canvasesRef = useRef({}); // page -> canvas
  const [layout, setLayout] = useState({
    sig_page: value?.sig_page ?? 1,
    sig_anchor: (value?.sig_anchor || 'bottom-right').toLowerCase(),
    sig_offset_x: Number(value?.sig_offset_x ?? 24),
    sig_offset_y: Number(value?.sig_offset_y ?? 24),
    sig_scale: Number(value?.sig_scale ?? 0.35),
  });

  // Render document
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window !== 'undefined') {
          const VERSION = '3.11.174';
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSION}/build/pdf.worker.min.mjs`;
        }
        const doc = await pdfjsLib.getDocument(fileUrl).promise;
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
          // Render
          setTimeout(async () => {
            try {
              const canvas = canvasesRef.current[i];
              if (!canvas) return;
              canvas.width = Math.floor(scaled.width);
              canvas.height = Math.floor(scaled.height);
              const ctx = canvas.getContext('2d');
              await page.render({ canvasContext: ctx, viewport: scaled }).promise;
            } catch {}
          }, 0);
        }
        if (!cancelled) setPages(results);
      } catch (e) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [fileUrl]);

  useEffect(() => {
    if (value) {
      setLayout({
        sig_page: value.sig_page ?? 1,
        sig_anchor: (value.sig_anchor || 'bottom-right').toLowerCase(),
        sig_offset_x: Number(value.sig_offset_x ?? 24),
        sig_offset_y: Number(value.sig_offset_y ?? 24),
        sig_scale: Number(value.sig_scale ?? 0.35),
      });
      setSelected(Number(value.sig_page ?? 1));
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

  // Approximate signature box size in PDF units for preview (independent from real image size)
  const sigWidthPdf = () => 180; // points
  const sigHeightPdf = () => 60; // points

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

  const onDrag = (e) => {
    if (!dragging) return;
    const page = layout.sig_page || 1;
    const p = pages.find(p => p.num === page);
    if (!p) return;
    const rect = canvasesRef.current[page]?.getBoundingClientRect();
    if (!rect) return;
    // Position center-aligned drag (assume cursor at center of box)
    let px = e.clientX - rect.left - (sigWidthPdf() * p.scale) / 2;
    let py = e.clientY - rect.top - (sigHeightPdf() * p.scale) / 2;
    // Clamp within canvas
    const maxX = p.canvasW - sigWidthPdf() * p.scale;
    const maxY = p.canvasH - sigHeightPdf() * p.scale;
    px = clamp(px, 0, maxX);
    py = clamp(py, 0, maxY);
    // Convert back to offsets w.r.t anchor
    const a = (layout.sig_anchor || 'bottom-right').toLowerCase();
    // Convert pixel to PDF units position of bottom-left corner of box
    const xPdf = px / p.scale;
    const yPdfBottom = (p.canvasH - (py + sigHeightPdf() * p.scale)) / p.scale; // distance from bottom
    // Compute offsets from anchor
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

  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', up);
    };
  }, [onDrag]);

  const rect = getSigRectPixel();

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex flex-col">
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
      <div ref={containerRef} className="flex-1 overflow-auto p-4 space-y-6">
        {pages.map(p => (
          <div key={p.num} className={`relative mx-auto border ${p.num===selected?'border-cyan-400/40':'border-white/10'} rounded-md w-fit`} onClick={()=>{ setVal({ sig_page: p.num }); setSelected(p.num); }}>
            <div className="absolute -top-3 left-2 text-[11px] px-2 py-0.5 rounded bg-black/70 border border-white/10">Page {p.num}</div>
            <canvas ref={el => { canvasesRef.current[p.num] = el; }} width={p.canvasW} height={p.canvasH} />
            {layout.sig_page === p.num && (
              <div
                className="absolute cursor-move rounded-md border border-cyan-400/60 bg-cyan-500/25"
                style={{ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.w}px`, height: `${rect.h}px` }}
                onMouseDown={()=> setDragging(true)}
                title="Drag untuk memindahkan"
              />
            )}
          </div>
        ))}
        {pages.length === 0 && (
          <div className="text-sm text-gray-300">Memuat dokumen…</div>
        )}
      </div>
    </div>
  );
}
