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
  const PREVIEW_FILTER_KEY = 'spotify_preview_only_filter_v1';

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
  const [filterPreviewOnly, setFilterPreviewOnly] = useState(false);
  const [message, setMessage] = useState('');

  const [nowPlayingTrack, setNowPlayingTrack] = useState(null);
  const [nowPlayingContextUri, setNowPlayingContextUri] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackMode, setPlaybackMode] = useState('preview'); // 'preview' | 'web'
  const [trackPool, setTrackPool] = useState([]);

  const [deviceId, setDeviceId] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [webPlaybackUnavailable, setWebPlaybackUnavailable] = useState(false);

  // load persisted state
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
      if (raw) setToken(JSON.parse(raw));
      const last = typeof window !== 'undefined' ? window.localStorage.getItem(LAST_EMBED_KEY) : null;
      if (last) setEmbedUrl(last);
      const rq = typeof window !== 'undefined' ? window.localStorage.getItem(RECENT_QUERIES_KEY) : null;
      if (rq) setRecentQueries(JSON.parse(rq));
      const pref = typeof window !== 'undefined' ? window.localStorage.getItem(PREVIEW_FILTER_KEY) : null;
      if (pref === '1') setFilterPreviewOnly(true);
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
      if (resultType === 'track') setTrackPool((items || []).filter(t => t && t.preview_url));
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
      setNowPlayingTrack({
        id: track.id,
        name: track.name,
        artists: (track.artists||[]).map(a=>a.name).join(', '),
        imageUrl: track.album?.images?.[2]?.url || track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
        preview_url: url,
        uri: track.uri || (track.id ? `spotify:track:${track.id}` : ''),
      });
      setNowPlayingContextUri(null);
      setPlaybackMode('preview');
      a.onplay = () => setIsPlaying(true);
      a.onpause = () => setIsPlaying(false);
      a.onended = () => {
        setIsPlaying(false);
        const pool = (trackPool || []).filter(t => t && t.preview_url && t.id !== track.id);
        if (pool.length > 0) {
          const next = pool[Math.floor(Math.random() * pool.length)];
          setTimeout(() => { playPreviewFromTrack(next); }, 50);
        }
      };
      await a.play();
    } catch { setMessage('Could not play preview.'); }
  };
  const setNowPlayingFromTrack = (track, imageOverride) => {
    if (!track) return;
    setNowPlayingTrack({
      id: track.id || null,
      name: track.name || 'Unknown',
      artists: Array.isArray(track.artists) ? track.artists.map(a=>a.name).join(', ') : (track.artists || ''),
      imageUrl: imageOverride || track.album?.images?.[2]?.url || track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
      preview_url: track.preview_url || '',
      uri: track.uri || (track.id ? `spotify:track:${track.id}` : ''),
    });
    setIsPlaying(false);
  };

  // Web Playback SDK helpers (Premium)
  const ensureWebPlaybackSDK = async () => {
    if (typeof window === 'undefined') return false;
    if (window.Spotify) return true;
    return new Promise((resolve) => {
      const scriptId = 'spotify-web-playback-sdk';
      if (document.getElementById(scriptId)) {
        const check = () => window.Spotify ? resolve(true) : setTimeout(check, 50);
        check(); return;
      }
      const s = document.createElement('script');
      s.id = scriptId; s.src = SPOTIFY_SDK_URL;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  };
  const initWebPlayerIfNeeded = async () => {
    const ok = await ensureWebPlaybackSDK();
    if (!ok) { setMessage('Spotify player failed to load.'); return false; }
    if (playerRef.current && playerReady && deviceId) return true;
    const accessToken = await getAccessToken(); if (!accessToken) { setMessage('Please connect Spotify first.'); return false; }
    return new Promise((resolve) => {
      const player = new window.Spotify.Player({ name: 'AI Vibes Player', getOAuthToken: cb => { cb(accessToken); }, volume: 0.8 });
      playerRef.current = player;
      player.addListener('ready', ({ device_id }) => { setDeviceId(device_id); setPlayerReady(true); setWebPlaybackUnavailable(false); resolve(true); });
      player.addListener('not_ready', () => { setPlayerReady(false); });
      player.addListener('initialization_error', ({ message }) => { setMessage(`Player init error: ${message}`); resolve(false); });
      player.addListener('authentication_error', ({ message }) => { setMessage('Spotify auth error. Disconnect and reconnect.'); setWebPlaybackUnavailable(true); resolve(false); });
      player.addListener('account_error', ({ message }) => { setMessage('Spotify Premium required for full playback.'); setWebPlaybackUnavailable(true); resolve(false); });
      player.connect();
    });
  };
  const transferToWebPlayer = async () => {
    const accessToken = await getAccessToken(); if (!accessToken || !deviceId) return false;
    try {
      const r = await fetch('https://api.spotify.com/v1/me/player', { method: 'PUT', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ device_ids: [deviceId], play: false }) });
      return r.status === 202 || r.status === 204;
    } catch { return false; }
  };
  const startWebPlaybackForUris = async (uris) => {
    if (!Array.isArray(uris) || uris.length === 0) return false;
    const inited = await initWebPlayerIfNeeded(); if (!inited) return false;
    await playerRef.current?.activateElement?.(); await transferToWebPlayer();
    const accessToken = await getAccessToken();
    try {
      const r = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ uris }) });
      if (r.status === 204) { setIsPlaying(true); setPlaybackMode('web'); setWebPlaybackUnavailable(false); return true; }
    } catch {}
    setMessage('Failed to start full playback.'); setWebPlaybackUnavailable(true); return false;
  };
  const startWebPlaybackForContext = async (context_uri) => {
    if (!context_uri) return false;
    const inited = await initWebPlayerIfNeeded(); if (!inited) return false;
    await playerRef.current?.activateElement?.(); await transferToWebPlayer();
    const accessToken = await getAccessToken();
    try {
      const r = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ context_uri }) });
      if (r.status === 204) { setIsPlaying(true); setPlaybackMode('web'); setWebPlaybackUnavailable(false); return true; }
    } catch {}
    setMessage('Failed to start full playback.'); setWebPlaybackUnavailable(true); return false;
  };
  const pauseWebPlayback = async () => { const accessToken = await getAccessToken(); try { const r = await fetch('https://api.spotify.com/v1/me/player/pause', { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` } }); if (r.status === 204) setIsPlaying(false); } catch {} };
  const resumeWebPlayback = async () => { const accessToken = await getAccessToken(); try { const r = await fetch('https://api.spotify.com/v1/me/player/play', { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` } }); if (r.status === 204) setIsPlaying(true); } catch {} };
  const stopWebPlayback = async () => { const accessToken = await getAccessToken(); try { await fetch('https://api.spotify.com/v1/me/player/seek?position_ms=0', { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` } }); const r = await fetch('https://api.spotify.com/v1/me/player/pause', { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` } }); if (r.status === 204) setIsPlaying(false); } catch {} };

  const pausePreview = () => { try { const a = audioRef.current; if (a && !a.paused) a.pause(); } catch {} };
  const resumePreview = async () => { try { const a = audioRef.current; if (a && a.paused) await a.play(); } catch {} };
  const stopPreview = () => { try { const a = audioRef.current; if (a) { a.pause(); a.currentTime = 0; } setIsPlaying(false); } catch {} };

  const playNowPlaying = async () => {
    const nt = nowPlayingTrack; if (!nt) return;
    if (nt.preview_url) {
      try {
        if (audioRef.current && audioRef.current.src === nt.preview_url) await resumePreview();
        else await playPreviewFromTrack({ id: nt.id, name: nt.name, artists: (nt.artists||'').split(', ').map(n=>({name:n})), album: { images: [{url: nt.imageUrl},{url: nt.imageUrl},{url: nt.imageUrl}] }, preview_url: nt.preview_url, uri: nt.uri });
      } catch {}
      return;
    }
    if (nowPlayingContextUri) { await startWebPlaybackForContext(nowPlayingContextUri); return; }
    if (nt.uri) { await startWebPlaybackForUris([nt.uri]); return; }
    setMessage('Cannot play this item in-app without a preview or Premium.');
  };

  const playFirstPreviewFromPlaylist = async (playlistId) => {
    try {
      const data = await fetchWithFallback(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&market=from_token`, `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`);
      const items = Array.isArray(data?.items) ? data.items : [];
      const tracks = items.map(it => it?.track).filter(Boolean);
      const withPreview = tracks.filter(t => t && t.preview_url);
      if (withPreview.length > 0) { setTrackPool(withPreview); await playPreviewFromTrack(withPreview[0]); return true; }
      if (tracks.length > 0) {
        setNowPlayingFromTrack(tracks[0]); setNowPlayingContextUri(`spotify:playlist:${playlistId}`);
        const ok = await startWebPlaybackForContext(`spotify:playlist:${playlistId}`);
        if (!ok) setMessage('Playlist embedded. No preview; showing first track. Full playback needs Spotify Premium.');
        return ok;
      }
      setMessage('Playlist embedded. No tracks available.'); return false;
    } catch { setMessage('Failed to start playback from playlist embed.'); return false; }
  };
  const playFirstPreviewFromAlbum = async (albumId) => {
    try {
      const data = await fetchWithFallback(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50&market=from_token`, `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`);
      const items = Array.isArray(data?.items) ? data.items : [];
      let candidates = items.filter(t => t?.preview_url);
      if (candidates.length === 0) {
        const ids = items.slice(0, 5).map(t => t?.id).filter(Boolean);
        for (const id of ids) {
          try {
            const t = await fetchWithFallback(`https://api.spotify.com/v1/tracks/${id}?market=from_token`, `https://api.spotify.com/v1/tracks/${id}`);
            if (t?.preview_url) { candidates = [t]; break; }
          } catch {}
        }
      }
      if (candidates.length > 0) { setTrackPool(candidates); await playPreviewFromTrack(candidates[0]); return true; }
      let cover = '';
      try {
        const album = await fetchWithFallback(`https://api.spotify.com/v1/albums/${albumId}?market=from_token`, `https://api.spotify.com/v1/albums/${albumId}`);
        cover = album?.images?.[2]?.url || album?.images?.[1]?.url || album?.images?.[0]?.url || '';
      } catch {}
      if (items.length > 0) {
        const first = items[0]; setNowPlayingFromTrack(first, cover); setNowPlayingContextUri(`spotify:album:${albumId}`);
        const ok = await startWebPlaybackForContext(`spotify:album:${albumId}`);
        if (!ok) setMessage('Album embedded. No preview; showing first track. Full playback needs Spotify Premium.');
        return ok;
      }
      setMessage('Album embedded. No tracks available.'); return false;
    } catch { setMessage('Failed to start playback from album embed.'); return false; }
  };

  const onEmbedFromUrl = async (val) => {
    const e = parseSpotifyUrlToEmbed(val); if (!e) { setMessage('Invalid Spotify URL'); return; }
    setEmbedUrl(e); try { window.localStorage.setItem(LAST_EMBED_KEY, e); } catch {}
    const parts = parseSpotifyUrlParts(val);
    if (parts?.type === 'track' && parts.id) {
      try {
        const track = await fetchWithFallback(`https://api.spotify.com/v1/tracks/${parts.id}?market=from_token`, `https://api.spotify.com/v1/tracks/${parts.id}`);
        if (track?.preview_url) playPreviewFromTrack(track);
        else {
          setNowPlayingFromTrack(track);
          const ok = track?.uri ? await startWebPlaybackForUris([track.uri]) : false;
          if (!ok) setMessage('This track has no 30s preview. Full playback needs Spotify Premium.');
        }
      } catch {}
    } else if (parts?.type === 'playlist' && parts.id) { await playFirstPreviewFromPlaylist(parts.id); }
    else if (parts?.type === 'album' && parts.id) { await playFirstPreviewFromAlbum(parts.id); }
  };

  const onEmbedSet = async (url, meta) => {
    setEmbedUrl(url); try { window.localStorage.setItem(LAST_EMBED_KEY, url); } catch {}
    if (meta?.track && meta.track.preview_url) { playPreviewFromTrack(meta.track); }
    else if (meta?.track && !meta.track.preview_url) {
      setNowPlayingFromTrack(meta.track);
      const ok = meta.track?.uri ? await startWebPlaybackForUris([meta.track.uri]) : false;
      if (!ok) setMessage('This track has no 30s preview. Full playback needs Spotify Premium.');
    } else if (meta?.playlistId) { await playFirstPreviewFromPlaylist(meta.playlistId); }
    else if (meta?.albumId) { await playFirstPreviewFromAlbum(meta.albumId); }
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
              {resultType === 'track' && (
                <button type="button" onClick={()=> setFilterPreviewOnly(v=>{ const nv=!v; try { window.localStorage.setItem(PREVIEW_FILTER_KEY, nv?'1':'0'); } catch{}; return nv; })} className={`px-2 py-1 text-[11px] rounded-lg border ${filterPreviewOnly?'bg-cyan-500/15 border-cyan-400/30 text-cyan-200':'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`} title="Show only tracks with 30s preview">Preview only</button>
              )}
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
                  const filtered = base.filter(Boolean).filter(t => !filterPreviewOnly || !!t.preview_url);
                  if (base.length === 0) return <div className="p-3 text-xs text-gray-500">No results yet.</div>;
                  if (filtered.length === 0) return <div className="p-3 text-xs text-gray-500">{filterPreviewOnly ? 'No tracks with preview found. Try turning off “Preview only”.' : 'No matching tracks.'}</div>;
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
                        <button onClick={()=>{ if (t?.id) onEmbedSet(`https://open.spotify.com/embed/track/${t.id}`,{ track: t }); }} className="text-[11px] px-2 py-1 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-200">Embed</button>
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
                      <button onClick={()=>{ if (p?.id) onEmbedSet(`https://open.spotify.com/embed/playlist/${p.id}`, { playlistId: p.id }); }} className="text-[11px] px-2 py-1 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-200">Embed</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Embed input */}
            <div className="grid gap-2">
              <div className="text-xs text-gray-400">Or paste a Spotify track/playlist/album link to embed:</div>
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

            {/* Now Playing bar */}
            {nowPlayingTrack && (
              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-2 flex items-center gap-2.5">
                {nowPlayingTrack.imageUrl ? (
                  <img src={nowPlayingTrack.imageUrl} alt="cover" className="h-8 w-8 rounded-md object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-md bg-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-gray-100 truncate">{nowPlayingTrack.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">{nowPlayingTrack.artists}</div>
                </div>
                <div className="flex items-center gap-2">
                  {isPlaying ? (
                    <button onClick={() => { playbackMode==='web' ? pauseWebPlayback() : pausePreview(); }} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Pause</button>
                  ) : (
                    <button onClick={playNowPlaying} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Play</button>
                  )}
                  <button onClick={() => { playbackMode==='web' ? stopWebPlayback() : stopPreview(); }} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Stop</button>
                </div>
              </div>
            )}

            {/* Subtle Premium note */}
            {!nowPlayingTrack?.preview_url && webPlaybackUnavailable && (
              <div className="text-[10px] text-gray-400">Premium required for in-app playback</div>
            )}

            {message && <div className="text-xs text-amber-300/90">{message}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
