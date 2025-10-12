import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

const CV_VIEW_URL = 'https://drive.google.com/file/d/1c7KeejQq-sDxC1FbnEUGiKUEkHDn2iOf/preview';
const CV_DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=1c7KeejQq-sDxC1FbnEUGiKUEkHDn2iOf';
const LOADING_DURATION = 5;

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
      setEmailStatus({ message: 'Masukkan alamat email yang valid', isError: true });
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
        setEmailStatus({ message: data.message || 'CV berhasil dikirim ke email Anda!', isError: false });
        setEmail('');
        setTimeout(() => {
          setShowEmailModal(false);
          setEmailStatus({ message: '', isError: false });
        }, 3000);
      } else {
        setEmailStatus({ message: data.error || 'Gagal mengirim email', isError: true });
      }
    } catch (error) {
      setEmailStatus({ message: 'Terjadi kesalahan. Silakan coba lagi.', isError: true });
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
        <title>Aryan’s CV - Interactive Preview & Download</title>
        <meta
          name="description"
          content="Preview or download Aryan Zaky Prayogo's latest CV directly from the portfolio."
        />
        <meta name="robots" content="index,follow" />
      </Head>

{!showContent && (
  <div className="absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 backdrop-blur-2xl">
    <motion.div
      className="relative flex flex-col items-center justify-center gap-6 rounded-3xl border border-cyan-400/20 bg-neutral-900/80 px-10 py-12 shadow-[0_0_100px_rgba(34,211,238,0.25)]"
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
    >
      {/* Rotating Core */}
      <motion.div
        className="relative h-40 w-40"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
      >
        <div className="absolute inset-0 rounded-full border-[3px] border-dashed border-cyan-400/40 blur-[1px]" />
        <motion.div
          className="absolute inset-3 rounded-full border border-neutral-700/70"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        />
        <motion.div
          className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.8)]"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/2 bottom-0 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-300/70 shadow-[0_0_15px_rgba(34,211,238,0.6)]"
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Loading Text */}
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.45em] text-cyan-300/80">Initializing CV Matrix</p>
        <motion.p
          className="text-sm text-neutral-200"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          Calibrating data nodes & aligning layout vectors…
        </motion.p>
      </div>

      {/* Countdown */}
      <motion.div
        key={timeLeft}
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800/80 text-xl font-bold text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.3)]"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        {timeLeft}
      </motion.div>
      <p className="text-[11px] uppercase tracking-[0.35em] text-neutral-500">seconds</p>

      {/* Progress Line */}
      <motion.div
        className="absolute bottom-4 left-1/2 h-[2px] w-40 -translate-x-1/2 overflow-hidden rounded-full bg-neutral-800/80"
      >
        <motion.div
          className="h-full w-full bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.div>
  </div>
)}


      <div
        className={`relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16 transition-opacity duration-500 ${
          showContent ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-500/30 to-cyan-500/30 blur-3xl"
        animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-[-160px] left-[10%] h-[380px] w-[380px] rounded-full bg-gradient-to-br from-sky-500/25 to-purple-500/35 blur-3xl"
        animate={{ scale: [1, 0.92, 1], rotate: [0, -12, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-[5%] top-[25%] h-[300px] w-[300px] rounded-full bg-gradient-to-br from-amber-400/20 to-rose-500/25 blur-3xl"
        animate={{ scale: [1, 1.05, 1], rotate: [0, 6, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 0.75 }}
      />

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
            <div className="rounded-3xl border border-neutral-800/60 bg-neutral-900/70 p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Smart download</p>
                  <h2 className="mt-1 text-2xl font-semibold text-neutral-50">Save My CV</h2>
                  <p className="mt-2 text-sm text-neutral-400">
                    Direct Google Drive download, signed and optimized for ATS parsing.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href={CV_DOWNLOAD_URL}
                    className="inline-flex items-center justify-center rounded-xl bg-white/95 px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-white"
                  >
                    Download PDF
                  </a>
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-5 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/30 hover:border-emerald-400/60"
                  >
                    Send to Email
                  </button>
                  <a
                    href={CV_VIEW_URL.replace('/preview', '/view')}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-700 px-5 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-white"
                  >
                    Open in Drive
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-800/60 bg-neutral-900/70 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 overflow-x-auto text-sm text-neutral-400">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative inline-flex items-center rounded-2xl px-4 py-2 font-medium transition ${
                        isActive ? 'text-neutral-50' : 'hover:text-neutral-200'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="cv-tab"
                          className="absolute inset-0 rounded-2xl bg-white/10"
                          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        />
                      )}
                      <span className="relative">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6">{tabContent}</div>
            </div>
          </div>

          <motion.div
            className="flex w-full max-w-[460px] flex-col gap-5 self-stretch"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.35 }}
          >
            <div className="rounded-3xl border border-neutral-800/60 bg-neutral-900/70 p-6 backdrop-blur-xl shadow-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Snapshot</p>
            <h3 className="mt-3 text-lg font-semibold text-neutral-50">Why this CV represents me</h3>
            <ul className="mt-4 space-y-3 text-sm text-neutral-300">
              <li>• Reflects my growth from Olympiad achiever to aspiring DevSecOps engineer.</li>
              <li>• Combines technical, leadership, and community-driven experience.</li>
              <li>• Designed to stay professional across digital and printed formats.</li>
              </ul>
</div>
            <div className="rounded-3xl border border-neutral-800/60 bg-neutral-900/70 p-6 backdrop-blur-xl shadow-xl">
              <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Need a different format?</p>
              <p className="mt-3 text-sm text-neutral-300">
                Reach out through the <span className="font-semibold text-neutral-100">Message to Aryan</span> form or
                ping the onsite AI assistant for customized versions (per language, project focus, or pitch deck
                references).
              </p>
              <a
                href="/message-to-aryan"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-white/95 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white"
              >
                Request custom version
              </a>
            </div>
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
                  Masukkan alamat email Anda dan kami akan mengirimkan link download CV langsung ke inbox Anda.
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
