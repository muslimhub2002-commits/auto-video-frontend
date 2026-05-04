'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clapperboard, ListFilter, Sparkles, X } from 'lucide-react';

export type BulkSceneEffectKind = 'look' | 'motion';

export type BulkSceneEffectPresetOption = {
  value: string;
  label: string;
  group: 'built-in' | 'saved';
  description?: string;
};

type BulkSceneEffectPresetModalProps = {
  isOpen: boolean;
  kind: BulkSceneEffectKind;
  selectedValue: string;
  options: BulkSceneEffectPresetOption[];
  selectableSceneCount: number;
  onClose: () => void;
  onSelectedValueChange: (value: string) => void;
  onApplyAllScenes: () => void;
  onApplyCertainScenes: () => void;
  isLoading?: boolean;
};

export function BulkSceneEffectPresetModal({
  isOpen,
  kind,
  selectedValue,
  options,
  selectableSceneCount,
  onClose,
  onSelectedValueChange,
  onApplyAllScenes,
  onApplyCertainScenes,
  isLoading = false,
}: BulkSceneEffectPresetModalProps) {
  if (!isOpen) return null;

  const isLook = kind === 'look';
  const Icon = isLook ? Sparkles : Clapperboard;
  const accentClass = isLook
    ? 'from-fuchsia-500 to-pink-600 shadow-fuchsia-500/20'
    : 'from-sky-500 to-cyan-600 shadow-sky-500/20';
  const actionClass = isLook
    ? 'from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700'
    : 'from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700';

  const title = isLook ? 'Apply look preset in bulk' : 'Apply motion preset in bulk';
  const description = isLook
    ? `Choose a look preset and apply it to all ${selectableSceneCount} scenes or only the scenes you pick next.`
    : `Choose a motion preset and apply it to all ${selectableSceneCount} eligible scenes or only the scenes you pick next.`;

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/55 p-4 backdrop-blur-md animate-in fade-in duration-300"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] animate-in zoom-in-95 duration-300"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-slate-200/80 bg-linear-to-br from-slate-50 via-white to-slate-50 px-8 py-7">
          <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-r from-white via-white/90 to-white" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${accentClass} shadow-lg`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                  <ListFilter className="h-3.5 w-3.5" />
                  Manual bulk apply
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="h-10 w-10 rounded-full p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-5 px-8 py-7">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <p className="mb-2 text-sm font-semibold text-slate-900">
              {isLook ? 'Choose look preset' : 'Choose motion preset'}
            </p>
            <p className="mb-4 text-sm text-slate-600">
              Saved presets stay linked to the selected scenes, matching the current per-scene select behavior.
            </p>
            <Select value={selectedValue} onValueChange={onSelectedValueChange}>
              <SelectTrigger className="h-11 w-full border-slate-200 bg-white text-slate-700 shadow-sm">
                <SelectValue placeholder={isLook ? 'Select a look preset' : 'Select a motion preset'} />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-slate-200/80 bg-linear-to-br from-slate-50 via-white to-slate-50 px-8 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="h-11 rounded-2xl border-slate-200 px-5 text-slate-700 hover:bg-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onApplyCertainScenes}
              disabled={isLoading}
              className="h-11 rounded-2xl border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-50"
            >
              Apply for certain scenes
            </Button>
            <Button
              type="button"
              onClick={onApplyAllScenes}
              disabled={isLoading}
              className={`h-11 rounded-2xl bg-linear-to-r px-5 text-white shadow-md hover:shadow-lg ${actionClass}`}
            >
              Apply for all scenes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}