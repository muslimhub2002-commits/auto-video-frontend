'use client';

import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Save, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  socialAccountFieldMap,
  socialAccountSectionMap,
  type SocialAccountProvider,
  type SocialAccountUpsertPayload,
} from '../social-accounts-data';

type SocialAccountFormModalProps = {
  isOpen: boolean;
  provider: SocialAccountProvider | null;
  mode: 'create' | 'edit';
  initialLabel?: string;
  initialFieldValues?: Record<string, string | null>;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: SocialAccountUpsertPayload) => void | Promise<void>;
};

export function SocialAccountFormModal({
  isOpen,
  provider,
  mode,
  initialLabel,
  initialFieldValues,
  isSaving,
  onClose,
  onSubmit,
}: SocialAccountFormModalProps) {
  const [label, setLabel] = useState(() => initialLabel ?? '');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    provider
      ? Object.fromEntries(
          socialAccountFieldMap[provider].map((field) => [
            field.key,
            String(initialFieldValues?.[field.key] ?? ''),
          ]),
        )
      : {},
  );
  const [formError, setFormError] = useState<string | null>(null);

  const section = provider ? socialAccountSectionMap[provider] : null;
  const fields = useMemo(
    () => (provider ? socialAccountFieldMap[provider] : []),
    [provider],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || !provider || !section) {
    return null;
  }

  const handleSubmit = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setFormError('Add a label so the user can distinguish this saved account later.');
      return;
    }

    const hasAnyField = Object.values(fieldValues).some((value) => value.trim().length > 0);
    if (!hasAnyField) {
      setFormError('Fill at least one provider field before saving this account.');
      return;
    }

    setFormError(null);
    await onSubmit({
      label: trimmedLabel,
      fields: Object.fromEntries(
        Object.entries(fieldValues).map(([key, value]) => [key, value.trim()]),
      ),
      ...(mode === 'create' ? { makeDefault: false } : {}),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!isSaving) {
          onClose();
        }
      }}
    >
      <section
        className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/80 bg-white/95 shadow-[0_36px_90px_-50px_rgba(15,23,42,0.65)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur lg:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-linear-to-br text-white shadow-[0_16px_36px_-24px_rgba(15,23,42,0.55)] ${section.accentClassName}`}>
                <section.icon className="h-5 w-5" />
              </div>
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${section.badgeClassName}`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {mode === 'create' ? 'Add account' : 'Edit account'}
                </div>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                  {mode === 'create' ? `Save a ${section.label} account` : `Update ${section.label} account`}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  Save the platform credentials under a clear label so future upload flows can target the correct account.
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close form"
              onClick={onClose}
              disabled={isSaving}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 lg:px-6 lg:py-6">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
            <Label htmlFor="social-account-label" className="text-sm font-semibold text-slate-900">
              Account label
            </Label>
            <Input
              id="social-account-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={`${section.label} account 1`}
              className="mt-3 h-11 rounded-2xl border-slate-200 bg-white"
            />
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Example labels: Primary channel, Client A page, or Personal TikTok app.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <KeyRound className="h-4 w-4" />
              Provider Fields
            </div>
            <div className="mt-5 space-y-4">
              {fields.map((field) => (
                <div key={field.key} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={field.key} className="text-sm font-semibold text-slate-900">
                      {field.label}
                    </Label>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${section.badgeClassName}`}>
                      {field.envKey}
                    </span>
                  </div>
                  <Input
                    id={field.key}
                    type={field.secret ? 'password' : 'text'}
                    value={fieldValues[field.key] ?? ''}
                    onChange={(event) =>
                      setFieldValues((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="mt-3 h-11 rounded-2xl border-slate-200 bg-white"
                  />
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {field.helperText}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {formError ? (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-700">
              {formError}
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur lg:px-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="rounded-2xl border-slate-200 bg-white">
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSaving} className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : mode === 'create' ? 'Save account' : 'Save changes'}
          </Button>
        </div>
      </section>
    </div>
  );
}