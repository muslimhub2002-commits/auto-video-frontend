'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Link2, Loader2, Plus, X } from 'lucide-react';
import type { ScriptListItem } from './script-types';

type ScriptLinksPayload = {
  youtube_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
};

type ScriptLinksModalProps = {
  isOpen: boolean;
  script: ScriptListItem | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: ScriptLinksPayload) => Promise<void>;
};

const editablePlatforms = [
  {
    key: 'youtube_url',
    label: 'YouTube',
    placeholder: 'https://youtube.com/watch?v=...',
    accentClassName: 'border-red-200 bg-red-50 text-red-700',
  },
  {
    key: 'facebook_url',
    label: 'Facebook',
    placeholder: 'https://facebook.com/...',
    accentClassName: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    key: 'tiktok_url',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@.../video/...',
    accentClassName: 'border-slate-200 bg-slate-100 text-slate-700',
  },
] as const;

function getDisplayTitle(script: ScriptListItem | null) {
  const title = script?.title?.trim();
  if (title) return title;

  const fallback = String(script?.script ?? '')
    .split(/[\n.]/)
    .map((part) => part.trim())
    .find(Boolean);

  return fallback ? fallback.slice(0, 80) : 'Untitled script';
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ScriptLinksModal({
  isOpen,
  script,
  isSaving,
  onClose,
  onSave,
}: ScriptLinksModalProps) {
  const [values, setValues] = useState({
    youtube_url: '',
    facebook_url: '',
    tiktok_url: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setValues({
      youtube_url: '',
      facebook_url: '',
      tiktok_url: '',
    });
    setError(null);
  }, [isOpen, script?.id]);

  const missingPlatforms = useMemo(() => {
    return editablePlatforms.filter((platform) => {
      const existingValue = String(script?.[platform.key] ?? '').trim();
      return existingValue.length === 0;
    });
  }, [script]);

  const hasMissingPlatforms = missingPlatforms.length > 0;

  async function handleSubmit() {
    const payload: ScriptLinksPayload = {};

    for (const platform of missingPlatforms) {
      const rawValue = values[platform.key].trim();

      if (!rawValue) continue;
      if (!isValidUrl(rawValue)) {
        setError(`${platform.label} link must be a valid http or https URL.`);
        return;
      }

      payload[platform.key] = rawValue;
    }

    if (Object.keys(payload).length === 0) {
      setError(
        hasMissingPlatforms
          ? 'Add at least one missing link before saving.'
          : 'All requested links are already attached to this script.',
      );
      return;
    }

    setError(null);

    try {
      await onSave(payload);
    } catch (saveError) {
      const message =
        saveError instanceof Error && saveError.message
          ? saveError.message
          : 'Failed to save script links.';
      setError(message);
    }
  }

  if (!isOpen || !script) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.85)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 bg-white/95 px-5 py-4 lg:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                <Link2 className="h-3.5 w-3.5" />
                Add Links
              </div>
              <div>
                <h2 className="truncate text-2xl font-black tracking-tight text-slate-900">
                  {getDisplayTitle(script)}
                </h2>
                <p className="mt-1 text-sm leading-7 text-slate-500">
                  Add the missing published URLs for YouTube, Facebook, and TikTok. Existing links stay untouched in this flow.
                </p>
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

        <div className="space-y-5 px-5 py-5 lg:px-6 lg:py-6">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-4">
            {editablePlatforms.map((platform) => {
              const existingValue = String(script[platform.key] ?? '').trim();
              const isMissing = existingValue.length === 0;

              return (
                <section
                  key={platform.key}
                  className="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${platform.accentClassName}`}>
                        {platform.label}
                      </span>
                      <span className={`text-xs font-semibold ${
                        isMissing ? 'text-slate-500' : 'text-emerald-700'
                      }`}>
                        {isMissing ? 'Missing link' : 'Already linked'}
                      </span>
                    </div>
                  </div>

                  {isMissing ? (
                    <div className="space-y-2">
                      <Input
                        value={values[platform.key]}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setValues((current) => ({
                            ...current,
                            [platform.key]: nextValue,
                          }));
                        }}
                        placeholder={platform.placeholder}
                        className="h-11 rounded-2xl border-slate-200 bg-white px-4 text-sm shadow-none"
                      />
                      <p className="text-xs text-slate-500">
                        Paste the published {platform.label.toLowerCase()} URL for this script.
                      </p>
                    </div>
                  ) : (
                    <a
                      href={existingValue}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="truncate">{existingValue}</span>
                    </a>
                  )}
                </section>
              );
            })}
          </div>

          {!hasMissingPlatforms ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              This script already has YouTube, Facebook, and TikTok links attached.
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-white/90 px-5 py-4 lg:px-6">
          <p className="text-xs text-slate-500">
            Only missing links are saved from this modal.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer rounded-2xl border-slate-200 bg-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSaving}
              className="cursor-pointer rounded-2xl bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Save links
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}