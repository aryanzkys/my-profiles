import Head from 'next/head';
import { useEffect } from 'react';
import about from '../data/about.json';
import contact from '../data/contact.json';
import education from '../data/education.json';
import organizations from '../data/organizations.json';
import achievements from '../data/achievements.json';

export default function CVPage() {
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        // let browser handle
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const printPDF = () => { try { window.print(); } catch {} };

  const name = (about?.name || '');
  const headline = (about?.headline || '');
  const location = 'Malang, Indonesia';
  const email = contact?.email || 'prayogoaryan63@gmail.com';
  const github = contact?.github || 'https://github.com/aryanzkys';
  const linkedin = contact?.linkedin || '';
  const instagram = contact?.instagram || '';

  const years = Object.keys(achievements||{}).sort((a,b)=>Number(b)-Number(a));
  const achievementsList = years.flatMap((y) => {
    const items = achievements[y] || [];
    return [{ year: y, header: true }, ...items.map((it) => (typeof it === 'string' ? { text: it } : it))];
  });

  return (
    <main className="min-h-screen bg-white text-black">
      <Head>
        <title>{name ? `${name} — Curriculum Vitae` : 'Curriculum Vitae'}</title>
        <meta name="robots" content="index,follow" />
        <meta name="description" content={`Curriculum Vitae of ${name || 'profile'}`} />
      </Head>

      {/* Toolbar (hidden in print) */}
      <div className="sticky top-0 z-10 print:hidden bg-white/90 border-b border-neutral-200">
        <div className="mx-auto max-w-4xl px-4 py-2 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-neutral-700">Curriculum Vitae (Harvard bullet format)</h1>
          <div className="flex items-center gap-2">
            <a href="#cv" className="text-sm text-blue-600 hover:underline">Jump to CV</a>
            <button onClick={printPDF} className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50">Download PDF</button>
          </div>
        </div>
      </div>

      {/* CV Sheet */}
      <div id="cv" className="mx-auto my-6 max-w-4xl bg-white text-[12px] leading-[1.35] print:my-0">
        {/* Header */}
        <section className="text-center">
          <h2 className="text-[22px] font-bold tracking-tight">{name?.toUpperCase?.() || 'YOUR NAME'}</h2>
          <div className="mt-1 text-[12px]">
            {headline ? `${headline} • ` : ''}{location} • Email: {email}
            {github ? ` • GitHub: ${github.replace(/^https?:\/\//,'')}` : ''}
            {linkedin ? ` • LinkedIn: ${linkedin.replace(/^https?:\/\//,'')}` : ''}
            {instagram ? ` • Instagram: ${instagram.replace(/^https?:\/\//,'')}` : ''}
          </div>
        </section>

        {/* Education */}
        <section className="mt-4 break-before-auto">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Education</h3>
          <div className="mt-1 space-y-2">
            {(education||[]).map((e) => (
              <div key={`${e.title}-${e.period}`}>
                <div className="flex items-baseline justify-between">
                  <div className="font-semibold">{e.title}{e.subtitle ? ` — ${e.subtitle}` : ''}</div>
                  <div className="text-[12px] text-neutral-700">{e.period}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Leadership & Activities (from Organizations) */}
        <section className="mt-5 break-before-auto">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Leadership & Activities</h3>
          <div className="mt-1 space-y-2">
            {(organizations||[]).map((o, idx) => (
              <div key={`${o.org}-${o.period}-${idx}`}>
                <div className="flex items-baseline justify-between">
                  <div className="font-semibold">{o.org}{o.role ? ` — ${o.role}` : ''}</div>
                  <div className="text-[12px] text-neutral-700">{o.period}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Projects (static highlights) */}
        <section className="mt-5 break-before-auto">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Projects</h3>
          <ul className="list-disc ml-6 mt-1">
            <li>Portfolio site with AI Assistant and Spotify integration — Next.js, Tailwind, Framer Motion, Netlify Functions.</li>
            <li>Mini Games: Chess and Flappy Bird with local persistence and responsive UI.</li>
          </ul>
        </section>

        {/* Achievements — complete list by year */}
        <section className="mt-5 break-before-page">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Achievements</h3>
          <div className="mt-1">
            {years.map((y) => {
              const list = achievements[y] || [];
              return (
                <div key={y} className="mt-2">
                  <div className="font-semibold text-[12px]">{y}</div>
                  <ul className="list-disc ml-6 mt-1">
                    {list.map((raw, i) => {
                      const item = typeof raw === 'string' ? { text: raw } : raw;
                      const label = item.text || '';
                      return <li key={`${y}-${i}`}>{label}</li>;
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Skills & Interests */}
        <section className="mt-5 break-before-auto">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Skills & Interests</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <div className="font-semibold mt-1">Technical</div>
              <ul className="list-disc ml-6 mt-1">
                <li>DevSecOps fundamentals; CI/CD; automation; cloud basics</li>
                <li>JavaScript/TypeScript, Node.js; React, Next.js, Tailwind CSS</li>
                <li>APIs & OAuth (PKCE); Netlify/Next serverless</li>
                <li>Framer Motion; UI/UX writing</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mt-1">Interests</div>
              <ul className="list-disc ml-6 mt-1">
                <li>Cybersecurity, software engineering, youth empowerment</li>
                <li>Community health literacy, ethical technology</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="mt-5 break-before-auto">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Contact</h3>
          <ul className="list-disc ml-6 mt-1">
            {contact?.email && <li>Email: {contact.email}</li>}
            {contact?.github && <li>GitHub: {contact.github}</li>}
            {contact?.linkedin && <li>LinkedIn: {contact.linkedin}</li>}
            {contact?.instagram && <li>Instagram: {contact.instagram}</li>}
          </ul>
        </section>

        {/* Publications */}
        <section className="mt-5 break-before-auto">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Publications</h3>
          <ul className="list-disc ml-6 mt-1">
            <li>“Gen-YAWS (Youth Awareness of Stunting)” — tech-enabled, peer-led nutrition literacy and community action.</li>
          </ul>
        </section>

        <div className="mt-4 text-[11px] text-neutral-600">
          References available upon request. Latest updates at aryanstack.netlify.app.
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          @page { size: A4; margin: 0.6in; }
          html, body { background: #fff; }
          .break-before-page { break-before: page; }
        }
      `}</style>
    </main>
  );
}
