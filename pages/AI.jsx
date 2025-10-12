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
          <div className="container mx-auto px-4 py-10 md:py-16">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col gap-10 md:flex-row md:items-end"
            >
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-400 to-indigo-500 shadow-[0_6px_24px_rgba(59,130,246,0.25)]" />
                  <span className="text-xs uppercase tracking-[0.32em] text-slate-300/80">Virtual Dialogue</span>
                </div>
                <div className="space-y-4">
                  <h1 className="title-rgb text-3xl leading-tight sm:text-4xl md:text-5xl">Aryan’s AI Assistant</h1>
                  <p className="max-w-xl text-sm leading-7 text-slate-300 md:text-base">
                    Discover Aryan’s story, projects, and daily notes through a conversational surface that stays private, purposeful, and available any time you need clarity.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="chip">Secure & Local-first</span>
                  <span className="chip">Context aware</span>
                  <span className="chip">Spotify enrichment</span>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
                className="w-full max-w-sm rounded-2xl border border-white/5 bg-white/3 px-6 py-5 backdrop-blur-md"
              >
                <h2 className="text-sm font-semibold text-slate-200">How the assistant helps</h2>
                <ul className="mt-4 space-y-3 text-xs text-slate-300">
                  <li className="flex gap-3">
                    <span className="bullet" />
                    <span>Ask about Aryan’s skills, experiences, and learning journey.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bullet" />
                    <span>Preview curated playlists for the current focus and energy.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bullet" />
                    <span>Receive thoughtful answers with clear privacy boundaries.</span>
                  </li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </header>

        <main className="container mx-auto flex w-full flex-1 flex-col px-4 pb-20 pt-8 md:px-6">
          <section className="relative isolate">
            <div className="absolute -inset-x-4 -top-8 bottom-0 rounded-[40px] bg-gradient-to-br from-white/4 via-white/2 to-transparent blur-[100px]" />
            <motion.div
              ref={cardRef}
              onMouseMove={handleTilt}
              onMouseLeave={resetTilt}
              style={{ transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
              className="relative rounded-3xl border border-white/8 bg-[#080d13]/80 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] backdrop-blur-xl transition-transform duration-200"
            >
              <div className="absolute inset-x-6 top-6 mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="rounded-3xl p-2 md:p-3">
                <Chatbot initialOpen fullScreen hideFab />
              </div>
            </motion.div>
          </section>

          <section className="relative mt-10 md:mt-14">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_380px]">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="rounded-3xl border border-white/6 bg-[#070b10]/80 px-6 py-8 backdrop-blur-xl"
              >
                <h3 className="text-base font-semibold text-slate-200">Designed for calm focus</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  Conversations stay centred within a distraction-free surface. Toggle full-screen mode inside the assistant whenever you want to immerse deeply.
                </p>
                <dl className="mt-6 grid gap-4 text-xs text-slate-300 md:grid-cols-3">
                  <div>
                    <dt className="font-medium text-slate-200">Privacy first</dt>
                    <dd className="mt-1 leading-6">Local storage consent with a transparent policy.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-200">Live context</dt>
                    <dd className="mt-1 leading-6">Keeps track of Aryan’s latest releases and updates.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-200">Responsive</dt>
                    <dd className="mt-1 leading-6">Smooth on any device with refined motion cues.</dd>
                  </div>
                </dl>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
                className="relative rounded-3xl border border-white/6 bg-gradient-to-br from-white/6 via-white/2 to-transparent p-[1px]"
              >
                <div className="rounded-[22px] bg-[#070b10]/85 p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-200">Playlist companion</h3>
                    <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Live</span>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-slate-400">
                    Pair the conversation with ambient tracks curated by Aryan to match the vibe of the current session.
                  </p>
                  <div className="mt-5 overflow-hidden rounded-2xl border border-white/5 bg-[#080d13]/90">
                    <SpotifySection />
                  </div>
                </div>
              </motion.div>
            </div>
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
                    <h2 className="text-base font-semibold text-slate-100">Before you start</h2>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Privacy</span>
                  </div>
                  <div className="px-6 py-5 text-sm text-slate-300">
                    <p className="leading-6 text-slate-300">
                      Review and accept the AI Privacy Policy to enable the assistant. It outlines what is stored locally and how to revoke access.
                    </p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-400">
                      <li className="flex gap-2">
                        <span className="bullet" />
                        <span>Chat history lives in your browser and is fully disposable.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="bullet" />
                        <span>Spotify connection is local-only and optional.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="bullet" />
                        <span>Light usage analytics improve model quality over time.</span>
                      </li>
                    </ul>
                    <a
                      href="/ai-privacy"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-cyan-300 hover:text-cyan-200"
                    >
                      Read the AI Privacy Policy
                    </a>
                    <label className="mt-5 flex items-start gap-3 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={agree}
                        onChange={(event) => setAgree(event.target.checked)}
                        className="mt-[2px] h-4 w-4 rounded border-white/20 bg-white/5"
                      />
                      <span>I understand and agree to the AI Privacy Policy.</span>
                    </label>
                  </div>
                  <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
                    <a
                      href="/"
                      className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300 transition hover:bg-white/5"
                    >
                      Decline
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
                      className={`rounded-full border px-5 py-2 text-xs font-medium transition ${agree ? 'border-cyan-400/40 bg-cyan-500/20 text-cyan-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.32)]' : 'border-white/10 bg-white/5 text-slate-500 cursor-not-allowed'}`}
                    >
                      Accept & Continue
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style jsx>{`
        .chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0.45rem 0.9rem;
          background: rgba(148, 163, 184, 0.08);
          border: 1px solid rgba(148, 163, 184, 0.18);
        }
        .bullet {
          margin-top: 0.4rem;
          height: 6px;
          width: 6px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.9), rgba(99, 102, 241, 0.9));
          flex-shrink: 0;
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
