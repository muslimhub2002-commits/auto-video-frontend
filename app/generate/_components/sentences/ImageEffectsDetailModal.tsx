'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog } from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  Clock3,
  Library,
  Loader2,
  Music2,
  Pause,
  Pencil,
  Play,
  Save,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

import type { SentenceItem, SentenceSoundEffectItem } from '../../_types/sentences';
import { SoundEffectEditModal, type SoundEffectEditValues } from '../SoundEffectEditModal';
import {
  SoundEffectsLibraryModal,
  type SoundEffectDto,
} from '../SoundEffectsLibraryModal';
import { computeSentenceSoundEffectTiming } from '../../_utils/soundEffectsTiming';
import {
  DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
  cloneSoundEffectAudioSettings,
  getSoundEffectPlaybackDurationSeconds,
  normalizeSoundEffectAudioSettings,
  resolveSoundEffectTrimWindow,
  type SoundEffectAudioSettings,
} from '../../_types/sound-effect-audio';
import {
  getDefaultImageFilterSettings,
  getDefaultImageMotionSettings,
  getDefaultImageMotionSpeed,
  getImageMotionEffectLabel,
  getVisualEffectLabel,
  IMAGE_MOTION_EFFECT_SELECT_VALUES,
  IMAGE_MOTION_SPEED_MAX,
  IMAGE_MOTION_SPEED_MIN,
  IMAGE_MOTION_SPEED_STEP,
  ImageEffectPreview,
  type ImageFilterPresetDto,
  type ImageFilterSettings,
  type ImageMotionSettings,
  type MotionEffectPresetDto,
  normalizeOverlaySettings,
  OVERLAY_BACKGROUND_MODE_VALUES,
  OVERLAY_TEXT_LAYER_VALUES,
  type OverlayPresetDto,
  type OverlaySettings,
  normalizeImageFilterSettings,
  normalizeImageMotionSettings,
  resolveImageMotionSpeed,
  resolveMotionEffectFromSettings,
  resolveVisualEffectFromSettings,
} from './ImageEffectPreview';
import {
  DEFAULT_TEXT_ANIMATION_WORD_DELAY,
  getDefaultTextAnimationSettings,
  getTextAnimationEffectLabel,
  normalizeTextAnimationSettings,
  resolveTextAnimationEffectFromSettings,
  resolveTextAnimationText,
  TEXT_ANIMATION_WORD_DELAY_MAX,
  TEXT_ANIMATION_WORD_DELAY_MIN,
  TEXT_ANIMATION_WORD_DELAY_STEP,
  TextAnimationPreview,
  TEXT_ANIMATION_EFFECT_VALUES,
  type TextAnimationPresetDto,
  type TextAnimationSettings,
} from './TextAnimationPreview';
import { OverlayScenePreview } from './OverlayScenePreview';
import { TEMPORARY_CUSTOM_PRESET_ID } from '../../_utils/imageEffectSelection';
import { createSoundEffectPreviewGraph } from '../../_utils/soundEffectPreviewGraph';
import { useManagedObjectUrl } from './useManagedObjectUrl';

const LOOK_EFFECT_VALUES = [
  'none',
  'colorGrading',
  'animatedLighting',
  'glassSubtle',
  'glassReflections',
  'glassStrong',
] as const;

type DetailTab = 'visual' | 'motion' | 'text' | 'overlay';

export type ImageEffectsDetailApplyParams = {
  visualEffect: SentenceItem['visualEffect'] | null;
  customImageFilterId: string | null;
  imageFilterSettings: ImageFilterSettings;
  imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
  customMotionEffectId: string | null;
  imageMotionSettings: ImageMotionSettings;
  imageMotionSpeed: number;
  textAnimationEffect: SentenceItem['textAnimationEffect'] | null;
  customTextAnimationId: string | null;
  textAnimationSettings: TextAnimationSettings;
  textAnimationText: string | null;
  textSoundEffects: SentenceSoundEffectItem[];
  textBackgroundImage: File | null;
  textBackgroundImageUrl: string | null;
  textBackgroundSavedImageId: string | null;
  textBackgroundVideo: File | null;
  textBackgroundVideoUrl: string | null;
  textBackgroundSavedVideoId: string | null;
  customOverlayId: string | null;
  overlayFile: File | null;
  overlayUrl: string | null;
  overlayMimeType: string | null;
  overlaySettings: OverlaySettings;
  overlaySoundEffects: SentenceSoundEffectItem[];
};

type DebouncedPreviewState = {
  visualEffect: SentenceItem['visualEffect'] | null;
  imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
  imageMotionSpeed: number;
  imageFilterSettings: ImageFilterSettings;
  imageMotionSettings: ImageMotionSettings;
  resetKey: number;
};

const PREVIEW_RESTART_DEBOUNCE_MS = 140;

const cloneSentenceSoundEffects = (
  items: SentenceSoundEffectItem[] | null | undefined,
): SentenceSoundEffectItem[] => {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => Boolean(item?.id) && Boolean(item?.url))
    .map((item) => ({
      id: String(item.id),
      title: String(item.title ?? '').trim() || 'Sound effect',
      url: String(item.url ?? '').trim(),
      delaySeconds: Math.max(0, Number(item.delaySeconds ?? 0) || 0),
      volumePercent: Math.max(
        0,
        Math.min(300, Number(item.volumePercent ?? 100) || 100),
      ),
      timingMode:
        item.timingMode === 'afterPreviousEnds' ? 'afterPreviousEnds' : 'withPrevious',
      audioSettings: cloneSoundEffectAudioSettings(item.audioSettings),
      defaultAudioSettings: cloneSoundEffectAudioSettings(item.defaultAudioSettings),
      durationSeconds:
        typeof item.durationSeconds === 'number' && Number.isFinite(item.durationSeconds)
          ? Math.max(0, item.durationSeconds)
          : null,
    }));
};

const normalizeSentenceSoundEffects = (
  items: SentenceSoundEffectItem[] | null | undefined,
): SentenceSoundEffectItem[] => {
  return cloneSentenceSoundEffects(items);
};

const areSentenceSoundEffectsEqual = (
  left: SentenceSoundEffectItem[] | null | undefined,
  right: SentenceSoundEffectItem[] | null | undefined,
) => {
  const serialize = (items: SentenceSoundEffectItem[] | null | undefined) =>
    JSON.stringify(
      cloneSentenceSoundEffects(items).map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        delaySeconds: item.delaySeconds,
        volumePercent: item.volumePercent,
        timingMode: item.timingMode ?? 'withPrevious',
        audioSettings: normalizeSoundEffectAudioSettings(item.audioSettings),
        defaultAudioSettings: normalizeSoundEffectAudioSettings(item.defaultAudioSettings),
        durationSeconds:
          typeof item.durationSeconds === 'number' && Number.isFinite(item.durationSeconds)
            ? Math.max(0, item.durationSeconds)
            : null,
      })),
    );

  return serialize(left) === serialize(right);
};

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

type ImageEffectsDetailModalProps = {
  isOpen: boolean;
  isShortVideo: boolean;
  activeTab: DetailTab;
  enabledTabs?: DetailTab[];
  variant?: 'default' | 'look-only-upload';
  previewImageUrl: string | null;
  previewTextInheritedImageUrl?: string | null;
  previewTextInheritedVideoUrl?: string | null;
  previewOverlayInheritedImageUrl?: string | null;
  previewOverlayInheritedVideoUrl?: string | null;
  sentenceText?: string;
  visualEffect: SentenceItem['visualEffect'] | null | undefined;
  imageMotionEffect: SentenceItem['imageMotionEffect'] | null | undefined;
  imageMotionSpeed: number | null | undefined;
  textAnimationEffect: SentenceItem['textAnimationEffect'] | null | undefined;
  textAnimationText: string | null | undefined;
  textSoundEffects?: SentenceSoundEffectItem[];
  textBackgroundImage?: File | null;
  textBackgroundImageUrl?: string | null;
  textBackgroundSavedImageId?: string | null;
  textBackgroundVideo?: File | null;
  textBackgroundVideoUrl?: string | null;
  textBackgroundSavedVideoId?: string | null;
  overlayFile?: File | null;
  overlayUrl?: string | null;
  overlayMimeType?: string | null;
  overlaySoundEffects?: SentenceSoundEffectItem[];
  customImageFilterId: string | null | undefined;
  customMotionEffectId: string | null | undefined;
  customTextAnimationId: string | null | undefined;
  customOverlayId: string | null | undefined;
  imageFilterSettings: Record<string, unknown> | null | undefined;
  imageMotionSettings: Record<string, unknown> | null | undefined;
  textAnimationSettings: Record<string, unknown> | null | undefined;
  overlaySettings: Record<string, unknown> | null | undefined;
  retainedTemporaryLook?: {
    visualEffect: SentenceItem['visualEffect'] | null;
    imageFilterSettings: ImageFilterSettings;
  } | null;
  retainedTemporaryMotion?: {
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
  } | null;
  imageFilterPresets: ImageFilterPresetDto[];
  motionEffectPresets: MotionEffectPresetDto[];
  textAnimationPresets: TextAnimationPresetDto[];
  overlayPresets: OverlayPresetDto[];
  onClose: () => void;
  onApply: (params: ImageEffectsDetailApplyParams) => void;
  onDownload?: (params: ImageEffectsDetailApplyParams) => Promise<void> | void;
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
    soundEffects: SentenceSoundEffectItem[],
  ) => Promise<TextAnimationPresetDto | null> | TextAnimationPresetDto | null;
  onUpdateTextAnimationPreset: (
    presetId: string,
    settings: TextAnimationSettings,
    soundEffects: SentenceSoundEffectItem[],
  ) => Promise<TextAnimationPresetDto | null> | TextAnimationPresetDto | null;
  onDeleteTextAnimationPreset: (presetId: string) => Promise<boolean> | boolean;
  onSaveOverlayPreset: (params: {
    title: string;
    settings: OverlaySettings;
    file?: File | null;
    sourceUrl?: string | null;
    overlayId?: string | null;
    soundEffects?: SentenceSoundEffectItem[];
  }) => Promise<OverlayPresetDto | null> | OverlayPresetDto | null;
  onDeleteOverlayPreset: (overlayId: string) => Promise<boolean> | boolean;
  onGenerateLookWithAi: (params: {
    visualEffect: SentenceItem['visualEffect'] | null;
    customImageFilterId: string | null;
    imageFilterSettings: ImageFilterSettings;
  }) => Promise<{
    visualEffect: SentenceItem['visualEffect'] | null;
    customImageFilterId: null;
    imageFilterSettings: ImageFilterSettings;
  } | null>;
  onGenerateMotionWithAi: (params: {
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    customMotionEffectId: string | null;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
  }) => Promise<{
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    customMotionEffectId: null;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
  } | null>;
};

function RangeField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`space-y-2 ${props.disabled ? 'opacity-45' : ''}`}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
        <span>{props.label}</span>
        <span>{props.value.toFixed(props.step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        disabled={props.disabled}
        className={`h-2 w-full accent-indigo-600 ${props.disabled ? 'cursor-not-allowed accent-slate-300' : 'cursor-pointer'}`}
      />
    </label>
  );
}

