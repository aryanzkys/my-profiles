"use client";
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState('intro'); // intro -> warp

  const name = user?.displayName || 'Aryan Zaky Prayogo';
  const email = user?.email || 'prayogoaryan63@gmail.com';

  useEffect(() => {
    // Sequence: greet -> warp overlay -> navigate
    const t1 = setTimeout(() => setPhase('warp'), 1600);
    const t2 = setTimeout(() => router.replace('/admin'), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [router]);

  const particles = useMemo(() =>
    Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 1.6 + Math.random() * 1.2,
      scale: 0.6 + Math.random() * 0.8,
    })), []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-gray-100">
      {/* Neon grid + radial glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{
          background: `radial-gradient(1100px 560px at 50% 0%, rgba(34,211,238,0.16), transparent 60%), radial-gradient(900px 520px at 80% 20%, rgba(232,121,249,0.14), transparent 70%)`
        }} />
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: `linear-gradient(transparent 96%, rgba(148,163,184,0.18) 97%), linear-gradient(90deg, transparent 96%, rgba(148,163,184,0.18) 97%)`,
          backgroundSize: '38px 38px',
          transform: 'perspective(900px) rotateX(52deg) translateY(-12%)',
          transformOrigin: 'top center'
        }} />
        <div className="absolute inset-0 bg-black/70" />
      </div>

      {/* Scanning line */}
      <motion.div
        initial={{ y: '-20%' }}
        animate={{ y: ['-20%', '120%'] }}
        transition={{ repeat: Infinity, duration: 2.8, ease: 'linear' }}
        className="pointer-events-none absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent"
        style={{ filter: 'blur(6px)' }}
      />

      {/* Center card */}
      <div className="relative z-10 grid place-items-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-[min(760px,94vw)] rounded-3xl p-[1px] bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-cyan-500/40"
        >
          <div className="relative rounded-3xl border border-white/10 bg-black/60 backdrop-blur-md p-8 overflow-hidden">
            {/* Glow ring */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute -top-28 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full"
              style={{
                background: 'radial-gradient(circle at center, rgba(34,211,238,.25), rgba(34,211,238,.05) 60%, transparent 70%)',
                filter: 'blur(10px)'
              }}
            />

            {/* Particles */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {particles.map(p => (
                <motion.span
                  key={p.id}
                  className="absolute h-0.5 w-6 bg-gradient-to-r from-cyan-300 to-fuchsia-300 rounded-full opacity-70"
                  style={{ left: `${p.left}%` }}
                  initial={{ y: '110%', scale: p.scale, opacity: 0 }}
                  animate={{ y: '-20%', opacity: [0, 1, 0.2, 0] }}
                  transition={{ repeat: Infinity, duration: p.duration, delay: p.delay, ease: 'easeOut' }}
                />
              ))}
            </div>

            {/* Text */}
            <div className="relative text-center">
              <div className="text-[13px] tracking-widest text-cyan-200/70 mb-2">ACCESS GRANTED</div>
              <div className="relative inline-block">
                <motion.h1
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="text-2xl md:text-4xl font-semibold text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                >
                  Welcome to Admin Panel, {name}
                </motion.h1>
                {/* Glitch layer */}
                <motion.span
                  aria-hidden
                  className="absolute left-0 top-0 text-2xl md:text-4xl font-semibold text-fuchsia-400/40 select-none"
                  initial={{ x: -2, y: 0, opacity: 0 }}
                  animate={{ x: [0, -2, 2, 0], opacity: [0, 0.6, 0] }}
                  transition={{ duration: 0.9, times: [0, 0.3, 0.7] }}
                >
                  Welcome to Admin Panel, {name}
                </motion.span>
              </div>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.45 }}
                className="text-gray-300 mt-3"
              >
                {email}
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 text-xs text-gray-400"
              >
                Preparing editor<span className="animate-pulse">…</span>
              </motion.div>
            </div>

            {/* Skip button */}
            <button
              onClick={() => router.replace('/admin')}
              className="absolute top-3 right-3 text-xs px-3 py-1.5 rounded-md bg-white/10 border border-white/15 hover:bg-white/15"
            >
              Skip
            </button>
            <button
              onClick={async () => { try { await logout(); } finally { router.replace('/login'); } }}
              className="absolute top-3 left-3 text-xs px-3 py-1.5 rounded-md bg-white/10 border border-white/15 hover:bg-white/15"
            >
              Sign out
            </button>
          </div>
        </motion.div>
      </div>

      {/* Warp transition overlay */}
      <AnimatePresence>
        {phase === 'warp' && (
          <motion.div
            key="warp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute inset-0 z-20"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.4, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[60vmin] w-[60vmin] rounded-full"
              style={{ background: 'radial-gradient(circle at center, rgba(34,211,238,.35), rgba(232,121,249,.25) 50%, transparent 70%)', filter: 'blur(8px)' }}
            />
            <div className="absolute inset-0 bg-black/50" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
