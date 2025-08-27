import { useEffect, useMemo, useState } from 'react';
import achievementsData from '../data/achievements.json';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isDev() {
  return process.env.NODE_ENV !== 'production';
}

export default function AdminPage() {
  const [data, setData] = useState(() => deepClone(achievementsData));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [pass, setPass] = useState('');

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
    // Try loading from Netlify Function (DB), fallback to dev API, else keep bundled JSON
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
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-gray-100 p-6">
      {!authorized ? (
        <div className="max-w-md mx-auto mt-24 bg-white/5 border border-white/10 rounded-xl p-6">
          <h1 className="text-xl font-semibold text-white mb-3">Admin Access</h1>
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
        </div>
      ) : (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-cyan-300">Admin • Achievements</h1>
          <div className="flex gap-2">
            <button
              onClick={addYear}
              className="px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10"
            >
              Add Year
            </button>
            <button
              onClick={importFromFile}
              className="px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10"
              title="Import achievements.json"
            >
              Import JSON
            </button>
            <button
              onClick={downloadJson}
              className="px-3 py-2 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30"
              title="Download achievements.json"
            >
              Download JSON
            </button>
            <button
              onClick={saveToFile}
              className="px-3 py-2 rounded-md bg-cyan-600/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-600/30"
              title="Save achievements.json to a chosen file"
            >
              Save to File
            </button>
            <button
              onClick={saveDev}
              disabled={!isDev() || saving}
              className="px-3 py-2 rounded-md bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 disabled:opacity-50 hover:bg-fuchsia-500/30"
              title={isDev() ? 'Save to data/achievements.json (dev only)' : 'Disabled in production'}
            >
              {saving ? 'Saving…' : 'Save (dev)'}
            </button>
            <button
              onClick={saveToDb}
              disabled={saving}
              className="px-3 py-2 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30"
              title="Save to MongoDB via Netlify Function"
            >
              {saving ? 'Saving…' : 'Save to DB'}
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-md p-3">
            {message}
          </div>
        )}

        <div className="space-y-8">
          {years.map((year) => (
            <section key={year} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">{year}</h2>
                <button
                  onClick={() => addItem(year)}
                  className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-3">
                {(data[year] || []).map((it, idx) => {
                  const item = typeof it === 'string' ? { text: it } : it;
                  return (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-black/30 border border-white/10 rounded-lg p-3">
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
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
  </div>
  )}
    </div>
  );
}
