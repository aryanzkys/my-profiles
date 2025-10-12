import dynamic from 'next/dynamic';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import ParticleField from '../components/ParticleField';
import ShutdownOverlay from '../components/ShutdownOverlay';
import aiPrivacy from '../data/ai_privacy.json';

const ROLLING_PHRASES = [
  "Yo, it's Your Royal AI Advisor, innit 👑🤖",
  "Fam, let's cook up some mad schemes 💡✨",
  "Bestie, spill the tea—I'm here for it ☕👂",
  "Need that inspo? Say less, love 💫",
  "Lowkey ready to vibe on your next move 🚀",
  "No cap, I got your back fr fr 🫶",
  "Living that royal coding life, mate 💻👑",
  "Straight fire ideas? Let's make it slap 🔥",
  "Rizz up your projects, I'm here to help 💥",
  "Bet, let's get this bread together 🍞✨",
  "Main character energy activated 🌟",
  "Slay the day, your majesty 💅👑"
];


const resolveAiShutdown = (payload) => {
  if (!payload || typeof payload !== 'object') return false;
  const aiSpecific = payload.shutdownAi ?? payload.shutdown_ai ?? payload.shutdownai ?? payload.aiShutdown;
  if (aiSpecific !== undefined && aiSpecific !== null) return !!aiSpecific;
  return !!(payload.shutdown ?? payload.shutdownMain ?? payload.shutdown_main ?? payload.shutdownmain ?? false);
};

const Chatbot = dynamic(() => import('../components/Chatbot'), { ssr: false });
const SpotifySection = dynamic(() => import('../components/SpotifySection'), { ssr: false });

