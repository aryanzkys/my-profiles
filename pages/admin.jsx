import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import achievementsData from '../data/achievements.json';
import educationData from '../data/education.json';
import orgsData from '../data/organizations.json';
import { AuthProvider, useAuth } from '../components/AuthProvider';
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
  }, []);

  // Initialize profile fields from user
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
    const onKey = (e) => {
      if (!user) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          if (tab === 'achievements') saveToFile();
        } else {
          if (tab === 'achievements') saveToDb();
          else if (tab === 'education') saveEdu();
          else if (tab === 'organizations') saveOrgs();
          else if (tab === 'admin-profile') onSaveDisplayName();
        }
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === 'r') { reloadFromBackend(); }
        if (e.key.toLowerCase() === 'n' && tab === 'achievements') { addYear(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user, tab, data, edu, orgs, displayName, pwCurrent, pwNew, pwConfirm]);

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
    return m ? m[1] : null;
  };
  const getDrivePreviewUrl = (url) => {
    const id = getDriveId(url);
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
          <div className="mb-4 flex gap-2">
            {['achievements','education','organizations','admin-profile'].map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-md border relative overflow-hidden ${tab===t? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200':'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <span className="relative z-10">{t==='admin-profile' ? 'Admin Profile' : t.charAt(0).toUpperCase()+t.slice(1)}</span>
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>

          {tab === 'achievements' && (
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
                            return preview ? (
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

          {tab === 'education' && (
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

          {tab === 'organizations' && (
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
  useEffect(() => {
    if (!loading && !user && !initError) router.replace('/login');
  }, [loading, user, initError, router]);
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
