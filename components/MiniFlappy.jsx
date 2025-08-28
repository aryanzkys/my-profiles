"use client";
import { useEffect, useRef, useState } from 'react';

export default function MiniFlappy() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [ready, setReady] = useState(true);
  const [muted, setMuted] = useState(false);
  const audioCtxRef = useRef(null);
  const pausedRef = useRef(false);
  const mutedRef = useRef(false);

  const STATE = useRef({
    birdY: 0,
    birdX: 0,
    velY: 0,
    gravity: 1200,
    flap: -320,
    pipes: [],
    pipeGap: 140,
    pipeInterval: 1500,
    lastPipe: 0,
    speed: 140,
    t0: 0,
    gameStart: 0,
  });

  const STORAGE_KEY = 'flappyBird:best';
  const STORAGE_MUTE = 'flappyBird:muted';

  // Load best score
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setBest(Number(raw) || 0);
  const m = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_MUTE) : null;
  if (m != null) setMuted(m === '1');
    } catch {}
  }, []);

  // keep refs in sync for stable key handlers
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    // Keep a pleasant 3:4 aspect ratio and fit within parent
    const targetW = rect.width;
    const targetH = Math.min(rect.height, Math.floor((rect.width * 4) / 3));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${targetW}px`;
    canvas.style.height = `${targetH}px`;
    canvas.width = Math.floor(targetW * dpr);
    canvas.height = Math.floor(targetH * dpr);
  };

  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const resetGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    STATE.current.birdX = Math.floor(W * 0.25);
    STATE.current.birdY = Math.floor(H * 0.4);
    STATE.current.velY = 0;
    STATE.current.pipes = [];
    STATE.current.lastPipe = 0;
    const now = performance.now();
    STATE.current.t0 = now;
    STATE.current.gameStart = now;
    setScore(0);
  };

  const spawnPipe = (H, gapPx) => {
    const minY = 60;
    const maxY = H - 60 - gapPx;
    const gapY = Math.floor(minY + Math.random() * (maxY - minY));
    STATE.current.pipes.push({ x: canvasRef.current.width + 40, gapY, gapH: gapPx, passed: false });
  };

  const flap = () => {
    if (!runningRef.current) {
      start();
    }
    STATE.current.velY = STATE.current.flap;
    playFlap();
  };

  const start = () => {
    if (runningRef.current) return;
    initAudio();
    resetGame();
    runningRef.current = true;
    setRunning(true);
    setPaused(false);
    setReady(false);
    loop(performance.now());
  };

  const stop = () => {
    runningRef.current = false;
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
  };

  const togglePause = () => {
    if (!runningRef.current) return;
    const now = performance.now();
    if (!paused) {
      setPaused(true);
    } else {
      // adjust lastPipe timestamp to avoid burst spawn
      STATE.current.lastPipe = now;
      setPaused(false);
      loop(now);
    }
  };

  const loop = (t) => {
    if (!runningRef.current) return;
    if (paused) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.width;
    const H = canvas.height;
    const dt = Math.min(32, t - (STATE.current.t0 || t)) / 1000; // cap dt
    STATE.current.t0 = t;

    // Difficulty scaling over time
    const elapsed = Math.max(0, (t - (STATE.current.gameStart || t)) / 1000);
    const speedFactor = 1 + Math.min(elapsed * 0.015, 1.25); // up to ~2.25x after ~83s
    const minGapPx = Math.max(90 * dpr, 90 * dpr);
    const baseGapPx = Math.max(120 * dpr, STATE.current.pipeGap * dpr);
    const gapShrink = Math.min(elapsed * 1.2 * dpr, baseGapPx - minGapPx);
    const dynamicGapPx = Math.max(minGapPx, baseGapPx - gapShrink);

    // Physics
    STATE.current.velY += STATE.current.gravity * dt;
    STATE.current.birdY += STATE.current.velY * dt;

    // Pipes spawn/move
    if (STATE.current.pipes.length === 0 || t - STATE.current.lastPipe > STATE.current.pipeInterval) {
      spawnPipe(H, dynamicGapPx);
      STATE.current.lastPipe = t;
    }
    const speedPx = STATE.current.speed * speedFactor * dt * dpr;
    for (const p of STATE.current.pipes) p.x -= speedPx;
    // Remove offscreen
    STATE.current.pipes = STATE.current.pipes.filter((p) => p.x > -80);

    // Collisions + scoring
    const birdR = Math.max(10, Math.floor(10 * dpr));
    const pipeW = Math.max(60 * dpr, W * 0.12);
    for (const p of STATE.current.pipes) {
      const inPipeX = (STATE.current.birdX + birdR > p.x) && (STATE.current.birdX - birdR < p.x + pipeW);
      const hitTop = STATE.current.birdY - birdR < p.gapY;
      const hitBottom = STATE.current.birdY + birdR > p.gapY + p.gapH;
      if (inPipeX && (hitTop || hitBottom)) {
        // Game over
        setReady(true);
        playHit();
        stop();
      }
      if (!p.passed && p.x + pipeW < STATE.current.birdX - birdR) {
        p.passed = true;
        setScore((s) => {
          const ns = s + 1;
          try {
            if (ns > best) {
              setBest(ns);
              localStorage.setItem(STORAGE_KEY, String(ns));
            }
          } catch {}
          playScore();
          return ns;
        });
      }
    }

    // Floor/Ceiling
    if (STATE.current.birdY + birdR >= H || STATE.current.birdY - birdR <= 0) {
      setReady(true);
      stop();
    }

    // Render
    ctx.clearRect(0, 0, W, H);
    // Sky
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0b1f2a');
    grad.addColorStop(1, '#143747');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Pipes
    ctx.fillStyle = '#3fb28a';
    for (const p of STATE.current.pipes) {
      ctx.fillRect(p.x, 0, pipeW, p.gapY);
      ctx.fillRect(p.x, p.gapY + p.gapH, pipeW, H - (p.gapY + p.gapH));
    }

    // Bird
    ctx.beginPath();
    ctx.fillStyle = '#ffd166';
    ctx.arc(STATE.current.birdX, STATE.current.birdY, birdR, 0, Math.PI * 2);
    ctx.fill();
    // Eye
    ctx.beginPath();
    ctx.fillStyle = '#1f2937';
    ctx.arc(STATE.current.birdX + birdR * 0.3, STATE.current.birdY - birdR * 0.2, birdR * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // HUD
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `${Math.floor(22 * dpr)}px system-ui, -apple-system, Segoe UI, Roboto`;
  ctx.fillText(`Score: ${score}`, 16 * dpr, 28 * dpr);
  ctx.fillText(`Best: ${best}`, 16 * dpr, 52 * dpr);
  ctx.fillText(`Gap: ${Math.round(dynamicGapPx/dpr)}  Speed x${speedFactor.toFixed(2)}`, 16 * dpr, 76 * dpr);

    rafRef.current = requestAnimationFrame(loop);
  };

  // Input handlers
  useEffect(() => {
    const onKey = (e) => {
      const code = e.code;
      if (code === 'Space' || code === 'ArrowUp') {
        e.preventDefault();
        flap();
        return;
      }
      if (code === 'KeyP') {
        e.preventDefault();
        if (!runningRef.current) return;
        if (!pausedRef.current) {
          setPaused(true);
        } else {
          const now = performance.now();
          STATE.current.lastPipe = now;
          setPaused(false);
          loop(now);
        }
        return;
      }
      if (code === 'KeyM') {
        e.preventDefault();
        setMuted((m) => {
          const nm = !m;
          try { localStorage.setItem(STORAGE_MUTE, nm ? '1' : '0'); } catch {}
          return nm;
        });
        return;
      }
      if (code === 'Enter' && !runningRef.current) {
        e.preventDefault();
        start();
        return;
      }
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Audio helpers (simple WebAudio beeps/noise)
  const initAudio = () => {
    if (audioCtxRef.current || typeof window === 'undefined') return;
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch {}
  };

  const playTone = (freq = 600, duration = 0.08, type = 'sine', gain = 0.15) => {
    if (mutedRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  };

  const playNoise = (duration = 0.2, gain = 0.2) => {
    if (mutedRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const t0 = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    src.buffer = buffer;
    src.connect(g).connect(ctx.destination);
    src.start(t0);
  };

  const playFlap = () => playTone(700, 0.06, 'square', 0.12);
  const playScore = () => playTone(900, 0.08, 'sine', 0.18);
  const playHit = () => playNoise(0.18, 0.22);

  const toggleMute = () => {
    setMuted((m) => {
      const nm = !m;
      try { localStorage.setItem(STORAGE_MUTE, nm ? '1' : '0'); } catch {}
      return nm;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15" onClick={start}>Start</button>
        <button className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15" onClick={flap} title="Flap (Space/Up)">Flap</button>
        <button className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15" onClick={togglePause} disabled={!running} title="Pause/Resume (P)">{paused ? 'Resume' : 'Pause'}</button>
    <button className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15" onClick={toggleMute} title="Mute/Unmute (M)">{muted ? 'Unmute' : 'Mute'}</button>
        <div className="ml-auto flex items-center gap-3 text-sm text-gray-300">
          <span>Score: <span className="text-white">{score}</span></span>
          <span>Best: <span className="text-white">{best}</span></span>
        </div>
      </div>
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30 p-2">
        <div className="w-full" style={{ aspectRatio: '3 / 4', maxHeight: '70vh' }}>
          <canvas
            ref={canvasRef}
            className="block w-full h-full touch-manipulation select-none"
            onClick={flap}
            onTouchStart={(e) => { e.preventDefault(); flap(); }}
          />
        </div>
        {ready && (
          <div className="absolute inset-2 flex items-center justify-center">
            <div className="pointer-events-none rounded-xl border border-white/10 bg-black/50 backdrop-blur p-4 text-center">
              <div className="text-white font-semibold">Tap or press Space to start</div>
      <div className="text-gray-300 text-xs mt-1">Desktop: Space/Up to flap, P to pause, M to mute</div>
              <div className="text-gray-300 text-xs">Mobile: Tap the canvas to flap</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
