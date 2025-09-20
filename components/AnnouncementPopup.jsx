import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';

function isMobileOrTablet() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Mobi|Android|iPhone|iPad|iPod|IEMobile|BlackBerry|Opera Mini/i.test(ua);
}

export function AnnouncementCard({ ann, onDismiss, preview = false, forceMobile = false }) {
  const version = String(ann?.version || '0');
  const published = ann?.updatedAt ? new Date(ann.updatedAt) : null;
  return (
    <motion.div
      role="dialog"
      aria-modal={!preview}
      aria-label="Site announcement"
      className={`relative z-10 w-full ${preview ? (forceMobile ? 'max-w-md' : 'max-w-2xl') : ((forceMobile || isMobileOrTablet()) ? 'max-w-md' : 'max-w-2xl')} rounded-2xl border border-white/10 bg-[#0a0f14]/95 shadow-2xl overflow-hidden`}
      initial={{ y: preview ? 0 : ((forceMobile || isMobileOrTablet()) ? 30 : 12), scale: 0.98, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      exit={{ y: 10, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      <div className="px-5 py-4 bg-gradient-to-r from-cyan-500/10 via-fuchsia-500/10 to-cyan-500/10 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-200">{ann?.severity === 'warning' ? '!' : (ann?.severity === 'success' ? '✓' : 'i')}</span>
          <div className="text-cyan-200 font-medium flex items-center gap-2">
            <span>{ann?.title || 'Announcement'}</span>
            {preview && (
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Preview</span>
            )}
          </div>
        </div>
        {ann?.dismissible !== false && !!onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-200">✕</button>
        )}
      </div>
      <div className="px-5 py-4 text-sm text-gray-200">
        <div className="whitespace-pre-wrap leading-relaxed">{ann?.message || ''}</div>
        {ann?.ctaUrl && (
          <div className="mt-3">
            <a href={ann.ctaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/15 text-cyan-200 hover:shadow-[0_0_14px_rgba(34,211,238,0.25)]">
              {ann?.ctaText || 'Learn more'}
            </a>
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-white/10 text-[11px] text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>Announcement v{version}</span>
          {ann?.target && ann.target !== 'both' && (
            <span className="inline-flex items-center rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">
              {ann.target === 'ai' ? 'AI Pages' : 'Main Site'}
            </span>
          )}
        </div>
        <div>{published ? `Published ${published.toLocaleString()}` : 'Draft (not published)'}</div>
      </div>
    </motion.div>
  );
}

export default function AnnouncementPopup() {
  const [loading, setLoading] = useState(true);
  const [ann, setAnn] = useState(null);
  const [show, setShow] = useState(false);
  const [pathname, setPathname] = useState('');
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/get-announcement',
        `${basePath}/.netlify/functions/get-announcement`,
        '/api/get-announcement',
        `${basePath}/api/get-announcement`,
      ]));
      let data = null;
      for (const url of urls) {
        try { const r = await fetch(url, { headers: { accept: 'application/json' } }); if (r.ok) { data = await r.json(); break; } } catch {}
      }
      if (!alive) return;
      setAnn(data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    // Track route changes
    const p = (router && (router.asPath || router.pathname)) || (typeof window !== 'undefined' ? window.location?.pathname : '') || '';
    setPathname(p);
  }, [router?.asPath, router?.pathname]);

  const shouldShow = useMemo(() => {
    try {
      if (!ann || !ann.active) return false;
      // Only allow on main site routes or AI pages, never on admin/patch/system routes
      const p = pathname || '';
      const disallowedPrefixes = ['/admin', '/login', '/patch', '/api', '/_next', '/static'];
      if (disallowedPrefixes.some((pre) => p.startsWith(pre))) return false;
      // route gating: only show on main site or AI pages
      const target = ann.target || 'both';
      const isAiRoute = pathname.startsWith('/ai');
      if (target === 'main' && isAiRoute) return false;
      if (target === 'ai' && !isAiRoute) return false;
      const version = String(ann.version || '0');
      if (typeof window !== 'undefined') {
        // Ignore stored dismissal so the popup reappears on refresh as requested
        if (ann.expiresAt) {
          const until = new Date(ann.expiresAt).getTime();
          if (Date.now() > until) return false;
        }
      }
      return true;
    } catch { return false; }
  }, [ann, pathname]);

  useEffect(() => { setShow(shouldShow); }, [shouldShow]);

  if (!show || loading) return null;
  const version = String(ann.version || '0');
  const dismiss = () => {
    // Do not persist dismissal to localStorage; show again on refresh
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />
          {/* Glow accents */}
          <div className="pointer-events-none absolute -top-24 right-[-10%] h-[60vh] w-[60vh] rounded-full blur-[120px] opacity-50" style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(34,211,238,0.18) 0%, rgba(0,0,0,0) 70%)' }} />
          <div className="pointer-events-none absolute bottom-[-20%] left-[-10%] h-[70vh] w-[70vh] rounded-full blur-[130px] opacity-40" style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(217,70,239,0.14) 0%, rgba(0,0,0,0) 70%)' }} />

          <AnnouncementCard ann={ann} onDismiss={dismiss} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
