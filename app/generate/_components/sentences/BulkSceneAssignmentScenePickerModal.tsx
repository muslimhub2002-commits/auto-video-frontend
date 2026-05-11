'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckSquare2,
  FileText,
  MapPin,
  Square,
  Users,
  Video as VideoIcon,
  X,
} from 'lucide-react';

import type { BulkSceneAssignmentKind } from './BulkSceneAssignmentModal';
import { useManagedObjectUrl } from './useManagedObjectUrl';

export type BulkSceneAssignmentScenePickerItem = {
  sentenceId: string;
  title: string;
  textPreview: string;
  sceneKindLabel: string;
  mediaTransport: 'image' | 'video' | 'none';
  mediaFile: File | null;
  mediaUrl: string | null;
};

function ScenePreviewThumbnail({
  scene,
  isSelected,
}: {
  scene: BulkSceneAssignmentScenePickerItem;
  isSelected: boolean;
}) {
  const objectUrl = useManagedObjectUrl(scene.mediaFile);
  const mediaUrl = objectUrl ?? scene.mediaUrl ?? null;
  const borderClass = isSelected
    ? 'border-sky-400 shadow-lg'
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

type BulkSceneAssignmentScenePickerModalProps = {
  isOpen: boolean;
  kind: BulkSceneAssignmentKind;
  scenes: BulkSceneAssignmentScenePickerItem[];
  selectedSentenceIds: string[];
  onClose: () => void;
  onApply: (sentenceIds: string[]) => void;
  isLoading?: boolean;
};

export function BulkSceneAssignmentScenePickerModal({
  isOpen,
  kind,
  scenes,
  selectedSentenceIds,
  onClose,
  onApply,
  isLoading = false,
}: BulkSceneAssignmentScenePickerModalProps) {
  const [draftSelectedIds, setDraftSelectedIds] = useState<string[]>(() =>
    Array.from(new Set(selectedSentenceIds.filter(Boolean))),
  );
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const selectableIds = useMemo(
    () => scenes.map((scene) => scene.sentenceId),
    [scenes],
  );
  const selectedSet = useMemo(() => new Set(draftSelectedIds), [draftSelectedIds]);
  const selectedCount = selectableIds.filter((id) => selectedSet.has(id)).length;
  const allSelected = selectableIds.length > 0 && selectedCount === selectableIds.length;
  const partiallySelected = selectedCount > 0 && selectedCount < selectableIds.length;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = partiallySelected;
  }, [partiallySelected]);

  if (!isOpen) return null;

  const isCharacters = kind === 'characters';
  const Icon = isCharacters ? Users : MapPin;
  const accentClass = isCharacters
    ? 'from-indigo-500 to-purple-600 shadow-indigo-500/20'
    : 'from-cyan-500 to-teal-600 shadow-cyan-500/20';
  const actionClass = isCharacters
    ? 'from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
    : 'from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700';

  const toggleScene = (sentenceId: string, checked: boolean) => {
    setDraftSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(sentenceId);
      else next.delete(sentenceId);
      return Array.from(next);
    });
  };

  const handleToggleAll = (checked: boolean) => {
    setDraftSelectedIds(checked ? selectableIds : []);
  };

  return (
    <div
      className="fixed inset-0 z-70 min-h-screen flex items-center justify-center bg-black/55 p-4 backdrop-blur-lg animate-in fade-in duration-300"
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
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${accentClass} shadow-lg`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                  {isCharacters
                    ? 'Choose scenes for characters'
                    : 'Choose scenes for location'}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Select the scenes you want to update, then apply the chosen
                  {isCharacters ? ' characters.' : ' location.'}
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
                checked={allSelected}
                onChange={(event) => handleToggleAll(event.target.checked)}
                disabled={selectableIds.length === 0 || isLoading}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-0"
              />
              Select all scenes
            </label>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              {allSelected ? (
                <CheckSquare2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              {selectedCount} of {selectableIds.length} scenes selected
            </div>
          </div>

          <div className="space-y-3">
            {scenes.map((scene) => {
              const checked = selectedSet.has(scene.sentenceId);
              return (
                <label
                  key={scene.sentenceId}
                  className={
                    `group flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-all duration-200 ` +
                    (checked
                      ? 'border-sky-300 bg-sky-50/60 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isLoading}
                    onChange={(event) => toggleScene(scene.sentenceId, event.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-0"
                  />
                  <ScenePreviewThumbnail scene={scene} isSelected={checked} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{scene.title}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        {scene.sceneKindLabel}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{scene.textPreview}</p>
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
              disabled={isLoading || selectedCount === 0}
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