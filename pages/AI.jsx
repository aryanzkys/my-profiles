import dynamic from 'next/dynamic';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import ParticleField from '../components/ParticleField';
import ShutdownOverlay from '../components/ShutdownOverlay';
import aiPrivacy from '../data/ai_privacy.json';

const PHRASES = [
  "Your AI Assistant, Ready to Help",
  "Ask Me Anything About Aryan",
  "Here to Answer Your Questions",
  "Explore Projects & Insights",
  "Let's Discuss Technology",
  "Available 24/7 for You",
  "Powered by Advanced AI",
  "Smart Conversations, Better Results"
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
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
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
    setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
    setDisplayedText('');
    setIsTyping(true);
  }, []);

  const retreatPhrase = useCallback(() => {
    setPhraseIndex((prev) => (prev - 1 + PHRASES.length) % PHRASES.length);
    setDisplayedText('');
    setIsTyping(true);
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

  // Typewriter effect
  useEffect(() => {
    const currentPhrase = PHRASES[phraseIndex];
    if (displayedText.length < currentPhrase.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
      }, 50); // Typing speed
      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
      // Auto-advance to next phrase after completion
      const advanceTimeout = setTimeout(() => {
        advancePhrase();
      }, 3000); // Wait 3s before next phrase
      return () => clearTimeout(advanceTimeout);
    }
  }, [displayedText, phraseIndex, advancePhrase]);

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
  }, [phraseIndex]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100">
      <Head>
        <title>AI Assistant - AryanStack</title>
        <meta name="robots" content="index,follow" />
        <meta name="description" content="Chat with Aryan's AI Assistant - intelligent conversations powered by advanced AI technology" />
        <meta name="keywords" content="AI, chatbot, AI Assistant, AryanStack, Aryan AI, Aryan Zaky Prayogo, artificial intelligence" />
        <link rel="canonical" href="https://aryanstack.netlify.app/ai" />
      </Head>

      {/* Modern gradient background effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Gradient mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.15),transparent_50%),radial-gradient(circle_at_40%_80%,rgba(52,211,153,0.1),transparent_50%)]" />
        
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-1/4 -right-48 h-96 w-96 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-purple-500/30 blur-3xl"
        />
        
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />
        
        {/* Particle field */}
        <ParticleField className="opacity-[0.08]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Modern Header */}
        <header className="w-full border-b border-white/5 backdrop-blur-xl relative bg-gradient-to-b from-slate-900/50 to-transparent">

          <div className="container mx-auto px-4 py-16 md:py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="max-w-4xl mx-auto text-center space-y-8"
            >
              {/* Status Badge */}
              <div className="flex items-center justify-center gap-3">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                />
                <span className="text-sm text-slate-400 font-medium">
                  AI Assistant Online
                </span>
              </div>

              {/* Main Heading with Typewriter */}
              <div className="space-y-4">
                <h1 className="sr-only">{PHRASES[phraseIndex]}</h1>
                
                <motion.div
                  className="relative cursor-pointer group"
                  onClick={advancePhrase}
                  onKeyDown={handleKeyDown}
                  role="button"
                  tabIndex={0}
                  aria-label={`${PHRASES[phraseIndex]} - click to change`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent leading-tight">
                    {displayedText}
                    {isTyping && (
                      <motion.span
                        className="inline-block ml-2 w-1 h-[0.9em] bg-gradient-to-b from-cyan-400 to-fuchsia-400 align-middle"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
                  </div>
                  
                  {/* Gradient underline effect */}
                  <motion.div
                    className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0 rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </motion.div>
                
                <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                  Discover insights about Aryan's projects, experience, and technical expertise through intelligent conversations powered by advanced AI.
                </p>
              </div>
              
              {/* Feature Pills */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                <div className="px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 text-cyan-300 backdrop-blur-sm">
                  <span className="mr-2">💬</span>
                  Natural Conversations
                </div>
                <div className="px-4 py-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/5 text-fuchsia-300 backdrop-blur-sm">
                  <span className="mr-2">⚡</span>
                  Instant Responses
                </div>
                <div className="px-4 py-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 text-emerald-300 backdrop-blur-sm">
                  <span className="mr-2">🎵</span>
                  Spotify Integration
                </div>
                <div className="px-4 py-2 rounded-full border border-blue-400/20 bg-blue-400/5 text-blue-300 backdrop-blur-sm">
                  <span className="mr-2">🔒</span>
                  Privacy First
                </div>
              </div>

              {/* Example Questions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
              >
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-cyan-400/20 hover:bg-white/[0.04] transition-all duration-300">
                  <div className="text-cyan-400 text-sm font-medium mb-2">Projects</div>
                  <div className="text-xs text-slate-400">"Tell me about Aryan's latest work"</div>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-fuchsia-400/20 hover:bg-white/[0.04] transition-all duration-300">
                  <div className="text-fuchsia-400 text-sm font-medium mb-2">Experience</div>
                  <div className="text-xs text-slate-400">"What technologies does he specialize in?"</div>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-emerald-400/20 hover:bg-white/[0.04] transition-all duration-300">
                  <div className="text-emerald-400 text-sm font-medium mb-2">Contact</div>
                  <div className="text-xs text-slate-400">"How can I collaborate with Aryan?"</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </header>

        <main className="container mx-auto flex w-full flex-1 flex-col px-4 pb-20 pt-12 md:px-6">
          {/* Chatbot Section */}
          <section className="relative isolate max-w-5xl mx-auto w-full">
            {/* Ambient glow */}
            <div className="absolute -inset-x-6 -top-10 bottom-0 rounded-[44px] bg-gradient-to-br from-cyan-500/10 via-fuchsia-500/10 to-transparent blur-[120px]" />
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              ref={cardRef}
              onMouseMove={handleTilt}
              onMouseLeave={resetTilt}
              style={{ transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-transform duration-200"
            >
              {/* Gradient border effect */}
              <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-br from-cyan-400/20 via-fuchsia-400/20 to-transparent pointer-events-none" />
              
              <div className="rounded-3xl p-2 md:p-3">
                <Chatbot initialOpen fullScreen hideFab />
              </div>
            </motion.div>
          </section>

          {/* Spotify & Features Section */}
          <section className="relative mt-16 grid gap-8 lg:grid-cols-2 max-w-6xl mx-auto w-full">
            {/* Spotify Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl shadow-xl"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-400/30 flex items-center justify-center">
                      <svg className="h-6 w-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">Spotify Player</div>
                      <div className="text-xs text-slate-400">Music while you chat</div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-slate-400 leading-relaxed">
                  Listen to Aryan's curated playlist while exploring the AI assistant. Perfect ambient music for productive conversations.
                </p>
                
                <div className="overflow-hidden rounded-xl border border-white/5 bg-black/20">
                  <SpotifySection />
                </div>
              </div>
            </motion.div>
            
            {/* Features Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl shadow-xl p-6"
            >
              <h3 className="text-lg font-semibold text-slate-200 mb-6">Key Features</h3>
              <div className="grid gap-4">
                <div className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-cyan-400/20 hover:bg-white/[0.04] transition-all duration-300">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-400/20 to-cyan-600/20 border border-cyan-400/30 flex items-center justify-center">
                    <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 mb-1">Natural Dialogue</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">Conversational AI that understands context and provides relevant, detailed answers.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-fuchsia-400/20 hover:bg-white/[0.04] transition-all duration-300">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-fuchsia-400/20 to-fuchsia-600/20 border border-fuchsia-400/30 flex items-center justify-center">
                    <svg className="h-5 w-5 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 mb-1">Fast & Reliable</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">Powered by advanced AI with instant response times and high accuracy.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-emerald-400/20 hover:bg-white/[0.04] transition-all duration-300">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-400/30 flex items-center justify-center">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 mb-1">Privacy Focused</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">Your conversations are private and secure with transparent data practices.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-blue-400/20 hover:bg-white/[0.04] transition-all duration-300">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400/20 to-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                    <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 mb-1">Always Available</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">Access from any device, anytime. Responsive design for desktop, tablet, and mobile.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Privacy Consent Modal */}
          <AnimatePresence>
            {consentLoaded && !consented && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                aria-modal="true"
                role="dialog"
              >
                <motion.div
                  initial={{ y: 20, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 12, opacity: 0, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/95 to-slate-950/95 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-fuchsia-400/20 border border-cyan-400/30 flex items-center justify-center">
                        <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-slate-200">Privacy Notice</h2>
                        <p className="text-xs text-slate-400">Please review before continuing</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Before using the AI assistant, please review our privacy practices. We're committed to transparency and protecting your data.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-400/30 flex items-center justify-center">
                            <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-200 mb-1">Private Conversations</div>
                          <div className="text-xs text-slate-400">Your messages are not stored permanently. Clear your conversation anytime.</div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400/20 to-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                            <svg className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-200 mb-1">Optional Integration</div>
                          <div className="text-xs text-slate-400">Spotify integration is completely optional and can be disconnected anytime.</div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-cyan-400/20 to-cyan-600/20 border border-cyan-400/30 flex items-center justify-center">
                            <svg className="h-3 w-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-200 mb-1">Quality Monitoring</div>
                          <div className="text-xs text-slate-400">Conversations may be reviewed to improve response quality and accuracy.</div>
                        </div>
                      </div>
                    </div>
                    
                    <a
                      href="/ai-privacy"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Read Full Privacy Policy
                    </a>
                    
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02] cursor-pointer hover:border-cyan-400/20 hover:bg-white/[0.04] transition-all duration-300">
                      <input
                        type="checkbox"
                        checked={agree}
                        onChange={(event) => setAgree(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-400 focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-0"
                      />
                      <span className="text-xs text-slate-300 leading-relaxed">
                        I understand and agree to the AI privacy practices outlined above.
                      </span>
                    </label>
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
                    <a
                      href="/"
                      className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-300 hover:bg-white/5 transition-all duration-300"
                    >
                      Maybe Later
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
                      className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        agree 
                          ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:scale-105' 
                          : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {agree ? 'Continue to AI Assistant' : 'Please Accept'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {aiShutdown && <ShutdownOverlay />}
        </main>
      </div>

      <style jsx global>{`
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.3);
          border-radius: 5px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(56, 189, 248, 0.5);
        }
      `}</style>
    </div>
  );
}
