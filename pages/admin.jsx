import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import achievementsData from '../data/achievements.json';
import educationData from '../data/education.json';
import orgsData from '../data/organizations.json';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isDev() {
  return process.env.NODE_ENV !== 'production';
}

export default function AdminPage() {
  const [tab, setTab] = useState('achievements'); // achievements | education | organizations
  const [data, setData] = useState(() => deepClone(achievementsData));
  const [edu, setEdu] = useState(() => deepClone(educationData));
  const [orgs, setOrgs] = useState(() => deepClone(orgsData));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [pass, setPass] = useState('');
  const [selected, setSelected] = useState(null); // {year, idx}
  const mouseRef = useRef({ x: 0, y: 0 });

  const years = useMemo(
    () => Object.keys(data).sort((a, b) => Number(b) - Number(a)),
    [data]
  );

  useEffect(() => {
    // simple passcode gate
    const required = process.env.NEXT_PUBLIC_ADMIN_KEY;
    const stored = typeof window !== 'undefined' ? localStorage.getItem('adminKey') : null;
    if (!isDev()) {
      if (!required) {
        setMessage('Production mode: admin locked until NEXT_PUBLIC_ADMIN_KEY is set. Use "Save to File"/"Download JSON" for now or set the key in Netlify env and redeploy.');
      } else {
        setMessage('Production mode: Save (dev) is disabled. Use "Save to DB" (Netlify) or "Save to File"/"Download JSON".');
      }
    }
    if (!required) {
      // If no key set, allow only in dev; block in prod
      setAuthorized(isDev());
    } else if (stored && stored === required) {
      setAuthorized(true);
    }
  // Load Achievements from backend if available
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
        } catch (_) {}
      }
    })();
    // Load Education
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
        } catch (_) {}
      }
    })();
    // Load Organizations
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
        } catch (_) {}
      }
    })();
  }, []);

  // Keyboard shortcuts: Ctrl+S save to DB, Ctrl+Shift+S save to file, R reload achievements, N add year
  useEffect(() => {
    const onKey = (e) => {
      if (!authorized) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) saveToFile(); else saveToDb();
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === 'r') { reloadFromBackend(); }
        if (e.key.toLowerCase() === 'n' && tab === 'achievements') { addYear(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [authorized, tab, data]);

  // Neon grid background with parallax
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
    if (!/^[0-9]{4}$/.test(y)) {
      alert('Invalid year');
      return;
    }
    if (data[y]) {
      alert('Year already exists');
      return;
    }
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

  // Drag & drop within a year
  const onDragStartItem = (year, idx, e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ year, idx }));
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOverItem = (e) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  };
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
    if (typeof item === 'string') {
      next[year][idx] = { text: value };
    } else {
      next[year][idx] = { ...item, [key]: value };
    }
    setData(next);
  };

  // Google Drive preview helpers
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
    // Ensure every item is an object with at least text
    const out = {};
    Object.entries(d).forEach(([y, items]) => {
      out[y] = items.map((it) => (typeof it === 'string' ? { text: it } : { text: it.text || '', cert: it.cert || '' }));
    });
    return out;
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
      let ok = false;
      let lastErr = '';
      for (const url of candidates) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalize(data)),
          });
          if (res.ok) {
            setMessage(`Saved to data/achievements.json via ${url}`);
            ok = true;
            break;
          } else {
            const txt = await res.text();
            lastErr = `HTTP ${res.status} on ${url}: ${txt}`;
          }
        } catch (e) {
          lastErr = `Request failed on ${url}: ${e.message}`;
        }
      }
      if (!ok) throw new Error(lastErr || 'Unknown error');
    } catch (e) {
      setMessage(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
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
      } catch (_) {}
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
      } catch (_) {}
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
      } catch (_) {}
    }
  };

  const saveToDb = async () => {
    setSaving(true);
    setMessage('');
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const candidates = Array.from(new Set([
        '/.netlify/functions/save-achievements',
        `${basePath}/.netlify/functions/save-achievements`,
      ]));
      let ok = false;
      let lastErr = '';
      const payload = JSON.stringify(normalize(data));
      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload });
          if (res.ok) {
            setMessage(`Saved via ${url}`);
            ok = true;
            break;
          } else {
            const txt = await res.text();
            lastErr = `HTTP ${res.status} on ${url}: ${txt}`;
          }
        } catch (e) {
          lastErr = `Request failed on ${url}: ${e.message}`;
        }
      }
      if (!ok) throw new Error(lastErr || 'Unknown error');
      // After save, reload from backend so UI reflects committed data (GitHub or DB)
      await reloadFromBackend();
    } catch (e) {
      setMessage(`Save to DB failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(normalize(data), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'achievements.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Education editors
  const addEdu = () => setEdu([...edu, { title: '', subtitle: '', period: '' }]);
  const removeEdu = (idx) => setEdu(edu.filter((_, i) => i !== idx));
  const updateEdu = (idx, key, value) => {
    const next = deepClone(edu);
    next[idx] = { ...next[idx], [key]: value };
    setEdu(next);
  };
  const saveEdu = async () => {
    setSaving(true);
    setMessage('');
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
          if (res.ok) { setMessage(`Saved education via ${url}`); ok = true; break; }
          else { lastErr = `HTTP ${res.status} on ${url}: ${await res.text()}`; }
        } catch (e) { lastErr = `Request failed on ${url}: ${e.message}`; }
      }
      if (!ok) throw new Error(lastErr || 'Unknown error');
      await reloadEducation();
    } catch (e) { setMessage(`Save education failed: ${e.message}`); }
    finally { setSaving(false); }
  };

  // Organizations editors
  const addOrg = () => setOrgs([...orgs, { org: '', role: '', period: '' }]);
  const removeOrg = (idx) => setOrgs(orgs.filter((_, i) => i !== idx));
  const updateOrg = (idx, key, value) => {
    const next = deepClone(orgs);
    next[idx] = { ...next[idx], [key]: value };
    setOrgs(next);
  };
  const saveOrgs = async () => {
    setSaving(true);
    setMessage('');
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
          if (res.ok) { setMessage(`Saved organizations via ${url}`); ok = true; break; }
          else { lastErr = `HTTP ${res.status} on ${url}: ${await res.text()}`; }
        } catch (e) { lastErr = `Request failed on ${url}: ${e.message}`; }
      }
      if (!ok) throw new Error(lastErr || 'Unknown error');
      await reloadOrganizations();
    } catch (e) { setMessage(`Save organizations failed: ${e.message}`); }
    finally { setSaving(false); }
  };

  const saveToFile = async () => {
    try {
      const payload = JSON.stringify(normalize(data), null, 2);
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'achievements.json',
          types: [
            {
              description: 'JSON',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(payload);
        await writable.close();
        setMessage('Saved to file using File System Access API');
      } else {
        downloadJson();
        setMessage('Browser does not support direct save; downloaded JSON instead');
      }
    } catch (e) {
      setMessage(`Save-to-file failed: ${e.message}`);
    }
  };

  const importFromFile = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        const json = JSON.parse(text);
        setData(json);
        setMessage('Imported data from file');
      };
      input.click();
    } catch (e) {
      setMessage(`Import failed: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen relative text-gray-100" onMouseMove={onMouseMove}>
      {/* Neon robotic grid background */}
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
      {!authorized ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto mt-24 bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
          <h1 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <span className="inline-grid place-items-center h-6 w-6 rounded-full bg-cyan-500/20 border border-cyan-400/30">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2l3 3-3 3-3-3 3-3Z" stroke="#67e8f9" strokeWidth="1.5"/><circle cx="12" cy="14" r="7" stroke="#67e8f9" strokeWidth="1.2"/></svg>
            </span>
            Admin Access
          </h1>
          <p className="text-sm text-gray-300 mb-4">Enter admin key to continue.</p>
          <input
            type="password"
            className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-400 mb-3"
            placeholder="Admin key"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                const required = process.env.NEXT_PUBLIC_ADMIN_KEY;
                if (required && pass === required) {
                  localStorage.setItem('adminKey', pass);
                  setAuthorized(true);
                  setMessage('');
                } else if (!required && isDev()) {
                  setAuthorized(true);
                } else {
                  setMessage('Invalid key');
                }
              }}
              className="px-3 py-2 rounded-md bg-cyan-600/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-600/30"
            >
              Enter
            </button>
            <button
              onClick={() => setPass('')}
              className="px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10"
            >
              Clear
            </button>
          </div>
        </motion.div>
      ) : (
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
            <button onClick={reloadFromBackend} className="px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10" title="Reload achievements (R)">Reload</button>
            <button onClick={saveToFile} className="px-3 py-2 rounded-md bg-cyan-600/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-600/30" title="Save to file (Ctrl+Shift+S)">Save to File</button>
            <button onClick={saveToDb} disabled={saving} className="px-3 py-2 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30" title="Save to DB (Ctrl+S)">{saving ? 'Saving…' : 'Save to DB'}</button>
          </div>
        </div>
        <div className="mb-4 flex gap-2">
          {['achievements','education','organizations'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-md border relative overflow-hidden ${tab===t? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200':'bg-white/5 border-white/10 hover:bg-white/10'}`}>
              <span className="relative z-10">{t.charAt(0).toUpperCase()+t.slice(1)}</span>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>

        {tab === 'achievements' && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-cyan-300">Achievements</h2>
          <div className="flex gap-2">
            <button onClick={addYear} className="px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Add Year</button>
            <button onClick={importFromFile} className="px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10" title="Import achievements.json">Import JSON</button>
            <button onClick={downloadJson} className="px-3 py-2 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30" title="Download achievements.json">Download JSON</button>
            <button onClick={saveDev} disabled={!isDev() || saving} className="px-3 py-2 rounded-md bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 disabled:opacity-50 hover:bg-fuchsia-500/30" title={isDev() ? 'Save to data/achievements.json (dev only)' : 'Disabled in production'}>{saving ? 'Saving…' : 'Save (dev)'}</button>
          </div>
        </div>)}

        <AnimatePresence>
          {message && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-md p-3 shadow-lg">
              {message}
            </motion.div>
          )}
        </AnimatePresence>

  {tab === 'achievements' && (<div className="space-y-8">
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
                    <motion.div
                      key={idx}
                      layout
                      draggable
                      onDragStart={(e) => onDragStartItem(year, idx, e)}
                      onDragOver={onDragOverItem}
                      onDrop={(e) => onDropItem(year, idx, e)}
                      whileHover={{ scale: 1.01 }}
                      className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-black/30 border ${selected && selected.year===year && selected.idx===idx ? 'border-cyan-400/50' : 'border-white/10'} rounded-lg p-3 cursor-grab active:cursor-grabbing`}
                      onClick={() => setSelected({ year, idx })}
                    >
                      <div className="md:col-span-6">
                        <label className="block text-xs text-gray-300 mb-1">Text</label>
                        <input
                          className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-400"
                          value={item.text || ''}
                          placeholder="e.g., 🥇 1st Place, ..."
                          onChange={(e) => updateItem(year, idx, 'text', e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-5">
                        <label className="block text-xs text-gray-300 mb-1">Google Drive Link (optional)</label>
                        <input
                          className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-fuchsia-400"
                          value={item.cert || ''}
                          placeholder="https://drive.google.com/file/d/FILE_ID/view"
                          onChange={(e) => updateItem(year, idx, 'cert', e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-1 flex md:justify-end">
                        <button
                          onClick={() => removeItem(year, idx)}
                          className="px-3 py-2 rounded-md bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30"
                        >
                          Delete
                        </button>
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
        </div>)}

        {tab === 'education' && (
          <section className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Education</h2>
              <div className="flex gap-2">
                <button onClick={addEdu} className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15">+ Add</button>
                <button onClick={saveEdu} disabled={saving} className="px-3 py-2 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30">{saving?'Saving…':'Save to DB'}</button>
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
                <button onClick={saveOrgs} disabled={saving} className="px-3 py-2 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30">{saving?'Saving…':'Save to DB'}</button>
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
        </div>
      )}
      </div>
    </div>
  );
}
