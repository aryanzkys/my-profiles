import dynamic from 'next/dynamic';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import ParticleField from '../components/ParticleField';
import aiPrivacy from '../data/ai_privacy.json';

const Chatbot = dynamic(() => import('../components/Chatbot'), { ssr: false });
const SpotifySection = dynamic(() => import('../components/SpotifySection'), { ssr: false });

export default function AIPage() {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const cardRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const headerRef = useRef(null);
  // Consent gating
  const [consentLoaded, setConsentLoaded] = useState(false);
  const [consented, setConsented] = useState(false);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load consent from localStorage (versioned by last_updated from policy)
  useEffect(() => {
    try {
      const v = aiPrivacy?.last_updated || 'v1';
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('aryan-ai-privacy-consent') : null;
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj.version === v) {
          setConsented(true);
        }
      }
    } catch {}
    setConsentLoaded(true);
  }, []);

  const handleTilt = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const ry = (px - 0.5) * (isMobile ? 3 : 8); // rotateY (reduced on mobile)
    const rx = -(py - 0.5) * (isMobile ? 2 : 5); // rotateX (reduced on mobile)
    setTilt({ rx, ry });
  };
  const resetTilt = () => setTilt({ rx: 0, ry: 0 });

  // Hero headline accent follows pointer to keep layout calm but interactive
  const handleHeaderMove = (e) => {
    const el = headerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--mx', `${Math.max(0, Math.min(100, px * 100))}%`);
    el.style.setProperty('--px', `${(px * 100).toFixed(2)}%`);
    el.style.setProperty('--py', `${(py * 100).toFixed(2)}%`);
    el.style.setProperty('--glow', '1');
  };
  const resetHeaderMove = () => {
    const el = headerRef.current;
    if (!el) return;
    el.style.setProperty('--mx', '48%');
    el.style.setProperty('--px', '52%');
    el.style.setProperty('--py', '48%');
    el.style.setProperty('--glow', '0');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#05070a] text-slate-100">
      <Head>
        <title>Aryan’s AI Assistant</title>
        <meta name="robots" content="index,follow" />
        <meta name="description" content="Chat with Aryan’s AI Assistant - trained by Aryan to help you get to know him better." />
        <meta name="robots" content="index, follow" />
        <meta name="keywords" content="AI, chatbot, image generator, AryanStack, Netlify AI, Aryan AI, Aryan AI Assistant, Aryan Zaky, Aryan, Aryan Zaky Prayogo" />
        <link rel="canonical" href="https://aryanstack.netlify.app/ai" />
      </Head>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.14),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.12),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(165,180,252,0.1),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
        <ParticleField className="opacity-[0.08]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header
          ref={headerRef}
          onMouseMove={handleHeaderMove}
          onMouseLeave={resetHeaderMove}
          onMouseEnter={() => {
            const el = headerRef.current;
            if (el) el.style.setProperty('--glow', '1');
          }}
          className="w-full border-b border-white/5 backdrop-blur-sm"
        >
          <div className="container mx-auto px-4 py-12 md:py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="grid gap-12 md:grid-cols-[minmax(0,1fr)_360px] md:items-end"
            >
              <div className="space-y-6">
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-300">AI hangout</span>
                <div className="space-y-4">
                  <h1 className="title-rgb text-3xl leading-tight sm:text-4xl md:text-[2.9rem]">Kick back with Aryan’s AI Assistant</h1>
                  <p className="max-w-xl text-sm leading-7 text-slate-300 md:text-base">
                    Catch the latest on what Aryan’s building, how he’s vibing, and the stories behind it all. Ask anything, stay curious, keep it easy.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="highlight-card">
                    <h3>Say hey</h3>
                    <p>Ask about projects, backstory, or what’s popping right now.</p>
                  </div>
                  <div className="highlight-card">
                    <h3>Keep it light</h3>
                    <p>Sleek space so the convo stays front and center.</p>
                  </div>
                  <div className="highlight-card">
                    <h3>Boost the mood</h3>
                    <p>Spotify adds the perfect soundtrack while you chat.</p>
                  </div>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
                className="w-full rounded-[26px] border border-white/10 bg-white/[0.04] px-7 py-8 backdrop-blur-md"
              >
                <h2 className="text-sm font-semibold text-slate-100">Jump into the chat</h2>
                <p className="mt-3 text-xs leading-6 text-slate-300">
                  Say hi, ask for inspo, or drop what you’re working on—this assistant keeps it casual and on point.
                </p>
                <div className="mt-6 space-y-3 text-xs text-slate-200">
                  <div className="mini-pill">“What’s Aryan hyped about this week?”</div>
                  <div className="mini-pill">“Need a playlist for deep focus—hook me up.”</div>
                  <div className="mini-pill">“Tell me about the wildest project you’ve shipped.”</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </header>

        <main className="container mx-auto flex w-full flex-1 flex-col px-4 pb-20 pt-10 md:px-6">
          <section className="relative isolate">
            <div className="absolute -inset-x-6 -top-10 bottom-0 rounded-[44px] bg-gradient-to-br from-white/5 via-white/3 to-transparent blur-[110px]" />
            <motion.div
              ref={cardRef}
              onMouseMove={handleTilt}
              onMouseLeave={resetTilt}
              style={{ transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
              className="relative overflow-hidden rounded-[34px] border border-white/8 bg-[#080d13]/82 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.94)] backdrop-blur-xl transition-transform duration-200"
            >
              <div className="absolute inset-x-10 top-6 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="rounded-[34px] p-2 md:p-3">
                <Chatbot initialOpen fullScreen hideFab />
              </div>
            </motion.div>
          </section>

          <section className="relative mt-12 grid gap-6 md:grid-cols-[380px_minmax(0,1fr)] md:items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent p-[1px]"
            >
              <div className="rounded-[28px] bg-[#070b10]/88 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span>Streaming now</span>
                  <span>Spotify</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  Queue up Aryan’s picks while you talk. The playlist stays in sync with the vibe so the chat never misses a beat.
                </p>
                <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#080d13]/90">
                  <SpotifySection />
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
              className="rounded-[30px] border border-white/10 bg-[#070b10]/85 px-8 py-10 backdrop-blur-xl"
            >
              <h3 className="text-base font-semibold text-slate-100">Why this hits different</h3>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="feature">
                  <h4>Chill tone</h4>
                  <p>Feels like texting Aryan directly—no stiff auto replies.</p>
                </div>
                <div className="feature">
                  <h4>Locked in</h4>
                  <p>Answers stay aligned with whatever you throw into the mix.</p>
                </div>
                <div className="feature">
                  <h4>Always around</h4>
                  <p>Hop in from any device—zero prep needed.</p>
                </div>
                <div className="feature">
                  <h4>Feels smooth</h4>
                  <p>Soft visuals and gentle motion keep the focus on you.</p>
                </div>
              </div>
            </motion.div>
          </section>

          <AnimatePresence>
            {consentLoaded && !consented && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                aria-modal="true"
                role="dialog"
              >
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 12, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  className="relative mx-5 w-full max-w-lg rounded-3xl border border-white/12 bg-[#05070a]/95 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.95)] backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
                    <h2 className="text-base font-semibold text-slate-100">Before we vibe</h2>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">You first</span>
                  </div>
                  <div className="px-6 py-5 text-sm text-slate-300">
                    <p className="leading-6 text-slate-300">
                      We keep things transparent so you can chat without stress. Take a quick peek at the AI policy and we’re good to go.
                    </p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-400">
                      <li className="flex gap-2">
                        <span className="bullet" />
                        <span>This convo stays with you—bounce anytime and it’s gone.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="bullet" />
                        <span>Spotify add-on is totally optional—connect only if you’re feeling it.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="bullet" />
                        <span>We watch the vibes so replies stay fresh and helpful.</span>
                      </li>
                    </ul>
                    <a
                      href="/ai-privacy"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-cyan-300 hover:text-cyan-200"
                    >
                      Read the AI Policy
                    </a>
                    <label className="mt-5 flex items-start gap-3 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={agree}
                        onChange={(event) => setAgree(event.target.checked)}
                        className="mt-[2px] h-4 w-4 rounded border-white/20 bg-white/5"
                      />
                      <span>Cool, I’m in. Let’s chat.</span>
                    </label>
                  </div>
                  <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
                    <a
                      href="/"
                      className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300 transition hover:bg-white/5"
                    >
                      Maybe later
                    </a>
                    <button
                      disabled={!agree}
                      onClick={() => {
                        try {
                          const version = aiPrivacy?.last_updated || 'v1';
                          const payload = { version, accepted: true, ts: new Date().toISOString() };
                          window.localStorage.setItem('aryan-ai-privacy-consent', JSON.stringify(payload));
                        } catch {}
                        setConsented(true);
                      }}
                      className={`rounded-full border px-5 py-2 text-xs font-medium transition ${agree ? 'border-cyan-400/40 bg-cyan-500/20 text-cyan-200 hover:shadow-[0_0_18px_rgba(34,211,238,0.32)]' : 'border-white/10 bg-white/5 text-slate-500 cursor-not-allowed'}`}
                    >
                      Dive in
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style jsx>{`
        .bullet {
          margin-top: 0.4rem;
          height: 6px;
          width: 6px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.9), rgba(99, 102, 241, 0.9));
          flex-shrink: 0;
        }
        .highlight-card {
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(8, 13, 19, 0.78);
          padding: 1.35rem;
          backdrop-filter: blur(12px);
          color: rgba(226, 232, 240, 0.92);
        }
        .highlight-card h3 {
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 0.55rem;
        }
        .highlight-card p {
          font-size: 0.78rem;
          line-height: 1.6;
          color: rgba(148, 163, 184, 0.85);
        }
        .mini-pill {
          display: inline-flex;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(15, 23, 42, 0.55);
          padding: 0.55rem 0.95rem;
        }
        .feature {
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(12, 18, 25, 0.78);
          padding: 1.25rem;
        }
        .feature h4 {
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.4rem;
          color: rgba(226, 232, 240, 0.96);
        }
        .feature p {
          font-size: 0.8rem;
          line-height: 1.6;
          color: rgba(148, 163, 184, 0.82);
        }
        .title-rgb {
          position: relative;
          display: inline-block;
          letter-spacing: -0.01em;
          background-image:
            radial-gradient(220px 220px at var(--px, 52%) var(--py, 48%), rgba(34, 211, 238, 0.3), transparent 70%),
            linear-gradient(90deg, rgba(56, 189, 248, 0.95), rgba(96, 165, 250, 0.95), rgba(129, 140, 248, 0.95));
          background-size: 120% 120%, 200% 200%;
          background-position: 50% 50%, var(--mx, 48%) 50%;
          background-clip: text;
          color: transparent;
          -webkit-background-clip: text;
          transition: background-position 160ms ease, text-shadow 160ms ease, transform 120ms ease;
          text-shadow: 0 18px 40px rgba(15, 23, 42, 0.4);
        }
        header:hover .title-rgb,
        header:focus-within .title-rgb {
          transform: translateY(-2px);
          text-shadow: 0 20px 50px rgba(15, 23, 42, 0.45);
        }
      `}</style>
    </div>
  );
}
