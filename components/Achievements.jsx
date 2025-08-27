import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Eye, X } from 'lucide-react';
import achievementsData from '../data/achievements.json';

// State is initialized from local JSON, but will be overridden by remote data if available
// Remote sources tried in order: Netlify Function, Next.js dev API
export default function Achievements() {
  const [achievementsByYear, setAchievements] = useState(achievementsData);
  const years = useMemo(() => Object.keys(achievementsByYear).map(Number).sort((a, b) => b - a), [achievementsByYear]);
  const [openCert, setOpenCert] = useState(null); // { url, title }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const candidates = Array.from(new Set([
        '/.netlify/functions/get-achievements',
        `${basePath}/.netlify/functions/get-achievements`,
        `${basePath}/api/get-achievements`,
        '/api/get-achievements',
      ]));
      for (const base of candidates) {
        const url = `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`; // bust caches after admin saves
        try {
          const res = await fetch(url, { headers: { 'accept': 'application/json' } });
          if (!res.ok) continue;
          const json = await res.json();
          if (!cancelled && json && typeof json === 'object') {
            setAchievements(json);
            break;
          }
        } catch (_) {
          // ignore and try next
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.25 } }),
};

// Convert a variety of Google Drive share links to a preview-friendly URL
function toDrivePreviewUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    // Patterns:
    // - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    // - https://drive.google.com/open?id=FILE_ID
    // - https://drive.google.com/uc?id=FILE_ID&export=download
    let id = '';
    const pathParts = u.pathname.split('/').filter(Boolean);
    const i = pathParts.indexOf('d');
    if (u.hostname.includes('drive.google.com') && i !== -1 && pathParts[i + 1]) {
      id = pathParts[i + 1];
    }
    if (!id) {
      id = u.searchParams.get('id') || '';
    }
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
    return url; // fallback to original
  } catch {
    return url;
  }
}

function YearTimeline({ year, items, onOpenCert }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-xl md:text-2xl font-semibold text-white">{year}</h3>
        <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/60 to-transparent" />
      </div>

      <ol className="relative ml-4 border-l-2 border-cyan-500/20">
        {items.map((raw, idx) => {
          const item = typeof raw === 'string' ? { text: raw } : raw;
          const { text, cert } = item;
          const certUrl = cert ? toDrivePreviewUrl(cert) : '';
          return (
          <motion.li
            key={`${text}-${cert || idx}`}
            custom={idx}
            variants={itemVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-20% 0px -20% 0px' }}
            className="relative mb-4 ml-4 group"
          >
            {/* Timeline dot with interactive ring */}
            <span className="absolute -left-3.5 top-2.5 h-5 w-5 rounded-full border border-cyan-400/30 group-hover:border-cyan-300/60 transition-colors" aria-hidden="true" />
            <span className="absolute -left-2.5 top-3 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] transform transition-transform group-hover:scale-110" aria-hidden="true" />
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="bg-white/5 border border-white/10 rounded-lg p-3 text-gray-100 leading-relaxed shadow-md"
            >
              <div className="flex items-start gap-3 justify-between">
                <p className="flex-1">{text}</p>
                {certUrl && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenCert?.({ url: certUrl, title: text })}
                      className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded-md border border-cyan-400/40 text-cyan-300 hover:text-cyan-200 hover:border-cyan-300/70 hover:bg-cyan-300/10 transition-colors text-xs"
                      title="Preview certificate"
                    >
                      <Eye size={14} />
                      Preview
                    </button>
                    <a
                      href={certUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded-md border border-white/20 text-gray-200 hover:text-white hover:border-white/40 hover:bg-white/10 transition-colors text-xs"
                      title="Open in Google Drive"
                    >
                      <ExternalLink size={14} />
                      Open
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.li>
        );})}
      </ol>
    </section>
  );
}

  // ...rest stays the same

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenCert(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-4xl"
    >
      <h2 className="text-2xl md:text-3xl font-semibold text-cyan-300 mb-4 tracking-wide">
        Achievements
      </h2>
      <div className="bg-black/35 border border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-md max-h-[65vh] overflow-y-auto pr-2">
        <div className="space-y-8">
          {years.map((year) => (
            <YearTimeline
              key={year}
              year={year}
              items={achievementsByYear[year]}
              onOpenCert={setOpenCert}
            />
          ))}
        </div>
      </div>

      {/* Certificate Preview Modal */}
      {openCert && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpenCert(null)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Certificate preview"
            className="relative z-10 w-full max-w-5xl bg-neutral-900/90 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10">
              <p className="text-sm md:text-base text-gray-100 pr-2 truncate">{openCert.title}</p>
              <div className="flex items-center gap-2">
                <a
                  href={openCert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-white/20 text-gray-200 hover:text-white hover:border-white/40 hover:bg-white/10 transition-colors text-xs"
                  title="Open in Google Drive"
                >
                  <ExternalLink size={14} />
                  Open in Drive
                </a>
                <button
                  onClick={() => setOpenCert(null)}
                  className="p-1 rounded-md hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="w-full h-[70vh] bg-black">
              <iframe
                src={openCert.url}
                title="Certificate"
                className="w-full h-full"
                allow="autoplay"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
