'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckSquare2,
  Clapperboard,
  FileText,
  Sparkles,
  Square,
  Video as VideoIcon,
  X,
} from 'lucide-react';

import type { BulkSceneEffectKind } from './BulkSceneEffectPresetModal';
import { useManagedObjectUrl } from './useManagedObjectUrl';

export type BulkSceneEffectScenePickerItem = {
  sentenceId: string;
  title: string;
  textPreview: string;
  sceneKindLabel: string;
  mediaTransport: 'image' | 'video' | 'none';
  mediaFile: File | null;
  mediaUrl: string | null;
  disabled?: boolean;
  disabledReason?: string;
};

function ScenePreviewThumbnail({
  scene,
  isSelected,
  isDisabled,
}: {
  scene: BulkSceneEffectScenePickerItem;
  isSelected: boolean;
  isDisabled: boolean;
}) {
  const objectUrl = useManagedObjectUrl(scene.mediaFile);
  const mediaUrl = objectUrl ?? scene.mediaUrl ?? null;
  const borderClass = isSelected
    ? 'border-sky-400 shadow-lg'
    : isDisabled
      ? 'border-slate-200'
      : 'border-slate-200 group-hover:border-sky-300';

  return (
    <div className="relative shrink-0">
      <div
        className={`relative h-20 w-28 overflow-hidden rounded-xl border-2 bg-slate-100 ${borderClass}`}
      >
        {mediaUrl ? (
          scene.mediaTransport === 'video' ? (
            <div className="relative h-full w-full">
              <video
                src={mediaUrl}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="rounded-full bg-white/90 p-2 shadow-sm">
                  <VideoIcon className="h-4 w-4 text-slate-700" />
                </div>
              </div>
            </div>
          ) : (
            <Image
              src={mediaUrl}
              alt={scene.title}
              fill
              unoptimized
              sizes="112px"
              className="object-cover"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-200">
            <FileText className="h-7 w-7 text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
}

type BulkSceneEffectScenePickerModalProps = {
  isOpen: boolean;
  kind: BulkSceneEffectKind;
  scenes: BulkSceneEffectScenePickerItem[];
  selectedSentenceIds: string[];
  onClose: () => void;
  onApply: (sentenceIds: string[]) => void;
  isLoading?: boolean;
};

export function BulkSceneEffectScenePickerModal({
  isOpen,
  kind,
  scenes,
  selectedSentenceIds,
  onClose,
  onApply,
  isLoading = false,
}: BulkSceneEffectScenePickerModalProps) {
  const [draftSelectedIds, setDraftSelectedIds] = useState<string[]>(() =>
    Array.from(new Set(selectedSentenceIds.filter(Boolean))),
  );
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const selectableIds = useMemo(
    () => scenes.filter((scene) => !scene.disabled).map((scene) => scene.sentenceId),
    [scenes],
  );

  const selectedSet = useMemo(() => new Set(draftSelectedIds), [draftSelectedIds]);
  const selectedSelectableCount = selectableIds.filter((id) => selectedSet.has(id)).length;
  const allSelectableSelected =
    selectableIds.length > 0 && selectedSelectableCount === selectableIds.length;
  const partiallySelected =
    selectedSelectableCount > 0 && selectedSelectableCount < selectableIds.length;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = partiallySelected;
  }, [partiallySelected]);

  if (!isOpen) return null;

  const isLook = kind === 'look';
  const Icon = isLook ? Sparkles : Clapperboard;
  const accentClass = isLook
    ? 'from-fuchsia-500 to-pink-600 shadow-fuchsia-500/20'
    : 'from-sky-500 to-cyan-600 shadow-sky-500/20';
  const actionClass = isLook
    ? 'from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700'
    : 'from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700';

  const toggleScene = (sentenceId: string, checked: boolean) => {
    setDraftSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(sentenceId);
      else next.delete(sentenceId);
      return Array.from(next);
    });
  };

  const handleToggleAll = (checked: boolean) => {
    setDraftSelectedIds((prev) => {
      const next = new Set(prev);
      selectableIds.forEach((sentenceId) => {
        if (checked) next.add(sentenceId);
        else next.delete(sentenceId);
      });
      return Array.from(next);
    });
  };

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/55 p-4 backdrop-blur-md animate-in fade-in duration-300"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] animate-in zoom-in-95 duration-300"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 bg-linear-to-br from-slate-50 via-white to-slate-50 px-8 py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${accentClass} shadow-lg`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                  {isLook ? 'Choose scenes for look preset' : 'Choose scenes for motion preset'}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Select the scenes you want to update. Disabled rows are currently incompatible with this bulk action.
                </p>
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

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-900">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelectableSelected}
                onChange={(event) => handleToggleAll(event.target.checked)}
                disabled={selectableIds.length === 0 || isLoading}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-0"
              />
              Select all eligible scenes
            </label>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              {allSelectableSelected ? (
                <CheckSquare2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              {selectedSelectableCount} of {selectableIds.length} eligible scenes selected
            </div>
          </div>

          <div className="space-y-3">
            {scenes.map((scene) => {
              const checked = selectedSet.has(scene.sentenceId);
              return (
                <label
                  key={scene.sentenceId}
                  className={
                    `flex items-start gap-4 rounded-2xl border-2 p-4 transition-all duration-200 ` +
                    (scene.disabled
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100/80 opacity-75'
                      : checked
                        ? 'cursor-pointer border-sky-300 bg-sky-50/60 shadow-sm'
                        : 'cursor-pointer border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={scene.disabled || isLoading}
                    onChange={(event) => toggleScene(scene.sentenceId, event.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-0"
                  />
                  <ScenePreviewThumbnail
                    scene={scene}
                    isSelected={checked}
                    isDisabled={Boolean(scene.disabled)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{scene.title}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        {scene.sceneKindLabel}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{scene.textPreview}</p>
                    {scene.disabledReason ? (
                      <p className="mt-2 text-xs font-medium text-amber-700">{scene.disabledReason}</p>
                    ) : null}
                  </div>
                </label>
              );
            })}
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
              onClick={() => onApply(Array.from(new Set(draftSelectedIds.filter(Boolean))))}
              disabled={isLoading || selectedSelectableCount === 0}
              className={`h-11 rounded-2xl bg-linear-to-r px-5 text-white shadow-md hover:shadow-lg ${actionClass}`}
            >
              Apply to selected scenes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}