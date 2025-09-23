import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import Overlay from '../components/Overlay';
import MobileNotice from '../components/MobileNotice';
import ShutdownOverlay from '../components/ShutdownOverlay';

const Scene = dynamic(() => import('../components/Scene'), { ssr: false });

export default function Home() {
  const [shutdown, setShutdown] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/get-site-flags',
        `${basePath}/.netlify/functions/get-site-flags`,
        '/api/get-site-flags',
        `${basePath}/api/get-site-flags`,
      ]));
      for (const url of urls) {
        try { const r = await fetch(url, { headers: { accept: 'application/json' } }); if (!r.ok) continue; const j = await r.json(); if (alive) { setShutdown(!!j.shutdown); } break; } catch {}
      }
    })();
    const onStorage = (e) => { if (e.key === 'site:flags') { try { const j = JSON.parse(e.newValue||'{}'); setShutdown(!!j.shutdown); } catch {} } };
    const onEvt = () => { try { const j = JSON.parse(localStorage.getItem('site:flags')||'{}'); setShutdown(!!j.shutdown); } catch {} };
    window.addEventListener('storage', onStorage);
    window.addEventListener('site:flags:updated', onEvt);
    return () => { alive = false; window.removeEventListener('storage', onStorage); window.removeEventListener('site:flags:updated', onEvt); };
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden bg-black relative">
      <Head>
        <meta name="google-site-verification" content="google12107fca04fa9b0f.html" />
      </Head>
      <Scene />
      <Overlay />
      <MobileNotice />
      {shutdown && <ShutdownOverlay />}
    </main>
  );
}
