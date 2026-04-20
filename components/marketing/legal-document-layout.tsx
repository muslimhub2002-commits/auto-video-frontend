import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

export type LegalSectionItem = {
  subtitle: string;
  body: string;
};

export type LegalSection = {
  id: string;
  title: string;
  content: LegalSectionItem[];
};

type LegalDocumentLayoutProps = {
  badgeLabel: string;
  title: string;
  intro: string;
  summary: string;
  lastUpdated: string;
  sections: LegalSection[];
  relatedLinks: Array<{ href: string; label: string }>;
  icon: LucideIcon;
};

const stripNumericPrefix = (value: string) => value.replace(/^\d+\.\s*/, '');

export function LegalDocumentLayout({
  badgeLabel,
  title,
  intro,
  summary,
  lastUpdated,
  sections,
  relatedLinks,
  icon: Icon,
}: LegalDocumentLayoutProps) {
  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_90px_-60px_rgba(99,102,241,0.25)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">
            <Icon className="h-4 w-4" />
            {badgeLabel}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                {intro}
              </p>
            </div>
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-5 text-sm text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Last updated
              </p>
              <p className="mt-3 text-lg font-medium text-slate-950">{lastUpdated}</p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 text-sm text-slate-600 backdrop-blur-xl lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Table of contents
              </p>
              <nav className="mt-4 space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <ChevronRight className="h-4 w-4 shrink-0 text-indigo-500" />
                    <span>{stripNumericPrefix(section.title)}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Summary
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-600">{summary}</p>
              </div>
              <div className="rounded-[1.75rem] border border-indigo-100 bg-indigo-50/70 p-5 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Related documents
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {relatedLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <ChevronRight className="h-4 w-4 text-indigo-500" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 backdrop-blur-xl sm:p-7">
                  <h2 className="text-2xl font-semibold text-slate-950">{section.title}</h2>
                  <div className="mt-5 space-y-5">
                    {section.content.map((item, idx) => (
                      <div key={`${section.id}-${idx}`}>
                        {item.subtitle ? (
                          <h3 className="mb-2 text-base font-medium text-slate-900">
                            {item.subtitle}
                          </h3>
                        ) : null}
                        <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
                          {item.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}