"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
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
  // Canonicalize to lowercase /ai without trailing slash to match Spotify allowlist exactly
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
  } catch {
    return null;
  }
}

function parseSpotifyUrlParts(url) {
  try {
    const u = new URL(url);
    if (!/open\.spotify\.com$/.test(u.hostname)) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const type = parts[0];
    const id = parts[1];
    return { type, id };
  } catch {
    return null;
  }
}

function parseEmbedOrOpenParts(url) {
  try {
    const u = new URL(url);
    if (!/open\.spotify\.com$/.test(u.hostname)) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    if (parts[0] === 'embed') {
      const type = parts[1];
      const id = parts[2];
      if (!type || !id) return null;
      return { type, id };
    }
    return { type: parts[0], id: parts[1] };
  } catch {
    return null;
  }
}

export default function SpotifyFloating() {
  const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
  const STORAGE_KEY = 'spotify_pkce_state_v1';
  const TOKEN_KEY = 'spotify_token_v1';
  const LAST_EMBED_KEY = 'spotify_last_embed_url_v1';
  const RECENT_QUERIES_KEY = 'spotify_recent_queries_v1';
  const audioRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [token, setToken] = useState(null); // {access_token, refresh_token, expires_at}
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]); // tracks or playlists depending on resultType
  const [resultType, setResultType] = useState('track'); // 'track' | 'playlist'
  const [searching, setSearching] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [message, setMessage] = useState('');
  const [recentQueries, setRecentQueries] = useState([]);
  const [nowPlayingId, setNowPlayingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlayingTrack, setNowPlayingTrack] = useState(null);
  const [canDrag, setCanDrag] = useState(false);
  const [trackPool, setTrackPool] = useState([]); // pool of tracks with preview for shuffle autoplay
  const dragControls = useDragControls();
  const modalRef = useRef(null);
  const DRAG_HINT_SEEN_KEY = 'spotify_drag_hint_seen_v1';
  const [dragHintVisible, setDragHintVisible] = useState(false);
  const PREVIEW_FILTER_KEY = 'spotify_preview_only_filter_v1';
  const [filterPreviewOnly, setFilterPreviewOnly] = useState(false);

  // Show a small drag handle hint once when modal opens (non-blocking, no pointer events)
  useEffect(() => {
    if (!open) return;
    try {
      const seen = typeof window !== 'undefined' ? window.localStorage.getItem(DRAG_HINT_SEEN_KEY) : '1';
      if (!seen) {
        setDragHintVisible(true);
        const t = setTimeout(() => {
          setDragHintVisible(false);
          try { window.localStorage.setItem(DRAG_HINT_SEEN_KEY, '1'); } catch {}
        }, 3000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [open]);

  const shouldStartDrag = (target) => {
    if (!canDrag) return false;
    let el = target;
    const root = modalRef.current;
    while (el && el !== root) {
      const tag = el.tagName;
      if (
        (el.dataset && el.dataset.nodrag !== undefined) ||
        tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'IFRAME' || tag === 'SELECT' || tag === 'LABEL' ||
        (el.getAttribute && (el.getAttribute('role') === 'button' || el.getAttribute('contenteditable') === 'true'))
      ) {
        return false;
      }
      el = el.parentElement;
    }
    return true;
  };

  // Load token from storage
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
      if (raw) {
        const t = JSON.parse(raw);
        setToken(t);
      }
      const lastEmbed = typeof window !== 'undefined' ? window.localStorage.getItem(LAST_EMBED_KEY) : null;
      if (lastEmbed) setEmbedUrl(lastEmbed);
      const rq = typeof window !== 'undefined' ? window.localStorage.getItem(RECENT_QUERIES_KEY) : null;
      if (rq) {
        try { setRecentQueries(JSON.parse(rq)); } catch {}
      }
      // load preview filter preference
      try {
        const pref = typeof window !== 'undefined' ? window.localStorage.getItem(PREVIEW_FILTER_KEY) : null;
        if (pref === '1') setFilterPreviewOnly(true);
        else if (pref === '0') setFilterPreviewOnly(false);
      } catch {}
  // Enable drag on medium+ screens only
  const setFromSize = () => setCanDrag(typeof window !== 'undefined' ? window.innerWidth >= 768 : false);
  setFromSize();
  window.addEventListener('resize', setFromSize);
  return () => window.removeEventListener('resize', setFromSize);
    } catch {}
  }, []);

  const isExpired = () => {
    if (!token?.expires_at) return true;
    return Date.now() > token.expires_at - 30_000; // 30s leeway
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
    } catch (e) {
      setMessage('Spotify session expired. Please reconnect.');
      return null;
    }
  };

  // Handle OAuth callback on /AI
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (code) {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
      if (!stored.verifier || stored.state !== state) {
        setMessage('Spotify auth state mismatch. Try again.');
        // Clean URL
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, document.title, url.toString());
        return;
      }
      // Exchange code via token proxy (PKCE)
      (async () => {
        try {
          setConnecting(true);
          const data = await callTokenProxy({
            action: 'exchange',
            client_id: CLIENT_ID,
            code,
            code_verifier: stored.verifier,
            redirect_uri: stored.redirect_uri,
          });
          saveToken(data);
          setMessage('Connected to Spotify 🎶');
        } catch (e) {
          setMessage('Failed to connect Spotify.');
        } finally {
          setConnecting(false);
          // Clean URL
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState({}, document.title, url.toString());
          // remove temp pkce storage
          try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSpotifyLogin = async () => {
    if (!CLIENT_ID) { setMessage('Missing NEXT_PUBLIC_SPOTIFY_CLIENT_ID'); return; }
    const verifier = randomString(64);
    const challenge = await sha256(verifier);
    const redirect_uri = getRedirectUri();
    const state = randomString(16);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri,
      code_challenge_method: 'S256',
      code_challenge: challenge,
  scope: 'user-read-email user-read-private',
      state,
    });
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ verifier, redirect_uri, state })); } catch {}
    window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
  };

  const logoutSpotify = () => {
    setToken(null);
    try { window.localStorage.removeItem(TOKEN_KEY); } catch {}
  };

  const searchTracks = async (q) => {
    if (!q?.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      let t = await refreshIfNeeded();
      if (!t?.access_token && !token?.access_token) {
        setMessage('Please connect Spotify first.');
        return;
      }
      let accessToken = (t?.access_token) || token.access_token;

      const doFetch = async (withMarket = true) => {
        const url = withMarket
          ? `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${resultType}&limit=10&market=from_token`
          : `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${resultType}&limit=10`;
        return fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      };

      let r = await doFetch(true);
      if (r.status === 401) {
        // Try one refresh + retry
        const rt = await refreshIfNeeded();
        if (rt?.access_token) {
          accessToken = rt.access_token;
          r = await doFetch(true);
        }
      }
      if (r.status === 403) {
        // insufficient client scope for using market=from_token in some contexts; retry without market
        r = await doFetch(false);
      }
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
      if (resultType === 'track') {
        const pool = (items || []).filter(t => t && t.preview_url);
        setTrackPool(pool);
      }
      // persist recent query
      try {
        if (q.length > 1 && Array.isArray(items) && items.length > 0) {
          const next = [q, ...(recentQueries.filter(x => x !== q))].slice(0, 5);
          setRecentQueries(next);
          window.localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(next));
        }
      } catch {}
    } catch (e) {
      console.error('Spotify search error', e);
      const msg = (e && e.message) ? e.message : 'Search error. Try again or reconnect Spotify.';
      setMessage(msg);
      if ((/401/).test(msg)) {
        setMessage('Spotify session expired. Please reconnect.');
      } else if ((/403/).test(msg)) {
        setMessage('Spotify permissions need update. Disconnect then Connect Spotify again.');
      }
    } finally {
      setSearching(false);
    }
  };

  const playPreviewFromTrack = async (track) => {
    const url = track?.preview_url;
    if (!url) { setMessage('No preview available for this track.'); return; }
    try {
      if (!audioRef.current) audioRef.current = new Audio();
      const a = audioRef.current;
      if (!a.paused) { a.pause(); }
      a.src = url;
      setNowPlayingId(track.id);
      setNowPlayingTrack({
        id: track.id,
        name: track.name,
        artists: (track.artists||[]).map(a=>a.name).join(', '),
        imageUrl: track.album?.images?.[2]?.url || track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
        preview_url: url,
      });
      a.onplay = () => setIsPlaying(true);
      a.onpause = () => setIsPlaying(false);
      a.onended = () => {
        setIsPlaying(false);
        // Shuffle autoplay from pool (exclude current)
        const pool = (trackPool || []).filter(t => t && t.preview_url && t.id !== track.id);
        if (pool.length > 0) {
          const next = pool[Math.floor(Math.random() * pool.length)];
          // slight timeout to avoid call stack issues
          setTimeout(() => { playPreviewFromTrack(next); }, 50);
        } else {
          setNowPlayingId(null);
          setNowPlayingTrack(null);
        }
      };
      await a.play();
    } catch {
      setMessage('Could not play preview.');
    }
  };

  const pausePreview = () => {
    try { const a = audioRef.current; if (a && !a.paused) a.pause(); } catch {}
  };
  const stopPreview = () => {
    try { const a = audioRef.current; if (a) { a.pause(); a.currentTime = 0; } setNowPlayingId(null); setIsPlaying(false); setNowPlayingTrack(null); } catch {}
  };
  const resumePreview = async () => {
    try { const a = audioRef.current; if (a && a.paused) { await a.play(); } } catch {}
  };

  const ensureBackgroundPlaybackFromEmbed = async () => {
    if (nowPlayingTrack || isPlaying === true) return;
    if (!embedUrl) return;
    const p = parseEmbedOrOpenParts(embedUrl);
    if (!p?.type || !p.id) return;
    if (p.type === 'track') {
      try {
        const track = await fetchWithFallback(
          `https://api.spotify.com/v1/tracks/${p.id}?market=from_token`,
          `https://api.spotify.com/v1/tracks/${p.id}`
        );
        if (track?.preview_url) await playPreviewFromTrack(track);
      } catch {}
    } else if (p.type === 'playlist') {
      await playFirstPreviewFromPlaylist(p.id);
    } else if (p.type === 'album') {
      await playFirstPreviewFromAlbum(p.id);
    }
  };

  // Helpers for autoplaying from embeds
  const getAccessToken = async () => {
    const t = await refreshIfNeeded();
    return (t?.access_token) || token?.access_token || null;
  };

  const fetchWithFallback = async (urlWithMarket, urlNoMarket) => {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('Please connect Spotify first.');
    let r = await fetch(urlWithMarket, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (r.status === 403) {
      r = await fetch(urlNoMarket, { headers: { Authorization: `Bearer ${accessToken}` } });
    }
    if (!r.ok) throw new Error(`Spotify request failed: ${r.status}`);
    return r.json();
  };

  const playFirstPreviewFromPlaylist = async (playlistId) => {
    try {
      const data = await fetchWithFallback(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&market=from_token`,
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`
      );
      const items = Array.isArray(data?.items) ? data.items : [];
      const tracks = items.map(it => it?.track).filter(Boolean);
      const withPreview = tracks.filter(t => t && t.preview_url);
      if (withPreview.length > 0) {
        setTrackPool(withPreview);
        await playPreviewFromTrack(withPreview[0]);
        return true;
      }
      setMessage('Playlist embedded. No track with 30s preview found.');
      return false;
    } catch (e) {
      setMessage('Failed to start playback from playlist embed.');
      return false;
    }
  };

  const playFirstPreviewFromAlbum = async (albumId) => {
    try {
      const data = await fetchWithFallback(
        `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50&market=from_token`,
        `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`
      );
      const items = Array.isArray(data?.items) ? data.items : [];
      // Items may be simplified tracks; prefer preview_url if present, otherwise resolve first few full track objects
      let candidates = items.filter(t => t?.preview_url);
      if (candidates.length === 0) {
        const ids = items.slice(0, 5).map(t => t?.id).filter(Boolean);
        for (const id of ids) {
          try {
            const t = await fetchWithFallback(
              `https://api.spotify.com/v1/tracks/${id}?market=from_token`,
              `https://api.spotify.com/v1/tracks/${id}`
            );
            if (t?.preview_url) { candidates = [t]; break; }
          } catch {}
        }
      }
      if (candidates.length > 0) {
        setTrackPool(candidates);
        await playPreviewFromTrack(candidates[0]);
        return true;
      }
      setMessage('Album embedded. No track with 30s preview found.');
      return false;
    } catch (e) {
      setMessage('Failed to start playback from album embed.');
      return false;
    }
  };

  const onEmbedFromUrl = async (val) => {
    const e = parseSpotifyUrlToEmbed(val);
    if (!e) { setMessage('Invalid Spotify URL'); return; }
    setEmbedUrl(e);
    try { window.localStorage.setItem(LAST_EMBED_KEY, e); } catch {}
    // If it’s a track URL, try to auto-play preview so it persists to Now Playing even after closing modal.
    const parts = parseSpotifyUrlParts(val);
    if (parts?.type === 'track' && parts.id) {
      try {
        const track = await fetchWithFallback(
          `https://api.spotify.com/v1/tracks/${parts.id}?market=from_token`,
          `https://api.spotify.com/v1/tracks/${parts.id}`
        );
        if (track?.preview_url) {
          playPreviewFromTrack(track);
        } else {
          setMessage('This track has no 30s preview. Embed set, playback unavailable.');
        }
      } catch (err) {
        console.warn('Embed preview fetch error', err);
      }
    } else if (parts?.type === 'playlist' && parts.id) {
      await playFirstPreviewFromPlaylist(parts.id);
    } else if (parts?.type === 'album' && parts.id) {
      await playFirstPreviewFromAlbum(parts.id);
    }
  };

  const onEmbedSet = async (url, meta) => {
    setEmbedUrl(url);
    try { window.localStorage.setItem(LAST_EMBED_KEY, url); } catch {}
    // If user embeds a track and it has a preview, start playing so Now Playing persists on close
    if (meta?.track && meta.track.preview_url) {
      playPreviewFromTrack(meta.track);
    } else if (meta?.track && !meta.track.preview_url) {
      setMessage('This track has no 30s preview. Embed set, but playback is unavailable.');
    } else if (meta?.playlistId) {
      await playFirstPreviewFromPlaylist(meta.playlistId);
    } else if (meta?.albumId) {
      await playFirstPreviewFromAlbum(meta.albumId);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(true)}
        className="relative h-14 w-14 rounded-full border border-cyan-300/40 bg-black/60 backdrop-blur-md shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:shadow-[0_0_34px_rgba(34,211,238,0.45)] text-cyan-200"
        aria-label="Open Spotify player"
        title="Open Spotify player"
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 via-sky-500/10 to-blue-500/10" />
        <span className="relative grid place-items-center text-xl">🎧</span>
      </motion.button>

      {/* Mini Now Playing pill (visible when modal closed) */}
      <AnimatePresence>
        {!open && nowPlayingTrack && (
          <motion.div
            key="np-pill"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="absolute bottom-20 right-0 w-[min(92vw,300px)] rounded-2xl p-[1px] bg-gradient-to-r from-cyan-400/30 via-blue-500/25 to-cyan-400/30 shadow-[0_0_24px_rgba(34,211,238,0.3)] backdrop-blur-xl"
          >
            <div className="rounded-2xl border border-white/10 bg-black/85 px-2.5 py-2 flex items-center gap-2.5">
              {nowPlayingTrack.imageUrl ? (
                <img src={nowPlayingTrack.imageUrl} alt="cover" className="h-8 w-8 rounded-md object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-md bg-white/10" />)
              }
              <button onClick={()=>setOpen(true)} className="min-w-0 flex-1 text-left">
                <div className="text-[13px] text-cyan-200 truncate">{nowPlayingTrack.name}</div>
                <div className="text-[11px] text-gray-400 truncate">{nowPlayingTrack.artists}</div>
              </button>
              <div className="flex items-center gap-1.5">
                {isPlaying ? (
                  <button onClick={pausePreview} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Pause</button>
                ) : (
                  <button onClick={resumePreview} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Play</button>
                )}
                <button onClick={stopPreview} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Stop</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="spotify-modal"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            drag={canDrag}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ left: -40, right: 40, top: -40, bottom: 40 }}
            dragElastic={0.2}
            ref={modalRef}
            onPointerDownCapture={(e) => { if (shouldStartDrag(e.target)) dragControls.start(e); }}
            className="absolute bottom-16 right-0 w-[min(94vw,360px)] sm:w-[min(92vw,420px)] rounded-2xl p-[1px] bg-gradient-to-r from-cyan-400/30 via-blue-500/25 to-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.35)] backdrop-blur-xl"
            role="dialog"
            aria-label="Spotify player"
          >
            <div className="rounded-2xl border border-white/10 bg-black/85 overflow-hidden flex flex-col max-h-[70vh]">
              <div
                className="flex items-center gap-3 px-3 py-2 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent cursor-move md:cursor-grab active:md:cursor-grabbing"
              >
                <div className="text-cyan-200 font-medium">Vibes for /AI</div>
                {dragHintVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: [0, -1, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, repeatType: 'mirror' }}
                    className="pointer-events-none select-none ml-1"
                    aria-hidden
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="h-1 w-8 rounded-full bg-gradient-to-r from-cyan-400/70 via-sky-400/70 to-blue-400/70 shadow-[0_0_10px_rgba(34,211,238,0.35)]" />
                    </div>
                  </motion.div>
                )}
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
                    <button disabled={connecting} onClick={startSpotifyLogin} className="text-[11px] px-2 py-1 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 hover:shadow-[0_0_14px_rgba(34,211,238,0.25)]">
                      {connecting ? 'Connecting…' : 'Connect Spotify'}
                    </button>
                  )}
                  <button onClick={async () => { await ensureBackgroundPlaybackFromEmbed(); setOpen(false); }} aria-label="Close" className="h-7 w-7 grid place-items-center rounded-full text-gray-300 hover:text-white hover:bg-white/10">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4l-6.3 6.3-1.41-1.42L9.17 12 2.88 5.71 4.29 4.3l6.3 6.3 6.3-6.3z"/></svg>
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto min-h-0">
                <div className="text-[13px] text-gray-300">Hey, what do you wanna listen to while chatting with Aryan’s AI? 🎶</div>

                {!token && (
                  <div className="text-xs text-gray-400">You’re not connected. Click “Connect Spotify” to search and play previews.</div>
                )}

                {/* Search type toggle */}
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg overflow-hidden border border-white/10">
                    <button type="button" onClick={()=>setResultType('track')} className={`px-2 py-1 text-[11px] ${resultType==='track'?'bg-white/10 text-cyan-200':'text-gray-300 hover:bg-white/5'}`}>Tracks</button>
                    <button type="button" onClick={()=>setResultType('playlist')} className={`px-2 py-1 text-[11px] ${resultType==='playlist'?'bg-white/10 text-cyan-200':'text-gray-300 hover:bg-white/5'}`}>Playlists</button>
                  </div>
                  {resultType === 'track' && (
                    <button
                      type="button"
                      onClick={()=> setFilterPreviewOnly(v=>{
                        const nv = !v; try { window.localStorage.setItem(PREVIEW_FILTER_KEY, nv ? '1' : '0'); } catch {}; return nv;
                      })}
                      className={`px-2 py-1 text-[11px] rounded-lg border ${filterPreviewOnly?'bg-cyan-500/15 border-cyan-400/30 text-cyan-200':'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
                      title="Show only tracks with 30s preview"
                    >
                      Preview only
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); searchTracks(query); } }}
                    placeholder="Search songs, artists, or albums"
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5 text-[13px] text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    disabled={!token || searching}
                  />
                  <button onClick={()=>searchTracks(query)} disabled={!token || searching} className="h-8 px-3 rounded-xl border bg-cyan-500/20 border-cyan-400/30 text-cyan-200 text-[13px]">
                    {searching ? 'Searching…' : 'Search'}
                  </button>
                </div>

                {/* Recent queries */}
                {recentQueries?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {recentQueries.map((rq) => (
                      <button key={rq} onClick={()=>{ setQuery(rq); searchTracks(rq); }} className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300">{rq}</button>
                    ))}
                  </div>
                )}

                {/* Results */}
                <div className="max-h-40 overflow-y-auto divide-y divide-white/5 rounded-xl border border-white/10">
                  {resultType === 'track' ? (
                    (() => {
                      const base = Array.isArray(results) ? results : [];
                      const filtered = base.filter(Boolean).filter(t => !filterPreviewOnly || !!t.preview_url);
                      if (base.length === 0) {
                        return <div className="p-3 text-xs text-gray-500">No results yet.</div>;
                      }
                      if (filtered.length === 0) {
                        return (
                          <div className="p-3 text-xs text-gray-500">
                            {filterPreviewOnly ? 'No tracks with preview found. Try turning off “Preview only”.' : 'No matching tracks.'}
                          </div>
                        );
                      }
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
                    placeholder="https://open.spotify.com/track/... or /playlist/..."
                    className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  />
                </div>

                {/* Embed player */}
                {embedUrl && (
                  <div className="mt-2">
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height="120"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      title="Spotify Embed"
                      className="rounded-xl border border-white/10"
                    />
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
                        <button onClick={pausePreview} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Pause</button>
                      ) : (
                        <button onClick={resumePreview} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Play</button>
                      )}
                      <button onClick={stopPreview} className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10">Stop</button>
                    </div>
                  </div>
                )}

                {message && <div className="text-xs text-amber-300/90">{message}</div>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
