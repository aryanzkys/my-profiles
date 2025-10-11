import React, { forwardRef, memo } from 'react';

const TemplateMinimal = forwardRef(({ profile }, ref) => {
  const basics = profile?.basics ?? {};
  const location = basics.location ? `${basics.location.city}, ${basics.location.country}` : '';

  return (
    <div ref={ref} className="bg-white text-slate-900 w-[210mm] min-h-[297mm] mx-auto print:shadow-none">
      <div className="p-12">
        <header className="mb-10">
          <h1 className="text-[32px] font-light tracking-tight">{basics.name || 'Your Name'}</h1>
          <p className="text-[14px] text-slate-500 mt-2">{basics.headline}</p>
          <div className="text-[11px] text-slate-500 mt-3 space-y-1">
            <p>{[location, basics.email, basics.phone].filter(Boolean).join(' • ')}</p>
            {[basics.website, basics.github, basics.linkedin]
              .filter(Boolean)
              .map((link) => (
                <p key={link}>{link}</p>
              ))}
          </div>
        </header>

        <main className="space-y-10">
          {basics.summary && (
            <section>
              <h2 className="text-[12px] uppercase tracking-[0.4em] text-slate-400 mb-4">Profile</h2>
              <p className="text-[13px] leading-relaxed text-slate-700 max-w-[80ch]">{basics.summary}</p>
            </section>
          )}

          <section className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-10">
            <div className="space-y-6">
              <div>
                <h2 className="text-[12px] uppercase tracking-[0.4em] text-slate-400 mb-4">Experience</h2>
                <div className="space-y-6">
                  {(profile.experience || []).map((role, idx) => (
                    <article key={`${role.title}-${idx}`}>
                      <div className="flex flex-wrap justify-between items-baseline gap-2">
                        <div>
                          <h3 className="text-[14px] font-semibold">{role.title}</h3>
                          <p className="text-[12px] text-slate-500">{[role.company, role.location].filter(Boolean).join(' • ')}</p>
                        </div>
                        <span className="text-[11px] text-slate-400">{role.period}</span>
                      </div>
                      <ul className="text-[12px] text-slate-600 space-y-1 mt-3 list-disc ml-5">
                        {(role.achievements || []).map((point, i) => (
                          <li key={`${role.title}-${i}`}>{point}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-[12px] uppercase tracking-[0.4em] text-slate-400 mb-4">Projects</h2>
                <div className="space-y-4">
                  {(profile.projects || []).map((project) => (
                    <article key={project.name}>
                      <h3 className="text-[13px] font-semibold text-slate-700">{project.name}</h3>
                      <p className="text-[12px] text-slate-600 mt-1">{project.description}</p>
                      {project.link && (
                        <a href={project.link} className="text-[11px] text-slate-400 mt-1 inline-block" target="_blank" rel="noreferrer">
                          {project.link}
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-8">
              <div>
                <h2 className="text-[12px] uppercase tracking-[0.4em] text-slate-400 mb-4">Education</h2>
                <div className="space-y-4">
                  {(profile.education || []).map((ed, idx) => (
                    <article key={`${ed.institution}-${idx}`}>
                      <h3 className="text-[13px] font-semibold text-slate-700">{ed.institution}</h3>
                      {ed.degree && <p className="text-[12px] text-slate-500">{ed.degree}</p>}
                      {ed.location && <p className="text-[11px] text-slate-400">{ed.location}</p>}
                      <p className="text-[11px] text-slate-400 mt-1">{ed.period}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-[12px] uppercase tracking-[0.4em] text-slate-400 mb-4">Skills</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Technical</p>
                    <p className="text-[12px] text-slate-600">{(profile.skills?.technical || []).join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tools</p>
                    <p className="text-[12px] text-slate-600">{(profile.skills?.tools || []).join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Interests</p>
                    <p className="text-[12px] text-slate-600">{(profile.skills?.interests || []).join(', ')}</p>
                  </div>
                </div>
              </div>

              {(profile.awards || []).length > 0 && (
                <div>
                  <h2 className="text-[12px] uppercase tracking-[0.4em] text-slate-400 mb-4">Recognition</h2>
                  <div className="space-y-3">
                    {(profile.awards || []).map((award, idx) => (
                      <article key={`${award.title}-${idx}`}>
                        <h3 className="text-[13px] font-semibold text-slate-700">{award.title}</h3>
                        <p className="text-[11px] text-slate-500">{[award.issuer, award.year].filter(Boolean).join(' • ')}</p>
                        {award.details && <p className="text-[12px] text-slate-600 mt-1">{award.details}</p>}
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
});

TemplateMinimal.displayName = 'TemplateMinimal';

export default memo(TemplateMinimal);
