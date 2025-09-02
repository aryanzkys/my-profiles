import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function About() {
  const cardRef = useRef(null);
  const mvX = useMotionValue(0.5);
  const mvY = useMotionValue(0.5);
  const sx = useSpring(mvX, { stiffness: 120, damping: 20, mass: 0.2 });
  const sy = useSpring(mvY, { stiffness: 120, damping: 20, mass: 0.2 });
  const rotateY = useTransform(sx, [0, 1], [-8, 8]);
  const rotateX = useTransform(sy, [0, 1], [8, -8]);
  const [glow, setGlow] = useState({ x: '50%', y: '50%' });
  const audioCtxRef = useRef(null);
  const [avatarIdx, setAvatarIdx] = useState(0);

  // Tiny audio blip on hover
  const playBlip = (freq = 620, dur = 0.18, vol = 0.1) => {
    try {
      // Lazy init
      if (!audioCtxRef.current && typeof window !== 'undefined') {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const t0 = ctx.currentTime;
      // Main tone (triangle) + soft overtone (sine one octave up)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lp = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2400, t0);
      osc1.type = 'triangle';
      osc2.type = 'sine';
      // Gentle downward glide for elegance
      osc1.frequency.setValueAtTime(freq * 1.03, t0);
      osc1.frequency.exponentialRampToValueAtTime(freq, t0 + dur * 0.7);
      osc2.frequency.setValueAtTime(freq * 2.06, t0);
      osc2.frequency.exponentialRampToValueAtTime(freq * 2, t0 + dur * 0.7);
      // Envelope
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      // Mix with subtle overtone
      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      g1.gain.setValueAtTime(1.0, t0);
      g2.gain.setValueAtTime(0.35, t0);
      osc1.connect(g1).connect(lp);
      osc2.connect(g2).connect(lp);
      lp.connect(gain).connect(ctx.destination);
      osc1.start(t0);
      osc2.start(t0);
      osc1.stop(t0 + dur + 0.05);
      osc2.stop(t0 + dur + 0.05);
    } catch {}
  };

  // Optional Spline micro-objects inside the card
  const MicroSpline = dynamic(() => import('./MicroSpline'), { ssr: false });
  const microScene = process.env.NEXT_PUBLIC_SPLINE_MICRO_URL; // set to a tiny scene URL for orbiting micro-object

  const onMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    mvX.set(nx);
    mvY.set(ny);
    setGlow({ x: `${(nx * 100).toFixed(1)}%`, y: `${(ny * 100).toFixed(1)}%` });
  };

  const onLeave = () => {
    mvX.set(0.5);
    mvY.set(0.5);
    setGlow({ x: '50%', y: '50%' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-4xl text-center md:text-left max-h-[70vh] sm:max-h-[60vh] overflow-visible mb-4"
    >
      <h2 className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent mb-4 tracking-wide">
        About Me
      </h2>

      {/* Interactive Futuristic Frame */}
      <motion.div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative group"
      >
        {/* Outer neon glow following cursor */}
        <div
          className="pointer-events-none absolute -inset-4 rounded-3xl opacity-0 group-hover:opacity-100 transition duration-300 blur-2xl"
          style={{
            background: `radial-gradient(220px circle at ${glow.x} ${glow.y}, rgba(34,211,238,0.25), transparent 60%)`,
          }}
        />

        {/* Gradient border shell */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-cyan-500/40">
          {/* Inner card */}
          <div className="relative rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md px-4 py-4 md:px-8 md:py-8 overflow-hidden">
            {/* Light sweep following cursor */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background: `radial-gradient(600px circle at ${glow.x} ${glow.y}, rgba(34,211,238,0.12), transparent 40%)`,
                mixBlendMode: 'screen',
              }}
            />

            {/* Floating particles (subtle) */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full"
                  style={{
                    left: `${10 + (i * 11) % 80}%`,
                    top: `${20 + (i * 13) % 60}%`,
                    background: i % 2 ? 'rgba(34,211,238,.9)' : 'rgba(232,121,249,.9)',
                    boxShadow: i % 2 ? '0 0 10px rgba(34,211,238,.9)' : '0 0 10px rgba(232,121,249,.9)'
                  }}
                  animate={{ y: [0, -6, 0], x: [0, 4, 0], opacity: [0.9, 0.5, 0.9] }}
                  transition={{ duration: 3 + i * 0.25, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
            </div>

            {/* Content */}
            <div className="relative z-10 max-h-[46vh] sm:max-h-[44vh] overflow-y-auto pr-1">
              {/* Hero row */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 mb-4">
                {/* Holographic avatar with user photo + robust Drive fallbacks */}
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="relative shrink-0 h-24 w-24 md:h-28 md:w-28 rounded-full p-[2px] bg-gradient-to-b from-cyan-400/60 via-fuchsia-400/60 to-cyan-400/60"
                  style={{ transformStyle: 'preserve-3d' }}
                  onMouseEnter={() => playBlip(760)}
                >
                  <div className="relative h-full w-full rounded-full border border-white/10 bg-black/60 grid place-items-center overflow-hidden">
                    {(() => {
                      const id = '16eYXOk2dvgevVIq3_wpCR1W9LVlhWuEU';
                      const candidates = [
                        `https://drive.google.com/uc?export=view&id=${id}`,
                        `https://drive.google.com/uc?export=download&id=${id}`,
                        `https://lh3.googleusercontent.com/d/${id}=s2048`,
                        `https://drive.google.com/thumbnail?id=${id}&sz=w2000`,
                      ];
                      const src = candidates[Math.min(avatarIdx, candidates.length - 1)];
                      return (
                        <img
                          src={src}
                          alt="Aryan Zaky Prayogo"
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarIdx((i) => i + 1)}
                        />
                      );
                    })()}
                    <div className="absolute inset-0 holo" />
                  </div>
                </motion.div>

                <div className="text-center md:text-left">
                  <div className="text-xl md:text-2xl font-semibold text-white">
                    Aryan Zaky Prayogo
                  </div>
                  <div className="text-cyan-300/90 text-sm md:text-base">Aspiring DevSecOps Engineer • Computer Science</div>
                  <div className="text-gray-400 text-xs md:text-sm">Security • Automation • Reliability • Research</div>
                </div>
              </div>

              {/* Body */}
              <p className="text-gray-200 leading-relaxed">
                Hello! My name is <span className="text-white font-medium">Aryan Zaky Prayogo</span>, an aspiring <span className="text-white font-medium">DevSecOps Engineer</span> majoring in <span className="text-white font-medium">Computer Science</span> at <span className="text-white font-medium">Brawijaya University</span>. I’m passionate about cybersecurity, software development, and the intersection of technology and ethical leadership.
              </p>
              <p className="text-gray-200 leading-relaxed mt-4">
                I’ve earned 20+ awards spanning science, languages, research, and entrepreneurship. I’m active in youth organizations and academic communities focused on education, innovation, and sustainable development.
              </p>
              <p className="text-gray-200 leading-relaxed mt-4">
                I believe in continuous learning, meaningful collaboration, and using technology for good. Explore my journey, achievements, and projects here.
              </p>

              {/* Stat pills */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {[
                  ['Awards 20+', 'from-cyan-500/30 to-cyan-400/20'],
                  ['Organizations 10+', 'from-fuchsia-500/30 to-fuchsia-400/20'],
                  ['DevSecOps • Automation', 'from-cyan-500/30 to-fuchsia-400/20'],
                  ['Research & Innovation', 'from-fuchsia-500/30 to-cyan-400/20'],
                ].map(([label, grad], i) => (
                  <motion.span
                    key={label}
                    whileHover={{ scale: 1.06, rotate: i % 2 ? -1 : 1 }}
                    className={`text-xs md:text-[13px] px-3 py-1 rounded-full border border-white/10 bg-gradient-to-r ${grad} text-gray-100 shadow-[0_0_24px_rgba(34,211,238,0.08)]`}
                  >
                    {label}
                  </motion.span>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="mt-5 flex flex-wrap gap-3">
                <motion.a
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  href="mailto:prayogoaryan63@gmail.com?subject=Hi%20Aryan%20—%20from%20your%20portfolio&body=Halo%20Aryan,%20saya%20ingin%20menghubungi%20Anda%20mengenai..."
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 border border-emerald-400/40 bg-emerald-600/15 text-emerald-200 hover:bg-emerald-600/25"
                  onMouseEnter={() => playBlip(640)}
                >
                  <span>Contact Me</span>
                </motion.a>
                <motion.a
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  href="/cv"
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 border border-cyan-400/40 bg-cyan-600/15 text-cyan-200 hover:bg-cyan-600/25"
                  onMouseEnter={() => playBlip(700)}
                >
                  <span>Curriculum Vitae (CV)</span>
                </motion.a>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.dispatchEvent(new CustomEvent('nav:section', { detail: 'achievements' }))}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 border border-cyan-400/40 bg-cyan-600/15 text-cyan-200 hover:bg-cyan-600/25"
                  onMouseEnter={() => playBlip(720)}
                >
                  <span>View Achievements</span>
                </motion.button>
                <motion.a
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  href="https://github.com/aryanzkys"
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 border border-white/20 bg-white/10 text-gray-100 hover:bg-white/15"
                  onMouseEnter={() => playBlip(520)}
                >
                  <span>GitHub</span>
                </motion.a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Orbiting micro-objects inside the card (top-right), Spline if provided else fallback */}
      <div className="pointer-events-none absolute right-6 md:right-10 -mt-40 md:-mt-44 h-28 w-28 md:h-32 md:w-32">
        <motion.div
          className="relative h-full w-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
        >
          {microScene ? (
            <MicroSpline scene={microScene} className="absolute inset-0 scale-[0.45]" />
          ) : (
            <>
              {[0,1,2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute h-2 w-2 rounded-full"
                  style={{
                    left: i === 0 ? '50%' : i === 1 ? '8%' : '82%',
                    top: i === 0 ? '0%' : i === 1 ? '64%' : '36%',
                    translateX: '-50%',
                    background: i !== 1 ? 'rgba(34,211,238,.95)' : 'rgba(232,121,249,.95)',
                    boxShadow: i !== 1 ? '0 0 12px rgba(34,211,238,.9)' : '0 0 12px rgba(232,121,249,.9)'
                  }}
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 2.6 + i * 0.4, ease: 'easeInOut' }}
                />
              ))}
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
