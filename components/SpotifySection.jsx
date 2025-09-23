"use client";
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_SDK_URL = 'https://sdk.scdn.co/spotify-player.js';
const TOKEN_PROXY_PATHS = [
  '/.netlify/functions/spotify-token',
  (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/.netlify/functions/spotify-token',
  '/api/spotify-token',
  (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/api/spotify-token',
];

function b64urlencode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return b64urlencode(hash);
}
function randomString(len = 64) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => ('0' + b.toString(16)).slice(-2)).join('');
}
function getRedirectUri() {
  if (typeof window === 'undefined') return '';
  const envOverride = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;
  if (envOverride) return envOverride;
  const base = window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || '');
  return `${base}/ai`;
}
function parseSpotifyUrlToEmbed(url) {
  try {
    const u = new URL(url);
    if (!/open\.spotify\.com$/.test(u.hostname)) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const type = parts[0];
    const id = parts[1];
    if (!id) return null;
    return `https://open.spotify.com/embed/${type}/${id}`;
  } catch { return null; }
}
function parseSpotifyUrlParts(url) {
  try {
    const u = new URL(url);
    if (!/open\.spotify\.com$/.test(u.hostname)) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { type: parts[0], id: parts[1] };
  } catch { return null; }
}

export default function SpotifySection() {
  const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
  const STORAGE_KEY = 'spotify_pkce_state_v1';
  const TOKEN_KEY = 'spotify_token_v1';
  const LAST_EMBED_KEY = 'spotify_last_embed_url_v1';
  const RECENT_QUERIES_KEY = 'spotify_recent_queries_v1';

  const audioRef = useRef(null);
  const playerRef = useRef(null);

  const [token, setToken] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [query, setQuery] = useState('');
  const [resultType, setResultType] = useState('track');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [recentQueries, setRecentQueries] = useState([]);
  // Removed "Preview only" filter per request
  const [message, setMessage] = useState('');


  // load persisted state
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
      if (raw) setToken(JSON.parse(raw));
      const last = typeof window !== 'undefined' ? window.localStorage.getItem(LAST_EMBED_KEY) : null;
      if (last) setEmbedUrl(last);
      const rq = typeof window !== 'undefined' ? window.localStorage.getItem(RECENT_QUERIES_KEY) : null;
      if (rq) setRecentQueries(JSON.parse(rq));
  // preview-only preference removed
    } catch {}
  }, []);

  const isExpired = () => {
    if (!token?.expires_at) return true;
    return Date.now() > token.expires_at - 30_000;
  };
  const saveToken = (t) => {
    const withExpiry = {
      access_token: t.access_token,
      refresh_token: t.refresh_token || token?.refresh_token || null,
      expires_at: Date.now() + (t.expires_in ? (t.expires_in * 1000) : 3600_000),
      token_type: t.token_type || 'Bearer',
      scope: t.scope || '',
    };
    setToken(withExpiry);
    try { window.localStorage.setItem(TOKEN_KEY, JSON.stringify(withExpiry)); } catch {}
  };
  const callTokenProxy = async (payload) => {
    let lastErr = 'Token proxy not reachable';
    for (const p of TOKEN_PROXY_PATHS) {
      try {
        const r = await fetch(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        if (r.ok) return await r.json();
        lastErr = `HTTP ${r.status}`;
      } catch (e) { lastErr = e?.message || 'Network error'; }
    }
    throw new Error(lastErr);
  };
  const refreshIfNeeded = async () => {
    if (!token) return null;
    if (!isExpired()) return token;
    if (!token.refresh_token) return token;
    try {
      const data = await callTokenProxy({ action: 'refresh', client_id: CLIENT_ID, refresh_token: token.refresh_token });
      saveToken(data);
      return data;
    } catch {
      setMessage('Spotify session expired. Please reconnect.');
      return null;
    }
  };

  // OAuth callback handler
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code) return;
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    if (!stored.verifier || stored.state !== state) {
      setMessage('Spotify auth state mismatch. Try again.');
      url.searchParams.delete('code'); url.searchParams.delete('state');
      window.history.replaceState({}, document.title, url.toString());
      return;
    }
    (async () => {
      try {
        setConnecting(true);
        const data = await callTokenProxy({ action: 'exchange', client_id: CLIENT_ID, code, code_verifier: stored.verifier, redirect_uri: stored.redirect_uri });
        saveToken(data);
        setMessage('Connected to Spotify 🎶');
      } catch {
        setMessage('Failed to connect Spotify.');
      } finally {
        setConnecting(false);
        url.searchParams.delete('code'); url.searchParams.delete('state');
        window.history.replaceState({}, document.title, url.toString());
        try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSpotifyLogin = async () => {
    if (!CLIENT_ID) { setMessage('Missing NEXT_PUBLIC_SPOTIFY_CLIENT_ID'); return; }
    const verifier = randomString(64);
    const challenge = await sha256(verifier);
    const redirect_uri = getRedirectUri();
    const state = randomString(16);
    const params = new URLSearchParams({
      response_type: 'code', client_id: CLIENT_ID, redirect_uri,
      code_challenge_method: 'S256', code_challenge: challenge,
      scope: 'user-read-email user-read-private streaming user-modify-playback-state user-read-playback-state', state,
    });
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ verifier, redirect_uri, state })); } catch {}
    window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
  };
  const logoutSpotify = () => { setToken(null); try { window.localStorage.removeItem('spotify_token_v1'); } catch {} };

  const getAccessToken = async () => { const t = await refreshIfNeeded(); return (t?.access_token) || token?.access_token || null; };
  const fetchWithFallback = async (urlWithMarket, urlNoMarket) => {
    const accessToken = await getAccessToken(); if (!accessToken) throw new Error('Please connect Spotify first.');
    let r = await fetch(urlWithMarket, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (r.status === 403) { r = await fetch(urlNoMarket, { headers: { Authorization: `Bearer ${accessToken}` } }); }
    if (!r.ok) throw new Error(`Spotify request failed: ${r.status}`); return r.json();
  };

  const searchTracks = async (q) => {
    if (!q?.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      let t = await refreshIfNeeded();
      if (!t?.access_token && !token?.access_token) { setMessage('Please connect Spotify first.'); return; }
      let accessToken = (t?.access_token) || token.access_token;
      const doFetch = async (withMarket = true) => {
        const url = withMarket
          ? `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${resultType}&limit=10&market=from_token`
          : `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${resultType}&limit=10`;
        return fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      };
      let r = await doFetch(true);
      if (r.status === 401) {
        const rt = await refreshIfNeeded();
        if (rt?.access_token) { accessToken = rt.access_token; r = await doFetch(true); }
      }
      if (r.status === 403) { r = await doFetch(false); }
      if (!r.ok) {
        let errText = `Spotify search failed: ${r.status}`;
        try { const ej = await r.json(); if (ej?.error?.message) errText += ` - ${ej.error.message}`; } catch {}
        if (r.status === 429) setMessage('Rate limited by Spotify. Please try again in a moment.');
        throw new Error(errText);
      }
      const data = await r.json().catch(() => ({}));
  const items = resultType === 'playlist'
        ? (Array.isArray(data?.playlists?.items) ? data.playlists.items : [])
        : (Array.isArray(data?.tracks?.items) ? data.tracks.items : []);
      setResults(items);
  // No trackPool persistence needed since Now Playing is removed
      try {
        if (q.length > 1 && Array.isArray(items) && items.length > 0) {
          const next = [q, ...(recentQueries.filter(x => x !== q))].slice(0, 5);
          setRecentQueries(next);
          window.localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(next));
        }
      } catch {}
    } catch (e) {
      const msg = (e && e.message) ? e.message : 'Search error. Try again or reconnect Spotify.';
      setMessage(msg);
      if ((/401/).test(msg)) setMessage('Spotify session expired. Please reconnect.');
      else if ((/403/).test(msg)) setMessage('Spotify permissions need update. Disconnect then Connect Spotify again.');
    } finally { setSearching(false); }
  };

  const playPreviewFromTrack = async (track) => {
    const url = track?.preview_url;
    if (!url) { setMessage('No preview available for this track.'); return; }
    try {
      if (!audioRef.current) audioRef.current = new Audio();
      const a = audioRef.current; if (!a.paused) a.pause();
      a.src = url;
      // Simple preview playback without Now Playing state
      a.onended = null;
      await a.play();
    } catch { setMessage('Could not play preview.'); }
  };
  const pausePreview = () => { try { const a = audioRef.current; if (a && !a.paused) a.pause(); } catch {} };
  const resumePreview = async () => { try { const a = audioRef.current; if (a && a.paused) await a.play(); } catch {} };
  const stopPreview = () => { try { const a = audioRef.current; if (a) { a.pause(); a.currentTime = 0; } } catch {} };

  const onEmbedFromUrl = async (val) => {
    const e = parseSpotifyUrlToEmbed(val); if (!e) { setMessage('Invalid Spotify URL'); return; }
    setEmbedUrl(e); try { window.localStorage.setItem(LAST_EMBED_KEY, e); } catch {}
    // No autoplay or Now Playing; embed only
  };

  const onEmbedSet = async (url, meta) => {
    setEmbedUrl(url); try { window.localStorage.setItem(LAST_EMBED_KEY, url); } catch {}
    // No autoplay or Now Playing when setting embed
  };

  return (
    <section className="container mx-auto px-4 pb-10 mt-4">
      <div className="rounded-2xl p-[1px] bg-gradient-to-r from-cyan-400/30 via-blue-500/25 to-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.35)]">
        <div className="rounded-2xl border border-white/10 bg-black/85 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex items-center gap-2 text-cyan-200 font-medium">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/2048px-Spotify_logo_without_text.svg.png"
                alt="Spotify"
                className="h-4 w-4 object-contain select-none pointer-events-none"
                loading="eager"
                decoding="async"
              />
              <span>Tune Your AI Vibes</span>
            </div>
            {token && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-green-300">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" aria-hidden />
                <span>Connected to Spotify</span>
                <a href="https://www.spotify.com/account/apps/" target="_blank" rel="noopener noreferrer" className="text-gray-300 underline decoration-cyan-400/50 hover:decoration-cyan-300">Manage</a>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              {token ? (
                <button onClick={logoutSpotify} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Disconnect</button>
              ) : (
                <button disabled={connecting} onClick={startSpotifyLogin} className="text-[11px] px-2 py-1 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 hover:shadow-[0_0_14px_rgba(34,211,238,0.25)]">{connecting ? 'Connecting…' : 'Connect Spotify'}</button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="text-[13px] text-gray-300">Put on some music while chatting with Aryan’s AI Assistant 🎶</div>
            {!token && (
              <div className="text-xs text-gray-400">You’re not connected. Click “Connect Spotify” to search and play previews.</div>
            )}

            {/* Search controls */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                <button type="button" onClick={()=>setResultType('track')} className={`px-2 py-1 text-[11px] ${resultType==='track'?'bg-white/10 text-cyan-200':'text-gray-300 hover:bg-white/5'}`}>Tracks</button>
                <button type="button" onClick={()=>setResultType('playlist')} className={`px-2 py-1 text-[11px] ${resultType==='playlist'?'bg-white/10 text-cyan-200':'text-gray-300 hover:bg-white/5'}`}>Playlists</button>
              </div>
              {/* Preview-only toggle removed */}
            </div>

            <div className="flex items-center gap-2">
              <input value={query} onChange={(e)=>setQuery(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); searchTracks(query); } }} placeholder="Search songs, artists, or albums" className="flex-1 rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5 text-[13px] text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40" disabled={!token || searching} />
              <button onClick={()=>searchTracks(query)} disabled={!token || searching} className="h-9 px-3 rounded-xl border bg-cyan-500/20 border-cyan-400/30 text-cyan-200 text-[13px]">{searching ? 'Searching…' : 'Search'}</button>
            </div>

            {recentQueries?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recentQueries.map((rq) => (
                  <button key={rq} onClick={()=>{ setQuery(rq); searchTracks(rq); }} className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300">{rq}</button>
                ))}
              </div>
            )}

            {/* Results */}
            <div className="max-h-60 overflow-y-auto divide-y divide-white/5 rounded-xl border border-white/10">
              {resultType === 'track' ? (
                (() => {
                  const base = Array.isArray(results) ? results : [];
                  const filtered = base.filter(Boolean);
                  if (base.length === 0) return <div className="p-3 text-xs text-gray-500">No results yet.</div>;
                  if (filtered.length === 0) return <div className="p-3 text-xs text-gray-500">No matching tracks.</div>;
                  return filtered.map((t, idx) => (
                    <div key={t.id || t.uri || idx} className="p-2.5 flex items-center gap-2.5">
                      <img src={t.album?.images?.[2]?.url || t.album?.images?.[1]?.url || t.album?.images?.[0]?.url} alt="cover" className="h-9 w-9 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-gray-100 truncate">{t.name}</div>
                        <div className="text-[11px] text-gray-400 truncate">{(t.artists||[]).map(a=>a.name).join(', ')}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {t.preview_url ? (
                          <>
                            <button onClick={()=>{ playPreviewFromTrack(t); }} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Play</button>
                            <button onClick={pausePreview} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Pause</button>
                            <button onClick={stopPreview} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Stop</button>
                          </>
                        ) : (
                          <span className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400">No Preview</span>
                        )}
                        <button onClick={()=>{ if (t?.id) { onEmbedSet(`https://open.spotify.com/embed/track/${t.id}`,{ track: t }); if (t.preview_url) { playPreviewFromTrack(t); } } }} className="text-[11px] px-2 py-1 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-200">Play</button>
                      </div>
                    </div>
                  ));
                })()
              ) : (
                (results || []).filter(Boolean).map((p, idx) => (
                  <div key={p.id || p.uri || idx} className="p-2.5 flex items-center gap-2.5">
                    <img src={p.images?.[2]?.url || p.images?.[1]?.url || p.images?.[0]?.url} alt="cover" className="h-9 w-9 rounded-md object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-gray-100 truncate">{p.name}</div>
                      <div className="text-[11px] text-gray-400 truncate">{p.owner?.display_name || 'Playlist'}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={()=>{ if (p?.id) { onEmbedSet(`https://open.spotify.com/embed/playlist/${p.id}`, { playlistId: p.id }); setMessage('Attempting to play playlist in embedded player…'); } }} className="text-[11px] px-2 py-1 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-200">Play</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Embed input */}
            <div className="grid gap-2">
              <div className="text-xs text-gray-400">Or paste a Spotify track/playlist/album link to play:</div>
              <input
                onBlur={(e)=>onEmbedFromUrl(e.target.value)}
                onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); onEmbedFromUrl(e.currentTarget.value); } }}
                onPaste={(e)=>{ try{ const t=e.clipboardData?.getData('text'); if(t && /open\.spotify\.com/.test(t)){ setTimeout(()=>onEmbedFromUrl(t),0); } }catch{} }}
                placeholder="https://open.spotify.com/track/... or /playlist/..."
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </div>

            {/* Embed player */}
            {embedUrl && (
              <div className="mt-2">
                <iframe src={embedUrl} width="100%" height="120" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify Embed" className="rounded-xl border border-white/10" />
              </div>
            )}

            {/* Now Playing removed by request */}

            {message && <div className="text-xs text-amber-300/90">{message}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
