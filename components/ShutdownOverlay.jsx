"use client";
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

export default function ShutdownOverlay() {
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
      </div>

      {/* Center content */}
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }} className="relative z-10 w-[min(92vw,860px)] rounded-3xl p-[1px] bg-gradient-to-r from-yellow-400/30 via-red-500/30 to-yellow-400/30 shadow-[0_0_40px_rgba(250,204,21,0.2)]">
        <div className="rounded-3xl border border-white/10 bg-black/80 p-6 sm:p-10 text-center">
          <div className="mx-auto mb-6 h-24 w-24 sm:h-32 sm:w-32 rounded-2xl border border-yellow-400/40 bg-yellow-500/10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-40" style={{ background: 'conic-gradient(from 0deg, transparent, rgba(250,204,21,0.4), rgba(248,113,113,0.35), transparent 30%)' }} />
            <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}>
              <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.9)]" style={{ transformOrigin: '0 64px' }} />
            </motion.div>
            <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-14 w-14 sm:h-20 sm:w-20 text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
          </div>
          <h2 className="text-yellow-300 text-2xl sm:text-3xl font-semibold">This website is currently under development.</h2>
          <p className="text-gray-300 mt-2">We will reopen it once the work is complete.</p>
        </div>
      </motion.div>
    </div>
  );
}
