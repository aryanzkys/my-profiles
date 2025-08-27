import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

const organizations = [
  { org: 'ASEAN Youth Organization (AYO)', role: 'Active Member', period: '2023 — Present' },
  { org: 'Loss and Damage Youth Coalition (LDYC)', role: 'Active Member', period: '2024 — Present' },
  { org: 'The SDG7 Youth Constituency', role: 'Active Member', period: '2023 — Present' },
  { org: 'Youth Rangers Indonesia (YRI)', role: 'Active Member', period: '2023 — Present' },
  { org: 'SMANESI Olympiad Club (SOC)', role: 'Chairman', period: '2023 — 2024' },
  { org: 'Desamind Chapter Malang', role: 'Secretary', period: '2023 — 2024' },
  { org: 'English Club SMAN 1 Singosari', role: 'Secretary', period: '2023 — 2024' },
  { org: 'Biology Science Club (BSC)', role: 'Member', period: '2023 — 2024' },
  { org: 'Nutrition Goes To School (NGTS)', role: 'Student Ambassador', period: '2023 — 2024' },
  { org: 'BDI SMAN 1 Singosari', role: 'Coordinator', period: '2022 — 2024' },
  { org: 'Polisi Siswa', role: 'Discipline Division', period: '2022 — 2024' },
  { org: 'OSIS SMPN 5 Mojokerto', role: 'Member', period: '2020 — 2021' },
  { org: 'Red Cross Youth (PMR)', role: 'Member', period: '2020 — 2021' },
  { org: 'Robotics Club', role: 'Member', period: '2021 — 2022' },
];

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: (i) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.035, duration: 0.25 } }),
};

export default function Organizations() {
  const [filter, setFilter] = useState('all'); // all | active | past
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return organizations.filter((item) => {
      const isCurrent = /present/i.test(item.period);
      if (filter === 'active' && !isCurrent) return false;
      if (filter === 'past' && isCurrent) return false;
      if (!q) return true;
      const hay = `${item.org} ${item.role} ${item.period}`.toLowerCase();
      return hay.includes(q);
    });
  }, [filter, query]);

  const FilterButton = ({ id, label }) => (
    <button
      onClick={() => setFilter(id)}
      className={
        'px-3 py-1.5 rounded-md text-sm transition-colors border ' +
        (filter === id
          ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30'
          : 'text-gray-300 hover:text-white hover:bg-white/10 border-white/10')
      }
    >
      {label}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-5xl"
    >
      <h2 className="text-2xl md:text-3xl font-semibold text-cyan-300 mb-4 tracking-wide">Organizations</h2>

      {/* Toolbar: Filters + Search */}
      <div className="pointer-events-auto mb-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-2 py-2 flex gap-2 w-fit">
          <FilterButton id="all" label="All" />
          <FilterButton id="active" label="Active" />
          <FilterButton id="past" label="Past" />
        </div>
        <div className="relative flex-1 min-w-[240px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search organizations, role, or year..."
            className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {list.length}
          </span>
        </div>
      </div>

      {/* Scroll container */}
      <div className="bg-black/35 border border-white/10 rounded-2xl p-3 md:p-4 backdrop-blur-md max-h-[65vh] overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((item, idx) => {
            const isCurrent = /present/i.test(item.period);
            return (
              <motion.article
                key={`${item.org}-${item.period}`}
                custom={idx}
                variants={itemVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-20% 0px -20% 0px' }}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className={
                  'relative rounded-xl p-4 backdrop-blur-sm shadow-md border ' +
                  (isCurrent
                    ? 'bg-cyan-400/5 border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                    : 'bg-white/5 border-white/10')
                }
              >
                {isCurrent && (
                  <span className="absolute right-3 top-3 text-[10px] uppercase tracking-wide text-cyan-200 bg-cyan-500/10 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
                <div className="flex items-start justify-between gap-3 pr-20">
                  <h3 className="text-white font-semibold leading-snug">{item.org}</h3>
                  <span className="text-gray-400 text-xs whitespace-nowrap">{item.period}</span>
                </div>
                <p className="text-gray-300 text-sm mt-2">{item.role}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
