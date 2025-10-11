import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

const EXTERNAL_CV_URL = 'https://rxresu.me/prayogoaryan63/cv-aryan-zaky-prayogo';
const REDIRECT_DELAY = 5;

export default function CvRedirectPage() {
  const [timeLeft, setTimeLeft] = useState(REDIRECT_DELAY);

  useEffect(() => {
    const redirectTimeout = window.setTimeout(() => {
      window.location.assign(EXTERNAL_CV_URL);
    }, REDIRECT_DELAY * 1000);

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      window.clearTimeout(redirectTimeout);
      window.clearInterval(interval);
    };
  }, []);

  const progress = useMemo(() => {
    return ((REDIRECT_DELAY - timeLeft) / REDIRECT_DELAY) * 100;
  }, [timeLeft]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <Head>
        <title>Redirecting to CV…</title>
        <meta httpEquiv="refresh" content={`5; url=${EXTERNAL_CV_URL}`} />
        <meta name="robots" content="noindex,follow" />
      </Head>

      <motion.div
        aria-hidden
        className="absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-500/40 to-cyan-500/40 blur-3xl"
        animate={{ scale: [1, 1.1, 1], rotate: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-[-160px] left-1/4 h-[360px] w-[360px] rounded-full bg-gradient-to-br from-sky-500/30 to-purple-500/40 blur-3xl"
        animate={{ scale: [1, 0.9, 1], rotate: [0, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16">
        <motion.div
          className="w-full max-w-xl rounded-3xl border border-neutral-800/60 bg-neutral-900/80 backdrop-blur-xl shadow-2xl"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="border-b border-neutral-800/70 px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
              Preparing your CV preview
            </div>
          </div>
          <div className="space-y-6 px-6 pb-8 pt-7 text-center">
            <div className="space-y-3">
              <motion.h1
                className="text-2xl font-semibold tracking-tight"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                Redirecting to Aryan’s Reactive Resume
              </motion.h1>
              <motion.p
                className="text-sm leading-relaxed text-neutral-400"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
              >
                You&apos;ll land on the latest version of my CV in just a moment. Feel free to explore the preview while we
                finalize the redirect.
              </motion.p>
            </div>
            <div>
              <motion.div
                key={timeLeft}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-800/80 text-3xl font-bold shadow-inner"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                aria-live="polite"
              >
                {timeLeft}
              </motion.div>
              <p className="mt-3 text-xs uppercase tracking-[0.3em] text-neutral-500">seconds</p>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-400 to-sky-400"
                  style={{ width: `${progress}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeInOut', duration: 0.6 }}
                />
              </div>
              <p className="text-xs text-neutral-500">Auto-redirect starts when the progress completes.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={EXTERNAL_CV_URL}
                className="inline-flex items-center justify-center rounded-xl bg-white/95 px-5 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white"
              >
                Open CV instantly
              </a>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-xl border border-neutral-700 px-5 py-2 text-sm font-semibold text-neutral-300 transition hover:border-neutral-500 hover:text-white"
              >
                Restart countdown
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
