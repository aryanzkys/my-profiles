"use client";
import { useEffect, useRef, useState } from 'react';

export default function MiniFlappyPhaser() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [ready, setReady] = useState(true);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [muted, setMuted] = useState(false);
  const [preset, setPreset] = useState('normal'); // 'easy' | 'normal' | 'hard'
  const [volume, setVolume] = useState(0.8); // 0..1
  const [framePct, setFramePct] = useState(70); // viewport height percentage for frame
  const [uiSpin, setUiSpin] = useState({ vol: false, frame: false });

  const BEST_KEY = (p) => `flappyPhaser:best:${p}`;
  const MUTE_KEY = 'flappyPhaser:muted';
  const PRESET_KEY = 'flappyPhaser:preset';
  const VOL_KEY = 'flappyPhaser:vol';
  const FRAME_KEY = 'flappyPhaser:framePct';

  useEffect(() => {
    try {
      const savedPreset = localStorage.getItem(PRESET_KEY);
      if (savedPreset === 'easy' || savedPreset === 'normal' || savedPreset === 'hard') {
        setPreset(savedPreset);
      }
      const b = localStorage.getItem(BEST_KEY(savedPreset || 'normal'));
      if (b) setBest(Number(b) || 0);
      const m = localStorage.getItem(MUTE_KEY);
      if (m != null) setMuted(m === '1');
      const v = localStorage.getItem(VOL_KEY);
      if (v != null) {
        const num = Math.max(0, Math.min(1, Number(v)));
        if (!Number.isNaN(num)) setVolume(num);
      }
      const f = localStorage.getItem(FRAME_KEY);
      if (f != null) {
        const n = Math.max(40, Math.min(100, Number(f)));
        if (!Number.isNaN(n)) setFramePct(n);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let destroyed = false;
    (async () => {
      const Phaser = (await import('phaser')).default;
      if (destroyed) return;
    class FlappyScene extends Phaser.Scene {
        constructor() { super('FlappyScene'); }
        init() {
          this.isRunning = false;
          this.lastPipe = 0;
          this.pipeInterval = 1500; // ms
          this.pipeGap = 140; // px at base 480h, will scale a bit
          this.speed = 160; // px/s base
          this.scoreVal = 0;
          this.pipes = this.add.group();
          this.passed = new Set();
          this.startedAt = 0;
          this.bestScore = 0;
          this.muted = false;
      this.audioCtx = null;
      this.masterVolume = 0.8;
      this.whooshGain = null;
      this.whooshSrc = null;
      this.preset = 'normal';
      // scaling coefficients (will be set by preset)
      this.elapsedCoeff = 0.015;
      this.scoreCoeff = 0.02;
        }
        create() {
          const W = this.scale.width;
          const H = this.scale.height;

          // Background color
          this.cameras.main.setBackgroundColor('#0b1f2a');

          // Create simple textures
          const g = this.add.graphics();
          // Bird texture
          const r = 10; g.clear(); g.fillStyle(0xffd166, 1); g.fillCircle(r, r, r);
          g.generateTexture('birdTex', r * 2, r * 2);
          // Pipe texture
          const pw = 64; const ph = 512; g.clear(); g.fillStyle(0x3fb28a, 1); g.fillRect(0, 0, pw, ph);
          g.generateTexture('pipeTex', pw, ph);

          // Bird
          this.bird = this.physics.add.sprite(Math.floor(W * 0.25), Math.floor(H * 0.45), 'birdTex');
          this.bird.body.setCircle(r);
          this.bird.body.setCollideWorldBounds(true);
          this.physics.world.setBounds(0, 0, W, H);
          this.physics.world.gravity.y = 1100;

          // Score text
          this.scoreText = this.add.text(12, 10, 'Score: 0', { fontSize: '18px', fontFamily: 'system-ui,Segoe UI,Roboto', color: '#fff' }).setScrollFactor(0);
          this.bestText = this.add.text(12, 34, 'Best: 0', { fontSize: '16px', fontFamily: 'system-ui,Segoe UI,Roboto', color: '#d1d5db' }).setScrollFactor(0);
          // initialize best label from pre-seeded or localStorage
          try {
            if (!this.bestScore) {
              const b = Number(window.localStorage.getItem(`flappyPhaser:best:${this.preset||'normal'}`)) || 0;
              this.bestScore = b;
            }
          } catch {}
          this.bestText.setText(`Best: ${this.bestScore || 0}`);

          // Input
          this.input.on('pointerdown', () => this.flap());
          this.input.keyboard.on('keydown-SPACE', () => this.flap());
          this.input.keyboard.on('keydown-UP', () => this.flap());
          this.input.keyboard.on('keydown-P', () => this.togglePause());
          this.input.keyboard.on('keydown-M', () => this.toggleMute());

          // Collisions via overlap check each frame
        }
        applyPreset(preset) {
          this.preset = preset;
          if (preset === 'easy') {
            this.speed = 140; this.pipeInterval = 1600; this.pipeGap = 170; this.elapsedCoeff = 0.01; this.scoreCoeff = 0.015;
          } else if (preset === 'hard') {
            this.speed = 190; this.pipeInterval = 1350; this.pipeGap = 130; this.elapsedCoeff = 0.02; this.scoreCoeff = 0.03;
          } else {
            this.speed = 160; this.pipeInterval = 1500; this.pipeGap = 140; this.elapsedCoeff = 0.015; this.scoreCoeff = 0.02;
          }
          // update best label for this preset
          try {
            const b = Number(window.localStorage.getItem(`flappyPhaser:best:${preset}`)) || 0;
            this.bestScore = b; this.bestText && this.bestText.setText(`Best: ${this.bestScore}`);
          } catch {}
        }
        startGame() {
          this.isRunning = true;
          this.resetGame();
        }
        resetGame() {
          const W = this.scale.width, H = this.scale.height;
          this.scoreVal = 0; this.scoreText.setText('Score: 0');
          this.bird.setPosition(Math.floor(W * 0.25), Math.floor(H * 0.45));
          this.bird.setVelocity(0, 0);
          for (const p of this.pipes.getChildren()) p.destroy();
          this.pipes.clear(true);
          this.lastPipe = 0;
          this.passed.clear();
          this.startedAt = this.time.now;
          this.startWhoosh();
        }
        flap() {
          if (!this.isRunning) this.startGame();
          this.bird.setVelocityY(-320);
          this.playFlap();
        }
        togglePause() {
          const newState = !this.physics.world.isPaused;
          this.physics.world.isPaused = newState;
          this.scene.pauseOnBlur = false;
          if (!newState) {
            // resume: reset timer baseline to current time to prevent burst spawn
            this.lastPipe = this.time.now;
          }
          if (this.onPauseChange) this.onPauseChange(newState);
        }
        toggleMute() {
          this.muted = !this.muted;
          if (this.onMuteChange) this.onMuteChange(this.muted);
          // also adjust whoosh gain immediately
          this.updateWhooshGain();
        }
        ensureAudio() {
          if (this.audioCtx) return;
          try { this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
          try { if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume(); } catch {}
        }
        playTone(freq = 700, dur = 0.08, type = 'sine', gainVal = 0.15) {
          if (this.muted || !this.audioCtx) return;
          const ctx = this.audioCtx;
          const t0 = ctx.currentTime;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = type; osc.frequency.setValueAtTime(freq, t0);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(gainVal * (this.masterVolume ?? 1), t0 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
          osc.connect(g).connect(ctx.destination);
          osc.start(t0); osc.stop(t0 + dur + 0.02);
        }
        playNoise(dur = 0.18, gainVal = 0.22) {
          if (this.muted || !this.audioCtx) return;
          const ctx = this.audioCtx;
          const t0 = ctx.currentTime;
          const len = Math.floor(ctx.sampleRate * dur);
          const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
          const src = ctx.createBufferSource();
          const g = ctx.createGain();
          g.gain.setValueAtTime(gainVal * (this.masterVolume ?? 1), t0);
          src.buffer = buffer; src.connect(g).connect(ctx.destination); src.start(t0);
        }
        playFlap() { this.ensureAudio(); this.playTone(750, 0.06, 'square', 0.12); }
        playScore() { this.ensureAudio(); this.playTone(900, 0.08, 'sine', 0.18); }
        playHit() { this.ensureAudio(); this.playNoise(0.18, 0.22); }
        startWhoosh() {
          this.ensureAudio(); if (!this.audioCtx) return;
          // Create looping noise source with low volume
          const ctx = this.audioCtx;
          const len = Math.floor(ctx.sampleRate * 0.5);
          const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
          const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
          const g = ctx.createGain(); g.gain.value = 0; // start silent
          src.connect(g).connect(ctx.destination); src.start();
          this.whooshSrc = src; this.whooshGain = g;
          this.updateWhooshGain();
        }
        stopWhoosh() {
          try { this.whooshSrc?.stop(); } catch {}
          this.whooshSrc = null; this.whooshGain = null;
        }
        updateWhooshGain() {
          if (!this.whooshGain) return;
          const base = this.muted ? 0 : 0.05 * (this.masterVolume ?? 1);
          const factor = this.currSpeedFactor || 1; // gets higher as game gets harder
          const target = Math.min(0.22, base * (0.6 + 0.6 * (factor - 1 + Math.max(0, this.scoreVal) * 0.02)));
          const now = this.audioCtx?.currentTime || 0;
          try {
            this.whooshGain.gain.cancelScheduledValues(now);
            this.whooshGain.gain.linearRampToValueAtTime(target, now + 0.1);
          } catch {}
        }
        spawnPipe() {
          const W = this.scale.width, H = this.scale.height;
          // difficulty scaling
          const elapsed = Math.max(0, (this.time.now - (this.startedAt || this.time.now)) / 1000);
          const speedFactor = 1 + Math.min(elapsed * this.elapsedCoeff + (this.scoreVal * this.scoreCoeff), 1.25);
          this.currSpeedFactor = speedFactor;
          const baseGap = Math.max(110, Math.min(220, Math.floor((this.pipeGap / 480) * H)));
          const minBase = this.preset === 'easy' ? 0.22 : this.preset === 'hard' ? 0.16 : 0.18;
          const minGap = Math.max(80, Math.floor(H * minBase));
          const shrink = Math.min(baseGap - minGap, Math.floor(elapsed * (this.elapsedCoeff*80) + this.scoreVal * (this.scoreCoeff*40)));
          const gapBase = Math.max(minGap, baseGap - shrink);
          const gapY = Phaser.Math.Between(60, Math.max(70, H - 60 - gapBase));
          const x = W + 80;
          // top pipe
          const top = this.physics.add.staticImage(x, gapY - 256, 'pipeTex').setOrigin(0, 1).setFlipY(true);
          top.refreshBody();
          // bottom pipe
          const bottom = this.physics.add.staticImage(x, gapY + gapBase, 'pipeTex').setOrigin(0, 0);
          bottom.isBottom = true;
          bottom.refreshBody();
          this.pipes.addMultiple([top, bottom]);
          this.updateWhooshGain();
        }
        update(time, delta) {
          if (!this.isRunning || this.physics.world.isPaused) return;
          const W = this.scale.width, H = this.scale.height;
          // spawn pipes
          if (this.pipes.getLength() === 0 || (time - this.lastPipe) > this.pipeInterval) {
            this.spawnPipe(); this.lastPipe = time;
          }
          // move pipes
          const factor = this.currSpeedFactor || 1;
          const d = (this.speed * factor * delta) / 1000;
          for (const p of this.pipes.getChildren()) {
            p.x -= d; p.refreshBody();
          }
          // cleanup
          for (const p of [...this.pipes.getChildren()]) {
            if (p.x < -100) { p.destroy(); }
          }
          // scoring
          const birdX = this.bird.x, pw = 64;
          for (const p of this.pipes.getChildren()) {
            if (!p.body || !p.isBottom) continue;
            const id = p.__scoreId || (p.__scoreId = `${Math.floor(p.x)}:${Math.floor(p.y)}`);
            if (!this.passed.has(id) && (p.x + pw) < (birdX - 10)) {
              this.passed.add(id);
              this.scoreVal += 1;
              this.scoreText.setText(`Score: ${this.scoreVal}`);
              if (this.scoreVal > this.bestScore) {
                this.bestScore = this.scoreVal;
                this.bestText.setText(`Best: ${this.bestScore}`);
                if (this.onBestChange) this.onBestChange(this.bestScore);
              }
              this.playScore();
              this.updateWhooshGain();
            }
          }
          // collisions
          const birdRect = new Phaser.Geom.Rectangle(this.bird.x - 10, this.bird.y - 10, 20, 20);
          for (const p of this.pipes.getChildren()) {
            const pb = p.getBounds();
            if (Phaser.Geom.Intersects.RectangleToRectangle(birdRect, pb)) {
              this.gameOver();
              break;
            }
          }
          // out of bounds
          if (this.bird.y <= 0 || this.bird.y >= H) this.gameOver();
        }
        gameOver() {
          this.isRunning = false;
          this.physics.world.isPaused = true;
          this.playHit();
          try { if (window.navigator?.vibrate) window.navigator.vibrate([200, 60, 120]); } catch {}
          this.stopWhoosh();
          if (this.onGameOver) this.onGameOver(this.scoreVal|0, this.bestScore|0);
        }
      }

      const config = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        backgroundColor: '#0b1f2a',
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 360, height: 480 },
        physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
        scene: FlappyScene,
      };
      const game = new Phaser.Game(config);
      gameRef.current = game;
      game.scene.start('FlappyScene');
      const scene = game.scene.getScene('FlappyScene');
      scene.onGameOver = (s, b) => {
        setReady(true); setPaused(true); setScore(s);
        try {
          const key = BEST_KEY(scene.preset || 'normal');
          if (b && b > (Number(localStorage.getItem(key))||0)) { localStorage.setItem(key, String(b)); setBest(b); }
        } catch {}
      };
      scene.onPauseChange = (pausedNow) => setPaused(pausedNow);
      scene.onBestChange = (b) => {
        try {
          const key = BEST_KEY(scene.preset || 'normal');
          if (b > (Number(localStorage.getItem(key))||0)) { localStorage.setItem(key, String(b)); setBest(b); }
        } catch {}
      };
      scene.onMuteChange = (m) => {
        try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch {}
        setMuted(m);
      };
      // seed best/mute into scene
      const initialPreset = (localStorage.getItem(PRESET_KEY) || 'normal');
      const initialBest = (Number(localStorage.getItem(BEST_KEY(initialPreset)))||0);
      scene.bestScore = initialBest;
      scene.muted = (localStorage.getItem(MUTE_KEY) === '1');
      scene.masterVolume = Math.max(0, Math.min(1, Number(localStorage.getItem(VOL_KEY) ?? '0.8')));
      scene.applyPreset(initialPreset);
      scene.bestText && scene.bestText.setText(`Best: ${scene.bestScore||0}`);
    })();
    return () => { destroyed = true; try { gameRef.current?.destroy(true); } catch {} };
  }, []);

  const start = () => {
    const game = gameRef.current; if (!game) return;
    const scene = game.scene.getScene('FlappyScene');
    scene.physics.world.isPaused = false; scene.startGame();
    setReady(false); setPaused(false); setScore(0);
  };
  const changePreset = (p) => {
    setPreset(p);
    try { localStorage.setItem(PRESET_KEY, p); } catch {}
    const game = gameRef.current; if (game) {
      const scene = game.scene.getScene('FlappyScene');
      scene.applyPreset(p);
    }
    try {
      const b = Number(localStorage.getItem(BEST_KEY(p))) || 0;
      setBest(b);
    } catch { setBest(0); }
  };
  const changeVolume = (val) => {
    const v = Math.max(0, Math.min(1, val));
    setVolume(v);
    try { localStorage.setItem(VOL_KEY, String(v)); } catch {}
    const game = gameRef.current; if (!game) return;
    const scene = game.scene.getScene('FlappyScene');
    scene.masterVolume = v;
    scene.updateWhooshGain?.();
  };
  const resetVolume = () => {
    changeVolume(0.8);
    setUiSpin((s) => ({ ...s, vol: true }));
    setTimeout(() => setUiSpin((s) => ({ ...s, vol: false })), 350);
  };
  const changeFramePct = (pct) => {
    const p = Math.max(40, Math.min(100, Math.round(pct)));
    setFramePct(p);
    try { localStorage.setItem(FRAME_KEY, String(p)); } catch {}
    // Give layout a tick, then refresh Phaser scale
    setTimeout(() => {
      const game = gameRef.current; if (!game) return;
      try { game.scale?.refresh(); } catch {}
    }, 0);
  };
  const resetFrame = () => {
    changeFramePct(70);
    setUiSpin((s) => ({ ...s, frame: true }));
    setTimeout(() => setUiSpin((s) => ({ ...s, frame: false })), 350);
  };
  const togglePause = () => {
    const game = gameRef.current; if (!game) return;
    const scene = game.scene.getScene('FlappyScene');
    scene.togglePause();
  };
  const toggleMute = () => {
    const game = gameRef.current; if (!game) return;
    const scene = game.scene.getScene('FlappyScene');
    scene.toggleMute();
  };

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-300 flex items-center gap-2">
          Difficulty
          <select className="bg-black/30 border border-white/20 rounded px-2 py-1 text-sm" value={preset}
            onChange={(e) => changePreset(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <button className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15" onClick={start}>Start</button>
        <button className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15" onClick={togglePause} disabled={ready} title="Pause/Resume (P)">{paused ? 'Resume' : 'Pause'}</button>
        <button className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15" onClick={toggleMute} title="Mute/Unmute (M)">{muted ? 'Unmute' : 'Mute'}</button>
        <div className="text-sm text-gray-300 flex items-center gap-3">
          <span>Score: <span className="text-white">{score}</span></span>
          <span>Best: <span className="text-white">{best}</span></span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-300">
          <span>Vol</span>
          <button className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-[11px] text-gray-200 hover:bg-white/15 active:scale-95 transition" onClick={() => changeVolume(Math.max(0, +(volume - 0.05).toFixed(2)))} title="Softer">−</button>
          <input type="range" min={0} max={100} value={Math.round(volume*100)}
            onChange={(e) => changeVolume(Number(e.target.value)/100)}
            className="w-28 accent-white/80" />
          <button className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-[11px] text-gray-200 hover:bg-white/15 active:scale-95 transition" onClick={() => changeVolume(Math.min(1, +(volume + 0.05).toFixed(2)))} title="Louder">+</button>
          <button className={`h-7 w-7 inline-grid place-items-center rounded-full bg-white/10 border border-white/20 text-gray-200 hover:bg-white/15 active:scale-95 transition ${uiSpin.vol ? 'rotate-180' : ''}`} onClick={resetVolume} title="Reset volume" aria-label="Reset volume">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
              <path d="M21 12a9 9 0 1 1-3.43-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 5v6h-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30 p-2" style={{ height: `min(${framePct}vh, 900px)` }}>
        <div ref={containerRef} className="w-full h-full" />
        {ready && (
          <div className="absolute inset-2 flex items-center justify-center">
            <div className="pointer-events-none rounded-xl border border-white/10 bg-black/50 backdrop-blur p-4 text-center">
              <div className="text-white font-semibold">Tap or press Space to start</div>
              <div className="text-gray-300 text-xs mt-1">Desktop: Space/Up to flap, P to pause, M to mute</div>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-300">
        <span>Frame height</span>
        <button className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-[11px] text-gray-200 hover:bg-white/15 active:scale-95 transition" onClick={() => changeFramePct(framePct - 5)} title="Shorter">−</button>
        <input type="range" min={40} max={100} value={framePct}
          onChange={(e) => changeFramePct(Number(e.target.value))}
          className="w-56 accent-white/80" />
        <button className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-[11px] text-gray-200 hover:bg-white/15 active:scale-95 transition" onClick={() => changeFramePct(framePct + 5)} title="Taller">+</button>
        <span className="text-gray-400 w-16 text-center tabular-nums">{framePct}% vh</span>
        <button className={`h-7 w-7 inline-grid place-items-center rounded-full bg-white/10 border border-white/20 text-gray-200 hover:bg-white/15 active:scale-95 transition ${uiSpin.frame ? 'rotate-180' : ''}`} onClick={resetFrame} title="Reset frame" aria-label="Reset frame">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
            <path d="M21 12a9 9 0 1 1-3.43-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 5v6h-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
