import { notFound, redirect } from 'next/navigation';
import {
  ArrowUpRight,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { auth } from '@/auth';
import {
  normalizeSocialAccountProvider,
  socialAccountSectionMap,
} from '../../social-accounts-data';

type SocialAccountGuidePageProps = {
  params: Promise<{
    provider: string;
  }>;
};

export default async function SocialAccountGuidePage({
  params,
}: SocialAccountGuidePageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const resolvedParams = await params;
  const provider = normalizeSocialAccountProvider(resolvedParams.provider);

  if (!provider) {
    notFound();
  }

  const section = socialAccountSectionMap[provider];
  const SectionIcon = section.icon;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.4)] print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none lg:p-8">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-linear-to-br text-white ${section.accentClassName}`}>
                <SectionIcon className="h-6 w-6" />
              </div>
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${section.badgeClassName}`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Printable Setup Guide
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                  {section.label} account setup guide
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  {section.description}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600 print:hidden">
              Use your browser print dialog and choose Save as PDF to export this guide.
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <KeyRound className="h-4 w-4" />
              Required Keys
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {section.requiredKeys.map((key) => (
                <span
                  key={key}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${section.badgeClassName}`}
                >
                  {key}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <ArrowUpRight className="h-4 w-4" />
              Critical Notes
            </div>
            <div className="mt-4 space-y-3">
              {section.setupNotes.map((note) => (
                <div key={note.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {note.label}
                  </p>
                  <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                    {note.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            Step By Step
          </div>
          <div className="mt-5 space-y-4">
            {section.guideSteps.map((step, index) => (
              <div key={step.title} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${section.badgeClassName}`}>
                    {index + 1}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">{step.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{step.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Implementation Direction
          </h2>
          <div className="mt-4 space-y-3">
            {section.implementationNotes.map((note) => (
              <div key={note} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-600">
                {note}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}