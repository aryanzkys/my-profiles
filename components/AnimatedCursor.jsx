import { useEffect, useRef, useState } from 'react';

// Animated pixel-art-ish cursor overlay
export default function AnimatedCursor() {
  const [enabled, setEnabled] = useState(false);
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [kind, setKind] = useState('default'); // default | pointer | text
  const ref = useRef(null);

  useEffect(() => {
    // Only show on fine pointers (desktop/laptop)
    const mq = window.matchMedia('(pointer: fine)');
    const ok = mq.matches;
    setEnabled(ok);
    const onChange = () => setEnabled(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', onChange); else mq.removeListener(onChange); };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add('has-animated-cursor');
    const move = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
      const el = e.target;
      // Determine cursor kind based on hovered element
      if (el) {
        const tag = (el.tagName || '').toLowerCase();
        const role = el.getAttribute && el.getAttribute('role');
        const cls = el.classList || { contains: () => false };
        const isPointer = el.onclick || tag === 'a' || tag === 'button' || cls.contains('cursor-pointer') || (role === 'button');
        const isText = tag === 'input' || tag === 'textarea' || tag === 'select' || cls.contains('cursor-text') || el.isContentEditable;
        setKind(isText ? 'text' : (isPointer ? 'pointer' : 'default'));
      }
    };
    const out = () => setKind('default');
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseout', out);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseout', out);
      document.body.classList.remove('has-animated-cursor');
    };
  }, [enabled]);

  if (!enabled) return null;
  const size = kind === 'pointer' ? 16 : kind === 'text' ? 18 : 14;
  const translate = kind === 'text' ? { x: -1, y: -9 } : { x: 0, y: 0 };
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate3d(${pos.x + translate.x}px, ${pos.y + translate.y}px, 0)`,
        pointerEvents: 'none',
        zIndex: 9999,
        mixBlendMode: 'normal',
        filter: 'contrast(1)',
        willChange: 'transform',
      }}
      aria-hidden
    >
      {/* outer glow */}
      <div style={{ position:'absolute', left:-6, top:-6, width:size+12, height:size+12, borderRadius:3, background:'radial-gradient(circle, rgba(34,211,238,0.18), transparent 70%)', opacity: kind==='default'?0.45:0.6, transform:'translateZ(0)' }} />
      {/* core pixel-ish block with tiny animation */}
      <div
        style={{
          width: size,
          height: size,
          imageRendering: 'pixelated',
          background: kind==='pointer'
            ? 'linear-gradient(135deg, #fff 0%, #d9fbff 60%, #9be7ff 100%)'
            : kind==='text'
              ? 'linear-gradient(135deg, #e5e7eb 0%, #ffffff 60%)'
              : 'linear-gradient(135deg, #ffffff 0%, #a7f3d0 60%)',
          border: '1px solid rgba(0,0,0,0.65)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.25) inset, 0 2px 6px rgba(0,0,0,0.35)',
          borderRadius: 2,
          transform: kind==='pointer' ? 'rotate(8deg)' : kind==='text' ? 'rotate(-6deg)' : 'rotate(0deg)',
          animation: 'cursor-wiggle 1.2s ease-in-out infinite',
        }}
      />
      <style jsx global>{`
        @keyframes cursor-wiggle {
          0% { transform: translateZ(0) rotate(0deg); }
          50% { transform: translateZ(0) rotate(${kind==='pointer' ? '12deg' : kind==='text' ? '-10deg' : '4deg'}); }
          100% { transform: translateZ(0) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
