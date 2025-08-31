import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShieldCheck, KeyRound, Database, Clock, Mail, Globe2 } from 'lucide-react';
import { useState } from 'react';

const updatedAt = 'August 31, 2025';

function Section({ id, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      <button onClick={()=>setOpen(v=>!v)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5" aria-expanded={open} aria-controls={`${id}-content`}>
        <div className="flex items-center gap-2">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          <span className="text-cyan-200 font-medium">{title}</span>
        </div>
        <span className="text-[11px] text-gray-400">{open ? 'Hide' : 'Show'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={`${id}-content`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-4 text-sm text-gray-200 leading-relaxed">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PrivacyPolicy() {
  const router = useRouter();
  const [atEnd, setAtEnd] = useState(false);
  const [countdown, setCountdown] = useState(null); // seconds remaining or null
  const [autoRedirect, setAutoRedirect] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false); // user scrolled a bit
  const sections = useMemo(()=> ([
    { id: 'intro', title: 'Overview', content: (
      <p>
        This Privacy Policy explains what personal data we collect and how we use it when you visit or use AryanStack (the “Service”).
      </p>
    )},
    { id: 'data-we-collect', title: 'Data We Collect', content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Account data: email, display name, authentication provider (for admin users).</li>
        <li>Login metadata: uid, provider id, user agent, and timestamps (for audit/security).</li>
        <li>Presence signals: last seen timestamps and online status for admin visibility.</li>
        <li>Security signals: optional reCAPTCHA tokens and scores (server-verified).</li>
      </ul>
    )},
    { id: 'how-we-use', title: 'How We Use Data', content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Operate and secure admin features, including permissions and audit trails.</li>
        <li>Detect abuse or suspicious activity and maintain Service integrity.</li>
        <li>Improve reliability and user experience of the admin platform.</li>
      </ul>
    )},
    { id: 'sharing', title: 'Sharing & Third‑Parties', content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Authentication: Firebase (Google/email) to manage sign-ins.</li>
        <li>Hosting/Serverless: Netlify Functions, Next.js API routes for API logic.</li>
        <li>Data: Supabase tables and storage; file-system fallbacks in dev.</li>
        <li>Security: Google reCAPTCHA v3 verification (if enabled).</li>
      </ul>
    )},
    { id: 'retention', title: 'Retention', content: (
      <p>
        We retain audit, login, and presence records for as long as necessary to operate the admin platform securely, or as required by law, after which the data may be deleted or anonymized.
      </p>
    )},
    { id: 'your-rights', title: 'Your Rights', content: (
      <p>
        Depending on your location, you may have rights to access, correct, or delete your data. Contact us to make a request.
      </p>
    )},
    { id: 'security', title: 'Security', content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Access controls: Owner protections and permission checks for admin actions.</li>
        <li>Server-side verification of reCAPTCHA tokens (if enabled).</li>
        <li>Use of reputable cloud providers and best practices where feasible.</li>
      </ul>
    )},
    { id: 'changes', title: 'Changes to this Policy', content: (
      <p>
        We may update this Policy from time to time. The “Last updated” date reflects the latest revision. Continued use of the Service means you accept the changes.
      </p>
    )},
    { id: 'contact', title: 'Contact', content: (
      <p>
        Questions or requests related to privacy can be sent via the contact methods on the main site.
      </p>
    )},
  ]), []);

  useEffect(()=>{ try { document.getElementById('page-title')?.focus(); } catch {} }, []);

  // Detect when user reaches end of the document (after interaction)
  useEffect(() => {
    const checkEnd = () => {
      try {
        const threshold = 64; // px from bottom
        const root = document.scrollingElement || document.documentElement;
        const scrollTop = root.scrollTop || window.scrollY || 0;
        const clientHeight = root.clientHeight || window.innerHeight || 0;
        const scrollHeight = root.scrollHeight || document.body.scrollHeight || 0;

        // mark interaction once user has scrolled a bit
        if (scrollTop > 50 && !hasInteracted) setHasInteracted(true);

        // Only consider "at end" after user interaction to avoid instant trigger
        const atBottom = hasInteracted && (scrollTop + clientHeight >= scrollHeight - threshold);
        setAtEnd(atBottom);
      } catch {}
    };
    // do not call immediately to avoid false positives on short pages
    window.addEventListener('scroll', checkEnd, { passive: true });
    window.addEventListener('resize', checkEnd, { passive: true });
    return () => {
      window.removeEventListener('scroll', checkEnd);
      window.removeEventListener('resize', checkEnd);
    };
  }, [hasInteracted]);

  // Start a short countdown once at end; allow cancel
  useEffect(() => {
    if (!atEnd || !autoRedirect) return;
    if (countdown !== null) return; // already counting
    setCountdown(3);
  }, [atEnd, autoRedirect]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      // Push to Terms page
      router.push('/terms');
      return;
    }
    const id = setTimeout(() => setCountdown((c) => (typeof c === 'number' ? c - 1 : null)), 1000);
    return () => clearTimeout(id);
  }, [countdown, router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black text-white">
      <Head>
        <title>Privacy Policy • AryanStack</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Privacy Policy for AryanStack." />
      </Head>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-300" />
          <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold text-cyan-300">Privacy Policy</h1>
        </div>
        <div className="text-xs text-gray-400 mb-6">Last updated: {updatedAt}</div>

        <div className="mb-6 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-gray-300">
          <div className="font-medium text-cyan-200 mb-1">Summary</div>
          <ul className="grid md:grid-cols-2 gap-2">
            <li className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-amber-300" /> Admin access is controlled and audited.</li>
            <li className="flex items-center gap-2"><Database className="h-4 w-4 text-fuchsia-300" /> Login and presence logs improve security.</li>
            <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-cyan-300" /> Data retention is limited to operational needs.</li>
            <li className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-emerald-300" /> Third‑party providers help deliver the Service.</li>
          </ul>
        </div>

        <div className="space-y-3">
          {sections.map((s, i)=> (
            <Section key={s.id} id={s.id} title={`${i+1}. ${s.title}`} defaultOpen={i===0}>
              {s.content}
            </Section>
          ))}
        </div>

        <div className="mt-10 text-center text-xs text-gray-500">AryanStack • All rights reserved.</div>
      </div>

      {/* Redirect banner when finished reading */}
      <AnimatePresence>
  {(atEnd || countdown !== null) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4 z-20 rounded-lg border border-white/10 bg-black/70 backdrop-blur px-4 py-3 text-sm text-gray-200 shadow-lg"
            role="dialog"
            aria-live="polite"
          >
            <div className="mb-2">
              {typeof countdown === 'number' ? (
                <span>Reached the end. Redirecting to Terms in <span className="text-cyan-300 font-medium">{countdown}s</span>…</span>
              ) : (
                <span>Reached the end. You can proceed to Terms.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/terms')}
                className="px-3 py-1.5 rounded-md bg-cyan-600/30 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-600/40"
              >Go to Terms</button>
              {typeof countdown === 'number' && (
                <button
                  onClick={() => { setAutoRedirect(false); setCountdown(null); }}
                  className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                >Cancel</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
