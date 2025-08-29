import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const DataCtx = createContext(null);

export function DataProvider({ children }) {
  const [achievementsByYear, setAchievements] = useState(null);
  const [organizations, setOrganizations] = useState(null);
  const [education, setEducation] = useState(null);
  const [loading, setLoading] = useState({ achievements: false, organizations: false, education: false });

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const fetchJSON = async (candidates) => {
    for (const base of Array.from(new Set(candidates))) {
      const url = `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`; // cache-bust
      try {
        const res = await fetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) continue;
        return await res.json();
      } catch (_) {}
    }
    return null;
  };

  const refreshAchievements = async () => {
    setLoading((s) => ({ ...s, achievements: true }));
    const json = await fetchJSON([
      '/.netlify/functions/get-achievements',
      `${basePath}/.netlify/functions/get-achievements`,
      `${basePath}/api/get-achievements`,
      '/api/get-achievements',
    ]);
    if (json && typeof json === 'object') setAchievements(json);
    setLoading((s) => ({ ...s, achievements: false }));
  };

  const refreshOrganizations = async () => {
    setLoading((s) => ({ ...s, organizations: true }));
    const json = await fetchJSON([
      '/.netlify/functions/get-organizations',
      `${basePath}/.netlify/functions/get-organizations`,
    ]);
    if (Array.isArray(json)) setOrganizations(json);
    setLoading((s) => ({ ...s, organizations: false }));
  };

  const refreshEducation = async () => {
    setLoading((s) => ({ ...s, education: true }));
    const json = await fetchJSON([
      '/.netlify/functions/get-education',
      `${basePath}/.netlify/functions/get-education`,
    ]);
    if (Array.isArray(json)) setEducation(json);
    setLoading((s) => ({ ...s, education: false }));
  };

  useEffect(() => {
    // Prefetch all on app start so sections show instantly
    refreshAchievements();
    refreshOrganizations();
    refreshEducation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ra = () => refreshAchievements();
    const ro = () => refreshOrganizations();
    const re = () => refreshEducation();
    window.addEventListener('data:refresh:achievements', ra);
    window.addEventListener('data:refresh:organizations', ro);
    window.addEventListener('data:refresh:education', re);
    return () => {
      window.removeEventListener('data:refresh:achievements', ra);
      window.removeEventListener('data:refresh:organizations', ro);
      window.removeEventListener('data:refresh:education', re);
    };
  }, []);

  const value = useMemo(
    () => ({
      achievementsByYear,
      organizations,
      education,
      loading,
      refreshAchievements,
      refreshOrganizations,
      refreshEducation,
    }),
    [achievementsByYear, organizations, education, loading]
  );

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  return useContext(DataCtx) || {};
}
