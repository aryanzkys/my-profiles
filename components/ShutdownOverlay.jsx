"use client";
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

function PoliceLine({ delay = 0, reverse = false }) {
  return (
    <div className="relative w-[140%] -left-[20%] overflow-hidden pointer-events-none">
      <motion.div
        className="flex items-center gap-2 whitespace-nowrap select-none"
        initial={{ x: reverse ? '-50%' : '0%' }}
        animate={{ x: reverse ? '0%' : '-50%' }}
        transition={{ repeat: Infinity, duration: 8, ease: 'linear', delay }}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="px-4 py-1 rounded-md text-[11px] font-bold tracking-widest border border-yellow-400/60 bg-yellow-500/20 text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.25)]">
            POLICE LINE • DO NOT CROSS
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function HoloHex({ className = '', delay = 0, size = 80, stroke = 'rgba(34,211,238,0.5)' }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`pointer-events-none ${className}`}
      initial={{ y: 0, rotate: 0, opacity: 0.5 }}
      animate={{ y: [0, -10, 0], rotate: [0, 6, 0], opacity: [0.4, 0.8, 0.4] }}
      transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut', delay }}
    >
      <polygon
        points="50,5 95,28 95,72 50,95 5,72 5,28"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
      />
      <motion.polygon
        points="50,15 85,33 85,67 50,85 15,67 15,33"
        fill="none"
        stroke={stroke}
        strokeWidth="0.8"
        animate={{ pathLength: [0.2, 1, 0.2] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'linear', delay }}
        strokeDasharray="1 1"
      />
    </motion.svg>
  );
}

