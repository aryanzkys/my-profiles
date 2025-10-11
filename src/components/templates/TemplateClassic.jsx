import React, { forwardRef, memo } from 'react';

const SectionHeading = ({ children }) => (
  <h3 className="text-[12px] font-semibold tracking-[0.2em] uppercase text-neutral-700 mb-2 border-b border-neutral-200 pb-1">
    {children}
  </h3>
);

const TemplateClassic = forwardRef(({ profile }, ref) => {
  const basics = profile?.basics ?? {};
  const location = basics.location ? `${basics.location.city}, ${basics.location.country}` : '';

  return (
    <div ref={ref} className="bg-white text-neutral-900 w-[210mm] min-h-[297mm] mx-auto shadow-xl print:shadow-none">
      <div className="p-10">
        <header className="text-center mb-8">
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">
            {basics.name || 'Your Name'}
          </h1>
          <p className="text-[12px] text-neutral-600 mt-2">
            {[basics.headline, location, basics.email, basics.phone]
              .filter(Boolean)
              .join(' • ')}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">
            {[basics.website, basics.github, basics.linkedin]
              .filter(Boolean)
              .map((link) => link.replace(/^https?:\/\//, ''))
              .join(' • ')}
          </p>
        </header>

        {basics.summary && (
          <section className="mb-6">
            <SectionHeading>Profile</SectionHeading>
            <p className="text-[12px] leading-relaxed text-neutral-700">
              {basics.summary}
            </p>
          </section>
        )}

        <section className="mb-6">
          <SectionHeading>Experience</SectionHeading>
          <div className="space-y-4">
            {(profile.experience || []).map((role, idx) => (
              <div key={`${role.title}-${idx}`}>
                <div className="flex justify-between text-[12px] font-semibold text-neutral-800">
                  <span>{role.title}{role.company ? ` — ${role.company}` : ''}</span>
                  <span className="text-neutral-500">{role.period}</span>
                </div>
                <div className="text-[11px] text-neutral-600 mb-1">
                  {[role.location].filter(Boolean).join(' • ')}
                </div>
                <ul className="list-disc ml-5 text-[12px] text-neutral-700 space-y-1">
                  {(role.achievements || []).map((point, i) => (
                    <li key={`${role.title}-${i}`}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <SectionHeading>Education</SectionHeading>
          <div className="space-y-4">
            {(profile.education || []).map((ed, idx) => (
              <div key={`${ed.institution}-${idx}`}>
                <div className="flex justify-between text-[12px] font-semibold text-neutral-800">
                  <span>{ed.institution}{ed.degree ? ` — ${ed.degree}` : ''}</span>
                  <span className="text-neutral-500">{ed.period}</span>
                </div>
                <div className="text-[11px] text-neutral-600">
                  {[ed.location].filter(Boolean).join(' • ')}
                </div>
                <ul className="list-disc ml-5 text-[12px] text-neutral-700 space-y-1 mt-1">
                  {(ed.highlights || []).map((point, i) => (
                    <li key={`${ed.institution}-${i}`}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <SectionHeading>Projects</SectionHeading>
          <div className="space-y-2">
            {(profile.projects || []).map((project) => (
              <div key={project.name}>
                <div className="flex justify-between text-[12px] font-semibold text-neutral-800">
                  <span>{project.name}</span>
                  {project.link && (
                    <a
                      href={project.link}
                      className="text-blue-600 font-medium"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {project.link.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
                <p className="text-[12px] text-neutral-700 mt-1">{project.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-6">
          <div>
            <SectionHeading>Skills</SectionHeading>
            <div className="space-y-2">
              <div>
                <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Technical</p>
                <p className="text-[12px] text-neutral-700">{(profile.skills?.technical || []).join(' • ')}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Tools</p>
                <p className="text-[12px] text-neutral-700">{(profile.skills?.tools || []).join(' • ')}</p>
              </div>
            </div>
          </div>
          <div>
            <SectionHeading>Awards</SectionHeading>
            <div className="space-y-3">
              {(profile.awards || []).map((award, idx) => (
                <div key={`${award.title}-${idx}`}>
                  <p className="text-[12px] font-semibold text-neutral-800">{award.title}</p>
                  <p className="text-[11px] text-neutral-600">
                    {[award.issuer, award.year].filter(Boolean).join(' • ')}
                  </p>
                  {award.details && (
                    <p className="text-[12px] text-neutral-700 mt-1">{award.details}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
});

TemplateClassic.displayName = 'TemplateClassic';

export default memo(TemplateClassic);
