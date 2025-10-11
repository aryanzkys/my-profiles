import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TemplateClassic, TemplateMinimal, TemplateModern } from '../src/components/templates';
import profile from '../src/data/profile.json';

const templateOptions = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Chronological layout inspired by Reactive Resume classic template.',
    component: TemplateClassic,
    accent: 'from-amber-500/80 to-yellow-400/40'
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Bold sidebar treatment with dark mode aesthetics.',
    component: TemplateModern,
    accent: 'from-cyan-500/80 to-blue-500/30'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Typography-first layout with generous white space.',
    component: TemplateMinimal,
    accent: 'from-violet-500/80 to-purple-400/30'
  }
];

const motionVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 }
};

export default function CvPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [isClient, setIsClient] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const activeTemplate = useMemo(
    () => templateOptions.find((tmpl) => tmpl.id === selectedTemplate) ?? templateOptions[0],
    [selectedTemplate]
  );

  const TemplateComponent = activeTemplate.component;

  const downloadPdf = async () => {
    if (!isClient || !previewRef.current) return;
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default;
    const filenameBase = (profile?.basics?.name || 'Curriculum Vitae').replace(/\s+/g, '_');
    const options = {
      margin: 0,
      filename: `${filenameBase}_CV.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf()
      .set(options)
      .from(previewRef.current)
      .save();
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <Head>
        <title>{profile?.basics?.name ? `${profile.basics.name} — CV` : 'Curriculum Vitae'}</title>
        <meta name="description" content="Interactive curriculum vitae with Reactive Resume templates." />
        <meta name="robots" content="index,follow" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="bg-neutral-900/70 border border-neutral-800/80 rounded-3xl px-6 py-8 h-fit sticky top-8 self-start">
            <div className="mb-8 space-y-2">
              <motion.h1
                className="text-lg font-semibold tracking-tight"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
              >
                Aryan’s Curriculum Vitae
              </motion.h1>
              <motion.p
                className="text-sm text-neutral-400"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
              >
                Pick a Reactive Resume-inspired template, preview live, then export the design to PDF.
              </motion.p>
            </div>

            <ul className="space-y-4">
              {templateOptions.map((template) => {
                const isActive = template.id === selectedTemplate;
                return (
                  <motion.li key={template.id} layoutId={`template-${template.id}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`group relative w-full overflow-hidden rounded-2xl border px-5 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 ${
                        isActive
                          ? 'border-neutral-100/60 ring-1 ring-neutral-100/40'
                          : 'border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      <span className={`absolute inset-0 bg-gradient-to-br opacity-0 transition group-hover:opacity-80 ${template.accent}`} />
                      {isActive && (
                        <motion.span
                          layoutId="active-glow"
                          className={`absolute inset-0 bg-gradient-to-br ${template.accent} opacity-60`}
                        />
                      )}
                      <div className="relative space-y-1">
                        <h2 className="text-sm font-semibold">{template.name}</h2>
                        <p className="text-xs text-neutral-300">{template.description}</p>
                      </div>
                    </button>
                  </motion.li>
                );
              })}
            </ul>

            <motion.button
              type="button"
              onClick={downloadPdf}
              className="mt-8 w-full rounded-xl bg-neutral-100 text-neutral-950 py-3 text-sm font-semibold transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:opacity-60"
              whileTap={{ scale: 0.98 }}
              disabled={!isClient}
            >
              Download PDF (A4)
            </motion.button>
          </aside>

          <section className="bg-neutral-900/70 border border-neutral-800/80 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800/80">
              <div>
                <h2 className="text-base font-semibold text-neutral-100">{activeTemplate.name} template</h2>
                <p className="text-sm text-neutral-400">Live preview powered by Reactive Resume-inspired layouts.</p>
              </div>
              <motion.span
                className="inline-flex h-2 w-2 rounded-full bg-emerald-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </div>

            <div className="relative bg-neutral-950 flex justify-center items-start px-2 sm:px-6 py-8 overflow-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedTemplate}
                  variants={motionVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="w-full flex justify-center"
                >
                  <TemplateComponent profile={profile} ref={previewRef} />
                </motion.div>
              </AnimatePresence>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
