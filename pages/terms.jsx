import Head from 'next/head';
import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Shield, FileText, Network, UserCheck, Server, Globe } from 'lucide-react';

const updatedAt = 'August 31, 2025';

function Section({ id, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      <button
        onClick={() => setOpen(v=>!v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5"
        aria-expanded={open}
        aria-controls={`${id}-content`}
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          <span className="text-cyan-200 font-medium">{title}</span>
        </div>
        <span className="text-[11px] text-gray-400">{open ? 'Hide' : 'Show'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-content`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 text-sm text-gray-200 leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TermsOfService() {
  const sections = useMemo(() => ([
    { id: 'intro', title: 'Introduction', content: (
      <p>
        Welcome to AryanStack (the “Service”). By accessing or using this website, you agree to these Terms of Service. If you do not agree, please do not use the Service.
      </p>
    )},
    { id: 'eligibility', title: 'Eligibility & Acceptable Use', content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>You must comply with applicable laws and these Terms.</li>
        <li>No abuse: do not attempt to disrupt, attack, or reverse engineer the Service.</li>
        <li>No unlawful, harmful, or infringing content or activities.</li>
      </ul>
    )},
    { id: 'accounts', title: 'Accounts, Admin Access, and Owner', content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Admin functionality is gated; access may require authentication (e.g., Firebase) and an admin key.</li>
        <li>Owner account (prayogoaryan63@gmail.com) cannot be banned or deleted and retains full access for operational security.</li>
        <li>Admin actions may be logged for audit and security purposes.</li>
      </ul>
    )},
    { id: 'content', title: 'Content Ownership & License', content: (
      <p>
        Unless stated otherwise, all content, branding, graphics, and code are owned by the site owner or licensed to them. You may not reproduce, distribute, or create derivative works without prior permission, except as permitted by law.
      </p>
    )},
    { id: 'prohibited', title: 'Prohibited Activities', content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Automated scraping or rate-abusive requests without permission.</li>
        <li>Security testing without prior written authorization.</li>
        <li>Upload or link to malware, phishing, or illegal materials.</li>
      </ul>
    )},
    { id: 'availability', title: 'Availability & Maintenance Mode', content: (
      <p>
        The Service may be updated or temporarily disabled (e.g., via maintenance mode) without notice. We are not liable for downtime or data loss resulting from such changes.
      </p>
    )},
    { id: 'thirdparty', title: 'Third‑Party Services', content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Authentication: Firebase (Google or email sign-in).</li>
        <li>Hosting/Serverless: Netlify Functions, Next.js API routes.</li>
        <li>Data: Supabase (tables, storage) with fallbacks.</li>
        <li>Security: Optional Google reCAPTCHA v3 verification.</li>
      </ul>
    )},
    { id: 'changes', title: 'Changes to Terms', content: (
      <p>
        We may revise these Terms from time to time. Continued use after changes means you accept the updated Terms. The “Last updated” date reflects the latest revision.
      </p>
    )},
    { id: 'contact', title: 'Contact', content: (
      <p>
        Questions? Contact the site owner via the contact methods provided on the main site.
      </p>
    )},
  ]), []);

  useEffect(()=>{
    // Optional: focus the first heading for a11y on load
    try { document.getElementById('page-title')?.focus(); } catch {}
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black text-white">
      <Head>
        <title>Terms of Service • AryanStack</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Terms of Service for AryanStack." />
      </Head>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-cyan-300" />
            <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold text-cyan-300">Terms of Service</h1>
          </div>
          <a href="/privacy" className="text-xs px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200">Back to Privacy</a>
        </div>
        <div className="text-xs text-gray-400 mb-6">Last updated: {updatedAt}</div>

        <div className="mb-6 grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-gray-300">
            <div className="font-medium text-cyan-200 mb-1">Quick Links</div>
            <ul className="grid grid-cols-2 gap-2">
              {sections.map(s=> (
                <li key={s.id}><a href={`#${s.id}`} className="hover:text-cyan-300 underline underline-offset-2">{s.title}</a></li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-gray-300">
            <div className="font-medium text-cyan-200 mb-1">Summary</div>
            <ul className="space-y-1">
              <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-300" /> Owner account is protected.</li>
              <li className="flex items-center gap-2"><Network className="h-4 w-4 text-cyan-300" /> Uses Firebase, Netlify, Supabase.</li>
              <li className="flex items-center gap-2"><Server className="h-4 w-4 text-fuchsia-300" /> Maintenance mode may limit access.</li>
              <li className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-amber-300" /> Admin actions can be audited.</li>
            </ul>
          </div>
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
    </main>
  );
}
