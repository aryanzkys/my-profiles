import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function About() {
  const cardRef = useRef(null);
  const mvX = useMotionValue(0.5);
  const mvY = useMotionValue(0.5);
  const sx = useSpring(mvX, { stiffness: 120, damping: 20, mass: 0.2 });
  const sy = useSpring(mvY, { stiffness: 120, damping: 20, mass: 0.2 });
  const rotateY = useTransform(sx, [0, 1], [-8, 8]);
  const rotateX = useTransform(sy, [0, 1], [8, -8]);
  const [glow, setGlow] = useState({ x: '50%', y: '50%' });

  const onMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    mvX.set(nx);
    mvY.set(ny);
    setGlow({ x: `${(nx * 100).toFixed(1)}%`, y: `${(ny * 100).toFixed(1)}%` });
  };

  const onLeave = () => {
    mvX.set(0.5);
    mvY.set(0.5);
    setGlow({ x: '50%', y: '50%' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-3xl text-center md:text-left"
    >
      <h2 className="text-2xl md:text-3xl font-semibold text-cyan-300 mb-4 tracking-wide">
        About Me
      </h2>

      {/* Interactive Futuristic Frame */}
      <motion.div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative group"
      >
        {/* Outer neon glow following cursor */}
        <div
          className="pointer-events-none absolute -inset-4 rounded-3xl opacity-0 group-hover:opacity-100 transition duration-300 blur-2xl"
          style={{
            background: `radial-gradient(220px circle at ${glow.x} ${glow.y}, rgba(34,211,238,0.25), transparent 60%)`,
          }}
        />

        {/* Gradient border shell */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-cyan-500/40">
          {/* Inner card */}
          <div className="relative rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md px-6 py-6 md:px-8 md:py-8 overflow-hidden">
            {/* Light sweep following cursor */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background: `radial-gradient(600px circle at ${glow.x} ${glow.y}, rgba(34,211,238,0.12), transparent 40%)`,
                mixBlendMode: 'screen',
              }}
            />

            {/* Content */}
            <p className="text-gray-200 leading-relaxed relative z-10">
              Hello! My name is <span className="text-white font-medium">Aryan Zaky Prayogo</span>, an aspiring <span className="text-white font-medium">DevSecOps Engineer</span> majoring in <span className="text-white font-medium">Computer Science</span> at <span className="text-white font-medium">Brawijaya University</span>. I’m deeply passionate about cybersecurity, software development, and the intersection between technology and ethical leadership.
            </p>
            <p className="text-gray-200 leading-relaxed mt-4 relative z-10">
              Over the past few years I have earned more than 20 national and international awards across diverse fields including science, languages, research, and entrepreneurship. I am also actively involved in various youth organizations and academic communities that focus on education, innovation, and sustainable development.
            </p>
            <p className="text-gray-200 leading-relaxed mt-4 relative z-10">
              I believe in continuous learning, meaningful collaboration, and using technology as a force for good. This website is my digital portfolio, a place where you can explore my journey, achievements, and future projects.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
