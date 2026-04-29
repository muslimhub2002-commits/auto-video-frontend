'use client';

import { memo, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import {
  computeSentenceSoundEffectTiming,
  getSentenceSoundEffectsStackDuration,
} from '../../_utils/soundEffectsTiming';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Sparkles,
  FileText,
  X,
  Image as ImageIcon,
  Library,
  Music2,
  GripVertical,
  Upload,
  Play,
  Pause,
  Pencil,
  Save,
  Video as VideoIcon,
  ArrowUp,
  ArrowDown,
  Trash2,
  Volume2,
  Users,
  Repeat2,
  Clock,
  Timer,
  SlidersHorizontal,
  MapPin,
  Plus,
  Clapperboard,
} from 'lucide-react';

import { ForcedCharactersModal } from './ForcedCharactersModal';
import { ForcedLocationModal } from './ForcedLocationModal';
import type { ScriptLocation } from './LocationsModal';
import { SentenceTextEditor } from './SentenceTextEditor';
import { SoundEffectEditModal, type SoundEffectEditValues } from '../SoundEffectEditModal';
import {
  getDefaultImageFilterSettings,
  getDefaultImageMotionSettings,
  DEFAULT_IMAGE_MOTION_SPEED,
  getDefaultImageMotionSpeed,
  getImageMotionEffectLabel,
  getVisualEffectLabel,
  ImageEffectPreview,
  IMAGE_MOTION_EFFECT_SELECT_VALUES,
  normalizeOverlaySettings,
  normalizeImageFilterSettings,
  isImageMotionEffectSelectValue,
  normalizeImageMotionSettings,
  resolveImageMotionSpeed,
  resolveMotionEffectFromSettings,
  resolveVisualEffectFromSettings,
  type ImageFilterPresetDto,
  type ImageFilterSettings,
  type ImageMotionSettings,
  type MotionEffectPresetDto,
  type OverlayPresetDto,
  type OverlaySettings,
} from './ImageEffectPreview';
import {
  getDefaultTextAnimationSettings,
  getTextAnimationSettingsForEffectChange,
  getTextAnimationEffectLabel,
  normalizeTextAnimationText,
  normalizeTextAnimationSettings,
  resolveTextAnimationEffectFromSettings,
  resolveTextAnimationText,
  TextAnimationPreview,
  TEXT_ANIMATION_EFFECT_VALUES,
  type TextAnimationPresetDto,
  type TextAnimationSettings,
} from './TextAnimationPreview';
import { TEMPORARY_CUSTOM_PRESET_ID } from '../../_utils/imageEffectSelection';
import { ImageEffectsDetailModal } from './ImageEffectsDetailModal';
import { OverlayScenePreview } from './OverlayScenePreview';
import { TextPreviewOverlay } from './TextPreviewOverlay';
import { createSoundEffectPreviewGraph } from '../../_utils/soundEffectPreviewGraph';
import {
  DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
  cloneSoundEffectAudioSettings,
  getSoundEffectPlaybackDurationSeconds,
  normalizeSoundEffectAudioSettings,
  resolveSoundEffectTrimWindow,
  type SoundEffectAudioSettings,
} from '../../_types/sound-effect-audio';
import { useManagedObjectUrl } from './useManagedObjectUrl';

import type { SentenceItem, SentenceSoundEffectItem } from '../../_types/sentences';

type VisualEffectValue = SentenceItem['visualEffect'];

const VISUAL_EFFECT_SELECT_VALUES = [
  'colorGrading',
  'animatedLighting',
  'glassSubtle',
  'glassReflections',
  'glassStrong',
] as const;

type VisualEffectSelectValue = (typeof VISUAL_EFFECT_SELECT_VALUES)[number];

function isVisualEffectSelectValue(value: string): value is VisualEffectSelectValue {
  return (VISUAL_EFFECT_SELECT_VALUES as readonly string[]).includes(value);
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(message)) {
    const firstMessage = message.find((item) => typeof item === 'string' && item.trim().length > 0);
    if (typeof firstMessage === 'string') return firstMessage.trim();
  }
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim();
  }
  return fallback;
};

const getSentenceSoundEffectSortableId = (
  sfx: NonNullable<SentenceItem['soundEffects']>[number],
  index: number,
) => `${String(sfx.id ?? 'sfx')}-${index}`;

const cloneDetachedSentenceSoundEffects = (
  items: SentenceSoundEffectItem[] | null | undefined,
): SentenceSoundEffectItem[] => {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items.map((item) => ({
    ...item,
    audioSettings: cloneSoundEffectAudioSettings(item.audioSettings),
    defaultAudioSettings: cloneSoundEffectAudioSettings(item.defaultAudioSettings),
  }));
};

type SortableSentenceSoundEffectCardProps = {
  sfx: NonNullable<SentenceItem['soundEffects']>[number];
  sfxIndex: number;
  isLast: boolean;
  isDelayDisabled: boolean;
  nextTimingMode: 'withPrevious' | 'afterPreviousEnds';
  singleStatus: 'idle' | 'loading' | 'playing';
  truncateTitle: (value: string) => string;
  onTogglePlay: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onDelayChange: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onNextTimingModeChange: (value: 'withPrevious' | 'afterPreviousEnds') => void;
};

