'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Edit3, Heart, Library, Loader2, Music2, Pause, Play, Save, Trash2, X } from 'lucide-react';
import type { SentenceItem } from '../_types/sentences';
import { Pagination } from './Pagination';
import { SoundEffectEditModal, type SoundEffectEditValues } from './SoundEffectEditModal';
import {
  cloneSoundEffectAudioSettings,
  normalizeSoundEffectAudioSettings,
} from '../_types/sound-effect-audio';
import { SoundEffectsLibraryModal, type SoundEffectDto } from './SoundEffectsLibraryModal';

type TransitionSoundItem = NonNullable<SentenceItem['transitionSoundEffects']>[number];

type TransitionSoundModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  transitionType: SentenceItem['transitionToNext'] | null | undefined;
  items: NonNullable<SentenceItem['transitionSoundEffects']>;
  onChange: (next: NonNullable<SentenceItem['transitionSoundEffects']>) => void;
  onSaveReusable: () => void | Promise<void>;
  isSavingReusable: boolean;
};

type PlaybackStatus = 'idle' | 'loading' | 'playing';

const TRANSITION_LIBRARY_PAGE_SIZE = 10;

const extractErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) {
    const joined = message.map((item) => String(item ?? '').trim()).filter(Boolean).join(' ');
    return joined || fallback;
  }

  const single = String(message ?? '').trim();
  return single || fallback;
};

function getDefaultTransitionText(transitionType: SentenceItem['transitionToNext'] | null | undefined) {
  if (transitionType === 'fade' || transitionType === 'none') {
    return 'This transition is silent by default.';
  }
  if (transitionType) {
    return `${transitionType} uses its default transition sound until you override it.`;
  }
  return 'Auto transition uses its own default sound until you override it.';
}

