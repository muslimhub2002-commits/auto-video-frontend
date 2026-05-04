'use client';

import { useState } from 'react';
import { Layers3, Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SavedSequenceSaveModalProps = {
  isOpen: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (title: string) => void | Promise<void>;
};

export function SavedSequenceSaveModal({
  isOpen,
  isSaving = false,
  onClose,
  onSave,
}: SavedSequenceSaveModalProps) {
  const [title, setTitle] = useState('');

  if (!isOpen) {
    return null;
  }

  const trimmedTitle = title.trim();

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
        onClick={() => {
          if (isSaving) return;
          setTitle('');
          onClose();
        }}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
        <div className="bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
                <Layers3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Save Scene Sequence</h3>
                <p className="text-sm text-white/85">
                  Store the current scene configuration as a reusable sequence.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isSaving) return;
                setTitle('');
                onClose();
              }}
              className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
              aria-label="Close save scene sequence modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form
          className="space-y-5 px-6 py-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmedTitle || isSaving) return;
            void onSave(trimmedTitle);
          }}
        >
          <div className="space-y-2">
            <label
              htmlFor="saved-sequence-title"
              className="text-sm font-medium text-slate-700"
            >
              Sequence title
            </label>
            <Input
              id="saved-sequence-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="My cinematic scene flow"
              autoFocus
              maxLength={255}
              disabled={isSaving}
            />
            <p className="text-xs text-slate-500">
              The title must be unique in your saved sequence library.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTitle('');
                onClose();
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmedTitle || isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Sequence
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}