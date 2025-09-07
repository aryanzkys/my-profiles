import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import ParticleField from '../components/ParticleField';

const Section = ({ title, children, defaultOpen = false, idx = 0 }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-md overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 items-center justify-center text-xs">
            {idx+1}
          </span>
          <span className="font-semibold text-gray-100">{title}</span>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-cyan-300">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <div className="px-4 pb-4 text-gray-200 text-sm leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function AIPrivacy() {
  const [toast, setToast] = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1800); };

  const clearChat = () => {
    try {
      window.localStorage.removeItem('aryan-chatbot-history-v1');
      window.localStorage.removeItem('aryan-chatbot-hint-v1');
      showToast('Chat history cleared');
    } catch {}
  };
  const disconnectSpotify = () => {
    try {
      window.localStorage.removeItem('spotify_token_v1');
      showToast('Spotify disconnected (token removed)');
    } catch {}
  };
  const clearSpotifyData = () => {
    try {
      window.localStorage.removeItem('spotify_last_embed_url_v1');
      window.localStorage.removeItem('spotify_recent_queries_v1');
      window.localStorage.removeItem('spotify_preview_only_filter_v1');
      showToast('Spotify local data cleared');
    } catch {}
  };

  useEffect(() => {
    // no-op, page-level effects can go here
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#05070a] text-gray-100">
      <Head>
        <title>Privacy Policy — Aryan’s AI Assistant</title>
        <meta name="robots" content="noindex,follow" />
        <meta name="description" content="Privacy Policy for Aryan’s AI Assistant (AI Pages)" />
      </Head>

      {/* Background accents to match AI theme */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-10%] h-[60vh] w-[60vh] rounded-full blur-[110px]" style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(34,211,238,0.22) 0%, rgba(0,0,0,0) 70%)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] h-[70vh] w-[70vh] rounded-full blur-[120px]" style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(59,130,246,0.18) 0%, rgba(0,0,0,0) 70%)' }} />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <ParticleField />
      </div>

      <div className="relative container mx-auto px-4 py-10 max-w-3xl">
        {/* Header card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-5">
          <div className="rounded-2xl p-[1px] bg-gradient-to-r from-cyan-400/30 via-blue-500/25 to-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.35)]">
            <div className="rounded-2xl border border-white/10 bg-black/85 overflow-hidden">
              <div className="px-4 py-4 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
                <h1 className="text-xl md:text-2xl font-semibold text-cyan-300">Privacy Policy — Aryan’s AI Assistant</h1>
                <p className="mt-1 text-sm text-gray-300 max-w-2xl">Welcome! These AI Pages are designed with transparency and control in mind. By continuing to use and interact with this website (including the chatbot and Spotify features), you acknowledge and agree to this Privacy Policy.</p>
              </div>
              {/* Quick controls */}
              <div className="px-4 py-3 flex flex-wrap gap-2">
                <button onClick={clearChat} className="text-xs px-3 py-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/15 text-cyan-200 hover:shadow-[0_0_14px_rgba(34,211,238,0.25)]">Clear Chat History</button>
                <button onClick={disconnectSpotify} className="text-xs px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-gray-200 hover:bg-white/10">Disconnect Spotify</button>
                <button onClick={clearSpotifyData} className="text-xs px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-gray-200 hover:bg-white/10">Clear Spotify Data</button>
                <a href="/ai" className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-cyan-200 hover:bg-white/10 underline decoration-cyan-400/40">Back to AI</a>
              </div>
              {toast && (
                <div className="px-4 pb-4 text-xs text-emerald-300">{toast}</div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="space-y-3">
          <Section title="What Data is Collected?" defaultOpen idx={0}>
            <ul className="list-disc ml-5 space-y-1">
              <li><b>Chat Messages.</b> Your prompts and AI responses are processed to generate answers. Some interactions may be logged (minimally) for quality and abuse prevention.</li>
              <li><b>Spotify Integration.</b> If you connect Spotify, your access token is stored only in your browser (never on Aryan’s server). Search and previews go through a secure proxy.</li>
              <li><b>Usage Data.</b> Basic, aggregate analytics (e.g., visits, feature usage) may be collected to improve the experience.</li>
            </ul>
          </Section>
          <Section title="How is Data Used?" idx={1}>
            <ul className="list-disc ml-5 space-y-1">
              <li>Provide accurate, helpful AI responses and core features.</li>
              <li>Improve safety, reliability, and UX of the AI Assistant.</li>
              <li>Enable Spotify search and audio previews when connected.</li>
            </ul>
          </Section>
          <Section title="Data Storage & Security" idx={2}>
            <ul className="list-disc ml-5 space-y-1">
              <li>Chat history persists locally in your browser and can be cleared any time.</li>
              <li>Spotify tokens/preferences are kept in localStorage (client-side only).</li>
              <li>All communications with APIs use HTTPS transport encryption.</li>
            </ul>
          </Section>
          <Section title="Your Choices & Controls" idx={3}>
            <ul className="list-disc ml-5 space-y-1">
              <li>Use the buttons above to clear chat, disconnect, and clear Spotify data.</li>
              <li>Use the in-chat “Clear chat” button at any time.</li>
              <li>Contact Aryan: <a href="mailto:prayogoaryan63@gmail.com" className="underline decoration-cyan-400/50 hover:decoration-cyan-300">prayogoaryan63@gmail.com</a></li>
            </ul>
          </Section>
          <Section title="Third-Party Services" idx={4}>
            <p>Spotify is used for search and 30s previews when you connect your account. Spotify’s own terms and privacy policy apply in addition to this page.</p>
          </Section>
          <Section title="Changes" idx={5}>
            <p>This policy may be updated periodically. Significant changes will be announced on the AI Pages. Your continued use of the site after such updates constitutes acceptance of the revised policy.</p>
          </Section>
        </div>

  <div className="mt-6 text-xs text-gray-400">Last updated: September 2025 • Using this site means you agree to the Privacy Policy above.</div>
      </div>
    </main>
  );
}