export default function AIPage() {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const cardRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const headerRef = useRef(null);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [rollingPaused, setRollingPaused] = useState(false);
  const [consentLoaded, setConsentLoaded] = useState(false);
  const [consented, setConsented] = useState(false);
  const [agree, setAgree] = useState(false);
  const [aiShutdown, setAiShutdown] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [crownFloat, setCrownFloat] = useState(0);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Crown floating animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCrownFloat(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Mouse tracking for royal glow effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Load consent from localStorage
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

  useEffect(() => {
    let alive = true;
    (async () => {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/get-site-flags',
        `${basePath}/.netlify/functions/get-site-flags`,
        '/api/get-site-flags',
        `${basePath}/api/get-site-flags`,
      ]));
      for (const url of urls) {
        try {
          const r = await fetch(url, { headers: { accept: 'application/json' } });
          if (!r.ok) continue;
          const j = await r.json();
          if (alive) setAiShutdown(resolveAiShutdown(j));
          break;
        } catch {}
      }
    })();
    const onStorage = (e) => {
      if (e.key === 'site:flags') {
        try { const j = JSON.parse(e.newValue || '{}'); setAiShutdown(resolveAiShutdown(j)); } catch {}
      }
    };
    const onEvt = () => {
      try { const j = JSON.parse(localStorage.getItem('site:flags') || '{}'); setAiShutdown(resolveAiShutdown(j)); } catch {}
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('site:flags:updated', onEvt);
    return () => {
      alive = false;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('site:flags:updated', onEvt);
    };
  }, []);

  const handleTilt = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * (isMobile ? 3 : 8);
    const rx = -(py - 0.5) * (isMobile ? 2 : 5);
    setTilt({ rx, ry });
  };
  const resetTilt = () => setTilt({ rx: 0, ry: 0 });

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

  const advancePhrase = useCallback(() => {
    setPhraseIndex((prev) => (prev + 1) % ROLLING_PHRASES.length);
  }, []);

  const retreatPhrase = useCallback(() => {
    setPhraseIndex((prev) => (prev - 1 + ROLLING_PHRASES.length) % ROLLING_PHRASES.length);
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      advancePhrase();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      advancePhrase();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      retreatPhrase();
    }
  }, [advancePhrase, retreatPhrase]);

  useEffect(() => {
    if (rollingPaused) return;
    const id = window.setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % ROLLING_PHRASES.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [rollingPaused]);

  const radius = isMobile 
    ? Math.min(120, 20 + ROLLING_PHRASES.length * 12) 
    : Math.min(200, 30 + ROLLING_PHRASES.length * 18);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#1a2a4e] to-[#0f1b3a] text-slate-100">
      <Head>
        <title>Aryan's AI Assistant</title>
        <meta name="robots" content="index,follow" />
        <meta name="description" content="Chat with Aryan's Royal AI Assistant - your personal guide to everything Aryan, served with that UK royal flair!" />
        <meta name="keywords" content="AI, chatbot, Royal AI, AryanStack, Aryan AI Assistant, Aryan Zaky Prayogo, Royal Blue Medieval" />
        <link rel="canonical" href="https://aryanstack.netlify.app/ai" />
      </Head>

      {/* Royal background effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Medieval tapestry pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234169e1' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
        }} />
        
        {/* Royal blue radial gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(65,105,225,0.25),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(30,144,255,0.2),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(138,43,226,0.15),transparent_60%)]" />
        
        {/* Gold accent gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,rgba(255,215,0,0.08),transparent_40%),radial-gradient(circle_at_90%_60%,rgba(218,165,32,0.06),transparent_45%)]" />
        
        {/* Particle field with royal blue tint */}
        <ParticleField className="opacity-[0.12]" />
        
        {/* Animated crown floating elements */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-4xl opacity-20"
              style={{
                left: `${(i * 15 + 10) % 100}%`,
                top: `${(i * 25 + 5) % 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 8 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            >
              👑
            </motion.div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Royal Header with crown */}
        <header
          ref={headerRef}
          onMouseMove={handleHeaderMove}
          onMouseLeave={resetHeaderMove}
          onMouseEnter={() => {
            const el = headerRef.current;
            if (el) el.style.setProperty('--glow', '1');
          }}
          className="w-full border-b border-yellow-500/20 backdrop-blur-sm relative"
          style={{
            background: 'linear-gradient(180deg, rgba(65,105,225,0.15) 0%, rgba(26,42,78,0.05) 100%)',
          }}
        >
          {/* Royal crest decoration */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={{
                y: [0, -5, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-6xl filter drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]"
            >
              👑
            </motion.div>
          </div>

          <div className="container mx-auto px-4 py-12 md:py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="grid gap-12 md:grid-cols-[minmax(0,1fr)_380px] md:items-end"
            >
              <div className="space-y-6">
                <span className="inline-flex items-center rounded-full border-2 border-yellow-500/40 bg-blue-900/40 px-6 py-2.5 text-xs uppercase tracking-[0.28em] text-yellow-200 font-bold backdrop-blur-md shadow-[0_0_25px_rgba(255,215,0,0.3)]">
                  ⚜️ Royal AI Court ⚜️
                </span>
                
                <div className="space-y-4">
                  <h1 className="sr-only">{ROLLING_PHRASES[phraseIndex]}</h1>
                  
                  {/* Enhanced 3D Carousel with Royal Styling */}
                  <div
                    className="hero-roller royal-theme"
                    role="button"
                    tabIndex={0}
                    aria-label={`${ROLLING_PHRASES[phraseIndex]} - tap to shuffle`}
                    onMouseEnter={() => setRollingPaused(true)}
                    onMouseLeave={() => setRollingPaused(false)}
                    onFocus={() => setRollingPaused(true)}
                    onBlur={() => setRollingPaused(false)}
                    onClick={advancePhrase}
                    onKeyDown={handleKeyDown}
                  >
                    {/* Royal Avatar with 3D animation */}
                    <div className="hero-roller__avatar royal-avatar" aria-hidden="true">
                      <span />
                      <span />
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center text-3xl"
                        animate={{
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        🤖
                      </motion.div>
                    </div>
                    
                    <div
                      className="hero-roller__scene"
                      style={{
                        '--active-index': `${phraseIndex}`,
                        '--card-count': `${ROLLING_PHRASES.length}`,
                        '--radius': `${radius}px`
                      }}
                    >
                      {ROLLING_PHRASES.map((phrase, idx) => (
                        <span
                          key={phrase}
                          className={`roller-card royal-card ${idx === phraseIndex ? 'is-active' : ''}`}
                          style={{ '--i': idx }}
                          aria-hidden={idx !== phraseIndex}
                        >
                          {phrase}
                        </span>
                      ))}
                    </div>
                    <div className="hero-roller__glow royal-glow" aria-hidden="true" />
                  </div>
                  
                  <p className="max-w-xl text-sm leading-7 text-blue-100 md:text-base font-medium">
                    Ayo fam, peep the latest on what Aryan's been cooking, how the vibes are hitting, and all the lowkey tea behind the scenes. 
                    Ask me whatever, stay curious, and keep it 100. 👑✨
                  </p>
                </div>
                
                {/* Royal Feature Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="royal-highlight-card">
                    <div className="text-2xl mb-2">💬</div>
                    <h3>Shoot your shot</h3>
                    <p>Ask about projects, backstory, or what's bussin' right now, mate.</p>
                  </div>
                  <div className="royal-highlight-card">
                    <div className="text-2xl mb-2">✨</div>
                    <h3>Vibes on point</h3>
                    <p>Clean aesthetic so the chat stays fire and center, innit.</p>
                  </div>
                  <div className="royal-highlight-card">
                    <div className="text-2xl mb-2">🎵</div>
                    <h3>Level up the mood</h3>
                    <p>Spotify slaps add that perfect soundtrack while you vibe, fr fr.</p>
                  </div>
                </div>
              </div>
              
              {/* Quick Start Royal Panel */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
                className="w-full rounded-[26px] border-2 border-yellow-500/30 bg-gradient-to-br from-blue-900/40 to-purple-900/30 px-7 py-8 backdrop-blur-md shadow-[0_0_30px_rgba(65,105,225,0.3)]"
              >
                <h2 className="text-sm font-bold text-yellow-200 uppercase tracking-wider">🏰 Enter the Royal Court</h2>
                <p className="mt-3 text-xs leading-6 text-blue-100">
                  Say wassup, ask for inspo, or drop what you're vibing on and this assistant keeps it real and lowkey fire, bestie. 💯
                </p>
                <div className="mt-6 space-y-3 text-xs text-blue-50">
                  <div className="royal-mini-pill">"Yo, what's Aryan geeked about this week? 🔥"</div>
                  <div className="royal-mini-pill">"Need a playlist for deep focus? Hook me up, fam 🎧"</div>
                  <div className="royal-mini-pill">"Spill the tea on the craziest project you've shipped 💅"</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </header>

        <main className="container mx-auto flex w-full flex-1 flex-col px-4 pb-20 pt-10 md:px-6">
          {/* Royal Chatbot Section */}
          <section className="relative isolate">
            <div className="absolute -inset-x-6 -top-10 bottom-0 rounded-[44px] bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent blur-[110px]" />
            
            <motion.div
              ref={cardRef}
              onMouseMove={handleTilt}
              onMouseLeave={resetTilt}
              style={{ transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
              className="relative overflow-hidden rounded-[34px] border-2 border-yellow-500/20 bg-gradient-to-br from-blue-950/90 to-purple-950/80 shadow-[0_30px_80px_-40px_rgba(65,105,225,0.6),0_0_50px_rgba(255,215,0,0.15)] backdrop-blur-xl transition-transform duration-200"
            >
              {/* Royal decorative top border */}
              <div className="absolute inset-x-10 top-6 h-[2px] bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
              
              {/* Corner crown decorations */}
              <div className="absolute top-4 left-4 text-2xl opacity-60">👑</div>
              <div className="absolute top-4 right-4 text-2xl opacity-60">👑</div>
              
              <div className="rounded-[34px] p-2 md:p-3">
                <Chatbot initialOpen fullScreen hideFab />
              </div>
            </motion.div>
          </section>

          {/* Spotify & Features Royal Section */}
          <section className="relative mt-12 grid gap-6 md:grid-cols-[400px_minmax(0,1fr)] md:items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative overflow-hidden rounded-[30px] border-2 border-yellow-500/25 bg-gradient-to-br from-blue-900/50 via-purple-900/30 to-blue-950/40 p-[1px] shadow-[0_0_40px_rgba(65,105,225,0.25)]"
            >
              <div className="rounded-[28px] backdrop-blur-xl p-6">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-yellow-200 font-bold">
                  <span>🎶 Royal Playlist</span>
                  <span>Spotify</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-blue-100">
                  Queue up Aryan's bangers while you chat, fam. The playlist stays locked in with the vibe so the convo never misses, fr fr. 🔥
                </p>
                <div className="mt-6 overflow-hidden rounded-2xl border-2 border-yellow-500/20 bg-gradient-to-br from-blue-950/90 to-purple-950/70 shadow-inner">
                  <SpotifySection />
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
              className="rounded-[30px] border-2 border-yellow-500/25 bg-gradient-to-br from-blue-900/40 to-purple-900/30 px-8 py-10 backdrop-blur-xl shadow-[0_0_40px_rgba(65,105,225,0.25)]"
            >
              <h3 className="text-base font-bold text-yellow-200 uppercase tracking-wider">Why this hits different, innit 👑</h3>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="royal-feature">
                  <h4>🗣️ No cap energy</h4>
                  <p>Feels like texting Aryan directly—no stiff robot vibes, just pure authenticity, bestie.</p>
                </div>
                <div className="royal-feature">
                  <h4>🎯 Locked in fr</h4>
                  <p>Answers stay on point with whatever you throw into the mix, no fumbling the bag.</p>
                </div>
                <div className="royal-feature">
                  <h4>🌍 Always around</h4>
                  <p>Jump in from any device—zero prep, just vibes. Mobile, tablet, desktop? We got you, mate.</p>
                </div>
                <div className="royal-feature">
                  <h4>✨ Royal smooth</h4>
                  <p>Majestic visuals and buttery animations keep the focus on you, your highness.</p>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Royal Consent Modal */}
          <AnimatePresence>
            {consentLoaded && !consented && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                aria-modal="true"
                role="dialog"
              >
                <motion.div
                  initial={{ y: 20, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 12, opacity: 0, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  className="relative mx-5 w-full max-w-lg rounded-3xl border-2 border-yellow-500/30 bg-gradient-to-br from-blue-950/95 to-purple-950/90 shadow-[0_30px_80px_-30px_rgba(65,105,225,0.7),0_0_60px_rgba(255,215,0,0.2)] backdrop-blur-xl"
                >
                  {/* Crown decoration */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl filter drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">
                    👑
                  </div>
                  
                  <div className="flex items-center justify-between gap-3 border-b-2 border-yellow-500/20 px-6 py-5 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
                    <h2 className="text-base font-bold text-yellow-200 uppercase tracking-wider">Before we link up, fam</h2>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-blue-200 font-semibold">Royal Protocol</span>
                  </div>
                  
                  <div className="px-6 py-5 text-sm text-blue-100">
                    <p className="leading-6 text-blue-100 font-medium">
                      Ayo bestie, we keep it transparent so you can chat without the stress, fr fr. 
                      Quick peek at the AI policy and we're gucci to go! 👑✨
                    </p>
                    <ul className="mt-4 space-y-2 text-xs text-blue-200">
                      <li className="flex gap-2">
                        <span className="royal-bullet" />
                        <span>Your convo stays with you—bounce anytime and poof, it's gone, no cap.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="royal-bullet" />
                        <span>Spotify plug is totally optional, mate. Disconnect if you're not vibing with it.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="royal-bullet" />
                        <span>We monitor the vibes so replies stay fresh, helpful, and lowkey fire.</span>
                      </li>
                    </ul>
                    <a
                      href="/ai-privacy"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-yellow-300 hover:text-yellow-200 underline decoration-yellow-400/50 hover:decoration-yellow-300"
                    >
                      📜 Read the Royal AI Policy
                    </a>
                    <label className="mt-5 flex items-start gap-3 text-xs text-blue-100 font-medium">
                      <input
                        type="checkbox"
                        checked={agree}
                        onChange={(event) => setAgree(event.target.checked)}
                        className="mt-[2px] h-4 w-4 rounded border-yellow-400/30 bg-blue-900/30 accent-yellow-500"
                      />
                      <span>Bet, I'm in! Let's get this bread. 🍞</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-end gap-3 border-t-2 border-yellow-500/20 px-6 py-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
                    <a
                      href="/"
                      className="rounded-full border-2 border-yellow-500/30 px-4 py-2 text-xs text-blue-100 font-medium transition hover:bg-yellow-500/10 hover:border-yellow-400/50"
                    >
                      Maybe later, fam
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
                      className={`rounded-full border-2 px-6 py-2 text-xs font-bold uppercase tracking-wider transition shadow-lg ${
                        agree 
                          ? 'border-yellow-400/60 bg-gradient-to-r from-yellow-500/30 to-yellow-600/20 text-yellow-100 hover:shadow-[0_0_25px_rgba(255,215,0,0.4)] hover:scale-105' 
                          : 'border-gray-600/30 bg-gray-800/20 text-gray-500 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {agree ? '🚀 Let\'s gooo!' : '⏳ Check the box'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {aiShutdown && <ShutdownOverlay />}
        </main>
      </div>

      <style jsx>{`
        .hero-roller.royal-theme {
          position: relative;
          display: flex;
          align-items: center;
          gap: clamp(1rem, 3vw, 1.8rem);
          border-radius: 999px;
          padding: clamp(0.75rem, 1.6vw, 1.1rem) clamp(1rem, 2.5vw, 1.6rem);
          background: linear-gradient(135deg, rgba(65, 105, 225, 0.25), rgba(138, 43, 226, 0.2));
          border: 2px solid rgba(255, 215, 0, 0.3);
          box-shadow: 0 25px 60px -35px rgba(65, 105, 225, 0.5), 0 0 40px rgba(255, 215, 0, 0.15);
          cursor: pointer;
          perspective: 1400px;
          transition: border-color 180ms ease, box-shadow 220ms ease, transform 220ms ease;
        }
        .hero-roller.royal-theme:focus-visible {
          outline: none;
          border-color: rgba(255, 215, 0, 0.7);
          box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.2), 0 30px 70px -40px rgba(255, 215, 0, 0.55);
        }
        .hero-roller.royal-theme:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 36px 90px -40px rgba(65, 105, 225, 0.6), 0 0 50px rgba(255, 215, 0, 0.25);
          border-color: rgba(255, 215, 0, 0.5);
        }
        
        .hero-roller__avatar.royal-avatar {
          position: relative;
          width: clamp(56px, 8vw, 72px);
          height: clamp(56px, 8vw, 72px);
          border-radius: 28px;
          background: radial-gradient(circle at 30% 30%, rgba(255, 215, 0, 0.6), rgba(65, 105, 225, 0.4));
          overflow: hidden;
          box-shadow: inset 0 0 30px rgba(65, 105, 225, 0.4), 0 18px 45px -24px rgba(255, 215, 0, 0.5);
          border: 2px solid rgba(255, 215, 0, 0.3);
        }
        .hero-roller__avatar.royal-avatar span {
          position: absolute;
          inset: -20%;
          background: conic-gradient(from 0deg, rgba(255, 215, 0, 0.6), rgba(65, 105, 225, 0.0) 45%, rgba(138, 43, 226, 0.4) 75%, rgba(255, 215, 0, 0.7));
          animation: royalOrbit 12s linear infinite;
        }
        .hero-roller__avatar.royal-avatar span:nth-child(2) {
          animation-duration: 18s;
          mix-blend-mode: screen;
          opacity: 0.8;
        }
        @keyframes royalOrbit {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.03);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }
        
        .hero-roller__scene {
          position: relative;
          width: clamp(220px, 50vw, 520px);
          height: clamp(64px, 7vw, 84px);
          transform-style: preserve-3d;
          transition: transform 0.85s cubic-bezier(0.22, 1, 0.36, 1);
          transform-origin: center center;
        }
        
        .roller-card.royal-card {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 clamp(1rem, 3vw, 1.6rem);
          font-size: clamp(1.6rem, 4vw, 2.8rem);
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          border-radius: clamp(30px, 6vw, 42px);
          background: linear-gradient(135deg, rgba(65, 105, 225, 0.3), rgba(138, 43, 226, 0.25));
          border: 2px solid rgba(255, 215, 0, 0.25);
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(255, 215, 0, 0.1);
          transform: rotateX(calc(var(--i) * (360deg / var(--card-count)))) translateZ(var(--radius));
          backface-visibility: hidden;
        }
        .roller-card.royal-card.is-active {
          color: rgba(255, 255, 255, 1);
          border-color: rgba(255, 215, 0, 0.8);
          box-shadow: inset 0 0 40px rgba(255, 215, 0, 0.3), 0 32px 80px -38px rgba(255, 215, 0, 0.6);
          background: linear-gradient(135deg, rgba(65, 105, 225, 0.5), rgba(138, 43, 226, 0.4));
        }
        
        .hero-roller__glow.royal-glow {
          position: absolute;
          inset: 8%;
          border-radius: inherit;
          pointer-events: none;
          background: radial-gradient(circle at 60% 40%, rgba(255, 215, 0, 0.25), transparent 65%);
          mix-blend-mode: screen;
          opacity: 0.85;
        }
        
        .royal-bullet {
          margin-top: 0.4rem;
          height: 8px;
          width: 8px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(255, 215, 0, 1), rgba(218, 165, 32, 1));
          flex-shrink: 0;
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }
        
        .royal-highlight-card {
          border-radius: 20px;
          border: 2px solid rgba(255, 215, 0, 0.2);
          background: linear-gradient(135deg, rgba(65, 105, 225, 0.25), rgba(138, 43, 226, 0.15));
          padding: 1.5rem;
          backdrop-filter: blur(12px);
          color: rgba(255, 255, 255, 0.95);
          transition: all 0.3s ease;
          box-shadow: 0 0 20px rgba(65, 105, 225, 0.2);
        }
        .royal-highlight-card:hover {
          border-color: rgba(255, 215, 0, 0.4);
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
          transform: translateY(-2px);
        }
        .royal-highlight-card h3 {
          font-size: 0.85rem;
          font-weight: 700;
          margin-bottom: 0.6rem;
          color: rgba(255, 215, 0, 0.95);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .royal-highlight-card p {
          font-size: 0.8rem;
          line-height: 1.6;
          color: rgba(200, 220, 255, 0.9);
        }
        
        .royal-mini-pill {
          display: inline-flex;
          border-radius: 999px;
          border: 2px solid rgba(255, 215, 0, 0.25);
          background: linear-gradient(135deg, rgba(65, 105, 225, 0.3), rgba(138, 43, 226, 0.2));
          padding: 0.6rem 1rem;
          font-weight: 600;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .royal-mini-pill:hover {
          border-color: rgba(255, 215, 0, 0.4);
          background: linear-gradient(135deg, rgba(65, 105, 225, 0.4), rgba(138, 43, 226, 0.3));
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
        }
        
        .royal-feature {
          border-radius: 20px;
          border: 2px solid rgba(255, 215, 0, 0.2);
          background: linear-gradient(135deg, rgba(65, 105, 225, 0.2), rgba(138, 43, 226, 0.15));
          padding: 1.35rem;
          transition: all 0.3s ease;
          box-shadow: 0 0 20px rgba(65, 105, 225, 0.15);
        }
        .royal-feature:hover {
          border-color: rgba(255, 215, 0, 0.35);
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.25);
          transform: translateY(-2px);
        }
        .royal-feature h4 {
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: rgba(255, 215, 0, 0.95);
        }
        .royal-feature p {
          font-size: 0.82rem;
          line-height: 1.6;
          color: rgba(200, 220, 255, 0.9);
        }
        
        @media (max-width: 768px) {
          .hero-roller.royal-theme {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }
          .hero-roller__scene {
            width: 100%;
            max-width: 280px;
          }
        }
      `}</style>
    </div>
  );
}
