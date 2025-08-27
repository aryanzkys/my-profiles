import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import About from './About';
import Achievements from './Achievements';
import Education from './Education';
import Organizations from './Organizations';
import Contact from './Contact';
import { usePerformance } from './PerformanceContext';
import MiniChess from './MiniChess';

const NavButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={
      'px-3 py-1.5 rounded-md text-sm transition-colors ' +
      (active
        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
        : 'text-gray-300 hover:text-white hover:bg-white/10 border border-white/10')
    }
  >
    {label}
  </button>
);

export default function Overlay() {
  const [section, setSection] = useState('home');
  const { mode, setMode, isLite } = usePerformance();
  const [perfOpen, setPerfOpen] = useState(false);
  const [miniOpen, setMiniOpen] = useState(false);
  // Mini games modal state

  return (
    <>
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top Navigation */}
      <div className="w-full flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center md:justify-end p-4 relative z-20">
        <div className="pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-2 py-2 flex gap-2 overflow-x-auto no-scrollbar max-w-full">
          <NavButton label="Home" active={section === 'home'} onClick={() => setSection('home')} />
          <NavButton label="About Me" active={section === 'about'} onClick={() => setSection('about')} />
          <NavButton label="Achievements" active={section === 'achievements'} onClick={() => setSection('achievements')} />
          <NavButton label="Education" active={section === 'education'} onClick={() => setSection('education')} />
          <NavButton label="Organizations" active={section === 'organizations'} onClick={() => setSection('organizations')} />
          <NavButton label="Contact" active={section === 'contact'} onClick={() => setSection('contact')} />
        </div>
        {/* Inline performance select for large screens only */}
        <div className="hidden lg:flex pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-2 py-2 gap-2 items-center">
          <span className="text-xs text-gray-300 hidden sm:inline">Performance</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-md text-sm text-gray-200 px-2 py-1 outline-none"
          >
            <option value="auto">Auto {isLite ? '(Lite)' : '(High)'}</option>
            <option value="lite">Lite</option>
            <option value="high">High</option>
          </select>
        </div>
        {/* Mini Games button only on Home */}
        {section === 'home' && (
          <button
            onClick={() => setMiniOpen(true)}
            className="pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-sm text-cyan-200 hover:text-white hover:bg-white/10"
            aria-label="Open mini games"
          >
            Mini Games
          </button>
        )}
        {/* Mobile/Tablet performance button opens popup */}
        <button
          onClick={() => setPerfOpen(true)}
          className="lg:hidden pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
          aria-label="Open performance settings"
        >
          Performance
        </button>
      </div>

      {/* Center Content */}
  <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6 z-10 pointer-events-none">
        <AnimatePresence mode="wait">
          {section === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
      className="pointer-events-none text-center"
            >
              <h1 className="text-white text-2xl sm:text-3xl md:text-5xl font-bold drop-shadow-[0_4px_20px_rgba(0,255,255,0.35)]">
                Hi, I'm Aryan – Computer Science Student
              </h1>
              <p className="text-cyan-200 mt-2 sm:mt-3 opacity-90 text-sm sm:text-base">Aspiring DevSecOps Engineer</p>
            </motion.div>
          )}
          {section === 'about' && (
            <motion.div key="about" className="pointer-events-auto">
              <About />
            </motion.div>
          )}
          {section === 'achievements' && (
            <motion.div key="achievements" className="pointer-events-auto">
              <Achievements />
            </motion.div>
          )}
          {section === 'education' && (
            <motion.div key="education" className="pointer-events-auto">
              <Education />
            </motion.div>
          )}
          {section === 'organizations' && (
            <motion.div key="organizations" className="pointer-events-auto">
              <Organizations />
            </motion.div>
          )}
          {section === 'contact' && (
            <motion.div key="contact" className="pointer-events-auto">
              <Contact />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  </div>
  {/* Performance Modal for mobile/tablet */}
    <AnimatePresence>
      {perfOpen && (
        <motion.div
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPerfOpen(false)} />
          <motion.div
            className="relative z-10 w-full max-w-md bg-neutral-900/95 border border-white/10 rounded-2xl p-5 shadow-2xl"
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <h3 className="text-white text-lg font-semibold mb-2">Performance Mode</h3>
            <p className="text-gray-300 text-sm mb-4">Choose a mode for the best experience on your device.</p>
            <div className="space-y-2">
              {[
                { id: 'auto', label: `Auto ${isLite ? '(Lite)' : '(High)'}`, desc: 'Detects your device and picks the best mode automatically.' },
                { id: 'lite', label: 'Lite', desc: 'Lower motion and effects for smoother performance.' },
                { id: 'high', label: 'High', desc: 'Full effects and motion (best on desktops).' },
              ].map((opt) => (
                <label key={opt.id} className="flex items-start gap-3 p-2 rounded-lg border border-white/10 hover:bg-white/5">
                  <input
                    type="radio"
                    name="perf"
                    value={opt.id}
                    checked={mode === opt.id}
                    onChange={(e) => setMode(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-gray-100 text-sm font-medium">{opt.label}</div>
                    <div className="text-gray-400 text-xs">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setPerfOpen(false)} className="px-3 py-2 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15">Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

  {/* Mini Games Modal (Play vs AI) */}
    <AnimatePresence>
      {miniOpen && (
        <motion.div
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMiniOpen(false)} />
          <motion.div
            className="relative z-10 w-full max-w-5xl bg-neutral-900/95 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl"
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
      <div className="flex items-center justify-between gap-2 mb-3">
              <div>
        <h3 className="text-white text-lg font-semibold leading-tight">Mini Games</h3>
        <p className="text-gray-400 text-xs">Play Chess vs AI — right here</p>
              </div>
              <button
                onClick={() => setMiniOpen(false)}
                className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15"
              >
                Close
              </button>
            </div>
      <MiniChess />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
  );
}
