import Head from 'next/head';
import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CV_VIEW_URL = 'https://drive.google.com/file/d/1c7KeejQq-sDxC1FbnEUGiKUEkHDn2iOf/preview';
const CV_DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=1c7KeejQq-sDxC1FbnEUGiKUEkHDn2iOf';
const LOADING_DURATION = 2;

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'preview', label: 'Preview' },
  { id: 'details', label: 'Snapshot' }
];

const stats = [
  { label: 'Last Update', value: 'October 2025' },
  { label: 'Pages', value: '1' },
  { label: 'Format', value: 'PDF' }
];

export default function CvShowcasePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeLeft, setTimeLeft] = useState(LOADING_DURATION);
  const [showContent, setShowContent] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState({ message: '', isError: false });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const countdown = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(countdown);
          setShowContent(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdown);
  }, []);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setEmailStatus({ message: '', isError: false });

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus({ message: 'Please enter a valid email address', isError: true });
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch('/.netlify/functions/send-cv-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailStatus({ message: data.message || 'My CV has been successfully sent to your email!', isError: false });
        setEmail('');
        setTimeout(() => {
          setShowEmailModal(false);
          setEmailStatus({ message: '', isError: false });
        }, 3000);
      } else {
        setEmailStatus({ message: data.error || 'Failed to send to your inbox, try again!', isError: true });
      }
    } catch (error) {
      setEmailStatus({ message: 'An error has occurred. Please try again.', isError: true });
    } finally {
      setIsSending(false);
    }
  };

  const tabContent = useMemo(() => {
    if (activeTab === 'preview') {
      return (
        <div className="aspect-[3/4] w-full overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950/80 shadow-2xl">
          <iframe
            title="Aryan Zaky Prayogo CV Preview"
            src={CV_VIEW_URL}
            className="h-full w-full"
            allow="autoplay"
          />
        </div>
      );
    }
    if (activeTab === 'details') {
      return (
        <div className="grid gap-6 md:grid-cols-3">
          {stats.map((item) => (
            <motion.div
              key={item.label}
              className="rounded-2xl border border-neutral-800/60 bg-neutral-900/70 px-5 py-6 backdrop-blur-xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">{item.label}</p>
              <p className="mt-3 text-lg font-semibold text-neutral-50">{item.value}</p>
            </motion.div>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-6 text-left text-neutral-200">
        <p className="text-sm leading-relaxed text-neutral-300">
          My curriculum vitae captures recent DevSecOps, community leadership, and AI-assisted product experiments,
          packaged for one-click sharing. Download the PDF to keep a copy or explore the embedded preview directly.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/70 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-400">Highlights</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-300">
              <li>• DevSecOps automation, cloud-native deployments, ethical tech initiatives.</li>
              <li>• Youth empowerment programs with measurable community outcomes.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/70 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-400">How this works</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-300">
              <li>• Load the embedded preview to skim directly on the site.</li>
              <li>• Use smart download for a ready-to-share PDF.</li>
              <li>• Send CV to your email for easy access anywhere.</li>
              <li>• Need an alternate format? Ping me through AryanStack&apos;s chat assistant.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }, [activeTab]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <Head>
        <title>Aryan’s CV</title>
        <meta
          name="description"
          content="Preview or download Aryan Zaky Prayogo's latest CV directly from the portfolio."
        />
        <meta name="robots" content="index,follow" />
      </Head>

<AnimatePresence>
  {!showContent && (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black backdrop-blur-2xl"
    >
      {/* Luxury Ambient Background */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.4, 0.6, 0.4],
          rotate: [90, 0, 90],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-purple-500/30 blur-3xl"
      />

      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        role="status"
        aria-live="polite"
      >
        {/* Premium Glass Container */}
        <div className="relative overflow-hidden rounded-[32px] p-[1px] bg-gradient-to-br from-cyan-400/30 via-fuchsia-400/30 to-purple-400/30">
          <div className="rounded-[31px] bg-gradient-to-br from-slate-900/95 to-slate-950/95 backdrop-blur-xl px-12 py-16">
            {/* Luxury Spinner */}
            <div className="flex flex-col items-center gap-8">
              <div className="relative h-32 w-32">
                {/* Outer Ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-t-2 border-r-2 border-cyan-400/60"
                />
                {/* Middle Ring */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                  className="absolute inset-3 rounded-full border-b-2 border-l-2 border-fuchsia-400/60"
                />
                {/* Inner Ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="absolute inset-6 rounded-full border-t-2 border-purple-400/60"
                />
                {/* Center Glow */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="absolute inset-0 m-auto h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-400 blur-xl"
                />
                <div className="absolute inset-0 m-auto h-4 w-4 rounded-full bg-gradient-to-br from-cyan-300 to-fuchsia-300 shadow-[0_0_30px_rgba(56,189,248,0.8)]"/>
              </div>

              {/* Elegant Text */}
              <div className="space-y-3 text-center">
                <motion.div
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent bg-[length:200%_auto]"
                >
                  Loading Portfolio
                </motion.div>
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-sm text-slate-400"
                >
                  Preparing your exclusive experience
                </motion.p>
              </div>

              {/* Countdown Badge */}
              <motion.div
                key={timeLeft}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="relative"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/30 to-fuchsia-400/30 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl">
                  <span className="text-3xl font-bold bg-gradient-to-br from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">
                    {timeLeft}
                  </span>
                </div>
              </motion.div>

              {/* Progress Bar */}
              <div className="w-64 h-1 bg-slate-800/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-400"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>


      <div
        className={`relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16 transition-opacity duration-500 ${
          showContent ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
      {/* Premium Ambient Orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 blur-3xl"
        animate={{ 
          scale: [1, 1.15, 1], 
          rotate: [0, 90, 0],
          x: [-50, 50, -50],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-[-200px] left-[5%] h-[500px] w-[500px] rounded-full bg-gradient-to-br from-blue-500/15 to-purple-500/20 blur-3xl"
        animate={{ 
          scale: [1, 0.9, 1], 
          rotate: [0, -120, 0],
          y: [-30, 30, -30],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-[8%] top-[30%] h-[400px] w-[400px] rounded-full bg-gradient-to-br from-emerald-400/15 to-cyan-500/15 blur-3xl"
        animate={{ 
          scale: [1, 1.1, 1], 
          rotate: [0, 60, 0],
          x: [30, -30, 30],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      
      {/* Floating Particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-gradient-to-r from-cyan-400/40 to-fuchsia-400/40"
          style={{
            left: `${(i * 7) % 100}%`,
            top: `${(i * 13) % 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 8 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        />
      ))}

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16">
  <header className="space-y-6 text-center">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-neutral-800/70 bg-neutral-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-neutral-400"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
            Curriculum Vitae
          </motion.div>
          <motion.h1
            className="text-4xl font-semibold tracking-tight text-neutral-50 sm:text-5xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          >
            Aryan’s latest CV
          </motion.h1>
          <motion.p
            className="mx-auto max-w-3xl text-sm leading-relaxed text-neutral-400 sm:text-base"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.18 }}
          >
            Tailored for recruiters, collaborators, and community partners. 
            This live view mirrors the downloadable CV and refreshes every time I update my portfolio.
          </motion.p>
        </header>

        <motion.div
          className="flex flex-col gap-8 lg:flex-row"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.25 }}
        >
          <div className="flex-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-cyan-400/20 via-fuchsia-400/20 to-purple-400/20"
            >
              <div className="rounded-[23px] border border-white/5 bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl p-6 shadow-2xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400/20 to-fuchsia-400/20 border border-cyan-400/30 flex items-center justify-center">
                        <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Smart Download</p>
                        <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">Save My CV</h2>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                      Direct Google Drive download, professionally signed and optimized for ATS parsing.
                    </p>
                  </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {/* Premium Download Button */}
                  <motion.a
                    href={CV_DOWNLOAD_URL}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(56,189,248,0.5)]"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <svg className="relative h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="relative">Download PDF</span>
                  </motion.a>

                  {/* Premium Email Button */}
                  <motion.button
                    onClick={() => setShowEmailModal(true)}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-300 overflow-hidden transition-all duration-300 hover:border-emerald-400/60 hover:bg-emerald-500/20 hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Send to Email</span>
                  </motion.button>

                  {/* Premium Drive Button */}
                  <motion.a
                    href={CV_VIEW_URL.replace('/preview', '/view')}
                    target="_blank"
                    rel="noreferrer"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
                    </svg>
                    <span>Open in Drive</span>
                  </motion.a>
                </div>
              </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-cyan-400/10 via-fuchsia-400/10 to-purple-400/10"
            >
              <div className="rounded-[23px] border border-white/5 bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl p-5">
                {/* Premium Tab Navigation */}
                <div className="flex items-center gap-2 overflow-x-auto text-sm">
                  {tabs.map((tab) => {
                    const isActive = tab.id === activeTab;
                    return (
                      <motion.button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative inline-flex items-center rounded-xl px-5 py-2.5 font-medium transition-all duration-300 ${
                          isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="cv-tab"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-white/10"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="relative flex items-center gap-2">
                          {tab.id === 'overview' && (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                          {tab.id === 'preview' && (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                          {tab.id === 'details' && (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          )}
                          {tab.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                
                {/* Tab Content with Fade Animation */}
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                  >
                    {tabContent}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="flex w-full max-w-[460px] flex-col gap-5 self-stretch"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.35 }}
          >
            {/* Premium Snapshot Card */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/20 via-cyan-400/20 to-blue-400/20"
            >
              <div className="rounded-[23px] border border-white/5 bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 border border-emerald-400/30 flex items-center justify-center">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Snapshot</p>
                    <h3 className="text-base font-semibold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">Why This CV Represents Me</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: '🏆', text: 'Reflects my growth from Olympiad achiever to aspiring DevSecOps engineer.' },
                    { icon: '🤝', text: 'Combines technical, leadership, and community-driven experience.' },
                    { icon: '📄', text: 'Designed to stay professional across digital and printed formats.' }
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.1 }}
                      className="flex gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-emerald-400/20 transition-all duration-300"
                    >
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      <p className="text-sm text-slate-300 leading-relaxed">{item.text}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Premium Custom Format Card */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-fuchsia-400/20 via-purple-400/20 to-blue-400/20"
            >
              <div className="rounded-[23px] border border-white/5 bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-400/20 to-purple-400/20 border border-fuchsia-400/30 flex items-center justify-center">
                    <svg className="h-4 w-4 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Custom Format</p>
                    <h3 className="text-base font-semibold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">Tailored to Your Needs</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-5">
                  Need a customized version? Reach out through the <span className="font-semibold bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">Message to Aryan</span> form or ping the AI assistant for versions in different languages, project focus, or pitch deck references.
                </p>
                <motion.a
                  href="/message-to-aryan"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <svg className="relative h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="relative">Request Custom Version</span>
                </motion.a>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md rounded-3xl border border-neutral-800/60 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-xl"
          >
            <button
              onClick={() => {
                setShowEmailModal(false);
                setEmailStatus({ message: '', isError: false });
                setEmail('');
              }}
              className="absolute right-4 top-4 rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800/60 hover:text-neutral-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-emerald-400">Send to Email</p>
                <h3 className="mt-2 text-xl font-semibold text-neutral-50">Get CV in Your Inbox</h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Enter your email address and we will send a CV download link directly to your inbox.
                </p>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label htmlFor="email-input" className="block text-sm font-medium text-neutral-300">
                    Email Address
                  </label>
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    required
                    disabled={isSending}
                  />
                </div>

                {emailStatus.message && (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      emailStatus.isError
                        ? 'border-red-400/40 bg-red-500/10 text-red-300'
                        : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    {emailStatus.message}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailModal(false);
                      setEmailStatus({ message: '', isError: false });
                      setEmail('');
                    }}
                    className="flex-1 rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800/60"
                    disabled={isSending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex-1 rounded-xl bg-emerald-500/90 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? 'Sending...' : 'Send CV'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
