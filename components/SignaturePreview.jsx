import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.mjs';

// Simple PDF first-page preview with draggable signature rectangle.
// Props:
// - fileUrl: string (PDF URL)
// - anchor: string ('bottom-right'|'bottom-left'|'top-right'|'top-left')
// - offsetX, offsetY: number (PDF units)
// - scale: number (relative to image embed scale; preview uses a fixed pixel box)
// - onChange: ({anchor, offsetX, offsetY}) => void
// - onChangePageSize: ({pageWidth, pageHeight}) => void
export default function SignaturePreview({ fileUrl, anchor, offsetX, offsetY, scale, onChange, onChangePageSize }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 });
  const [viewScale, setViewScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const sigBoxRef = useRef(null);

  // Load first page
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Configure worker dynamically for Next.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = window?.pdfjsWorker || pdfjsLib.GlobalWorkerOptions.workerSrc;
        const doc = await pdfjsLib.getDocument(fileUrl).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const desiredW = 600; // px preview width target
        const s = desiredW / viewport.width;
        const scaled = page.getViewport({ scale: s });
        if (cancelled) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = Math.floor(scaled.width);
        canvas.height = Math.floor(scaled.height);
        setViewScale(s);
        setPageSize({ w: viewport.width, h: viewport.height });
        onChangePageSize?.({ pageWidth: viewport.width, pageHeight: viewport.height });
        await page.render({ canvasContext: ctx, viewport: scaled }).promise;
      } catch (e) {
        // ignore render errors
      }
    })();
    return () => { cancelled = true; };
  }, [fileUrl]);

  // Convert stored offsets to preview pixel position based on anchor
  const toPixelPosition = () => {
    const w = pageSize.w, h = pageSize.h;
    const sigW = 160, sigH = 50; // preview rectangle size (pixels)
    let x = 0, y = 0;
    const dx = (Number(offsetX) || 0) * viewScale;
    const dy = (Number(offsetY) || 0) * viewScale;
    switch ((anchor || 'bottom-right').toLowerCase()) {
      case 'bottom-left':
        x = dx; y = (h * viewScale) - sigH - dy; break;
      case 'top-left':
        x = dx; y = dy; break;
      case 'top-right':
        x = (w * viewScale) - sigW - dx; y = dy; break;
      case 'bottom-right':
      default:
        x = (w * viewScale) - sigW - dx; y = (h * viewScale) - sigH - dy; break;
    }
    return { x: Math.max(0, x), y: Math.max(0, y), sigW, sigH };
  };

  const fromPixelPosition = (px, py) => {
    const w = pageSize.w, h = pageSize.h;
    const sigW = 160, sigH = 50;
    const a = (anchor || 'bottom-right').toLowerCase();
    let dx = 0, dy = 0;
    switch (a) {
      case 'bottom-left':
        dx = px; dy = (h * viewScale) - sigH - py; break;
      case 'top-left':
        dx = px; dy = py; break;
      case 'top-right':
        dx = (w * viewScale) - sigW - px; dy = py; break;
      case 'bottom-right':
      default:
        dx = (w * viewScale) - sigW - px; dy = (h * viewScale) - sigH - py; break;
    }
    return { offsetX: dx / viewScale, offsetY: dy / viewScale };
  };

  const handleMouseDown = (e) => {
    setDragging(true);
  };
  const handleMouseUp = () => setDragging(false);
  const handleMouseMove = (e) => {
    if (!dragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    let px = e.clientX - rect.left - 80; // center adjustment
    let py = e.clientY - rect.top - 25;
    // clamp within canvas
    const canvas = canvasRef.current;
    const maxX = canvas.width - 160;
    const maxY = canvas.height - 50;
    px = Math.max(0, Math.min(maxX, px));
    py = Math.max(0, Math.min(maxY, py));
    const { offsetX: newX, offsetY: newY } = fromPixelPosition(px, py);
    onChange?.({ anchor, offsetX: newX, offsetY: newY });
  };

  const { x, y, sigW, sigH } = toPixelPosition();

  return (
    <div ref={containerRef} className="relative inline-block" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <canvas ref={canvasRef} className="rounded-md border border-white/10" />
      <div
        ref={sigBoxRef}
        onMouseDown={handleMouseDown}
        className="absolute cursor-move rounded-md border border-cyan-400/50 bg-cyan-500/20"
        style={{ left: x, top: y, width: sigW, height: sigH }}
        title="Drag untuk memindahkan posisi ttd"
      />
    </div>
  );
}