export default function ShutdownOverlay() {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const maxTilt = 6; // degrees
  const [hover, setHover] = useState(false);
  const onMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const ry = Math.max(-1, Math.min(1, dx)) * maxTilt; // rotateY with x
    const rx = -Math.max(-1, Math.min(1, dy)) * maxTilt; // rotateX with y (invert)
    setTilt({ rx, ry });
  };
  const onLeave = () => setTilt({ rx: 0, ry: 0 });

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/90 backdrop-blur-sm">
      {/* Moving police lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 w-full rotate-6 opacity-80">
          <PoliceLine />
        </div>
        <div className="absolute top-1/3 w-full -rotate-3 opacity-70">
          <PoliceLine delay={1.2} reverse />
        </div>
        <div className="absolute top-1/2 w-full rotate-2 opacity-60">
          <PoliceLine delay={2.4} />
        </div>
        <div className="absolute top-2/3 w-full -rotate-4 opacity-70">
          <PoliceLine delay={3.6} reverse />
        </div>

        {/* Floating holo hexes */}
        <HoloHex className="absolute left-10 top-10" delay={0.4} size={90} />
        <HoloHex className="absolute right-16 bottom-12" delay={1.1} size={70} stroke="rgba(250,204,21,0.5)" />
        <HoloHex className="absolute right-1/3 top-8" delay={2.2} size={60} stroke="rgba(147,197,253,0.5)" />
      </div>

      {/* Center content */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        className="relative z-10 w-[min(92vw,860px)] rounded-3xl p-[1px] bg-gradient-to-r from-yellow-400/30 via-red-500/30 to-yellow-400/30 shadow-[0_0_40px_rgba(250,204,21,0.2)]"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        whileHover={{ scale: 1.005 }}
        style={{ rotateX: tilt.rx, rotateY: tilt.ry, transformPerspective: 900 }}
      >
        <div className="rounded-3xl border border-white/10 bg-black/80 p-6 sm:p-10 text-center relative overflow-hidden">
          {/* subtle scanline */}
          <motion.div
            className="pointer-events-none absolute -inset-x-10 -top-10 h-10 bg-gradient-to-b from-white/5 to-transparent"
            initial={{ y: '-120%' }}
            animate={{ y: ['-120%', '140%'] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
          />
          {/* Sparkle particles */}
          <Sparkles active={true} />
          <div className="mx-auto mb-6 h-24 w-24 sm:h-32 sm:w-32 rounded-2xl border border-yellow-400/40 bg-yellow-500/10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-40" style={{ background: 'conic-gradient(from 0deg, transparent, rgba(250,204,21,0.4), rgba(248,113,113,0.35), transparent 30%)' }} />
            <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}>
              <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.9)]" style={{ transformOrigin: '0 64px' }} />
            </motion.div>
            {/* Breathing glow */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              initial={{ boxShadow: '0 0 0px rgba(250,204,21,0.0)' }}
              animate={{ boxShadow: ['0 0 0px rgba(250,204,21,0.0)','0 0 28px rgba(250,204,21,0.25)','0 0 0px rgba(250,204,21,0.0)'] }}
              transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
            />
            <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-14 w-14 sm:h-20 sm:w-20 text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
          </div>
          <motion.div
            onHoverStart={() => setHover(true)}
            onHoverEnd={() => setHover(false)}
            className="relative inline-block"
          >
            <motion.h2
            className="mx-auto max-w-3xl text-center text-2xl sm:text-3xl font-semibold leading-snug sm:leading-tight tracking-wide text-transparent bg-clip-text drop-shadow-[0_0_14px_rgba(250,204,21,0.15)] select-none"
            style={{
              backgroundImage: 'linear-gradient(120deg, rgba(250,204,21,0.95), rgba(34,211,238,0.95), rgba(59,130,246,0.95))',
              backgroundSize: '200% 100%'
            }}
            initial={{ backgroundPosition: '0% 50%' }}
            animate={{ backgroundPosition: ['0% 50%','100% 50%','0% 50%'] }}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          >We’re currently performing some maintenance on this website.</motion.h2>

            {/* Micro-glitch layers on hover (very subtle) */}
            <motion.span
              aria-hidden
              className="absolute inset-0 text-2xl sm:text-3xl font-semibold bg-clip-text text-transparent select-none pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(120deg, rgba(250,204,21,0.9), rgba(34,211,238,0.9))'
              }}
              initial={{ opacity: 0 }}
              animate={hover ? { opacity: [0, 0.25, 0.1, 0.2, 0], x: [0, 1, -1.5, 0.5, 0] } : { opacity: 0, x: 0 }}
              transition={{ duration: 0.45, repeat: hover ? Infinity : 0, ease: 'easeInOut' }}
            >We’re currently performing some maintenance on this website.</motion.span>
            <motion.span
              aria-hidden
              className="absolute inset-0 text-2xl sm:text-3xl font-semibold bg-clip-text text-transparent select-none pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(120deg, rgba(59,130,246,0.9), rgba(250,204,21,0.9))'
              }}
              initial={{ opacity: 0 }}
              animate={hover ? { opacity: [0, 0.18, 0.08, 0.15, 0], y: [0, -0.8, 0.6, -0.4, 0] } : { opacity: 0, y: 0 }}
              transition={{ duration: 0.45, repeat: hover ? Infinity : 0, ease: 'easeInOut', delay: 0.08 }}
            >We’re currently performing some maintenance on this website.</motion.span>
          </motion.div>
          <p className="mx-auto max-w-2xl text-center text-gray-300/90 mt-3 leading-relaxed">
            Please check back soon, everything will be back online shortly.
          </p>
          <motion.div
            className="mt-4 text-base sm:text-lg font-medium text-yellow-200 drop-shadow-[0_0_12px_rgba(250,204,21,0.35)]"
            initial={{ opacity: 0.7, y: 2 }}
            animate={{ opacity: [0.7, 1, 0.85, 1], y: [2, 0, 0, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            – Aryan
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function Sparkles({ active }) {
  const count = 20;
  const items = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 2,
    size: 2 + Math.random() * 3,
    hue: Math.random() > 0.5 ? 190 : 50,
  })), []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {items.map(s => (
        <motion.span
          key={s.id}
          className="absolute rounded-full shadow-[0_0_8px_rgba(255,255,255,0.35)]"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, backgroundColor: `hsl(${s.hue} 90% 60% / 0.9)` }}
          initial={{ opacity: 0 }}
          animate={active ? { opacity: [0, 0.9, 0], y: [-3, 0, 3], x: [0, 0.4, -0.4] } : { opacity: 0 }}
          transition={{ repeat: Infinity, duration: 3 + Math.random() * 2, ease: 'easeInOut', delay: s.delay }}
        />
      ))}
    </div>
  );
}
