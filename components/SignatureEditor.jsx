import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Full-screen multi-page PDF editor for signature placement.
// Props:
// - fileUrl: string
// - value: { sig_page, sig_anchor, sig_offset_x, sig_offset_y, sig_scale }
// - onChange: (val) => void  // live changes (optional)
// - onSave: (val) => void    // persist
// - onClose: () => void
export default function SignatureEditor({ fileUrl, value, onChange, onSave, onClose }) {
  const [pages, setPages] = useState([]);
  const [selected, setSelected] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ pointerId: null, grabDx: 0, grabDy: 0 });
  const rafRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const containerRef = useRef(null);
  const canvasesRef = useRef({});
  const docRef = useRef(null);

  const [layout, setLayout] = useState({
    sig_page: value?.sig_page ?? 1,
    sig_anchor: (value?.sig_anchor || 'bottom-right').toLowerCase(),
    sig_offset_x: Number(value?.sig_offset_x ?? 24),
    sig_offset_y: Number(value?.sig_offset_y ?? 24),
    sig_scale: Number(value?.sig_scale ?? 0.35),
  });

  // Signature base size
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

  // Load document metadata
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError('');
        setLoading(true);
        if (typeof window !== 'undefined') {
          const VERSION = '3.11.174';
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSION}/build/pdf.worker.min.js`;
        }
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
          const desiredW = Math.min(900, viewport.width);
          const scale = desiredW / viewport.width;
          const scaled = page.getViewport({ scale });
          results.push({
            num: i,
            width: viewport.width,
            height: viewport.height,
            canvasW: Math.floor(scaled.width),
            canvasH: Math.floor(scaled.height),
            scale,
          });
          if (cancelled) return;
        }
        if (!cancelled) setPages(results);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Gagal memuat dokumen.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, reloadKey]);

  // Render pages ONCE setelah metadata ada (tidak ikut rerender saat drag)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const doc = docRef.current;
        if (!doc || pages.length === 0) return;
        for (const p of pages) {
          if (cancelled) return;
          const page = await doc.getPage(p.num);
          const viewport = page.getViewport({ scale: p.scale });
          const canvas = canvasesRef.current[p.num];
          if (!canvas) continue;
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [pages]);

  // Block native drag/drop
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDragStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onMouseDown = (e) => {
      e.preventDefault();
    };
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

  // Sig size in PDF units
  const sigWidthPdf = () =>
    (Number(sigBase.w) || 180) * (Number(layout.sig_scale) || 0.35);
  const sigHeightPdf = () =>
    (Number(sigBase.h) || 60) * (Number(layout.sig_scale) || 0.35);

  const anchorToXY = useCallback(
    (page, sigW, sigH) => {
      const p = pages.find((p) => p.num === page);
      if (!p) return { x: 0, y: 0 };
      const dx = Number(layout.sig_offset_x) || 0;
      const dy = Number(layout.sig_offset_y) || 0;
      const a = (layout.sig_anchor || 'bottom-right').toLowerCase();
      let x = 0,
        y = 0;
      switch (a) {
        case 'bottom-left':
          x = dx;
          y = dy;
          break;
        case 'top-left':
          x = dx;
          y = p.height - sigH - dy;
          break;
        case 'top-right':
          x = p.width - sigW - dx;
          y = p.height - sigH - dy;
          break;
        case 'bottom-right':
        default:
          x = p.width - sigW - dx;
          y = dy;
          break;
      }
      return { x, y };
    },
    [pages, layout]
  );

  const getSigRectPixel = () => {
    const page = layout.sig_page || 1;
    const p = pages.find((p) => p.num === page);
    if (!p) return { left: 0, top: 0, w: 0, h: 0 };
    const { x, y } = anchorToXY(page, sigWidthPdf(), sigHeightPdf());
    const left = x * p.scale;
    const top = (p.height - y - sigHeightPdf()) * p.scale;
    return {
      left,
      top,
      w: sigWidthPdf() * p.scale,
      h: sigHeightPdf() * p.scale,
    };
  };

  // Smooth drag with RAF
  const handlePointerMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const page = layout.sig_page || 1;
      const p = pages.find((p) => p.num === page);
      if (!p) return;
      const canvasRect = canvasesRef.current[page]?.getBoundingClientRect();
      if (!canvasRect) return;
      const sigWpx = sigWidthPdf() * p.scale;
      const sigHpx = sigHeightPdf() * p.scale;

      let px = e.clientX - canvasRect.left - dragRef.current.grabDx;
      let py = e.clientY - canvasRect.top - dragRef.current.grabDy;

      px = clamp(px, 0, p.canvasW - sigWpx);
      py = clamp(py, 0, p.canvasH - sigHpx);

      const xPdf = px / p.scale;
      const yPdfBottom = (p.canvasH - (py + sigHpx)) / p.scale;

      const a = (layout.sig_anchor || 'bottom-right').toLowerCase();
      let dx = 0,
        dy = 0;
      switch (a) {
        case 'bottom-left':
          dx = xPdf;
          dy = yPdfBottom;
          break;
        case 'top-left':
          dx = xPdf;
          dy = p.height - sigHeightPdf() - yPdfBottom;
          break;
        case 'top-right':
          dx = p.width - sigWidthPdf() - xPdf;
          dy = p.height - sigHeightPdf() - yPdfBottom;
          break;
        case 'bottom-right':
        default:
          dx = p.width - sigWidthPdf() - xPdf;
          dy = yPdfBottom;
          break;
      }
      setVal({ sig_offset_x: dx, sig_offset_y: dy });
    });
  };

  const rect = getSigRectPixel();

  // Auto focus
  useEffect(() => {
    try {
      containerRef.current?.focus();
    } catch {}
  }, []);

  const onKeyDown = (e) => {
    const p = pages.find((p) => p.num === (layout.sig_page || 1));
    if (!p) return;
    const pxStep = e.shiftKey ? 8 : 2;
    const stepPdf = pxStep / (p.scale || 1);
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setVal({ sig_offset_x: layout.sig_offset_x + stepPdf });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setVal({ sig_offset_x: layout.sig_offset_x - stepPdf });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setVal({ sig_offset_y: layout.sig_offset_y + stepPdf });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setVal({ sig_offset_y: layout.sig_offset_y - stepPdf });
    }
  };

  const stopAll = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex flex-col"
      onContextMenu={stopAll}
      onDragOver={stopAll}
      onDrop={stopAll}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        cursor: dragging ? 'grabbing' : 'auto',
      }}
    >
      {/* Toolbar */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/10 bg-[#0b1015]">
        <div className="text-sm font-medium">Atur Posisi Tanda Tangan</div>
        <div className="ml-auto flex items-center gap-3">
          <label className="text-[12px] text-gray-300">Halaman</label>
          <input
            type="number"
            min={1}
            max={pages.length || 1}
            value={layout.sig_page}
            onChange={(e) => {
              const v = parseInt(e.target.value || '1', 10);
              setVal({ sig_page: clamp(v, 1, pages.length || 1) });
              setSelected(clamp(v, 1, pages.length || 1));
            }}
            className="w-16 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs"
          />
          <label className="text-[12px] text-gray-300">Anchor</label>
          <select
            value={layout.sig_anchor}
            onChange={(e) => setVal({ sig_anchor: e.target.value })}
            className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs"
          >
            <option value="bottom-right">bottom-right</option>
            <option value="bottom-left">bottom-left</option>
            <option value="top-right">top-right</option>
            <option value="top-left">top-left</option>
          </select>
          <label className="text-[12px] text-gray-300">Scale</label>
          <input
            type="number"
            step="0.05"
            min="0.05"
            max="2"
            value={layout.sig_scale}
            onChange={(e) =>
              setVal({ sig_scale: Number(e.target.value || 0.35) })
            }
            className="w-20 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs"
          />
          <button
            onClick={() => onSave?.(layout)}
            className="text-[12px] px-3 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-200"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="text-[12px] px-3 py-1 rounded-md bg-white/10 border border-white/15 text-gray-200"
          >
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 space-y-6"
        tabIndex={0}
        role="dialog"
        onKeyDown={onKeyDown}
      >
        {error && (
          <div className="max-w-3xl mx-auto p-4 rounded-md border border-rose-400/30 bg-rose-500/10 text-rose-200 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="text-[12px] px-2 py-1 rounded-md bg-white/10 border border-white/15 text-gray-100"
            >
              Retry
            </button>
          </div>
        )}
        {pages.map((p) => (
          <div
            key={p.num}
            className={`relative mx-auto border ${
              p.num === selected
                ? 'border-cyan-400/40'
                : 'border-white/10'
            } rounded-md w-fit`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (p.num !== layout.sig_page) {
                setVal({ sig_page: p.num });
                setSelected(p.num);
              }
            }}
          >
            <div className="absolute -top-3 left-2 text-[11px] px-2 py-0.5 rounded bg-black/70 border border-white/10">
              Page {p.num}
            </div>
            <canvas
              ref={(el) => {
                canvasesRef.current[p.num] = el;
              }}
              width={p.canvasW}
              height={p.canvasH}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
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
                  boxShadow: dragging
                    ? '0 8px 24px rgba(34,211,238,0.35), 0 0 0 1px rgba(34,211,238,0.35) inset'
                    : '0 0 0 1px rgba(34,211,238,0.35) inset',
                  cursor: dragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  transform: dragging ? 'scale(1.02)' : 'none',
                  transition: dragging ? 'none' : 'transform 80ms ease-out',
                }}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragging(true);
                  try {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                  } catch {}
                  dragRef.current.grabDx =
                    e.clientX - e.currentTarget.getBoundingClientRect().left;
                  dragRef.current.grabDy =
                    e.clientY - e.currentTarget.getBoundingClientRect().top;
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragging(false);
                  try {
                    e.currentTarget.releasePointerCapture?.(e.pointerId);
                  } catch {}
                }}
                onPointerCancel={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  try {
                    e.currentTarget.releasePointerCapture?.(e.pointerId);
                  } catch {}
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
