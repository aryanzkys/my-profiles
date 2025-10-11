import React, { forwardRef, memo } from 'react';

const Pill = ({ label }) => (
  <span className="inline-flex items-center rounded-full bg-slate-900 text-white text-[10px] font-medium px-3 py-1 mr-2 mb-2">
    {label}
  </span>
);

const TemplateModern = forwardRef(({ profile }, ref) => {
  const basics = profile?.basics ?? {};
  const location = basics.location ? `${basics.location.city}, ${basics.location.country}` : '';

  return (
    <div ref={ref} className="w-[210mm] min-h-[297mm] bg-slate-950 text-slate-50 mx-auto shadow-2xl print:shadow-none">
      <div className="grid grid-cols-[220px_1fr] divide-x divide-slate-800 min-h-full">
        <aside className="p-8 bg-slate-900">
          <div className="space-y-6">
            <div>
              <h1 className="text-[24px] font-bold leading-tight">{basics.name || 'Your Name'}</h1>
              <p className="text-[12px] text-slate-300 mt-1">{basics.headline}</p>
            </div>
            <div className="space-y-3 text-[11px] text-slate-300">
              {location && <p>{location}</p>}
              {basics.email && <p>{basics.email}</p>}
              {basics.phone && <p>{basics.phone}</p>}
              {[basics.website, basics.github, basics.linkedin]
                .filter(Boolean)
                .map((link) => (
                  <a key={link} href={link} className="block text-slate-200" target="_blank" rel="noreferrer">
                    {link.replace(/^https?:\/\//, '')}
                  </a>
                ))}
            </div>
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Skills</h2>
              <div className="mt-3 flex flex-wrap">
                {(profile.skills?.technical || []).map((skill) => (
                  <Pill key={skill} label={skill} />
                ))}
                {(profile.skills?.tools || []).map((tool) => (
                  <Pill key={tool} label={tool} />
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Interests</h2>
              <div className="mt-3 flex flex-wrap">
                {(profile.skills?.interests || []).map((interest) => (
                  <Pill key={interest} label={interest} />
                ))}
              </div>
            </div>
          </div>
        </aside>
        <main className="p-10 space-y-10">
          {basics.summary && (
            <section>
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-slate-400">Profile</h2>
              <p className="text-[12px] text-slate-200 mt-3 leading-relaxed">{basics.summary}</p>
            </section>
          )}

          <section>
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-slate-400">Experience</h2>
            <div className="mt-4 space-y-6">
              {(profile.experience || []).map((role, idx) => (
                <div key={`${role.title}-${idx}`} className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
                  <div className="flex flex-wrap gap-2 justify-between text-[12px] font-semibold">
                    <span>{role.title}</span>
                    <span className="text-slate-400">{role.period}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {[role.company, role.location].filter(Boolean).join(' • ')}
                  </div>
                  <ul className="list-disc ml-5 text-[12px] text-slate-200 space-y-1 mt-3">
                    {(role.achievements || []).map((point, i) => (
                      <li key={`${role.title}-${i}`}>{point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-slate-400">Education</h2>
            <div className="mt-4 space-y-4">
              {(profile.education || []).map((ed, idx) => (
                <div key={`${ed.institution}-${idx}`} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-semibold">{ed.institution}</p>
                    {ed.degree && (
                      <p className="text-[11px] text-slate-300">{ed.degree}</p>
                    )}
                    <ul className="list-disc ml-5 text-[12px] text-slate-200 space-y-1 mt-2">
                      {(ed.highlights || []).map((point, i) => (
                        <li key={`${ed.institution}-${i}`}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{ed.period}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-slate-400">Projects</h2>
            <div className="mt-4 grid grid-cols-1 gap-4">
              {(profile.projects || []).map((project) => (
                <div key={project.name} className="border border-slate-800 rounded-lg p-4">
                  <div className="flex justify-between text-[12px] font-semibold">
                    <span>{project.name}</span>
                    {project.link && (
                      <a href={project.link} target="_blank" rel="noreferrer" className="text-cyan-400">
                        {project.link.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                  <p className="text-[12px] text-slate-200 mt-2">{project.description}</p>
                </div>
              ))}
            </div>
          </section>

          {(profile.awards || []).length > 0 && (
            <section>
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-slate-400">Recognition</h2>
              <div className="mt-4 space-y-3">
                {(profile.awards || []).map((award, idx) => (
                  <div key={`${award.title}-${idx}`} className="flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-semibold">{award.title}</p>
                      <p className="text-[11px] text-slate-300">{award.details}</p>
                    </div>
                    <span className="text-[11px] text-slate-400">{[award.issuer, award.year].filter(Boolean).join(' • ')}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
});

TemplateModern.displayName = 'TemplateModern';

export default memo(TemplateModern);
