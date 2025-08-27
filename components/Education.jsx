import { motion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import defaultEducation from '../data/education.json';

const fallbackTimeline = defaultEducation;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.28 } }),
};

export default function Education() {
  const [timeline, setTimeline] = useState(fallbackTimeline);
  const scrollRef = useRef(null);
  const listRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: listRef, container: scrollRef, offset: ['start 0.9', 'end 0.1'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  const [activeIdx, setActiveIdx] = useState(0);
  const [cursorY, setCursorY] = useState(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !listRef.current) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      const cRect = container.getBoundingClientRect();
      const centerY = cursorY ?? (cRect.top + cRect.bottom) / 2;
      const nodes = Array.from(listRef.current.querySelectorAll('li'));
      if (!nodes.length) return;
      let min = Infinity;
      let idx = 0;
      nodes.forEach((node, i) => {
        const r = node.getBoundingClientRect();
        const nCenter = (r.top + r.bottom) / 2;
        const d = Math.abs(nCenter - centerY);
        if (d < min) {
          min = d;
          idx = i;
        }
      });
      setActiveIdx(idx);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    const onMouseMove = (e) => {
      setCursorY(e.clientY);
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    const onMouseLeave = () => {
      setCursorY(null);
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    const onResize = onScroll;
    update();
    container.addEventListener('scroll', onScroll);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', onResize);
    return () => {
      container.removeEventListener('scroll', onScroll);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', onResize);
    };
  }, [cursorY]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const candidates = Array.from(new Set([
        '/.netlify/functions/get-education',
        `${basePath}/.netlify/functions/get-education`,
      ]));
      for (const url of candidates) {
        try {
          const res = await fetch(url, { headers: { accept: 'application/json' } });
          if (!res.ok) continue;
          const json = await res.json();
          if (!cancelled && Array.isArray(json) && json.length) {
            setTimeline(json);
            break;
          }
        } catch (_) {}
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-3xl"
    >
      <h2 className="text-2xl md:text-3xl font-semibold text-cyan-300 mb-4 tracking-wide">Education</h2>

      <div ref={scrollRef} className="pointer-events-auto bg-black/35 border border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-md max-h-[65vh] overflow-y-auto">
        <ol ref={listRef} className="relative ml-4 border-l-2 border-cyan-500/20">
          {/* Active progress line */}
          <motion.span
            aria-hidden="true"
            className="absolute -left-[1px] top-0 w-[2px] origin-top bg-gradient-to-b from-cyan-300 to-fuchsia-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]"
            style={{ height: '100%', scaleY: progress }}
          />
          {timeline.map((item, idx) => (
            <motion.li
              key={`${item.title}-${item.period}`}
              custom={idx}
              variants={itemVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-20% 0px -20% 0px' }}
              className="relative mb-5 ml-4 group"
            >
              {/* Timeline dot with interactive ring */}
              <span
                className={
                  'absolute -left-3.5 top-2.5 h-5 w-5 rounded-full border transition-colors ' +
                  (idx === activeIdx
                    ? 'border-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.6)]'
                    : 'border-cyan-400/30 group-hover:border-cyan-300/60')
                }
                aria-hidden="true"
              />
              <span
                className={
                  'absolute -left-2.5 top-3 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] transform transition-transform ' +
                  (idx === activeIdx ? 'scale-125 bg-cyan-300' : 'group-hover:scale-110')
                }
                aria-hidden="true"
              />
              <motion.div
                whileHover={{ y: -2, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={
                  'bg-white/5 border rounded-lg p-4 text-gray-100 shadow-md ' +
                  (idx === activeIdx ? 'border-cyan-400/40 ring-1 ring-cyan-400/20' : 'border-white/10')
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      {item.title === 'Brawijaya University' ? (
                        <img
                          src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Logo_Universitas_Brawijaya.svg/2036px-Logo_Universitas_Brawijaya.svg.png"
                          alt="Brawijaya University logo"
                          className="w-5 h-5 object-contain"
                          loading="lazy"
                        />
                      ) : null}
                      {item.title === 'SMA Negeri 1 Singosari' ? (
                        <img
                          src="https://ngts.seameo-recfon.org/wp-content/uploads/2019/09/Logo-SMANESI-215x300.png"
                          alt="SMA Negeri 1 Singosari logo"
                          className="w-5 h-5 object-contain"
                          loading="lazy"
                        />
                      ) : null}
                      <span>{item.title}</span>
                    </h3>
                    {item.subtitle ? (
                      <p className="text-gray-300 text-sm mt-0.5">{item.subtitle}</p>
                    ) : null}
                  </div>
                  <span className="text-gray-400 text-sm whitespace-nowrap">{item.period}</span>
                </div>
              </motion.div>
            </motion.li>
          ))}
        </ol>
      </div>
    </motion.div>
  );
}
