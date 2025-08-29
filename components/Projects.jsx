"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import MiniChess from './MiniChess';
import MiniFlappy from './MiniFlappyPhaser';

export default function Projects() {
  const [tab, setTab] = useState('chess');
  return (
    <div className="pointer-events-auto w-[min(1280px,96vw)] max-h-[82vh] grid gap-4">
      {/* Interactive banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-cyan-500/40 overflow-hidden"
      >
        <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md p-4 sm:p-6">
          <div className="relative">
            <div className="text-xs tracking-widest text-cyan-200/70 mb-1">PROJECTS</div>
            <motion.h2
              className="text-xl sm:text-2xl font-semibold text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.25)]"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.4 }}
            >
              This section is still under development, so guys, it's better to play the mini games below for now!
            </motion.h2>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-xs text-gray-400"
            >
              Tip: switch tabs to try Chess or Flappy Bird. Scores and settings persist locally.
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Mini-games panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="relative rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-cyan-500/40 overflow-hidden"
      >
        <div className="rounded-2xl border border-white/10 bg-neutral-900/90 backdrop-blur-md p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-white text-lg font-semibold leading-tight">Mini Games</h3>
              <p className="text-gray-400 text-xs">Play right here — desktop and mobile</p>
            </div>
          </div>
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setTab('chess')}
              className={`px-3 py-1.5 rounded-lg border text-sm ${tab === 'chess' ? 'bg-white/15 border-white/20 text-white' : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'}`}
            >Chess</button>
            <button
              onClick={() => setTab('flappy')}
              className={`px-3 py-1.5 rounded-lg border text-sm ${tab === 'flappy' ? 'bg-white/15 border-white/20 text-white' : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'}`}
            >Flappy Bird</button>
          </div>
          <div className="min-h-[60vh] max-h-[64vh] overflow-visible rounded-xl border border-white/10 bg-black/30 p-2 relative">
            {tab === 'chess' ? <MiniChess /> : <MiniFlappy />}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
