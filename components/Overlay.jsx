import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import About from './About';
import Achievements from './Achievements';
import Education from './Education';
import Organizations from './Organizations';
import Contact from './Contact';

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

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top Navigation */}
      <div className="w-full flex justify-center md:justify-end p-4">
        <div className="pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar max-w-full">
          <NavButton label="Home" active={section === 'home'} onClick={() => setSection('home')} />
          <NavButton label="About Me" active={section === 'about'} onClick={() => setSection('about')} />
          <NavButton label="Achievements" active={section === 'achievements'} onClick={() => setSection('achievements')} />
          <NavButton label="Education" active={section === 'education'} onClick={() => setSection('education')} />
          <NavButton label="Organizations" active={section === 'organizations'} onClick={() => setSection('organizations')} />
          <NavButton label="Contact" active={section === 'contact'} onClick={() => setSection('contact')} />
        </div>
      </div>

      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
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
              <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-[0_4px_20px_rgba(0,255,255,0.35)]">
                Hi, I'm Aryan – Computer Science Student
              </h1>
              <p className="text-cyan-200 mt-3 opacity-90">Aspiring DevSecOps Engineer</p>
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
  );
}