export function TransitionSoundModal({
  isOpen,
  onClose,
  onApply,
  transitionType,
  items,
  onChange,
  onSaveReusable,
  isSavingReusable,
}: TransitionSoundModalProps) {
  const currentItems = Array.isArray(items) ? items : [];
  const [isAllLibraryOpen, setIsAllLibraryOpen] = useState(false);
  const [mixStatus, setMixStatus] = useState<PlaybackStatus>('idle');
  const [singleStatusByIndex, setSingleStatusByIndex] = useState<Record<number, PlaybackStatus>>({});
  const [savedTransitionItems, setSavedTransitionItems] = useState<SoundEffectDto[]>([]);
  const [savedTransitionsPage, setSavedTransitionsPage] = useState(1);
  const [savedTransitionsTotal, setSavedTransitionsTotal] = useState(0);
  const [isLoadingSavedTransitions, setIsLoadingSavedTransitions] = useState(false);
  const [savedTransitionsError, setSavedTransitionsError] = useState<string | null>(null);
  const [editTargetIndex, setEditTargetIndex] = useState<number | null>(null);
  const [editActionError, setEditActionError] = useState<string | null>(null);
  const [isApplyingEdit, setIsApplyingEdit] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingEditPreset, setIsSavingEditPreset] = useState(false);
  const previewRef = useRef<{ timeouts: number[]; audios: HTMLAudioElement[] }>({ timeouts: [], audios: [] });
  const everStartedRef = useRef<Set<string>>(new Set());

  const selectedCount = currentItems.length;
  const canSaveReusable =
    currentItems.length > 0 && currentItems.some((item) => item.isTransitionSound !== true);
  const defaultTransitionText = useMemo(() => getDefaultTransitionText(transitionType), [transitionType]);
  const availableSavedTransitionItems = useMemo(() => {
    if (savedTransitionItems.length === 0) return [];
    const usedIds = new Set(currentItems.map((item) => String(item.id ?? '').trim()).filter(Boolean));
    return savedTransitionItems.filter((item) => !usedIds.has(String(item.id ?? '').trim()));
  }, [currentItems, savedTransitionItems]);
  const savedTransitionsTotalPages =
    savedTransitionsTotal > 0
      ? Math.max(1, Math.ceil(savedTransitionsTotal / TRANSITION_LIBRARY_PAGE_SIZE))
      : 1;
  const titleId = 'transition-sound-modal-title';
  const descriptionId = 'transition-sound-modal-description';
  const editTarget = editTargetIndex === null ? null : currentItems[editTargetIndex] ?? null;

  const applySavedVolumeToAudio = (audioElement: HTMLAudioElement | null, volumePercent?: number) => {
    if (!audioElement) return;
    audioElement.volume = Math.max(0, Math.min(1, (Number(volumePercent ?? 100) || 0) / 100));
  };

  const mapSoundEffectToTransitionItem = (
    item: SoundEffectDto,
    overrides?: Partial<TransitionSoundItem>,
  ): TransitionSoundItem => ({
    id: item.id,
    title: String(item.name ?? item.title ?? 'Sound effect').trim() || 'Sound effect',
    url: item.url,
    delaySeconds: Math.max(0, Number(overrides?.delaySeconds ?? 0) || 0),
    volumePercent: Math.max(
      0,
      Math.min(300, Number(overrides?.volumePercent ?? item.volume_percent ?? 100) || 100),
    ),
    isTransitionSound: item.is_transition_sound === true,
    fromFavorites: item.fromFavorites === true,
    audioSettings: cloneSoundEffectAudioSettings(item.audio_settings),
  });

  const syncCurrentItem = (itemIndex: number, patch: Partial<TransitionSoundItem>) => {
    onChange(currentItems.map((item, index) => (index === itemIndex ? { ...item, ...patch } : item)));
  };

  const fetchSavedTransitions = useCallback(async (pageToLoad = 1) => {
    setIsLoadingSavedTransitions(true);
    setSavedTransitionsError(null);
    try {
      const response = await api.get<{
        items: SoundEffectDto[];
        total: number;
        page: number;
        limit: number;
      }>('/sound-effects/transitions', {
        params: { page: pageToLoad },
      });

      const data = response.data;
      setSavedTransitionItems(Array.isArray(data.items) ? data.items : []);
      setSavedTransitionsTotal(Number(data.total ?? 0) || 0);
      setSavedTransitionsPage(Number(data.page ?? pageToLoad) || pageToLoad);
    } catch (error) {
      setSavedTransitionsError(
        extractErrorMessage(error, 'Failed to load saved transition sounds.'),
      );
    } finally {
      setIsLoadingSavedTransitions(false);
    }
  }, []);

  const stopAllScheduledAudio = () => {
    for (const timeoutId of previewRef.current.timeouts) {
      window.clearTimeout(timeoutId);
    }
    previewRef.current.timeouts = [];

    for (const audio of previewRef.current.audios) {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audio.load();
      } catch {}
    }
    previewRef.current.audios = [];
    setMixStatus('idle');
    setSingleStatusByIndex({});
  };

  useEffect(() => {
    if (!isOpen) {
      stopAllScheduledAudio();
      setEditTargetIndex(null);
      setEditActionError(null);
      return;
    }

    setSavedTransitionsPage(1);
    void fetchSavedTransitions(1);
    return () => stopAllScheduledAudio();
  }, [fetchSavedTransitions, isOpen]);

  const createAudio = (src: string, volumePercent: number) => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = Math.max(0, Math.min(1, volumePercent / 100));
    previewRef.current.audios.push(audio);
    return audio;
  };

  const playSingle = async (itemIndex: number) => {
    const item = currentItems[itemIndex];
    if (!item?.url) return;

    stopAllScheduledAudio();
    const key = `${item.id}-${itemIndex}`;
    const shouldShowLoading = !everStartedRef.current.has(key);
    setSingleStatusByIndex({ [itemIndex]: shouldShowLoading ? 'loading' : 'playing' });

    try {
      const audio = createAudio(item.url, Math.max(0, Math.min(300, Number(item.volumePercent ?? 100) || 100)));
      await audio.play();
      everStartedRef.current.add(key);
      setSingleStatusByIndex({ [itemIndex]: 'playing' });
      audio.addEventListener(
        'ended',
        () => {
          setSingleStatusByIndex({});
        },
        { once: true },
      );
    } catch {
      setSingleStatusByIndex({});
    }
  };

  const playMix = async () => {
    if (currentItems.length === 0) return;

    stopAllScheduledAudio();
    const shouldShowLoading = currentItems.some((item, idx) => !everStartedRef.current.has(`${item.id}-${idx}`));
    setMixStatus(shouldShowLoading ? 'loading' : 'playing');

    currentItems.forEach((item, idx) => {
      if (!item?.url) return;

      const delayMs = Math.max(0, Math.round((Number(item.delaySeconds ?? 0) || 0) * 1000));
      const timeoutId = window.setTimeout(async () => {
        try {
          const audio = createAudio(item.url, Math.max(0, Math.min(300, Number(item.volumePercent ?? 100) || 100)));
          await audio.play();
          everStartedRef.current.add(`${item.id}-${idx}`);
          setMixStatus('playing');
          audio.addEventListener('ended', () => undefined, { once: true });
        } catch {}
      }, delayMs);
      previewRef.current.timeouts.push(timeoutId);
    });
  };

  const appendSelected = (selected: SoundEffectDto[]) => {
    const additions = (selected ?? []).map((item) => mapSoundEffectToTransitionItem(item));
    onChange([...currentItems, ...additions]);
  };

  const applyItemEditsLocally = async (values: SoundEffectEditValues) => {
    if (editTargetIndex === null) return;

    setIsApplyingEdit(true);
    setEditActionError(null);
    try {
      syncCurrentItem(editTargetIndex, {
        title: String(values.name ?? '').trim() || 'Sound effect',
        volumePercent: Math.max(0, Math.min(300, Number(values.volumePercent ?? 100) || 100)),
        audioSettings: cloneSoundEffectAudioSettings(values.audioSettings),
      });
      setEditTargetIndex(null);
    } finally {
      setIsApplyingEdit(false);
    }
  };

  const saveItemEdits = async (values: SoundEffectEditValues) => {
    if (editTargetIndex === null || !editTarget?.id) return;

    setIsSavingEdit(true);
    setEditActionError(null);
    try {
      const response = await api.patch<SoundEffectDto>(`/sound-effects/${encodeURIComponent(editTarget.id)}`, {
        name: String(values.name ?? '').trim(),
        volumePercent: Math.max(0, Math.min(300, Number(values.volumePercent ?? 100) || 100)),
        audioSettings: normalizeSoundEffectAudioSettings(values.audioSettings),
      });

      const savedItem = response.data;
      syncCurrentItem(editTargetIndex, mapSoundEffectToTransitionItem(savedItem, {
        delaySeconds: currentItems[editTargetIndex]?.delaySeconds ?? 0,
      }));
      setSavedTransitionItems((prev) =>
        prev.map((item) => (item.id === savedItem.id ? { ...item, ...savedItem } : item)),
      );
      setEditTargetIndex(null);
    } catch (error) {
      setEditActionError(extractErrorMessage(error, 'Failed to update sound effect.'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const saveItemAsPreset = async (values: SoundEffectEditValues) => {
    if (editTargetIndex === null || !editTarget?.id) return;

    setIsSavingEditPreset(true);
    setEditActionError(null);
    try {
      const response = await api.post<SoundEffectDto>(
        `/sound-effects/${encodeURIComponent(editTarget.id)}/presets`,
        {
          name: String(values.name ?? '').trim(),
          volumePercent: Math.max(0, Math.min(300, Number(values.volumePercent ?? 100) || 100)),
          audioSettings: normalizeSoundEffectAudioSettings(values.audioSettings),
        },
      );

      const presetItemResponse = response.data;
      const presetItemId = String(presetItemResponse?.id ?? '').trim();
      const presetItem =
        presetItemId.length > 0
          ? (
            await api.patch<SoundEffectDto>(`/sound-effects/transition/${encodeURIComponent(presetItemId)}`, {
              isTransitionSound: true,
              volumePercent: Math.max(0, Math.min(300, Number(values.volumePercent ?? 100) || 100)),
            })
          ).data
          : presetItemResponse;

      syncCurrentItem(editTargetIndex, mapSoundEffectToTransitionItem(presetItem, {
        delaySeconds: currentItems[editTargetIndex]?.delaySeconds ?? 0,
      }));
      setSavedTransitionItems((prev) => [presetItem, ...prev]);
      setSavedTransitionsTotal((prev) => prev + 1);
      setEditTargetIndex(null);
    } catch (error) {
      setEditActionError(extractErrorMessage(error, 'Failed to save sound effect preset.'));
    } finally {
      setIsSavingEditPreset(false);
    }
  };

  const handleClose = () => {
    stopAllScheduledAudio();
    onClose();
  };

  const handleApply = () => {
    stopAllScheduledAudio();
    onApply();
  };

  if (!isOpen) return null;

  return (
    <>
      <SoundEffectEditModal
        isOpen={Boolean(editTarget)}
        title="Edit transition sound"
        audioUrl={editTarget?.url ?? null}
        initialName={String(editTarget?.title ?? '').trim()}
        initialVolumePercent={Number(editTarget?.volumePercent ?? 100) || 100}
        initialAudioSettings={cloneSoundEffectAudioSettings(editTarget?.audioSettings)}
        isSaving={isSavingEdit}
        isApplying={isApplyingEdit}
        isSavingAsPreset={isSavingEditPreset}
        actionError={editActionError}
        onClose={() => {
          setEditTargetIndex(null);
          setEditActionError(null);
        }}
        onApply={(values) => applyItemEditsLocally(values)}
        onSave={(values) => saveItemEdits(values)}
        onSaveAsPreset={(values) => saveItemAsPreset(values)}
      />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div
          className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200/70 bg-linear-to-br from-white via-gray-50 to-indigo-50/30 shadow-2xl animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-linear-to-br from-indigo-600 to-purple-600 p-3 shadow-lg">
                  <Music2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 id={titleId} className="text-xl font-bold text-gray-900">Sound Transition</h2>
                  <p id={descriptionId} className="mt-0.5 text-sm text-gray-600">{defaultTransitionText}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close transition sound modal"
                className="rounded-xl p-2.5 transition-all hover:scale-105 hover:bg-white/80 hover:shadow-md"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-linear-to-b from-transparent to-gray-50/60 px-6 py-5">
            <div className="rounded-2xl border border-indigo-200/70 bg-white/70 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Current override</p>
                  <p className="text-xs text-gray-500">
                    {selectedCount > 0 ? `${selectedCount} sound${selectedCount === 1 ? '' : 's'} selected` : 'No custom transition sound selected'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (mixStatus === 'loading' || mixStatus === 'playing') {
                        stopAllScheduledAudio();
                        return;
                      }
                      void playMix();
                    }}
                    disabled={currentItems.length === 0}
                    className="h-9 gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    {mixStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : mixStatus === 'playing' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    <span className="text-xs font-semibold">{mixStatus === 'playing' ? 'Stop' : 'Play all'}</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsAllLibraryOpen(true)}
                    className="h-9 gap-2 bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                  >
                    <Library className="h-4 w-4" />
                    <span className="text-xs font-semibold">From Library</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      stopAllScheduledAudio();
                      onChange([]);
                    }}
                    disabled={currentItems.length === 0}
                    className="h-9 gap-2 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-xs font-semibold">Remove all</span>
                  </Button>
                </div>
              </div>
            </div>

            {currentItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {currentItems.map((item, itemIndex) => (
                  <div key={`${item.id}-${itemIndex}`} className="rounded-xl border border-gray-200 bg-white/70 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900" title={item.title}>{item.title}</p>
                        <p className="truncate text-xs text-gray-500" title={item.url}>{item.url}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const status = singleStatusByIndex[itemIndex] ?? 'idle';
                            if (status === 'loading' || status === 'playing') {
                              stopAllScheduledAudio();
                              return;
                            }
                            void playSingle(itemIndex);
                          }}
                          className="h-8 gap-2 border-gray-200 text-gray-700 hover:bg-white"
                        >
                          {singleStatusByIndex[itemIndex] === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : singleStatusByIndex[itemIndex] === 'playing' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          <span className="text-xs font-semibold">{singleStatusByIndex[itemIndex] === 'playing' ? 'Stop' : 'Play'}</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            stopAllScheduledAudio();
                            setEditActionError(null);
                            setEditTargetIndex(itemIndex);
                          }}
                          className="h-8 gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span className="text-xs font-semibold">Edit</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onChange(currentItems.filter((_, i) => i !== itemIndex))}
                          className="h-8 gap-2 border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                          <span className="text-xs font-semibold">Remove</span>
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 bg-white/60 p-3">
                        <p className="text-xs font-bold text-gray-900">Start offset</p>
                        <p className="text-[11px] text-gray-500">Seconds after the transition sound starts</p>
                        <div className="relative mt-2">
                          <Input
                            type="number"
                            min={0}
                            step={0.1}
                            value={String(Number(item.delaySeconds ?? 0))}
                            onChange={(e) => {
                              const delaySeconds = Math.max(0, Number(e.target.value) || 0);
                              onChange(currentItems.map((it, i) => (i === itemIndex ? { ...it, delaySeconds } : it)));
                            }}
                            className="h-9 pr-10"
                          />
                          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">s</div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white/60 p-3">
                        <p className="text-xs font-bold text-gray-900">Volume</p>
                        <p className="text-[11px] text-gray-500">Relative loudness for this transition sound</p>
                        <div className="relative mt-2">
                          <Input
                            type="number"
                            min={0}
                            max={300}
                            step={1}
                            value={String(Math.max(0, Math.min(300, Number(item.volumePercent ?? 100) || 100)))}
                            onChange={(e) => {
                              const volumePercent = Math.max(0, Math.min(300, Number(e.target.value) || 0));
                              onChange(currentItems.map((it, i) => (i === itemIndex ? { ...it, volumePercent } : it)));
                            }}
                            className="h-9 pr-10"
                          />
                          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-indigo-200/70 bg-white/70 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Saved transition sounds</p>
                  <p className="text-xs text-gray-500">Favorites appear first, then newer sounds.</p>
                </div>
                <div className="text-xs text-gray-400">
                  Page {savedTransitionsPage} of {savedTransitionsTotalPages}
                </div>
              </div>

              {isLoadingSavedTransitions ? (
                <div className="mt-4 flex items-center justify-center py-10 text-sm text-gray-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading saved transition sounds...
                </div>
              ) : savedTransitionsError ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 p-4 text-center">
                  <p className="text-sm font-semibold text-red-700">{savedTransitionsError}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void fetchSavedTransitions(savedTransitionsPage)}
                    className="mt-3 border-red-200 text-red-700 hover:bg-red-100"
                  >
                    Retry
                  </Button>
                </div>
              ) : availableSavedTransitionItems.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-gray-800">No unused saved transition sounds available</p>
                  <p className="mt-1 text-xs text-gray-500">All saved transition sounds are already in the current override, or none have been saved yet.</p>
                </div>
              ) : (
                <>
                  <div className="mt-4 space-y-3">
                    {availableSavedTransitionItems.map((item) => {
                      const displayName = String(item.name ?? item.title ?? 'Sound effect').trim() || 'Sound effect';
                      const resolvedVolume = Math.max(0, Math.min(300, Number(item.volume_percent ?? 100) || 100));
                      return (
                        <div key={item.id} className="rounded-xl border border-gray-200 bg-white/80 p-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-bold text-gray-900" title={displayName}>{displayName}</p>
                                {item.fromFavorites ? <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> : null}
                              </div>
                              <p className="mt-1 text-xs text-gray-500">Default volume {Math.round(resolvedVolume)}%</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => appendSelected([item])}
                              className="bg-linear-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                            >
                              Use sound
                            </Button>
                          </div>
                          <div className="mt-3">
                            <audio
                              controls
                              src={item.url}
                              className="h-8 w-full"
                              ref={(node) => applySavedVolumeToAudio(node, resolvedVolume)}
                              onPlay={(event) => applySavedVolumeToAudio(event.currentTarget, resolvedVolume)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <Pagination
                      currentPage={savedTransitionsPage}
                      totalPages={savedTransitionsTotalPages}
                      onPageChange={(nextPage) => {
                        setSavedTransitionsPage(nextPage);
                        void fetchSavedTransitions(nextPage);
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-200/80 bg-linear-to-r from-gray-50 to-indigo-50/50 px-6 py-4">
            <p className="text-xs text-gray-500">Use custom sounds for this cut, or leave it empty to keep the transition default.</p>
            <div className="flex items-center gap-2">
              <Button type="button" onClick={handleClose} variant="outline" size="sm">Close</Button>
              <Button type="button" onClick={handleApply} size="sm" disabled={currentItems.length === 0} className="bg-linear-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700">
                Apply
              </Button>
              {canSaveReusable ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void Promise.resolve(onSaveReusable())}
                  disabled={isSavingReusable}
                  className="gap-2 bg-linear-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                >
                  {isSavingReusable ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Apply & Save as Transition Sound</span>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <SoundEffectsLibraryModal
        isOpen={isAllLibraryOpen}
        onClose={() => setIsAllLibraryOpen(false)}
        onApply={(selected) => {
          appendSelected(selected);
          setIsAllLibraryOpen(false);
        }}
      />
    </>
  );
}
