'use client';

import { Button } from '@/components/ui/button';
import { FileText, X } from 'lucide-react';
import type { ScriptListItem } from './script-types';

type ScriptFullModalProps = {
  isOpen: boolean;
  script: ScriptListItem | null;
  onClose: () => void;
};

function getDisplayTitle(script: ScriptListItem | null) {
  const title = script?.title?.trim();
  if (title) return title;

  const fallback = String(script?.script ?? '')
    .split(/[\n.]/)
    .map((part) => part.trim())
    .find(Boolean);

  return fallback ? fallback.slice(0, 80) : 'Untitled script';
}

function getWordCount(scriptText: string) {
  return scriptText.trim().split(/\s+/).filter(Boolean).length;
}

export function ScriptFullModal({
  isOpen,
  script,
  onClose,
}: ScriptFullModalProps) {
  if (!isOpen || !script) return null;

  const normalizedScript = script.script.trim();
  const wordCount = getWordCount(normalizedScript);
  const characterCount = normalizedScript.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-screen items-center justify-center p-4 lg:p-6">
        <div
          className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.85)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-slate-200/80 bg-white/95 px-5 py-4 lg:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                  <FileText className="h-3.5 w-3.5" />
                  Full Script
                </div>

                <div>
                  <h2 className="truncate text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">
                    {getDisplayTitle(script)}
                  </h2>
                  <p className="mt-1 text-sm leading-7 text-slate-500">
                    Read the entire saved script without the card preview truncation.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    {wordCount} words
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    {characterCount} characters
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="cursor-pointer rounded-2xl border-slate-200 bg-white"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 lg:px-6 lg:py-6">
            <article className="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.18)] lg:p-6">
              <p className="wrap-break-word whitespace-pre-wrap text-sm leading-8 text-slate-800 lg:text-base">
                {script.script}
              </p>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}