function SortableSentenceSoundEffectCard({
  sfx,
  sfxIndex,
  isLast,
  isDelayDisabled,
  nextTimingMode,
  singleStatus,
  truncateTitle,
  onTogglePlay,
  onEdit,
  onRemove,
  onDelayChange,
  onVolumeChange,
  onNextTimingModeChange,
}: SortableSentenceSoundEffectCardProps) {
  const playbackDurationSeconds = getSoundEffectPlaybackDurationSeconds({
    durationSeconds: sfx.durationSeconds,
    audioSettings: sfx.audioSettings,
  });

  const sortableId = getSentenceSoundEffectSortableId(sfx, sfxIndex);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={isDragging ? 'relative z-20' : undefined}
    >
      <div
        className={
          isDragging
            ? 'rounded-xl border border-indigo-300 bg-white p-3 shadow-xl'
            : 'rounded-xl border border-gray-200 bg-gray-50/50 p-3'
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              className="mt-0.5 rounded-lg border border-gray-200 bg-white p-2 text-gray-500 shadow-sm hover:bg-gray-50"
              aria-label="Drag sound effect"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <p
                className="truncate text-sm font-bold text-gray-900"
                title={String(sfx.title ?? '').trim()}
              >
                {truncateTitle(String(sfx.title ?? ''))}
              </p>
              <p className="truncate text-xs text-gray-500" title={sfx.url}>
                {sfx.url}
              </p>
              {typeof playbackDurationSeconds === 'number' ? (
                <p className="mt-1 text-[11px] font-medium text-indigo-600">
                  Duration {playbackDurationSeconds.toFixed(2)}s
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onTogglePlay}
              className="h-8 gap-2 border-gray-200 text-gray-700 hover:bg-white"
              title="Preview this sound effect"
            >
              {singleStatus === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : singleStatus === 'playing' ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="border-gray-200 text-gray-700 hover:bg-white"
              title="Edit name & volume"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRemove}
              className="h-8 gap-2 border-red-200 text-red-600 hover:bg-red-50"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white/60 p-3">
            <div className="flex h-9 items-start gap-2">
              <div className="mt-0.5 rounded-xl bg-indigo-50 p-2">
                <Timer className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900">Start offset</p>
                <p className="text-[11px] leading-tight text-gray-500">
                  Seconds after this group starts
                </p>
              </div>
            </div>

            <div className="relative mt-2">
              <Input
                type="number"
                min={0}
                step={0.1}
                value={String(Number(sfx.delaySeconds ?? 0))}
                onChange={(e) => onDelayChange(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 pr-10"
                disabled={isDelayDisabled}
                placeholder="0.0"
                title={
                  isDelayDisabled
                    ? 'Start offset is disabled while ending the sound stack with the scene'
                    : 'Start offset in seconds'
                }
              />
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                s
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white/60 p-3">
            <div className="flex h-9 items-start gap-2">
              <div className="mt-0.5 rounded-xl bg-indigo-50 p-2">
                <Volume2 className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900">Volume</p>
                <p className="text-[11px] leading-tight text-gray-500">
                  Relative loudness
                </p>
              </div>
            </div>

            <div className="relative mt-2">
              <Input
                type="number"
                min={0}
                max={300}
                step={1}
                value={String(Math.max(0, Math.min(300, Number(sfx.volumePercent ?? 100) || 0)))}
                onChange={(e) => onVolumeChange(Math.max(0, Math.min(300, Number(e.target.value) || 0)))}
                className="h-9 pr-10"
                placeholder="100"
                title="Volume percent (100 = original volume)"
              />
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                %
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLast ? null : (
        <div className="flex items-center justify-center py-2">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-1 shadow-sm">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onNextTimingModeChange('withPrevious')}
              className={
                nextTimingMode === 'withPrevious'
                  ? 'h-8 rounded-xl bg-white text-indigo-700 shadow-sm hover:bg-white'
                  : 'h-8 rounded-xl text-gray-600 hover:bg-white/80'
              }
            >
              Play together
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onNextTimingModeChange('afterPreviousEnds')}
              className={
                nextTimingMode === 'afterPreviousEnds'
                  ? 'h-8 rounded-xl bg-white text-indigo-700 shadow-sm hover:bg-white'
                  : 'h-8 rounded-xl text-gray-600 hover:bg-white/80'
              }
            >
              Play Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

type ScriptCharacter = {
  key: string;
  name: string;
  description: string;
  isSahaba: boolean;
  isProphet: boolean;
  isWoman: boolean;
};

type SentenceEditorCardProps = {
  item: SentenceItem;
  index: number;
  isShortVideo: boolean;
  sceneDurationSeconds: number | null;
  isFirst: boolean;
  isLast: boolean;

  onOpenSoundEffectsLibrary: () => void;
  onSoundEffectsChange: (next: NonNullable<SentenceItem['soundEffects']>) => void;
  onAlignSoundEffectsToSceneEndChange: (next: boolean) => void;
  onUploadSoundEffect: (files: File[]) => void | Promise<void>;
  isUploadingSoundEffect: boolean;
  onSaveSoundEffectsMix: () => void | Promise<void>;
  isSavingSoundEffectsMix: boolean;

  onSelectVideoFromLibrary?: () => void;
  onSaveVideoToLibrary?: () => void | Promise<void>;
  isSavingVideoToLibrary?: boolean;

  videoModel: 'gemini' | 'grok';

  scriptCharacters: ScriptCharacter[];
  onForcedCharacterKeysChange: (next: string[] | null) => void;

  scriptLocations: ScriptLocation[];
  onForcedLocationKeyChange: (next: string | null) => void;
  imageFilterPresets: ImageFilterPresetDto[];
  motionEffectPresets: MotionEffectPresetDto[];
  textAnimationPresets: TextAnimationPresetDto[];
  overlayPresets: OverlayPresetDto[];
  isLoadingImageFilterPresets: boolean;
  isLoadingMotionEffectPresets: boolean;
  isLoadingTextAnimationPresets: boolean;
  isLoadingOverlayPresets: boolean;
  onSentencePatch: (patch: Partial<SentenceItem>) => void;
  onSaveImageFilterPreset: (
    title: string,
    settings: ImageFilterSettings,
  ) => Promise<ImageFilterPresetDto | null> | ImageFilterPresetDto | null;
  onUpdateImageFilterPreset: (
    presetId: string,
    settings: ImageFilterSettings,
  ) => Promise<ImageFilterPresetDto | null> | ImageFilterPresetDto | null;
  onDeleteImageFilterPreset: (presetId: string) => Promise<boolean> | boolean;
  onSaveMotionEffectPreset: (
    title: string,
    settings: ImageMotionSettings,
  ) => Promise<MotionEffectPresetDto | null> | MotionEffectPresetDto | null;
  onUpdateMotionEffectPreset: (
    presetId: string,
    settings: ImageMotionSettings,
  ) => Promise<MotionEffectPresetDto | null> | MotionEffectPresetDto | null;
  onDeleteMotionEffectPreset: (presetId: string) => Promise<boolean> | boolean;
  onSaveTextAnimationPreset: (
    title: string,
    settings: TextAnimationSettings,
    soundEffects: NonNullable<SentenceItem['textSoundEffects']>,
  ) => Promise<TextAnimationPresetDto | null> | TextAnimationPresetDto | null;
  onUpdateTextAnimationPreset: (
    presetId: string,
    settings: TextAnimationSettings,
    soundEffects: NonNullable<SentenceItem['textSoundEffects']>,
  ) => Promise<TextAnimationPresetDto | null> | TextAnimationPresetDto | null;
  onDeleteTextAnimationPreset: (presetId: string) => Promise<boolean> | boolean;
  onSaveOverlayPreset: (params: {
    title: string;
    settings: OverlaySettings;
    file?: File | null;
    sourceUrl?: string | null;
    overlayId?: string | null;
    soundEffects?: NonNullable<SentenceItem['overlaySoundEffects']>;
  }) => Promise<OverlayPresetDto | null> | OverlayPresetDto | null;
  onDeleteOverlayPreset: (overlayId: string) => Promise<boolean> | boolean;
  onGenerateSingleImageLookWithAi: (
    sentenceId: string,
    params: {
      visualEffect: SentenceItem['visualEffect'] | null;
      customImageFilterId: string | null;
      imageFilterSettings: ImageFilterSettings;
    },
  ) => Promise<{
    visualEffect: SentenceItem['visualEffect'] | null;
    customImageFilterId: null;
    imageFilterSettings: ImageFilterSettings;
  } | null>;
  onGenerateSingleImageMotionWithAi: (
    sentenceId: string,
    params: {
      imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
      customMotionEffectId: string | null;
      imageMotionSettings: ImageMotionSettings;
      imageMotionSpeed: number;
    },
  ) => Promise<{
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    customMotionEffectId: null;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
  } | null>;

  onVisualEffectChange: (
    value: NonNullable<SentenceItem['visualEffect']> | null,
  ) => void;
  onImageMotionEffectChange: (
    value: NonNullable<SentenceItem['imageMotionEffect']> | null,
  ) => void;
  onImageMotionSpeedChange: (value: number) => void;

  enhanceError: string | null;
  isEnhancing: boolean;
  isApplyingPrompt: boolean;
  isEnhanceMenuOpen: boolean;
  onToggleEnhanceMenu: () => void;
  onAutoEnhance: () => void;
  onCustomPrompt: () => void;

  onMergeUp: () => void;
  onMergeDown: () => void;
  onRequestDelete: () => void;

  onSentenceTextChange: (next: string) => void;
  onSentenceMediaModeChange: (mode: 'single' | 'frames') => void;

  onSentenceImageUpload: (
    e: ChangeEvent<HTMLInputElement>,
    slot?: 'primary' | 'secondary',
  ) => void;
  onSentenceVideoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onSentenceFrameImageUpload: (which: 'start' | 'end', e: ChangeEvent<HTMLInputElement>) => void;

  onGenerateSentenceImage: (
    promptOverride?: string,
    slot?: 'primary' | 'secondary',
  ) => void | Promise<void>;
  onGenerateSentenceReferenceImage?: () => void | Promise<void>;
  onGenerateSentenceFrameImage?: (which: 'start' | 'end') => void | Promise<void>;
  onSelectFromLibrary: (which: 'single' | 'secondary' | 'start' | 'end' | 'reference') => void;
  onAddSentenceImageSlot?: () => void;
  onRemoveSentenceImage: (slot?: 'primary' | 'secondary') => void;
  onRemoveSentenceFrameImage: (which: 'start' | 'end') => void;

  onVideoGenerationModeChange?: (
    mode: 'frames' | 'text' | 'referenceImage',
  ) => void;
  onVideoPromptChange?: (next: string) => void;
  isGeneratingVideoPrompt: boolean;
  onGenerateVideoPrompt?: () => void | Promise<void>;
  onSentenceReferenceImageUpload?: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveReferenceImage?: () => void;

  onOpenEnhanceImagePromptModal: () => void;
  isApplyingImagePrompt: boolean;
  imagePromptError?: string;

  isGeneratingVideo: boolean;
  onGenerateVideo?: (canGenerateVideo: boolean) => void | Promise<void>;
  onRemoveGeneratedVideo?: () => void;

  onPreviewImage: (
    url: string,
    visualEffect: SentenceItem['visualEffect'] | null,
    imageMotionEffect: SentenceItem['imageMotionEffect'] | null,
    imageMotionSpeed: number | null,
    imageFilterSettings: Record<string, unknown> | null,
    imageMotionSettings: Record<string, unknown> | null,
  ) => void;
};

function SentenceEditorCardComponent({
  item,
  index,
  isShortVideo,
  sceneDurationSeconds,
  isFirst,
  isLast,

  onOpenSoundEffectsLibrary,
  onSoundEffectsChange,
  onAlignSoundEffectsToSceneEndChange,
  onUploadSoundEffect,
  isUploadingSoundEffect,
  onSaveSoundEffectsMix,
  isSavingSoundEffectsMix,

  onSelectVideoFromLibrary,
  onSaveVideoToLibrary,
  isSavingVideoToLibrary = false,

  videoModel,

  scriptCharacters,
  onForcedCharacterKeysChange,

  scriptLocations,
  onForcedLocationKeyChange,
  imageFilterPresets,
  motionEffectPresets,
  textAnimationPresets,
  overlayPresets,
  isLoadingImageFilterPresets,
  isLoadingMotionEffectPresets,
  isLoadingTextAnimationPresets,
  isLoadingOverlayPresets,
  onSentencePatch,
  onSaveImageFilterPreset,
  onUpdateImageFilterPreset,
  onDeleteImageFilterPreset,
  onSaveMotionEffectPreset,
  onUpdateMotionEffectPreset,
  onDeleteMotionEffectPreset,
  onSaveTextAnimationPreset,
  onUpdateTextAnimationPreset,
  onDeleteTextAnimationPreset,
  onSaveOverlayPreset,
  onDeleteOverlayPreset,
  onGenerateSingleImageLookWithAi,
  onGenerateSingleImageMotionWithAi,

  onVisualEffectChange,
  onImageMotionEffectChange,
  onImageMotionSpeedChange,

  enhanceError,
  isEnhancing,
  isApplyingPrompt,
  isEnhanceMenuOpen,
  onToggleEnhanceMenu,
  onAutoEnhance,
  onCustomPrompt,

  onMergeUp,
  onMergeDown,
  onRequestDelete,

  onSentenceTextChange,
  onSentenceMediaModeChange,

  onSentenceImageUpload,
  onSentenceVideoUpload,
  onSentenceFrameImageUpload,

  onGenerateSentenceImage,
  onGenerateSentenceReferenceImage,
  onGenerateSentenceFrameImage,
  onSelectFromLibrary,
  onAddSentenceImageSlot,
  onRemoveSentenceImage,
  onRemoveSentenceFrameImage,

  onOpenEnhanceImagePromptModal,
  isApplyingImagePrompt,
  imagePromptError,

  isGeneratingVideo,
  onGenerateVideo,
  onRemoveGeneratedVideo,
  onVideoGenerationModeChange,
  onVideoPromptChange,
  onSentenceReferenceImageUpload,
  onRemoveReferenceImage,

  isGeneratingVideoPrompt,
  onGenerateVideoPrompt,

  onPreviewImage,
}: SentenceEditorCardProps) {
  const videoAspectClass = isShortVideo ? 'aspect-9/16' : 'aspect-video';
  const generatedVideoClassName = isShortVideo
    ? 'block w-full aspect-9/16 object-cover h-96'
    : 'block w-full aspect-video object-cover';
  const hasAnyVideo = Boolean(item.video || item.videoUrl);
  const isSubscribeClip = item.videoUrl === '/subscribe.mp4';
  const canSaveCurrentVideoToLibrary = Boolean(
    onSaveVideoToLibrary && !isSubscribeClip && hasAnyVideo,
  );
  const isCurrentVideoSaved = Boolean(item.savedVideoId) && !isSubscribeClip;
  const hasAnyImage = Boolean(
    item.image || item.imageUrl || item.secondaryImage || item.secondaryImageUrl,
  );
  const legacyMediaMode: 'single' | 'frames' = item.mediaMode ?? 'single';
  const sceneTab = item.sceneTab ?? (legacyMediaMode === 'frames' ? 'video' : 'image');
  const isImageSceneTab = sceneTab === 'image';
  const isVideoSceneTab = sceneTab === 'video';
  const isTextSceneTab = sceneTab === 'text';
  const isOverlaySceneTab = sceneTab === 'overlay';
  const mediaMode: 'single' | 'frames' = isVideoSceneTab ? 'frames' : 'single';

  const soundEffects = useMemo(
    () => (Array.isArray(item.soundEffects) ? item.soundEffects : []),
    [item.soundEffects],
  );
  const soundEffectsStackDuration = getSentenceSoundEffectsStackDuration(soundEffects, {
    ignoreOffsets: true,
  });
  const hasUnknownSoundEffectDuration =
    soundEffects.length > 0 && soundEffectsStackDuration === null;
  const canCompareStackToSceneDuration =
    typeof sceneDurationSeconds === 'number' && Number.isFinite(sceneDurationSeconds);
  const soundEffectsOverflowScene =
    canCompareStackToSceneDuration &&
    soundEffectsStackDuration !== null &&
    soundEffectsStackDuration > (sceneDurationSeconds ?? 0) + 0.0001;
  const isAlignSoundEffectsToSceneEndEnabled = item.alignSoundEffectsToSceneEnd === true;
  const isAlignSoundEffectsToSceneEndDisabled =
    soundEffects.length === 0 || hasUnknownSoundEffectDuration || soundEffectsOverflowScene;
  const soundEffectSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const normalizeSoundEffects = (
    next: NonNullable<SentenceItem['soundEffects']>,
  ): NonNullable<SentenceItem['soundEffects']> => {
    return (Array.isArray(next) ? next : []).map((effect, index) => ({
      ...effect,
      timingMode:
        index === 0
          ? 'withPrevious'
          : effect?.timingMode === 'afterPreviousEnds'
            ? 'afterPreviousEnds'
            : 'withPrevious',
    }));
  };

  const commitSoundEffects = (
    next: NonNullable<SentenceItem['soundEffects']>,
  ) => {
    onSoundEffectsChange(normalizeSoundEffects(next));
  };

  useEffect(() => {
    if (!isAlignSoundEffectsToSceneEndEnabled) return;
    if (!isAlignSoundEffectsToSceneEndDisabled) return;
    onAlignSoundEffectsToSceneEndChange(false);
  }, [
    isAlignSoundEffectsToSceneEndDisabled,
    isAlignSoundEffectsToSceneEndEnabled,
    onAlignSoundEffectsToSceneEndChange,
  ]);

  const [mixStatus, setMixStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [singleStatusByIndex, setSingleStatusByIndex] = useState<
    Record<number, 'idle' | 'loading' | 'playing'>
  >({});

  const [isSoundEffectsOpen, setIsSoundEffectsOpen] = useState(false);
  const [isUploadingSoundEffectLocal, setIsUploadingSoundEffectLocal] = useState(false);

  const [editingSoundEffectIndex, setEditingSoundEffectIndex] = useState<number | null>(null);
  const [isSavingSoundEffectEdit, setIsSavingSoundEffectEdit] = useState(false);
  const [soundEffectEditError, setSoundEffectEditError] = useState<string | null>(null);
  const [mixEditDraft, setMixEditDraft] = useState<{
    audioUrl: string;
    name: string;
    volumePercent: number;
    audioSettings: SoundEffectAudioSettings;
  } | null>(null);
  const [isLoadingSoundEffectMixEditor, setIsLoadingSoundEffectMixEditor] = useState(false);
  const [isApplyingSoundEffectMixEdit, setIsApplyingSoundEffectMixEdit] = useState(false);
  const [isSavingSoundEffectMixPreset, setIsSavingSoundEffectMixPreset] = useState(false);
  const [soundEffectMixError, setSoundEffectMixError] = useState<string | null>(null);
  const [soundEffectMixNotice, setSoundEffectMixNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const soundEffectsPreviewRef = useRef<{
    timeouts: number[];
    audios: HTMLAudioElement[];
    cleanups: Array<() => void | Promise<void>>;
  }>({ timeouts: [], audios: [], cleanups: [] });

  const soundEffectsEverStartedRef = useRef<Set<string>>(new Set());

  const truncateSoundEffectTitle = (value: string) => {
    const v = String(value ?? '').trim();
    if (!v) return 'Sound effect';
    return v.length > 18 ? `${v.slice(0, 18)}…` : v;
  };

  const getSfxPreviewKey = (sfx: { id?: unknown; url: string }) => {
    const id = sfx.id;
    if (typeof id === 'string' && id.trim().length > 0) return `id:${id}`;
    return `url:${String(sfx.url ?? '')}`;
  };

  const getSharedSoundEffectVolume = () => {
    if (soundEffects.length === 0) return 100;
    const normalizedVolumes = soundEffects.map((effect) =>
      Math.max(0, Math.min(300, Number(effect.volumePercent ?? 100) || 100)),
    );
    const firstVolume = normalizedVolumes[0] ?? 100;
    return normalizedVolumes.every((volume) => Math.abs(volume - firstVolume) < 0.0001)
      ? firstVolume
      : 100;
  };

  const getSharedSoundEffectAudioSettings = () => {
    if (soundEffects.length === 0) {
      return cloneSoundEffectAudioSettings(DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS);
    }

    const normalized = soundEffects.map((effect) =>
      normalizeSoundEffectAudioSettings(
        effect.audioSettings ?? effect.defaultAudioSettings ?? DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
      ),
    );
    const baseline = JSON.stringify(normalized[0] ?? DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS);

    return cloneSoundEffectAudioSettings(
      normalized.every((settings) => JSON.stringify(settings) === baseline)
        ? normalized[0] ?? DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS
        : DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
    );
  };

  const mergeSoundEffectSettingsPreservingTrim = (
    baseSettings: SoundEffectAudioSettings,
    currentSettings: unknown,
  ): SoundEffectAudioSettings => {
    const currentNormalized = normalizeSoundEffectAudioSettings(
      currentSettings ?? DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
    );

    return {
      ...baseSettings,
      trim: {
        startSeconds: currentNormalized.trim.startSeconds,
        durationSeconds: currentNormalized.trim.durationSeconds,
      },
    };
  };

  const buildSentenceSoundEffectMergeItems = () => {
    const timedSoundEffects = computeSentenceSoundEffectTiming(soundEffects, {
      ignoreOffsets: isAlignSoundEffectsToSceneEndEnabled,
    });

    return timedSoundEffects.map((effect) => ({
      sound_effect_id: effect.id,
      delay_seconds: Math.max(0, Number(effect.absoluteDelaySeconds ?? 0) || 0),
      volume_percent: Math.max(0, Math.min(300, Number(effect.volumePercent ?? 100) || 100)),
      trim_start_seconds: Math.max(0, Number(effect.trimStartSeconds ?? 0) || 0),
      duration_seconds:
        typeof effect.durationSeconds === 'number' && Number.isFinite(effect.durationSeconds)
          ? Math.max(0, effect.durationSeconds)
          : null,
    }));
  };

  const handleOpenSoundEffectMixEditor = async () => {
    if (soundEffects.length < 2) return;

    stopAllScheduledAudio();
    setSoundEffectMixNotice(null);
    setSoundEffectMixError(null);
    setIsLoadingSoundEffectMixEditor(true);

    const fallbackTitle = `Sentence ${index + 1} SFX mix`;

    try {
      const response = await api.post<{
        title?: string;
        url: string;
      }>('/sound-effects/merge-preview', {
        title: fallbackTitle,
        items: buildSentenceSoundEffectMergeItems(),
      });

      setMixEditDraft({
        audioUrl: response.data.url,
        name: String(response.data.title ?? fallbackTitle).trim() || fallbackTitle,
        volumePercent: getSharedSoundEffectVolume(),
        audioSettings: getSharedSoundEffectAudioSettings(),
      });
    } catch (error) {
      setSoundEffectMixNotice({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to open the mix editor. Try again.'),
      });
    } finally {
      setIsLoadingSoundEffectMixEditor(false);
    }
  };

  const stopAllScheduledAudio = () => {
    const timeouts = soundEffectsPreviewRef.current.timeouts;
    const audios = soundEffectsPreviewRef.current.audios;
    const cleanups = soundEffectsPreviewRef.current.cleanups;

    for (const t of timeouts) window.clearTimeout(t);
    soundEffectsPreviewRef.current.timeouts = [];

    for (const audio of audios) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
    }
    soundEffectsPreviewRef.current.audios = [];

    for (const cleanup of cleanups) {
      try {
        void cleanup();
      } catch {
        // ignore cleanup errors
      }
    }
    soundEffectsPreviewRef.current.cleanups = [];

    setMixStatus('idle');
    setSingleStatusByIndex({});
  };

  const scheduleAudio = (params: {
    url: string;
    delaySeconds: number;
    volumePercent: number;
    audioSettings?: SoundEffectAudioSettings | null;
    trimStartSeconds?: number;
    trimDurationSeconds?: number | null;
    onPlaying?: () => void;
    onEnded?: () => void;
    onError?: () => void;
  }) => {
    const audio = new Audio(params.url);
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    let previewCleanup: (() => Promise<void>) | null = null;
    let previewTailTimeoutId: number | null = null;
    let previewTailDelayMs = 0;
    let isPreviewCleanedUp = false;

    const cleanupPreview = () => {
      if (previewTailTimeoutId !== null) {
        window.clearTimeout(previewTailTimeoutId);
        previewTailTimeoutId = null;
      }
      if (isPreviewCleanedUp) return;
      isPreviewCleanedUp = true;

      try {
        audio.currentTime = 0;
      } catch {
        // ignore seek errors during cleanup
      }

      if (previewCleanup) {
        void previewCleanup();
        previewCleanup = null;
      }
    };

    let isFinalized = false;
    const finalizeEnded = () => {
      if (isFinalized) return;
      isFinalized = true;
      cleanupPreview();
      params.onEnded?.();
    };
    const finalizeError = () => {
      if (isFinalized) return;
      isFinalized = true;
      cleanupPreview();
      params.onError?.();
    };

    const finalizeEndedWithTail = () => {
      if (isFinalized) return;
      if (previewTailDelayMs <= 0) {
        finalizeEnded();
        return;
      }

      previewTailTimeoutId = window.setTimeout(() => {
        previewTailTimeoutId = null;
        finalizeEnded();
      }, previewTailDelayMs);
      soundEffectsPreviewRef.current.timeouts.push(previewTailTimeoutId);
    };

    audio.onended = finalizeEndedWithTail;
    audio.onerror = finalizeError;
    soundEffectsPreviewRef.current.audios.push(audio);

    const delayMs = Math.max(0, Number(params.delaySeconds) || 0) * 1000;
    const timeoutId = window.setTimeout(() => {
      const startPlayback = async () => {
        const trimStartSeconds = Math.max(0, Number(params.trimStartSeconds ?? 0) || 0);
        const trimDurationSeconds =
          typeof params.trimDurationSeconds === 'number' && Number.isFinite(params.trimDurationSeconds)
            ? Math.max(0, params.trimDurationSeconds)
            : null;

        const previewGraph = createSoundEffectPreviewGraph({
          audioElement: audio,
          volumePercent: params.volumePercent,
          audioSettings: params.audioSettings,
        });

        if (previewGraph) {
          previewCleanup = previewGraph.cleanup;
          previewTailDelayMs = Math.max(0, previewGraph.tailDurationSeconds) * 1000;
          soundEffectsPreviewRef.current.cleanups.push(previewGraph.cleanup);
          await previewGraph.audioContext.resume().catch(() => undefined);
        } else {
          audio.volume = Math.max(0, Math.min(1, (Number(params.volumePercent) || 0) / 100));
        }

        if (trimStartSeconds > 0) {
          try {
            audio.currentTime = trimStartSeconds;
          } catch {
            // ignore seek errors before playback
          }
        }

        const playPromise = audio.play();
        if (!playPromise || typeof (playPromise as Promise<void>).then !== 'function') {
          params.onPlaying?.();
        } else {
          void (playPromise as Promise<void>)
            .then(() => {
              params.onPlaying?.();
            })
            .catch(() => {
              finalizeError();
            });
        }

        if (trimDurationSeconds && trimDurationSeconds > 0) {
          const stopTimeoutId = window.setTimeout(() => {
            try {
              audio.pause();
            } catch {
              // ignore
            }
            finalizeEndedWithTail();
          }, trimDurationSeconds * 1000);
          soundEffectsPreviewRef.current.timeouts.push(stopTimeoutId);
        }
      };

      if (audio.readyState >= 1) {
        void startPlayback();
        return;
      }

      const handleLoadedMetadata = () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        void startPlayback();
      };
      audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      audio.load();
    }, delayMs);

    soundEffectsPreviewRef.current.timeouts.push(timeoutId);
  };

  const playMix = () => {
    if (soundEffects.length === 0) return;

    // Stop any single first.
    stopAllScheduledAudio();

    const timedSoundEffects = computeSentenceSoundEffectTiming(soundEffects, {
      ignoreOffsets: isAlignSoundEffectsToSceneEndEnabled,
    });
    const shouldShowLoading = timedSoundEffects.some((sfx) => {
      const key = getSfxPreviewKey({ id: sfx.id, url: sfx.url });
      return !soundEffectsEverStartedRef.current.has(key);
    });
    setMixStatus(shouldShowLoading ? 'loading' : 'playing');

    let ended = 0;
    const total = timedSoundEffects.length;

    for (const sfx of timedSoundEffects) {
      const key = getSfxPreviewKey({ id: sfx.id, url: sfx.url });
      scheduleAudio({
        url: sfx.url,
        delaySeconds: sfx.absoluteDelaySeconds,
        volumePercent: sfx.volumePercent,
        audioSettings: sfx.audioSettings,
        trimStartSeconds: sfx.trimStartSeconds,
        trimDurationSeconds: sfx.durationSeconds,
        onPlaying: () => {
          soundEffectsEverStartedRef.current.add(key);
          setMixStatus('playing');
        },
        onEnded: () => {
          ended += 1;
          if (ended >= total) setMixStatus('idle');
        },
        onError: () => {
          // Autoplay policy or load error.
          setMixStatus('idle');
        },
      });
    }
  };

  const playSingle = (sfxIndex: number) => {
    const sfx = soundEffects[sfxIndex];
    if (!sfx) return;

    const key = getSfxPreviewKey({ id: sfx.id, url: sfx.url });
    const shouldShowLoading = !soundEffectsEverStartedRef.current.has(key);

    // Stop any mix first.
    stopAllScheduledAudio();
    setSingleStatusByIndex({ [sfxIndex]: shouldShowLoading ? 'loading' : 'playing' });

    const trimWindow = resolveSoundEffectTrimWindow(
      sfx.audioSettings,
      sfx.durationSeconds ?? null,
    );

    scheduleAudio({
      url: sfx.url,
      delaySeconds: isAlignSoundEffectsToSceneEndEnabled
        ? 0
        : Math.max(0, Number(sfx.delaySeconds ?? 0) || 0),
      volumePercent: sfx.volumePercent,
      audioSettings: sfx.audioSettings,
      trimStartSeconds: trimWindow.startSeconds,
      trimDurationSeconds: trimWindow.effectiveDurationSeconds,
      onPlaying: () => {
        soundEffectsEverStartedRef.current.add(key);
        setSingleStatusByIndex({ [sfxIndex]: 'playing' });
      },
      onEnded: () => setSingleStatusByIndex({}),
      onError: () => setSingleStatusByIndex({}),
    });
  };

  useEffect(() => {
    return () => {
      stopAllScheduledAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const videoGenerationMode =
    (item.videoGenerationMode ?? 'referenceImage') as NonNullable<
      SentenceItem['videoGenerationMode']
    >;

  const effectiveVideoGenerationMode =
    videoModel === 'grok' && videoGenerationMode === 'frames'
      ? 'referenceImage'
      : videoGenerationMode;

  const [isForcedCharactersOpen, setIsForcedCharactersOpen] = useState(false);
  const [isForcedLocationOpen, setIsForcedLocationOpen] = useState(false);
  const [imageEffectsTab, setImageEffectsTab] = useState<'visual' | 'motion' | 'text' | 'overlay'>('visual');
  const [isImageEffectsDetailModalOpen, setIsImageEffectsDetailModalOpen] = useState(false);
  const [isTextPreviewOverlayOpen, setIsTextPreviewOverlayOpen] = useState(false);
  const [isTextPreviewOverlayClosing, setIsTextPreviewOverlayClosing] = useState(false);
  const isUploadingSoundEffectActive = isUploadingSoundEffect || isUploadingSoundEffectLocal;
  const imageEffectsMode = item.imageEffectsMode ?? 'quick';
  const shouldAnimateImagePreview = isImageSceneTab;

  useEffect(() => {
    if (isOverlaySceneTab) {
      if (imageEffectsTab !== 'overlay') {
        setImageEffectsTab('overlay');
      }
      return;
    }

    if (isTextSceneTab) {
      if (imageEffectsTab === 'motion' || imageEffectsTab === 'overlay') {
        setImageEffectsTab('text');
      }
      return;
    }

    if (!isImageSceneTab && imageEffectsTab === 'motion') {
      setImageEffectsTab('visual');
    }
  }, [imageEffectsTab, isImageSceneTab, isOverlaySceneTab, isTextSceneTab]);

  const handleSoundEffectsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = soundEffects.findIndex(
      (sfx, index) => getSentenceSoundEffectSortableId(sfx, index) === active.id,
    );
    const newIndex = soundEffects.findIndex(
      (sfx, index) => getSentenceSoundEffectSortableId(sfx, index) === over.id,
    );

    if (oldIndex < 0 || newIndex < 0) return;
    commitSoundEffects(arrayMove(soundEffects, oldIndex, newIndex));
  };

  const forcedCount = Array.isArray(item.forcedCharacterKeys)
    ? item.forcedCharacterKeys.length
    : 0;
  const canPickForcedCharacters = Array.isArray(scriptCharacters) && scriptCharacters.length > 0;

  const canPickForcedLocation = Array.isArray(scriptLocations) && scriptLocations.length > 0;
  const forcedLocationKey = String(item.forcedLocationKey ?? '').trim() || null;

  const visualEffectValue = useMemo(
    () =>
      item.visualEffect && item.visualEffect !== 'none'
        ? item.visualEffect
        : '__none__',
    [item.visualEffect],
  );

  const visualEffectLabel = useMemo(
    () =>
      visualEffectValue === '__none__' ? 'None' : getVisualEffectLabel(visualEffectValue),
    [visualEffectValue],
  );

  const imageMotionEffectValue = item.imageMotionEffect ?? 'default';
  const imageMotionEffectLabel = useMemo(
    () => getImageMotionEffectLabel(imageMotionEffectValue),
    [imageMotionEffectValue],
  );
  const resolvedImageFilterSettings = useMemo(
    () => normalizeImageFilterSettings(item.imageFilterSettings, item.visualEffect ?? null),
    [item.imageFilterSettings, item.visualEffect],
  );
  const resolvedImageMotionSettings = useMemo(
    () => {
      const resolvedImageMotionSpeed = resolveImageMotionSpeed(
        item.imageMotionSpeed,
        item.imageMotionSettings,
        isShortVideo,
      );

      return normalizeImageMotionSettings(
        item.imageMotionSettings,
        item.imageMotionEffect ?? 'default',
        resolvedImageMotionSpeed,
        isShortVideo,
      );
    },
    [isShortVideo, item.imageMotionEffect, item.imageMotionSettings, item.imageMotionSpeed],
  );
  const [retainedTemporaryLook, setRetainedTemporaryLook] = useState<{
    visualEffect: SentenceItem['visualEffect'] | null;
    imageFilterSettings: ImageFilterSettings;
  } | null>(() =>
    !item.customImageFilterId && item.imageFilterSettings?.presetKey === 'custom'
      ? {
        visualEffect:
          resolveVisualEffectFromSettings(item.imageFilterSettings, item.visualEffect ?? null) ??
          item.visualEffect ??
          null,
        imageFilterSettings: normalizeImageFilterSettings(
          item.imageFilterSettings,
          item.visualEffect ?? null,
        ),
      }
      : null,
  );
  const [retainedTemporaryMotion, setRetainedTemporaryMotion] = useState<{
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
  } | null>(() => {
    const resolvedSpeed = resolveImageMotionSpeed(
      item.imageMotionSpeed,
      item.imageMotionSettings,
      isShortVideo,
    );

    return !item.customMotionEffectId && item.imageMotionSettings?.presetKey === 'custom'
      ? {
        imageMotionEffect: resolveMotionEffectFromSettings(
          item.imageMotionSettings,
          item.imageMotionEffect ?? 'default',
        ),
        imageMotionSettings: normalizeImageMotionSettings(
          item.imageMotionSettings,
          item.imageMotionEffect ?? 'default',
          resolvedSpeed,
          isShortVideo,
        ),
        imageMotionSpeed: resolvedSpeed,
      }
      : null;
  });

  useEffect(() => {
    if (!item.customImageFilterId && item.imageFilterSettings?.presetKey === 'custom') {
      setRetainedTemporaryLook({
        visualEffect:
          resolveVisualEffectFromSettings(item.imageFilterSettings, item.visualEffect ?? null) ??
          item.visualEffect ??
          null,
        imageFilterSettings: resolvedImageFilterSettings,
      });
    }
  }, [item.customImageFilterId, item.imageFilterSettings, item.visualEffect, resolvedImageFilterSettings]);

  useEffect(() => {
    if (!item.customMotionEffectId && item.imageMotionSettings?.presetKey === 'custom') {
      setRetainedTemporaryMotion({
        imageMotionEffect: resolveMotionEffectFromSettings(
          item.imageMotionSettings,
          item.imageMotionEffect ?? 'default',
        ),
        imageMotionSettings: resolvedImageMotionSettings,
        imageMotionSpeed: resolveImageMotionSpeed(
          item.imageMotionSpeed,
          item.imageMotionSettings,
          isShortVideo,
        ),
      });
    }
  }, [
    isShortVideo,
    item.customMotionEffectId,
    item.imageMotionEffect,
    item.imageMotionSettings,
    item.imageMotionSpeed,
    resolvedImageMotionSettings,
  ]);

  const quickLookSelectValue = useMemo(
    () =>
      item.customImageFilterId
        ? `custom:${item.customImageFilterId}`
        : item.imageFilterSettings?.presetKey === 'custom'
          ? `custom:${TEMPORARY_CUSTOM_PRESET_ID}`
          : `builtin:${resolveVisualEffectFromSettings(item.imageFilterSettings, item.visualEffect ?? null) ?? 'none'}`,
    [item.customImageFilterId, item.imageFilterSettings, item.visualEffect],
  );
  const quickMotionSelectValue = useMemo(
    () =>
      item.customMotionEffectId
        ? `custom:${item.customMotionEffectId}`
        : item.imageMotionSettings?.presetKey === 'custom'
          ? `custom:${TEMPORARY_CUSTOM_PRESET_ID}`
          : `builtin:${resolveMotionEffectFromSettings(item.imageMotionSettings, item.imageMotionEffect ?? 'default')}`,
    [item.customMotionEffectId, item.imageMotionEffect, item.imageMotionSettings],
  );
  const resolvedTextAnimationEffect = useMemo(
    () => resolveTextAnimationEffectFromSettings(item.textAnimationSettings, item.textAnimationEffect),
    [item.textAnimationEffect, item.textAnimationSettings],
  );
  const resolvedTextAnimationSettings = useMemo(
    () =>
      normalizeTextAnimationSettings(
        item.textAnimationSettings,
        resolvedTextAnimationEffect,
        isShortVideo,
      ),
    [isShortVideo, item.textAnimationSettings, resolvedTextAnimationEffect],
  );
  const resolvedTextAnimationLabel = useMemo(
    () => getTextAnimationEffectLabel(resolvedTextAnimationEffect),
    [resolvedTextAnimationEffect],
  );
  const resolvedOverlaySettings = useMemo(
    () => normalizeOverlaySettings(item.overlaySettings, 'image'),
    [item.overlaySettings],
  );
  const selectedOverlayPreset = useMemo(
    () => overlayPresets.find((preset) => preset.id === item.customOverlayId) ?? null,
    [item.customOverlayId, overlayPresets],
  );
  const selectedOverlayPresetSettings = useMemo(
    () =>
      selectedOverlayPreset
        ? normalizeOverlaySettings(
            selectedOverlayPreset.settings,
            resolvedOverlaySettings.backgroundMode ?? 'image',
          )
        : null,
    [resolvedOverlaySettings.backgroundMode, selectedOverlayPreset],
  );
  const isOverlayDirtyFromSelectedPreset = Boolean(
    selectedOverlayPreset &&
      (Boolean(item.overlayFile) ||
        String(selectedOverlayPreset.url ?? '').trim() !== String(item.overlayUrl ?? '').trim() ||
        String(selectedOverlayPreset.mimeType ?? '').trim() !== String(item.overlayMimeType ?? '').trim() ||
        JSON.stringify(selectedOverlayPresetSettings) !== JSON.stringify(resolvedOverlaySettings)),
  );
  const quickTextAnimationSelectValue = useMemo(
    () =>
      item.customTextAnimationId
        ? `custom:${item.customTextAnimationId}`
        : item.textAnimationSettings?.presetKey === 'custom'
          ? `custom:${TEMPORARY_CUSTOM_PRESET_ID}`
          : `builtin:${resolvedTextAnimationEffect}`,
    [item.customTextAnimationId, item.textAnimationSettings?.presetKey, resolvedTextAnimationEffect],
  );
  const quickOverlaySelectValue = useMemo(
    () =>
      item.customOverlayId && !isOverlayDirtyFromSelectedPreset
        ? `custom:${item.customOverlayId}`
        : item.overlayFile || item.overlayUrl
          ? `custom:${TEMPORARY_CUSTOM_PRESET_ID}`
          : '__none__',
    [isOverlayDirtyFromSelectedPreset, item.customOverlayId, item.overlayFile, item.overlayUrl],
  );

  const imagePreviewObjectUrl = useManagedObjectUrl(item.image);
  const videoPreviewObjectUrl = useManagedObjectUrl(item.video);
  const secondaryImagePreviewObjectUrl = useManagedObjectUrl(item.secondaryImage);
  const startPreviewObjectUrl = useManagedObjectUrl(item.startImage);
  const endPreviewObjectUrl = useManagedObjectUrl(item.endImage);
  const referencePreviewObjectUrl = useManagedObjectUrl(item.referenceImage);
  const textBackgroundPreviewObjectUrl = useManagedObjectUrl(item.textBackgroundImage);
  const textBackgroundVideoPreviewObjectUrl = useManagedObjectUrl(item.textBackgroundVideo);
  const overlayPreviewObjectUrl = useManagedObjectUrl(item.overlayFile);

  const imagePreviewUrl = imagePreviewObjectUrl ?? item.imageUrl ?? null;
  const videoPreviewUrl = videoPreviewObjectUrl ?? item.videoUrl ?? null;
  const secondaryImagePreviewUrl = secondaryImagePreviewObjectUrl ?? item.secondaryImageUrl ?? null;
  const startPreviewUrl = startPreviewObjectUrl ?? item.startImageUrl ?? null;
  const endPreviewUrl = endPreviewObjectUrl ?? item.endImageUrl ?? null;
  const referencePreviewUrl = referencePreviewObjectUrl ?? item.referenceImageUrl ?? null;
  const textBackgroundPreviewUrl =
    textBackgroundPreviewObjectUrl ?? item.textBackgroundImageUrl ?? null;
  const textBackgroundVideoPreviewUrl =
    textBackgroundVideoPreviewObjectUrl ?? item.textBackgroundVideoUrl ?? null;
  const overlayPreviewUrl = overlayPreviewObjectUrl ?? item.overlayUrl ?? null;
  const textPreviewBackgroundUrl =
    resolvedTextAnimationSettings.backgroundMode === 'image'
      ? textBackgroundPreviewUrl
      : resolvedTextAnimationSettings.backgroundMode === 'inheritImage'
        ? imagePreviewUrl
        : null;
  const textPreviewBackgroundVideoUrl =
    resolvedTextAnimationSettings.backgroundMode === 'video'
      ? textBackgroundVideoPreviewUrl
      : resolvedTextAnimationSettings.backgroundMode === 'inheritVideo'
        ? videoPreviewUrl
        : null;
  const detailSceneKind = isOverlaySceneTab
    ? 'overlay'
    : isTextSceneTab
      ? 'text'
      : isVideoSceneTab
        ? 'video'
        : 'image';
  const detailPreviewUrl =
    imagePreviewUrl ??
    secondaryImagePreviewUrl ??
    startPreviewUrl ??
    referencePreviewUrl ??
    endPreviewUrl ??
    null;
  const detailImagePreviewUrl = isVideoSceneTab ? null : detailPreviewUrl;
  const detailVideoPreviewUrl = isVideoSceneTab ? videoPreviewUrl : null;
  const showSecondaryImageSlot =
    isImageSceneTab &&
    !hasAnyVideo &&
    (item.hasSecondaryImageSlot === true || Boolean(secondaryImagePreviewUrl));
  const hasStart = Boolean(startPreviewUrl);
  const hasEnd = Boolean(endPreviewUrl);
  const canGenerateVideo =
    isVideoSceneTab &&
    (effectiveVideoGenerationMode === 'frames'
      ? hasStart && hasEnd
      : effectiveVideoGenerationMode === 'text'
        ? Boolean(String(item.videoPrompt ?? '').trim())
        : Boolean(referencePreviewUrl) && Boolean(String(item.videoPrompt ?? '').trim()));

  const videoModeLabel =
    effectiveVideoGenerationMode === 'text'
      ? 'Text'
      : effectiveVideoGenerationMode === 'referenceImage'
        ? 'Reference'
        : 'Frames';

  const [isVideoModeMenuOpen, setIsVideoModeMenuOpen] = useState(false);
  const [isVideoModeMenuMounted, setIsVideoModeMenuMounted] = useState(false);
  const [isVideoModeMenuShown, setIsVideoModeMenuShown] = useState(false);
  const videoModeMenuRef = useRef<HTMLDivElement | null>(null);

  const handleLookPresetSelect = (value: string) => {
    if (value.startsWith('custom:')) {
      const presetId = value.slice('custom:'.length);
      if (presetId === TEMPORARY_CUSTOM_PRESET_ID) {
        if (!retainedTemporaryLook) return;

        onSentencePatch({
          visualEffect: retainedTemporaryLook.visualEffect,
          customImageFilterId: null,
          imageFilterSettings: {
            ...retainedTemporaryLook.imageFilterSettings,
            presetKey: 'custom',
          },
        });
        return;
      }
      const preset = imageFilterPresets.find((item) => item.id === presetId);
      if (!preset) return;

      const nextSettings = normalizeImageFilterSettings(preset.settings, item.visualEffect ?? null);
      onSentencePatch({
        visualEffect: resolveVisualEffectFromSettings(nextSettings, item.visualEffect ?? null),
        customImageFilterId: preset.id,
        imageFilterSettings: { ...nextSettings, presetKey: 'custom' },
      });
      return;
    }

    const effect = value.slice('builtin:'.length) as SentenceItem['visualEffect'];
    const normalizedEffect = effect === 'none' ? null : effect;
    onSentencePatch({
      visualEffect: normalizedEffect,
      customImageFilterId: null,
      imageFilterSettings: getDefaultImageFilterSettings(normalizedEffect),
    });
  };

  const handleMotionPresetSelect = (value: string) => {
    if (value.startsWith('custom:')) {
      const presetId = value.slice('custom:'.length);
      if (presetId === TEMPORARY_CUSTOM_PRESET_ID) {
        if (!retainedTemporaryMotion) return;

        onSentencePatch({
          imageMotionEffect: retainedTemporaryMotion.imageMotionEffect,
          customMotionEffectId: null,
          imageMotionSettings: {
            ...retainedTemporaryMotion.imageMotionSettings,
            presetKey: 'custom',
          },
          imageMotionSpeed: retainedTemporaryMotion.imageMotionSpeed,
        });
        return;
      }
      const preset = motionEffectPresets.find((item) => item.id === presetId);
      if (!preset) return;

      const nextSettings = normalizeImageMotionSettings(
        preset.settings,
        item.imageMotionEffect ?? 'default',
        resolveImageMotionSpeed(item.imageMotionSpeed, item.imageMotionSettings, isShortVideo),
        isShortVideo,
      );
      onSentencePatch({
        imageMotionEffect: resolveMotionEffectFromSettings(
          nextSettings,
          item.imageMotionEffect ?? 'default',
        ),
        customMotionEffectId: preset.id,
        imageMotionSettings: { ...nextSettings, presetKey: 'custom' },
        imageMotionSpeed: nextSettings.speed ?? getDefaultImageMotionSpeed(isShortVideo),
      });
      return;
    }

    const effect = value.slice('builtin:'.length) as NonNullable<SentenceItem['imageMotionEffect']>;
    const nextSettings = getDefaultImageMotionSettings(
      effect,
      resolveImageMotionSpeed(item.imageMotionSpeed, item.imageMotionSettings, isShortVideo),
      isShortVideo,
    );
    onSentencePatch({
      imageMotionEffect: effect,
      customMotionEffectId: null,
      imageMotionSettings: nextSettings,
      imageMotionSpeed: nextSettings.speed ?? getDefaultImageMotionSpeed(isShortVideo),
    });
  };

  const handleTextAnimationPresetSelect = (value: string) => {
    if (value.startsWith('custom:')) {
      const presetId = value.slice('custom:'.length);
      if (presetId === TEMPORARY_CUSTOM_PRESET_ID) return;

      const preset = textAnimationPresets.find((candidate) => candidate.id === presetId);
      if (!preset) return;

      const nextEffect = resolveTextAnimationEffectFromSettings(
        preset.settings,
        item.textAnimationEffect ?? resolvedTextAnimationEffect,
      );
      const nextSettings = normalizeTextAnimationSettings(
        preset.settings,
        nextEffect,
        isShortVideo,
      );

      onSentencePatch({
        textAnimationEffect: nextEffect,
        customTextAnimationId: preset.id,
        textAnimationSettings: { ...nextSettings, presetKey: 'custom' },
        textSoundEffects: cloneDetachedSentenceSoundEffects(preset.soundEffects),
      });
      return;
    }

    const effect = value.slice('builtin:'.length) as SentenceItem['textAnimationEffect'];
    onSentencePatch({
      textAnimationEffect: effect,
      customTextAnimationId: null,
      textAnimationSettings: getTextAnimationSettingsForEffectChange(
        effect,
        item.textAnimationSettings,
        isShortVideo,
      ),
      textSoundEffects: [],
    });
  };

  const handleOverlayPresetSelect = (value: string) => {
    if (value === '__none__') {
      onSentencePatch({
        customOverlayId: null,
        overlayFile: null,
        overlayUrl: null,
        overlayMimeType: null,
        overlaySoundEffects: [],
        overlaySettings: {
          ...resolvedOverlaySettings,
          presetKey: 'custom',
        },
      });
      return;
    }

    if (!value.startsWith('custom:')) return;

    const presetId = value.slice('custom:'.length);
    if (presetId === TEMPORARY_CUSTOM_PRESET_ID) return;

    const preset = overlayPresets.find((candidate) => candidate.id === presetId);
    if (!preset) return;

    const nextSettings = normalizeOverlaySettings(
      preset.settings,
      resolvedOverlaySettings.backgroundMode ?? 'image',
    );

    onSentencePatch({
      customOverlayId: preset.id,
      overlayFile: null,
      overlayUrl: preset.url,
      overlayMimeType: preset.mimeType ?? null,
      overlaySettings: { ...nextSettings, presetKey: 'custom' },
      overlaySoundEffects: cloneDetachedSentenceSoundEffects(preset.soundEffects),
    });
  };

  const updateTextAnimationSettings = (patch: Partial<TextAnimationSettings>) => {
    onSentencePatch({
      customTextAnimationId: null,
      textAnimationSettings: {
        ...resolvedTextAnimationSettings,
        ...patch,
        presetKey: 'custom',
      },
    });
  };

  const handleOverlayUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;

    onSentencePatch({
      customOverlayId: null,
      overlayFile: file,
      overlayUrl: null,
      overlayMimeType: file.type || null,
      overlaySettings: {
        ...resolvedOverlaySettings,
        presetKey: 'custom',
      },
    });

    event.target.value = '';
  };

  const handleTextBackgroundUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file || !file.type.startsWith('image/')) return;

    onSentencePatch({
      textBackgroundImage: file,
      textBackgroundImageUrl: null,
      textBackgroundSavedImageId: null,
      customTextAnimationId: null,
      textAnimationSettings: {
        ...resolvedTextAnimationSettings,
        backgroundMode: 'image',
        presetKey: 'custom',
      },
    });

    event.target.value = '';
  };

  const handleTextBackgroundVideoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file || !file.type.startsWith('video/')) return;

    onSentencePatch({
      textBackgroundVideo: file,
      textBackgroundVideoUrl: null,
      textBackgroundSavedVideoId: null,
      customTextAnimationId: null,
      textAnimationSettings: {
        ...resolvedTextAnimationSettings,
        backgroundMode: 'video',
        presetKey: 'custom',
      },
    });

    event.target.value = '';
  };

  const openImageEffectsModal = (tab: 'visual' | 'motion' | 'text' | 'overlay') => {
    setImageEffectsTab(tab);
    setIsImageEffectsDetailModalOpen(true);
  };

  const openTextPreviewOverlay = () => {
    setIsTextPreviewOverlayClosing(false);
    setIsTextPreviewOverlayOpen(true);
  };

  const closeTextPreviewOverlay = () => {
    if (isTextPreviewOverlayClosing) return;

    setIsTextPreviewOverlayClosing(true);
    window.setTimeout(() => {
      setIsTextPreviewOverlayOpen(false);
      setIsTextPreviewOverlayClosing(false);
    }, 200);
  };

  const openVideoModeMenu = () => {
    setIsVideoModeMenuMounted(true);
    setIsVideoModeMenuOpen(true);
    setIsVideoModeMenuShown(false);
    window.requestAnimationFrame(() => {
      setIsVideoModeMenuShown(true);
    });
  };

  const closeVideoModeMenu = () => {
    setIsVideoModeMenuShown(false);
    setIsVideoModeMenuOpen(false);
  };

  useEffect(() => {
    if (isVideoModeMenuOpen) return;
    if (!isVideoModeMenuMounted) return;
    const t = window.setTimeout(() => {
      setIsVideoModeMenuMounted(false);
    }, 170);
    return () => window.clearTimeout(t);
  }, [isVideoModeMenuOpen, isVideoModeMenuMounted]);

  useEffect(() => {
    if (!isVideoModeMenuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = videoModeMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      closeVideoModeMenu();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isVideoModeMenuOpen]);

  useEffect(() => {
    if (!item.videoUrl || item.videoUrl === '/subscribe.mp4') return;
    setIsVideoModeMenuShown(false);
    setIsVideoModeMenuOpen(false);
    setIsVideoModeMenuMounted(false);
  }, [item.videoUrl]);

  const detailEnabledTabs = useMemo<Array<'visual' | 'motion' | 'text' | 'overlay'>>(() => {
    if (isOverlaySceneTab) return ['overlay'];
    if (isTextSceneTab) return ['text'];
    if (isImageSceneTab) return ['visual', 'motion'];
    if (isVideoSceneTab) return ['visual'];
    return ['visual'];
  }, [isImageSceneTab, isOverlaySceneTab, isTextSceneTab, isVideoSceneTab]);

  return (
    <div
      className="group relative bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      <div className="p-4">
        {/* Centered media mode tabs (applies to whole scene) */}
        <div className="flex items-center justify-between pb-4 gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-linear-to-br from-gray-50 to-gray-100 rounded-2xl shadow-sm border border-gray-200">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onSentenceMediaModeChange('single')}
              className={
                isImageSceneTab
                  ? 'h-9 px-4 text-sm font-bold rounded-xl bg-white text-indigo-600 shadow-md hover:bg-white hover:text-indigo-600'
                  : 'h-9 px-4 text-sm font-semibold rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              {isImageSceneTab && <span>Image</span>}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onSentenceMediaModeChange('frames')}
              className={
                isVideoSceneTab
                  ? 'h-9 px-4 text-sm font-bold rounded-xl bg-white text-indigo-600 shadow-md hover:bg-white hover:text-indigo-600'
                  : 'h-9 px-4 text-sm font-semibold rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }
            >
              <VideoIcon className="h-4 w-4 mr-2" />
              {isVideoSceneTab && <span>Video</span>}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onSentencePatch({ sceneTab: 'text', mediaMode: 'single' })}
              className={
                isTextSceneTab
                  ? 'h-9 px-4 text-sm font-bold rounded-xl bg-white text-indigo-600 shadow-md hover:bg-white hover:text-indigo-600'
                  : 'h-9 px-4 text-sm font-semibold rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }
            >
              <FileText className="h-4 w-4 mr-2" />
              {isTextSceneTab && <span>Text</span>}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onSentencePatch({ sceneTab: 'overlay', mediaMode: 'single' })}
              className={
                isOverlaySceneTab
                  ? 'h-9 px-4 text-sm font-bold rounded-xl bg-white text-indigo-600 shadow-md hover:bg-white hover:text-indigo-600'
                  : 'h-9 px-4 text-sm font-semibold rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }
            >
              <Upload className="h-4 w-4 mr-2" />
              {isOverlaySceneTab && <span>Overlay</span>}
            </Button>
          </div>

          {isTextSceneTab ? (
            <div className="shrink-0 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-1.5 shadow-sm">
              <Select
                value={quickTextAnimationSelectValue}
                onValueChange={handleTextAnimationPresetSelect}
                disabled={isLoadingTextAnimationPresets}
              >
                <SelectTrigger
                  className="h-9 min-w-72 border-amber-200 bg-white text-gray-700 shadow-sm"
                  title={`Text animation preset: ${resolvedTextAnimationLabel}`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <SelectValue placeholder="Text animation" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {TEXT_ANIMATION_EFFECT_VALUES.map((value) => (
                    <SelectItem key={value} value={`builtin:${value}`}>
                      {getTextAnimationEffectLabel(value)}
                    </SelectItem>
                  ))}
                  {item.textAnimationSettings?.presetKey === 'custom' ? (
                    <SelectItem value={`custom:${TEMPORARY_CUSTOM_PRESET_ID}`}>
                      Custom
                    </SelectItem>
                  ) : null}
                  {textAnimationPresets.map((preset) => (
                    <SelectItem key={preset.id} value={`custom:${preset.id}`}>
                      {preset.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openImageEffectsModal('text')}
                className="h-9 rounded-xl border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Edit animation
              </Button>
            </div>
          ) : isOverlaySceneTab ? (
            <div className="shrink-0 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-1.5 shadow-sm">
              <Select
                value={quickOverlaySelectValue}
                onValueChange={handleOverlayPresetSelect}
                disabled={isLoadingOverlayPresets}
              >
                <SelectTrigger
                  className="h-9 min-w-72 border-emerald-200 bg-white text-gray-700 shadow-sm"
                  title={selectedOverlayPreset ? `Overlay preset: ${selectedOverlayPreset.title}` : 'Overlay preset'}
                >
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <SelectValue placeholder="Overlay preset" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="__none__">No saved preset</SelectItem>
                  {overlayPreviewUrl ? (
                    <SelectItem value={`custom:${TEMPORARY_CUSTOM_PRESET_ID}`}>
                      Custom draft
                    </SelectItem>
                  ) : null}
                  {overlayPresets.map((preset) => (
                    <SelectItem key={preset.id} value={`custom:${preset.id}`}>
                      {preset.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openImageEffectsModal('overlay')}
                className="h-9 rounded-xl border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Edit overlay
              </Button>
            </div>
          ) : (
            <div className="shrink-0 flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50/80 p-1.5 shadow-sm">
              <div className="inline-flex items-center gap-1 rounded-xl bg-white p-1 shadow-inner">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onSentencePatch({ imageEffectsMode: 'quick' })}
                  className={
                    imageEffectsMode === 'quick'
                      ? 'h-8 px-3 rounded-lg bg-linear-to-r hover:text-white from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                      : 'h-8 px-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                  title="Use quick image effect presets"
                >
                  Quick
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onSentencePatch({ imageEffectsMode: 'detailed' })}
                  className={
                    imageEffectsMode === 'detailed'
                      ? 'h-8 px-3 rounded-lg bg-linear-to-r hover:text-white from-sky-600 to-cyan-600 text-white hover:from-sky-700 hover:to-cyan-700'
                      : 'h-8 px-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                  title="Open detailed image effect controls"
                >
                  Detailed
                </Button>
              </div>

              {imageEffectsMode === 'quick' ? (
                <div className={isImageSceneTab ? 'grid min-w-88 grid-cols-1 gap-2 md:grid-cols-2' : 'min-w-44'}>
                  <Select value={quickLookSelectValue} onValueChange={handleLookPresetSelect}>
                    <SelectTrigger
                      className="h-9 w-full border-gray-200 bg-white text-gray-700 shadow-sm"
                      title={`Look preset: ${visualEffectLabel}`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        <SelectValue placeholder="Look" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectItem value="builtin:none">None</SelectItem>
                      {VISUAL_EFFECT_SELECT_VALUES.map((value) => (
                        <SelectItem key={value} value={`builtin:${value}`}>
                          {getVisualEffectLabel(value)}
                        </SelectItem>
                      ))}
                      {retainedTemporaryLook ? (
                        <SelectItem value={`custom:${TEMPORARY_CUSTOM_PRESET_ID}`}>
                          Custom
                        </SelectItem>
                      ) : null}
                      {imageFilterPresets.map((preset) => (
                        <SelectItem key={preset.id} value={`custom:${preset.id}`}>
                          {preset.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isImageSceneTab ? (
                    <Select
                      value={quickMotionSelectValue}
                      onValueChange={handleMotionPresetSelect}
                    >
                      <SelectTrigger
                        className="h-9 w-full border-gray-200 bg-white text-gray-700 shadow-sm"
                        title={`Motion preset: ${imageMotionEffectLabel}`}
                      >
                        <div className="flex items-center gap-2">
                          <Clapperboard className="h-4 w-4" />
                          <SelectValue placeholder="Motion" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {IMAGE_MOTION_EFFECT_SELECT_VALUES.map((value) => (
                          <SelectItem key={value} value={`builtin:${value}`}>
                            {getImageMotionEffectLabel(value)}
                          </SelectItem>
                        ))}
                        {retainedTemporaryMotion ? (
                          <SelectItem value={`custom:${TEMPORARY_CUSTOM_PRESET_ID}`}>
                            Custom
                          </SelectItem>
                        ) : null}
                        {motionEffectPresets.map((preset) => (
                          <SelectItem key={preset.id} value={`custom:${preset.id}`}>
                            {preset.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openImageEffectsModal('visual')}
                    className="h-9 rounded-xl border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Edit look
                  </Button>
                  {isImageSceneTab ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openImageEffectsModal('motion')}
                      className="h-9 rounded-xl border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
                    >
                      <Clapperboard className="mr-2 h-4 w-4" />
                      Edit motion
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-0">
          {/* Text Content Section */}
          <div className="space-y-4 lg:col-span-4">
            {/* Sentence Text */}
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-8 w-8 rounded-xl bg-linear-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                  {index + 1}
                </div>
                {item.isSuspense && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-lg">
                    <VideoIcon className="h-3.5 w-3.5" />
                    Suspense
                  </span>
                )}
              </div>
              <div className="relative flex-1">
                <div className="absolute top-3 left-3 z-10 p-1.5 bg-indigo-50 rounded-lg">
                  <FileText className="h-4 w-4 text-indigo-600" />
                </div>
                <SentenceTextEditor
                  text={item.text}
                  onCommit={onSentenceTextChange}
                  className="w-full pl-12 pr-4 py-3 text-sm text-gray-800 leading-relaxed bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
                  rows={3}
                  placeholder="Enter your sentence text here..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Primary Actions Row */}
              <div className="flex flex-wrap gap-2">
                {/* Merge Buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isFirst}
                    onClick={onMergeUp}
                    variant="outline"
                    className="gap-2 h-8 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Merge this sentence into the previous one"
                  >
                    <ArrowUp className="h-4 w-4" />
                    <span className="text-xs font-semibold">Merge Up</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isLast}
                    onClick={onMergeDown}
                    variant="outline"
                    className="gap-2 h-8 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Merge this sentence into the next one"
                  >
                    <ArrowDown className="h-4 w-4" />
                    <span className="text-xs font-semibold">Merge Down</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canPickForcedCharacters}
                  onClick={() => {
                    setIsForcedCharactersOpen(true);
                  }}
                  className={
                    forcedCount > 0
                      ? 'gap-2 h-8 border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 transition-all'
                      : 'gap-2 h-8 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all'
                  }
                  title={
                    canPickForcedCharacters
                      ? 'Force character(s) for this sentence'
                      : 'No characters available (add characters first)'
                  }
                >
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-semibold">
                    Characters{forcedCount > 0 ? ` (${forcedCount})` : ''}
                  </span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canPickForcedLocation}
                  onClick={() => {
                    setIsForcedLocationOpen(true);
                  }}
                  className={
                    forcedLocationKey
                      ? 'gap-2 h-8 border-cyan-300 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 hover:border-cyan-400 transition-all'
                      : 'gap-2 h-8 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all'
                  }
                  title={
                    canPickForcedLocation
                      ? 'Force a location for this sentence'
                      : 'No locations available (add locations first)'
                  }
                >
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-semibold">
                    Location{forcedLocationKey ? ' (1)' : ''}
                  </span>
                </Button>

                {/* Enhance Button with Dropdown */}
                <div className="relative">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 h-8 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-sm hover:shadow-md transition-all"
                    title="Enhance this sentence"
                    onClick={onToggleEnhanceMenu}
                    disabled={isEnhancing || isApplyingPrompt}
                    data-enhance-button
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs font-semibold">Enhancing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs font-semibold">Enhance</span>
                      </>
                    )}
                  </Button>

                  {/* Enhance Menu Dropdown */}
                  {isEnhanceMenuOpen && !isEnhancing && !isApplyingPrompt ? (
                    <div
                      className="absolute left-0 top-full mt-2 z-20 w-64 rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                      data-enhance-menu
                    >
                      <div className="p-2 space-y-1">
                        <button
                          type="button"
                          onClick={onAutoEnhance}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-linear-to-r hover:from-amber-50 hover:to-orange-50 transition-all group text-left"
                        >
                          <div className="p-2 bg-linear-to-br from-amber-100 to-orange-100 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                            <Sparkles className="h-4 w-4 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 group-hover:text-amber-700 transition-colors">
                              Auto Enhance
                            </p>
                            <p className="text-xs text-gray-500 leading-tight mt-0.5">Let AI improve your text</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={onCustomPrompt}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 transition-all group text-left"
                        >
                          <div className="p-2 bg-linear-to-br from-blue-100 to-indigo-100 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                              Custom Prompt
                            </p>
                            <p className="text-xs text-gray-500 leading-tight mt-0.5">Use your own instructions</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Delete Button */}
                <Button
                  type="button"
                  size="sm"
                  onClick={onRequestDelete}
                  variant="outline"
                  className="gap-2 h-8 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  title="Delete this sentence and its media"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="text-xs font-semibold">Delete</span>
                </Button>
              </div>

              <ForcedCharactersModal
                isOpen={isForcedCharactersOpen}
                characters={scriptCharacters}
                selectedKeys={item.forcedCharacterKeys}
                onClose={() => setIsForcedCharactersOpen(false)}
                onClear={() => onForcedCharacterKeysChange([])}
                onSave={(next) => onForcedCharacterKeysChange(next)}
              />

              <ForcedLocationModal
                isOpen={isForcedLocationOpen}
                locations={scriptLocations}
                selectedKey={item.forcedLocationKey ?? null}
                onClose={() => setIsForcedLocationOpen(false)}
                onClear={() => onForcedLocationKeyChange('')}
                onSave={(next) => onForcedLocationKeyChange(next)}
              />
            </div>

            {/* Sound Effects */}
            <div className="rounded-2xl border border-indigo-200/70 bg-linear-to-br from-white via-indigo-50/40 to-purple-50/30 shadow-sm overflow-hidden">
              <div className="px-4 py-4 border-b border-indigo-200/60 bg-linear-to-r from-indigo-50 via-purple-50/40 to-pink-50/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/70 rounded-xl border border-indigo-200/60 shadow-sm">
                      <Music2 className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold bg-linear-to-r from-gray-900 via-purple-900 to-indigo-900 bg-clip-text text-transparent">Sound Effects ({soundEffects.length})</p>
                      <p className="text-xs text-gray-500">Start with this sentence (plus delay)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void handleOpenSoundEffectMixEditor();
                      }}
                      disabled={soundEffects.length < 2 || isLoadingSoundEffectMixEditor}
                      className="gap-2 h-8 border-amber-200 text-amber-700 hover:bg-amber-50"
                      title={
                        soundEffects.length < 2
                          ? 'Add at least 2 sound effects to edit a merged mix'
                          : 'Open a merged preview and edit the whole sentence stack at once'
                      }
                    >
                      {isLoadingSoundEffectMixEditor ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs font-semibold">Edit Mix</span>
                        </>
                      ) : (
                        <>
                          <SlidersHorizontal className="h-4 w-4" />
                          <span className="text-xs font-semibold">Edit Mix</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (mixStatus === 'playing' || mixStatus === 'loading') {
                          stopAllScheduledAudio();
                          return;
                        }
                        playMix();
                      }}
                      disabled={soundEffects.length === 0}
                      className="gap-2 h-8 border-gray-200 text-gray-700 hover:bg-gray-50"
                      title={mixStatus !== 'idle' ? 'Stop mix preview' : 'Preview all sound effects together'}
                    >
                      {mixStatus === 'loading' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs font-semibold">Loading...</span>
                        </>
                      ) : mixStatus === 'playing' ? (
                        <>
                          <Pause className="h-4 w-4" />
                          <span className="text-xs font-semibold">Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          <span className="text-xs font-semibold">Play all</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        void Promise.resolve(onSaveSoundEffectsMix());
                      }}
                      disabled={soundEffects.length < 2 || isSavingSoundEffectsMix}
                      className="gap-2 h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      title={
                        soundEffects.length < 2
                          ? 'Add at least 2 sound effects to save a mix'
                          : 'Save these sound effects as one merged file'
                      }
                    >
                      <>
                        {isSavingSoundEffectsMix ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        <span className="text-xs font-semibold">Save mix</span>
                      </>
                    </Button>

                    <button
                      type="button"
                      className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-200/70 bg-white/70 text-indigo-700 hover:bg-white"
                      title={isSoundEffectsOpen ? 'Collapse sound effects' : 'Expand sound effects'}
                      aria-label={isSoundEffectsOpen ? 'Collapse sound effects' : 'Expand sound effects'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSoundEffectsOpen((prev) => {
                          const next = !prev;
                          if (!next) stopAllScheduledAudio();
                          return next;
                        });
                      }}
                    >
                      <ArrowDown
                        className={
                          isSoundEffectsOpen
                            ? 'h-4 w-4 transition-transform rotate-180 duration-200'
                            : 'h-4 w-4 transition-transform duration-200'
                        }
                      />
                    </button>
                  </div>
                </div>
              </div>

              {isSoundEffectsOpen ? (
                <div className="px-4 py-4 fade-in animate-in duration-500">
                  {soundEffectMixNotice ? (
                    <div
                      className={
                        soundEffectMixNotice.type === 'success'
                          ? 'mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700'
                          : 'mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700'
                      }
                    >
                      {soundEffectMixNotice.message}
                    </div>
                  ) : null}

                  <SoundEffectEditModal
                    isOpen={Boolean(mixEditDraft)}
                    title="Edit sound effects mix"
                    audioUrl={mixEditDraft?.audioUrl ?? null}
                    initialName={mixEditDraft?.name ?? `Sentence ${index + 1} SFX mix`}
                    initialVolumePercent={mixEditDraft?.volumePercent ?? 100}
                    initialAudioSettings={
                      mixEditDraft?.audioSettings ??
                      cloneSoundEffectAudioSettings(DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS)
                    }
                    isApplying={isApplyingSoundEffectMixEdit}
                    isSavingAsPreset={isSavingSoundEffectMixPreset}
                    showSaveButton={false}
                    actionError={soundEffectMixError}
                    onClose={() => {
                      setMixEditDraft(null);
                      setSoundEffectMixError(null);
                    }}
                    onApply={async (values: SoundEffectEditValues) => {
                      const nextVolumePercent = Math.max(
                        0,
                        Math.min(300, Number(values.volumePercent) || 0),
                      );
                      const nextAudioSettings = normalizeSoundEffectAudioSettings(values.audioSettings);

                      setIsApplyingSoundEffectMixEdit(true);
                      setSoundEffectMixError(null);
                      try {
                        commitSoundEffects(
                          soundEffects.map((effect) => ({
                            ...effect,
                            volumePercent: nextVolumePercent,
                            audioSettings: mergeSoundEffectSettingsPreservingTrim(
                              nextAudioSettings,
                              effect.audioSettings ?? effect.defaultAudioSettings,
                            ),
                          })),
                        );
                        setMixEditDraft(null);
                        setSoundEffectMixNotice({
                          type: 'success',
                          message: 'Mix edits applied to every sound effect in this sentence.',
                        });
                      } finally {
                        setIsApplyingSoundEffectMixEdit(false);
                      }
                    }}
                    onSave={async () => undefined}
                    onSaveAsPreset={async (values: SoundEffectEditValues) => {
                      const nextTitle = String(values.name ?? '').trim() || `Sentence ${index + 1} SFX mix`;
                      const nextVolumePercent = Math.max(
                        0,
                        Math.min(300, Number(values.volumePercent) || 0),
                      );
                      const nextAudioSettings = normalizeSoundEffectAudioSettings(values.audioSettings);

                      setIsSavingSoundEffectMixPreset(true);
                      setSoundEffectMixError(null);
                      try {
                        await api.post('/sound-effects/merge', {
                          title: nextTitle,
                          volumePercent: nextVolumePercent,
                          audioSettings: nextAudioSettings,
                          isPreset: true,
                          requireUniqueTitle: true,
                          items: buildSentenceSoundEffectMergeItems(),
                        });
                        setMixEditDraft(null);
                        setSoundEffectMixNotice({
                          type: 'success',
                          message: 'Mix preset saved to your sound effects library.',
                        });
                      } catch (error) {
                        setSoundEffectMixError(
                          getApiErrorMessage(
                            error,
                            'Failed to save the mix preset. Enter a unique title and try again.',
                          ),
                        );
                      } finally {
                        setIsSavingSoundEffectMixPreset(false);
                      }
                    }}
                  />

                  <SoundEffectEditModal
                    isOpen={
                      editingSoundEffectIndex !== null &&
                      Boolean(soundEffects[editingSoundEffectIndex])
                    }
                    title="Edit sound effect"
                    audioUrl={soundEffects[editingSoundEffectIndex ?? 0]?.url ?? null}
                    initialName={String(soundEffects[editingSoundEffectIndex ?? 0]?.title ?? '').trim()}
                    initialVolumePercent={
                      Number(soundEffects[editingSoundEffectIndex ?? 0]?.volumePercent ?? 100) || 100
                    }
                    initialAudioSettings={cloneSoundEffectAudioSettings(
                      soundEffects[editingSoundEffectIndex ?? 0]?.audioSettings ??
                      soundEffects[editingSoundEffectIndex ?? 0]?.defaultAudioSettings,
                    )}
                    isSaving={isSavingSoundEffectEdit}
                    actionError={soundEffectEditError}
                    onClose={() => {
                      setEditingSoundEffectIndex(null);
                      setSoundEffectEditError(null);
                    }}
                    onApply={async (values: SoundEffectEditValues) => {
                      const idx = editingSoundEffectIndex;
                      if (idx === null) return;
                      const current = soundEffects[idx];
                      if (!current) return;

                      const nextTitle = String(values.name ?? '').trim() || String(current.title ?? '').trim();
                      const nextVolumePercent = Math.max(0, Math.min(300, Number(values.volumePercent) || 0));
                      const nextAudioSettings = normalizeSoundEffectAudioSettings(values.audioSettings);

                      commitSoundEffects(
                        soundEffects.map((it, i) =>
                          i === idx
                            ? {
                              ...it,
                              title: nextTitle,
                              volumePercent: nextVolumePercent,
                              audioSettings: nextAudioSettings,
                            }
                            : it,
                        ),
                      );

                      setSoundEffectEditError(null);
                      setEditingSoundEffectIndex(null);
                    }}
                    onSaveAsPreset={async (values: SoundEffectEditValues) => {
                      const idx = editingSoundEffectIndex;
                      if (idx === null) return;
                      const current = soundEffects[idx];
                      if (!current) return;

                      const nextTitle = String(values.name ?? '').trim() || String(current.title ?? '').trim();
                      const nextVolumePercent = Math.max(0, Math.min(300, Number(values.volumePercent) || 0));
                      const nextAudioSettings = normalizeSoundEffectAudioSettings(values.audioSettings);

                      setIsSavingSoundEffectEdit(true);
                      setSoundEffectEditError(null);
                      try {
                        const response = await api.post<{
                          id: string;
                          title: string;
                          name?: string;
                          url: string;
                          volume_percent?: number;
                          audio_settings?: Record<string, unknown> | null;
                          duration_seconds?: number | null;
                        }>(`/sound-effects/${encodeURIComponent(current.id)}/presets`, {
                          name: nextTitle,
                          volumePercent: nextVolumePercent,
                          audioSettings: nextAudioSettings,
                        });

                        const created = response.data;
                        commitSoundEffects(
                          soundEffects.map((it, i) =>
                            i === idx
                              ? {
                                ...it,
                                id: created.id,
                                title: String(created.name ?? created.title ?? nextTitle).trim() || nextTitle,
                                url: created.url,
                                volumePercent: Math.max(0, Math.min(300, Number(created.volume_percent ?? nextVolumePercent) || nextVolumePercent)),
                                audioSettings: cloneSoundEffectAudioSettings(created.audio_settings),
                                defaultAudioSettings: cloneSoundEffectAudioSettings(created.audio_settings),
                                durationSeconds:
                                  typeof created.duration_seconds === 'number' && Number.isFinite(created.duration_seconds)
                                    ? Math.max(0, created.duration_seconds)
                                    : it.durationSeconds ?? null,
                              }
                              : it,
                          ),
                        );
                        setEditingSoundEffectIndex(null);
                      } catch (error) {
                        // eslint-disable-next-line no-console
                        console.error('Failed to save sound effect preset', error);
                        setSoundEffectEditError(
                          getApiErrorMessage(
                            error,
                            'Failed to save the preset. Enter a unique title and try again.',
                          ),
                        );
                      } finally {
                        setIsSavingSoundEffectEdit(false);
                      }
                    }}
                    onSave={async (values: SoundEffectEditValues) => {
                      const idx = editingSoundEffectIndex;
                      if (idx === null) return;
                      const current = soundEffects[idx];
                      if (!current) return;

                      const nextTitle = String(values.name ?? '').trim() || String(current.title ?? '').trim();
                      const nextVolumePercent = Math.max(
                        0,
                        Math.min(300, Number(values.volumePercent) || 0),
                      );
                      const nextAudioSettings = normalizeSoundEffectAudioSettings(values.audioSettings);

                      // Optimistically update the sentence first.
                      commitSoundEffects(
                        soundEffects.map((it, i) =>
                          i === idx
                            ? {
                              ...it,
                              title: nextTitle,
                              volumePercent: nextVolumePercent,
                              audioSettings: nextAudioSettings,
                              defaultAudioSettings: nextAudioSettings,
                            }
                            : it,
                        ),
                      );

                      setIsSavingSoundEffectEdit(true);
                      setSoundEffectEditError(null);
                      try {
                        await api.patch(`/sound-effects/${encodeURIComponent(current.id)}`, {
                          name: nextTitle,
                          volumePercent: nextVolumePercent,
                          audioSettings: nextAudioSettings,
                        });
                        setEditingSoundEffectIndex(null);
                      } catch (error) {
                        // eslint-disable-next-line no-console
                        console.error('Failed to update sound effect', error);
                        setSoundEffectEditError(
                          getApiErrorMessage(error, 'Failed to update this sound effect. Try again.'),
                        );
                      } finally {
                        setIsSavingSoundEffectEdit(false);
                      }
                    }}
                  />

                  <div className="flex flex-wrap gap-2">
                    <input
                      type="file"
                      id={`sentence-sfx-${item.id}`}
                      accept="audio/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const list = Array.from(e.target.files ?? []);
                        if (list.length === 0) return;
                        setIsUploadingSoundEffectLocal(true);
                        try {
                          await Promise.resolve(onUploadSoundEffect(list));
                        } finally {
                          setIsUploadingSoundEffectLocal(false);
                          e.currentTarget.value = '';
                        }
                      }}
                    />

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => document.getElementById(`sentence-sfx-${item.id}`)?.click()}
                      disabled={isUploadingSoundEffectActive}
                      className="gap-2 h-9 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                      title="Upload a sound effect"
                    >
                      <>
                        {isUploadingSoundEffectActive ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span className="text-xs font-bold">Upload</span>
                      </>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onOpenSoundEffectsLibrary}
                      className="gap-2 h-9 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold"
                      title="Choose from your sound effects library"
                    >
                      <Library className="h-4 w-4" />
                      <span className="text-xs font-bold">From Library</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        stopAllScheduledAudio();
                        commitSoundEffects([]);
                      }}
                      disabled={soundEffects.length === 0}
                      className="gap-2 h-9 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold"
                      title="Remove all sound effects from this sentence"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-xs font-bold">Remove all</span>
                    </Button>
                  </div>

                  <div className="mt-3 rounded-xl border border-sky-200 bg-linear-to-r from-sky-50 via-white to-indigo-50 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-white/80 p-1.5 shadow-sm ring-1 ring-sky-100">
                            <Clock className="h-3.5 w-3.5 text-sky-700" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-gray-900">Scene-end alignment</p>
                            <p className="text-[10px] text-gray-600">
                              Make all sound effects finish exactly when this scene ends.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={
                            isAlignSoundEffectsToSceneEndEnabled
                              ? 'inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700'
                              : 'inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600'
                          }
                        >
                          {isAlignSoundEffectsToSceneEndEnabled ? 'Aligned to scene end' : 'Using normal timing'}
                        </span>

                        <Button
                          type="button"
                          size="sm"
                          variant={isAlignSoundEffectsToSceneEndEnabled ? 'default' : 'outline'}
                          disabled={isAlignSoundEffectsToSceneEndDisabled}
                          onClick={() =>
                            onAlignSoundEffectsToSceneEndChange(
                              !isAlignSoundEffectsToSceneEndEnabled,
                            )
                          }
                          className={
                            isAlignSoundEffectsToSceneEndEnabled
                              ? 'mt-2 h-7 px-3 text-[11px] bg-sky-600 text-white hover:bg-sky-700'
                              : 'mt-2 h-7 px-3 text-[11px] border-sky-200 text-sky-700 hover:bg-sky-100'
                          }
                        >
                          {isAlignSoundEffectsToSceneEndEnabled ? 'Disable alignment' : 'Align to scene end'}
                        </Button>
                      </div>
                    </div>

                    {/* <p className="mt-2 text-[10px] leading-relaxed text-gray-600">
                      {hasUnknownSoundEffectDuration
                        ? 'This mode needs duration metadata for every sound effect before it can be enabled.'
                        : soundEffectsOverflowScene
                          ? `This stack is ${soundEffectsStackDuration?.toFixed(2)}s long and exceeds the estimated ${Number(sceneDurationSeconds ?? 0).toFixed(2)}s scene duration.`
                          : canCompareStackToSceneDuration && soundEffectsStackDuration !== null
                            ? `Current stack: ${soundEffectsStackDuration.toFixed(2)}s within an estimated ${Number(sceneDurationSeconds ?? 0).toFixed(2)}s scene. When enabled, start offsets are ignored and the whole stack is shifted to the scene end.`
                            : 'Scene duration will be validated again by the backend when you render or reopen the draft.'}
                    </p> */}
                  </div>

                  {soundEffects.length === 0 ? (
                    <p className="mt-3 text-xs text-gray-500">
                      No sound effects yet. Upload one or pick from your library.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <DndContext
                        sensors={soundEffectSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleSoundEffectsDragEnd}
                      >
                        <SortableContext
                          items={soundEffects.map((sfx, sfxIndex) => getSentenceSoundEffectSortableId(sfx, sfxIndex))}
                          strategy={verticalListSortingStrategy}
                        >
                          {soundEffects.map((sfx, sfxIndex) => (
                            <SortableSentenceSoundEffectCard
                              key={getSentenceSoundEffectSortableId(sfx, sfxIndex)}
                              sfx={sfx}
                              sfxIndex={sfxIndex}
                              isLast={sfxIndex === soundEffects.length - 1}
                              isDelayDisabled={isAlignSoundEffectsToSceneEndEnabled}
                              nextTimingMode={
                                soundEffects[sfxIndex + 1]?.timingMode === 'afterPreviousEnds'
                                  ? 'afterPreviousEnds'
                                  : 'withPrevious'
                              }
                              singleStatus={singleStatusByIndex[sfxIndex] ?? 'idle'}
                              truncateTitle={truncateSoundEffectTitle}
                              onTogglePlay={() => {
                                const status = singleStatusByIndex[sfxIndex] ?? 'idle';
                                if (status === 'loading' || status === 'playing') {
                                  stopAllScheduledAudio();
                                  return;
                                }
                                playSingle(sfxIndex);
                              }}
                              onEdit={() => {
                                setSoundEffectEditError(null);
                                setEditingSoundEffectIndex(sfxIndex);
                              }}
                              onRemove={() => {
                                const next = soundEffects.filter((_, i) => i !== sfxIndex);
                                commitSoundEffects(next);
                              }}
                              onDelayChange={(delaySeconds) => {
                                const next = soundEffects.map((it, i) =>
                                  i === sfxIndex ? { ...it, delaySeconds } : it,
                                );
                                commitSoundEffects(next);
                              }}
                              onVolumeChange={(volumePercent) => {
                                const next = soundEffects.map((it, i) =>
                                  i === sfxIndex ? { ...it, volumePercent } : it,
                                );
                                commitSoundEffects(next);
                              }}
                              onNextTimingModeChange={(timingMode) => {
                                const next = soundEffects.map((it, i) =>
                                  i === sfxIndex + 1 ? { ...it, timingMode } : it,
                                );
                                commitSoundEffects(next);
                              }}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Error Message */}
            {enhanceError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
                <div className="p-1 bg-red-100 rounded-lg shrink-0">
                  <X className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-xs text-red-700 font-medium flex-1">{enhanceError}</p>
              </div>
            )}
          </div>

          {/* Media Section */}
          <div className="space-y-4 lg:col-span-2 lg:pl-4">
            {isOverlaySceneTab ? (
              <div className="space-y-4">
                <input
                  type="file"
                  id={`sentence-overlay-asset-${item.id}`}
                  accept="image/*,video/*"
                  onChange={handleOverlayUpload}
                  className="hidden"
                />

                <div
                  className="group/overlay-preview relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-slate-950 shadow-lg transition-all duration-200 hover:border-emerald-300 hover:shadow-xl cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => openImageEffectsModal('overlay')}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    openImageEffectsModal('overlay');
                  }}
                  aria-label="Open overlay scene editor"
                >
                  <OverlayScenePreview
                    isShortVideo={isShortVideo}
                    sceneImageUrl={imagePreviewUrl}
                    sceneVideoUrl={videoPreviewUrl}
                    visualEffect={item.visualEffect ?? null}
                    imageFilterSettings={item.imageFilterSettings ?? null}
                    overlayAssetUrl={overlayPreviewUrl}
                    overlayMimeType={item.overlayMimeType ?? null}
                    overlaySettings={resolvedOverlaySettings}
                    sentenceText={item.text}
                    text={item.textAnimationText}
                    textAnimationEffect={resolvedTextAnimationEffect}
                    textAnimationSettings={item.textAnimationSettings ?? null}
                    className={`w-full ${videoAspectClass}`}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/15 to-transparent px-4 py-3 opacity-0 transition-opacity duration-200 group-hover/overlay-preview:opacity-100 group-focus-within/overlay-preview:opacity-100">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                      Open overlay editor
                    </p>
                  </div>
                </div>
              </div>
            ) : isTextSceneTab ? (
              <div className="space-y-4">
                <div
                  className="group/text-preview relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-slate-950 shadow-lg transition-all duration-200 hover:border-amber-300 hover:shadow-xl cursor-zoom-in"
                  role="button"
                  tabIndex={0}
                  onClick={openTextPreviewOverlay}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    openTextPreviewOverlay();
                  }}
                  aria-label="Open full text scene preview"
                >
                  <TextAnimationPreview
                    sentenceText={item.text}
                    text={item.textAnimationText}
                    effect={resolvedTextAnimationEffect}
                    settings={item.textAnimationSettings}
                    visualEffect={item.visualEffect ?? null}
                    imageFilterSettings={item.imageFilterSettings ?? null}
                    backgroundImageUrl={textPreviewBackgroundUrl}
                    backgroundVideoUrl={textPreviewBackgroundVideoUrl}
                    isShortVideo={isShortVideo}
                    className={`w-full ${videoAspectClass}`}
                    contentClassName="p-[7%]"
                    enableMotion
                    motionResetKey={`${item.id}-${resolvedTextAnimationEffect}-${resolvedTextAnimationSettings.speed ?? 1}`}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/15 to-transparent px-4 py-3 opacity-0 transition-opacity duration-200 group-hover/text-preview:opacity-100 group-focus-within/text-preview:opacity-100">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                      Open full preview
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                      Hook text
                    </label>
                    <Input
                      value={String(item.textAnimationText ?? '')}
                      onChange={(event) => {
                        const nextText = event.target.value;
                        onSentencePatch({ textAnimationText: nextText.trim().length > 0 ? nextText : null });
                      }}
                      placeholder={resolveTextAnimationText(null, item.text)}
                      className="h-11 rounded-xl border-amber-200 bg-white"
                    />
                    <p className="text-xs text-amber-900/80">
                      Leave blank to use the first 5 words from the sentence.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                      Background mode
                    </label>
                    <Select
                      value={resolvedTextAnimationSettings.backgroundMode ?? 'inheritImage'}
                      onValueChange={(value) =>
                        updateTextAnimationSettings({
                          backgroundMode: value as NonNullable<TextAnimationSettings['backgroundMode']>,
                        })
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl border-amber-200 bg-white">
                        <SelectValue placeholder="Choose background mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inheritImage">Use image tab image</SelectItem>
                        <SelectItem value="image">Custom background image</SelectItem>
                        <SelectItem value="inheritVideo">Use video tab video</SelectItem>
                        <SelectItem value="video">Custom background video</SelectItem>
                        <SelectItem value="solid">Solid color</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {resolvedTextAnimationSettings.backgroundMode === 'inheritImage' ? (
                    imagePreviewUrl ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        This text scene is using the current image tab image as its background.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-amber-900">
                        No image is available on the image tab yet. Upload one there or switch this text scene to a custom image, solid, or gradient background.
                      </div>
                    )
                  ) : null}

                  {resolvedTextAnimationSettings.backgroundMode === 'inheritVideo' ? (
                    videoPreviewUrl ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        This text scene is using the current video tab video as its background.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-amber-900">
                        No video is available on the video tab yet. Upload or generate one there, or switch this text scene to a custom image, custom video, solid, or gradient background.
                      </div>
                    )
                  ) : null}

                  {resolvedTextAnimationSettings.backgroundMode === 'image' ? (
                    <div className="space-y-3 rounded-2xl border border-amber-200 bg-white p-4">
                      <input
                        type="file"
                        id={`sentence-text-background-${item.id}`}
                        accept="image/*"
                        onChange={handleTextBackgroundUpload}
                        className="hidden"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Background image</p>
                          <p className="text-xs text-slate-500">Upload a dedicated image for this text scene.</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById(`sentence-text-background-${item.id}`)?.click()}
                            className="h-9 rounded-xl border-amber-200 text-amber-800 hover:bg-amber-50"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </Button>
                          {textBackgroundPreviewUrl ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                onSentencePatch({
                                  textBackgroundImage: null,
                                  textBackgroundImageUrl: null,
                                  textBackgroundSavedImageId: null,
                                })
                              }
                              className="h-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {textBackgroundPreviewUrl ? (
                        <img
                          src={textBackgroundPreviewUrl}
                          alt="Text scene background"
                          className="h-40 w-full rounded-xl object-cover"
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {resolvedTextAnimationSettings.backgroundMode === 'video' ? (
                    <div className="space-y-3 rounded-2xl border border-amber-200 bg-white p-4">
                      <input
                        type="file"
                        id={`sentence-text-background-video-${item.id}`}
                        accept="video/*"
                        onChange={handleTextBackgroundVideoUpload}
                        className="hidden"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Background video</p>
                          <p className="text-xs text-slate-500">Upload a dedicated looping video for this text scene.</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById(`sentence-text-background-video-${item.id}`)?.click()}
                            className="h-9 rounded-xl border-amber-200 text-amber-800 hover:bg-amber-50"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </Button>
                          {textBackgroundVideoPreviewUrl ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                onSentencePatch({
                                  textBackgroundVideo: null,
                                  textBackgroundVideoUrl: null,
                                  textBackgroundSavedVideoId: null,
                                })
                              }
                              className="h-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {textBackgroundVideoPreviewUrl ? (
                        <video
                          src={textBackgroundVideoPreviewUrl}
                          className="h-40 w-full rounded-xl object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {resolvedTextAnimationSettings.backgroundMode === 'solid' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                        Solid background color
                      </label>
                      <Input
                        type="color"
                        value={resolvedTextAnimationSettings.backgroundColor ?? '#0f172a'}
                        onChange={(event) =>
                          updateTextAnimationSettings({ backgroundColor: event.target.value })
                        }
                        className="h-11 rounded-xl border-amber-200 bg-white p-2"
                      />
                    </div>
                  ) : null}

                  {resolvedTextAnimationSettings.backgroundMode === 'gradient' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                          Gradient from
                        </label>
                        <Input
                          type="color"
                          value={resolvedTextAnimationSettings.gradientFrom ?? '#0f172a'}
                          onChange={(event) =>
                            updateTextAnimationSettings({ gradientFrom: event.target.value })
                          }
                          className="h-11 rounded-xl border-amber-200 bg-white p-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                          Gradient to
                        </label>
                        <Input
                          type="color"
                          value={resolvedTextAnimationSettings.gradientTo ?? '#1d4ed8'}
                          onChange={(event) =>
                            updateTextAnimationSettings({ gradientTo: event.target.value })
                          }
                          className="h-11 rounded-xl border-amber-200 bg-white p-2"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs text-fuchsia-800">
                  Subtitles are suppressed automatically for text animation scenes in the final render.
                </div>
              </div>
            ) : null}

            {/* Upload/Generate Area for Single Mode */}
            {isImageSceneTab && !(imagePreviewUrl || item.video || item.videoUrl) && (
              <div className={showSecondaryImageSlot ? 'grid grid-cols-1 gap-4' : 'space-y-4'}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-linear-to-r from-indigo-600 to-purple-600 shadow-sm"></div>
                    <p className="text-sm font-bold text-gray-800">Primary Image</p>
                  </div>
                  <div
                    className="relative bg-linear-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 border-2 border-dashed border-indigo-300 rounded-2xl p-4 text-center transition-all duration-300 cursor-pointer hover:border-indigo-400 hover:shadow-lg hover:scale-[1.01] group"
                    onClick={() => document.getElementById(`sentence-image-${item.id}`)?.click()}
                  >
                    <div className="flex flex-col items-center gap-3 pointer-events-none">
                      <div className="relative">
                        <div className="absolute inset-0 bg-indigo-400 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity"></div>
                        <div className="relative p-3 bg-white rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                          <ImageIcon className="h-7 w-7 text-indigo-500" />
                        </div>
                      </div>
                      <input
                        type="file"
                        id={`sentence-image-${item.id}`}
                        accept="image/*,video/*"
                        onChange={(e) => onSentenceImageUpload(e, 'primary')}
                        className="hidden"
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-900 mb-1">Click to upload</p>
                        <p className="text-xs text-gray-600">Images or videos</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        void Promise.resolve(onGenerateSentenceImage(undefined, 'primary'));
                      }}
                      disabled={item.isGeneratingImage}
                      className="h-10 gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      {item.isGeneratingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm font-bold">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span className="text-sm font-bold">Generate with AI</span>
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFromLibrary('single');
                      }}
                      className="h-10 gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                    >
                      <Library className="h-4 w-4" />
                      <span className="text-sm">From Library</span>
                    </Button>
                    {!showSecondaryImageSlot && onAddSentenceImageSlot ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddSentenceImageSlot();
                        }}
                        className="h-10 gap-2 border-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 font-semibold shadow-sm hover:shadow-md transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">Add New Image</span>
                      </Button>
                    ) : null}
                  </div>
                </div>

                {showSecondaryImageSlot ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-linear-to-r from-fuchsia-600 to-pink-600 shadow-sm"></div>
                      <p className="text-sm font-bold text-gray-800">Second Image</p>
                    </div>
                    <div
                      className="relative bg-linear-to-br from-fuchsia-50 via-rose-50/50 to-orange-50/30 border-2 border-dashed border-fuchsia-300 rounded-2xl p-4 text-center transition-all duration-300 cursor-pointer hover:border-fuchsia-400 hover:shadow-lg hover:scale-[1.01] group"
                      onClick={() => document.getElementById(`sentence-secondary-image-${item.id}`)?.click()}
                    >
                      <div className="flex flex-col items-center gap-3 pointer-events-none">
                        <div className="relative">
                          <div className="absolute inset-0 bg-fuchsia-400 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity"></div>
                          <div className="relative p-3 bg-white rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                            <ImageIcon className="h-7 w-7 text-fuchsia-500" />
                          </div>
                        </div>
                        <input
                          type="file"
                          id={`sentence-secondary-image-${item.id}`}
                          accept="image/*"
                          onChange={(e) => onSentenceImageUpload(e, 'secondary')}
                          className="hidden"
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-900 mb-1">Click to upload</p>
                          <p className="text-xs text-gray-600">Complementary still image</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void Promise.resolve(onGenerateSentenceImage(undefined, 'secondary'));
                        }}
                        disabled={item.isGeneratingSecondaryImage}
                        className="h-10 gap-2 bg-linear-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all"
                      >
                        {item.isGeneratingSecondaryImage ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm font-bold">Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            <span className="text-sm font-bold">Generate with AI</span>
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFromLibrary('secondary');
                        }}
                        className="h-10 gap-2 border-2 border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50 hover:border-fuchsia-300 font-semibold shadow-sm hover:shadow-md transition-all"
                      >
                        <Library className="h-4 w-4" />
                        <span className="text-sm">From Library</span>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Video inputs */}
            {isVideoSceneTab && (
              <div className="space-y-4">
                <input
                  type="file"
                  id={`sentence-video-upload-${item.id}`}
                  accept="video/*"
                  onChange={(e) => onSentenceVideoUpload(e)}
                  className="hidden"
                />
                {effectiveVideoGenerationMode === 'frames' ? (
                  !hasAnyVideo ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                        {/* Start Frame */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-linear-to-r from-indigo-600 to-purple-600 shadow-sm"></div>
                            <p className="text-sm font-bold text-gray-800">Start Frame</p>
                          </div>
                          {startPreviewUrl ? (
                            <div className="relative group/frame rounded-2xl overflow-hidden shadow-lg border-2 border-gray-200">
                              <ImageEffectPreview
                                visualEffect={item.visualEffect}
                                imageMotionEffect={item.imageMotionEffect}
                                imageMotionSpeed={item.imageMotionSpeed}
                                isShortVideo={isShortVideo}
                                imageFilterSettings={resolvedImageFilterSettings}
                                imageMotionSettings={resolvedImageMotionSettings}
                                enableMotion={shouldAnimateImagePreview}
                              >
                                <img
                                  src={startPreviewUrl}
                                  alt="Start frame"
                                  className="h-48 w-full cursor-zoom-in object-cover"
                                  onClick={() =>
                                    onPreviewImage(
                                      startPreviewUrl,
                                      item.visualEffect ?? null,
                                      item.imageMotionEffect ?? 'default',
                                      item.imageMotionSpeed ?? getDefaultImageMotionSpeed(isShortVideo),
                                      item.imageFilterSettings ?? null,
                                      item.imageMotionSettings ?? null,
                                    )
                                  }
                                />
                              </ImageEffectPreview>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectFromLibrary('start');
                                }}
                                className="absolute top-2 left-2 p-2 bg-white/90 text-indigo-700 rounded-xl hover:bg-white shadow-lg transition-all hover:scale-110"
                                title="Choose start frame from library"
                              >
                                <Library className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveSentenceFrameImage('start')}
                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                                title="Remove start frame"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="bg-linear-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 border-2 border-dashed border-indigo-300 rounded-2xl p-5 text-center hover:border-indigo-400 hover:shadow-lg transition-all duration-300 cursor-pointer group/upload"
                              onClick={() => document.getElementById(`sentence-start-image-${item.id}`)?.click()}
                            >
                              <input
                                type="file"
                                id={`sentence-start-image-${item.id}`}
                                accept="image/*"
                                onChange={(e) => onSentenceFrameImageUpload('start', e)}
                                className="hidden"
                              />
                              <div className="flex flex-col items-center gap-3 pointer-events-none">
                                <div className="p-3 bg-white rounded-xl shadow-md group-hover/upload:scale-110 transition-transform duration-300">
                                  <ImageIcon className="h-6 w-6 text-indigo-500" />
                                </div>
                                <span className="text-sm font-semibold text-gray-800">Click to upload</span>
                              </div>

                              {onGenerateSentenceFrameImage && (
                                <div className="mt-4 pointer-events-auto">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void Promise.resolve(onGenerateSentenceFrameImage('start'));
                                    }}
                                    disabled={Boolean(item.isGeneratingStartImage)}
                                    className="h-9 w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
                                  >
                                    {item.isGeneratingStartImage ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-xs font-bold">Generating...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-4 w-4" />
                                        <span className="text-xs font-bold">Generate AI</span>
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}

                              <div className="mt-3 pointer-events-auto">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectFromLibrary('start');
                                  }}
                                  className="h-9 w-full gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                                >
                                  <Library className="h-4 w-4" />
                                  <span className="text-xs font-bold">From Library</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* End Frame */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-linear-to-r from-purple-600 to-pink-600 shadow-sm"></div>
                            <p className="text-sm font-bold text-gray-800">End Frame</p>
                          </div>
                          {endPreviewUrl ? (
                            <div className="relative group/frame rounded-2xl overflow-hidden shadow-lg border-2 border-gray-200">
                              <ImageEffectPreview
                                visualEffect={item.visualEffect}
                                imageMotionEffect={item.imageMotionEffect}
                                imageMotionSpeed={item.imageMotionSpeed}
                                isShortVideo={isShortVideo}
                                imageFilterSettings={resolvedImageFilterSettings}
                                imageMotionSettings={resolvedImageMotionSettings}
                                enableMotion={shouldAnimateImagePreview}
                              >
                                <img
                                  src={endPreviewUrl}
                                  alt="End frame"
                                  className="h-58 w-full cursor-zoom-in object-cover"
                                  onClick={() =>
                                    onPreviewImage(
                                      endPreviewUrl,
                                      item.visualEffect ?? null,
                                      item.imageMotionEffect ?? 'default',
                                      item.imageMotionSpeed ?? getDefaultImageMotionSpeed(isShortVideo),
                                      item.imageFilterSettings ?? null,
                                      item.imageMotionSettings ?? null,
                                    )
                                  }
                                />
                              </ImageEffectPreview>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectFromLibrary('end');
                                }}
                                className="absolute top-2 left-2 p-2 bg-white/90 text-indigo-700 rounded-xl hover:bg-white shadow-lg transition-all hover:scale-110"
                                title="Choose end frame from library"
                              >
                                <Library className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveSentenceFrameImage('end')}
                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                                title="Remove end frame"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="bg-linear-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 border-2 border-dashed border-indigo-300 rounded-2xl p-5 text-center hover:border-indigo-400 hover:shadow-lg transition-all duration-300 cursor-pointer group/upload"
                              onClick={() => document.getElementById(`sentence-end-image-${item.id}`)?.click()}
                            >
                              <input
                                type="file"
                                id={`sentence-end-image-${item.id}`}
                                accept="image/*"
                                onChange={(e) => onSentenceFrameImageUpload('end', e)}
                                className="hidden"
                              />
                              <div className="flex flex-col items-center gap-3 pointer-events-none">
                                <div className="p-3 bg-white rounded-xl shadow-md group-hover/upload:scale-110 transition-transform duration-300">
                                  <ImageIcon className="h-6 w-6 text-indigo-500" />
                                </div>
                                <span className="text-sm font-semibold text-gray-800">Click to upload</span>
                              </div>

                              {onGenerateSentenceFrameImage && (
                                <div className="mt-4 pointer-events-auto">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void Promise.resolve(onGenerateSentenceFrameImage('end'));
                                    }}
                                    disabled={Boolean(item.isGeneratingEndImage)}
                                    className="h-9 w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
                                  >
                                    {item.isGeneratingEndImage ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-xs font-bold">Generating...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-4 w-4" />
                                        <span className="text-xs font-bold">Generate AI</span>
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}

                              <div className="mt-3 pointer-events-auto">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectFromLibrary('end');
                                  }}
                                  className="h-9 w-full gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                                >
                                  <Library className="h-4 w-4" />
                                  <span className="text-xs font-bold">From Library</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {!canGenerateVideo && (
                        <div className="rounded-2xl border-2 border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 px-5 py-4 flex items-start gap-3 shadow-sm">
                          <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <p className="text-sm text-amber-900 leading-relaxed font-medium">
                            Upload both <span className="font-bold">Start</span> and <span className="font-bold">End</span> frames to enable video generation.
                          </p>
                        </div>
                      )}
                    </>
                  ) : null
                ) : effectiveVideoGenerationMode === 'text' ? (
                  hasAnyVideo ? null : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-linear-to-r from-emerald-600 to-teal-600 shadow-sm"></div>
                        <p className="text-sm font-bold text-gray-800">Video Prompt</p>
                      </div>
                      <textarea
                        value={String(item.videoPrompt ?? '')}
                        onChange={(e) => onVideoPromptChange?.(e.target.value)}
                        className="w-full px-4 py-3 text-sm text-gray-800 leading-relaxed bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
                        rows={4}
                        placeholder="Describe the video you want (e.g. cinematic close-up, slow camera move, dramatic lighting...)"
                      />

                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void Promise.resolve(onGenerateVideoPrompt?.());
                        }}
                        disabled={!onGenerateVideoPrompt || isGeneratingVideoPrompt}
                        className="h-9 w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <>
                          {isGeneratingVideoPrompt ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          <span className="text-xs font-bold">Generate with AI</span>
                        </>
                      </Button>
                      <p className="text-xs text-gray-500">Hint: Generates video directly from text (no frames needed).</p>
                      {!canGenerateVideo ? (
                        <p className="text-xs font-semibold text-amber-700">Enter a prompt to enable generation.</p>
                      ) : null}
                    </div>
                  )
                ) : (
                  hasAnyVideo ? null : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-linear-to-r from-indigo-600 to-purple-600 shadow-sm"></div>
                        <p className="text-sm font-bold text-gray-800">Reference Image</p>
                      </div>

                      {referencePreviewUrl ? (
                        <div className="relative group/frame rounded-2xl overflow-hidden shadow-lg border-2 border-gray-200">
                          <ImageEffectPreview
                            visualEffect={item.visualEffect}
                            imageMotionEffect={item.imageMotionEffect}
                            imageMotionSpeed={item.imageMotionSpeed}
                            isShortVideo={isShortVideo}
                            imageFilterSettings={resolvedImageFilterSettings}
                            imageMotionSettings={resolvedImageMotionSettings}
                            enableMotion={shouldAnimateImagePreview}
                          >
                            <img
                              src={referencePreviewUrl}
                              alt="Reference"
                              className="h-48 w-full cursor-zoom-in object-cover"
                              onClick={() =>
                                onPreviewImage(
                                  referencePreviewUrl,
                                  item.visualEffect ?? null,
                                  item.imageMotionEffect ?? 'default',
                                  item.imageMotionSpeed ?? getDefaultImageMotionSpeed(isShortVideo),
                                  item.imageFilterSettings ?? null,
                                  item.imageMotionSettings ?? null,
                                )
                              }
                            />
                          </ImageEffectPreview>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFromLibrary('reference');
                            }}
                            className="absolute top-2 left-2 p-2 bg-white/90 text-indigo-700 rounded-xl hover:bg-white shadow-lg transition-all hover:scale-110"
                            title="Choose reference image from library"
                          >
                            <Library className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveReferenceImage?.();
                            }}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                            title="Remove reference image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="bg-linear-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 border-2 border-dashed border-indigo-300 rounded-2xl p-5 text-center hover:border-indigo-400 hover:shadow-lg transition-all duration-300 cursor-pointer group/upload"
                          onClick={() => document.getElementById(`sentence-reference-image-${item.id}`)?.click()}
                        >
                          <input
                            type="file"
                            id={`sentence-reference-image-${item.id}`}
                            accept="image/*"
                            onChange={(e) => onSentenceReferenceImageUpload?.(e)}
                            className="hidden"
                          />
                          <div className="flex flex-col items-center gap-3 pointer-events-none">
                            <div className="p-3 bg-white rounded-xl shadow-md group-hover/upload:scale-110 transition-transform duration-300">
                              <ImageIcon className="h-6 w-6 text-indigo-500" />
                            </div>
                            <span className="text-sm font-semibold text-gray-800">Click to upload</span>
                          </div>

                          <div className="mt-3 pointer-events-auto">
                            <div className="flex flex-col gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void Promise.resolve(onGenerateSentenceReferenceImage?.());
                                }}
                                disabled={!onGenerateSentenceReferenceImage || item.isGeneratingReferenceImage}
                                className="h-9 w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {item.isGeneratingReferenceImage ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-xs font-bold">Generating...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4" />
                                    <span className="text-xs font-bold">Generate with AI</span>
                                  </>
                                )}
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectFromLibrary('reference');
                                }}
                                className="h-9 w-full gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                              >
                                <Library className="h-4 w-4" />
                                <span className="text-xs font-bold">From Library</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-linear-to-r from-emerald-600 to-teal-600 shadow-sm"></div>
                          <p className="text-sm font-bold text-gray-800">Video Prompt</p>
                        </div>
                        <textarea
                          value={String(item.videoPrompt ?? '')}
                          onChange={(e) => onVideoPromptChange?.(e.target.value)}
                          className="w-full px-4 py-3 text-sm text-gray-800 leading-relaxed bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
                          rows={4}
                          placeholder="Describe the video you want (e.g. cinematic close-up, slow camera move, dramatic lighting...)"
                        />

                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void Promise.resolve(onGenerateVideoPrompt?.());
                          }}
                          disabled={!onGenerateVideoPrompt || isGeneratingVideoPrompt}
                          className="h-9 w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isGeneratingVideoPrompt ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-xs font-bold">Generating...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              <span className="text-xs font-bold">Generate with AI</span>
                            </>
                          )}
                        </Button>
                      </div>

                      <p className="text-xs text-gray-500">Hint: Uses your prompt + the reference image to guide the generation.</p>
                      {!canGenerateVideo ? (
                        <p className="text-xs font-semibold text-amber-700">Add a reference image and a prompt to enable generation.</p>
                      ) : null}
                    </div>
                  )
                )}

                {/* Generated Video + (Re)Generate Button */}
                {item.video || item.videoUrl ? (
                  <div className="space-y-3">
                    <div className="relative w-full rounded-2xl overflow-hidden shadow-xl">
                      <ImageEffectPreview
                        visualEffect={item.visualEffect}
                        imageMotionEffect={item.imageMotionEffect}
                        imageFilterSettings={resolvedImageFilterSettings}
                        imageMotionSettings={resolvedImageMotionSettings}
                        enableMotion={false}
                      >
                        <video
                          src={item.video ? URL.createObjectURL(item.video) : (item.videoUrl as string)}
                          controls
                          className={generatedVideoClassName}
                        />
                      </ImageEffectPreview>

                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        {canSaveCurrentVideoToLibrary ? (
                          <button
                            type="button"
                            onClick={() => {
                              void onSaveVideoToLibrary?.();
                            }}
                            disabled={isSavingVideoToLibrary || isCurrentVideoSaved}
                            className={
                              isCurrentVideoSaved
                                ? 'p-2 rounded-xl bg-emerald-500 text-white shadow-lg'
                                : 'p-2 rounded-xl bg-white/95 text-indigo-700 hover:bg-white shadow-lg transition-all hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100'
                            }
                            title={
                              isCurrentVideoSaved
                                ? 'Saved to video library'
                                : isSavingVideoToLibrary
                                  ? 'Saving video to library'
                                  : 'Save to video library'
                            }
                          >
                            {isSavingVideoToLibrary ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </button>
                        ) : null}

                        {item.video || (item.videoUrl && item.videoUrl !== '/subscribe.mp4') ? (
                          <button
                            type="button"
                            onClick={() => onRemoveGeneratedVideo?.()}
                            className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                            title="Remove video"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {!isSubscribeClip ? (
                      <div className="space-y-2">
                        {onSelectVideoFromLibrary ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectVideoFromLibrary();
                            }}
                            className="h-9 w-full gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                          >
                            <VideoIcon className="h-4 w-4" />
                            <span className="text-xs font-bold">Video Library</span>
                          </Button>
                        ) : null}

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById(`sentence-video-upload-${item.id}`)?.click();
                          }}
                          className="h-9 w-full gap-2 border-2 border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300 font-semibold shadow-sm hover:shadow-md transition-all"
                        >
                          <Upload className="h-4 w-4" />
                          <span className="text-xs font-bold">Upload Video</span>
                        </Button>

                        <div className="flex items-center gap-2">
                          <div className="relative" ref={videoModeMenuRef}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isVideoModeMenuOpen) {
                                  closeVideoModeMenu();
                                  return;
                                }
                                openVideoModeMenu();
                              }}
                              className="h-10 w-10 rounded-xl bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                              title={`Video mode: ${videoModeLabel}`}
                            >
                              <Repeat2 className="h-4 w-4" />
                            </button>

                            {isVideoModeMenuMounted ? (
                              <div
                                className={
                                  isVideoModeMenuShown
                                    ? 'absolute right-0 bottom-full mb-2 z-30 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden origin-bottom-right transform-gpu opacity-100 scale-100 translate-y-0 pointer-events-auto transition duration-150 ease-out'
                                    : 'absolute right-0 bottom-full mb-2 z-30 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden origin-bottom-right transform-gpu opacity-0 scale-95 translate-y-2 pointer-events-none transition duration-150 ease-in'
                                }
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-2 space-y-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onVideoGenerationModeChange?.('referenceImage');
                                      closeVideoModeMenu();
                                    }}
                                    className={
                                      effectiveVideoGenerationMode === 'referenceImage'
                                        ? 'w-full text-left rounded-xl px-3 py-2 bg-linear-to-r from-indigo-50 to-purple-50 border border-indigo-200'
                                        : 'w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50'
                                    }
                                  >
                                    <p className="text-sm font-bold text-gray-900">Reference image</p>
                                    <p className="text-xs text-gray-500">One image + sentence text</p>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onVideoGenerationModeChange?.('text');
                                      closeVideoModeMenu();
                                    }}
                                    className={
                                      effectiveVideoGenerationMode === 'text'
                                        ? 'w-full text-left rounded-xl px-3 py-2 bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200'
                                        : 'w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50'
                                    }
                                  >
                                    <p className="text-sm font-bold text-gray-900">Text to video</p>
                                    <p className="text-xs text-gray-500">Prompt only (no images)</p>
                                  </button>
                                  {videoModel !== 'grok' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onVideoGenerationModeChange?.('frames');
                                        closeVideoModeMenu();
                                      }}
                                      className={
                                        effectiveVideoGenerationMode === 'frames'
                                          ? 'w-full text-left rounded-xl px-3 py-2 bg-gray-50 border border-gray-200'
                                          : 'w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50'
                                      }
                                    >
                                      <p className="text-sm font-bold text-gray-900">Frames</p>
                                      <p className="text-xs text-gray-500">Start + end frames</p>
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void Promise.resolve(onGenerateVideo?.(canGenerateVideo))}
                            disabled={!onGenerateVideo || isGeneratingVideo}
                            className="h-10 flex-1 min-w-0 gap-2 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isGeneratingVideo ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm font-bold">Generating Video...</span>
                              </>
                            ) : (
                              <>
                                <VideoIcon className="h-4 w-4" />
                                <span className="text-sm font-bold">Regenerate Video</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {onSelectVideoFromLibrary ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVideoFromLibrary();
                        }}
                        className="h-9 w-full gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                      >
                        <VideoIcon className="h-4 w-4" />
                        <span className="text-xs font-bold">Video Library</span>
                      </Button>
                    ) : null}

                    {!isSubscribeClip ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById(`sentence-video-upload-${item.id}`)?.click();
                        }}
                        className="h-9 w-full gap-2 border-2 border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300 font-semibold shadow-sm hover:shadow-md transition-all"
                      >
                        <Upload className="h-4 w-4" />
                        <span className="text-xs font-bold">Upload Video</span>
                      </Button>
                    ) : null}

                    <div className="flex items-center gap-2">
                      <div className="relative" ref={videoModeMenuRef}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isVideoModeMenuOpen) {
                              closeVideoModeMenu();
                              return;
                            }
                            openVideoModeMenu();
                          }}
                          className="h-10 w-10 rounded-xl bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                          title={`Video mode: ${videoModeLabel}`}
                        >
                          <Repeat2 className="h-4 w-4" />
                        </button>

                        {isVideoModeMenuMounted ? (
                          <div
                            className={
                              isVideoModeMenuShown
                                ? 'absolute right-0 bottom-full mb-2 z-30 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden origin-bottom-right transform-gpu opacity-100 scale-100 translate-y-0 pointer-events-auto transition duration-150 ease-out'
                                : 'absolute right-0 bottom-full mb-2 z-30 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden origin-bottom-right transform-gpu opacity-0 scale-95 translate-y-2 pointer-events-none transition duration-150 ease-in'
                            }
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="p-2 space-y-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onVideoGenerationModeChange?.('referenceImage');
                                  closeVideoModeMenu();
                                }}
                                className={
                                  effectiveVideoGenerationMode === 'referenceImage'
                                    ? 'w-full text-left rounded-xl px-3 py-2 bg-linear-to-r from-indigo-50 to-purple-50 border border-indigo-200'
                                    : 'w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50'
                                }
                              >
                                <p className="text-sm font-bold text-gray-900">Reference image</p>
                                <p className="text-xs text-gray-500">One image + sentence text</p>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onVideoGenerationModeChange?.('text');
                                  closeVideoModeMenu();
                                }}
                                className={
                                  effectiveVideoGenerationMode === 'text'
                                    ? 'w-full text-left rounded-xl px-3 py-2 bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200'
                                    : 'w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50'
                                }
                              >
                                <p className="text-sm font-bold text-gray-900">Text to video</p>
                                <p className="text-xs text-gray-500">Prompt only (no images)</p>
                              </button>
                              {videoModel !== 'grok' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onVideoGenerationModeChange?.('frames');
                                    closeVideoModeMenu();
                                  }}
                                  className={
                                    effectiveVideoGenerationMode === 'frames'
                                      ? 'w-full text-left rounded-xl px-3 py-2 bg-gray-50 border border-gray-200'
                                      : 'w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50'
                                  }
                                >
                                  <p className="text-sm font-bold text-gray-900">Frames</p>
                                  <p className="text-xs text-gray-500">Start + end frames</p>
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void Promise.resolve(onGenerateVideo?.(canGenerateVideo))}
                        disabled={!onGenerateVideo || item.videoUrl === '/subscribe.mp4' || isGeneratingVideo}
                        className="h-10 flex-1 min-w-0 gap-2 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isGeneratingVideo ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm font-bold">Generating Video...</span>
                          </>
                        ) : (
                          <>
                            <VideoIcon className="h-4 w-4" />
                            <span className="text-sm font-bold">Generate Video</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Media Preview (image or video) */}
            {isImageSceneTab && (imagePreviewUrl || secondaryImagePreviewUrl || item.video || item.videoUrl) && (
              item.video || item.videoUrl ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-lg group/preview">
                    <ImageEffectPreview
                      visualEffect={item.visualEffect}
                      isShortVideo={isShortVideo}
                      imageMotionEffect={item.imageMotionEffect}
                      imageFilterSettings={resolvedImageFilterSettings}
                      imageMotionSettings={resolvedImageMotionSettings}
                      enableMotion={false}
                    >
                      <video
                        src={item.video ? URL.createObjectURL(item.video) : (item.videoUrl as string)}
                        controls
                        className={`block w-full max-w-65 mx-auto ${videoAspectClass} object-cover`}
                      />
                    </ImageEffectPreview>
                    <button
                      type="button"
                      onClick={() => onRemoveSentenceImage('primary')}
                      className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className={showSecondaryImageSlot ? 'grid grid-cols-1 gap-4' : 'space-y-4'}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-linear-to-r from-indigo-600 to-purple-600 shadow-sm"></div>
                        <p className="text-sm font-bold text-gray-800">Primary Image</p>
                      </div>
                      {!showSecondaryImageSlot && onAddSentenceImageSlot ? (
                        <button
                          type="button"
                          onClick={onAddSentenceImageSlot}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-500 text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
                          title="Add a second image"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-lg group/preview">
                      <ImageEffectPreview
                        visualEffect={item.visualEffect}
                        imageMotionEffect={item.imageMotionEffect}
                        imageMotionSpeed={item.imageMotionSpeed}
                        isShortVideo={isShortVideo}
                        imageFilterSettings={resolvedImageFilterSettings}
                        imageMotionSettings={resolvedImageMotionSettings}
                        enableMotion={shouldAnimateImagePreview}
                      >
                        <img
                          src={imagePreviewUrl as string}
                          alt={`Scene ${index + 1}`}
                          className="h-58 w-full cursor-zoom-in object-cover"
                          onClick={() =>
                            onPreviewImage(
                              imagePreviewUrl as string,
                              item.visualEffect ?? null,
                              item.imageMotionEffect ?? 'default',
                              item.imageMotionSpeed ?? getDefaultImageMotionSpeed(isShortVideo),
                              item.imageFilterSettings ?? null,
                              item.imageMotionSettings ?? null,
                            )
                          }
                        />
                      </ImageEffectPreview>
                      <button
                        type="button"
                        onClick={() => onRemoveSentenceImage('primary')}
                        className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {item.imageUrl && !item.image ? (
                        <div className="absolute bottom-3 left-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-xl shadow-lg">
                            <Sparkles className="h-2 w-2" />
                            AI Generated
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {item.imagePrompt ? (
                      <div className="bg-gray-50 rounded-xl p-2 border border-gray-200">
                        <div className="flex items-start gap-2">
                          <div className="p-1 bg-indigo-100 rounded-lg shrink-0 mt-0.5">
                            <Sparkles className="h-3 w-3 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Primary Prompt</p>
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{item.imagePrompt}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectFromLibrary('single')}
                        disabled={item.isSavingImage || item.isGeneratingImage || isApplyingImagePrompt}
                        className="h-9 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-semibold"
                      >
                        <Library className="h-4 w-4" />
                        <span className="text-xs">Change</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void Promise.resolve(onGenerateSentenceImage(undefined, 'primary'))}
                        disabled={item.isGeneratingImage || isApplyingImagePrompt}
                        className="h-9 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-semibold"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs">Regenerate</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={onOpenEnhanceImagePromptModal}
                        disabled={item.isGeneratingImage || isApplyingImagePrompt}
                        className="col-span-2 h-9 gap-2 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isApplyingImagePrompt ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs font-bold">Regenerating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            <span className="text-xs font-bold">Enhance</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {showSecondaryImageSlot ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-linear-to-r from-fuchsia-600 to-pink-600 shadow-sm"></div>
                        <p className="text-sm font-bold text-gray-800">Second Image</p>
                      </div>

                      <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-lg group/preview">
                        {secondaryImagePreviewUrl ? (
                          <ImageEffectPreview
                            visualEffect={item.visualEffect}
                            imageMotionEffect={item.imageMotionEffect}
                            imageMotionSpeed={item.imageMotionSpeed}
                            isShortVideo={isShortVideo}
                            imageFilterSettings={resolvedImageFilterSettings}
                            imageMotionSettings={resolvedImageMotionSettings}
                            enableMotion={shouldAnimateImagePreview}
                          >
                            <img
                              src={secondaryImagePreviewUrl}
                              alt={`Scene ${index + 1} second image`}
                              className="h-58 w-full cursor-zoom-in object-cover"
                              onClick={() =>
                                onPreviewImage(
                                  secondaryImagePreviewUrl,
                                  item.visualEffect ?? null,
                                  item.imageMotionEffect ?? 'default',
                                  item.imageMotionSpeed ?? getDefaultImageMotionSpeed(isShortVideo),
                                  item.imageFilterSettings ?? null,
                                  item.imageMotionSettings ?? null,
                                )
                              }
                            />
                          </ImageEffectPreview>
                        ) : (
                          <div
                            className="flex h-58 cursor-pointer flex-col items-center justify-center gap-3 bg-linear-to-br from-fuchsia-50 via-rose-50/50 to-orange-50/30"
                            onClick={() => document.getElementById(`sentence-secondary-image-${item.id}`)?.click()}
                          >
                            <input
                              type="file"
                              id={`sentence-secondary-image-${item.id}`}
                              accept="image/*"
                              onChange={(e) => onSentenceImageUpload(e, 'secondary')}
                              className="hidden"
                            />
                            <ImageIcon className="h-7 w-7 text-fuchsia-500" />
                            <p className="text-sm font-semibold text-gray-800">Upload second image</p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveSentenceImage('secondary')}
                          className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {item.secondaryImagePrompt ? (
                        <div className="bg-gray-50 rounded-xl p-2 border border-gray-200">
                          <div className="flex items-start gap-2">
                            <div className="p-1 bg-fuchsia-100 rounded-lg shrink-0 mt-0.5">
                              <Sparkles className="h-3 w-3 text-fuchsia-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-700 mb-1">Second Image Prompt</p>
                              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{item.secondaryImagePrompt}</p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectFromLibrary('secondary')}
                          disabled={Boolean(item.isGeneratingSecondaryImage)}
                          className="h-9 gap-2 border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50 hover:border-fuchsia-300 font-semibold"
                        >
                          <Library className="h-4 w-4" />
                          <span className="text-xs">Change</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void Promise.resolve(onGenerateSentenceImage(undefined, 'secondary'))}
                          disabled={Boolean(item.isGeneratingSecondaryImage)}
                          className="h-9 gap-2 border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50 hover:border-fuchsia-300 font-semibold"
                        >
                          {item.isGeneratingSecondaryImage ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-xs">Generating...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              <span className="text-xs">
                                {secondaryImagePreviewUrl ? 'Regenerate' : 'Generate AI'}
                              </span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {imagePromptError ? (
                    <div className="col-span-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2">
                      <div className="p-1 bg-red-100 rounded-lg shrink-0">
                        <X className="h-3 w-3 text-red-600" />
                      </div>
                      <p className="text-xs text-red-700 font-medium flex-1">{imagePromptError}</p>
                    </div>
                  ) : null}
                </div>
              )
            )}
          </div>
        </div>

        <ImageEffectsDetailModal
          isOpen={isImageEffectsDetailModalOpen}
          isShortVideo={isShortVideo}
          activeTab={imageEffectsTab}
          enabledTabs={detailEnabledTabs}
          sceneKind={detailSceneKind}
          previewImageUrl={detailImagePreviewUrl}
          previewVideoUrl={detailVideoPreviewUrl}
          previewTextInheritedImageUrl={imagePreviewUrl}
          previewTextInheritedVideoUrl={videoPreviewUrl}
          previewOverlayInheritedImageUrl={imagePreviewUrl}
          previewOverlayInheritedVideoUrl={videoPreviewUrl}
          sentenceText={item.text}
          visualEffect={item.visualEffect}
          imageMotionEffect={item.imageMotionEffect}
          imageMotionSpeed={item.imageMotionSpeed}
          textAnimationEffect={item.textAnimationEffect}
          textAnimationText={item.textAnimationText}
          textSoundEffects={item.textSoundEffects ?? []}
          textBackgroundImage={item.textBackgroundImage ?? null}
          textBackgroundImageUrl={item.textBackgroundImageUrl ?? null}
          textBackgroundSavedImageId={item.textBackgroundSavedImageId ?? null}
          textBackgroundVideo={item.textBackgroundVideo ?? null}
          textBackgroundVideoUrl={item.textBackgroundVideoUrl ?? null}
          textBackgroundSavedVideoId={item.textBackgroundSavedVideoId ?? null}
          overlayFile={item.overlayFile ?? null}
          overlayUrl={item.overlayUrl ?? null}
          overlayMimeType={item.overlayMimeType ?? null}
          overlaySoundEffects={item.overlaySoundEffects ?? []}
          customImageFilterId={item.customImageFilterId ?? null}
          customMotionEffectId={item.customMotionEffectId ?? null}
          customTextAnimationId={item.customTextAnimationId ?? null}
          customOverlayId={item.customOverlayId ?? null}
          imageFilterSettings={item.imageFilterSettings ?? null}
          imageMotionSettings={item.imageMotionSettings ?? null}
          textAnimationSettings={item.textAnimationSettings ?? null}
          overlaySettings={item.overlaySettings ?? null}
          retainedTemporaryLook={retainedTemporaryLook}
          retainedTemporaryMotion={retainedTemporaryMotion}
          imageFilterPresets={imageFilterPresets}
          motionEffectPresets={motionEffectPresets}
          textAnimationPresets={textAnimationPresets}
          overlayPresets={overlayPresets}
          onClose={() => setIsImageEffectsDetailModalOpen(false)}
          onApply={({
            visualEffect,
            customImageFilterId,
            imageFilterSettings,
            imageMotionEffect,
            customMotionEffectId,
            imageMotionSettings,
            imageMotionSpeed,
            textAnimationEffect,
            customTextAnimationId,
            textAnimationSettings,
            textAnimationText,
            textSoundEffects,
            textBackgroundImage,
            textBackgroundImageUrl,
            textBackgroundSavedImageId,
            textBackgroundVideo,
            textBackgroundVideoUrl,
            textBackgroundSavedVideoId,
            customOverlayId,
            overlayFile,
            overlayUrl,
            overlayMimeType,
            overlaySettings,
            overlaySoundEffects,
          }) => {
            onSentencePatch({
              ...(imageEffectsTab === 'text'
                ? {
                    sceneTab: 'text' as const,
                    mediaMode: 'single' as const,
                  }
                : imageEffectsTab === 'overlay'
                  ? {
                      sceneTab: 'overlay' as const,
                      mediaMode: 'single' as const,
                    }
                  : {}),
              visualEffect,
              customImageFilterId,
              imageFilterSettings,
              imageMotionEffect,
              customMotionEffectId,
              imageMotionSettings,
              imageMotionSpeed,
              textAnimationEffect,
              customTextAnimationId,
              textAnimationSettings,
              textAnimationText,
              textSoundEffects,
              textBackgroundImage,
              textBackgroundImageUrl,
              textBackgroundSavedImageId,
              textBackgroundVideo,
              textBackgroundVideoUrl,
              textBackgroundSavedVideoId,
              customOverlayId,
              overlayFile,
              overlayUrl,
              overlayMimeType,
              overlaySettings,
              overlaySoundEffects,
            });
          }}
          onSaveImageFilterPreset={onSaveImageFilterPreset}
          onUpdateImageFilterPreset={onUpdateImageFilterPreset}
          onDeleteImageFilterPreset={onDeleteImageFilterPreset}
          onSaveMotionEffectPreset={onSaveMotionEffectPreset}
          onUpdateMotionEffectPreset={onUpdateMotionEffectPreset}
          onDeleteMotionEffectPreset={onDeleteMotionEffectPreset}
          onSaveTextAnimationPreset={onSaveTextAnimationPreset}
          onUpdateTextAnimationPreset={onUpdateTextAnimationPreset}
          onDeleteTextAnimationPreset={onDeleteTextAnimationPreset}
          onSaveOverlayPreset={onSaveOverlayPreset}
          onDeleteOverlayPreset={onDeleteOverlayPreset}
          onGenerateLookWithAi={(params) => onGenerateSingleImageLookWithAi(item.id, params)}
          onGenerateMotionWithAi={(params) => onGenerateSingleImageMotionWithAi(item.id, params)}
        />

        {isTextPreviewOverlayOpen ? (
          <TextPreviewOverlay
            isShortVideo={isShortVideo}
            sentenceText={item.text}
            text={item.textAnimationText}
            effect={resolvedTextAnimationEffect}
            settings={resolvedTextAnimationSettings}
            visualEffect={item.visualEffect ?? null}
            imageFilterSettings={item.imageFilterSettings ?? null}
            backgroundImageUrl={textPreviewBackgroundUrl}
            backgroundVideoUrl={textPreviewBackgroundVideoUrl}
            isPreviewClosing={isTextPreviewOverlayClosing}
            onRequestClose={closeTextPreviewOverlay}
          />
        ) : null}
      </div>
    </div>
  );
}

function areSentenceEditorCardPropsEqual(
  prev: SentenceEditorCardProps,
  next: SentenceEditorCardProps,
) {
  return (
    prev.item === next.item &&
    prev.index === next.index &&
    prev.isShortVideo === next.isShortVideo &&
    prev.sceneDurationSeconds === next.sceneDurationSeconds &&
    prev.isFirst === next.isFirst &&
    prev.isLast === next.isLast &&
    prev.videoModel === next.videoModel &&
    prev.scriptCharacters === next.scriptCharacters &&
    prev.scriptLocations === next.scriptLocations &&
    prev.imageFilterPresets === next.imageFilterPresets &&
    prev.motionEffectPresets === next.motionEffectPresets &&
    prev.textAnimationPresets === next.textAnimationPresets &&
    prev.overlayPresets === next.overlayPresets &&
    prev.isLoadingImageFilterPresets === next.isLoadingImageFilterPresets &&
    prev.isLoadingMotionEffectPresets === next.isLoadingMotionEffectPresets &&
    prev.isLoadingTextAnimationPresets === next.isLoadingTextAnimationPresets &&
    prev.isLoadingOverlayPresets === next.isLoadingOverlayPresets &&
    prev.enhanceError === next.enhanceError &&
    prev.isEnhancing === next.isEnhancing &&
    prev.isApplyingPrompt === next.isApplyingPrompt &&
    prev.isEnhanceMenuOpen === next.isEnhanceMenuOpen &&
    prev.isApplyingImagePrompt === next.isApplyingImagePrompt &&
    prev.imagePromptError === next.imagePromptError &&
    prev.isGeneratingVideo === next.isGeneratingVideo &&
    prev.isGeneratingVideoPrompt === next.isGeneratingVideoPrompt
  );
}

export const SentenceEditorCard = memo(
  SentenceEditorCardComponent,
  areSentenceEditorCardPropsEqual,
);