function EndValueModeField(props: {
  label: string;
  value: 'loop' | 'continue';
  disabled?: boolean;
  name: string;
  onChange: (value: 'loop' | 'continue') => void;
}) {
  return (
    <div
      className={`space-y-2 mt-2 rounded-xl border px-3 py-3 ${
        props.disabled
          ? 'border-slate-200 bg-slate-50 text-slate-400'
          : 'border-sky-200 bg-sky-50 text-sky-900'
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
        {props.label}
      </div>
      <div className="flex flex-wrap gap-3">
        <label
          className={`flex items-center gap-2 text-xs font-medium ${
            props.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <input
            type="radio"
            name={props.name}
            checked={props.value === 'loop'}
            disabled={props.disabled}
            onChange={() => props.onChange('loop')}
            className="h-4 w-4 border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span>Loop between start and end</span>
        </label>
        <label
          className={`flex items-center gap-2 text-xs font-medium ${
            props.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <input
            type="radio"
            name={props.name}
            checked={props.value === 'continue'}
            disabled={props.disabled}
            onChange={() => props.onChange('continue')}
            className="h-4 w-4 border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span>Continue past the end value</span>
        </label>
      </div>
    </div>
  );
}

function getUnifiedEndValueMode(settings: ImageMotionSettings): 'loop' | 'continue' {
  return settings.scaleEndNoLimit ||
    settings.translateXEndNoLimit ||
    settings.translateYEndNoLimit ||
    settings.rotateEndNoLimit
    ? 'continue'
    : 'loop';
}

export function ImageEffectsDetailModal({
  isOpen,
  isShortVideo,
  activeTab,
  enabledTabs,
  variant = 'default',
  previewImageUrl,
  previewTextInheritedImageUrl = null,
  previewTextInheritedVideoUrl = null,
  previewOverlayInheritedImageUrl = null,
  previewOverlayInheritedVideoUrl = null,
  sentenceText,
  visualEffect,
  imageMotionEffect,
  imageMotionSpeed,
  textAnimationEffect,
  textAnimationText,
  textSoundEffects = [],
  textBackgroundImage = null,
  textBackgroundImageUrl = null,
  textBackgroundSavedImageId = null,
  textBackgroundVideo = null,
  textBackgroundVideoUrl = null,
  textBackgroundSavedVideoId = null,
  overlayFile = null,
  overlayUrl = null,
  overlayMimeType = null,
  overlaySoundEffects = [],
  customImageFilterId,
  customMotionEffectId,
  customTextAnimationId,
  customOverlayId,
  imageFilterSettings,
  imageMotionSettings,
  textAnimationSettings,
  overlaySettings,
  retainedTemporaryLook,
  retainedTemporaryMotion,
  imageFilterPresets,
  motionEffectPresets,
  textAnimationPresets,
  overlayPresets,
  onClose,
  onApply,
  onDownload,
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
  onGenerateLookWithAi,
  onGenerateMotionWithAi,
}: ImageEffectsDetailModalProps) {
  const availableTabs = useMemo<DetailTab[]>(() => {
    const rawTabs = Array.isArray(enabledTabs) && enabledTabs.length > 0
      ? enabledTabs
      : ['visual', 'motion', 'text', 'overlay'];

    return rawTabs.filter(
      (value, index, array): value is DetailTab =>
        (value === 'visual' || value === 'motion' || value === 'text' || value === 'overlay') &&
        array.indexOf(value) === index,
    );
  }, [enabledTabs]);
  const isLookOnlyUploadVariant = variant === 'look-only-upload';
  const showTabSwitcher = availableTabs.length > 1;
  const incomingImageMotionSpeed = resolveImageMotionSpeed(
    imageMotionSpeed,
    imageMotionSettings,
    isShortVideo,
  );
  const textSoundEffectsInputRef = useRef<HTMLInputElement | null>(null);
  const overlaySoundEffectsInputRef = useRef<HTMLInputElement | null>(null);
  const textBackgroundInputRef = useRef<HTMLInputElement | null>(null);
  const textBackgroundVideoInputRef = useRef<HTMLInputElement | null>(null);
  const overlayInputRef = useRef<HTMLInputElement | null>(null);
  const [currentTab, setCurrentTab] = useState<DetailTab>(activeTab);
  const [lookSaveTitle, setLookSaveTitle] = useState('');
  const [motionSaveTitle, setMotionSaveTitle] = useState('');
  const [textSaveTitle, setTextSaveTitle] = useState('');
  const [overlaySaveTitle, setOverlaySaveTitle] = useState('');
  const [isSavingLookPreset, setIsSavingLookPreset] = useState(false);
  const [isSavingMotionPreset, setIsSavingMotionPreset] = useState(false);
  const [isSavingTextPreset, setIsSavingTextPreset] = useState(false);
  const [isSavingOverlayPreset, setIsSavingOverlayPreset] = useState(false);
  const [isOverridingLookPreset, setIsOverridingLookPreset] = useState(false);
  const [isOverridingMotionPreset, setIsOverridingMotionPreset] = useState(false);
  const [isOverridingTextPreset, setIsOverridingTextPreset] = useState(false);
  const [isOverridingOverlayPreset, setIsOverridingOverlayPreset] = useState(false);
  const [isDeletingLookPreset, setIsDeletingLookPreset] = useState(false);
  const [isDeletingMotionPreset, setIsDeletingMotionPreset] = useState(false);
  const [isDeletingTextPreset, setIsDeletingTextPreset] = useState(false);
  const [isDeletingOverlayPreset, setIsDeletingOverlayPreset] = useState(false);
  const [isGeneratingLookWithAi, setIsGeneratingLookWithAi] = useState(false);
  const [isGeneratingMotionWithAi, setIsGeneratingMotionWithAi] = useState(false);
  const [isSoundEffectsLibraryOpen, setIsSoundEffectsLibraryOpen] = useState(false);
  const [soundEffectsLibraryTarget, setSoundEffectsLibraryTarget] = useState<'text' | 'overlay' | null>(null);
  const [editingSoundEffectTarget, setEditingSoundEffectTarget] = useState<{
    kind: 'text' | 'overlay';
    index: number;
  } | null>(null);
  const [mixEditTarget, setMixEditTarget] = useState<'text' | 'overlay' | null>(null);
  const [mixEditDraft, setMixEditDraft] = useState<{
    audioUrl: string | null;
    name: string;
    volumePercent: number;
    audioSettings: SoundEffectAudioSettings;
  } | null>(null);
  const [isLoadingMixEditor, setIsLoadingMixEditor] = useState(false);
  const [isApplyingSingleSoundEffectEdit, setIsApplyingSingleSoundEffectEdit] = useState(false);
  const [isApplyingMixEdit, setIsApplyingMixEdit] = useState(false);
  const [soundEffectEditError, setSoundEffectEditError] = useState<string | null>(null);
  const [soundEffectMixError, setSoundEffectMixError] = useState<string | null>(null);
  const [textSoundEffectsError, setTextSoundEffectsError] = useState<string | null>(null);
  const [overlaySoundEffectsError, setOverlaySoundEffectsError] = useState<string | null>(null);
  const [isUploadingSoundEffect, setIsUploadingSoundEffect] = useState(false);
  const [previewRestartNonce, setPreviewRestartNonce] = useState(0);
  const [stackStatusByKind, setStackStatusByKind] = useState<{
    text: 'idle' | 'loading' | 'playing';
    overlay: 'idle' | 'loading' | 'playing';
  }>({ text: 'idle', overlay: 'idle' });
  const [singleStatusByKey, setSingleStatusByKey] = useState<Record<string, 'idle' | 'loading' | 'playing'>>({});
  const soundEffectsPreviewRef = useRef<{
    timeouts: number[];
    audios: HTMLAudioElement[];
    cleanups: Array<() => void | Promise<void>>;
  }>({ timeouts: [], audios: [], cleanups: [] });
  const soundEffectsEverStartedRef = useRef<Set<string>>(new Set());
  const [lookActionError, setLookActionError] = useState<string | null>(null);
  const [motionActionError, setMotionActionError] = useState<string | null>(null);
  const [textActionError, setTextActionError] = useState<string | null>(null);
  const [overlayActionError, setOverlayActionError] = useState<string | null>(null);
  const [deletePresetKind, setDeletePresetKind] = useState<DetailTab | null>(null);
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [draftVisualEffect, setDraftVisualEffect] = useState<SentenceItem['visualEffect'] | null>(
    visualEffect ?? null,
  );
  const [draftImageMotionEffect, setDraftImageMotionEffect] = useState<
    NonNullable<SentenceItem['imageMotionEffect']>
  >(imageMotionEffect ?? 'default');
  const [draftImageMotionSpeed, setDraftImageMotionSpeed] = useState<number>(
    incomingImageMotionSpeed,
  );
  const [draftCustomImageFilterId, setDraftCustomImageFilterId] = useState<string | null>(
    customImageFilterId ?? null,
  );
  const [draftCustomMotionEffectId, setDraftCustomMotionEffectId] = useState<string | null>(
    customMotionEffectId ?? null,
  );
  const [draftTextAnimationEffect, setDraftTextAnimationEffect] = useState<
    SentenceItem['textAnimationEffect'] | null
  >(
    resolveTextAnimationEffectFromSettings(textAnimationSettings, textAnimationEffect),
  );
  const [draftTextAnimationText, setDraftTextAnimationText] = useState<string>(
    resolveTextAnimationText(textAnimationText, sentenceText),
  );
  const [draftTextSoundEffects, setDraftTextSoundEffects] = useState<SentenceSoundEffectItem[]>(
    () => cloneSentenceSoundEffects(textSoundEffects),
  );
  const [draftTextBackgroundImage, setDraftTextBackgroundImage] = useState<File | null>(
    textBackgroundImage ?? null,
  );
  const [draftTextBackgroundImageUrl, setDraftTextBackgroundImageUrl] = useState<string | null>(
    textBackgroundImageUrl ?? null,
  );
  const [draftTextBackgroundSavedImageId, setDraftTextBackgroundSavedImageId] = useState<string | null>(
    textBackgroundSavedImageId ?? null,
  );
  const [draftTextBackgroundVideo, setDraftTextBackgroundVideo] = useState<File | null>(
    textBackgroundVideo ?? null,
  );
  const [draftTextBackgroundVideoUrl, setDraftTextBackgroundVideoUrl] = useState<string | null>(
    textBackgroundVideoUrl ?? null,
  );
  const [draftTextBackgroundSavedVideoId, setDraftTextBackgroundSavedVideoId] = useState<string | null>(
    textBackgroundSavedVideoId ?? null,
  );
  const [draftCustomTextAnimationId, setDraftCustomTextAnimationId] = useState<string | null>(
    customTextAnimationId ?? null,
  );
  const [draftCustomOverlayId, setDraftCustomOverlayId] = useState<string | null>(
    customOverlayId ?? null,
  );
  const [draftOverlayFile, setDraftOverlayFile] = useState<File | null>(overlayFile ?? null);
  const [draftOverlayUrl, setDraftOverlayUrl] = useState<string | null>(overlayUrl ?? null);
  const [draftOverlayMimeType, setDraftOverlayMimeType] = useState<string | null>(
    overlayMimeType ?? null,
  );
  const [draftOverlaySoundEffects, setDraftOverlaySoundEffects] = useState<SentenceSoundEffectItem[]>(
    () => cloneSentenceSoundEffects(overlaySoundEffects),
  );
  const [draftImageFilterSettings, setDraftImageFilterSettings] = useState<ImageFilterSettings>(
    () => normalizeImageFilterSettings(imageFilterSettings, visualEffect ?? null),
  );
  const [draftImageMotionSettings, setDraftImageMotionSettings] = useState<ImageMotionSettings>(
    () =>
      normalizeImageMotionSettings(
        imageMotionSettings,
        imageMotionEffect ?? 'default',
        incomingImageMotionSpeed,
        isShortVideo,
      ),
  );
  const [draftTextAnimationSettings, setDraftTextAnimationSettings] = useState<TextAnimationSettings>(
    () =>
      normalizeTextAnimationSettings(
        textAnimationSettings,
        resolveTextAnimationEffectFromSettings(textAnimationSettings, textAnimationEffect),
        isShortVideo,
      ),
  );
  const [draftOverlaySettings, setDraftOverlaySettings] = useState<OverlaySettings>(
    () => normalizeOverlaySettings(overlaySettings, 'image'),
  );
  const [retainedDraftTemporaryLook, setRetainedDraftTemporaryLook] = useState<{
    visualEffect: SentenceItem['visualEffect'] | null;
    imageFilterSettings: ImageFilterSettings;
  } | null>(retainedTemporaryLook ?? null);
  const [retainedDraftTemporaryMotion, setRetainedDraftTemporaryMotion] = useState<{
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
  } | null>(retainedTemporaryMotion ?? null);

  const resolvedLook = useMemo(
    () => normalizeImageFilterSettings(draftImageFilterSettings, draftVisualEffect ?? null),
    [draftImageFilterSettings, draftVisualEffect],
  );
  const resolvedMotion = useMemo(
    () =>
      normalizeImageMotionSettings(
        draftImageMotionSettings,
        draftImageMotionEffect ?? 'default',
        draftImageMotionSpeed,
        isShortVideo,
      ),
    [draftImageMotionEffect, draftImageMotionSettings, draftImageMotionSpeed, isShortVideo],
  );
  const resolvedText = useMemo(
    () =>
      normalizeTextAnimationSettings(
        draftTextAnimationSettings,
        draftTextAnimationEffect,
        isShortVideo,
      ),
    [draftTextAnimationEffect, draftTextAnimationSettings, isShortVideo],
  );
  const resolvedOverlay = useMemo(
    () => normalizeOverlaySettings(draftOverlaySettings, 'image'),
    [draftOverlaySettings],
  );
  const canManageTextSoundEffects = Boolean(draftTextAnimationEffect);
  const canManageOverlaySoundEffects = Boolean(
    draftOverlayFile || String(draftOverlayUrl ?? '').trim(),
  );

  const getDraftSoundEffects = (kind: 'text' | 'overlay') =>
    kind === 'text' ? draftTextSoundEffects : draftOverlaySoundEffects;

  const commitDraftSoundEffects = (
    kind: 'text' | 'overlay',
    next: SentenceSoundEffectItem[] | null | undefined,
  ) => {
    const normalized = normalizeSentenceSoundEffects(next);
    if (kind === 'text') {
      setDraftTextSoundEffects(normalized);
      return;
    }
    setDraftOverlaySoundEffects(normalized);
  };

  const setSoundEffectsPanelError = (kind: 'text' | 'overlay', message: string | null) => {
    if (kind === 'text') {
      setTextSoundEffectsError(message);
      return;
    }
    setOverlaySoundEffectsError(message);
  };

  const getSoundEffectPreviewKey = (kind: 'text' | 'overlay', index: number, url: string) => {
    return `${kind}:${index}:${String(url ?? '').trim()}`;
  };

  const getSharedSoundEffectVolume = (kind: 'text' | 'overlay') => {
    const items = getDraftSoundEffects(kind);
    if (items.length === 0) return 100;
    const normalizedVolumes = items.map((effect) =>
      Math.max(0, Math.min(300, Number(effect.volumePercent ?? 100) || 100)),
    );
    const firstVolume = normalizedVolumes[0] ?? 100;
    return normalizedVolumes.every((volume) => Math.abs(volume - firstVolume) < 0.0001)
      ? firstVolume
      : 100;
  };

  const getSharedSoundEffectAudioSettings = (kind: 'text' | 'overlay') => {
    const items = getDraftSoundEffects(kind);
    if (items.length === 0) {
      return cloneSoundEffectAudioSettings(DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS);
    }

    const normalized = items.map((effect) =>
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

  const stopAllScheduledAudio = () => {
    for (const timeoutId of soundEffectsPreviewRef.current.timeouts) {
      window.clearTimeout(timeoutId);
    }
    soundEffectsPreviewRef.current.timeouts = [];

    for (const audio of soundEffectsPreviewRef.current.audios) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
    }
    soundEffectsPreviewRef.current.audios = [];

    for (const cleanup of soundEffectsPreviewRef.current.cleanups) {
      try {
        void cleanup();
      } catch {
        // ignore cleanup errors
      }
    }
    soundEffectsPreviewRef.current.cleanups = [];

    setStackStatusByKind({ text: 'idle', overlay: 'idle' });
    setSingleStatusByKey({});
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

  const playSoundEffectsStack = (kind: 'text' | 'overlay', items?: SentenceSoundEffectItem[]) => {
    const effects = normalizeSentenceSoundEffects(items ?? getDraftSoundEffects(kind));
    if (effects.length === 0) return;

    stopAllScheduledAudio();

    const timedSoundEffects = computeSentenceSoundEffectTiming(effects);
    const shouldShowLoading = timedSoundEffects.some((effect, index) => {
      const key = getSoundEffectPreviewKey(kind, index, effect.url);
      return !soundEffectsEverStartedRef.current.has(key);
    });

    setStackStatusByKind((prev) => ({
      ...prev,
      [kind]: shouldShowLoading ? 'loading' : 'playing',
    }));

    let ended = 0;
    const total = timedSoundEffects.length;

    for (const [index, effect] of timedSoundEffects.entries()) {
      const key = getSoundEffectPreviewKey(kind, index, effect.url);
      scheduleAudio({
        url: effect.url,
        delaySeconds: effect.absoluteDelaySeconds,
        volumePercent: effect.volumePercent,
        audioSettings: effect.audioSettings,
        trimStartSeconds: effect.trimStartSeconds,
        trimDurationSeconds: effect.durationSeconds,
        onPlaying: () => {
          soundEffectsEverStartedRef.current.add(key);
          setStackStatusByKind((prev) => ({ ...prev, [kind]: 'playing' }));
        },
        onEnded: () => {
          ended += 1;
          if (ended >= total) {
            setStackStatusByKind((prev) => ({ ...prev, [kind]: 'idle' }));
          }
        },
        onError: () => {
          setStackStatusByKind((prev) => ({ ...prev, [kind]: 'idle' }));
        },
      });
    }
  };

  const playSingleSoundEffect = (kind: 'text' | 'overlay', index: number) => {
    const effect = getDraftSoundEffects(kind)[index];
    if (!effect) return;

    const key = getSoundEffectPreviewKey(kind, index, effect.url);
    const shouldShowLoading = !soundEffectsEverStartedRef.current.has(key);
    const trimWindow = resolveSoundEffectTrimWindow(
      effect.audioSettings,
      effect.durationSeconds ?? null,
    );

    stopAllScheduledAudio();
    setSingleStatusByKey({ [key]: shouldShowLoading ? 'loading' : 'playing' });

    scheduleAudio({
      url: effect.url,
      delaySeconds: Math.max(0, Number(effect.delaySeconds ?? 0) || 0),
      volumePercent: effect.volumePercent,
      audioSettings: effect.audioSettings,
      trimStartSeconds: trimWindow.startSeconds,
      trimDurationSeconds: trimWindow.effectiveDurationSeconds,
      onPlaying: () => {
        soundEffectsEverStartedRef.current.add(key);
        setSingleStatusByKey({ [key]: 'playing' });
      },
      onEnded: () => setSingleStatusByKey({}),
      onError: () => setSingleStatusByKey({}),
    });
  };

  const buildSoundEffectMergeItems = (items: SentenceSoundEffectItem[]) => {
    return computeSentenceSoundEffectTiming(items).map((effect) => ({
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

  const handleApplySoundEffectsFromLibrary = (items: SoundEffectDto[]) => {
    if (!soundEffectsLibraryTarget) return;

    const current = getDraftSoundEffects(soundEffectsLibraryTarget);
    const additions = (items ?? []).map((item) => ({
      id: item.id,
      title: String(item.name ?? item.title ?? 'Sound effect').trim() || 'Sound effect',
      url: String(item.url ?? '').trim(),
      delaySeconds: 0,
      volumePercent: Math.max(0, Math.min(300, Number(item.volume_percent ?? 100) || 100)),
      audioSettings: cloneSoundEffectAudioSettings(item.audio_settings),
      defaultAudioSettings: cloneSoundEffectAudioSettings(item.audio_settings),
      timingMode: 'withPrevious' as const,
      durationSeconds:
        typeof item.duration_seconds === 'number' && Number.isFinite(item.duration_seconds)
          ? Math.max(0, item.duration_seconds)
          : null,
    }));

    commitDraftSoundEffects(soundEffectsLibraryTarget, [...current, ...additions]);
    setSoundEffectsPanelError(soundEffectsLibraryTarget, null);
    setIsSoundEffectsLibraryOpen(false);
    setSoundEffectsLibraryTarget(null);
  };

  const handleUploadSoundEffects = async (kind: 'text' | 'overlay', files: File[]) => {
    const list = Array.isArray(files) ? files.filter(Boolean) : [];
    if (list.length === 0) return;

    setIsUploadingSoundEffect(true);
    setSoundEffectsPanelError(kind, null);

    try {
      const createdItems: Array<{
        id: string;
        title: string;
        name?: string;
        url: string;
        volume_percent?: number;
        audio_settings?: Record<string, unknown> | null;
        duration_seconds?: number | null;
      }> = [];

      if (list.length === 1) {
        const file = list[0];
        const title = String(file.name ?? '').replace(/\.[^.]+$/u, '').trim() || 'Sound effect';
        const form = new FormData();
        form.append('soundEffect', file);
        form.append('title', title);

        const response = await api.post<typeof createdItems[number]>('/sound-effects', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        createdItems.push(response.data);
      } else {
        const form = new FormData();
        for (const file of list) {
          form.append('soundEffects', file);
        }

        const response = await api.post<{ items: typeof createdItems }>('/sound-effects/batch', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        createdItems.push(...(Array.isArray(response.data?.items) ? response.data.items : []));
      }

      const current = getDraftSoundEffects(kind);
      commitDraftSoundEffects(kind, [
        ...current,
        ...createdItems.map((created, index) => ({
          id: created.id,
          title:
            String(created.name ?? created.title ?? list[index]?.name ?? 'Sound effect')
              .replace(/\.[^.]+$/u, '')
              .trim() || 'Sound effect',
          url: created.url,
          delaySeconds: 0,
          volumePercent: Math.max(
            0,
            Math.min(300, Number(created.volume_percent ?? 100) || 100),
          ),
          audioSettings: cloneSoundEffectAudioSettings(created.audio_settings),
          defaultAudioSettings: cloneSoundEffectAudioSettings(created.audio_settings),
          timingMode: 'withPrevious' as const,
          durationSeconds:
            typeof created.duration_seconds === 'number' && Number.isFinite(created.duration_seconds)
              ? Math.max(0, created.duration_seconds)
              : null,
        })),
      ]);
    } catch (error) {
      setSoundEffectsPanelError(
        kind,
        getApiErrorMessage(error, 'Failed to upload sound effect. Try again.'),
      );
    } finally {
      setIsUploadingSoundEffect(false);
    }
  };

  const handleOpenMixEditor = async (kind: 'text' | 'overlay') => {
    const items = getDraftSoundEffects(kind);
    if (items.length === 0) return;

    stopAllScheduledAudio();
    setMixEditTarget(kind);
    setSoundEffectMixError(null);

    if (items.length === 1) {
      setMixEditDraft({
        audioUrl: items[0]?.url ?? null,
        name: kind === 'text' ? 'Text sound stack' : 'Overlay sound stack',
        volumePercent: getSharedSoundEffectVolume(kind),
        audioSettings: getSharedSoundEffectAudioSettings(kind),
      });
      return;
    }

    setIsLoadingMixEditor(true);
    try {
      const response = await api.post<{ title?: string; url: string }>('/sound-effects/merge-preview', {
        title: kind === 'text' ? 'Text sound stack' : 'Overlay sound stack',
        items: buildSoundEffectMergeItems(items),
      });

      setMixEditDraft({
        audioUrl: response.data.url,
        name:
          String(
            response.data.title ?? (kind === 'text' ? 'Text sound stack' : 'Overlay sound stack'),
          ).trim() || (kind === 'text' ? 'Text sound stack' : 'Overlay sound stack'),
        volumePercent: getSharedSoundEffectVolume(kind),
        audioSettings: getSharedSoundEffectAudioSettings(kind),
      });
    } catch (error) {
      setMixEditTarget(null);
      setSoundEffectMixError(
        getApiErrorMessage(error, 'Failed to open the sound stack editor. Try again.'),
      );
    } finally {
      setIsLoadingMixEditor(false);
    }
  };

  const handleStartFromBeginning = (kind: 'text' | 'overlay') => {
    setPreviewRestartNonce((prev) => prev + 1);
    const items = getDraftSoundEffects(kind);
    if (items.length > 0) {
      playSoundEffectsStack(kind, items);
      return;
    }
    stopAllScheduledAudio();
  };
  const draftTextBackgroundObjectUrl = useManagedObjectUrl(draftTextBackgroundImage);
  const draftTextBackgroundVideoObjectUrl = useManagedObjectUrl(draftTextBackgroundVideo);
  const draftOverlayObjectUrl = useManagedObjectUrl(draftOverlayFile);
  const customTextBackgroundPreviewUrl =
    draftTextBackgroundObjectUrl ?? draftTextBackgroundImageUrl ?? null;
  const customTextBackgroundVideoPreviewUrl =
    draftTextBackgroundVideoObjectUrl ?? draftTextBackgroundVideoUrl ?? null;
  const resolvedOverlayPreviewUrl = draftOverlayObjectUrl ?? draftOverlayUrl ?? null;
  const resolvedOverlaySceneImageUrl =
    previewOverlayInheritedImageUrl ?? previewTextInheritedImageUrl ?? null;
  const resolvedOverlaySceneVideoUrl =
    previewOverlayInheritedVideoUrl ?? previewTextInheritedVideoUrl ?? null;
  const resolvedTextPreviewBackgroundUrl =
    resolvedText.backgroundMode === 'image'
      ? customTextBackgroundPreviewUrl
      : resolvedText.backgroundMode === 'inheritImage'
        ? previewTextInheritedImageUrl
        : null;
  const resolvedTextPreviewBackgroundVideoUrl =
    resolvedText.backgroundMode === 'video'
      ? customTextBackgroundVideoPreviewUrl
      : resolvedText.backgroundMode === 'inheritVideo'
        ? previewTextInheritedVideoUrl
        : null;
  const textPreviewFrameClass = isShortVideo
    ? 'w-full max-w-[22rem] aspect-[9/16]'
    : 'w-full max-w-4xl aspect-video';
  const selectedLookPreset = useMemo(
    () => imageFilterPresets.find((item) => item.id === draftCustomImageFilterId) ?? null,
    [draftCustomImageFilterId, imageFilterPresets],
  );
  const selectedMotionPreset = useMemo(
    () => motionEffectPresets.find((item) => item.id === draftCustomMotionEffectId) ?? null,
    [draftCustomMotionEffectId, motionEffectPresets],
  );
  const selectedTextPreset = useMemo(
    () => textAnimationPresets.find((item) => item.id === draftCustomTextAnimationId) ?? null,
    [draftCustomTextAnimationId, textAnimationPresets],
  );
  const selectedOverlayPreset = useMemo(
    () => overlayPresets.find((item) => item.id === draftCustomOverlayId) ?? null,
    [draftCustomOverlayId, overlayPresets],
  );
  const selectedLookPresetEffect = useMemo(
    () =>
      selectedLookPreset
        ? resolveVisualEffectFromSettings(selectedLookPreset.settings, draftVisualEffect ?? null)
        : null,
    [draftVisualEffect, selectedLookPreset],
  );
  const selectedMotionPresetEffect = useMemo(
    () =>
      selectedMotionPreset
        ? resolveMotionEffectFromSettings(
            selectedMotionPreset.settings,
            draftImageMotionEffect ?? 'default',
          )
        : 'default',
    [draftImageMotionEffect, selectedMotionPreset],
  );
  const selectedTextPresetEffect = useMemo(
    () =>
      selectedTextPreset
        ? resolveTextAnimationEffectFromSettings(
            selectedTextPreset.settings,
            draftTextAnimationEffect,
          )
        : resolveTextAnimationEffectFromSettings(
            draftTextAnimationSettings,
            draftTextAnimationEffect,
          ),
    [draftTextAnimationEffect, draftTextAnimationSettings, selectedTextPreset],
  );
  const selectedLookPresetSettings = useMemo(
    () =>
      selectedLookPreset
        ? normalizeImageFilterSettings(selectedLookPreset.settings, selectedLookPresetEffect)
        : null,
    [selectedLookPreset, selectedLookPresetEffect],
  );
  const selectedMotionPresetSettings = useMemo(
    () =>
      selectedMotionPreset
        ? normalizeImageMotionSettings(
            selectedMotionPreset.settings,
            selectedMotionPresetEffect,
            draftImageMotionSpeed,
            isShortVideo,
          )
        : null,
    [draftImageMotionSpeed, isShortVideo, selectedMotionPreset, selectedMotionPresetEffect],
  );
  const selectedTextPresetSettings = useMemo(
    () =>
      selectedTextPreset
        ? normalizeTextAnimationSettings(
            selectedTextPreset.settings,
            selectedTextPresetEffect,
            isShortVideo,
          )
        : null,
    [isShortVideo, selectedTextPreset, selectedTextPresetEffect],
  );
  const selectedOverlayPresetSettings = useMemo(
    () =>
      selectedOverlayPreset
        ? normalizeOverlaySettings(
            selectedOverlayPreset.settings,
            resolvedOverlay.backgroundMode ?? 'image',
          )
        : null,
    [resolvedOverlay.backgroundMode, selectedOverlayPreset],
  );
  const isLookDirtyFromSelectedPreset = Boolean(
    selectedLookPreset &&
      ((selectedLookPresetEffect ?? null) !== (draftVisualEffect ?? null) ||
        JSON.stringify(selectedLookPresetSettings) !== JSON.stringify(resolvedLook)),
  );
  const isMotionDirtyFromSelectedPreset = Boolean(
    selectedMotionPreset &&
      (selectedMotionPresetEffect !== (draftImageMotionEffect ?? 'default') ||
        JSON.stringify(selectedMotionPresetSettings) !== JSON.stringify(resolvedMotion)),
  );
  const isTextDirtyFromSelectedPreset = Boolean(
    selectedTextPreset &&
      (selectedTextPresetEffect !== draftTextAnimationEffect ||
        JSON.stringify(selectedTextPresetSettings) !== JSON.stringify(resolvedText) ||
        !areSentenceSoundEffectsEqual(selectedTextPreset.soundEffects, draftTextSoundEffects)),
  );
  const isOverlayDirtyFromSelectedPreset = Boolean(
    selectedOverlayPreset &&
      (Boolean(draftOverlayFile) ||
        String(selectedOverlayPreset.url ?? '').trim() !== String(draftOverlayUrl ?? '').trim() ||
        String(selectedOverlayPreset.mimeType ?? '').trim() !== String(draftOverlayMimeType ?? '').trim() ||
        JSON.stringify(selectedOverlayPresetSettings) !== JSON.stringify(resolvedOverlay) ||
        !areSentenceSoundEffectsEqual(selectedOverlayPreset.soundEffects, draftOverlaySoundEffects)),
  );
  const canOverrideLookPreset = Boolean(selectedLookPreset && isLookDirtyFromSelectedPreset);
  const canOverrideMotionPreset = Boolean(selectedMotionPreset && isMotionDirtyFromSelectedPreset);
  const canOverrideTextPreset = Boolean(selectedTextPreset && isTextDirtyFromSelectedPreset);
  const canOverrideOverlayPreset = Boolean(selectedOverlayPreset && isOverlayDirtyFromSelectedPreset);
  const trimmedLookSaveTitle = lookSaveTitle.trim();
  const trimmedMotionSaveTitle = motionSaveTitle.trim();
  const trimmedTextSaveTitle = textSaveTitle.trim();
  const trimmedOverlaySaveTitle = overlaySaveTitle.trim();
  const canSaveLookAsNew = (draftVisualEffect ?? null) !== null;
  const canSaveMotionAsNew = true;
  const canSaveTextAsNew = Boolean(draftTextAnimationEffect);
  const canSaveOverlayAsNew = Boolean(resolvedOverlayPreviewUrl);
  const isLookSaveTitleValid =
    trimmedLookSaveTitle.length > 0 &&
    (!selectedLookPreset || trimmedLookSaveTitle !== selectedLookPreset.title.trim());
  const isMotionSaveTitleValid =
    trimmedMotionSaveTitle.length > 0 &&
    (!selectedMotionPreset || trimmedMotionSaveTitle !== selectedMotionPreset.title.trim());
  const isTextSaveTitleValid =
    trimmedTextSaveTitle.length > 0 &&
    (!selectedTextPreset || trimmedTextSaveTitle !== selectedTextPreset.title.trim());
  const isOverlaySaveTitleValid =
    trimmedOverlaySaveTitle.length > 0 &&
    (!selectedOverlayPreset || trimmedOverlaySaveTitle !== selectedOverlayPreset.title.trim());
  const [debouncedPreview, setDebouncedPreview] = useState<DebouncedPreviewState>(() => ({
    visualEffect: visualEffect ?? null,
    imageMotionEffect: imageMotionEffect ?? 'default',
    imageMotionSpeed: incomingImageMotionSpeed,
    imageFilterSettings: normalizeImageFilterSettings(imageFilterSettings, visualEffect ?? null),
    imageMotionSettings: normalizeImageMotionSettings(
      imageMotionSettings,
      imageMotionEffect ?? 'default',
      incomingImageMotionSpeed,
      isShortVideo,
    ),
    resetKey: 0,
  }));

  useEffect(() => {
    setPortalTarget(document.body);

    return () => {
      setPortalTarget(null);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
      return;
    }

    if (!isClosing) {
      setIsRendered(false);
    }
  }, [isClosing, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentTab(availableTabs.includes(activeTab) ? activeTab : availableTabs[0]);
    setDraftVisualEffect(visualEffect ?? null);
    setDraftImageMotionEffect(imageMotionEffect ?? 'default');
    setDraftImageMotionSpeed(incomingImageMotionSpeed);
    setDraftCustomImageFilterId(customImageFilterId ?? null);
    setDraftCustomMotionEffectId(customMotionEffectId ?? null);
    setDraftTextAnimationEffect(
      resolveTextAnimationEffectFromSettings(textAnimationSettings, textAnimationEffect),
    );
    setDraftTextAnimationText(resolveTextAnimationText(textAnimationText, sentenceText));
    setDraftTextSoundEffects(cloneSentenceSoundEffects(textSoundEffects));
    setDraftTextBackgroundImage(textBackgroundImage ?? null);
    setDraftTextBackgroundImageUrl(textBackgroundImageUrl ?? null);
    setDraftTextBackgroundSavedImageId(textBackgroundSavedImageId ?? null);
    setDraftTextBackgroundVideo(textBackgroundVideo ?? null);
    setDraftTextBackgroundVideoUrl(textBackgroundVideoUrl ?? null);
    setDraftTextBackgroundSavedVideoId(textBackgroundSavedVideoId ?? null);
    setDraftCustomTextAnimationId(customTextAnimationId ?? null);
    setDraftCustomOverlayId(customOverlayId ?? null);
    setDraftOverlayFile(overlayFile ?? null);
    setDraftOverlayUrl(overlayUrl ?? null);
    setDraftOverlayMimeType(overlayMimeType ?? null);
    setDraftOverlaySoundEffects(cloneSentenceSoundEffects(overlaySoundEffects));
    setDraftImageFilterSettings(
      normalizeImageFilterSettings(imageFilterSettings, visualEffect ?? null),
    );
    setDraftImageMotionSettings(
      normalizeImageMotionSettings(
        imageMotionSettings,
        imageMotionEffect ?? 'default',
        incomingImageMotionSpeed,
        isShortVideo,
      ),
    );
    setDraftTextAnimationSettings(
      normalizeTextAnimationSettings(
        textAnimationSettings,
        resolveTextAnimationEffectFromSettings(textAnimationSettings, textAnimationEffect),
        isShortVideo,
      ),
    );
    setDraftOverlaySettings(normalizeOverlaySettings(overlaySettings, 'image'));
    setRetainedDraftTemporaryLook(retainedTemporaryLook ?? null);
    setRetainedDraftTemporaryMotion(retainedTemporaryMotion ?? null);
    setLookSaveTitle('');
    setMotionSaveTitle('');
    setTextSaveTitle('');
    setOverlaySaveTitle('');
    setLookActionError(null);
    setMotionActionError(null);
    setTextActionError(null);
    setOverlayActionError(null);
    setTextSoundEffectsError(null);
    setOverlaySoundEffectsError(null);
    setIsSoundEffectsLibraryOpen(false);
    setSoundEffectsLibraryTarget(null);
    setEditingSoundEffectTarget(null);
    setMixEditTarget(null);
    setMixEditDraft(null);
    setSoundEffectEditError(null);
    setSoundEffectMixError(null);
    stopAllScheduledAudio();
    setDeletePresetKind(null);
    setPreviewRestartNonce(0);
    setDebouncedPreview((prev) => ({
      visualEffect: visualEffect ?? null,
      imageMotionEffect: imageMotionEffect ?? 'default',
      imageMotionSpeed: incomingImageMotionSpeed,
      imageFilterSettings: normalizeImageFilterSettings(imageFilterSettings, visualEffect ?? null),
      imageMotionSettings: normalizeImageMotionSettings(
        imageMotionSettings,
        imageMotionEffect ?? 'default',
        incomingImageMotionSpeed,
        isShortVideo,
      ),
      resetKey: prev.resetKey + 1,
    }));
  }, [
    activeTab,
    customImageFilterId,
    customMotionEffectId,
    customTextAnimationId,
    customOverlayId,
    imageFilterSettings,
    imageMotionEffect,
    imageMotionSettings,
    incomingImageMotionSpeed,
    isShortVideo,
    isOpen,
    retainedTemporaryLook,
    retainedTemporaryMotion,
    textBackgroundImage,
    textBackgroundImageUrl,
    textBackgroundSavedImageId,
    textBackgroundVideo,
    textBackgroundVideoUrl,
    textBackgroundSavedVideoId,
    overlayFile,
    overlayMimeType,
    overlaySettings,
    overlayUrl,
    textAnimationEffect,
    textAnimationSettings,
    textAnimationText,
    textSoundEffects,
    sentenceText,
    visualEffect,
    availableTabs,
    overlaySoundEffects,
  ]);

  useEffect(() => {
    if (availableTabs.includes(currentTab)) return;
    setCurrentTab(availableTabs[0]);
  }, [availableTabs, currentTab]);

  useEffect(() => {
    if (!draftCustomImageFilterId && draftImageFilterSettings?.presetKey === 'custom') {
      setRetainedDraftTemporaryLook({
        visualEffect:
          resolveVisualEffectFromSettings(draftImageFilterSettings, draftVisualEffect ?? null) ??
          draftVisualEffect ??
          null,
        imageFilterSettings: resolvedLook,
      });
    }
  }, [draftCustomImageFilterId, draftImageFilterSettings, draftVisualEffect, resolvedLook]);

  useEffect(() => {
    if (!draftCustomMotionEffectId && draftImageMotionSettings?.presetKey === 'custom') {
      setRetainedDraftTemporaryMotion({
        imageMotionEffect: resolveMotionEffectFromSettings(
          draftImageMotionSettings,
          draftImageMotionEffect ?? 'default',
        ),
        imageMotionSettings: resolvedMotion,
        imageMotionSpeed: draftImageMotionSpeed,
      });
    }
  }, [
    draftCustomMotionEffectId,
    draftImageMotionEffect,
    draftImageMotionSettings,
    draftImageMotionSpeed,
    resolvedMotion,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(() => {
      setDebouncedPreview((prev) => ({
        visualEffect: draftVisualEffect,
        imageMotionEffect: draftImageMotionEffect,
        imageMotionSpeed: draftImageMotionSpeed,
        imageFilterSettings: resolvedLook,
        imageMotionSettings: resolvedMotion,
        resetKey: prev.resetKey + 1,
      }));
    }, PREVIEW_RESTART_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    draftImageMotionEffect,
    draftImageMotionSpeed,
    draftVisualEffect,
    isOpen,
    resolvedLook,
    resolvedMotion,
  ]);

  useEffect(() => {
    return () => {
      stopAllScheduledAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isRendered || !portalTarget) return null;

  const handleRequestClose = () => {
    if (isClosing) return;

    stopAllScheduledAudio();
    setIsClosing(true);
    window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const lookSelectValue = draftCustomImageFilterId
    ? `custom:${draftCustomImageFilterId}`
    : draftImageFilterSettings?.presetKey === 'custom'
      ? `custom:${TEMPORARY_CUSTOM_PRESET_ID}`
    : `builtin:${resolveVisualEffectFromSettings(draftImageFilterSettings, draftVisualEffect ?? null)}`;

  const motionSelectValue = draftCustomMotionEffectId
    ? `custom:${draftCustomMotionEffectId}`
    : draftImageMotionSettings?.presetKey === 'custom'
      ? `custom:${TEMPORARY_CUSTOM_PRESET_ID}`
    : `builtin:${resolveMotionEffectFromSettings(draftImageMotionSettings, draftImageMotionEffect ?? 'default')}`;
  const textSelectValue = draftCustomTextAnimationId
    ? `custom:${draftCustomTextAnimationId}`
    : draftTextAnimationSettings?.presetKey === 'custom'
      ? `custom:${TEMPORARY_CUSTOM_PRESET_ID}`
      : `builtin:${resolveTextAnimationEffectFromSettings(draftTextAnimationSettings, draftTextAnimationEffect)}`;
  const overlaySelectValue =
    draftCustomOverlayId && !isOverlayDirtyFromSelectedPreset
      ? `custom:${draftCustomOverlayId}`
      : resolvedOverlayPreviewUrl
        ? `custom:${TEMPORARY_CUSTOM_PRESET_ID}`
        : '__none__';
  const isBuiltinDefaultScaleMotion =
    !draftCustomMotionEffectId &&
    resolveMotionEffectFromSettings(
      draftImageMotionSettings,
      draftImageMotionEffect ?? 'default',
    ) === 'default';
  const unifiedEndValueMode = getUnifiedEndValueMode(resolvedMotion);

  const handleLookPresetChange = (value: string) => {
    if (value.startsWith('custom:')) {
      const presetId = value.slice('custom:'.length);
      if (presetId === TEMPORARY_CUSTOM_PRESET_ID) {
        if (!retainedDraftTemporaryLook) return;

        setDraftVisualEffect(retainedDraftTemporaryLook.visualEffect);
        setDraftCustomImageFilterId(null);
        setDraftImageFilterSettings({
          ...retainedDraftTemporaryLook.imageFilterSettings,
          presetKey: 'custom',
        });
        return;
      }
      const preset = imageFilterPresets.find((item) => item.id === presetId);
      if (!preset) return;
      const settings = normalizeImageFilterSettings(preset.settings, visualEffect ?? null);
      setDraftVisualEffect(resolveVisualEffectFromSettings(settings, draftVisualEffect ?? null));
      setDraftCustomImageFilterId(preset.id);
      setDraftImageFilterSettings({ ...settings, presetKey: 'custom' });
      return;
    }

    const effect = value.replace('builtin:', '') as SentenceItem['visualEffect'];
    const normalizedEffect = effect === 'none' ? null : effect;
    setDraftVisualEffect(normalizedEffect);
    setDraftCustomImageFilterId(null);
    setDraftImageFilterSettings(getDefaultImageFilterSettings(normalizedEffect));
  };

  const handleMotionPresetChange = (value: string) => {
    if (value.startsWith('custom:')) {
      const presetId = value.slice('custom:'.length);
      if (presetId === TEMPORARY_CUSTOM_PRESET_ID) {
        if (!retainedDraftTemporaryMotion) return;

        setDraftImageMotionEffect(retainedDraftTemporaryMotion.imageMotionEffect);
        setDraftCustomMotionEffectId(null);
        setDraftImageMotionSettings({
          ...retainedDraftTemporaryMotion.imageMotionSettings,
          presetKey: 'custom',
        });
        setDraftImageMotionSpeed(retainedDraftTemporaryMotion.imageMotionSpeed);
        return;
      }
      const preset = motionEffectPresets.find((item) => item.id === presetId);
      if (!preset) return;
      const settings = normalizeImageMotionSettings(
        preset.settings,
        draftImageMotionEffect ?? 'default',
        draftImageMotionSpeed,
        isShortVideo,
      );
      setDraftImageMotionEffect(
        resolveMotionEffectFromSettings(settings, draftImageMotionEffect ?? 'default'),
      );
      setDraftCustomMotionEffectId(preset.id);
      setDraftImageMotionSettings({ ...settings, presetKey: 'custom' });
      setDraftImageMotionSpeed(settings.speed ?? getDefaultImageMotionSpeed(isShortVideo));
      return;
    }

    const effect = value.replace('builtin:', '') as NonNullable<SentenceItem['imageMotionEffect']>;
    const settings = getDefaultImageMotionSettings(effect, draftImageMotionSpeed, isShortVideo);
    setDraftImageMotionEffect(effect);
    setDraftCustomMotionEffectId(null);
    setDraftImageMotionSettings(settings);
    setDraftImageMotionSpeed(settings.speed ?? getDefaultImageMotionSpeed(isShortVideo));
  };

  const handleTextPresetChange = (value: string) => {
    if (value.startsWith('custom:')) {
      const presetId = value.slice('custom:'.length);
      if (presetId === TEMPORARY_CUSTOM_PRESET_ID) return;

      const preset = textAnimationPresets.find((item) => item.id === presetId);
      if (!preset) return;

      const effect = resolveTextAnimationEffectFromSettings(
        preset.settings,
        draftTextAnimationEffect,
      );
      const settings = normalizeTextAnimationSettings(
        preset.settings,
        effect,
        isShortVideo,
      );

      setDraftTextAnimationEffect(effect);
      setDraftCustomTextAnimationId(preset.id);
      setDraftTextAnimationSettings({ ...settings, presetKey: 'custom' });
      setDraftTextSoundEffects(cloneSentenceSoundEffects(preset.soundEffects));
      setTextActionError(null);
      return;
    }

    const effect = value.replace('builtin:', '') as SentenceItem['textAnimationEffect'];
    setDraftTextAnimationEffect(effect);
    setDraftCustomTextAnimationId(null);
    setDraftTextAnimationSettings(getDefaultTextAnimationSettings(effect, isShortVideo));
    setTextActionError(null);
  };

  const handleOverlayPresetChange = (value: string) => {
    if (value === '__none__') {
      setDraftCustomOverlayId(null);
      setDraftOverlayFile(null);
      setDraftOverlayUrl(null);
      setDraftOverlayMimeType(null);
      setDraftOverlaySoundEffects([]);
      setDraftOverlaySettings({ ...resolvedOverlay, presetKey: 'custom' });
      setOverlayActionError(null);
      return;
    }

    if (!value.startsWith('custom:')) return;

    const presetId = value.slice('custom:'.length);
    if (presetId === TEMPORARY_CUSTOM_PRESET_ID) return;

    const preset = overlayPresets.find((item) => item.id === presetId);
    if (!preset) return;

    const settings = normalizeOverlaySettings(
      preset.settings,
      resolvedOverlay.backgroundMode ?? 'image',
    );
    setDraftCustomOverlayId(preset.id);
    setDraftOverlayFile(null);
    setDraftOverlayUrl(preset.url);
    setDraftOverlayMimeType(preset.mimeType ?? null);
    setDraftOverlaySoundEffects(cloneSentenceSoundEffects(preset.soundEffects));
    setDraftOverlaySettings({ ...settings, presetKey: 'custom' });
    setOverlayActionError(null);
  };

  const updateLookSettings = (patch: Partial<ImageFilterSettings>) => {
    const nextSettings: ImageFilterSettings = {
      ...resolvedLook,
      ...patch,
      presetKey: 'custom',
    };
    setDraftVisualEffect(resolveVisualEffectFromSettings(nextSettings, draftVisualEffect ?? null));
    setDraftImageFilterSettings(nextSettings);
    setLookActionError(null);
  };

  const updateMotionSettings = (patch: Partial<ImageMotionSettings>) => {
    const nextSettings: ImageMotionSettings = {
      ...resolvedMotion,
      ...patch,
      presetKey: 'custom',
    };
    setDraftImageMotionEffect(
      resolveMotionEffectFromSettings(nextSettings, draftImageMotionEffect ?? 'default'),
    );
    setDraftImageMotionSettings(nextSettings);
    setDraftImageMotionSpeed(nextSettings.speed ?? getDefaultImageMotionSpeed(isShortVideo));
    setMotionActionError(null);
  };

  const updateTextSettings = (patch: Partial<TextAnimationSettings>) => {
    const nextSettings: TextAnimationSettings = {
      ...resolvedText,
      ...patch,
      presetKey: 'custom',
    };
    setDraftTextAnimationEffect(
      resolveTextAnimationEffectFromSettings(nextSettings, draftTextAnimationEffect),
    );
    setDraftTextAnimationSettings(nextSettings);
    setTextActionError(null);
  };

  const updateOverlaySettings = (patch: Partial<OverlaySettings>) => {
    const nextSettings: OverlaySettings = {
      ...resolvedOverlay,
      ...patch,
      presetKey: 'custom',
    };
    setDraftOverlaySettings(nextSettings);
    setDraftCustomOverlayId(null);
    setOverlayActionError(null);
  };

  const handleOverlayUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) return;

    setDraftOverlayFile(file);
    setDraftOverlayUrl(null);
    setDraftOverlayMimeType(file.type || null);
    setDraftCustomOverlayId(null);
    setDraftOverlaySettings({ ...resolvedOverlay, presetKey: 'custom' });
    setOverlayActionError(null);
    event.target.value = '';
  };

  const handleRemoveOverlayAsset = () => {
    setDraftOverlayFile(null);
    setDraftOverlayUrl(null);
    setDraftOverlayMimeType(null);
    setDraftCustomOverlayId(null);
    setDraftOverlaySoundEffects([]);
    setDraftOverlaySettings({ ...resolvedOverlay, presetKey: 'custom' });
    setOverlayActionError(null);
  };

  const handleTextBackgroundUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file || !file.type.startsWith('image/')) return;

    setDraftTextBackgroundImage(file);
    setDraftTextBackgroundImageUrl(null);
    setDraftTextBackgroundSavedImageId(null);
    setDraftCustomTextAnimationId(null);
    setDraftTextAnimationSettings({
      ...resolvedText,
      backgroundMode: 'image',
      presetKey: 'custom',
    });
    setTextActionError(null);
    event.target.value = '';
  };

  const handleTextBackgroundVideoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file || !file.type.startsWith('video/')) return;

    setDraftTextBackgroundVideo(file);
    setDraftTextBackgroundVideoUrl(null);
    setDraftTextBackgroundSavedVideoId(null);
    setDraftCustomTextAnimationId(null);
    setDraftTextAnimationSettings({
      ...resolvedText,
      backgroundMode: 'video',
      presetKey: 'custom',
    });
    setTextActionError(null);
    event.target.value = '';
  };

  const handleRemoveTextBackground = () => {
    setDraftTextBackgroundImage(null);
    setDraftTextBackgroundImageUrl(null);
    setDraftTextBackgroundSavedImageId(null);
    setDraftCustomTextAnimationId(null);
    setDraftTextAnimationSettings({
      ...resolvedText,
      backgroundMode: 'image',
      presetKey: 'custom',
    });
    setTextActionError(null);
  };

  const handleRemoveTextBackgroundVideo = () => {
    setDraftTextBackgroundVideo(null);
    setDraftTextBackgroundVideoUrl(null);
    setDraftTextBackgroundSavedVideoId(null);
    setDraftCustomTextAnimationId(null);
    setDraftTextAnimationSettings({
      ...resolvedText,
      backgroundMode: 'video',
      presetKey: 'custom',
    });
    setTextActionError(null);
  };

  const updateAllEndValueModes = (value: 'loop' | 'continue') => {
    const isContinue = value === 'continue';
    updateMotionSettings({
      scaleEndNoLimit: isContinue,
      translateXEndNoLimit: isContinue,
      translateYEndNoLimit: isContinue,
      rotateEndNoLimit: isContinue,
    });
  };

  const handleSaveLookPreset = async () => {
    if (!isLookSaveTitleValid || isSavingLookPreset) return;
    setIsSavingLookPreset(true);
    setLookActionError(null);
    try {
      const saved = await onSaveImageFilterPreset(trimmedLookSaveTitle, resolvedLook);
      if (saved) {
        setDraftCustomImageFilterId(saved.id);
        setDraftImageFilterSettings({ ...resolvedLook, presetKey: 'custom' });
        setLookSaveTitle('');
      }
    } catch (error) {
      setLookActionError(error instanceof Error ? error.message : 'Failed to save look preset.');
    }
    setIsSavingLookPreset(false);
  };

  const handleSaveMotionPreset = async () => {
    if (!isMotionSaveTitleValid || isSavingMotionPreset) return;
    setIsSavingMotionPreset(true);
    setMotionActionError(null);
    try {
      const saved = await onSaveMotionEffectPreset(trimmedMotionSaveTitle, resolvedMotion);
      if (saved) {
        setDraftCustomMotionEffectId(saved.id);
        setDraftImageMotionSettings({ ...resolvedMotion, presetKey: 'custom' });
        setMotionSaveTitle('');
      }
    } catch (error) {
      setMotionActionError(error instanceof Error ? error.message : 'Failed to save motion preset.');
    }
    setIsSavingMotionPreset(false);
  };

  const handleSaveTextPreset = async () => {
    if (!isTextSaveTitleValid || isSavingTextPreset) return;
    setIsSavingTextPreset(true);
    setTextActionError(null);
    try {
      const saved = await onSaveTextAnimationPreset(
        trimmedTextSaveTitle,
        resolvedText,
        draftTextSoundEffects,
      );
      if (saved) {
        setDraftCustomTextAnimationId(saved.id);
        setDraftTextAnimationSettings({ ...resolvedText, presetKey: 'custom' });
        setDraftTextSoundEffects(cloneSentenceSoundEffects(saved.soundEffects ?? draftTextSoundEffects));
        setTextSaveTitle('');
      }
    } catch (error) {
      setTextActionError(error instanceof Error ? error.message : 'Failed to save text preset.');
    }
    setIsSavingTextPreset(false);
  };

  const handleSaveOverlayPreset = async () => {
    if (!isOverlaySaveTitleValid || !canSaveOverlayAsNew || isSavingOverlayPreset) return;
    setIsSavingOverlayPreset(true);
    setOverlayActionError(null);
    try {
      const saved = await onSaveOverlayPreset({
        title: trimmedOverlaySaveTitle,
        settings: resolvedOverlay,
        file: draftOverlayFile ?? null,
        sourceUrl: draftOverlayFile ? null : draftOverlayUrl,
        soundEffects: draftOverlaySoundEffects,
      });
      if (saved) {
        setDraftCustomOverlayId(saved.id);
        setDraftOverlayFile(null);
        setDraftOverlayUrl(saved.url);
        setDraftOverlayMimeType(saved.mimeType ?? draftOverlayMimeType ?? null);
        setDraftOverlaySoundEffects(
          cloneSentenceSoundEffects(saved.soundEffects ?? draftOverlaySoundEffects),
        );
        setDraftOverlaySettings({
          ...normalizeOverlaySettings(saved.settings, resolvedOverlay.backgroundMode ?? 'image'),
          presetKey: 'custom',
        });
        setOverlaySaveTitle('');
      }
    } catch (error) {
      setOverlayActionError(
        error instanceof Error ? error.message : 'Failed to save overlay preset.',
      );
    }
    setIsSavingOverlayPreset(false);
  };

  const handleOverrideLookPreset = async () => {
    if (!selectedLookPreset || !canOverrideLookPreset || isOverridingLookPreset) return;
    setIsOverridingLookPreset(true);
    setLookActionError(null);
    try {
      const saved = await onUpdateImageFilterPreset(selectedLookPreset.id, resolvedLook);
      if (saved) {
        setDraftCustomImageFilterId(saved.id);
        setDraftImageFilterSettings({ ...resolvedLook, presetKey: 'custom' });
      }
    } catch (error) {
      setLookActionError(error instanceof Error ? error.message : 'Failed to override look preset.');
    }
    setIsOverridingLookPreset(false);
  };

  const handleOverrideMotionPreset = async () => {
    if (!selectedMotionPreset || !canOverrideMotionPreset || isOverridingMotionPreset) return;
    setIsOverridingMotionPreset(true);
    setMotionActionError(null);
    try {
      const saved = await onUpdateMotionEffectPreset(selectedMotionPreset.id, resolvedMotion);
      if (saved) {
        setDraftCustomMotionEffectId(saved.id);
        setDraftImageMotionSettings({ ...resolvedMotion, presetKey: 'custom' });
      }
    } catch (error) {
      setMotionActionError(
        error instanceof Error ? error.message : 'Failed to override motion preset.',
      );
    }
    setIsOverridingMotionPreset(false);
  };

  const handleOverrideTextPreset = async () => {
    if (!selectedTextPreset || !canOverrideTextPreset || isOverridingTextPreset) return;
    setIsOverridingTextPreset(true);
    setTextActionError(null);
    try {
      const saved = await onUpdateTextAnimationPreset(
        selectedTextPreset.id,
        resolvedText,
        draftTextSoundEffects,
      );
      if (saved) {
        setDraftCustomTextAnimationId(saved.id);
        setDraftTextAnimationSettings({ ...resolvedText, presetKey: 'custom' });
        setDraftTextSoundEffects(cloneSentenceSoundEffects(saved.soundEffects ?? draftTextSoundEffects));
      }
    } catch (error) {
      setTextActionError(error instanceof Error ? error.message : 'Failed to override text preset.');
    }
    setIsOverridingTextPreset(false);
  };

  const handleOverrideOverlayPreset = async () => {
    if (!selectedOverlayPreset || !canOverrideOverlayPreset || isOverridingOverlayPreset) return;
    setIsOverridingOverlayPreset(true);
    setOverlayActionError(null);
    try {
      const saved = await onSaveOverlayPreset({
        title: selectedOverlayPreset.title,
        settings: resolvedOverlay,
        file: draftOverlayFile ?? null,
        sourceUrl: draftOverlayFile ? null : draftOverlayUrl,
        overlayId: selectedOverlayPreset.id,
        soundEffects: draftOverlaySoundEffects,
      });
      if (saved) {
        setDraftCustomOverlayId(saved.id);
        setDraftOverlayFile(null);
        setDraftOverlayUrl(saved.url);
        setDraftOverlayMimeType(saved.mimeType ?? draftOverlayMimeType ?? null);
        setDraftOverlaySoundEffects(
          cloneSentenceSoundEffects(saved.soundEffects ?? draftOverlaySoundEffects),
        );
        setDraftOverlaySettings({
          ...normalizeOverlaySettings(saved.settings, resolvedOverlay.backgroundMode ?? 'image'),
          presetKey: 'custom',
        });
      }
    } catch (error) {
      setOverlayActionError(
        error instanceof Error ? error.message : 'Failed to override overlay preset.',
      );
    }
    setIsOverridingOverlayPreset(false);
  };

  const handleDeleteLookPreset = async () => {
    if (!selectedLookPreset || isDeletingLookPreset) return;
    setIsDeletingLookPreset(true);
    setLookActionError(null);
    try {
      const deleted = await onDeleteImageFilterPreset(selectedLookPreset.id);
      if (deleted) {
        setDraftVisualEffect(null);
        setDraftCustomImageFilterId(null);
        setDraftImageFilterSettings(getDefaultImageFilterSettings(null));
        setRetainedDraftTemporaryLook(null);
        setLookSaveTitle('');
        setDeletePresetKind(null);
      }
    } catch (error) {
      setLookActionError(error instanceof Error ? error.message : 'Failed to delete look preset.');
    }
    setIsDeletingLookPreset(false);
  };

  const handleDeleteMotionPreset = async () => {
    if (!selectedMotionPreset || isDeletingMotionPreset) return;
    setIsDeletingMotionPreset(true);
    setMotionActionError(null);
    try {
      const deleted = await onDeleteMotionEffectPreset(selectedMotionPreset.id);
      if (deleted) {
        const defaultSpeed = getDefaultImageMotionSpeed(isShortVideo);
        setDraftImageMotionEffect('default');
        setDraftCustomMotionEffectId(null);
        setDraftImageMotionSpeed(defaultSpeed);
        setDraftImageMotionSettings(
          getDefaultImageMotionSettings('default', defaultSpeed, isShortVideo),
        );
        setRetainedDraftTemporaryMotion(null);
        setMotionSaveTitle('');
        setDeletePresetKind(null);
      }
    } catch (error) {
      setMotionActionError(
        error instanceof Error ? error.message : 'Failed to delete motion preset.',
      );
    }
    setIsDeletingMotionPreset(false);
  };

  const handleDeleteTextPreset = async () => {
    if (!selectedTextPreset || isDeletingTextPreset) return;
    setIsDeletingTextPreset(true);
    setTextActionError(null);
    try {
      const deleted = await onDeleteTextAnimationPreset(selectedTextPreset.id);
      if (deleted) {
        const fallbackEffect = draftTextAnimationEffect ?? 'slideCutFast';
        setDraftTextAnimationEffect(fallbackEffect);
        setDraftCustomTextAnimationId(null);
        setDraftTextAnimationSettings(
          getDefaultTextAnimationSettings(fallbackEffect, isShortVideo),
        );
        setTextSaveTitle('');
        setDeletePresetKind(null);
      }
    } catch (error) {
      setTextActionError(error instanceof Error ? error.message : 'Failed to delete text preset.');
    }
    setIsDeletingTextPreset(false);
  };

  const handleDeleteOverlayPreset = async () => {
    if (!selectedOverlayPreset || isDeletingOverlayPreset) return;
    setIsDeletingOverlayPreset(true);
    setOverlayActionError(null);
    try {
      const deleted = await onDeleteOverlayPreset(selectedOverlayPreset.id);
      if (deleted) {
        setDraftCustomOverlayId(null);
        setDraftOverlayFile(null);
        setDraftOverlayUrl(null);
        setDraftOverlayMimeType(null);
        setDraftOverlaySoundEffects([]);
        setDraftOverlaySettings({ ...resolvedOverlay, presetKey: 'custom' });
        setOverlaySaveTitle('');
        setDeletePresetKind(null);
      }
    } catch (error) {
      setOverlayActionError(
        error instanceof Error ? error.message : 'Failed to delete overlay preset.',
      );
    }
    setIsDeletingOverlayPreset(false);
  };

  const handleGenerateLookWithAi = async () => {
    if (isGeneratingLookWithAi) return;
    setIsGeneratingLookWithAi(true);
    setLookActionError(null);
    try {
      const generated = await onGenerateLookWithAi({
        visualEffect: draftVisualEffect,
        customImageFilterId: draftCustomImageFilterId,
        imageFilterSettings: resolvedLook,
      });

      if (generated) {
        setDraftVisualEffect(generated.visualEffect);
        setDraftCustomImageFilterId(null);
        setDraftImageFilterSettings({ ...generated.imageFilterSettings, presetKey: 'custom' });
      }
    } catch (error) {
      setLookActionError(error instanceof Error ? error.message : 'Failed to generate AI look.');
    }
    setIsGeneratingLookWithAi(false);
  };

  const handleGenerateMotionWithAi = async () => {
    if (isGeneratingMotionWithAi) return;
    setIsGeneratingMotionWithAi(true);
    setMotionActionError(null);
    try {
      const generated = await onGenerateMotionWithAi({
        imageMotionEffect: draftImageMotionEffect,
        customMotionEffectId: draftCustomMotionEffectId,
        imageMotionSettings: resolvedMotion,
        imageMotionSpeed: draftImageMotionSpeed,
      });

      if (generated) {
        setDraftImageMotionEffect(generated.imageMotionEffect);
        setDraftCustomMotionEffectId(null);
        setDraftImageMotionSettings({ ...generated.imageMotionSettings, presetKey: 'custom' });
        setDraftImageMotionSpeed(generated.imageMotionSpeed);
      }
    } catch (error) {
      setMotionActionError(
        error instanceof Error ? error.message : 'Failed to generate AI motion.',
      );
    }
    setIsGeneratingMotionWithAi(false);
  };

  const buildApplyPayload = (): ImageEffectsDetailApplyParams => {
    const nextCustomImageFilterId =
      draftCustomImageFilterId && !isLookDirtyFromSelectedPreset ? draftCustomImageFilterId : null;
    const nextCustomMotionEffectId =
      draftCustomMotionEffectId && !isMotionDirtyFromSelectedPreset
        ? draftCustomMotionEffectId
        : null;
    const nextCustomTextAnimationId =
      draftCustomTextAnimationId && !isTextDirtyFromSelectedPreset
        ? draftCustomTextAnimationId
        : null;
    const nextCustomOverlayId =
      draftCustomOverlayId && !isOverlayDirtyFromSelectedPreset ? draftCustomOverlayId : null;

    return {
      visualEffect: draftVisualEffect,
      customImageFilterId: nextCustomImageFilterId,
      imageFilterSettings:
        nextCustomImageFilterId ? resolvedLook : { ...resolvedLook, presetKey: 'custom' },
      imageMotionEffect: draftImageMotionEffect,
      customMotionEffectId: nextCustomMotionEffectId,
      imageMotionSettings:
        nextCustomMotionEffectId
          ? resolvedMotion
          : { ...resolvedMotion, presetKey: 'custom' },
      imageMotionSpeed:
        resolvedMotion.speed ?? draftImageMotionSpeed ?? getDefaultImageMotionSpeed(isShortVideo),
      textAnimationEffect: draftTextAnimationEffect,
      customTextAnimationId: nextCustomTextAnimationId,
      textAnimationSettings:
        nextCustomTextAnimationId
          ? resolvedText
          : { ...resolvedText, presetKey: 'custom' },
      textAnimationText: String(draftTextAnimationText ?? '').trim() || null,
      textSoundEffects: cloneSentenceSoundEffects(draftTextSoundEffects),
      textBackgroundImage: draftTextBackgroundImage,
      textBackgroundImageUrl: draftTextBackgroundImageUrl,
      textBackgroundSavedImageId: draftTextBackgroundSavedImageId,
      textBackgroundVideo: draftTextBackgroundVideo,
      textBackgroundVideoUrl: draftTextBackgroundVideoUrl,
      textBackgroundSavedVideoId: draftTextBackgroundSavedVideoId,
      customOverlayId: nextCustomOverlayId,
      overlayFile: draftOverlayFile,
      overlayUrl: draftOverlayUrl,
      overlayMimeType: draftOverlayMimeType,
      overlaySettings:
        nextCustomOverlayId ? resolvedOverlay : { ...resolvedOverlay, presetKey: 'custom' },
      overlaySoundEffects: cloneSentenceSoundEffects(draftOverlaySoundEffects),
    };
  };

  const handleApply = () => {
    onApply(buildApplyPayload());
    handleRequestClose();
  };

  const handleDownload = async () => {
    if (!onDownload) return;

    setIsDownloading(true);
    try {
      await onDownload(buildApplyPayload());
    } finally {
      setIsDownloading(false);
    }
  };

  const renderSoundEffectsSection = (kind: 'text' | 'overlay') => {
    const items = getDraftSoundEffects(kind);
    const canManage = kind === 'text' ? canManageTextSoundEffects : canManageOverlaySoundEffects;
    const errorMessage = kind === 'text' ? textSoundEffectsError : overlaySoundEffectsError;
    const stackStatus = stackStatusByKind[kind];
    const inputRef = kind === 'text' ? textSoundEffectsInputRef : overlaySoundEffectsInputRef;
    const gateMessage = kind === 'text'
      ? 'Choose a text animation preset or effect first, then add sound effects for this text scene.'
      : 'Upload or choose an overlay asset first, then add sound effects for this overlay scene.';

    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length === 0) return;
            await handleUploadSoundEffects(kind, files);
            event.currentTarget.value = '';
          }}
        />

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Music2 className="h-4 w-4 text-sky-600" />
              {kind === 'text' ? 'Text sound effects' : 'Overlay sound effects'}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {kind === 'text'
                ? 'These sound effects play when this text animation starts.'
                : 'These sound effects play when this overlay scene starts.'}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
            {items.length} selected
          </span>
        </div>

        {!canManage ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {gateMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (stackStatus === 'loading' || stackStatus === 'playing') {
                stopAllScheduledAudio();
                return;
              }
              handleStartFromBeginning(kind);
            }}
            disabled={!canManage}
            className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          >
            {stackStatus === 'loading' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : stackStatus === 'playing' ? (
              <Pause className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Start from beginning
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => void handleOpenMixEditor(kind)}
            disabled={!canManage || items.length === 0 || isLoadingMixEditor}
            className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          >
            {isLoadingMixEditor && mixEditTarget === kind ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <SlidersHorizontal className="mr-2 h-4 w-4" />
            )}
            Edit whole group
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={!canManage || isUploadingSoundEffect}
            className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          >
            {isUploadingSoundEffect ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSoundEffectsLibraryTarget(kind);
              setIsSoundEffectsLibraryOpen(true);
            }}
            disabled={!canManage}
            className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          >
            <Library className="mr-2 h-4 w-4" />
            From library
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              stopAllScheduledAudio();
              commitDraftSoundEffects(kind, []);
            }}
            disabled={items.length === 0}
            className="h-10 rounded-xl border-red-200 bg-white text-red-600 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove all
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No sound effects added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((effect, index) => {
              const playbackDurationSeconds = getSoundEffectPlaybackDurationSeconds({
                durationSeconds: effect.durationSeconds,
                audioSettings: effect.audioSettings,
              });
              const key = getSoundEffectPreviewKey(kind, index, effect.url);
              const singleStatus = singleStatusByKey[key] ?? 'idle';

              return (
                <div key={`${key}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{effect.title}</p>
                      <p className="truncate text-xs text-slate-500">{effect.url}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium text-slate-600">
                        <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                          Vol {Math.round(effect.volumePercent ?? 100)}%
                        </span>
                        {typeof playbackDurationSeconds === 'number' ? (
                          <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                            {playbackDurationSeconds.toFixed(2)}s
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          if (singleStatus === 'loading' || singleStatus === 'playing') {
                            stopAllScheduledAudio();
                            return;
                          }
                          playSingleSoundEffect(kind, index);
                        }}
                        className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
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
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setSoundEffectEditError(null);
                          setEditingSoundEffectTarget({ kind, index });
                        }}
                        className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === 0}
                        onClick={() => {
                          const next = [...items];
                          const [moved] = next.splice(index, 1);
                          next.splice(index - 1, 0, moved);
                          commitDraftSoundEffects(kind, next);
                        }}
                        className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === items.length - 1}
                        onClick={() => {
                          const next = [...items];
                          const [moved] = next.splice(index, 1);
                          next.splice(index + 1, 0, moved);
                          commitDraftSoundEffects(kind, next);
                        }}
                        className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          commitDraftSoundEffects(
                            kind,
                            items.filter((_, itemIndex) => itemIndex !== index),
                          );
                        }}
                        className="h-9 w-9 rounded-xl border-red-200 bg-white text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Delay
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={Number(effect.delaySeconds ?? 0) || 0}
                        onChange={(event) => {
                          const value = Math.max(0, Number(event.target.value) || 0);
                          commitDraftSoundEffects(
                            kind,
                            items.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, delaySeconds: value } : item,
                            ),
                          );
                        }}
                        className="h-10 rounded-xl border-slate-200 bg-white"
                      />
                    </label>

                    {index < items.length - 1 ? (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Next sound timing
                        </span>
                        <Select
                          value={items[index + 1]?.timingMode === 'afterPreviousEnds' ? 'afterPreviousEnds' : 'withPrevious'}
                          onValueChange={(value) => {
                            commitDraftSoundEffects(
                              kind,
                              items.map((item, itemIndex) =>
                                itemIndex === index + 1
                                  ? {
                                      ...item,
                                      timingMode:
                                        value === 'afterPreviousEnds'
                                          ? 'afterPreviousEnds'
                                          : 'withPrevious',
                                    }
                                  : item,
                              ),
                            );
                          }}
                        >
                          <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                            <SelectValue placeholder="Choose timing" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="withPrevious">Start with previous timing</SelectItem>
                            <SelectItem value="afterPreviousEnds">Start after previous ends</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">
                        Last sound effect in this stack.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const editingSoundEffect = editingSoundEffectTarget
    ? getDraftSoundEffects(editingSoundEffectTarget.kind)[editingSoundEffectTarget.index] ?? null
    : null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md ${isClosing
        ? 'animate-out fade-out-0 duration-200'
        : 'animate-in fade-in duration-200'
        }`}
      onClick={handleRequestClose}
    >
      <div
        className={`flex h-[92vh] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl ${isClosing
          ? 'animate-out zoom-out-95 fade-out-0 duration-200'
          : 'animate-in zoom-in-95 duration-300'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 flex-1 flex-col bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Detailed settings</p>
              <h3 className="mt-2 text-2xl font-semibold">
                {currentTab === 'text'
                  ? 'Text animation studio'
                  : currentTab === 'overlay'
                    ? 'Overlay scene studio'
                    : 'Image effects studio'}
              </h3>
              <p className="mt-1 text-sm text-slate-300">
                {currentTab === 'text'
                  ? 'Tune flashy hook text, background modes, and reusable animation presets.'
                  : currentTab === 'overlay'
                    ? 'Compose an overlay asset over the scene background and decide whether text sits above or below it.'
                    : 'Look edits preview as a still. Motion edits preview with your current look applied.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              className="rounded-full border border-white/15 bg-white/10 p-3 text-white transition hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {showTabSwitcher ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
              {availableTabs.includes('visual') ? (
                <Button
                  type="button"
                  onClick={() => setCurrentTab('visual')}
                  className={
                    currentTab === 'visual'
                      ? 'h-11 flex-1 rounded-xl bg-white text-slate-900 hover:bg-white'
                      : 'h-11 flex-1 rounded-xl bg-transparent text-slate-200 hover:bg-white/10'
                  }
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Look
                </Button>
              ) : null}
              {availableTabs.includes('motion') ? (
                <Button
                  type="button"
                  onClick={() => setCurrentTab('motion')}
                  className={
                    currentTab === 'motion'
                      ? 'h-11 flex-1 rounded-xl bg-white text-slate-900 hover:bg-white'
                      : 'h-11 flex-1 rounded-xl bg-transparent text-slate-200 hover:bg-white/10'
                  }
                >
                  <Clapperboard className="mr-2 h-4 w-4" />
                  Motion
                </Button>
              ) : null}
              {availableTabs.includes('text') ? (
                <Button
                  type="button"
                  onClick={() => setCurrentTab('text')}
                  className={
                    currentTab === 'text'
                      ? 'h-11 flex-1 rounded-xl bg-white text-slate-900 hover:bg-white'
                      : 'h-11 flex-1 rounded-xl bg-transparent text-slate-200 hover:bg-white/10'
                  }
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Text
                </Button>
              ) : null}
              {availableTabs.includes('overlay') ? (
                <Button
                  type="button"
                  onClick={() => setCurrentTab('overlay')}
                  className={
                    currentTab === 'overlay'
                      ? 'h-11 flex-1 rounded-xl bg-white text-slate-900 hover:bg-white'
                      : 'h-11 flex-1 rounded-xl bg-transparent text-slate-200 hover:bg-white/10'
                  }
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Overlay
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/30 p-4">
            {currentTab === 'text' ? (
              <TextAnimationPreview
                sentenceText={sentenceText}
                text={draftTextAnimationText}
                effect={draftTextAnimationEffect}
                settings={resolvedText}
                visualEffect={draftVisualEffect}
                imageFilterSettings={resolvedLook}
                backgroundImageUrl={resolvedTextPreviewBackgroundUrl}
                backgroundVideoUrl={resolvedTextPreviewBackgroundVideoUrl}
                isShortVideo={isShortVideo}
                className={`${textPreviewFrameClass} overflow-hidden rounded-[1.5rem]`}
                contentClassName="p-[7%]"
                enableMotion
                motionResetKey={`${currentTab}-${draftTextAnimationEffect}-${resolvedText.speed ?? 1}-${resolvedText.animationIntensity ?? 1}-${previewRestartNonce}`}
              />
            ) : currentTab === 'overlay' ? (
              <OverlayScenePreview
                key={`overlay-preview-${previewRestartNonce}`}
                isShortVideo={isShortVideo}
                sceneImageUrl={resolvedOverlaySceneImageUrl}
                sceneVideoUrl={resolvedOverlaySceneVideoUrl}
                visualEffect={draftVisualEffect}
                imageFilterSettings={resolvedLook}
                overlayAssetUrl={resolvedOverlayPreviewUrl}
                overlayMimeType={draftOverlayMimeType}
                overlaySettings={resolvedOverlay}
                sentenceText={sentenceText}
                text={draftTextAnimationText}
                textAnimationEffect={draftTextAnimationEffect}
                textAnimationSettings={resolvedText}
                className={`${textPreviewFrameClass} overflow-hidden rounded-[1.5rem]`}
              />
            ) : previewImageUrl ? (
              <ImageEffectPreview
                visualEffect={debouncedPreview.visualEffect}
                imageMotionEffect={debouncedPreview.imageMotionEffect}
                imageMotionSpeed={debouncedPreview.imageMotionSpeed}
                isShortVideo={isShortVideo}
                imageFilterSettings={debouncedPreview.imageFilterSettings}
                imageMotionSettings={debouncedPreview.imageMotionSettings}
                enableMotion={currentTab === 'motion'}
                className="flex max-h-full max-w-full items-center justify-center"
                motionResetKey={debouncedPreview.resetKey}
              >
                <img
                  src={previewImageUrl}
                  alt="Detailed effect preview"
                  className="max-h-[66vh] w-auto max-w-full rounded-[1.5rem] object-contain"
                />
              </ImageEffectPreview>
            ) : (
              <div className="flex h-full min-h-80 w-full items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 text-sm text-slate-300">
                Generate or upload an image to preview detailed effect settings.
              </div>
            )}
          </div>
        </div>

        <div className="flex w-107.5 shrink-0 flex-col border-l border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 px-6 py-5">
            <h4 className="text-lg font-semibold text-slate-900">
              {currentTab === 'visual'
                ? 'Look controls'
                : currentTab === 'motion'
                  ? 'Motion controls'
                  : currentTab === 'overlay'
                    ? 'Overlay controls'
                    : 'Text controls'}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {currentTab === 'visual'
                ? 'Blend preset selection with direct filter tuning.'
                : currentTab === 'motion'
                  ? 'Tune transform values and save reusable motion presets.'
                  : currentTab === 'overlay'
                    ? 'Pick an overlay preset, upload the asset, and tune placement against the active scene background.'
                    : 'Edit hook text, layout, colors, and reusable animation presets.'}
            </p>
          </div>

          <div className="border-b border-slate-200 bg-white px-6 py-4">
            {isLookOnlyUploadVariant ? (
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRequestClose}
                  className="h-11 flex-1 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDownload()}
                  disabled={!previewImageUrl || !onDownload || isDownloading}
                  className="h-11 flex-1 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                >
                  {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Download
                </Button>
                <Button
                  type="button"
                  onClick={handleApply}
                  className="h-11 flex-1 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-lg transition-all duration-200 hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl"
                >
                  Apply
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleApply}
                className="h-11 w-full rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-lg transition-all duration-200 hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl"
              >
                Apply
              </Button>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {currentTab === 'text' ? (
              <>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      Text preset
                    </div>
                    {selectedTextPreset ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setDeletePresetKind('text')}
                        disabled={isDeletingTextPreset || isOverridingTextPreset || isSavingTextPreset}
                      >
                        {isDeletingTextPreset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    ) : null}
                  </div>
                  <Select value={textSelectValue} onValueChange={handleTextPresetChange}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Choose text preset" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {TEXT_ANIMATION_EFFECT_VALUES.map((value) => (
                        <SelectItem key={value} value={`builtin:${value}`}>
                          {getTextAnimationEffectLabel(value)}
                        </SelectItem>
                      ))}
                      {draftTextAnimationSettings?.presetKey === 'custom' ? (
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
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <SlidersHorizontal className="h-4 w-4 text-amber-600" />
                    Text tuning
                  </div>
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Hook text</span>
                    <Input
                      value={draftTextAnimationText}
                      onChange={(e) => setDraftTextAnimationText(e.target.value)}
                      placeholder={resolveTextAnimationText(null, sentenceText)}
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-3">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Text align</div>
                      <Select
                        value={resolvedText.contentAlign ?? resolvedText.horizontalAlign ?? 'left'}
                        onValueChange={(value) => updateTextSettings({ contentAlign: value as TextAnimationSettings['contentAlign'] })}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Text align" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Block horizontal position</div>
                      <Select
                        value={resolvedText.horizontalAlign ?? 'center'}
                        onValueChange={(value) => updateTextSettings({ horizontalAlign: value as TextAnimationSettings['horizontalAlign'] })}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Block horizontal position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Block vertical position</div>
                      <Select
                        value={resolvedText.verticalAlign ?? 'middle'}
                        onValueChange={(value) => updateTextSettings({ verticalAlign: value as TextAnimationSettings['verticalAlign'] })}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Block vertical position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="middle">Middle</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={resolvedText.animatePerWord === true}
                      onChange={(e) =>
                        updateTextSettings({
                          animatePerWord: e.target.checked,
                          wordDelaySeconds: e.target.checked
                            ? resolvedText.wordDelaySeconds ?? DEFAULT_TEXT_ANIMATION_WORD_DELAY
                            : resolvedText.wordDelaySeconds ?? DEFAULT_TEXT_ANIMATION_WORD_DELAY,
                        })
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-semibold text-slate-900">Animate words one by one</span>
                      <span className="block text-xs text-slate-500">
                        Staggers the Slide + cut animation so each word enters after the previous one.
                      </span>
                    </span>
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Text color</span>
                      <Input type="color" value={resolvedText.textColor ?? '#ffffff'} onChange={(e) => updateTextSettings({ textColor: e.target.value })} className="h-11 rounded-xl border-slate-200 p-2" />
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Accent color</span>
                      <Input type="color" value={resolvedText.accentColor ?? '#facc15'} onChange={(e) => updateTextSettings({ accentColor: e.target.value })} className="h-11 rounded-xl border-slate-200 p-2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Background mode</div>
                    <Select
                      value={resolvedText.backgroundMode ?? 'inheritImage'}
                      onValueChange={(value) => updateTextSettings({ backgroundMode: value as TextAnimationSettings['backgroundMode'] })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="Background mode" />
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
                  <input
                    ref={textBackgroundInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleTextBackgroundUpload}
                    className="hidden"
                  />
                  <input
                    ref={textBackgroundVideoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleTextBackgroundVideoUpload}
                    className="hidden"
                  />
                  {resolvedText.backgroundMode === 'inheritImage' ? (
                    previewTextInheritedImageUrl ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        This text scene is using the current image tab image as its background.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        No image is currently available on the image tab. Upload one there or switch this text scene to a custom image, solid color, or gradient background.
                      </div>
                    )
                  ) : null}
                  {resolvedText.backgroundMode === 'inheritVideo' ? (
                    resolvedTextPreviewBackgroundVideoUrl ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        This text scene is using the current video tab video as its background.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        No video is currently available on the video tab. Upload one there or switch this text scene to a custom video, image, solid color, or gradient background.
                      </div>
                    )
                  ) : null}
                  {resolvedText.backgroundMode === 'image' ? (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Background image</p>
                          <p className="text-xs text-slate-500">Upload a dedicated image for this text scene.</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => textBackgroundInputRef.current?.click()}
                            className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </Button>
                          {customTextBackgroundPreviewUrl ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleRemoveTextBackground}
                              className="h-9 rounded-xl border-red-200 bg-white text-red-600 hover:bg-red-50"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {customTextBackgroundPreviewUrl ? (
                        <img
                          src={customTextBackgroundPreviewUrl}
                          alt="Text scene background"
                          className="h-36 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                          Upload a background image to preview this text scene.
                        </div>
                      )}
                    </div>
                  ) : null}
                  {resolvedText.backgroundMode === 'video' ? (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Background video</p>
                          <p className="text-xs text-slate-500">Upload a dedicated looping video for this text scene.</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => textBackgroundVideoInputRef.current?.click()}
                            className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </Button>
                          {customTextBackgroundVideoPreviewUrl ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleRemoveTextBackgroundVideo}
                              className="h-9 rounded-xl border-red-200 bg-white text-red-600 hover:bg-red-50"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {customTextBackgroundVideoPreviewUrl ? (
                        <video
                          src={customTextBackgroundVideoPreviewUrl}
                          className="h-36 w-full rounded-xl object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                          Upload a background video to preview this text scene.
                        </div>
                      )}
                    </div>
                  ) : null}
                  {resolvedText.backgroundMode === 'solid' ? (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Background color</span>
                      <Input type="color" value={resolvedText.backgroundColor ?? '#0f172a'} onChange={(e) => updateTextSettings({ backgroundColor: e.target.value })} className="h-11 rounded-xl border-slate-200 p-2" />
                    </div>
                  ) : null}
                  {resolvedText.backgroundMode === 'gradient' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Gradient from</span>
                        <Input type="color" value={resolvedText.gradientFrom ?? '#0f172a'} onChange={(e) => updateTextSettings({ gradientFrom: e.target.value })} className="h-11 rounded-xl border-slate-200 p-2" />
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Gradient to</span>
                        <Input type="color" value={resolvedText.gradientTo ?? '#1d4ed8'} onChange={(e) => updateTextSettings({ gradientTo: e.target.value })} className="h-11 rounded-xl border-slate-200 p-2" />
                      </div>
                    </div>
                  ) : null}
                  <RangeField label="Speed" value={resolvedText.speed ?? 1} min={0.4} max={2.4} step={0.1} onChange={(value) => updateTextSettings({ speed: value })} />
                  <RangeField label="Font size" value={resolvedText.fontSizePercent ?? 12} min={5} max={24} step={0.1} onChange={(value) => updateTextSettings({ fontSizePercent: value })} />
                  <RangeField label="Max width" value={resolvedText.maxWidthPercent ?? 76} min={30} max={100} step={1} onChange={(value) => updateTextSettings({ maxWidthPercent: value })} />
                  {resolvedText.animatePerWord === true ? (
                    <RangeField
                      label="Word delay"
                      value={resolvedText.wordDelaySeconds ?? DEFAULT_TEXT_ANIMATION_WORD_DELAY}
                      min={TEXT_ANIMATION_WORD_DELAY_MIN}
                      max={TEXT_ANIMATION_WORD_DELAY_MAX}
                      step={TEXT_ANIMATION_WORD_DELAY_STEP}
                      onChange={(value) => updateTextSettings({ wordDelaySeconds: value })}
                    />
                  ) : null}
                  <RangeField label="Offset X" value={resolvedText.offsetX ?? 0} min={-35} max={35} step={1} onChange={(value) => updateTextSettings({ offsetX: value })} />
                  <RangeField label="Offset Y" value={resolvedText.offsetY ?? 0} min={-35} max={35} step={1} onChange={(value) => updateTextSettings({ offsetY: value })} />
                  <RangeField label="Background dim" value={resolvedText.backgroundDim ?? 0.38} min={0} max={0.92} step={0.01} onChange={(value) => updateTextSettings({ backgroundDim: value })} />
                  <RangeField label="Animation intensity" value={resolvedText.animationIntensity ?? 0.82} min={0} max={1.2} step={0.01} onChange={(value) => updateTextSettings({ animationIntensity: value })} />
                </div>

                {renderSoundEffectsSection('text')}

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Save className="h-4 w-4 text-amber-600" />
                    Output actions
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>Apply updates only this text scene in the editor.</p>
                    <p>Save as new preset creates a reusable text animation preset with its sound effects.</p>
                    {selectedTextPreset ? (
                      <p>Override preset updates {selectedTextPreset.title} in your preset library.</p>
                    ) : null}
                  </div>
                  {textActionError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {textActionError}
                    </div>
                  ) : null}
                  {canSaveTextAsNew ? (
                    <div className="flex gap-2">
                      <Input
                        value={textSaveTitle}
                        onChange={(e) => setTextSaveTitle(e.target.value)}
                        placeholder={selectedTextPreset ? 'New preset title' : 'Preset title'}
                        className="h-11 rounded-xl border-slate-200"
                      />
                      <Button
                        type="button"
                        onClick={handleSaveTextPreset}
                        disabled={!isTextSaveTitleValid || isSavingTextPreset}
                        className="h-11 rounded-xl bg-amber-600 px-4 text-white hover:bg-amber-700"
                      >
                        {isSavingTextPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Save as new preset
                      </Button>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOverrideTextPreset}
                    disabled={!canOverrideTextPreset || isOverridingTextPreset}
                    className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    {isOverridingTextPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Override preset
                  </Button>
                </div>
              </>
            ) : currentTab === 'overlay' ? (
              <>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-emerald-600" />
                      Overlay preset
                    </div>
                    {selectedOverlayPreset ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setDeletePresetKind('overlay')}
                        disabled={isDeletingOverlayPreset || isOverridingOverlayPreset || isSavingOverlayPreset}
                      >
                        {isDeletingOverlayPreset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    ) : null}
                  </div>
                  <Select value={overlaySelectValue} onValueChange={handleOverlayPresetChange}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Choose overlay preset" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectItem value="__none__">No saved preset</SelectItem>
                      {resolvedOverlayPreviewUrl ? (
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
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                    <span>Overlay Composition</span>
                  </div>

                  <input
                    ref={overlayInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleOverlayUpload}
                    className="hidden"
                  />

                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Overlay asset</p>
                        <p className="text-xs text-slate-500">Upload a transparent video, animated sticker, or still asset for this scene.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => overlayInputRef.current?.click()}
                          className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {resolvedOverlayPreviewUrl ? 'Replace' : 'Upload'}
                        </Button>
                        {resolvedOverlayPreviewUrl ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRemoveOverlayAsset}
                            className="h-9 rounded-xl border-red-200 bg-white text-red-600 hover:bg-red-50"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {resolvedOverlayPreviewUrl ? (
                      String(draftOverlayMimeType ?? '').startsWith('image/') ? (
                        <img
                          src={resolvedOverlayPreviewUrl}
                          alt="Overlay asset"
                          className="h-36 w-full rounded-xl object-contain bg-slate-950/90"
                        />
                      ) : (
                        <video
                          src={resolvedOverlayPreviewUrl}
                          className="h-36 w-full rounded-xl object-contain bg-slate-950/90"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      )
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center text-sm text-slate-500">
                        Upload an overlay asset to preview it over the current scene background.
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Background mode</div>
                    <Select
                      value={resolvedOverlay.backgroundMode ?? 'image'}
                      onValueChange={(value) => updateOverlaySettings({ backgroundMode: value as OverlaySettings['backgroundMode'] })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="Background mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {OVERLAY_BACKGROUND_MODE_VALUES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value === 'image'
                              ? 'Use image tab background'
                              : value === 'video'
                                ? 'Use video tab background'
                                : value === 'solid'
                                  ? 'Solid color'
                                  : 'Gradient'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {resolvedOverlay.backgroundMode === 'image' ? (
                    resolvedOverlaySceneImageUrl ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        This overlay scene is using the current image tab asset as its background.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        No image is available on the Image tab. Upload or generate one there, or switch this overlay scene to a solid or gradient background.
                      </div>
                    )
                  ) : null}

                  {resolvedOverlay.backgroundMode === 'video' ? (
                    resolvedOverlaySceneVideoUrl ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        This overlay scene is using the current video tab asset as its background.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        No video is available on the Video tab. Upload or generate one there, or switch this overlay scene to a solid or gradient background.
                      </div>
                    )
                  ) : null}

                  {resolvedOverlay.backgroundMode === 'solid' ? (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Background color</span>
                      <Input
                        type="color"
                        value={resolvedOverlay.backgroundColor ?? '#020617'}
                        onChange={(e) => updateOverlaySettings({ backgroundColor: e.target.value })}
                        className="h-11 rounded-xl border-slate-200 p-2"
                      />
                    </div>
                  ) : null}

                  {resolvedOverlay.backgroundMode === 'gradient' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Gradient from</span>
                        <Input
                          type="color"
                          value={resolvedOverlay.gradientFrom ?? '#020617'}
                          onChange={(e) => updateOverlaySettings({ gradientFrom: e.target.value })}
                          className="h-11 rounded-xl border-slate-200 p-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Gradient to</span>
                        <Input
                          type="color"
                          value={resolvedOverlay.gradientTo ?? '#1d4ed8'}
                          onChange={(e) => updateOverlaySettings({ gradientTo: e.target.value })}
                          className="h-11 rounded-xl border-slate-200 p-2"
                        />
                      </div>
                    </div>
                  ) : null}

                  {resolvedOverlay.backgroundMode === 'gradient' ? (
                    <RangeField
                      label="Gradient angle"
                      value={resolvedOverlay.gradientAngleDeg ?? 135}
                      min={0}
                      max={360}
                      step={1}
                      onChange={(value) => updateOverlaySettings({ gradientAngleDeg: value })}
                    />
                  ) : null}

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={resolvedOverlay.includeText === true}
                      onChange={(e) => updateOverlaySettings({ includeText: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-semibold text-slate-900">Include text-layer styling</span>
                      <span className="block text-xs text-slate-500">
                        Reuses the current Text tab copy and styling while letting you choose whether the overlay sits above or below it.
                      </span>
                    </span>
                  </label>

                  {resolvedOverlay.includeText === true ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Text layer order</div>
                      <Select
                        value={resolvedOverlay.textLayer ?? 'above'}
                        onValueChange={(value) => updateOverlaySettings({ textLayer: value as OverlaySettings['textLayer'] })}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Text layer order" />
                        </SelectTrigger>
                        <SelectContent>
                          {OVERLAY_TEXT_LAYER_VALUES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value === 'below' ? 'Overlay above text' : 'Text above overlay'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                        Text content, font sizing, color, and alignment still come from the Text tab.
                      </div>
                    </div>
                  ) : null}

                  <RangeField label="Width" value={resolvedOverlay.widthPercent ?? 26} min={5} max={100} step={1} onChange={(value) => updateOverlaySettings({ widthPercent: value })} />
                  <RangeField label="Height" value={resolvedOverlay.heightPercent ?? 22} min={5} max={100} step={1} onChange={(value) => updateOverlaySettings({ heightPercent: value })} />
                  <RangeField label="Offset X" value={resolvedOverlay.offsetX ?? 0} min={-50} max={50} step={1} onChange={(value) => updateOverlaySettings({ offsetX: value })} />
                  <RangeField label="Offset Y" value={resolvedOverlay.offsetY ?? 0} min={-50} max={50} step={1} onChange={(value) => updateOverlaySettings({ offsetY: value })} />
                  <RangeField label="Opacity" value={resolvedOverlay.opacity ?? 1} min={0} max={1} step={0.01} onChange={(value) => updateOverlaySettings({ opacity: value })} />
                  <RangeField label="Speed" value={resolvedOverlay.speed ?? 1} min={0.25} max={3} step={0.05} onChange={(value) => updateOverlaySettings({ speed: value })} />
                  <RangeField label="Scale" value={resolvedOverlay.scale ?? 1} min={0.25} max={3} step={0.05} onChange={(value) => updateOverlaySettings({ scale: value })} />
                  <RangeField label="Rotation" value={resolvedOverlay.rotationDeg ?? 0} min={-180} max={180} step={1} onChange={(value) => updateOverlaySettings({ rotationDeg: value })} />
                </div>

                {renderSoundEffectsSection('overlay')}

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Save className="h-4 w-4 text-emerald-600" />
                    Output actions
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>Apply updates only to this overlay scene in the editor.</p>
                    <p>Save as new preset stores the asset, placement settings, and sound effects in your overlay library.</p>
                    {selectedOverlayPreset ? (
                      <p>Override preset updates {selectedOverlayPreset.title} in your overlay library.</p>
                    ) : null}
                  </div>
                  {overlayActionError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {overlayActionError}
                    </div>
                  ) : null}
                  {canSaveOverlayAsNew ? (
                    <div className="flex gap-2">
                      <Input
                        value={overlaySaveTitle}
                        onChange={(e) => setOverlaySaveTitle(e.target.value)}
                        placeholder={selectedOverlayPreset ? 'New overlay title' : 'Overlay title'}
                        className="h-11 rounded-xl border-slate-200"
                      />
                      <Button
                        type="button"
                        onClick={handleSaveOverlayPreset}
                        disabled={!isOverlaySaveTitleValid || isSavingOverlayPreset}
                        className="h-11 rounded-xl bg-emerald-600 px-4 text-white hover:bg-emerald-700"
                      >
                        {isSavingOverlayPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Save as new preset
                      </Button>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOverrideOverlayPreset}
                    disabled={!canOverrideOverlayPreset || isOverridingOverlayPreset}
                    className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    {isOverridingOverlayPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Override preset
                  </Button>
                </div>
              </>
            ) : currentTab === 'visual' ? (
              <>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      Look preset
                    </div>
                    {selectedLookPreset && !isLookOnlyUploadVariant ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setDeletePresetKind('visual')}
                        disabled={isDeletingLookPreset || isOverridingLookPreset || isSavingLookPreset}
                      >
                        {isDeletingLookPreset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    ) : null}
                  </div>
                  <Select value={lookSelectValue} onValueChange={handleLookPresetChange}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Choose look preset" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {LOOK_EFFECT_VALUES.map((value) => (
                        <SelectItem key={value} value={`builtin:${value}`}>
                          {value === 'none' ? 'None' : getVisualEffectLabel(value)}
                        </SelectItem>
                      ))}
                      {retainedDraftTemporaryLook ? (
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
                  {!isLookOnlyUploadVariant ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateLookWithAi}
                      disabled={isGeneratingLookWithAi}
                      className="h-11 rounded-xl border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    >
                      {isGeneratingLookWithAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      Generate with AI
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                    Filter tuning
                  </div>
                  <RangeField label="Saturation" value={resolvedLook.saturation ?? 1} min={0} max={2.5} step={0.01} onChange={(value) => updateLookSettings({ saturation: value })} />
                  <RangeField label="Contrast" value={resolvedLook.contrast ?? 1} min={0} max={2.5} step={0.01} onChange={(value) => updateLookSettings({ contrast: value })} />
                  <RangeField label="Brightness" value={resolvedLook.brightness ?? 1} min={0} max={2.5} step={0.01} onChange={(value) => updateLookSettings({ brightness: value })} />
                  <RangeField label="Blur" value={resolvedLook.blurPx ?? 0} min={0} max={12} step={0.1} onChange={(value) => updateLookSettings({ blurPx: value })} />
                  <RangeField label="Sepia" value={resolvedLook.sepia ?? 0} min={0} max={1} step={0.01} onChange={(value) => updateLookSettings({ sepia: value })} />
                  <RangeField label="Hue rotate" value={resolvedLook.hueRotateDeg ?? 0} min={-180} max={180} step={1} onChange={(value) => updateLookSettings({ hueRotateDeg: value })} />
                  <RangeField label="Lighting" value={resolvedLook.animatedLightingIntensity ?? 0} min={0} max={1} step={0.01} onChange={(value) => updateLookSettings({ animatedLightingIntensity: value })} />
                  <RangeField label="Glass overlay" value={resolvedLook.glassOverlayOpacity ?? 0} min={0} max={0.4} step={0.01} onChange={(value) => updateLookSettings({ glassOverlayOpacity: value })} />
                </div>

                {!isLookOnlyUploadVariant ? (
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Save className="h-4 w-4 text-indigo-600" />
                      Output actions
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>Apply updates only this image in the editor.</p>
                      <p>Save as new preset creates a reusable look preset with a different title.</p>
                      {selectedLookPreset ? (
                        <p>Override preset updates {selectedLookPreset.title} in your preset library.</p>
                      ) : null}
                    </div>
                    {lookActionError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {lookActionError}
                      </div>
                    ) : null}
                    {canSaveLookAsNew ? (
                      <div className="flex gap-2">
                        <Input
                          value={lookSaveTitle}
                          onChange={(e) => setLookSaveTitle(e.target.value)}
                          placeholder={selectedLookPreset ? 'New preset title' : 'Preset title'}
                          className="h-11 rounded-xl border-slate-200"
                        />
                        <Button
                          type="button"
                          onClick={handleSaveLookPreset}
                          disabled={!isLookSaveTitleValid || isSavingLookPreset}
                          className="h-11 rounded-xl bg-indigo-600 px-4 text-white hover:bg-indigo-700"
                        >
                          {isSavingLookPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                          Save as new preset
                        </Button>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOverrideLookPreset}
                      disabled={!canOverrideLookPreset || isOverridingLookPreset}
                      className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    >
                      {isOverridingLookPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Override preset
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-sky-600" />
                      Motion preset
                    </div>
                    {selectedMotionPreset ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setDeletePresetKind('motion')}
                        disabled={isDeletingMotionPreset || isOverridingMotionPreset || isSavingMotionPreset}
                      >
                        {isDeletingMotionPreset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    ) : null}
                  </div>
                  <Select value={motionSelectValue} onValueChange={handleMotionPresetChange}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Choose motion preset" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {IMAGE_MOTION_EFFECT_SELECT_VALUES.map((value) => (
                        <SelectItem key={value} value={`builtin:${value}`}>
                          {getImageMotionEffectLabel(value)}
                        </SelectItem>
                      ))}
                      {retainedDraftTemporaryMotion ? (
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateMotionWithAi}
                    disabled={isGeneratingMotionWithAi}
                    className="h-11 rounded-xl border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                  >
                    {isGeneratingMotionWithAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Generate with AI
                  </Button>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Clock3 className="h-4 w-4 text-sky-600" />
                    Motion tuning
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    No-limit end values affect the final video only. Editor previews stay bounded.
                  </div>
                  <RangeField label="Speed" value={resolvedMotion.speed ?? 1} min={IMAGE_MOTION_SPEED_MIN} max={IMAGE_MOTION_SPEED_MAX} step={IMAGE_MOTION_SPEED_STEP} onChange={(value) => updateMotionSettings({ speed: value })} />
                  {isBuiltinDefaultScaleMotion ? (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 mt-2 text-xs text-sky-800">
                      Default scale is automatic and keeps zooming for the full scene duration. Only speed is adjustable for this preset.
                    </div>
                  ) : null}
                  <EndValueModeField label="End value behavior" name="motion-end-value-behavior" value={unifiedEndValueMode} onChange={updateAllEndValueModes} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Initial zoom" value={resolvedMotion.startScale ?? 1} min={0.5} max={2} step={0.01} onChange={(value) => updateMotionSettings({ startScale: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Target scale" value={resolvedMotion.endScale ?? 1.055} min={0.5} max={2} step={0.01} onChange={(value) => updateMotionSettings({ endScale: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="X start" value={resolvedMotion.translateXStart ?? 0} min={-20} max={20} step={0.1} onChange={(value) => updateMotionSettings({ translateXStart: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="X end" value={resolvedMotion.translateXEnd ?? 0} min={-20} max={20} step={0.1} onChange={(value) => updateMotionSettings({ translateXEnd: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Y start" value={resolvedMotion.translateYStart ?? 0} min={-20} max={20} step={0.1} onChange={(value) => updateMotionSettings({ translateYStart: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Y end" value={resolvedMotion.translateYEnd ?? 0} min={-20} max={20} step={0.1} onChange={(value) => updateMotionSettings({ translateYEnd: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Rotate start" value={resolvedMotion.rotateStart ?? 0} min={-10} max={10} step={0.1} onChange={(value) => updateMotionSettings({ rotateStart: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Rotate end" value={resolvedMotion.rotateEnd ?? 0} min={-10} max={10} step={0.1} onChange={(value) => updateMotionSettings({ rotateEnd: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Origin X" value={resolvedMotion.originX ?? 50} min={0} max={100} step={1} onChange={(value) => updateMotionSettings({ originX: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Origin Y" value={resolvedMotion.originY ?? 50} min={0} max={100} step={1} onChange={(value) => updateMotionSettings({ originY: value })} disabled={isBuiltinDefaultScaleMotion} />
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Save className="h-4 w-4 text-sky-600" />
                    Output actions
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>Apply updates only this image in the editor.</p>
                    <p>Save as new preset creates a reusable motion preset with a different title.</p>
                    {selectedMotionPreset ? (
                      <p>Override preset updates {selectedMotionPreset.title} in your preset library.</p>
                    ) : null}
                  </div>
                  {motionActionError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {motionActionError}
                    </div>
                  ) : null}
                  {canSaveMotionAsNew ? (
                    <div className="flex gap-2">
                      <Input
                        value={motionSaveTitle}
                        onChange={(e) => setMotionSaveTitle(e.target.value)}
                        placeholder={selectedMotionPreset ? 'New preset title' : 'Preset title'}
                        className="h-11 rounded-xl border-slate-200"
                      />
                      <Button
                        type="button"
                        onClick={handleSaveMotionPreset}
                        disabled={!isMotionSaveTitleValid || isSavingMotionPreset}
                        className="h-11 rounded-xl bg-sky-600 px-4 text-white hover:bg-sky-700"
                      >
                        {isSavingMotionPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Save as new preset
                      </Button>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOverrideMotionPreset}
                    disabled={!canOverrideMotionPreset || isOverridingMotionPreset}
                    className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    {isOverridingMotionPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Override preset
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        isOpen={deletePresetKind !== null}
        onClose={() => setDeletePresetKind(null)}
        onCancel={() => setDeletePresetKind(null)}
        onConfirm={() => {
          if (deletePresetKind === 'visual') {
            void handleDeleteLookPreset();
            return;
          }

          if (deletePresetKind === 'motion') {
            void handleDeleteMotionPreset();
            return;
          }

          if (deletePresetKind === 'text') {
            void handleDeleteTextPreset();
            return;
          }

          if (deletePresetKind === 'overlay') {
            void handleDeleteOverlayPreset();
          }
        }}
        variant="danger"
        title={
          deletePresetKind === 'visual'
            ? 'Delete look preset?'
            : deletePresetKind === 'motion'
              ? 'Delete motion preset?'
              : deletePresetKind === 'overlay'
                ? 'Delete overlay preset?'
                : 'Delete text preset?'
        }
        description={
          deletePresetKind === 'visual'
            ? 'This deletes the selected look preset from your library and resets this image to the built-in none look.'
            : deletePresetKind === 'motion'
              ? 'This deletes the selected motion preset from your library and resets this image to the built-in default motion.'
              : deletePresetKind === 'overlay'
                ? 'This deletes the selected overlay preset from your library and clears the overlay asset from this scene.'
                : 'This deletes the selected text preset from your library and resets this scene to the built-in pop-in / bounce text animation.'
        }
        confirmText={
          deletePresetKind === 'visual'
            ? 'Delete look preset'
            : deletePresetKind === 'motion'
              ? 'Delete motion preset'
              : deletePresetKind === 'overlay'
                ? 'Delete overlay preset'
                : 'Delete text preset'
        }
        cancelText="Cancel"
        isLoading={
          isDeletingLookPreset ||
          isDeletingMotionPreset ||
          isDeletingTextPreset ||
          isDeletingOverlayPreset
        }
      />

      <SoundEffectsLibraryModal
        isOpen={isSoundEffectsLibraryOpen}
        onClose={() => {
          setIsSoundEffectsLibraryOpen(false);
          setSoundEffectsLibraryTarget(null);
        }}
        onApply={handleApplySoundEffectsFromLibrary}
        title={
          soundEffectsLibraryTarget === 'overlay'
            ? 'Overlay Sound Effects Library'
            : 'Text Sound Effects Library'
        }
        subtitle={
          soundEffectsLibraryTarget === 'overlay'
            ? 'Select one or more sound effects for this overlay scene'
            : 'Select one or more sound effects for this text scene'
        }
        applyLabel="Add selected"
      />

      <SoundEffectEditModal
        isOpen={Boolean(editingSoundEffectTarget && editingSoundEffect)}
        title={
          editingSoundEffectTarget?.kind === 'overlay'
            ? 'Edit overlay sound effect'
            : 'Edit text sound effect'
        }
        audioUrl={editingSoundEffect?.url ?? null}
        initialName={String(editingSoundEffect?.title ?? '').trim()}
        initialVolumePercent={Number(editingSoundEffect?.volumePercent ?? 100) || 100}
        initialAudioSettings={cloneSoundEffectAudioSettings(
          editingSoundEffect?.audioSettings ?? editingSoundEffect?.defaultAudioSettings,
        )}
        isApplying={isApplyingSingleSoundEffectEdit}
        showSaveButton={false}
        showSaveAsPreset={false}
        showEditPresetsSection={false}
        actionError={soundEffectEditError}
        onClose={() => {
          setEditingSoundEffectTarget(null);
          setSoundEffectEditError(null);
        }}
        onApply={async (values: SoundEffectEditValues) => {
          if (!editingSoundEffectTarget) return;

          const currentItems = getDraftSoundEffects(editingSoundEffectTarget.kind);
          const current = currentItems[editingSoundEffectTarget.index];
          if (!current) return;

          setIsApplyingSingleSoundEffectEdit(true);
          try {
            const nextTitle =
              String(values.name ?? '').trim() || String(current.title ?? '').trim() || 'Sound effect';
            const nextVolumePercent = Math.max(
              0,
              Math.min(300, Number(values.volumePercent) || 100),
            );
            const nextAudioSettings = normalizeSoundEffectAudioSettings(values.audioSettings);

            commitDraftSoundEffects(
              editingSoundEffectTarget.kind,
              currentItems.map((item, index) =>
                index === editingSoundEffectTarget.index
                  ? {
                      ...item,
                      title: nextTitle,
                      volumePercent: nextVolumePercent,
                      audioSettings: nextAudioSettings,
                    }
                  : item,
              ),
            );
            setEditingSoundEffectTarget(null);
            setSoundEffectEditError(null);
          } finally {
            setIsApplyingSingleSoundEffectEdit(false);
          }
        }}
        onSave={async () => undefined}
      />

      <SoundEffectEditModal
        isOpen={Boolean(mixEditTarget && mixEditDraft)}
        title={mixEditTarget === 'overlay' ? 'Edit overlay sound stack' : 'Edit text sound stack'}
        audioUrl={mixEditDraft?.audioUrl ?? null}
        initialName={mixEditDraft?.name ?? ''}
        initialVolumePercent={mixEditDraft?.volumePercent ?? 100}
        initialAudioSettings={
          mixEditDraft?.audioSettings ??
          cloneSoundEffectAudioSettings(DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS)
        }
        isApplying={isApplyingMixEdit}
        showSaveButton={false}
        showSaveAsPreset={false}
        showEditPresetsSection={false}
        actionError={soundEffectMixError}
        onClose={() => {
          setMixEditTarget(null);
          setMixEditDraft(null);
          setSoundEffectMixError(null);
        }}
        onApply={async (values: SoundEffectEditValues) => {
          if (!mixEditTarget) return;

          const items = getDraftSoundEffects(mixEditTarget);
          setIsApplyingMixEdit(true);
          try {
            const nextVolumePercent = Math.max(
              0,
              Math.min(300, Number(values.volumePercent) || 100),
            );
            const nextAudioSettings = normalizeSoundEffectAudioSettings(values.audioSettings);

            commitDraftSoundEffects(
              mixEditTarget,
              items.map((effect) => ({
                ...effect,
                volumePercent: nextVolumePercent,
                audioSettings: mergeSoundEffectSettingsPreservingTrim(
                  nextAudioSettings,
                  effect.audioSettings ?? effect.defaultAudioSettings,
                ),
              })),
            );
            setMixEditTarget(null);
            setMixEditDraft(null);
            setSoundEffectMixError(null);
          } finally {
            setIsApplyingMixEdit(false);
          }
        }}
        onSave={async () => undefined}
      />
    </div>,
    portalTarget,
  );
}