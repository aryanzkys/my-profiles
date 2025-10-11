import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

const CV_VIEW_URL = 'https://drive.google.com/file/d/1RE5Q5YLAnbNZBOqIZ4r_u9tTCGb3rfKG/preview';
const CV_DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=1RE5Q5YLAnbNZBOqIZ4r_u9tTCGb3rfKG';
const LOADING_DURATION = 5;

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'preview', label: 'Preview' },
  { id: 'details', label: 'Snapshot' }
];

const stats = [
  { label: 'Last Update', value: 'October 2025' },
  { label: 'Pages', value: '1' },
  { label: 'Format', value: 'PDF A4' }
];

export default function CvShowcasePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeLeft, setTimeLeft] = useState(LOADING_DURATION);
  const [showContent, setShowContent] = useState(false);

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
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-neutral-950/95 backdrop-blur-lg">
          <motion.div
            className="relative flex h-56 w-56 flex-col items-center justify-center gap-6 rounded-full border border-neutral-800/80 bg-neutral-900/80 p-10 text-center shadow-[0_0_80px_rgba(14,165,233,0.35)]"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
          >
            <motion.div
              className="relative h-32 w-32"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            >
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-cyan-400/50" />
              <motion.div
                className="absolute inset-2 rounded-full border border-neutral-700/70"
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
              />
              <motion.div
                className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.8)]"
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              />
            </motion.div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.45em] text-cyan-300/90">Initializing CV matrix</p>
              <p className="text-sm text-neutral-200">Synchronizing robotic nodes…</p>
            </div>
            <motion.div
              key={timeLeft}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800/80 text-lg font-semibold text-cyan-300"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              {timeLeft}
            </motion.div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-neutral-500">seconds</p>
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
            Preview & download Aryan’s latest CV without leaving the site
          </motion.h1>
          <motion.p
            className="mx-auto max-w-3xl text-sm leading-relaxed text-neutral-400 sm:text-base"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.18 }}
          >
            Tailored for recruiters, collaborators, and community partners. The embedded view mirrors the downloadable
            PDF—both updated whenever I refresh my profile throughput.
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
                  <h2 className="mt-1 text-2xl font-semibold text-neutral-50">Save Aryan_Zaky_Prayogo_CV.pdf</h2>
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
              <h3 className="mt-3 text-lg font-semibold text-neutral-50">Why collaborators love this CV</h3>
              <ul className="mt-4 space-y-3 text-sm text-neutral-300">
                <li>• Links to live deployments, AI experiments, and community case studies.</li>
                <li>• Highlights measurable impact alongside technical mastery.</li>
                <li>• Designed for readability across desktop, tablet, and print.</li>
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
    </main>
  );
}
