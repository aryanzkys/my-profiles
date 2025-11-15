"use client";
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState('intro'); // intro -> warp
  const displayName = (user?.displayName || '').trim();
  const emailLocal = (user?.email || '').split('@')[0] || '';
  const name = displayName || emailLocal || 'Admin';
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black text-gray-100">
      {/* Premium gradient mesh background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(circle 800px at 20% 30%, rgba(56,189,248,0.15), transparent 50%),
            radial-gradient(circle 600px at 80% 70%, rgba(168,85,247,0.12), transparent 50%),
            radial-gradient(circle 900px at 50% 50%, rgba(34,211,238,0.08), transparent 60%)
          `
        }} />
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            repeat: Infinity,
            duration: 8,
            ease: 'easeInOut',
          }}
          className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-500/20 to-transparent blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            repeat: Infinity,
            duration: 10,
            ease: 'easeInOut',
            delay: 2,
          }}
          className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-gradient-to-tr from-fuchsia-500/20 to-transparent blur-3xl"
        />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.15]" style={{
          backgroundImage: `linear-gradient(rgba(148,163,184,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Premium scanning effect */}
      <motion.div
        initial={{ y: '-30%' }}
        animate={{ y: ['-30%', '130%'] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
        className="pointer-events-none absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-cyan-400/8 to-transparent"
        style={{ filter: 'blur(12px)' }}
      />

      {/* Center premium card */}
      <div className="relative z-10 grid place-items-center min-h-screen px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-[min(820px,96vw)] rounded-[32px] p-[1.5px]"
          style={{
            background: 'linear-gradient(135deg, rgba(56,189,248,0.5), rgba(168,85,247,0.5), rgba(34,211,238,0.5))',
          }}
        >
          {/* Glassmorphism card */}
          <div className="relative rounded-[32px] border border-white/20 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
            {/* Premium top accent line with animation */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent origin-center"
            />
            
            {/* Ambient glow effects */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full"
              style={{
                background: 'radial-gradient(circle at center, rgba(56,189,248,.35), rgba(34,211,238,.15) 50%, transparent 70%)',
                filter: 'blur(40px)'
              }}
            />
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.3, 0.2],
              }}
              transition={{
                repeat: Infinity,
                duration: 6,
                ease: 'easeInOut',
              }}
              className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-tr from-fuchsia-500/30 to-transparent blur-3xl"
            />

            {/* Premium floating particles */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {particles.map(p => (
                <motion.div
                  key={p.id}
                  className="absolute"
                  style={{ left: `${p.left}%` }}
                  initial={{ y: '110%', scale: p.scale, opacity: 0 }}
                  animate={{ y: '-20%', opacity: [0, 0.8, 0.3, 0] }}
                  transition={{ repeat: Infinity, duration: p.duration, delay: p.delay, ease: 'easeOut' }}
                >
                  <div className="h-1 w-8 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-400 blur-[1px]" />
                </motion.div>
              ))}
            </div>

            {/* Main content with premium spacing */}
            <div className="relative px-8 py-12 text-center">
              {/* Premium status badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-400/30 backdrop-blur-sm mb-6"
              >
                <motion.span
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: 'easeInOut',
                  }}
                  className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                />
                <span className="text-xs font-medium tracking-[0.2em] text-emerald-300 uppercase">
                  Access Granted
                </span>
              </motion.div>

              {/* Premium welcome title */}
              <div className="relative inline-block">
                <motion.h1
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  className="text-3xl md:text-5xl font-bold bg-gradient-to-br from-cyan-300 via-blue-200 to-fuchsia-300 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(56,189,248,0.4)] leading-tight"
                >
                  Welcome back, {name}
                </motion.h1>
                {/* Subtle shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{
                    x: ['-200%', '200%'],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: 'linear',
                    repeatDelay: 2,
                  }}
                  style={{ mixBlendMode: 'overlay' }}
                />
              </div>

              {/* Premium subtitle with icon */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="mt-6 flex items-center justify-center gap-2.5 text-gray-300"
              >
                <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                <span className="text-sm">{email}</span>
              </motion.div>

              {/* Premium loading indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mt-10 inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-slate-800/60 to-slate-700/60 border border-white/10 backdrop-blur-sm"
              >
                <div className="relative">
                  <div className="h-5 w-5 rounded-full border-2 border-cyan-500/30" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    className="absolute inset-0 h-5 w-5 rounded-full border-2 border-transparent border-t-cyan-400"
                  />
                </div>
                <span className="text-sm text-gray-300 font-medium">
                  Initializing dashboard
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  >
                    ...
                  </motion.span>
                </span>
              </motion.div>
            </div>

            {/* Premium action buttons */}
            <div className="absolute top-5 right-5 flex items-center gap-2">
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.replace('/admin')}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/40 text-cyan-200 hover:from-cyan-500/30 hover:to-blue-500/30 hover:border-cyan-400/60 backdrop-blur-sm transition-all duration-300 shadow-lg hover:shadow-cyan-500/25"
              >
                Skip Intro
              </motion.button>
            </div>
            <div className="absolute top-5 left-5">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async () => { try { await logout(); } finally { router.replace('/login'); } }}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-400/40 text-red-200 hover:from-red-500/30 hover:to-rose-500/30 hover:border-red-400/60 backdrop-blur-sm transition-all duration-300 shadow-lg hover:shadow-red-500/25"
              >
                Sign Out
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Premium warp transition overlay */}
      <AnimatePresence>
        {phase === 'warp' && (
          <motion.div
            key="warp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute inset-0 z-20"
          >
            {/* Multi-layer gradient burst */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 2, opacity: 0.8 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[70vmin] w-[70vmin] rounded-full"
              style={{
                background: 'radial-gradient(circle at center, rgba(56,189,248,0.4), rgba(168,85,247,0.3) 40%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.8, opacity: 0.6 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[50vmin] w-[50vmin] rounded-full"
              style={{
                background: 'radial-gradient(circle at center, rgba(34,211,238,0.5), rgba(168,85,247,0.3) 50%, transparent 70%)',
                filter: 'blur(30px)',
              }}
            />
            {/* Premium backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-black/80 backdrop-blur-sm"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
