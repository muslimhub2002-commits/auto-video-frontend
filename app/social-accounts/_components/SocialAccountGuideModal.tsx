'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  KeyRound,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getSocialAccountGuideHref,
  socialAccountSectionMap,
  type SocialAccountProvider,
} from '../social-accounts-data';

type SocialAccountGuideModalProps = {
  provider: SocialAccountProvider | null;
  isOpen: boolean;
  onClose: () => void;
};

export function SocialAccountGuideModal({
  provider,
  isOpen,
  onClose,
}: SocialAccountGuideModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !provider) {
    return null;
  }

  const section = socialAccountSectionMap[provider];
  const SectionIcon = section.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/80 bg-white/95 shadow-[0_36px_90px_-50px_rgba(15,23,42,0.65)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur lg:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-linear-to-br text-white shadow-[0_16px_36px_-24px_rgba(15,23,42,0.55)] ${section.accentClassName}`}>
                <SectionIcon className="h-5 w-5" />
              </div>
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${section.badgeClassName}`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Setup Guide
                </div>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                  {section.label} account setup
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  {section.summary}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close guide"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5 lg:px-6 lg:py-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)]">
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

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                <ArrowUpRight className="h-4 w-4" />
                Print-Friendly View
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Open a clean guide page for this provider and use your browser print dialog to save it as a PDF.
              </p>
              <div className="mt-4">
                <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white">
                  <Link href={getSocialAccountGuideHref(provider)} target="_blank" rel="noreferrer">
                    Open guide page
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              Step By Step
            </div>
            <div className="mt-5 space-y-4">
              {section.guideSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${section.badgeClassName}`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Critical Notes
              </h3>
              
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Implementation Direction
              </h3>
              <div className="mt-4 space-y-3">
                {section.implementationNotes.map((note) => (
                  <div key={note} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-600">
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}