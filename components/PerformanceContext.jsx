import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const PerformanceContext = createContext({ mode: 'auto', setMode: () => {}, isLite: false });

function detectLite() {
  if (typeof window === 'undefined') return false;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const uaMatch = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Tablet/i.test(ua);
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const narrow = typeof window.innerWidth === 'number' && window.innerWidth <= 1024;
  return uaMatch || coarse || narrow;
}

export function PerformanceProvider({ children }) {
  const [mode, setMode] = useState('auto'); // auto | lite | high

  useEffect(() => {
    try {
      const saved = localStorage.getItem('perfMode');
      if (saved === 'lite' || saved === 'high' || saved === 'auto') setMode(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('perfMode', mode); } catch {}
  }, [mode]);

  const isLite = useMemo(() => (mode === 'lite') || (mode === 'auto' && detectLite()), [mode]);
  const value = useMemo(() => ({ mode, setMode, isLite }), [mode, isLite]);
  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>;
}

export function usePerformance() {
  return useContext(PerformanceContext);
}
