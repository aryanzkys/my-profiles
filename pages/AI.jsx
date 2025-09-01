import dynamic from 'next/dynamic';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import ParticleField from '../components/ParticleField';

const Chatbot = dynamic(() => import('../components/Chatbot'), { ssr: false });
const SpotifySection = dynamic(() => import('../components/SpotifySection'), { ssr: false });

export default function AIPage() {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const cardRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleTilt = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const ry = (px - 0.5) * (isMobile ? 4 : 10); // rotateY (reduced on mobile)
    const rx = -(py - 0.5) * (isMobile ? 3 : 6); // rotateX (reduced on mobile)
    setTilt({ rx, ry });
  };
  const resetTilt = () => setTilt({ rx: 0, ry: 0 });

  // Interactive RGB title: track mouse X to gently move gradient
  const handleHeaderMove = (e) => {
    const el = headerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    el.style.setProperty('--mx', `${Math.max(0, Math.min(100, px * 100))}%`);
  };
  const resetHeaderMove = () => {
    const el = headerRef.current;
    if (!el) return;
    el.style.setProperty('--mx', '50%');
  };

  return (
  <div className="min-h-screen relative overflow-hidden bg-[#05070a] text-gray-100">
      <Head>
        <title>Aryan’s AI Assistant</title>
        <meta name="robots" content="index,follow" />
        <meta name="description" content="Chat with Aryan’s AI Assistant — trained by Aryan to help you get to know him better." />
      </Head>

      {/* Global background accents: grid, glows, and orbs */}
      <div className="pointer-events-none absolute inset-0">
        {/* soft top glow */}
        <div className="absolute -top-24 right-[-10%] h-[60vh] w-[60vh] rounded-full blur-[110px]" style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(34,211,238,0.22) 0%, rgba(0,0,0,0) 70%)' }} />
        {/* bottom-left glow */}
        <div className="absolute bottom-[-20%] left-[-10%] h-[70vh] w-[70vh] rounded-full blur-[120px]" style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(59,130,246,0.18) 0%, rgba(0,0,0,0) 70%)' }} />
        {/* subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
    {/* ambient particles */}
    <ParticleField />
      </div>

  <header className="relative overflow-hidden" ref={headerRef} onMouseMove={handleHeaderMove} onMouseLeave={resetHeaderMove}>
        {/* hero gradient cone */}
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(60% 40% at 70% 0%, rgba(34,211,238,0.25), transparent 70%)' }} />
        {/* parallax orbs */}
        <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="absolute -top-10 left-5 h-20 w-20 rounded-full bg-cyan-400/10 blur-2xl" />
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, delay: 0.05, ease: 'easeOut' }} className="absolute top-10 right-10 h-28 w-28 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="container mx-auto px-4 py-8 md:py-12">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-3xl md:text-4xl font-semibold leading-[1.2] md:leading-[1.2] flex items-center gap-3"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Coat_of_arms_of_the_United_Kingdom_%282022%2C_variant_2%29.svg/2241px-Coat_of_arms_of_the_United_Kingdom_%282022%2C_variant_2%29.svg.png"
              alt="British coat of arms"
              className="h-8 w-8 md:h-10 md:w-10 object-contain select-none pointer-events-none drop-shadow-[0_0_14px_rgba(34,211,238,0.22)] self-center align-middle"
              loading="eager"
              decoding="async"
            />
            <span className="title-rgb self-center">Aryan’s AI Assistant</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="mt-2 text-[13px] md:text-base text-gray-300 max-w-[720px]">
            Your intelligent gateway to explore Aryan’s journey and insights. Engage freely with the AI Assistant for an immersive and refined experience.
          </motion.p>
          {/* accent underline */}
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }} className="mt-4 h-[2px] w-32 origin-left bg-gradient-to-r from-cyan-400/80 via-sky-400/70 to-blue-400/60 shadow-[0_0_18px_rgba(34,211,238,0.35)]" />
        </div>
      </header>

      <main className="container mx-auto px-3 md:px-4 pb-24">
        {/* Chat section with subtle 3D tilt interaction */}
        <div className="relative mt-2 md:mt-4">
          <div className="grid place-items-center">
            <motion.div
              ref={cardRef}
              onMouseMove={handleTilt}
              onMouseLeave={resetTilt}
              style={{ transform: `perspective(1100px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
              className="w-full max-w-[1080px] px-0.5 md:px-1 transition-transform duration-150 will-change-transform"
            >
              <Chatbot initialOpen={true} fullScreen={true} hideFab={true} />
            </motion.div>
          </div>
          {/* Decorative corner sparks */}
          <div className="pointer-events-none">
            <div className="absolute -z-[1] -top-6 left-2 md:left-6 h-12 md:h-16 w-12 md:w-16 rounded-full blur-3xl bg-cyan-500/20" />
            <div className="absolute -z-[1] -bottom-10 right-4 md:right-10 h-16 md:h-20 w-16 md:w-20 rounded-full blur-3xl bg-blue-500/20" />
          </div>
        </div>

        {/* Inline Spotify section under chat */}
        <div className="mt-4 md:mt-6">
          <div className="relative">
            {/* local particles behind Spotify */}
            <ParticleField className="opacity-[0.2]" />
            <SpotifySection />
          </div>
        </div>
      </main>
      {/* Elegant shining RGB title styles */}
      <style jsx>{`
        .title-rgb {
          display: inline-block;
          position: relative;
          top: -1px; /* nudge up to avoid visual sinking of descenders */
          line-height: 1.25;
          vertical-align: middle;
          white-space: nowrap;
          /* Layer 1: base RGB gradient; Layer 2: subtle moving sheen */
          background-image:
            linear-gradient(90deg,
              rgba(34,211,238,0.95) 0%,
              rgba(96,165,250,0.95) 35%,
              rgba(167,139,250,0.95) 65%,
              rgba(34,211,238,0.95) 100%),
            linear-gradient(115deg,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,0) 40%,
              rgba(255,255,255,0.55) 50%,
              rgba(255,255,255,0) 60%,
              rgba(255,255,255,0) 100%);
          background-size: 200% 100%, 200% 100%;
          background-position: var(--mx, 50%) 50%, -200% 50%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          transition: background-position 120ms ease-out, text-shadow 200ms ease;
          /* Periodic sheen sweep across the text */
          animation: titleSheen 9s ease-in-out infinite 1.2s;
          text-shadow: 0 0 12px rgba(34,211,238,0.12);
        }
        @keyframes titleSheen {
          0%   { background-position: var(--mx, 50%) 50%, -200% 50%; }
          45%  { background-position: var(--mx, 50%) 50%, 120% 50%; }
          50%  { background-position: var(--mx, 50%) 50%, 140% 50%; }
          100% { background-position: var(--mx, 50%) 50%, -200% 50%; }
        }
        /* Subtle emphasis on hover/focus within header */
        header:hover .title-rgb, header:focus-within .title-rgb {
          text-shadow: 0 0 18px rgba(34,211,238,0.18);
        }
      `}</style>
    </div>
  );
}
