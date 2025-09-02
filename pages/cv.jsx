import Head from 'next/head';
import { useEffect } from 'react';

export default function CVPage() {
  // Simple keyboard shortcut: Ctrl/Cmd+P to open print dialog (browser handles PDF save)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        // Let browser handle
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const printPDF = () => {
    try { window.print(); } catch {}
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <Head>
        <title>Aryan Zaky Prayogo — Curriculum Vitae</title>
        <meta name="robots" content="index,follow" />
        <meta name="description" content="Curriculum Vitae of Aryan Zaky Prayogo" />
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
          <h2 className="text-[22px] font-bold tracking-tight">ARYAN ZAKY PRAYOGO</h2>
          <div className="mt-1 text-[12px]">
            Brawijaya University • Computer Science • Malang, Indonesia · Email: prayogoaryan63@gmail.com · GitHub: github.com/aryanzkys · LinkedIn: linkedin.com/in/aryan-zaky-prayogo-a24164365/
          </div>
        </section>

        {/* Education */}
        <section className="mt-4">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Education</h3>
          <div className="mt-1">
            <div className="flex items-baseline justify-between">
              <div className="font-semibold">Brawijaya University — Bachelor of Computer Science</div>
              <div className="text-[12px] text-neutral-700">2024 — Present</div>
            </div>
            <ul className="list-disc ml-6 mt-1">
              <li>Relevant interests: DevSecOps, cybersecurity, software engineering; leadership and ethical tech.</li>
            </ul>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <div className="font-semibold">SMA Negeri 1 Singosari — Science</div>
              <div className="text-[12px] text-neutral-700">—</div>
            </div>
            <ul className="list-disc ml-6 mt-1">
              <li>Olympiad Club President; active in BDI, EC, BSC; ASEAN Youth Organization; SDG7 Youth Constituency.</li>
            </ul>
          </div>
        </section>

        {/* Experience / Leadership */}
        <section className="mt-4">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Leadership & Activities</h3>
          <div className="mt-1">
            <div className="flex items-baseline justify-between">
              <div className="font-semibold">Duta Gizi — Nutrition Goes To School (NGTS)</div>
              <div className="text-[12px] text-neutral-700">—</div>
            </div>
            <ul className="list-disc ml-6 mt-1">
              <li>Led classroom sessions on adolescent nutrition and health; identified unrecognized mild stunting cases.</li>
              <li>Co-authored “Gen-YAWS: Youth Awareness of Stunting” to mobilize peer-led literacy and community action.</li>
            </ul>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <div className="font-semibold">Student Organizations & Communities</div>
              <div className="text-[12px] text-neutral-700">—</div>
            </div>
            <ul className="list-disc ml-6 mt-1">
              <li>Active roles across school and international orgs; collaboration in education, innovation, and SDGs.</li>
            </ul>
          </div>
        </section>

        {/* Projects */}
        <section className="mt-4">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Projects</h3>
          <ul className="list-disc ml-6 mt-1">
            <li>Portfolio site with AI Assistant and Spotify integration: Next.js, Tailwind, Framer Motion, Netlify Functions.</li>
            <li>Mini Games: Chess and Flappy Bird implementations with local persistence.</li>
          </ul>
        </section>

        {/* Awards */}
        <section className="mt-4">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Awards & Recognitions</h3>
          <ul className="list-disc ml-6 mt-1">
            <li>20+ awards spanning science, languages, research, and entrepreneurship.</li>
          </ul>
        </section>

        {/* Skills */}
        <section className="mt-4">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Skills</h3>
          <ul className="list-disc ml-6 mt-1 grid grid-cols-2 gap-x-8">
            <li>DevSecOps fundamentals, CI/CD</li>
            <li>Cybersecurity awareness & hardening</li>
            <li>JavaScript/TypeScript, Node.js</li>
            <li>React, Next.js, Tailwind CSS</li>
            <li>APIs, OAuth (Spotify PKCE)</li>
            <li>Framer Motion, UX writing</li>
          </ul>
        </section>

        {/* Publications */}
        <section className="mt-4">
          <h3 className="font-bold uppercase tracking-wide text-[12px] border-b border-neutral-300">Publications</h3>
          <ul className="list-disc ml-6 mt-1">
            <li>“Gen-YAWS (Youth Awareness of Stunting)”: Community-based, tech-enabled adolescent nutrition literacy.</li>
          </ul>
        </section>

        {/* Footer note */}
        <div className="mt-4 text-[11px] text-neutral-600">
          References available upon request. For the latest profile and achievements, visit aryanstack.netlify.app.
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          @page { size: A4; margin: 0.6in; }
          html, body { background: #fff; }
        }
      `}</style>
    </main>
  );
}
