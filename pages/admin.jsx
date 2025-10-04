import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import achievementsData from '../data/achievements.json';
import educationData from '../data/education.json';
import orgsData from '../data/organizations.json';
import { AuthProvider, useAuth } from '../components/AuthProvider';
import dynamic from 'next/dynamic';
const { default: _noop } = { default: null };
const AnnouncementCard = dynamic(() => import('../components/AnnouncementPopup').then(m => ({ default: m.AnnouncementCard })), { ssr: false });
const MessagesAdmin = dynamic(() => import('../components/admin/MessagesAdmin'), { ssr: false });
const DevSection = dynamic(() => import('../components/AdminPanel/DevSection'), { ssr: false });
import { useRouter } from 'next/router';
import { getAuth, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isDev() {
  return process.env.NODE_ENV !== 'production';
}

function AdminInner() {
  const [tab, setTab] = useState('achievements');
  const [data, setData] = useState(() => deepClone(achievementsData));
  const [edu, setEdu] = useState(() => deepClone(educationData));
  const [orgs, setOrgs] = useState(() => deepClone(orgsData));
  const [saving, setSaving] = useState(false);
  const [savingKind, setSavingKind] = useState(null);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [showSignout, setShowSignout] = useState(false);
  const [signoutBusy, setSignoutBusy] = useState(false);
  // Admin Profile state
  const [displayName, setDisplayName] = useState('');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwVisible, setPwVisible] = useState({ current: false, next: false, confirm: false });
  const [selected, setSelected] = useState(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  // Announcements
  const [ann, setAnn] = useState({ active: false, title: '', message: '', severity: 'info', ctaText: '', ctaUrl: '', version: '1', expiresAt: '', dismissible: true, target: 'both' });
  const [annLiveStatus, setAnnLiveStatus] = useState({ state: 'unknown', via: null }); // unknown | live | pending
  const [annSaving, setAnnSaving] = useState(false);
  const [annMobilePreview, setAnnMobilePreview] = useState(false);
  const [annTab, setAnnTab] = useState('edit');
  const [annList, setAnnList] = useState([]);
  // List filters & pagination for announcements
  const [annFilterTarget, setAnnFilterTarget] = useState('all'); // all | main | ai | both
  const [annFilterStatus, setAnnFilterStatus] = useState('all'); // all | active | inactive
  const [annSearch, setAnnSearch] = useState('');
  const [annPage, setAnnPage] = useState(1);
  const [annPageSize, setAnnPageSize] = useState(10);
  const annFiltered = useMemo(() => {
    const q = annSearch.trim().toLowerCase();
    const arr = (Array.isArray(annList) ? annList : []).filter((it) => {
      if (annFilterTarget !== 'all') {
        const tgt = (it.target || 'both');
        if (tgt !== annFilterTarget) return false;
      }
      if (annFilterStatus !== 'all') {
        if (annFilterStatus === 'active' && !it.active) return false;
        if (annFilterStatus === 'inactive' && it.active) return false;
      }
      if (q) {
        const hay = `${it.title||''}\n${it.message||''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return arr;
  }, [annList, annFilterTarget, annFilterStatus, annSearch]);
  const annPageCount = useMemo(() => Math.max(1, Math.ceil(annFiltered.length / annPageSize)), [annFiltered.length, annPageSize]);
  const annPageItems = useMemo(() => {
    const page = Math.min(Math.max(1, annPage), annPageCount);
    const start = (page - 1) * annPageSize;
    return annFiltered.slice(start, start + annPageSize);
  }, [annFiltered, annPage, annPageSize, annPageCount]);
  // Admin authority
  const [authority, setAuthority] = useState(null); // { canEditSections, canAccessDev, banned }
  const [authzLoading, setAuthzLoading] = useState(true);
  const [authzError, setAuthzError] = useState('');
  const OWNER_EMAIL = (process.env.NEXT_PUBLIC_OWNER_EMAIL || 'prayogoaryan63@gmail.com').toLowerCase();

  const years = useMemo(() => Object.keys(data).sort((a, b) => Number(b) - Number(a)), [data]);

  useEffect(() => {
    // achievements
    (async () => {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const candidates = Array.from(new Set([
        '/.netlify/functions/get-achievements',
        `${basePath}/.netlify/functions/get-achievements`,
        `${basePath}/api/get-achievements`,
        '/api/get-achievements',
      ]));
      for (const url of candidates) {
        try {
          const res = await fetch(url, { headers: { accept: 'application/json' } });
          if (!res.ok) continue;
          const json = await res.json();
          setData(deepClone(json));
          setMessage(`Loaded data from ${url}`);
          break;
        } catch {}
      }
    })();
    // education
    (async () => {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const candidates = Array.from(new Set([
        '/.netlify/functions/get-education',
        `${basePath}/.netlify/functions/get-education`,
      ]));
      for (const url of candidates) {
        try {
          const res = await fetch(url, { headers: { accept: 'application/json' } });
          if (!res.ok) continue;
          const json = await res.json();
          setEdu(deepClone(json));
          break;
        } catch {}
      }
    })();
    // organizations
    (async () => {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const candidates = Array.from(new Set([
        '/.netlify/functions/get-organizations',
        `${basePath}/.netlify/functions/get-organizations`,
      ]));
      for (const url of candidates) {
        try {
          const res = await fetch(url, { headers: { accept: 'application/json' } });
          if (!res.ok) continue;
          const json = await res.json();
          setOrgs(deepClone(json));
          break;
        } catch {}
      }
    })();
    // announcement
    (async () => {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/get-announcement',
        `${basePath}/.netlify/functions/get-announcement`,
        '/api/get-announcement',
        `${basePath}/api/get-announcement`,
      ]));
      for (const url of urls) {
        try {
          const res = await fetch(url, { headers: { accept: 'application/json' } });
          if (!res.ok) continue;
          const json = await res.json();
          setAnn({ active: !!json.active, title: json.title||'', message: json.message||'', severity: json.severity||'info', ctaText: json.ctaText||'', ctaUrl: json.ctaUrl||'', version: String(json.version || '1'), expiresAt: json.expiresAt || '', dismissible: json.dismissible !== false, target: json.target || 'both' });
          setAnnLiveStatus({ state: json && json.active ? 'live' : 'unknown', via: null });
          break;
        } catch {}
      }
    })();
  }, []);

  // Load authority for current user
  useEffect(() => {
    (async () => {
      if (!user) return;
      setAuthzLoading(true); setAuthzError('');
      try {
        const email = (user.email || '').toLowerCase();
        // Owner: grant full access immediately even if backend endpoints fail
        if (email === OWNER_EMAIL) {
          setAuthority({ canEditSections: true, canAccessDev: true, banned: false });
          setAuthzLoading(false);
          return;
        }
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const urls = Array.from(new Set([
          '/.netlify/functions/admins-list',
          `${basePath}/.netlify/functions/admins-list`,
          '/api/admins-list',
          `${basePath}/api/admins-list`,
        ]));
        let data = null; let lastErr = '';
        for (const url of urls) {
          try { const r = await fetch(url); if (r.ok) { data = await r.json(); break; } else lastErr = `HTTP ${r.status}`; } catch (e) { lastErr = e?.message || 'Network'; }
        }
        if (!data) throw new Error(lastErr || 'Failed');
        const uid = user.uid;
        // Owner gets full access automatically
        const row = (Array.isArray(data) ? data : []).find((a) => (uid && a.uid === uid) || (email && a.email && String(a.email).toLowerCase() === email)) || null;
        setAuthority(row || { canEditSections: false, canAccessDev: false, banned: false });
      } catch (e) { setAuthzError(e?.message || 'Failed to load permissions'); }
      finally { setAuthzLoading(false); }
    })();
  }, [user]);

  // Initialize profile fields from user
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
    const onKey = (e) => {
      if (!user) return;
      const ae = document.activeElement;
      const tag = (ae?.tagName || '').toLowerCase();
      const typing = (tag === 'input' || tag === 'textarea' || tag === 'select' || ae?.isContentEditable);
      if (typing) {
        // Allow Ctrl/Cmd+S to save even when typing, but block other single-key actions
        if (!(e.ctrlKey || e.metaKey)) return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          if (tab === 'achievements') saveToFile();
        } else {
          if (tab === 'achievements') saveToDb();
          else if (tab === 'education') saveEdu();
          else if (tab === 'organizations') saveOrgs();
          else if (tab === 'announcements') saveAnnouncement();
          else if (tab === 'admin-profile') onSaveDisplayName();
        }
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === 'r') {
          if (tab === 'achievements') reloadFromBackend();
          else if (tab === 'education') reloadEducation();
          else if (tab === 'organizations') reloadOrganizations();
          else if (tab === 'announcements') reloadAnnouncement();
        }
        if (e.key.toLowerCase() === 'n' && tab === 'achievements') { addYear(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user, tab, data, edu, orgs, displayName, pwCurrent, pwNew, pwConfirm]);

  // Expose actor for DevSection auditing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__adminActor = { email: user?.email || null, uid: user?.uid || null, name: user?.displayName || null };
    }
  }, [user]);

  // Presence heartbeat while on admin page
  useEffect(() => {
    let timer;
    const beat = async () => {
      if (!user) return;
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const urls = Array.from(new Set([
        '/.netlify/functions/admin-presence-heartbeat',
        `${basePath}/.netlify/functions/admin-presence-heartbeat`,
        '/api/admin-presence-heartbeat',
        `${basePath}/api/admin-presence-heartbeat`,
      ]));
      for (const url of urls) {
        try {
          const provider = (user?.providerData && user.providerData[0]?.providerId) || null;
          await fetch(url, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ email: user.email, uid: user.uid, name: user.displayName, provider }) });
          break;
        } catch {}
      }
    };
    const start = () => {
      beat();
      timer = setInterval(beat, 60 * 1000);
    };
    if (user) start();
    return () => { if (timer) clearInterval(timer); };
  }, [user]);

  const onMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseRef.current = { x, y };
    e.currentTarget.style.setProperty('--mx', x);
    e.currentTarget.style.setProperty('--my', y);
  }, []);

  const addYear = () => {
    const y = prompt('Add Year (e.g., 2026):');
    if (!y) return;
    if (!/^[0-9]{4}$/.test(y)) { alert('Invalid year'); return; }
    if (data[y]) { alert('Year already exists'); return; }
    setData({ ...data, [y]: [] });
  };

  const addItem = (year) => {
    const next = deepClone(data);
    next[year].push({ text: '', cert: '' });
    setData(next);
  };

  const reorderAchievement = (year, from, to) => {
    if (from === to) return;
    const arr = Array.from(data[year] || []);
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    setData({ ...data, [year]: arr });
  };

  const onDragStartItem = (year, idx, e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ year, idx }));
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOverItem = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const onDropItem = (year, idx, e) => {
    e.preventDefault();
    try {
      const { year: fromYear, idx: fromIdx } = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      if (fromYear === year && Number.isInteger(fromIdx)) {
        reorderAchievement(year, fromIdx, idx);
      }
    } catch {}
  };

  const removeItem = (year, idx) => {
    const next = deepClone(data);
    next[year].splice(idx, 1);
    setData(next);
  };

  const updateItem = (year, idx, key, value) => {
    const next = deepClone(data);
    const item = next[year][idx];
    if (typeof item === 'string') next[year][idx] = { text: value };
    else next[year][idx] = { ...item, [key]: value };
    setData(next);
  };

  const getDriveId = (url) => {
    if (!url) return null;
    const m = url.match(/\/d\/([A-Za-z0-9_-]+)/) || url.match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (!m) return null;
    // Only allow valid Google Drive ID: 10-100 chars, alphanum, dash, underscore
    const id = m[1];
    if (/^[A-Za-z0-9_-]{10,100}$/.test(id)) {
      return id;
    }
    return null;
  };
  const getDrivePreviewUrl = (url) => {
    const id = getDriveId(url);
    // Only allow canonical Google Drive preview URLs
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  };

  const normalize = (d) => {
    const out = {};
    Object.entries(d).forEach(([y, items]) => {
      out[y] = items.map((it) => (typeof it === 'string' ? { text: it } : { text: it.text || '', cert: it.cert || '' }));
    });
    return out;
  };

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg || 'Saved successfully');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1600);
  };

  const saveDev = async () => {
    if (!isDev()) return;
    setSaving(true);
    setMessage('');
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const candidates = Array.from(new Set([
        `${basePath}/api/save-achievements`,
        '/api/save-achievements',
      ]));
      let ok = false; let lastErr = '';
      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(normalize(data)) });
          if (res.ok) { setMessage(`Saved to data/achievements.json via ${url}`); ok = true; break; }
          else { lastErr = `HTTP ${res.status} on ${url}: ${await res.text()}`; }
        } catch (e) { lastErr = `Request failed on ${url}: ${e.message}`; }
      }
      if (!ok) throw new Error(lastErr || 'Unknown error');
    } catch (e) { setMessage(`Save failed: ${e.message}`); }
    finally { setSaving(false); }
  };

  const reloadFromBackend = async () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const candidates = Array.from(new Set([
      '/.netlify/functions/get-achievements',
      `${basePath}/.netlify/functions/get-achievements`,
      `${basePath}/api/get-achievements`,
      '/api/get-achievements',
    ]));
    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) continue;
        const json = await res.json();
        setData(deepClone(json));
        setMessage((m) => (m ? `${m} • Reloaded from ${url}` : `Reloaded from ${url}`));
        break;
      } catch {}
    }
  };

  const reloadEducation = async () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const candidates = Array.from(new Set([
      '/.netlify/functions/get-education',
      `${basePath}/.netlify/functions/get-education`,
    ]));
    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) continue;
        const json = await res.json();
        setEdu(deepClone(json));
        setMessage((m) => (m ? `${m} • Reloaded education` : 'Reloaded education'));
        break;
      } catch {}
    }
  };

  const reloadOrganizations = async () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const candidates = Array.from(new Set([
      '/.netlify/functions/get-organizations',
      `${basePath}/.netlify/functions/get-organizations`,
    ]));
    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) continue;
        const json = await res.json();
        setOrgs(deepClone(json));
        setMessage((m) => (m ? `${m} • Reloaded organizations` : 'Reloaded organizations'));
        break;
      } catch {}
    }
  };

  const reloadAnnouncement = async () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const urls = Array.from(new Set([
      '/.netlify/functions/get-announcement',
      `${basePath}/.netlify/functions/get-announcement`,
      '/api/get-announcement',
      `${basePath}/api/get-announcement`,
    ]));
    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) continue;
        const json = await res.json();
        setAnn({ active: !!json.active, title: json.title||'', message: json.message||'', severity: json.severity||'info', ctaText: json.ctaText||'', ctaUrl: json.ctaUrl||'', version: String(json.version || '1'), expiresAt: json.expiresAt || '', dismissible: json.dismissible !== false, target: json.target || 'both' });
        setMessage((m) => (m ? `${m} • Reloaded announcement` : 'Reloaded announcement'));
        break;
      } catch {}
    }
  };

  const reloadAnnouncementList = async () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const urls = Array.from(new Set([
      '/.netlify/functions/list-announcements',
      `${basePath}/.netlify/functions/list-announcements`,
      '/api/list-announcements',
      `${basePath}/api/list-announcements`,
    ]));
    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
        if (!res.ok) continue;
        const json = await res.json();
        setAnnList(Array.isArray(json) ? json : []);
        break;
      } catch {}
    }
  };

  const saveToDb = async () => {
    setSaving(true);
    setSavingKind('achievements');
    setMessage('');
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const candidates = Array.from(new Set([
        '/.netlify/functions/save-achievements',
        `${basePath}/.netlify/functions/save-achievements`,
      ]));
      let ok = false; let lastErr = '';
      const payload = JSON.stringify(normalize(data));
      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload });
          if (res.ok) { setMessage(`Saved via ${url}`); triggerSuccess('Achievements saved'); ok = true; break; }
          else { lastErr = `HTTP ${res.status} on ${url}: ${await res.text()}`; }
        } catch (e) { lastErr = `Request failed on ${url}: ${e.message}`; }
      }
      if (!ok) throw new Error(lastErr || 'Unknown error');
      window.dispatchEvent(new Event('data:refresh:achievements'));
      await reloadFromBackend();
    } catch (e) { setMessage(`Save to DB failed: ${e.message}`); }
    finally { setSaving(false); setSavingKind(null); }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(normalize(data), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'achievements.json'; a.click(); URL.revokeObjectURL(url);
  };

  const addEdu = () => setEdu([...edu, { title: '', subtitle: '', period: '' }]);
  const removeEdu = (idx) => setEdu(edu.filter((_, i) => i !== idx));
  const updateEdu = (idx, key, value) => { const next = deepClone(edu); next[idx] = { ...next[idx], [key]: value }; setEdu(next); };
  const saveEdu = async () => {
    setSaving(true); setSavingKind('education'); setMessage('');
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const candidates = Array.from(new Set([
        '/.netlify/functions/save-education',
        `${basePath}/.netlify/functions/save-education`,
      ]));
      let ok = false; let lastErr = '';
      const payload = JSON.stringify(edu);
      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload });
          if (res.ok) { setMessage(`Saved education via ${url}`); triggerSuccess('Education saved'); ok = true; break; }
          else { lastErr = `HTTP ${res.status} on ${url}: ${await res.text()}`; }
        } catch (e) { lastErr = `Request failed on ${url}: ${e.message}`; }
      }
      if (!ok) throw new Error(lastErr || 'Unknown error');
      window.dispatchEvent(new Event('data:refresh:education'));
      await reloadEducation();
    } catch (e) { setMessage(`Save education failed: ${e.message}`); }
    finally { setSaving(false); setSavingKind(null); }
  };

  const addOrg = () => setOrgs([...orgs, { org: '', role: '', period: '' }]);
  const removeOrg = (idx) => setOrgs(orgs.filter((_, i) => i !== idx));
  const updateOrg = (idx, key, value) => { const next = deepClone(orgs); next[idx] = { ...next[idx], [key]: value }; setOrgs(next); };
  const saveOrgs = async () => {
    setSaving(true); setSavingKind('organizations'); setMessage('');
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const candidates = Array.from(new Set([
        '/.netlify/functions/save-organizations',
        `${basePath}/.netlify/functions/save-organizations`,
      ]));
      let ok = false; let lastErr = '';
      const payload = JSON.stringify(orgs);
      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload });
          if (res.ok) { setMessage(`Saved organizations via ${url}`); triggerSuccess('Organizations saved'); ok = true; break; }
          else { lastErr = `HTTP ${res.status} on ${url}: ${await res.text()}`; }
        } catch (e) { lastErr = `Request failed on ${url}: ${e.message}`; }
      }
      if (!ok) throw new Error(lastErr || 'Unknown error');
      window.dispatchEvent(new Event('data:refresh:organizations'));
      await reloadOrganizations();
    } catch (e) { setMessage(`Save organizations failed: ${e.message}`); }
    finally { setSaving(false); setSavingKind(null); }
  };

  const saveAnnouncement = async () => {
    setAnnSaving(true); setMessage('');
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const candidates = Array.from(new Set([
        '/.netlify/functions/save-announcement',
        `${basePath}/.netlify/functions/save-announcement`,
        '/api/save-announcement',
        `${basePath}/api/save-announcement`,
      ]));
      let ok = false; let lastErr = '';
      const payload = JSON.stringify(ann);
      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload });
          if (res.ok) { setMessage(`Announcement saved via ${url}`); triggerSuccess('Announcement saved'); ok = true; break; }
          else { lastErr = `HTTP ${res.status} on ${url}: ${await res.text()}`; }
        } catch (e) { lastErr = `Request failed on ${url}: ${e.message}`; }
      }
      if (!ok) throw new Error(lastErr || 'Unknown error');
      await reloadAnnouncement();
      // After save, verify live status once
      await checkAnnouncementLive();
      // Also refresh list if admin is viewing list tab
      if (annTab === 'list') {
        await reloadAnnouncementList();
      }
    } catch (e) { setMessage(`Save announcement failed: ${e.message}`); }
    finally { setAnnSaving(false); }
  };

  const checkAnnouncementLive = async () => {
    try {
      setAnnLiveStatus({ state: 'pending', via: null });
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const baseUrls = Array.from(new Set([
        '/.netlify/functions/get-announcement',
        `${basePath}/.netlify/functions/get-announcement`,
        '/api/get-announcement',
        `${basePath}/api/get-announcement`,
      ]));

      const checkOne = async (u) => {
        try {
          const res = await fetch(u, { headers: { accept: 'application/json' }, cache: 'no-store' });
          if (!res.ok) return false;
          const json = await res.json();
          return !!json && json.active === ann.active && (json.title||'') === (ann.title||'') && (json.message||'') === (ann.message||'') && String(json.version||'') === String(ann.version||'') && (json.target||'both') === (ann.target||'both');
        } catch { return false; }
      };

      // If target is specific, query with ?target first for precision
      if (ann.target === 'main' || ann.target === 'ai') {
        for (const b of baseUrls) {
          const withTarget = `${b}?target=${encodeURIComponent(ann.target)}`;
          if (await checkOne(withTarget)) { setAnnLiveStatus({ state: 'live', via: b.includes('/api/') ? 'dev' : 'prod' }); return; }
        }
        // Fallback: try without target param (older backends)
        for (const b of baseUrls) {
          if (await checkOne(b)) { setAnnLiveStatus({ state: 'live', via: b.includes('/api/') ? 'dev' : 'prod' }); return; }
        }
      } else {
        // target === 'both' -> ensure both main and ai endpoints reflect the same content
        let mainOk = false, aiOk = false, via = null;
        for (const b of baseUrls) {
          const um = `${b}?target=main`;
          const ua = `${b}?target=ai`;
          const m = await checkOne(um);
          const a = await checkOne(ua);
          if (m) { mainOk = true; via = b.includes('/api/') ? 'dev' : 'prod'; }
          if (a) { aiOk = true; via = b.includes('/api/') ? 'dev' : 'prod'; }
          if (mainOk && aiOk) { setAnnLiveStatus({ state: 'live', via }); return; }
        }
        // Fallback single call (no target param)
        for (const b of baseUrls) {
          if (await checkOne(b)) { setAnnLiveStatus({ state: 'live', via: b.includes('/api/') ? 'dev' : 'prod' }); return; }
        }
      }
      setAnnLiveStatus({ state: 'pending', via: null });
    } catch {
      setAnnLiveStatus({ state: 'unknown', via: null });
    }
  };

  // Poll for live status while announcement is active and not yet live
  useEffect(() => {
    let timer;
    if (tab === 'announcements' && ann.active && annLiveStatus.state !== 'live') {
      timer = setInterval(() => { checkAnnouncementLive(); }, 4000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [tab, ann.active, ann.title, ann.message, ann.version, ann.target, annLiveStatus.state]);

  const saveToFile = async () => {
    try {
      const payload = JSON.stringify(normalize(data), null, 2);
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({ suggestedName: 'achievements.json', types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
        const writable = await handle.createWritable(); await writable.write(payload); await writable.close(); setMessage('Saved to file using File System Access API');
      } else { downloadJson(); setMessage('Browser does not support direct save; downloaded JSON instead'); }
    } catch (e) { setMessage(`Save-to-file failed: ${e.message}`); }
  };

  const importFromFile = async () => {
    try {
      const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json';
      input.onchange = async () => { const file = input.files?.[0]; if (!file) return; const text = await file.text(); const json = JSON.parse(text); setData(json); setMessage('Imported data from file'); };
      input.click();
    } catch (e) { setMessage(`Import failed: ${e.message}`); }
  };

  const onSaveDisplayName = async () => {
    if (!user) return;
    if (!displayName || displayName.length < 2) { setMessage('Name too short'); return; }
    setSaving(true); setSavingKind('profile'); setMessage('');
    try {
      const auth = getAuth();
      await updateProfile(auth.currentUser, { displayName });
      await refreshUser();
      triggerSuccess('Profile name updated');
    } catch (e) {
      setMessage(`Save profile failed: ${e?.message || 'Unknown error'}`);
    } finally { setSaving(false); setSavingKind(null); }
  };

  const onChangePassword = async () => {
    if (!user) return;
    if (!pwNew || pwNew.length < 8) { setMessage('New password must be at least 8 characters'); return; }
    if (pwNew !== pwConfirm) { setMessage('New password and confirmation do not match'); return; }
    setSaving(true); setSavingKind('password'); setMessage('');
    try {
      const auth = getAuth();
      const current = auth.currentUser;
      // If provider is email, reauthenticate with current password
      if (user?.providerData?.some(p => p.providerId === 'password')) {
        if (!pwCurrent) { setMessage('Enter your current password'); setSaving(false); setSavingKind(null); return; }
        const cred = EmailAuthProvider.credential(user.email, pwCurrent);
        await reauthenticateWithCredential(current, cred);
      }
      await updatePassword(current, pwNew);
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      triggerSuccess('Password updated');
    } catch (e) {
      setMessage(`Password update failed: ${e?.message || 'Unknown error'}`);
    } finally { setSaving(false); setSavingKind(null); }
  };

  return (
  <div className="min-h-screen relative text-gray-100" onMouseMove={onMouseMove}>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: `radial-gradient(1200px 600px at calc(var(--mx,0.5)*100%) calc(var(--my,0.3)*100%), rgba(34,211,238,0.15), transparent 60%), radial-gradient(800px 400px at 50% 0%, rgba(59,130,246,0.12), transparent 70%)`
        }} />
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: `linear-gradient(transparent 96%, rgba(148,163,184,0.2) 97%), linear-gradient(90deg, transparent 96%, rgba(148,163,184,0.2) 97%)`,
          backgroundSize: '40px 40px',
          transform: 'perspective(800px) rotateX(45deg) translateY(-10%)',
          transformOrigin: 'top center'
        }} />
        <div className="absolute inset-0 bg-black/70" />
      </div>
      <div className="relative p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-400/30 overflow-hidden">
                <div className="absolute inset-0 opacity-40" style={{ background: 'conic-gradient(from 0deg, transparent, rgba(34,211,238,0.3), transparent 30%)' }} />
                <div className="absolute inset-0 animate-pulse bg-cyan-500/5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-cyan-300">Admin Panel</h1>
                <div className="text-xs text-gray-400">Robotic black theme • Interactive editor</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (tab === 'achievements') reloadFromBackend();
                  else if (tab === 'education') reloadEducation();
                  else if (tab === 'organizations') reloadOrganizations();
                  else if (tab === 'announcements') reloadAnnouncement();
                }}
                className="px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10"
                title={`Reload ${tab}`}
              >
                Reload
              </button>
              <button
                onClick={() => { if (tab === 'achievements') saveToFile(); }}
                className="px-3 py-2 rounded-md bg-cyan-600/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-600/30 disabled:opacity-50"
                title={tab === 'achievements' ? 'Save achievements.json locally (Ctrl+Shift+S)' : 'Available only in Achievements tab'}
                disabled={tab !== 'achievements'}
              >
                Save to File
              </button>
              <button
                onClick={() => {
                  if (tab === 'achievements') saveToDb();
                  else if (tab === 'education') saveEdu();
                  else if (tab === 'organizations') saveOrgs();
                  else if (tab === 'announcements') saveAnnouncement();
                  else if (tab === 'admin-profile') onSaveDisplayName();
                }}
                disabled={saving}
                className="px-3 py-2 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30"
                title={`Save ${tab} to DB (Ctrl+S)`}
              >
                {saving ? `Saving ${savingKind==='achievements'?'Achievements':savingKind==='education'?'Education':savingKind==='organizations'?'Organizations':'Data'}…` : 'Save to DB'}
              </button>
              <button onClick={() => setShowSignout(true)} className="px-3 py-2 rounded-md bg-red-600/20 border border-red-500/40 text-red-200 hover:bg-red-600/30" title="Sign out">Sign out</button>
            </div>
          </div>
          {/* Tabs visible depend on authority */}
          <div className="mb-4 flex gap-2">
      {(['achievements','education','organizations','announcements','messages','dev','admin-profile']
              .filter((t)=>{
                if (t==='dev') return !!authority?.canAccessDev;
        if (t==='messages') return !!authority?.canEditSections;
        if (t==='announcements') return !!authority?.canEditSections;
        if (t==='admin-profile') return true; // profile always visible
                // content editing tabs
                return !!authority?.canEditSections;
              }))
              .map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-md border relative overflow-hidden ${tab===t? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200':'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <span className="relative z-10">{t==='admin-profile' ? 'Admin Profile' : t.charAt(0).toUpperCase()+t.slice(1)}</span>
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>

          {/* Banned overlay or restrictions */}
          {!authzLoading && authority?.banned && (
            <div className="mb-4 rounded-lg border border-red-400/40 bg-red-600/10 p-3 text-sm text-red-200">Your admin access has been revoked. Contact the owner.</div>
          )}

          {tab === 'achievements' && authority?.canEditSections && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-cyan-300">Achievements</h2>
                <div className="flex gap-2">
                  <button onClick={addYear} className="px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Add Year</button>
                  <button onClick={importFromFile} className="px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10" title="Import achievements.json">Import JSON</button>
                  <button onClick={downloadJson} className="px-3 py-2 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30" title="Download achievements.json">Download JSON</button>
                  <button onClick={saveDev} disabled={!isDev() || saving} className="px-3 py-2 rounded-md bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 disabled:opacity-50 hover:bg-fuchsia-500/30" title={isDev() ? 'Save to data/achievements.json (dev only)' : 'Disabled in production'}>{saving ? 'Saving…' : 'Save (dev)'}</button>
                </div>
              </div>
              <div className="space-y-8">
                {years.map((year) => (
                  <section key={year} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-white">{year}</h2>
                      <button onClick={() => addItem(year)} className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15">+ Add Item</button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4">
                      <div className="space-y-3">
                        {(data[year] || []).map((it, idx) => {
                          const item = typeof it === 'string' ? { text: it } : it;
                          return (
                            <motion.div key={idx} layout draggable onDragStart={(e) => onDragStartItem(year, idx, e)} onDragOver={onDragOverItem} onDrop={(e) => onDropItem(year, idx, e)} whileHover={{ scale: 1.01 }} className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-black/30 border ${selected && selected.year===year && selected.idx===idx ? 'border-cyan-400/50' : 'border-white/10'} rounded-lg p-3 cursor-grab active:cursor-grabbing`} onClick={() => setSelected({ year, idx })}>
                              <div className="md:col-span-6">
                                <label className="block text-xs text-gray-300 mb-1">Text</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-400" value={item.text || ''} placeholder="e.g., 🥇 1st Place, ..." onChange={(e) => updateItem(year, idx, 'text', e.target.value)} />
                              </div>
                              <div className="md:col-span-5">
                                <label className="block text-xs text-gray-300 mb-1">Google Drive Link (optional)</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-fuchsia-400" value={item.cert || ''} placeholder="https://drive.google.com/file/d/FILE_ID/view" onChange={(e) => updateItem(year, idx, 'cert', e.target.value)} />
                              </div>
                              <div className="md:col-span-1 flex md:justify-end">
                                <button onClick={() => removeItem(year, idx)} className="px-3 py-2 rounded-md bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30">Delete</button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                      <div className="rounded-lg bg-black/40 border border-white/10 p-3 min-h-[220px]">
                        <div className="text-sm text-gray-300 mb-2">Live Preview</div>
                        {!selected ? (
                          <div className="text-xs text-gray-500">Select an item to preview the certificate link.</div>
                        ) : (
                          (() => {
                            const item = (data[selected.year]||[])[selected.idx] || {};
                            const url = item.cert;
                            const preview = getDrivePreviewUrl(url);
                            return preview && preview.startsWith('https://drive.google.com/file/d/') && preview.endsWith('/preview') ? (
                              <div className="aspect-video rounded-md overflow-hidden border border-white/10">
                                <iframe src={preview} className="w-full h-full" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" />
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">No valid Google Drive link detected. Paste a link like https://drive.google.com/file/d/FILE_ID/view</div>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}

          <AnimatePresence>
            {message && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-md p-3 shadow-lg">
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          {tab === 'education' && authority?.canEditSections && (
            <section className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Education</h2>
                <div className="flex gap-2">
                  <button onClick={addEdu} className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15">+ Add</button>
                  <button onClick={saveEdu} disabled={saving} title="Save education to DB (Ctrl+S)" className="px-3 py-2 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30">{saving?'Saving Education…':'Save to DB'}</button>
                </div>
              </div>
              <div className="space-y-3">
                {edu.map((it, idx) => (
                  <motion.div key={idx} layout whileHover={{ scale: 1.01 }} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-black/30 border border-white/10 rounded-lg p-3">
                    <div className="md:col-span-4">
                      <label className="block text-xs text-gray-300 mb-1">Title</label>
                      <input className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" value={it.title} onChange={(e)=>updateEdu(idx,'title',e.target.value)} />
                    </div>
                    <div className="md:col-span-5">
                      <label className="block text-xs text-gray-300 mb-1">Subtitle</label>
                      <input className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" value={it.subtitle} onChange={(e)=>updateEdu(idx,'subtitle',e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-300 mb-1">Period</label>
                      <input className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" value={it.period} onChange={(e)=>updateEdu(idx,'period',e.target.value)} />
                    </div>
                    <div className="md:col-span-1 flex md:justify-end">
                      <button onClick={()=>removeEdu(idx)} className="px-3 py-2 rounded-md bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30">Delete</button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {tab === 'organizations' && authority?.canEditSections && (
            <section className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Organizations</h2>
                <div className="flex gap-2">
                  <button onClick={addOrg} className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15">+ Add</button>
                  <button onClick={saveOrgs} disabled={saving} title="Save organizations to DB (Ctrl+S)" className="px-3 py-2 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30">{saving?'Saving Organizations…':'Save to DB'}</button>
                </div>
              </div>
              <div className="space-y-3">
                {orgs.map((it, idx) => (
                  <motion.div key={idx} layout whileHover={{ scale: 1.01 }} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-black/30 border border-white/10 rounded-lg p-3">
                    <div className="md:col-span-5">
                      <label className="block text-xs text-gray-300 mb-1">Organization</label>
                      <input className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" value={it.org} onChange={(e)=>updateOrg(idx,'org',e.target.value)} />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-xs text-gray-300 mb-1">Role</label>
                      <input className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" value={it.role} onChange={(e)=>updateOrg(idx,'role',e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-300 mb-1">Period</label>
                      <input className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" value={it.period} onChange={(e)=>updateOrg(idx,'period',e.target.value)} />
                    </div>
                    <div className="md:col-span-1 flex md:justify-end">
                      <button onClick={()=>removeOrg(idx)} className="px-3 py-2 rounded-md bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30">Delete</button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {tab === 'announcements' && authority?.canEditSections && (
            <section className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Announcements</h2>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-md border border-white/10 overflow-hidden">
                    {['edit','list'].map(t => (
                      <button key={t} onClick={()=>{ setAnnTab(t); if (t==='list') reloadAnnouncementList(); }} className={`px-3 py-1.5 text-xs ${annTab===t ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>{t==='edit'?'Editor':'All Announcements'}</button>
                    ))}
                  </div>
                  <button onClick={reloadAnnouncement} className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15">Reload</button>
                  <button onClick={saveAnnouncement} disabled={annSaving} title="Save announcement to DB (Ctrl+S)" className="px-3 py-2 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30">{annSaving?'Saving Announcement…':'Save to DB'}</button>
                </div>
              </div>
              {annTab==='edit' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-xs text-gray-300">
                  <span className="block mb-1">Title</span>
                  <input value={ann.title} onChange={(e)=>setAnn(a=>({...a,title:e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" placeholder="Announcement Title" />
                </label>
                <label className="block text-xs text-gray-300">
                  <span className="block mb-1">Severity</span>
                  <select value={ann.severity} onChange={(e)=>setAnn(a=>({...a,severity:e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2">
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                  </select>
                </label>
                <label className="block text-xs text-gray-300">
                  <span className="block mb-1">Target</span>
                  <select value={ann.target} onChange={(e)=>setAnn(a=>({...a,target:e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2">
                    <option value="both">Both</option>
                    <option value="main">Main Site only</option>
                    <option value="ai">AI Pages only</option>
                  </select>
                </label>
                <label className="block text-xs text-gray-300 md:col-span-2">
                  <span className="block mb-1">Message</span>
                  <textarea value={ann.message} onChange={(e)=>setAnn(a=>({...a,message:e.target.value}))} className="w-full min-h-[120px] bg-black/40 border border-white/10 rounded-md px-3 py-2" placeholder="Write your announcement..." />
                </label>
                <label className="block text-xs text-gray-300">
                  <span className="block mb-1">CTA Text (optional)</span>
                  <input value={ann.ctaText} onChange={(e)=>setAnn(a=>({...a,ctaText:e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" placeholder="Learn more" />
                </label>
                <label className="block text-xs text-gray-300">
                  <span className="block mb-1">CTA URL (optional)</span>
                  <input value={ann.ctaUrl} onChange={(e)=>setAnn(a=>({...a,ctaUrl:e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" placeholder="https://..." />
                </label>
                <label className="block text-xs text-gray-300">
                  <span className="block mb-1">Version</span>
                  <input value={ann.version} onChange={(e)=>setAnn(a=>({...a,version:e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" placeholder="1" />
                </label>
                <label className="block text-xs text-gray-300">
                  <span className="block mb-1">Expires At (optional)</span>
                  <input type="datetime-local" value={ann.expiresAt} onChange={(e)=>setAnn(a=>({...a,expiresAt:e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2" />
                </label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={ann.active} onChange={(e)=>setAnn(a=>({...a,active:e.target.checked}))} /> Active</label>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={ann.dismissible} onChange={(e)=>setAnn(a=>({...a,dismissible:e.target.checked}))} /> Dismissible</label>
                </div>
              </div>
              ) : (
                <div className="mt-2">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-2">
                    <div className="text-sm text-gray-300">All Announcements</div>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-[11px] text-gray-400">
                        <div className="mb-0.5">Target</div>
                        <select value={annFilterTarget} onChange={(e)=>{ setAnnFilterTarget(e.target.value); setAnnPage(1); }} className="bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs">
                          <option value="all">All</option>
                          <option value="main">Main</option>
                          <option value="ai">AI</option>
                          <option value="both">Both</option>
                        </select>
                      </label>
                      <label className="text-[11px] text-gray-400">
                        <div className="mb-0.5">Status</div>
                        <select value={annFilterStatus} onChange={(e)=>{ setAnnFilterStatus(e.target.value); setAnnPage(1); }} className="bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs">
                          <option value="all">All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </label>
                      <label className="text-[11px] text-gray-400 md:w-52">
                        <div className="mb-0.5">Search</div>
                        <input value={annSearch} onChange={(e)=>{ setAnnSearch(e.target.value); setAnnPage(1); }} placeholder="Title or message" className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs" />
                      </label>
                      <label className="text-[11px] text-gray-400">
                        <div className="mb-0.5">Page size</div>
                        <select value={annPageSize} onChange={(e)=>{ setAnnPageSize(Number(e.target.value)||10); setAnnPage(1); }} className="bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs">
                          {[5,10,20,50].map(n=> <option key={n} value={n}>{n}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {annFiltered.length === 0 && (
                      <div className="text-xs text-gray-400">No announcements found.</div>
                    )}
                    {annPageItems.map((it, idx) => (
                      <div key={idx} className="rounded-md bg-black/30 border border-white/10 p-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm text-white flex items-center gap-2">
                            <span className="font-medium">{it.title || '(no title)'}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 uppercase">{(it.target||'both')==='ai'?'AI':'Main/Both'}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md uppercase ${it.active ? 'bg-emerald-600/15 border border-emerald-400/40 text-emerald-200' : 'bg-gray-600/15 border border-gray-400/30 text-gray-300'}`}>{it.active ? 'Active' : 'Inactive'}</span>
                          </div>
                          <div className="text-xs text-gray-400">{it.updated_at || it.updatedAt || ''}</div>
                          <div className="text-xs text-gray-300 mt-1 line-clamp-2">{it.message || ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {it.id ? (
                            <>
                              {it.active && (
                                <button
                                  onClick={async()=>{
                                    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
                                    const urls = Array.from(new Set([
                                      '/.netlify/functions/delete-announcement',
                                      `${basePath}/.netlify/functions/delete-announcement`,
                                      '/api/delete-announcement',
                                      `${basePath}/api/delete-announcement`,
                                    ]));
                                    for (const url of urls) {
                                      try { const r = await fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ id: it.id, hardDelete: false }) }); if (r.ok) break; } catch {}
                                    }
                                    await reloadAnnouncementList();
                                  }}
                                  className="px-2 py-1 rounded-md bg-amber-600/20 border border-amber-500/40 text-amber-200 hover:bg-amber-600/30 text-xs"
                                >Deactivate</button>
                              )}
                              <button
                                onClick={async()=>{
                                  if (!confirm('Permanently delete this announcement?')) return;
                                  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
                                  const urls = Array.from(new Set([
                                    '/.netlify/functions/delete-announcement',
                                    `${basePath}/.netlify/functions/delete-announcement`,
                                    '/api/delete-announcement',
                                    `${basePath}/api/delete-announcement`,
                                  ]));
                                  for (const url of urls) {
                                    try { const r = await fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ id: it.id, hardDelete: true }) }); if (r.ok) break; } catch {}
                                  }
                                  await reloadAnnouncementList();
                                }}
                                className="px-2 py-1 rounded-md bg-red-600/20 border border-red-500/40 text-red-200 hover:bg-red-600/30 text-xs"
                              >Delete</button>
                            </>
                          ) : (
                            <div className="text-[10px] text-gray-400">(local fallback item)</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {annFiltered.length > 0 && (
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
                        <div>
                          Page {Math.min(Math.max(1, annPage), annPageCount)} of {annPageCount} • {annFiltered.length} items
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>setAnnPage(1)} disabled={annPage<=1} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 disabled:opacity-40">« First</button>
                          <button onClick={()=>setAnnPage(p=>Math.max(1,p-1))} disabled={annPage<=1} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 disabled:opacity-40">‹ Prev</button>
                          <button onClick={()=>setAnnPage(p=>Math.min(annPageCount,p+1))} disabled={annPage>=annPageCount} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 disabled:opacity-40">Next ›</button>
                          <button onClick={()=>setAnnPage(annPageCount)} disabled={annPage>=annPageCount} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 disabled:opacity-40">Last »</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-6">
                <div className="text-sm text-gray-300 mb-2">Live Preview</div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <span>Preview updates as you type</span>
                    {/* Release status indicator */}
                    {ann.active && (
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 border text-[10px] ${annLiveStatus.state==='live' ? 'border-emerald-400/40 bg-emerald-600/15 text-emerald-200' : annLiveStatus.state==='pending' ? 'border-amber-400/40 bg-amber-600/15 text-amber-200' : 'border-white/10 bg-white/5 text-gray-300' }`}>
                        {annLiveStatus.state==='live' ? 'Published' : annLiveStatus.state==='pending' ? 'Publishing…' : 'Status: unknown'}
                      </span>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-300">
                    <input type="checkbox" checked={annMobilePreview} onChange={(e)=>setAnnMobilePreview(e.target.checked)} />
                    Preview as mobile
                  </label>
                </div>
                <div className={annMobilePreview? 'max-w-md' : 'max-w-2xl'}>
                  {/* Preview uses current form state; it does not persist dismissal */}
                  {AnnouncementCard ? <AnnouncementCard ann={{...ann, updatedAt: ann.updatedAt || new Date().toISOString()}} preview forceMobile={annMobilePreview} /> : null}
                </div>
              </div>
            </section>
          )}

          {tab === 'messages' && authority?.canEditSections && (
            <section className="bg-white/5 border border-white/10 rounded-xl p-4">
              <MessagesAdmin />
            </section>
          )}

          {tab === 'dev' && authority?.canAccessDev && (
            <section className="bg-white/5 border border-white/10 rounded-xl p-4">
              <DevSection />
            </section>
          )}

          {tab === 'admin-profile' && (
            <section className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Admin Profile</h2>
                <div className="text-xs text-gray-400">Customize your dashboard identity & credentials</div>
              </div>

              {/* Display Name Card */}
              <motion.div layout whileHover={{ scale: 1.01 }} className="bg-black/30 border border-white/10 rounded-lg p-4 mb-4 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(34,211,238,.18), transparent 70%)' }} />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-cyan-300 font-medium">Profile Name</div>
                    <div className="text-xs text-gray-400">Shown on the welcome screen</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] items-center">
                  <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Type your display name (optional)" className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-400" />
                  <button
                    onClick={() => onSaveDisplayName()}
                    disabled={saving}
                    className="md:ml-3 px-3 py-2 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-60"
                  >
                    {saving && savingKind==='profile' ? 'Saving Profile…' : 'Save Name'}
                  </button>
                </div>
              </motion.div>

              {/* Credentials Card */}
              <motion.div layout whileHover={{ scale: 1.01 }} className="bg-black/30 border border-white/10 rounded-lg p-4">
                <div className="text-sm text-cyan-300 font-medium">Credentials</div>
                <div className="text-xs text-gray-400">Your email is visible. For security, the current password can’t be displayed—use Change Password.</div>
                <div className="mt-3 grid gap-3">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Email</label>
                    <input value={user?.email || ''} readOnly className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-gray-400" />
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Current password</label>
                      <div className="relative">
                        <input type={pwVisible.current?'text':'password'} value={pwCurrent} onChange={(e)=>setPwCurrent(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 pr-10" placeholder="••••••••" />
                        <button type="button" onClick={()=>setPwVisible(v=>({...v,current:!v.current}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200">{pwVisible.current?'Hide':'Show'}</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">New password</label>
                      <div className="relative">
                        <input type={pwVisible.next?'text':'password'} value={pwNew} onChange={(e)=>setPwNew(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 pr-10" placeholder="At least 8 characters" />
                        <button type="button" onClick={()=>setPwVisible(v=>({...v,next:!v.next}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200">{pwVisible.next?'Hide':'Show'}</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Confirm new password</label>
                      <div className="relative">
                        <input type={pwVisible.confirm?'text':'password'} value={pwConfirm} onChange={(e)=>setPwConfirm(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 pr-10" placeholder="Repeat new password" />
                        <button type="button" onClick={()=>setPwVisible(v=>({...v,confirm:!v.confirm}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200">{pwVisible.confirm?'Hide':'Show'}</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={onChangePassword} disabled={saving} className="px-3 py-2 rounded-md bg-fuchsia-600/20 border border-fuchsia-500/40 text-fuchsia-200 hover:bg-fuchsia-600/30 disabled:opacity-60">{saving && savingKind==='password' ? 'Updating Password…' : 'Change Password'}</button>
                  </div>
                </div>
              </motion.div>
            </section>
          )}
        </div>
      </div>

      <AnimatePresence>
  {saving && savingKind && (
          <motion.div key="saving-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 grid place-items-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `linear-gradient(transparent 96%, rgba(148,163,184,0.18) 97%), linear-gradient(90deg, transparent 96%, rgba(148,163,184,0.18) 97%)`,
              backgroundSize: '32px 32px',
              transform: 'perspective(900px) rotateX(50deg) translateY(-12%)',
              transformOrigin: 'top center'
            }} />
            <motion.div initial={{ y: 8, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -8, opacity: 0 }} className="relative z-10 w-[min(92vw,440px)] rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-cyan-500/10 via-slate-900/60 to-black/70 p-6 text-center shadow-[0_0_40px_rgba(34,211,238,0.15)]">
              <div className="relative mx-auto h-28 w-28">
                <div className="absolute inset-0 rounded-full border border-cyan-400/30" />
                <div className="absolute inset-0 rounded-full border-t-2 border-cyan-300 animate-spin" style={{ boxShadow: '0 0 24px rgba(34,211,238,.45)' }} />
                <motion.div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.9)]" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }} style={{ originY: '56px', originX: '0px' }} />
                <motion.div className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_10px_rgba(232,121,249,0.9)]" animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 3.2, ease: 'linear' }} style={{ originY: '44px', originX: '0px' }} />
              </div>
              <div className="mt-4 text-cyan-200 font-medium tracking-wide">
                {savingKind==='password' ? 'Updating Password' : savingKind==='profile' ? 'Saving Profile' : `Saving ${savingKind==='achievements'?'Achievements':savingKind==='education'?'Education':savingKind==='organizations'?'Organizations':'Data'} to DB`}
                <motion.span
                  className="inline-block ml-1"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  ...
                </motion.span>
              </div>
              <div className="mt-1 text-xs text-cyan-200/70">{savingKind==='password' ? 'Please keep this tab open while we update your password' : savingKind==='profile' ? 'Please keep this tab open while we update your profile' : `Please keep this tab open while we write ${savingKind==='achievements'?'Achievements':savingKind==='education'?'Education':savingKind==='organizations'?'Organizations':'data'} to the database`}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <motion.div
            key="save-success"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-4 left-1/2 z-40 -translate-x-1/2"
          >
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              className="relative flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-600/15 px-4 py-2 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
                <motion.circle cx="12" cy="12" r="10" stroke="#34d399" strokeWidth="1.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
                <motion.path d="M7 12.5l3.2 3.2L17 8.8" stroke="#a7f3d0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.1 }} />
              </svg>
              <div className="text-sm font-medium">{successMsg || 'Saved successfully'}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sign-out confirm modal */}
      <AnimatePresence>
        {showSignout && (
          <motion.div key="signout-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `linear-gradient(transparent 96%, rgba(148,163,184,0.18) 97%), linear-gradient(90deg, transparent 96%, rgba(148,163,184,0.18) 97%)`,
              backgroundSize: '32px 32px',
              transform: 'perspective(900px) rotateX(50deg) translateY(-12%)',
              transformOrigin: 'top center'
            }} />
            <motion.div initial={{ y: 8, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -8, opacity: 0 }} className="relative z-10 w-[min(92vw,460px)] rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-cyan-500/40">
              <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-md p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-red-500/15 border border-red-400/30" />
                  <div>
                    <div className="text-lg font-semibold text-cyan-200">Sign out of Admin?</div>
                    <div className="text-xs text-gray-400">{user?.email || 'You are signed in'}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-300 mb-4">You will be redirected to the login screen.</div>
                <div className="flex justify-end gap-2">
                  <button disabled={signoutBusy} onClick={() => setShowSignout(false)} className="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-50">Cancel</button>
                  <button
                    onClick={async () => {
                      setSignoutBusy(true);
                      try {
                        await logout();
                        setShowSignout(false);
                        setSuccessMsg('Signed out');
                        setSuccess(true);
                        setTimeout(() => router.replace('/login'), 700);
                      } catch (e) {
                        setMessage(`Sign out failed: ${e?.message || 'Unknown error'}`);
                      } finally {
                        setSignoutBusy(false);
                      }
                    }}
                    disabled={signoutBusy}
                    className="px-3 py-2 rounded-md bg-red-600/20 border border-red-500/40 text-red-200 hover:bg-red-600/30 disabled:opacity-50"
                  >
                    {signoutBusy ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminGate() {
  const { user, loading, initError } = useAuth();
  const router = useRouter();
  const OWNER_EMAIL = (process.env.NEXT_PUBLIC_OWNER_EMAIL || 'prayogoaryan63@gmail.com').toLowerCase();
  useEffect(() => {
    if (!loading && !user && !initError) router.replace('/login');
  }, [loading, user, initError, router]);
  // Optional: if banned, kick out
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const emailLower = (user.email || '').toLowerCase();
        // Owner is never banned; skip network calls
        if (emailLower === OWNER_EMAIL) return;
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const urls = Array.from(new Set([
          '/.netlify/functions/admins-list',
          `${basePath}/.netlify/functions/admins-list`,
          '/api/admins-list',
          `${basePath}/api/admins-list`,
        ]));
        let data = null;
        for (const url of urls) { try { const r = await fetch(url); if (r.ok) { data = await r.json(); break; } } catch {} }
        const email = emailLower;
        const uid = user.uid;
  const row = (Array.isArray(data)?data:[]).find((a)=> (uid && a.uid===uid) || (email && a.email && String(a.email).toLowerCase()===email));
  if (email !== OWNER_EMAIL && row && row.banned) {
          router.replace('/login?banned=1');
        }
      } catch {}
    })();
  }, [user, router]);
  if (initError) {
    return (
      <div className="min-h-[40vh] grid place-items-center text-center p-6">
        <div className="max-w-md w-full rounded-xl border border-red-500/40 bg-red-500/10 p-6">
          <div className="text-lg font-semibold text-red-200 mb-2">Auth configuration error</div>
          <div className="text-sm text-red-300 mb-2">{initError}</div>
          <div className="text-xs text-gray-400">Check .env.local Firebase keys and rebuild.</div>
        </div>
      </div>
    );
  }
  if (!user) {
    return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto mt-24 text-center text-gray-300">Redirecting to login…</motion.div>;
  }
  return <AdminInner />;
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminGate />
    </AuthProvider>
  );
}
