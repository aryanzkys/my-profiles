"use client";
import { useEffect, useRef } from 'react';

export default function ParticleField({ className = '' }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = 0, height = 0;
    let particles = [];
    let running = true;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;
    const targetCount = prefersReduced ? 0 : Math.min(60, Math.max(16, Math.floor((window.innerWidth * window.innerHeight) / (isMobile ? 120000 : 160000))));

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };
    const rand = (a, b) => a + Math.random() * (b - a);

    const init = () => {
      resize();
      particles = new Array(targetCount).fill(0).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: rand(-0.05, 0.05) * (isMobile ? 0.7 : 1),
        vy: rand(-0.05, 0.05) * (isMobile ? 0.7 : 1),
        r: rand(0.6, 1.2) * (isMobile ? 0.9 : 1),
        a: rand(0.18, 0.35),
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10; else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10; else if (p.y > height + 10) p.y = -10;
        ctx.beginPath();
        ctx.fillStyle = `rgba(168, 231, 255, ${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const loop = () => {
      if (!running) return;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    const onResize = () => { resize(); };

    init();
    loop();
    window.addEventListener('resize', onResize);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 opacity-[0.25] ${className}`}
      aria-hidden="true"
    />
  );
}
