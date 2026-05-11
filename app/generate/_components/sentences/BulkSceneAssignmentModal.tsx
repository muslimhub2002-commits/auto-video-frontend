'use client';

import { Button } from '@/components/ui/button';
import {
  CheckSquare2,
  ListFilter,
  MapPin,
  Square,
  Users,
  X,
} from 'lucide-react';

import type { ScriptCharacter } from './CharactersModal';
import type { ScriptLocation } from './LocationsModal';

export type BulkSceneAssignmentKind = 'characters' | 'locations';

type BulkSceneAssignmentModalProps = {
  isOpen: boolean;
  kind: BulkSceneAssignmentKind;
  characters: ScriptCharacter[];
  locations: ScriptLocation[];
  selectedCharacterKeys: string[];
  selectedLocationKey: string | null;
  selectableSceneCount: number;
  onClose: () => void;
  onSelectedCharacterKeysChange: (next: string[]) => void;
  onSelectedLocationKeyChange: (next: string | null) => void;
  onApplyAllScenes: () => void;
  onApplyCertainScenes: () => void;
  isLoading?: boolean;
};

export function BulkSceneAssignmentModal({
  isOpen,
  kind,
  characters,
  locations,
  selectedCharacterKeys,
  selectedLocationKey,
  selectableSceneCount,
  onClose,
  onSelectedCharacterKeysChange,
  onSelectedLocationKeyChange,
  onApplyAllScenes,
  onApplyCertainScenes,
  isLoading = false,
}: BulkSceneAssignmentModalProps) {
  if (!isOpen) return null;

  const isCharacters = kind === 'characters';
  const Icon = isCharacters ? Users : MapPin;
  const accentClass = isCharacters
    ? 'from-indigo-500 to-purple-600 shadow-indigo-500/20'
    : 'from-cyan-500 to-teal-600 shadow-cyan-500/20';
  const actionClass = isCharacters
    ? 'from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
    : 'from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700';

  const characterSet = new Set(selectedCharacterKeys);
  const orderedCharacterKeys = characters
    .map((entry) => String(entry.key ?? '').trim())
    .filter(Boolean);
  const allCharactersSelected =
    orderedCharacterKeys.length > 0 &&
    orderedCharacterKeys.every((key) => characterSet.has(key));
  const validLocationKey = String(selectedLocationKey ?? '').trim() || null;
  const hasValidSelection = isCharacters
    ? selectedCharacterKeys.length > 0
    : Boolean(validLocationKey);

  const title = isCharacters
    ? 'Apply characters in bulk'
    : 'Apply location in bulk';
  const description = isCharacters
    ? `Choose one or more characters and apply them to all ${selectableSceneCount} scenes or only the scenes you pick next.`
    : `Choose one location and apply it to all ${selectableSceneCount} scenes or only the scenes you pick next.`;

  const toggleCharacter = (key: string, checked: boolean) => {
    const next = new Set(selectedCharacterKeys);
    if (checked) next.add(key);
    else next.delete(key);
    onSelectedCharacterKeysChange(
      orderedCharacterKeys.filter((candidateKey) => next.has(candidateKey)),
    );
  };

  return (
    <div
      className="fixed inset-0 z-70 min-h-screen flex items-center justify-center bg-black/55 p-4 backdrop-blur-lg animate-in fade-in duration-300"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] animate-in zoom-in-95 duration-300"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-slate-200/80 bg-linear-to-br from-slate-50 via-white to-slate-50 px-8 py-7">
          <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-r from-white via-white/90 to-white" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${accentClass} shadow-lg`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                  <ListFilter className="h-3.5 w-3.5" />
                  Manual bulk apply
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
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

        <div className="flex-1 overflow-y-auto px-8 py-7">
          {isCharacters ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              {characters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <Users className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">No characters available</p>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Create characters first, then use this bulk action to assign them across scenes.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      {selectedCharacterKeys.length > 0 ? (
                        <CheckSquare2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                      {selectedCharacterKeys.length} character
                      {selectedCharacterKeys.length === 1 ? '' : 's'} selected
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onSelectedCharacterKeysChange(
                          allCharactersSelected ? [] : orderedCharacterKeys,
                        )
                      }
                      className="h-9 rounded-xl border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50"
                    >
                      {allCharactersSelected ? 'Clear all' : 'Select all'}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {characters.map((entry) => {
                      const entryKey = String(entry.key ?? '').trim();
                      const checked = characterSet.has(entryKey);
                      return (
                        <label
                          key={entry.key}
                          className={
                            `flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-all duration-200 ` +
                            (checked
                              ? 'border-indigo-300 bg-indigo-50/50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')
                          }
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => toggleCharacter(entryKey, event.target.checked)}
                            className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{entry.name}</p>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 shadow-sm">
                                {entry.key}
                              </span>
                            </div>
                            <p className="text-sm leading-6 text-slate-600 whitespace-pre-line">
                              {entry.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              {locations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <MapPin className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">No locations available</p>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Create locations first, then use this bulk action to assign one across scenes.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
                    {validLocationKey ? (
                      <CheckSquare2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400" />
                    )}
                    {validLocationKey ? '1 location selected' : 'No location selected'}
                  </div>

                  <div className="space-y-3">
                    {locations.map((entry) => {
                      const checked = validLocationKey === entry.key;
                      return (
                        <label
                          key={entry.key}
                          className={
                            `flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-all duration-200 ` +
                            (checked
                              ? 'border-cyan-300 bg-cyan-50/50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')
                          }
                        >
                          <input
                            type="radio"
                            name="bulk-location-assignment"
                            checked={checked}
                            onChange={() => onSelectedLocationKeyChange(entry.key)}
                            className="mt-1 h-5 w-5 border-slate-300 text-cyan-600 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{entry.name}</p>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 shadow-sm">
                                {entry.key}
                              </span>
                            </div>
                            {entry.description ? (
                              <p className="text-sm leading-6 text-slate-600 whitespace-pre-line">
                                {entry.description}
                              </p>
                            ) : null}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
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
              disabled={isLoading || !hasValidSelection || selectableSceneCount === 0}
              className="h-11 rounded-2xl border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-50"
            >
              Apply for certain scenes
            </Button>
            <Button
              type="button"
              onClick={onApplyAllScenes}
              disabled={isLoading || !hasValidSelection || selectableSceneCount === 0}
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