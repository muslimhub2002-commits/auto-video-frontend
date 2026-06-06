'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type ChangeEvent } from 'react';
import { flushSync } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { Accordion } from '@/components/ui/accordion';
import {
  Video,
} from 'lucide-react';
import { Sidebar } from './_components/Sidebar';
import { HeaderBar } from './_components/HeaderBar';
import { ScriptSection } from './_components/ScriptSection';
import { SentencesImagesSection } from './_components/SentencesImagesSection';
import { VoiceOverSection } from './_components/VoiceOverSection';
import {
  SentenceVoiceOverManagerModal,
  type VoiceSegmentManagerItem,
} from './_components/SentenceVoiceOverManagerModal';
import { ElevenLabsVoiceSettingsModal } from './_components/ElevenLabsVoiceSettingsModal';
import {
  DEFAULT_ELEVENLABS_MODEL,
  DEFAULT_ELEVENLABS_VOICE_SETTINGS,
  normalizeElevenLabsModel,
  normalizeOptionalElevenLabsModel,
  normalizeElevenLabsVoiceSettings,
} from './_components/ElevenLabsVoiceSettingsFields';
import { BackgroundSoundtrackSection } from './_components/BackgroundSoundtrackSection';
import { GenerateVideoButton } from './_components/GenerateVideoButton';
import { VideoJobSection } from './_components/VideoJobSection';
import type { ScriptReferenceDto } from './_components/ScriptReferencesModal';
import { GeneratePageSkeleton } from './_components/GeneratePageSkeleton';
import { RenderSettingsSection } from './_components/RenderSettingsSection';
import { GenerateModalsHost } from './_components/GenerateModalsHost';
import { SavedSequenceSaveModal } from './_components/SavedSequenceSaveModal';
import { SoundEffectEditModal, type SoundEffectEditValues } from './_components/SoundEffectEditModal';
import type { SoundEffectDto } from './_components/SoundEffectsLibraryModal';
import {
  DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
  areSoundEffectAudioSettingsEqual,
  cloneSoundEffectAudioSettings,
  normalizeSoundEffectAudioSettings,
  type SoundEffectAudioSettings,
} from './_types/sound-effect-audio';
import {
  computeSentenceSoundEffectTiming,
} from './_utils/soundEffectsTiming';
import {
  renderEditedAudioFile,
  stripFileExtension,
} from './_utils/audioBrowserProcessing';
import {
  TranslateScriptModal,
  type TranslateMethod,
  type TranslateLoadingAction,
} from './_components/TranslateScriptModal';
import { useAuthGuard } from './_hooks/useAuthGuard';
import { useSentencesEditor } from './_hooks/useSentencesEditor';
import { useVideoJob } from './_hooks/useVideoJob';
import { api } from '@/lib/api';
import {
  ensureManagedPublicUrl,
  mapWithConcurrency,
  uploadManagedFile,
} from '@/lib/cloudinary';
import { useAlertModal } from '@/components/ui/alert-modal';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/toast';
import type {
  ElevenLabsModel,
  ElevenLabsVoiceSettings,
  SentenceItem,
  SentenceSoundEffectItem,
} from './_types/sentences';
import type { SavedSequenceDetailDto } from './_types/saved-sequences';
import type { GenerateTestVideoRequest } from './_components/sentences/test-video.types';
import {
  getDefaultImageFilterSettings,
  getDefaultImageMotionSettings,
  getDefaultImageMotionSpeed,
  getDefaultOverlaySettings,
  getImageMotionEffectLabel,
  getVisualEffectLabel,
  IMAGE_MOTION_EFFECT_SELECT_VALUES,
  normalizeImageFilterSettings,
  normalizeImageMotionSettings,
  normalizeOverlaySettings,
  resolveImageMotionSpeed,
} from './_components/sentences/ImageEffectPreview';
import type {
  ImageFilterPresetDto,
  ImageFilterSettings,
  ImageMotionSettings,
  MotionEffectPresetDto,
  OverlayPresetDto,
  OverlaySettings,
} from './_components/sentences/ImageEffectPreview';
import {
  getDefaultTextAnimationSettings,
  normalizeTextAnimationSettings,
  resolveTextAnimationEffectFromSettings,
  resolveTextAnimationText,
} from './_components/sentences/TextAnimationPreview';
import type {
  TextAnimationPresetDto,
  TextAnimationSettings,
} from './_components/sentences/TextAnimationPreview';
import {
  buildLookPresetSelectionPatch,
  buildMotionPresetSelectionPatch,
  hasCustomLookSelection,
  hasCustomMotionSelection,
  VISUAL_EFFECT_SELECT_VALUES,
} from './_utils/imageEffectSelection';
import {
  applySavedSequenceToSentences,
  buildSavedSequenceSceneSnapshot,
  hasUnsavedOverlaySequenceAsset,
} from './_utils/savedSequences';
import {
  BulkSceneEffectPresetModal,
  type BulkSceneEffectPresetOption,
} from './_components/sentences/BulkSceneEffectPresetModal';
import {
  BulkSceneEffectScenePickerModal,
  type BulkSceneEffectScenePickerItem,
} from './_components/sentences/BulkSceneEffectScenePickerModal';

type ScriptCharacter = {
  key: string;
  name: string;
  description: string;
  isSahaba: boolean;
  isProphet: boolean;
  isWoman: boolean;
};

type ScriptLocation = {
  key: string;
  name: string;
  description?: string;
};

type BackendDetachedSoundEffectDto = {
  sound_effect_id?: string | null;
  soundEffectId?: string | null;
  title?: string | null;
  url?: string | null;
  delay_seconds?: number | null;
  delaySeconds?: number | null;
  volume_percent?: number | null;
  volumePercent?: number | null;
  timing_mode?: 'with_previous' | 'after_previous_ends' | null;
  timingMode?:
  | 'with_previous'
  | 'after_previous_ends'
  | 'withPrevious'
  | 'afterPreviousEnds'
  | null;
  audio_settings_override?: Record<string, unknown> | null;
  audioSettingsOverride?: Record<string, unknown> | null;
  default_audio_settings?: Record<string, unknown> | null;
  defaultAudioSettings?: Record<string, unknown> | null;
  duration_seconds?: number | null;
  durationSeconds?: number | null;
};

type BackendTextAnimationPresetDto = Partial<TextAnimationPresetDto> & {
  sound_effects?: BackendDetachedSoundEffectDto[] | null;
};

type BackendOverlayPresetDto = Partial<OverlayPresetDto> & {
  mime_type?: string | null;
  sound_effects?: BackendDetachedSoundEffectDto[] | null;
};

type BackendSentenceDto = {
  id: string;
  text: string;
  index: number;
  voice_over_url?: string | null;
  voiceOverUrl?: string | null;
  voice_over_mime_type?: string | null;
  voiceOverMimeType?: string | null;
  voice_over_duration_seconds?: number | null;
  voiceOverDurationSeconds?: number | null;
  voice_over_provider?: 'google' | 'elevenlabs' | null;
  voiceOverProvider?: 'google' | 'elevenlabs' | null;
  voice_over_voice_id?: string | null;
  voiceOverVoiceId?: string | null;
  voice_over_voice_name?: string | null;
  voiceOverVoiceName?: string | null;
  voice_over_style_instructions?: string | null;
  voiceOverStyleInstructions?: string | null;
  eleven_labs_settings?: Partial<ElevenLabsVoiceSettings> | null;
  elevenLabsSettings?: Partial<ElevenLabsVoiceSettings> | null;
  eleven_labs_model?: ElevenLabsModel | null;
  elevenLabsModel?: ElevenLabsModel | null;
  scene_tab?: SentenceItem['sceneTab'] | null;
  sceneTab?: SentenceItem['sceneTab'] | null;
  align_sound_effects_to_scene_end?: boolean | null;
  alignSoundEffectsToSceneEnd?: boolean | null;
  image_effects_mode?: 'quick' | 'detailed' | null;
  imageEffectsMode?: 'quick' | 'detailed' | null;
  image_filter_id?: string | null;
  imageFilterId?: string | null;
  image_filter_settings?: Record<string, unknown> | null;
  imageFilterSettings?: Record<string, unknown> | null;
  motion_effect_id?: string | null;
  motionEffectId?: string | null;
  image_motion_settings?: Record<string, unknown> | null;
  imageMotionSettings?: Record<string, unknown> | null;
  text_animation_text?: string | null;
  textAnimationText?: string | null;
  text_animation_effect?: SentenceItem['textAnimationEffect'] | null;
  textAnimationEffect?: SentenceItem['textAnimationEffect'] | null;
  text_animation_id?: string | null;
  textAnimationId?: string | null;
  text_animation_settings?: Record<string, unknown> | null;
  textAnimationSettings?: Record<string, unknown> | null;
  text_animation_sound_effects?: BackendDetachedSoundEffectDto[] | null;
  textAnimationSoundEffects?: BackendDetachedSoundEffectDto[] | null;
  overlay_id?: string | null;
  overlayId?: string | null;
  overlay_settings?: Record<string, unknown> | null;
  overlaySettings?: Record<string, unknown> | null;
  overlay_sound_effects?: BackendDetachedSoundEffectDto[] | null;
  overlaySoundEffects?: BackendDetachedSoundEffectDto[] | null;
  overlay?: {
    id: string;
    title: string;
    url: string;
    mime_type?: string | null;
    mimeType?: string | null;
    settings?: Record<string, unknown> | null;
  } | null;
  image?: { id: string; image: string; prompt?: string | null } | null;
  secondaryImage?: { id: string; image: string; prompt?: string | null } | null;
  startFrameImage?: { id: string; image: string; prompt?: string | null } | null;
  endFrameImage?: { id: string; image: string; prompt?: string | null } | null;
  textBackgroundImage?: { id: string; image: string; prompt?: string | null } | null;
  textBackgroundVideo?: { id: string; video: string } | null;
  video?: { id: string; video: string } | null;
  video_prompt?: string | null;
  videoPrompt?: string | null;
  isSuspense?: boolean;
  sound_effects?: Array<{
    id: string;
    index: number;
    delay_seconds: number;
    volume_percent: number | null;
    audio_settings_override?: Record<string, unknown> | null;
    timing_mode?: 'with_previous' | 'after_previous_ends' | null;
    sound_effect: {
      id: string;
      title: string;
      url: string;
      volume_percent?: number;
      audio_settings?: Record<string, unknown> | null;
      duration_seconds?: number | null;
      is_merged?: boolean;
    };
  }>;
  transition_sound_effects?: Array<{
    sound_effect_id: string;
    title?: string;
    url?: string;
    delay_seconds?: number;
    volume_percent?: number;
  }>;
  forced_character_keys?: string[] | null;
  forcedCharacterKeys?: string[] | null;
  character_keys?: string[] | null;
  characterKeys?: string[] | null;
  location_key?: string | null;
  locationKey?: string | null;
  forced_location_key?: string | null;
  forcedLocationKey?: string | null;
  transition_to_next?: SentenceItem['transitionToNext'] | null;
  transitionToNext?: SentenceItem['transitionToNext'] | null;
  visual_effect?: Exclude<SentenceItem['visualEffect'], 'none'> | null;
  visualEffect?: Exclude<SentenceItem['visualEffect'], 'none'> | null;
  image_motion_effect?: NonNullable<SentenceItem['imageMotionEffect']> | null;
  imageMotionEffect?: NonNullable<SentenceItem['imageMotionEffect']> | null;
  image_motion_speed?: number | null;
  imageMotionSpeed?: number | null;
};

type PresetLibraryResponse<TPreset> = {
  items?: TPreset[] | null;
  total?: number;
  page?: number;
  limit?: number;
};

const normalizeDetachedSentenceSoundEffects = (
  items: unknown,
): SentenceSoundEffectItem[] => {
  const list = Array.isArray(items) ? items : [];

  return list.flatMap((entry) => {
    const item = entry as BackendDetachedSoundEffectDto | null | undefined;
    const id = String(item?.sound_effect_id ?? item?.soundEffectId ?? '').trim();
    const url = String(item?.url ?? '').trim();
    if (!id || !url) return [];

    const rawTimingMode = item?.timing_mode ?? item?.timingMode ?? 'with_previous';
    const durationSeconds = Number(item?.duration_seconds ?? item?.durationSeconds);

    return [
      {
        id,
        title: String(item?.title ?? '').trim() || 'Sound effect',
        url,
        delaySeconds: Math.max(
          0,
          Number(item?.delay_seconds ?? item?.delaySeconds ?? 0) || 0,
        ),
        volumePercent: Math.max(
          0,
          Math.min(300, Number(item?.volume_percent ?? item?.volumePercent ?? 100) || 100),
        ),
        timingMode:
          rawTimingMode === 'after_previous_ends' ||
            rawTimingMode === 'afterPreviousEnds'
            ? 'afterPreviousEnds'
            : 'withPrevious',
        audioSettings: cloneSoundEffectAudioSettings(
          item?.audio_settings_override ?? item?.audioSettingsOverride,
        ),
        defaultAudioSettings: cloneSoundEffectAudioSettings(
          item?.default_audio_settings ?? item?.defaultAudioSettings,
        ),
        durationSeconds:
          Number.isFinite(durationSeconds) && durationSeconds >= 0
            ? Math.max(0, durationSeconds)
            : null,
      },
    ];
  });
};

const serializeDetachedSentenceSoundEffects = (
  items: SentenceSoundEffectItem[] | null | undefined,
): Array<{
  sound_effect_id: string;
  title?: string;
  url?: string;
  delay_seconds: number;
  volume_percent: number;
  audio_settings_override?: Record<string, unknown> | null;
  timing_mode: 'with_previous' | 'after_previous_ends';
  duration_seconds?: number | null;
}> => {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items
    .filter((item) => Boolean(item?.id))
    .map((item) => ({
      sound_effect_id: String(item.id),
      title: String(item.title ?? '').trim() || undefined,
      url: String(item.url ?? '').trim() || undefined,
      delay_seconds: Math.max(0, Number(item.delaySeconds ?? 0) || 0),
      volume_percent: Math.max(
        0,
        Math.min(300, Number(item.volumePercent ?? 100) || 100),
      ),
      audio_settings_override: areSoundEffectAudioSettingsEqual(
        item.audioSettings,
        item.defaultAudioSettings,
      )
        ? null
        : normalizeSoundEffectAudioSettings(item.audioSettings),
      timing_mode:
        item.timingMode === 'afterPreviousEnds'
          ? 'after_previous_ends'
          : 'with_previous',
      duration_seconds:
        typeof item.durationSeconds === 'number' && Number.isFinite(item.durationSeconds)
          ? Math.max(0, item.durationSeconds)
          : null,
    }));
};

const areDetachedSentenceSoundEffectsEqual = (
  left: SentenceSoundEffectItem[] | null | undefined,
  right: SentenceSoundEffectItem[] | null | undefined,
) => {
  return (
    JSON.stringify(serializeDetachedSentenceSoundEffects(left)) ===
    JSON.stringify(serializeDetachedSentenceSoundEffects(right))
  );
};

const normalizeTextAnimationPresetItem = (
  item: BackendTextAnimationPresetDto | null | undefined,
): TextAnimationPresetDto | null => {
  const id = String(item?.id ?? '').trim();
  if (!id) return null;

  const soundEffects = normalizeDetachedSentenceSoundEffects(
    item?.soundEffects ?? item?.sound_effects,
  );

  return {
    id,
    title: String(item?.title ?? '').trim() || 'Untitled text animation',
    settings: normalizeSettingsObject(item?.settings) ?? null,
    soundEffects: soundEffects.length > 0 ? soundEffects : null,
  };
};

const normalizeOverlayPresetItem = (
  item: BackendOverlayPresetDto | null | undefined,
): OverlayPresetDto | null => {
  const id = String(item?.id ?? '').trim();
  const url = String(item?.url ?? '').trim();
  if (!id || !url) return null;

  const soundEffects = normalizeDetachedSentenceSoundEffects(
    item?.soundEffects ?? item?.sound_effects,
  );

  return {
    id,
    title: String(item?.title ?? '').trim() || 'Untitled overlay',
    url,
    mimeType:
      String(item?.mimeType ?? item?.mime_type ?? '').trim() || null,
    settings: normalizeSettingsObject(item?.settings) ?? getDefaultOverlaySettings('image'),
    soundEffects: soundEffects.length > 0 ? soundEffects : null,
  };
};

type BulkLookEffectResponse = {
  items?: Array<{
    sentenceId?: string;
    index?: number;
    visualEffect?: SentenceItem['visualEffect'];
    imageFilterSettings?: Record<string, unknown> | null;
  }>;
};

type BulkMotionEffectResponse = {
  items?: Array<{
    sentenceId?: string;
    index?: number;
    imageMotionEffect?: SentenceItem['imageMotionEffect'];
    imageMotionSettings?: Record<string, unknown> | null;
  }>;
};

type BulkFeelingCueResponse = {
  items?: Array<{
    sentenceId?: string;
    index?: number;
    feeling?: string;
  }>;
};

type BulkAiEffectKind = 'look' | 'motion';

type BulkManualEffectModalState = {
  kind: BulkAiEffectKind;
  selectedValue: string;
};

type BulkManualEffectScenePickerState = {
  kind: BulkAiEffectKind;
  selectedValue: string;
  selectedSentenceIds: string[];
};

type BulkLookEffectRequestItem = {
  index: number;
  sentenceId: string;
  imagePrompt: string;
  visualEffect: SentenceItem['visualEffect'] | 'none';
  customImageFilterId: string | null;
  imageFilterSettings: Record<string, unknown> | null;
};

type BulkLookEffectItem = {
  sentenceId: string;
  index: number;
  visualEffect: Exclude<SentenceItem['visualEffect'], null | 'none'>;
  imageFilterSettings: ImageFilterSettings;
};

type BulkMotionEffectRequestItem = {
  index: number;
  sentenceId: string;
  imagePrompt: string;
  imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
  imageMotionSpeed: number | null;
  customMotionEffectId: string | null;
  imageMotionSettings: Record<string, unknown> | null;
};

type BulkMotionEffectItem = {
  sentenceId: string;
  index: number;
  imageMotionEffect: Exclude<SentenceItem['imageMotionEffect'], null | 'default'>;
  imageMotionSettings: ImageMotionSettings;
  imageMotionSpeed: number;
};

type BulkFeelingCueRequestItem = {
  index: number;
  sentenceId: string;
  text: string;
};

type BulkFeelingCueItem = {
  sentenceId: string;
  index: number;
  feeling: string;
};

const LEADING_FEELING_CUE_PATTERN = /^\s*\[[^\]]+\]\s*/u;

function normalizeFeelingCueValue(value: string | null | undefined): string | null {
  const normalized = String(value ?? '')
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^a-z\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return null;
  }

  const words = normalized.split(' ').filter(Boolean).slice(0, 3);
  return words.length > 0 ? words.join(' ') : null;
}

function applyFeelingCueToSentenceText(
  text: string | null | undefined,
  feeling: string | null | undefined,
): string {
  const normalizedText = String(text ?? '').replace(LEADING_FEELING_CUE_PATTERN, '').trim();
  const normalizedFeeling = normalizeFeelingCueValue(feeling);

  if (!normalizedFeeling) {
    return normalizedText;
  }

  return normalizedText
    ? `[${normalizedFeeling}] ${normalizedText}`
    : `[${normalizedFeeling}]`;
}

function normalizeImageMotionSpeedValue(value: number | null | undefined) {
  const numeric = Number(value ?? 1);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(2.5, Math.max(0.5, numeric));
}

type BackgroundSoundtrackItem = {
  id: string;
  title: string;
  url: string;
  is_favorite?: boolean;
  volume_percent?: number;
  audio_settings?: SoundEffectAudioSettings | null;
  is_preset?: boolean;
  source_soundtrack_id?: string | null;
};

type MaterializedBackgroundSoundtrackAsset = {
  cacheKey: string;
  soundtrackId: string;
  sourceUrl: string;
  title: string;
  file: File;
  objectUrl: string;
};

type MaterializedRenderSoundEffectAsset = {
  cacheKey: string;
  uploadedUrl: string;
  durationSeconds: number | null;
};

type SentenceVoiceDownloadSource = 'current' | 'preview';

type RenderSoundEffectMaterializationSource = {
  title?: string | null;
  url?: string | null;
  durationSeconds?: number | null;
  audioSettings?: SoundEffectAudioSettings | null;
};

const RENDER_SOUND_EFFECT_MATERIALIZATION_CONCURRENCY = 4;
const RENDER_SOUND_EFFECT_UPLOAD_FOLDER =
  'auto-video-generator/render-sound-effects';
const RENDER_UPLOAD_EXCLUDED_PROVIDERS = ['cloudinary'] as const;

const normalizeBackgroundSoundtrackItem = (
  item: Partial<BackgroundSoundtrackItem> | null | undefined,
): BackgroundSoundtrackItem => {
  const rawVolume = Number(item?.volume_percent);

  return {
    id: String(item?.id ?? '').trim(),
    title: String(item?.title ?? '').trim(),
    url: String(item?.url ?? '').trim(),
    is_favorite: Boolean(item?.is_favorite),
    volume_percent: Number.isFinite(rawVolume) ? Math.max(0, Math.min(300, rawVolume)) : 100,
    audio_settings: cloneSoundEffectAudioSettings(item?.audio_settings),
    is_preset: Boolean(item?.is_preset),
    source_soundtrack_id: item?.source_soundtrack_id ? String(item.source_soundtrack_id).trim() : null,
  };
};

const getRequestErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === 'string' && message.trim()) return message.trim();
  if (Array.isArray(message) && message.length > 0) {
    const firstMessage = message.find((value) => typeof value === 'string' && value.trim());
    if (typeof firstMessage === 'string') return firstMessage.trim();
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return fallback;
};

function normalizeSettingsObject(
  value: Record<string, unknown> | null | undefined,
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

function resolveSentenceSceneTab(
  sentence: Pick<SentenceItem, 'sceneTab' | 'mediaMode'>,
): NonNullable<SentenceItem['sceneTab']> {
  if (
    sentence.sceneTab === 'image' ||
    sentence.sceneTab === 'video' ||
    sentence.sceneTab === 'text' ||
    sentence.sceneTab === 'overlay'
  ) {
    return sentence.sceneTab;
  }

  return sentence.mediaMode === 'frames' ? 'video' : 'image';
}

function resolveTextSceneBackgroundMode(
  sentence: Pick<
    SentenceItem,
    'text' | 'textAnimationEffect' | 'textAnimationSettings' | 'textAnimationText'
  >,
  isShortVideo: boolean,
): NonNullable<TextAnimationSettings['backgroundMode']> {
  return (
    normalizeTextAnimationSettings(
      sentence.textAnimationSettings,
      sentence.textAnimationEffect,
      isShortVideo,
      resolveTextAnimationText(sentence.textAnimationText, sentence.text),
    ).backgroundMode ?? 'inheritImage'
  );
}

function resolveOverlaySceneBackgroundMode(
  sentence: Pick<SentenceItem, 'overlaySettings'>,
): NonNullable<OverlaySettings['backgroundMode']> {
  return normalizeOverlaySettings(sentence.overlaySettings, 'image').backgroundMode ?? 'image';
}

type TextSceneRenderBackgroundAsset = {
  backgroundMode: NonNullable<TextAnimationSettings['backgroundMode']>;
  transport: 'image' | 'video' | 'none';
  file: File | null;
  url: string | null;
};

type OverlaySceneRenderBackgroundAsset = {
  backgroundMode: NonNullable<OverlaySettings['backgroundMode']>;
  transport: 'image' | 'video' | 'none';
  file: File | null;
  url: string | null;
};

type OverlaySceneRenderAsset = {
  file: File | null;
  url: string | null;
  mimeType: string | null;
};

function resolveTextSceneRenderBackgroundAsset(
  sentence: Pick<
    SentenceItem,
    | 'image'
    | 'imageUrl'
    | 'text'
    | 'video'
    | 'videoUrl'
    | 'textAnimationText'
    | 'textBackgroundImage'
    | 'textBackgroundImageUrl'
    | 'textBackgroundVideo'
    | 'textBackgroundVideoUrl'
    | 'textAnimationSettings'
    | 'textAnimationEffect'
  >,
  isShortVideo: boolean,
): TextSceneRenderBackgroundAsset {
  const backgroundMode = resolveTextSceneBackgroundMode(sentence, isShortVideo);

  if (backgroundMode === 'image') {
    return {
      backgroundMode,
      transport: 'image',
      file: sentence.textBackgroundImage ?? null,
      url: String(sentence.textBackgroundImageUrl ?? '').trim() || null,
    };
  }

  if (backgroundMode === 'inheritImage') {
    return {
      backgroundMode,
      transport: 'image',
      file: sentence.image ?? null,
      url: String(sentence.imageUrl ?? '').trim() || null,
    };
  }

  if (backgroundMode === 'video') {
    return {
      backgroundMode,
      transport: 'video',
      file: sentence.textBackgroundVideo ?? null,
      url: String(sentence.textBackgroundVideoUrl ?? '').trim() || null,
    };
  }

  if (backgroundMode === 'inheritVideo') {
    return {
      backgroundMode,
      transport: 'video',
      file: sentence.video ?? null,
      url: String(sentence.videoUrl ?? '').trim() || null,
    };
  }

  return {
    backgroundMode,
    transport: 'none',
    file: null,
    url: null,
  };
}

function resolveOverlaySceneRenderBackgroundAsset(
  sentence: Pick<
    SentenceItem,
    'image' | 'imageUrl' | 'video' | 'videoUrl' | 'overlaySettings'
  >,
): OverlaySceneRenderBackgroundAsset {
  const backgroundMode = resolveOverlaySceneBackgroundMode(sentence);

  if (backgroundMode === 'image') {
    return {
      backgroundMode,
      transport: 'image',
      file: sentence.image ?? null,
      url: String(sentence.imageUrl ?? '').trim() || null,
    };
  }

  if (backgroundMode === 'video') {
    return {
      backgroundMode,
      transport: 'video',
      file: sentence.video ?? null,
      url: String(sentence.videoUrl ?? '').trim() || null,
    };
  }

  return {
    backgroundMode,
    transport: 'none',
    file: null,
    url: null,
  };
}

function resolveOverlaySceneRenderAsset(
  sentence: Pick<SentenceItem, 'overlayFile' | 'overlayUrl' | 'overlayMimeType'>,
): OverlaySceneRenderAsset {
  return {
    file: sentence.overlayFile ?? null,
    url: String(sentence.overlayUrl ?? '').trim() || null,
    mimeType: String(sentence.overlayMimeType ?? '').trim() || null,
  };
}

type BulkSceneEffectPreviewAsset = {
  transport: 'image' | 'video' | 'none';
  file: File | null;
  url: string | null;
};

function getFirstNonEmptyUrl(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    const resolved = String(candidate ?? '').trim();
    if (resolved) return resolved;
  }

  return null;
}

function resolveBulkSceneEffectPreviewAsset(
  sentence: Pick<
    SentenceItem,
    | 'sceneTab'
    | 'mediaMode'
    | 'image'
    | 'imageUrl'
    | 'startImage'
    | 'startImageUrl'
    | 'endImage'
    | 'endImageUrl'
    | 'video'
    | 'videoUrl'
  >,
): BulkSceneEffectPreviewAsset {
  const sceneTab = resolveSentenceSceneTab(sentence);

  if (sceneTab === 'video') {
    return {
      transport: 'video',
      file: sentence.video ?? null,
      url: getFirstNonEmptyUrl(sentence.videoUrl),
    };
  }

  if (sceneTab === 'image') {
    return {
      transport: 'image',
      file: sentence.image ?? sentence.startImage ?? sentence.endImage ?? null,
      url: getFirstNonEmptyUrl(
        sentence.imageUrl,
        sentence.startImageUrl,
        sentence.endImageUrl,
      ),
    };
  }

  return {
    transport: 'none',
    file: null,
    url: null,
  };
}

function inferOverlayResourceType(
  asset: Pick<OverlaySceneRenderAsset, 'url' | 'mimeType'>,
): 'image' | 'video' {
  const mimeType = String(asset.mimeType ?? '').trim().toLowerCase();
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';

  const url = String(asset.url ?? '').trim().toLowerCase();
  return /\.(mp4|mov|m4v|webm|avi|mkv|ogv|ogg)(?:\?|#|$)/u.test(url)
    ? 'video'
    : 'image';
}

function serializeTextAnimationSettingsForRender(
  sentence: Pick<SentenceItem, 'text' | 'textAnimationSettings' | 'textAnimationText'>,
  fallbackEffect: SentenceItem['textAnimationEffect'] | null | undefined,
  isShortVideo: boolean,
) {
  return normalizeTextAnimationSettings(
    sentence.textAnimationSettings,
    fallbackEffect,
    isShortVideo,
    resolveTextAnimationText(sentence.textAnimationText, sentence.text),
  );
}

type ScriptDraftDto = {
  id: string;
  script: string;
  language?: string | null;
  video_url?: string | null;
  voice_over_chunks?: ScriptVoiceOverChunkDto[] | null;
  voice_generation_config?: ScriptVoiceGenerationConfigDto | null;
  shorts_scripts?: string[] | null;
  short_scripts?: Array<{
    id: string;
    video_url?: string | null;
    voice_over_chunks?: ScriptVoiceOverChunkDto[] | null;
    voice_generation_config?: ScriptVoiceGenerationConfigDto | null;
    sentences?: BackendSentenceDto[];
    voice?: { id: string; voice: string } | null;
  }>;
  subject?: string | null;
  subject_content?: string | null;
  length?: string | null;
  style?: string | null;
  technique?: string | null;
  reference_scripts?: { id: string; title: string | null; script: string }[];
  voice?: { id: string; voice: string } | null;
  characters?: ScriptCharacter[];
  locations?: ScriptLocation[];
  sentences?: BackendSentenceDto[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000';

const CTA_SENTENCES_BY_LANGUAGE: Record<
  string,
  { subscribe: string; shorts: string }
> = {
  en: {
    subscribe: 'Please Subscribe & Help us reach out to more people',
    shorts: 'You can find the first video pinned in our channel',
  },
  ar: {
    subscribe: 'يرجى الاشتراك ومساعدتنا في الوصول إلى المزيد من الناس',
    shorts: 'يمكنك مشاهدة الفيديو الكامل من الرابط في أول تعليق',
  },
  'ar-eg': {
    subscribe: 'اعملوا اشتراك وساعدونا نوصل لناس أكتر.',
    shorts: 'تقدروا تشوفوا الفيديو الكامل من اللينك اللي في أول كومنت.',
  },
  es: {
    subscribe: 'Suscríbete y ayúdanos a llegar a más personas.',
    shorts: 'Puedes ver el video completo en el enlace del primer comentario.',
  },
  fr: {
    subscribe: 'Abonnez-vous et aidez-nous à toucher plus de personnes.',
    shorts: 'Vous pouvez regarder la vidéo complète via le lien dans le premier commentaire.',
  },
  de: {
    subscribe: 'Bitte abonnieren Sie und helfen Sie uns, mehr Menschen zu erreichen.',
    shorts: 'Du kannst das vollständige Video über den Link im ersten Kommentar ansehen.',
  },
  it: {
    subscribe: 'Iscriviti e aiutaci a raggiungere più persone.',
    shorts: 'Puoi guardare il video completo dal link nel primo commento.',
  },
  pt: {
    subscribe: 'Inscreva-se e ajude-nos a alcançar mais pessoas.',
    shorts: 'Você pode assistir ao vídeo completo pelo link no primeiro comentário.',
  },
  ru: {
    subscribe: 'Подпишитесь и помогите нам охватить больше людей.',
    shorts: 'Полное видео можно посмотреть по ссылке в первом комментарии.',
  },
  tr: {
    subscribe: 'Lütfen abone olun ve daha fazla insana ulaşmamıza yardımcı olun.',
    shorts: 'Videonun tamamını ilk yorumdaki bağlantıdan izleyebilirsiniz.',
  },
  hi: {
    subscribe: 'कृपया सब्सक्राइब करें और हमें अधिक लोगों तक पहुँचने में मदद करें।',
    shorts: 'पूरा वीडियो पहले कमेंट में दिए गए लिंक से देख सकते हैं।',
  },
  ur: {
    subscribe: 'براہِ کرم سبسکرائب کریں اور ہمیں مزید لوگوں تک پہنچنے میں مدد کریں۔',
    shorts: 'آپ مکمل ویڈیو پہلے کمنٹ میں دیے گئے لنک سے دیکھ سکتے ہیں۔',
  },
  id: {
    subscribe: 'Silakan berlangganan dan bantu kami menjangkau lebih banyak orang.',
    shorts: 'Kamu bisa menonton video lengkapnya dari tautan di komentar pertama.',
  },
  ja: {
    subscribe: 'チャンネル登録して、より多くの人に届けるお手伝いをお願いします。',
    shorts: 'フル動画は最初のコメントのリンクから視聴できます。',
  },
  ko: {
    subscribe: '구독해 주시고 더 많은 사람들에게 닿을 수 있도록 도와주세요.',
    shorts: '전체 영상은 첫 번째 댓글의 링크에서 시청할 수 있어요.',
  },
  'zh-CN': {
    subscribe: '请订阅并帮助我们触达更多人。',
    shorts: '你可以通过第一条评论中的链接观看完整视频。',
  },
};

const EGYPTIAN_ARABIC_LANGUAGE_CODE = 'ar-eg';

const isLlmOnlyTranslateLanguage = (language: string) => {
  const normalized = String(language ?? '').trim().toLowerCase();
  return normalized === EGYPTIAN_ARABIC_LANGUAGE_CODE || normalized === 'arz';
};

const normalizeCtaLanguage = (language: string) => {
  const raw = String(language ?? '').trim();
  const normalized = raw.toLowerCase();

  if (normalized === 'zh' || normalized === 'zh-cn') {
    return 'zh-CN';
  }

  if (isLlmOnlyTranslateLanguage(normalized)) {
    return EGYPTIAN_ARABIC_LANGUAGE_CODE;
  }

  return raw;
};

const getSubscribeSentence = (language: string) =>
  CTA_SENTENCES_BY_LANGUAGE[normalizeCtaLanguage(language)]?.subscribe ?? CTA_SENTENCES_BY_LANGUAGE.en.subscribe;

const getShortsCtaSentence = (language: string) =>
  CTA_SENTENCES_BY_LANGUAGE[normalizeCtaLanguage(language)]?.shorts ?? CTA_SENTENCES_BY_LANGUAGE.en.shorts;

const normalizeSentenceForMatch = (value: string) => {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[.!?]+$/u, '')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ');
};

const allSubscribeSentences = Array.from(
  new Set(Object.values(CTA_SENTENCES_BY_LANGUAGE).map((v) => v.subscribe)),
);
const allShortsCtaSentences = Array.from(
  new Set(Object.values(CTA_SENTENCES_BY_LANGUAGE).map((v) => v.shorts)),
);

const subscribeNormSet = new Set(allSubscribeSentences.map(normalizeSentenceForMatch));
const shortsCtaNormSet = new Set(allShortsCtaSentences.map(normalizeSentenceForMatch));
const ctaNormSet = new Set(
  [...subscribeNormSet.values(), ...shortsCtaNormSet.values()].filter(Boolean),
);

const isSubscribeLikeSentence = (value: string) =>
  ctaNormSet.has(normalizeSentenceForMatch(value));

const isSubscribeCtaSentence = (value: string) =>
  subscribeNormSet.has(normalizeSentenceForMatch(value));

const isShortsCtaSentence = (value: string) =>
  shortsCtaNormSet.has(normalizeSentenceForMatch(value));

// Convert a data URL (e.g. AI-generated base64 image) into a File for upload
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, base64] = dataUrl.split(',');
  const match = /^data:(.+);base64$/.exec(meta);
  const mime = match?.[1] ?? 'image/png';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

function filenameFromContentDisposition(headerValue: string | null): string | null {
  const header = String(headerValue ?? '').trim();
  if (!header) return null;

  // RFC 5987: filename*=UTF-8''...
  const starMatch = /filename\*=(?:UTF-8''|utf-8'')([^;]+)/u.exec(header);
  if (starMatch?.[1]) {
    const raw = starMatch[1].trim().replace(/^"|"$/g, '');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  const match = /filename=([^;]+)/u.exec(header);
  if (!match?.[1]) return null;
  return match[1].trim().replace(/^"|"$/g, '');
}

function extensionFromAudioMimeType(mimeTypeRaw: string): string {
  const mimeType = String(mimeTypeRaw ?? '').trim().toLowerCase().split(';')[0] ?? '';
  switch (mimeType) {
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'mp3';
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    case 'audio/ogg':
      return 'ogg';
    case 'audio/webm':
      return 'webm';
    case 'audio/flac':
      return 'flac';
    case 'audio/aac':
      return 'aac';
    default:
      return '';
  }
}

function fileExtensionFromName(value: string): string {
  const match = /\.([^.]+)$/u.exec(String(value ?? '').trim());
  return match?.[1]?.trim().toLowerCase() ?? '';
}

async function readErrorMessageFromResponse(
  response: Response,
  fallback: string,
): Promise<string> {
  const raw = await response.text().catch(() => '');
  if (!raw.trim()) return fallback;

  try {
    const parsed = JSON.parse(raw) as { message?: unknown };
    if (typeof parsed?.message === 'string' && parsed.message.trim()) {
      return parsed.message.trim();
    }
    if (Array.isArray(parsed?.message)) {
      const first = parsed.message.find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      );
      if (first) return first.trim();
    }
  } catch {
    // ignore JSON parse errors
  }

  return raw.trim() || fallback;
}

function isLocalRenderAssetUrl(url: string | null | undefined): boolean {
  const trimmed = String(url ?? '').trim().toLowerCase();
  return trimmed.startsWith('data:') || trimmed.startsWith('blob:');
}

function getPersistedRenderUrl(url: string | null | undefined): string | null {
  const trimmed = String(url ?? '').trim();
  if (!trimmed || isLocalRenderAssetUrl(trimmed)) {
    return null;
  }

  return trimmed;
}

function hasLocalRenderAssetSource(
  file: File | null | undefined,
  url: string | null | undefined,
): boolean {
  return Boolean(file) || isLocalRenderAssetUrl(url);
}

function resolvePersistedRenderAssetUrl(params: {
  file?: File | null;
  url?: string | null | undefined;
}): string | null {
  if (params.file) {
    return null;
  }

  return getPersistedRenderUrl(params.url);
}

async function prepareLocalRenderAssetFile(params: {
  file?: File | null;
  url?: string | null | undefined;
  fallbackName: string;
}): Promise<File | null> {
  if (params.file) {
    return params.file;
  }

  const localUrl = String(params.url ?? '').trim();
  if (!localUrl || !isLocalRenderAssetUrl(localUrl)) {
    return null;
  }

  if (localUrl.startsWith('data:')) {
    return dataUrlToFile(localUrl, params.fallbackName);
  }

  return downloadUrlAsFile(localUrl, params.fallbackName);
}

function filenameFromUrl(value: string, fallback: string): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    const candidate = parsed.pathname.split('/').pop();
    return candidate && candidate.trim() ? candidate.trim() : fallback;
  } catch {
    const candidate = trimmed.split('?')[0]?.split('/').pop();
    return candidate && candidate.trim() ? candidate.trim() : fallback;
  }
}

function resolveOverlayPresetTitle(params: {
  preferredTitle?: string | null;
  file?: File | null;
  sourceUrl?: string | null;
  fallback: string;
}): string {
  const preferredTitle = String(params.preferredTitle ?? '').trim();
  if (preferredTitle) return preferredTitle;

  const fileTitle = stripFileExtension(params.file?.name ?? '');
  if (fileTitle) return fileTitle;

  const sourceTitle = stripFileExtension(filenameFromUrl(params.sourceUrl ?? '', ''));
  if (sourceTitle) return sourceTitle;

  return params.fallback;
}

async function downloadUrlAsFile(url: string, fallbackName: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download asset from ${url}`);
  }

  const blob = await response.blob();
  return new File([blob], filenameFromUrl(url, fallbackName), {
    type: blob.type || 'application/octet-stream',
  });
}

function downloadBlobAsFile(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

const LARGE_BATCH_DOWNLOAD_THRESHOLD = 10;

type WritableFileStreamLike = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
};

type FileSystemFileHandleLike = {
  createWritable: () => Promise<WritableFileStreamLike>;
};

type FileSystemDirectoryHandleLike = {
  getFileHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<FileSystemFileHandleLike>;
};

type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
  }) => Promise<FileSystemDirectoryHandleLike>;
};

function supportsDirectoryPicker(
  windowObject: Window,
): windowObject is WindowWithDirectoryPicker {
  return typeof (windowObject as WindowWithDirectoryPicker).showDirectoryPicker === 'function';
}

function isDirectoryPickerCancelError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function saveBlobToDirectory(
  directoryHandle: FileSystemDirectoryHandleLike,
  blob: Blob,
  fileName: string,
) {
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

const VOICE_ESTIMATED_WPM = 150;
const VOICE_SPLIT_THRESHOLD_SECONDS = 150;
const VOICE_TARGET_CHUNK_SECONDS = 135;
const VOICE_MAX_SENTENCE_CHARS = 560;
const VOICE_MERGE_BATCH_SIZE = 20;

type PlannedVoiceChunk = {
  index: number;
  sentences: string[];
  script: string;
  estimatedSeconds: number;
};

type VoiceProvider = 'google' | 'elevenlabs';
type VoiceGenerationMode = 'auto' | 'perSentence';
type ElevenLabsAutoGenerationStrategy = 'oneTake' | 'chunks';

type ScriptVoiceGenerationConfigDto = {
  mode: VoiceGenerationMode;
  provider: VoiceProvider | null;
  providerVoiceId: string | null;
  elevenLabsAutoGenerationStrategy?: ElevenLabsAutoGenerationStrategy | null;
  elevenLabsModel?: ElevenLabsModel | null;
  styleInstructions?: string | null;
  elevenLabsSettings?: ElevenLabsVoiceSettings | null;
};

type ScriptVoiceOverChunkDto = {
  index: number;
  text: string;
  sentences: string[];
  provider: VoiceProvider | string | null;
  providerVoiceId?: string | null;
  providerVoiceName?: string | null;
  mimeType: string | null;
  styleInstructions?: string | null;
  durationSeconds: number | null;
  estimatedSeconds: number | null;
  url: string;
  fileName?: string | null;
  createdAt?: string | null;
  elevenLabsSettings?: ElevenLabsVoiceSettings | null;
};

type VoiceOverChunkState = {
  index: number;
  text: string;
  sentences: string[];
  provider: VoiceProvider | string | null;
  providerVoiceId: string | null;
  providerVoiceName: string | null;
  mimeType: string | null;
  styleInstructions: string | null;
  durationSeconds: number | null;
  estimatedSeconds: number | null;
  url: string | null;
  persistedUrl: string | null;
  fileName: string | null;
  createdAt: string | null;
  elevenLabsSettings: ElevenLabsVoiceSettings | null;
  sourceFile: File | null;
  needsUpload: boolean;
};

type GeneratedVoiceFileResult = {
  file: File;
  durationSeconds: number | null;
  mimeType: string;
  chunks: VoiceOverChunkState[];
};

type VoiceGenerationProgress = {
  stage: 'generating' | 'merging';
  current: number;
  total: number;
};

type SentenceVoiceCandidate = {
  file: File;
  previewUrl: string;
  durationSeconds: number | null;
  mimeType: string;
  provider: VoiceProvider;
  voiceId: string;
  voiceName: string | null;
};

const mergeVoiceSentenceTexts = (items: string[]) => {
  return items
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .map((s) => (/[.!?]$/u.test(s) ? s : `${s}.`))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const countVoiceWords = (value: string) =>
  String(value ?? '')
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;

const estimateVoiceDurationSeconds = (value: string) =>
  Math.max(1, Math.round((countVoiceWords(value) * 60) / VOICE_ESTIMATED_WPM));

const splitLongVoiceSentence = (value: string, maxChars = VOICE_MAX_SENTENCE_CHARS): string[] => {
  const text = String(value ?? '').trim();
  if (!text) return [];
  if (text.length <= maxChars) return [text];

  const out: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    let cutIndex = remaining.lastIndexOf(' ', maxChars);
    if (cutIndex < Math.floor(maxChars * 0.6)) {
      const forwardCut = remaining.indexOf(' ', maxChars);
      cutIndex = forwardCut === -1 ? maxChars : forwardCut;
    }

    const segment = remaining.slice(0, cutIndex).trim();
    if (segment) out.push(segment);
    remaining = remaining.slice(cutIndex).trim();
  }

  if (remaining) out.push(remaining);
  return out;
};

const splitScriptIntoVoiceSentences = (value: string): string[] => {
  const normalized = String(value ?? '').replace(/\r\n?/gu, '\n').trim();
  if (!normalized) return [];

  const blocks = normalized
    .split(/\n+/u)
    .map((block) => block.trim())
    .filter(Boolean);

  const sentenceRegex = /[^.!?\n]+(?:[.!?]+(?:["')\]]+)?(?=\s|$)|$)/gu;
  const out: string[] = [];

  for (const block of blocks) {
    const matches = block.match(sentenceRegex) ?? [block];
    for (const match of matches) {
      const candidate = match.trim();
      if (!candidate) continue;
      out.push(...splitLongVoiceSentence(candidate));
    }
  }

  return out;
};

const normalizeVoiceSentencesForChunking = (sentences: string[], fallbackScript: string): string[] => {
  const baseSentences = sentences
    .map((sentence) => String(sentence ?? '').trim())
    .filter(Boolean);

  const rawSentences = baseSentences.length > 0
    ? baseSentences
    : splitScriptIntoVoiceSentences(fallbackScript);

  return rawSentences.flatMap((sentence) => splitLongVoiceSentence(sentence));
};

const buildPlannedVoiceChunks = (params: {
  sentenceTexts: string[];
  fallbackScript: string;
}): PlannedVoiceChunk[] => {
  const sentences = normalizeVoiceSentencesForChunking(
    params.sentenceTexts,
    params.fallbackScript,
  );

  if (sentences.length === 0) {
    return [];
  }

  const fullScript = mergeVoiceSentenceTexts(sentences);
  const estimatedFullDuration = estimateVoiceDurationSeconds(fullScript);
  if (estimatedFullDuration <= VOICE_SPLIT_THRESHOLD_SECONDS) {
    return [
      {
        index: 0,
        sentences,
        script: fullScript,
        estimatedSeconds: estimatedFullDuration,
      },
    ];
  }

  const chunks: PlannedVoiceChunk[] = [];
  let currentSentences: string[] = [];
  let currentEstimatedSeconds = 0;

  for (const sentence of sentences) {
    const sentenceEstimatedSeconds = estimateVoiceDurationSeconds(sentence);
    const wouldOverflow =
      currentSentences.length > 0 &&
      currentEstimatedSeconds + sentenceEstimatedSeconds > VOICE_TARGET_CHUNK_SECONDS;

    if (wouldOverflow) {
      chunks.push({
        index: chunks.length,
        sentences: currentSentences,
        script: mergeVoiceSentenceTexts(currentSentences),
        estimatedSeconds: currentEstimatedSeconds,
      });
      currentSentences = [];
      currentEstimatedSeconds = 0;
    }

    currentSentences.push(sentence);
    currentEstimatedSeconds += sentenceEstimatedSeconds;
  }

  if (currentSentences.length > 0) {
    chunks.push({
      index: chunks.length,
      sentences: currentSentences,
      script: mergeVoiceSentenceTexts(currentSentences),
      estimatedSeconds: currentEstimatedSeconds,
    });
  }

  return chunks;
};

const cloneVoiceOverChunks = (chunks: VoiceOverChunkState[]) =>
  Array.isArray(chunks)
    ? chunks.map((chunk) => ({
      ...chunk,
      sentences: Array.isArray(chunk.sentences) ? [...chunk.sentences] : [],
      persistedUrl: String(chunk.persistedUrl ?? '').trim() || null,
      elevenLabsSettings: normalizeOptionalElevenLabsVoiceSettings(
        chunk.elevenLabsSettings,
      ),
      needsUpload: chunk.needsUpload === true,
    }))
    : [];

const toVoiceOverChunkState = (
  chunk: ScriptVoiceOverChunkDto,
  sourceFile: File | null = null,
): VoiceOverChunkState => {
  const resolvedUrl = String(chunk.url ?? '').trim() || null;

  return {
    index: Number(chunk.index ?? 0),
    text: String(chunk.text ?? '').trim(),
    sentences: Array.isArray(chunk.sentences) ? [...chunk.sentences] : [],
    provider: normalizeVoiceProvider(chunk.provider),
    providerVoiceId: String(chunk.providerVoiceId ?? '').trim() || null,
    providerVoiceName: String(chunk.providerVoiceName ?? '').trim() || null,
    mimeType: chunk.mimeType,
    styleInstructions: String(chunk.styleInstructions ?? '').trim() || null,
    durationSeconds: chunk.durationSeconds,
    estimatedSeconds: chunk.estimatedSeconds,
    url: resolvedUrl,
    persistedUrl: resolvedUrl,
    fileName: chunk.fileName ?? null,
    createdAt: chunk.createdAt ?? null,
    elevenLabsSettings: normalizeOptionalElevenLabsVoiceSettings(
      chunk.elevenLabsSettings,
    ),
    sourceFile,
    needsUpload: false,
  };
};

const normalizeVoiceProvider = (value: string | null | undefined): VoiceProvider =>
  value === 'elevenlabs' ? 'elevenlabs' : 'google';

const normalizeVoiceGenerationMode = (
  value: string | null | undefined,
): VoiceGenerationMode => (value === 'perSentence' ? 'perSentence' : 'auto');

const normalizeElevenLabsAutoGenerationStrategy = (
  value: string | null | undefined,
): ElevenLabsAutoGenerationStrategy =>
  value === 'chunks' ? 'chunks' : 'oneTake';

const isBlobUrl = (value: string | null | undefined) =>
  String(value ?? '').trim().startsWith('blob:');

const isLocalAssetUrl = (value: string | null | undefined) => {
  const trimmed = String(value ?? '').trim();
  return trimmed.startsWith('blob:') || trimmed.startsWith('data:');
};

const resolvePersistedVoiceChunkUrl = (
  chunk: Pick<VoiceOverChunkState, 'persistedUrl' | 'url'>,
) => {
  const persistedUrl = String(chunk.persistedUrl ?? '').trim();
  if (persistedUrl) return persistedUrl;

  const currentUrl = String(chunk.url ?? '').trim();
  if (!currentUrl || isLocalAssetUrl(currentUrl)) {
    return null;
  }

  return currentUrl;
};

const hasPersistableVoiceChunks = (chunks: VoiceOverChunkState[] | null | undefined) =>
  Array.isArray(chunks) && chunks.length > 1;

const hasSentenceVoiceOver = (
  sentence: Pick<SentenceItem, 'voiceOverUrl' | 'voiceOverFile'>,
) => Boolean(sentence.voiceOverFile) || Boolean(String(sentence.voiceOverUrl ?? '').trim());

const hasVoiceOverChunkAudio = (
  chunk: Pick<VoiceOverChunkState, 'url' | 'sourceFile'>,
) => Boolean(chunk.sourceFile) || Boolean(String(chunk.url ?? '').trim());

const clearSentenceVoiceOverState = (sentence: SentenceItem): SentenceItem => ({
  ...sentence,
  voiceOverFile: null,
  voiceOverUrl: null,
  voiceOverMimeType: null,
  voiceOverDurationSeconds: null,
  voiceOverProvider: null,
  voiceOverVoiceId: null,
  voiceOverVoiceName: null,
  voiceOverStyleInstructions: null,
});

const buildLocalSentenceVoiceState = (params: {
  sentence: SentenceItem;
  file: File;
  mimeType: string;
  durationSeconds: number | null;
  provider: VoiceProvider;
  providerVoiceId?: string | null;
  providerVoiceName?: string | null;
  styleInstructions?: string | null;
}): SentenceItem => ({
  ...params.sentence,
  voiceOverFile: params.file,
  voiceOverUrl: URL.createObjectURL(params.file),
  voiceOverMimeType: params.mimeType,
  voiceOverDurationSeconds: params.durationSeconds,
  voiceOverProvider: params.provider,
  voiceOverVoiceId: String(params.providerVoiceId ?? '').trim() || null,
  voiceOverVoiceName: String(params.providerVoiceName ?? '').trim() || null,
  voiceOverStyleInstructions:
    String(params.styleInstructions ?? '').trim() || null,
});

const buildLocalVoiceOverChunkState = (params: {
  chunk: VoiceOverChunkState;
  file: File;
  mimeType: string;
  durationSeconds: number | null;
  provider: VoiceProvider;
  providerVoiceId?: string | null;
  providerVoiceName?: string | null;
  styleInstructions?: string | null;
  elevenLabsSettings?: ElevenLabsVoiceSettings | null;
}): VoiceOverChunkState => {
  const persistedUrl = resolvePersistedVoiceChunkUrl(params.chunk);

  return {
    ...params.chunk,
    provider: params.provider,
    providerVoiceId: String(params.providerVoiceId ?? '').trim() || null,
    providerVoiceName: String(params.providerVoiceName ?? '').trim() || null,
    mimeType: params.mimeType,
    styleInstructions: String(params.styleInstructions ?? '').trim() || null,
    durationSeconds: params.durationSeconds,
    url: URL.createObjectURL(params.file),
    persistedUrl,
    fileName: params.file.name,
    createdAt: new Date().toISOString(),
    elevenLabsSettings: normalizeOptionalElevenLabsVoiceSettings(
      params.elevenLabsSettings,
    ),
    sourceFile: params.file,
    needsUpload: true,
  };
};

const buildVoiceGenerationConfig = (params: {
  mode: VoiceGenerationMode;
  provider: VoiceProvider;
  providerVoiceId: string | null;
  elevenLabsAutoGenerationStrategy?: ElevenLabsAutoGenerationStrategy | null;
  elevenLabsModel?: ElevenLabsModel | null;
  styleInstructions?: string | null;
  elevenLabsSettings?: ElevenLabsVoiceSettings | null;
}): ScriptVoiceGenerationConfigDto => ({
  mode: params.mode,
  provider: params.provider,
  providerVoiceId: params.providerVoiceId,
  elevenLabsAutoGenerationStrategy:
    params.provider === 'elevenlabs'
      ? normalizeElevenLabsAutoGenerationStrategy(
        params.elevenLabsAutoGenerationStrategy,
      )
      : null,
  elevenLabsModel:
    params.provider === 'elevenlabs'
      ? normalizeOptionalElevenLabsModel(params.elevenLabsModel)
      : null,
  styleInstructions:
    params.mode === 'perSentence'
      ? null
      : String(params.styleInstructions ?? '').trim() || null,
  elevenLabsSettings:
    params.provider === 'elevenlabs'
      ? params.elevenLabsSettings ?? null
      : null,
});

const normalizeOptionalElevenLabsVoiceSettings = (
  value: Partial<ElevenLabsVoiceSettings> | null | undefined,
): ElevenLabsVoiceSettings | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return normalizeElevenLabsVoiceSettings(value);
};

async function sha256HexForFile(file: File): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const bytes = await file.arrayBuffer();
    const digest = await subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

type SavedVideoLibraryRecord = {
  id: string;
  video: string;
  video_size?: 'portrait' | 'landscape' | null;
  width?: number | null;
  height?: number | null;
};

const VIDEO_LIBRARY_MANAGED_FOLDER = 'auto-video-generator/videos-library';

const getActiveSentenceVideoMode = (
  sentence: SentenceItem,
): NonNullable<SentenceItem['videoGenerationMode']> =>
  (sentence.videoGenerationMode ?? 'referenceImage') as NonNullable<
    SentenceItem['videoGenerationMode']
  >;

const applyVideoSelectionToSentence = (
  sentence: SentenceItem,
  params: {
    videoUrl: string;
    savedVideoId: string | null;
    mode?: NonNullable<SentenceItem['videoGenerationMode']>;
    clearLocalFile?: boolean;
  },
): SentenceItem => {
  const mode = params.mode ?? getActiveSentenceVideoMode(sentence);
  const next: SentenceItem = {
    ...sentence,
    mediaMode: 'frames',
    sceneTab: 'video',
    video: params.clearLocalFile ? null : (sentence.video ?? null),
    videoUrl: params.videoUrl,
    savedVideoId: params.savedVideoId,
  };

  if (mode === 'frames') {
    next.framesVideoUrl = params.videoUrl;
    next.framesSavedVideoId = params.savedVideoId;
  } else if (mode === 'text') {
    next.textVideoUrl = params.videoUrl;
    next.textSavedVideoId = params.savedVideoId;
  } else {
    next.referenceVideoUrl = params.videoUrl;
    next.referenceSavedVideoId = params.savedVideoId;
  }

  return next;
};

const inferVideoOrientationFromDimensions = (
  width: number | null,
  height: number | null,
): 'portrait' | 'landscape' | null => {
  if (!width || !height) return null;
  return width >= height ? 'landscape' : 'portrait';
};

const getVideoMetadataFromSource = async (params: {
  file?: File | null;
  url?: string | null;
}): Promise<{ width: number | null; height: number | null }> => {
  const file = params.file ?? null;
  const sourceUrl = String(params.url ?? '').trim();

  if (!file && !sourceUrl) {
    return { width: null, height: null };
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = file ? URL.createObjectURL(file) : null;
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.removeAttribute('src');
      try {
        video.load();
      } catch {
        // Ignore cleanup errors.
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    const finalize = (next: { width: number | null; height: number | null }) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(next);
    };

    const timeoutId = window.setTimeout(() => {
      finalize({ width: null, height: null });
    }, 10000);

    video.addEventListener(
      'loadedmetadata',
      () => {
        finalize({
          width: Number.isFinite(video.videoWidth) && video.videoWidth > 0
            ? video.videoWidth
            : null,
          height: Number.isFinite(video.videoHeight) && video.videoHeight > 0
            ? video.videoHeight
            : null,
        });
      },
      { once: true },
    );
    video.addEventListener(
      'error',
      () => {
        finalize({ width: null, height: null });
      },
      { once: true },
    );

    video.src = objectUrl ?? sourceUrl;
    video.load();
  });
};


// SentenceItem type is shared in ./_types/sentences

export type VoiceOverOption = {
  id: number;
  voice_id: string;
  name: string;
  use_case?: string | null;
  preview_url?: string | null;
  isFavorite?: boolean;
};

type ReferenceScriptPayload = {
  id: string;
  title: string | null;
  script: string;
};

type ScriptIdeaOption = {
  id: string;
  title: string;
};

type ScriptIdeaRequestPayload = {
  title: string;
};

type GenerateLibrariesBootstrapState = {
  userId: string | null;
  status: 'idle' | 'loading' | 'loaded';
};

type TransitionSoundDraftItem = NonNullable<SentenceItem['transitionSoundEffects']>;
type SentenceImageSlot = 'primary' | 'secondary';

export function GeneratePageInner() {
  const IMAGE_STYLE_PRESETS = [
    {
      key: 'anime',
      label: 'Anime',
      style: 'Modern Anime style, detailed, vibrant, high quality',
    },
    {
      key: 'realism',
      label: 'Realism',
      style: 'Photorealistic, ultra-detailed, natural lighting, high quality',
    },
    {
      key: 'cinematic',
      label: 'Cinematic',
      style: 'Cinematic film still, dramatic lighting, shallow depth of field, ultra-detailed',
    },
    {
      key: '3d',
      label: '3D Render',
      style: '3D render, high detail, global illumination, physically based rendering, high quality',
    },
    {
      key: 'watercolor',
      label: 'Watercolor',
      style: 'Watercolor illustration, soft washes, textured paper, high quality',
    },
  ] as const;

  const { user, isLoading, handleLogout } = useAuthGuard();
  const authenticatedUserId = String(user?.id ?? '').trim();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingScriptHandoffId =
    String(searchParams.get('scriptId') ?? '').trim() || null;
  const [isLoadingScriptHandoff, setIsLoadingScriptHandoff] = useState(
    () => Boolean(pendingScriptHandoffId),
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // When a draft is saved/loaded, we keep its script id so we can attach
  // sentence-level media (start/end frames, per-sentence video) without
  // destructive script-wide updates.
  const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
  const videoSectionRef = useRef<HTMLDivElement | null>(null);
  const { alertState, showAlert, closeAlert } = useAlertModal();
  const { showToast, ToastContainer } = useToast();

  // Form state
  const [script, setScript] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [scriptSubject, setScriptSubject] = useState('religious (Islam)');
  const [scriptSubjectContent, setScriptSubjectContent] = useState('');
  const [scriptLength, setScriptLength] = useState('1 minute');
  const [scriptStyle, setScriptStyle] = useState('Conversational');
  const [scriptTechnique, setScriptTechnique] = useState('The Dance (Context, Conflict)');
  const [scriptLanguage, setScriptLanguage] = useState('en');
  const [useWebSearchForTrending, setUseWebSearchForTrending] = useState(false);
  // Default to Anthropic (Claude) as requested.
  const [scriptModel, setScriptModel] = useState('gpt-5.2');
  const [scriptIdeas, setScriptIdeas] = useState<ScriptIdeaOption[]>([]);
  const [selectedScriptIdeaTitle, setSelectedScriptIdeaTitle] =
    useState<string | null>(null);
  const [isScriptIdeasLoading, setIsScriptIdeasLoading] = useState(false);
  const [scriptIdeasError, setScriptIdeasError] = useState<string | null>(null);

  const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);
  const [translateTargetLanguage, setTranslateTargetLanguage] = useState('ar');
  const [translateMethod, setTranslateMethod] = useState<TranslateMethod>('google');
  const [isTranslatingScript, setIsTranslatingScript] = useState(false);
  const [translateLoadingAction, setTranslateLoadingAction] =
    useState<TranslateLoadingAction | null>(null);

  // Canonical characters extracted during split.
  const [scriptCharacters, setScriptCharacters] = useState<ScriptCharacter[]>([]);

  // Canonical locations extracted during split or edited by the user.
  const [scriptLocations, setScriptLocations] = useState<ScriptLocation[]>([]);

  // Sentence image generation configuration
  const [imagePromptModel, setImagePromptModel] = useState('gpt-4.1-mini');
  const [imageModel, setImageModel] = useState('leonardo');
  const [imageStyle, setImageStyle] = useState<string>('anime');
  const [imageAspectRatio, setImageAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('9:16');
  const [hasTouchedImageAspectRatio, setHasTouchedImageAspectRatio] = useState(false);
  const imagePromptModelRef = useRef(imagePromptModel);
  const imageModelRef = useRef(imageModel);
  const imageStyleRef = useRef(imageStyle);
  const imageAspectRatioRef = useRef<'16:9' | '9:16' | '1:1'>(imageAspectRatio);
  const handleImagePromptModelChange = useCallback((next: string) => {
    imagePromptModelRef.current = next;
    setImagePromptModel(next);
  }, []);
  const handleImageModelChange = useCallback((next: string) => {
    imageModelRef.current = next;
    setImageModel(next);
  }, []);
  const handleImageStyleChange = useCallback((next: string) => {
    imageStyleRef.current = next;
    setImageStyle(next);
  }, []);
  const setImageAspectRatioWithRef = useCallback((next: '16:9' | '9:16' | '1:1') => {
    imageAspectRatioRef.current = next;
    setImageAspectRatio(next);
  }, []);
  const handleImageAspectRatioChange = useCallback(
    (next: '16:9' | '9:16' | '1:1') => {
      setHasTouchedImageAspectRatio(true);
      setImageAspectRatioWithRef(next);
    },
    [setImageAspectRatioWithRef],
  );
  const [videoModel, setVideoModel] = useState<'gemini' | 'grok'>('gemini');
  const [images, setImages] = useState<File[]>([]);
  const [voiceOver, setVoiceOver] = useState<File | null>(null);
  const [voiceOverChunks, setVoiceOverChunks] = useState<VoiceOverChunkState[]>([]);
  const [voiceDuration, setVoiceDuration] = useState<number | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceGenerationProgress, setVoiceGenerationProgress] =
    useState<VoiceGenerationProgress | null>(null);
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [savedVoiceId, setSavedVoiceId] = useState<string | null>(null);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('google');
  const [voiceGenerationMode, setVoiceGenerationMode] =
    useState<VoiceGenerationMode>('auto');
  const [elevenLabsAutoGenerationStrategy, setElevenLabsAutoGenerationStrategy] =
    useState<ElevenLabsAutoGenerationStrategy>('oneTake');
  const [aiStudioStyleInstructions, setAiStudioStyleInstructions] = useState('');
  const [elevenLabsGlobalModel, setElevenLabsGlobalModel] =
    useState<ElevenLabsModel>(DEFAULT_ELEVENLABS_MODEL);
  const [elevenLabsGlobalSettings, setElevenLabsGlobalSettings] =
    useState<ElevenLabsVoiceSettings | null>(null);
  const [isVoiceLibraryOpen, setIsVoiceLibraryOpen] = useState(false);
  const [voiceLibraryUrl, setVoiceLibraryUrl] = useState<string | null>(null);
  const [voiceOverPreviewUrl, setVoiceOverPreviewUrl] = useState<string | null>(null);
  const [isSilentRenderConfirmOpen, setIsSilentRenderConfirmOpen] =
    useState(false);
  const [isVoiceOverEditorOpen, setIsVoiceOverEditorOpen] = useState(false);
  const [activeSentenceVoiceEditorSentenceId, setActiveSentenceVoiceEditorSentenceId] =
    useState<string | null>(null);
  const [activeChunkVoiceEditorId, setActiveChunkVoiceEditorId] =
    useState<string | null>(null);
  const [isElevenLabsSettingsModalOpen, setIsElevenLabsSettingsModalOpen] =
    useState(false);
  const [isApplyingVoiceOverEdit, setIsApplyingVoiceOverEdit] = useState(false);
  const [isSavingVoiceOverEdit, setIsSavingVoiceOverEdit] = useState(false);
  const [isApplyingSentenceVoiceEdit, setIsApplyingSentenceVoiceEdit] =
    useState(false);
  const [sentenceVoiceEditActionError, setSentenceVoiceEditActionError] =
    useState<string | null>(null);
  const [isApplyingChunkVoiceEdit, setIsApplyingChunkVoiceEdit] = useState(false);
  const [chunkVoiceEditActionError, setChunkVoiceEditActionError] =
    useState<string | null>(null);
  const [isSentenceVoiceManagerOpen, setIsSentenceVoiceManagerOpen] =
    useState(false);
  const [isChunkVoiceManagerOpen, setIsChunkVoiceManagerOpen] =
    useState(false);
  const [isGeneratingSentenceVoiceStyleById, setIsGeneratingSentenceVoiceStyleById] =
    useState<Record<string, boolean>>({});
  const [isRegeneratingSentenceVoiceById, setIsRegeneratingSentenceVoiceById] =
    useState<Record<string, boolean>>({});
  const [isApplyingSentenceVoiceCandidateById, setIsApplyingSentenceVoiceCandidateById] =
    useState<Record<string, boolean>>({});
  const [sentenceVoiceCandidateById, setSentenceVoiceCandidateById] =
    useState<Record<string, SentenceVoiceCandidate | null>>({});
  const [isGeneratingChunkVoiceStyleById, setIsGeneratingChunkVoiceStyleById] =
    useState<Record<string, boolean>>({});
  const [isRegeneratingChunkVoiceById, setIsRegeneratingChunkVoiceById] =
    useState<Record<string, boolean>>({});
  const [isApplyingChunkVoiceCandidateById, setIsApplyingChunkVoiceCandidateById] =
    useState<Record<string, boolean>>({});
  const [chunkVoiceCandidateById, setChunkVoiceCandidateById] =
    useState<Record<string, SentenceVoiceCandidate | null>>({});

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioUrlRef = useRef<string | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const previousSentenceVoiceSignatureRef = useRef<string | null>(null);
  const sentenceVoiceCandidateByIdRef =
    useRef<Record<string, SentenceVoiceCandidate | null>>({});
  const chunkVoiceCandidateByIdRef =
    useRef<Record<string, SentenceVoiceCandidate | null>>({});
  const previousSentenceVoiceUrlsRef = useRef<Record<string, string | null>>({});
  const previousVoiceOverChunkUrlsRef = useRef<Record<string, string | null>>({});
  const backgroundSoundtrackAssetCacheRef =
    useRef<Map<string, MaterializedBackgroundSoundtrackAsset>>(new Map());
  const backgroundSoundtrackAssetInFlightRef =
    useRef<Map<string, Promise<MaterializedBackgroundSoundtrackAsset | null>>>(new Map());
  const renderSoundEffectAssetCacheRef =
    useRef<Map<string, MaterializedRenderSoundEffectAsset>>(new Map());
  const renderSoundEffectAssetInFlightRef =
    useRef<Map<string, Promise<MaterializedRenderSoundEffectAsset>>>(new Map());
  const generateLibrariesBootstrapRef = useRef<GenerateLibrariesBootstrapState>({
    userId: null,
    status: 'idle',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [backgroundSoundtracks, setBackgroundSoundtracks] = useState<BackgroundSoundtrackItem[]>([]);
  const [isLoadingBackgroundSoundtracks, setIsLoadingBackgroundSoundtracks] = useState(false);
  const [backgroundSoundtracksError, setBackgroundSoundtracksError] = useState<string | null>(null);
  const [selectedBackgroundSoundtrackValue, setSelectedBackgroundSoundtrackValue] = useState<string>(
    '__default__',
  );
  const [backgroundSoundtrackVolumePercent, setBackgroundSoundtrackVolumePercent] = useState<number>(100);
  const [imageFilterPresets, setImageFilterPresets] = useState<ImageFilterPresetDto[]>([]);
  const [motionEffectPresets, setMotionEffectPresets] = useState<MotionEffectPresetDto[]>([]);
  const [textAnimationPresets, setTextAnimationPresets] = useState<TextAnimationPresetDto[]>([]);
  const [overlayPresets, setOverlayPresets] = useState<OverlayPresetDto[]>([]);
  const [isLoadingImageFilterPresets, setIsLoadingImageFilterPresets] = useState(false);
  const [isLoadingMotionEffectPresets, setIsLoadingMotionEffectPresets] = useState(false);
  const [isLoadingTextAnimationPresets, setIsLoadingTextAnimationPresets] = useState(false);
  const [isLoadingOverlayPresets, setIsLoadingOverlayPresets] = useState(false);
  const [oneOffBackgroundSoundtrackUrl, setOneOffBackgroundSoundtrackUrl] = useState<string | null>(null);
  const [isUploadingBackgroundSoundtrack, setIsUploadingBackgroundSoundtrack] = useState(false);
  const [isSettingFavoriteBackgroundSoundtrack, setIsSettingFavoriteBackgroundSoundtrack] = useState(false);
  const [isSavingBackgroundSoundtrackVolume, setIsSavingBackgroundSoundtrackVolume] = useState(false);
  const [isDeletingBackgroundSoundtrack, setIsDeletingBackgroundSoundtrack] = useState(false);
  const [backgroundSoundtrackEditTargetId, setBackgroundSoundtrackEditTargetId] = useState<string | null>(null);
  const [isApplyingBackgroundSoundtrackEdit, setIsApplyingBackgroundSoundtrackEdit] = useState(false);
  const [isSavingBackgroundSoundtrackEdit, setIsSavingBackgroundSoundtrackEdit] = useState(false);
  const [isSavingBackgroundSoundtrackPreset, setIsSavingBackgroundSoundtrackPreset] = useState(false);
  const [activeMaterializedBackgroundSoundtrack, setActiveMaterializedBackgroundSoundtrack] =
    useState<MaterializedBackgroundSoundtrackAsset | null>(null);
  const [isMaterializingBackgroundSoundtrack, setIsMaterializingBackgroundSoundtrack] =
    useState(false);
  const [isHydratingVoiceOver, setIsHydratingVoiceOver] = useState(false);
  const [isRandomScriptLoading, setIsRandomScriptLoading] = useState(false);
  const [randomScriptError, setRandomScriptError] = useState<string | null>(
    null,
  );
  const [isEnhancingScript, setIsEnhancingScript] = useState(false);
  const [isApplyingBulkFeelingCues, setIsApplyingBulkFeelingCues] =
    useState(false);
  // Track the original config used to produce the current script
  const [originalScriptSubject, setOriginalScriptSubject] = useState<string | undefined>(undefined);
  const [originalScriptSubjectContent, setOriginalScriptSubjectContent] = useState<string | undefined>(undefined);
  const {
    sentences,
    setSentences,
    updateSentenceById,
    handleSentencePatch,
    handleSentenceForcedCharacterKeysChange,
    handleSentenceForcedLocationKeyChange,
    handleSentenceVisualEffectChange,
    handleSentenceImageMotionEffectChange,
    handleSentenceImageMotionSpeedChange,
    handleTransitionToNextChange,
    handleSentenceTextChange,
    handleSentenceTextChangeById,
    handleMergeSentenceIntoPrevious,
    handleMergeSentenceIntoNext,
    handleDeleteSentence,
    handleInsertEmptySentenceAfter,
    handleAddSuspenseScene,
  } = useSentencesEditor();
  const [sceneEditorMode, setSceneEditorMode] = useState<'scene' | 'timeline'>('scene');
  const patchSentenceById = useCallback(
    (sentenceId: string, patch: Partial<SentenceItem>) => {
      updateSentenceById(sentenceId, (sentence) => ({
        ...sentence,
        ...patch,
      }));
    },
    [updateSentenceById],
  );
  const [isSplitting, setIsSplitting] = useState(false);
  const [isSplittingIntoShorts, setIsSplittingIntoShorts] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [voicesByProvider, setVoicesByProvider] = useState<Record<VoiceProvider, VoiceOverOption[]>>({
    google: [],
    elevenlabs: [],
  });
  const [isLoadingVoicesByProvider, setIsLoadingVoicesByProvider] = useState<Record<VoiceProvider, boolean>>({
    google: false,
    elevenlabs: false,
  });
  const [voicesErrorByProvider, setVoicesErrorByProvider] = useState<Record<VoiceProvider, string | null>>({
    google: null,
    elevenlabs: null,
  });
  const [selectedVoiceIdByProvider, setSelectedVoiceIdByProvider] = useState<Record<VoiceProvider, string | null>>({
    google: null,
    elevenlabs: null,
  });
  const [isSettingFavoriteVoice, setIsSettingFavoriteVoice] = useState(false);
  const [isSyncingVoices, setIsSyncingVoices] = useState(false);
  const [syncVoicesResult, setSyncVoicesResult] = useState<string | null>(null);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [isGeneratingAllSentenceVoices, setIsGeneratingAllSentenceVoices] =
    useState(false);
  const [isApplyingBulkAiEffect, setIsApplyingBulkAiEffect] = useState<BulkAiEffectKind | null>(null);
  const [generateAllImagesConfirm, setGenerateAllImagesConfirm] = useState<
    | null
    | {
      kind: 'some' | 'all';
      eligibleIndices: number[];
      missingIndices: number[];
      existingCount: number;
      missingCount: number;
    }
  >(null);
  const [generateAllSentenceVoicesConfirm, setGenerateAllSentenceVoicesConfirm] = useState<
    | null
    | {
      kind: 'some' | 'all';
      eligibleSentenceIds: string[];
      missingSentenceIds: string[];
      existingCount: number;
      missingCount: number;
    }
  >(null);
  const [bulkAiEffectsConfirm, setBulkAiEffectsConfirm] = useState<
    | null
    | {
      kind: BulkAiEffectKind;
      eligibleIndices: number[];
      uneditedIndices: number[];
      existingCount: number;
      uneditedCount: number;
    }
  >(null);
  const [isApplyingManualBulkEffect, setIsApplyingManualBulkEffect] = useState<BulkAiEffectKind | null>(null);
  const [bulkManualEffectModal, setBulkManualEffectModal] = useState<
    BulkManualEffectModalState | null
  >(null);
  const [bulkManualEffectScenePicker, setBulkManualEffectScenePicker] = useState<
    BulkManualEffectScenePickerState | null
  >(null);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<
    | {
      sentenceId: string;
      which: 'single' | 'secondary' | 'start' | 'end' | 'reference';
    }
    | null
  >(null);
  const [isVideoLibraryOpen, setIsVideoLibraryOpen] = useState(false);
  const [videoLibraryTargetId, setVideoLibraryTargetId] = useState<string | null>(null);
  const [isSavingSentenceVideoLibraryById, setIsSavingSentenceVideoLibraryById] = useState<
    Record<string, boolean>
  >({});
  const [isSoundEffectsLibraryOpen, setIsSoundEffectsLibraryOpen] = useState(false);
  const [soundEffectsLibraryTargetId, setSoundEffectsLibraryTargetId] = useState<string | null>(null);
  const [transitionSoundEditorTargetId, setTransitionSoundEditorTargetId] = useState<string | null>(null);
  const [transitionSoundDraftItems, setTransitionSoundDraftItems] = useState<TransitionSoundDraftItem>([]);
  const [isSavingTransitionSoundBySentenceId, setIsSavingTransitionSoundBySentenceId] = useState<Record<string, boolean>>({});
  const [isUploadingSentenceSfxBySentenceId, setIsUploadingSentenceSfxBySentenceId] = useState<Record<string, boolean>>({});
  const [isSavingSentenceSfxMixBySentenceId, setIsSavingSentenceSfxMixBySentenceId] = useState<Record<string, boolean>>({});
  const [isGeneratingVideoBySentenceId, setIsGeneratingVideoBySentenceId] = useState<Record<string, boolean>>({});
  const [isGeneratingVideoPromptBySentenceId, setIsGeneratingVideoPromptBySentenceId] = useState<Record<string, boolean>>({});
  const [isScriptLibraryOpen, setIsScriptLibraryOpen] = useState(false);
  const [isScriptReferencesOpen, setIsScriptReferencesOpen] = useState(false);
  const [isSavedSequenceSaveModalOpen, setIsSavedSequenceSaveModalOpen] = useState(false);
  const [savedSequenceSaveModalVersion, setSavedSequenceSaveModalVersion] = useState(0);
  const [isSavedSequenceLibraryOpen, setIsSavedSequenceLibraryOpen] = useState(false);
  const [isSavingSavedSequence, setIsSavingSavedSequence] = useState(false);
  const [isApplyingSavedSequence, setIsApplyingSavedSequence] = useState(false);
  const [referenceScripts, setReferenceScripts] = useState<ReferenceScriptPayload[]>([]);
  // Render performance and transition options
  const [isShort, setIsShort] = useState(true);
  const [addBackgroundSoundtrack, setAddBackgroundSoundtrack] = useState(true);
  const [useLowerFps, setUseLowerFps] = useState(false);
  const [useLowerResolution, setUseLowerResolution] = useState(false);
  const [addSubtitles, setAddSubtitles] = useState(true);
  const [enableGlitchTransitions, setEnableGlitchTransitions] = useState(true);
  const [enableZoomRotateTransitions, setEnableZoomRotateTransitions] = useState(true);
  const [enableLongFormSubscribeOverlay, setEnableLongFormSubscribeOverlay] = useState(true);

  // Long-form only: split into multiple short scripts (tabs)
  type TabKey = 'full' | `short-${number}`;
  type TabSnapshot = {
    scriptId: string | null;
    sentences: SentenceItem[];
    voiceOver: File | null;
    voiceOverChunks: VoiceOverChunkState[];
    voiceDuration: number | null;
    savedVoiceId: string | null;
    voiceLibraryUrl: string | null;
    videoJobId: string | null;
    videoJobStatus: string | null;
    videoJobError: string | null;
    videoUrl: string | null;
  };

  type AiSplitCache = {
    ranges: Array<{ start: number; end: number }>;
    shortSnapshotsByKey: Record<string, TabSnapshot>;
  };

  // ID of the full (parent) script draft; the active tab may be a short script.
  const [fullScriptId, setFullScriptId] = useState<string | null>(null);
  const [activeShortTabIndex, setActiveShortTabIndex] = useState<number | null>(null);
  const [shortRanges, setShortRanges] = useState<Array<{ start: number; end: number }>>([]);
  const [shortScriptIds, setShortScriptIds] = useState<string[]>([]);
  const [manualSplitEnabled, setManualSplitEnabled] = useState(false);
  const [shortsValidationError, setShortsValidationError] = useState<string | null>(null);
  const tabSnapshotsRef = useRef<Record<string, TabSnapshot>>({});
  const aiSplitCacheRef = useRef<AiSplitCache | null>(null);
  const handledScriptHandoffRef = useRef<string | null>(null);
  const activeScriptHandoffRequestRef = useRef<string | null>(null);
  const handleSelectScriptFromLibraryRef =
    useRef<((draft: ScriptDraftDto) => Promise<void>) | null>(null);

  // Scripts longer than 3 minutes are treated as regular (non-shorts) videos.
  const isLongForm = script.length > 2500
  const isShortsTabActive = isLongForm && activeShortTabIndex !== null;
  const effectiveIsShort = isShortsTabActive ? true : isLongForm ? false : isShort;
  const effectiveAspectRatio = effectiveIsShort ? '9:16' : '16:9';
  const effectiveEnableLongFormSubscribeOverlay =
    isLongForm && enableLongFormSubscribeOverlay;
  const previousIsLongFormRef = useRef(isLongForm);

  const getCurrentImageGenerationConfig = () => {
    const currentImageStyle = imageStyleRef.current;

    return {
      style:
        IMAGE_STYLE_PRESETS.find((preset) => preset.key === currentImageStyle)?.style ??
        IMAGE_STYLE_PRESETS[0].style,
      aspectRatio: imageAspectRatioRef.current,
      promptModel: imagePromptModelRef.current,
      imageModel: imageModelRef.current,
    };
  };

  const clearPendingScriptHandoff = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('scriptId')) return;

    params.delete('scriptId');
    const nextQuery = params.toString();
    router.replace(nextQuery ? `/generate?${nextQuery}` : '/generate');
  }, [router, searchParams]);

  useEffect(() => {
    if (!pendingScriptHandoffId) {
      return;
    }

    setIsLoadingScriptHandoff(true);
  }, [pendingScriptHandoffId]);

  useEffect(() => {
    if (hasTouchedImageAspectRatio) return;
    setImageAspectRatioWithRef(effectiveIsShort ? '9:16' : '16:9');
  }, [effectiveIsShort, hasTouchedImageAspectRatio, setImageAspectRatioWithRef]);

  useEffect(() => {
    if (voiceOver) {
      const objectUrl = URL.createObjectURL(voiceOver);
      setVoiceOverPreviewUrl(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }

    const nextUrl = String(voiceLibraryUrl ?? '').trim();
    setVoiceOverPreviewUrl(nextUrl || null);
  }, [voiceLibraryUrl, voiceOver]);

  useEffect(() => {
    sentenceVoiceCandidateByIdRef.current = sentenceVoiceCandidateById;
  }, [sentenceVoiceCandidateById]);

  useEffect(() => {
    chunkVoiceCandidateByIdRef.current = chunkVoiceCandidateById;
  }, [chunkVoiceCandidateById]);

  useEffect(() => {
    const nextUrls = Object.fromEntries(
      sentences.map((sentence) => [
        sentence.id,
        String(sentence.voiceOverUrl ?? '').trim() || null,
      ]),
    ) as Record<string, string | null>;

    for (const [sentenceId, previousUrl] of Object.entries(
      previousSentenceVoiceUrlsRef.current,
    )) {
      const nextUrl = nextUrls[sentenceId] ?? null;
      if (previousUrl && previousUrl !== nextUrl && isBlobUrl(previousUrl)) {
        URL.revokeObjectURL(previousUrl);
      }
    }

    previousSentenceVoiceUrlsRef.current = nextUrls;
  }, [sentences]);

  useEffect(() => {
    const nextUrls = Object.fromEntries(
      voiceOverChunks.map((chunk) => [
        String(chunk.index),
        String(chunk.url ?? '').trim() || null,
      ]),
    ) as Record<string, string | null>;

    for (const [chunkId, previousUrl] of Object.entries(
      previousVoiceOverChunkUrlsRef.current,
    )) {
      const nextUrl = nextUrls[chunkId] ?? null;
      if (previousUrl && previousUrl !== nextUrl && isBlobUrl(previousUrl)) {
        URL.revokeObjectURL(previousUrl);
      }
    }

    previousVoiceOverChunkUrlsRef.current = nextUrls;
  }, [voiceOverChunks]);

  useEffect(() => {
    return () => {
      Object.values(sentenceVoiceCandidateByIdRef.current).forEach((candidate) => {
        disposeSentenceVoiceCandidate(candidate);
      });
      Object.values(chunkVoiceCandidateByIdRef.current).forEach((candidate) => {
        disposeSentenceVoiceCandidate(candidate);
      });
      Object.values(previousSentenceVoiceUrlsRef.current).forEach((url) => {
        if (url && isBlobUrl(url)) {
          URL.revokeObjectURL(url);
        }
      });
      Object.values(previousVoiceOverChunkUrlsRef.current).forEach((url) => {
        if (url && isBlobUrl(url)) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  useEffect(() => {
    const signature = JSON.stringify(
      sentences.map((sentence) => ({
        id: sentence.id,
        text: String(sentence.text ?? '').trim(),
      })),
    );

    if (previousSentenceVoiceSignatureRef.current === null) {
      previousSentenceVoiceSignatureRef.current = signature;
      return;
    }

    if (previousSentenceVoiceSignatureRef.current === signature) {
      return;
    }

    previousSentenceVoiceSignatureRef.current = signature;

    if (
      voiceGenerationMode === 'perSentence' &&
      (voiceOver || voiceLibraryUrl || savedVoiceId || voiceOverChunks.length > 0)
    ) {
      setVoiceOver(null);
      setVoiceOverChunks([]);
      setVoiceDuration(null);
      setSavedVoiceId(null);
      setVoiceLibraryUrl(null);
      Object.keys(chunkVoiceCandidateById).forEach((chunkId) => {
        handleCancelChunkVoiceCandidate(chunkId);
      });
      setIsChunkVoiceManagerOpen(false);
    }
  }, [
    chunkVoiceCandidateById,
    savedVoiceId,
    sentences,
    voiceGenerationMode,
    voiceLibraryUrl,
    voiceOver,
    voiceOverChunks.length,
  ]);

  useEffect(() => {
    if (!isLongForm) {
      setActiveChunkVoiceEditorId(null);
      setChunkVoiceEditActionError(null);
      setIsChunkVoiceManagerOpen(false);
      return;
    }

    if (!isShort) return;
    setIsShort(false);
  }, [isLongForm, isShort]);

  useEffect(() => {
    if (previousIsLongFormRef.current === isLongForm) return;
    previousIsLongFormRef.current = isLongForm;
    setEnableLongFormSubscribeOverlay(isLongForm);
  }, [isLongForm]);

  const {
    videoJobId,
    videoJobStatus,
    videoJobError,
    videoUrl,
    resetJob,
    setJobFromResponse,
    setVideoJobError,
    setVideoUrl,
  } = useVideoJob(API_URL);
  const {
    videoJobStatus: testVideoJobStatus,
    videoJobError: testVideoJobError,
    videoUrl: testVideoUrl,
    resetJob: resetTestVideoJob,
    setJobFromResponse: setTestVideoJobFromResponse,
    setVideoJobError: setTestVideoJobError,
  } = useVideoJob(API_URL);

  const tabKeyForIndex = (index: number | null): TabKey =>
    index === null ? 'full' : (`short-${index}` as const);

  const captureActiveTabSnapshot = (): TabSnapshot => {
    return {
      scriptId: activeScriptId,
      sentences,
      voiceOver,
      voiceOverChunks: cloneVoiceOverChunks(voiceOverChunks),
      voiceDuration,
      savedVoiceId,
      voiceLibraryUrl,
      videoJobId,
      videoJobStatus,
      videoJobError,
      videoUrl,
    };
  };

  const cloneSnapshot = (snapshot: TabSnapshot): TabSnapshot => {
    return {
      ...snapshot,
      sentences: Array.isArray(snapshot.sentences)
        ? snapshot.sentences.map((s) => ({ ...s }))
        : [],
      voiceOverChunks: cloneVoiceOverChunks(snapshot.voiceOverChunks),
    };
  };

  const applyTabSnapshot = (snapshot: TabSnapshot) => {
    setActiveScriptId(snapshot.scriptId);
    setSentences(snapshot.sentences);
    setVoiceOver(snapshot.voiceOver);
    setVoiceOverChunks(cloneVoiceOverChunks(snapshot.voiceOverChunks));
    setVoiceDuration(snapshot.voiceDuration);
    setSavedVoiceId(snapshot.savedVoiceId);
    setVoiceLibraryUrl(snapshot.voiceLibraryUrl);

    resetJob();
    setVideoJobError(snapshot.videoJobError);
    if (snapshot.videoUrl) {
      setVideoUrl(snapshot.videoUrl);
      if (snapshot.scriptId) {
        setJobFromResponse(snapshot.scriptId, 'completed');
      }
      return;
    }

    if (snapshot.videoJobId) {
      setJobFromResponse(snapshot.videoJobId, snapshot.videoJobStatus ?? 'processing');
    }
  };

  const estimateSecondsForText = (text: string) => {
    const words = String(text ?? '')
      .trim()
      .split(/\s+/u)
      .filter(Boolean).length;
    // 150 words per minute => 2.5 words per second
    return words / 2.5;
  };

  const buildEstimatedSceneDurationSeconds = (
    items: SentenceItem[],
    totalDurationSeconds: number | null,
  ) => {
    if (!Array.isArray(items) || items.length === 0) return [] as Array<number | null>;
    if (!totalDurationSeconds || !Number.isFinite(totalDurationSeconds) || totalDurationSeconds <= 0) {
      return items.map(() => null);
    }

    const weights = items.map((sentence) => Math.max(estimateSecondsForText(sentence.text), 0));
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);

    if (totalWeight <= 0) {
      const evenDuration = totalDurationSeconds / items.length;
      return items.map(() => evenDuration);
    }

    return weights.map((weight) => (totalDurationSeconds * weight) / totalWeight);
  };

  const buildManualShortRanges = (storySentences: SentenceItem[]) => {
    const minSecondsPerShort = 30;
    const totalSentences = storySentences.length;
    if (totalSentences <= 0) return [] as Array<{ start: number; end: number }>;
    if (totalSentences === 1) return [{ start: 0, end: 0 }];

    const perSentenceSeconds = storySentences.map((s) => estimateSecondsForText(s.text));
    const totalSeconds = perSentenceSeconds.reduce((sum, v) => sum + v, 0);
    if (totalSeconds <= minSecondsPerShort) {
      return [{ start: 0, end: totalSentences - 1 }];
    }

    const ranges: Array<{ start: number; end: number }> = [];
    let start = 0;
    let cursorSeconds = 0;

    const remainingSecondsFrom = (idx: number) =>
      perSentenceSeconds.slice(idx).reduce((sum, v) => sum + v, 0);

    for (let i = 0; i < totalSentences; i += 1) {
      cursorSeconds += perSentenceSeconds[i];

      const remainingSeconds = remainingSecondsFrom(i + 1);
      const canCutHere = cursorSeconds >= minSecondsPerShort;
      const remainderWouldBeValid =
        remainingSeconds === 0 || remainingSeconds >= minSecondsPerShort;

      if (canCutHere && remainderWouldBeValid) {
        ranges.push({ start, end: i });
        start = i + 1;
        cursorSeconds = 0;
      }
    }

    if (start <= totalSentences - 1) {
      if (ranges.length === 0) {
        ranges.push({ start: 0, end: totalSentences - 1 });
      } else {
        ranges[ranges.length - 1].end = totalSentences - 1;
      }
    }

    return ranges;
  };

  const normalizeShortTabSentences = (items: SentenceItem[]): SentenceItem[] => {
    return Array.isArray(items) ? items : [];
  };

  const validateShortRanges = (
    ranges: Array<{ start: number; end: number }>,
    storySentences: SentenceItem[],
  ): string | null => {
    if (!ranges.length) return 'Please create at least one short.';

    // Coverage + contiguity
    let expectedStart = 0;
    for (const r of ranges) {
      if (r.start !== expectedStart) return 'Short ranges must be contiguous and cover all sentences.';
      if (r.end < r.start) return 'Invalid short range detected.';
      expectedStart = r.end + 1;

      const seconds = storySentences
        .slice(r.start, r.end + 1)
        .reduce((acc, s) => acc + estimateSecondsForText(s.text), 0);
      if (seconds < 30) {
        return 'Each short must be at least 30 seconds.';
      }
    }
    if (expectedStart !== storySentences.length) {
      return 'Short ranges must cover all sentences.';
    }
    return null;
  };

  const rebuildShortTabSnapshots = (ranges: Array<{ start: number; end: number }>): string | null => {
    const fullSnapshot = tabSnapshotsRef.current.full;
    const fullSentences = fullSnapshot?.sentences ?? (activeShortTabIndex === null ? sentences : []);
    const storySentences = fullSentences.filter((s) => !isSubscribeLikeSentence(s.text));

    const error = validateShortRanges(ranges, storySentences);
    setShortsValidationError(error);
    if (error) return error;

    // Drop existing short tab snapshots and rebuild.
    setShortScriptIds([]);
    Object.keys(tabSnapshotsRef.current)
      .filter((k) => k.startsWith('short-'))
      .forEach((k) => {
        delete tabSnapshotsRef.current[k];
      });

    for (let i = 0; i < ranges.length; i += 1) {
      const range = ranges[i];
      const base = storySentences.slice(range.start, range.end + 1);
      const cloned = base.map((s) => ({ ...s }));

      const existingScriptId = null;
      tabSnapshotsRef.current[tabKeyForIndex(i)] = {
        scriptId: existingScriptId,
        sentences: cloned,
        voiceOver: null,
        voiceOverChunks: [],
        voiceDuration: null,
        savedVoiceId: null,
        voiceLibraryUrl: null,
        videoJobId: null,
        videoJobStatus: null,
        videoJobError: null,
        videoUrl: null,
      };
    }

    return null;
  };

  const handleSelectShortTab = (index: number | null) => {
    if (!isLongForm) return;

    const currentKey = tabKeyForIndex(activeShortTabIndex);
    tabSnapshotsRef.current[currentKey] = captureActiveTabSnapshot();

    setActiveShortTabIndex(index);

    const nextKey = tabKeyForIndex(index);
    const next = tabSnapshotsRef.current[nextKey];
    if (next) {
      applyTabSnapshot(next);
      return;
    }

    if (index === null) return;
    if (!shortRanges[index]) return;

    // Build on-demand from full snapshot.
    rebuildShortTabSnapshots(shortRanges);
    const built = tabSnapshotsRef.current[nextKey];
    if (built) {
      applyTabSnapshot(built);
    }
  };

  const handleUploadFinalVideo = async (file: File) => {
    if (!file) return;

    const MAX_UPLOAD_MB = 250;
    const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

    const isVideoMime = String(file.type || '').toLowerCase().startsWith('video/');
    if (!isVideoMime) {
      showToast('Please choose a valid video file.', 'error');
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      showToast(`Video is too large. Max size is ${MAX_UPLOAD_MB} MB.`, 'error');
      return;
    }

    setVideoJobError(null);
    resetJob();

    setIsUploadingVideo(true);
    try {
      const form = new FormData();
      form.append('video', file);

      const res = await fetch(`${API_URL}/videos/upload`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to upload video');
      }

      const data = (await res.json()) as {
        id?: string;
        status?: string;
        videoUrl?: string | null;
      };

      const id = String(data.id ?? '').trim();
      const status = String(data.status ?? '').trim() || 'completed';
      const url = data.videoUrl ? String(data.videoUrl).trim() : '';

      if (!id || !url) {
        throw new Error('Upload succeeded but response was missing id/videoUrl');
      }

      setJobFromResponse(id, status);
      setVideoUrl(url);
      showToast('Video uploaded successfully.', 'success');
    } catch (error) {
      console.error('Upload video failed', error);
      setVideoJobError('Failed to upload video. Please try again.');
      showAlert('Failed to upload video. Please try again in a moment.', {
        type: 'error',
      });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const voices = voicesByProvider[voiceProvider];
  const isLoadingVoices = isLoadingVoicesByProvider[voiceProvider];
  const voicesError = voicesErrorByProvider[voiceProvider];
  const selectedVoiceId = selectedVoiceIdByProvider[voiceProvider];

  const findVoiceOption = useCallback(
    (provider: VoiceProvider, voiceId: string | null | undefined) => {
      const trimmedVoiceId = String(voiceId ?? '').trim();
      if (!trimmedVoiceId) return null;
      return (
        voicesByProvider[provider].find((voice) => voice.voice_id === trimmedVoiceId) ??
        null
      );
    },
    [voicesByProvider],
  );

  const selectedVoiceOption = findVoiceOption(voiceProvider, selectedVoiceId);

  const getAudioDurationSeconds = async (file: File): Promise<number | null> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      const finalize = (value: number | null) => {
        URL.revokeObjectURL(url);
        resolve(value);
      };

      audio.addEventListener('loadedmetadata', () => {
        if (!Number.isNaN(audio.duration) && audio.duration > 0) {
          finalize(audio.duration);
          return;
        }
        finalize(null);
      });
      audio.addEventListener('error', () => finalize(null));
    });
  };

  const getAudioDurationSecondsFromUrl = async (
    sourceUrl: string,
  ): Promise<number | null> => {
    const trimmed = String(sourceUrl ?? '').trim();
    if (!trimmed) return null;

    return new Promise((resolve) => {
      const audio = new Audio(trimmed);
      const finalize = (value: number | null) => resolve(value);

      audio.addEventListener('loadedmetadata', () => {
        if (!Number.isNaN(audio.duration) && audio.duration > 0) {
          finalize(audio.duration);
          return;
        }

        finalize(null);
      });
      audio.addEventListener('error', () => finalize(null));
    });
  };

  const parseVoiceResponseToFile = async (params: {
    response: Response;
    provider: VoiceProvider;
    fallbackBaseName: string;
  }) => {
    const arrayBuffer = await params.response.arrayBuffer();
    const contentType = params.response.headers.get('content-type');
    const disposition = params.response.headers.get('content-disposition');

    const fallbackMime = params.provider === 'google' ? 'audio/wav' : 'audio/mpeg';
    const mimeType = String(contentType ?? '').trim() || fallbackMime;
    const headerFilename = filenameFromContentDisposition(disposition);
    const extFromMime = extensionFromAudioMimeType(mimeType);
    const defaultExt = params.provider === 'google' ? 'wav' : 'mp3';
    const fileName =
      headerFilename ||
      `${params.fallbackBaseName}.${extFromMime || defaultExt}`;

    const blob = new Blob([arrayBuffer], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });
    const durationSeconds = await getAudioDurationSeconds(file);

    return { file, durationSeconds, mimeType };
  };

  const requestGeneratedVoiceFile = async (params: {
    scriptForVoice: string;
    sentencesForVoice?: string[];
    voiceId: string;
    provider: VoiceProvider;
    styleInstructions?: string;
    elevenLabsModel?: ElevenLabsModel | null;
    elevenLabsSettings?: ElevenLabsVoiceSettings | null;
    fallbackBaseName: string;
    errorMessage: string;
  }) => {
    const response = await fetch(`${API_URL}/ai/generate-voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: params.scriptForVoice,
        sentences:
          Array.isArray(params.sentencesForVoice) && params.sentencesForVoice.length > 0
            ? params.sentencesForVoice
            : undefined,
        voiceId: params.voiceId,
        styleInstructions: params.styleInstructions,
        elevenLabsModel:
          params.provider === 'elevenlabs'
            ? normalizeElevenLabsModel(params.elevenLabsModel)
            : undefined,
        elevenLabsSettings:
          params.provider === 'elevenlabs' && params.elevenLabsSettings
            ? normalizeElevenLabsVoiceSettings(params.elevenLabsSettings)
            : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessageFromResponse(response, params.errorMessage),
      );
    }

    return parseVoiceResponseToFile({
      response,
      provider: params.provider,
      fallbackBaseName: params.fallbackBaseName,
    });
  };

  const mergeGeneratedVoiceChunks = async (params: {
    files: File[];
    provider: VoiceProvider;
    fallbackBaseName: string;
  }) => {
    if (params.files.length > VOICE_MERGE_BATCH_SIZE) {
      const mergedBatchFiles: File[] = [];

      for (let index = 0; index < params.files.length; index += VOICE_MERGE_BATCH_SIZE) {
        const batchFiles = params.files.slice(index, index + VOICE_MERGE_BATCH_SIZE);
        const batchNumber = Math.floor(index / VOICE_MERGE_BATCH_SIZE) + 1;
        const mergedBatch = await mergeGeneratedVoiceChunks({
          files: batchFiles,
          provider: params.provider,
          fallbackBaseName: `${params.fallbackBaseName}-batch-${batchNumber}`,
        });

        mergedBatchFiles.push(mergedBatch.file);
      }

      return await mergeGeneratedVoiceChunks({
        files: mergedBatchFiles,
        provider: params.provider,
        fallbackBaseName: params.fallbackBaseName,
      });
    }

    const formData = new FormData();
    for (const file of params.files) {
      formData.append('audioChunks', file, file.name);
    }
    formData.append('outputFormat', 'mp3');

    const response = await fetch(`${API_URL}/ai/merge-voice-chunks`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessageFromResponse(
          response,
          'Failed to merge generated voice chunks.',
        ),
      );
    }

    return parseVoiceResponseToFile({
      response,
      provider: params.provider,
      fallbackBaseName: params.fallbackBaseName,
    });
  };

  const persistVoiceOverChunksToManagedStorage = async (
    chunks: VoiceOverChunkState[],
  ): Promise<ScriptVoiceOverChunkDto[] | null> => {
    if (!hasPersistableVoiceChunks(chunks)) {
      return null;
    }

    const orderedChunks = [...chunks].sort((left, right) => left.index - right.index);
    const persisted = await mapWithConcurrency(orderedChunks, 2, async (chunk) => {
      const currentUrl = String(chunk.url ?? '').trim();
      const persistedUrl = resolvePersistedVoiceChunkUrl(chunk);
      const shouldUpload =
        chunk.needsUpload === true ||
        !persistedUrl ||
        Boolean(currentUrl && isLocalAssetUrl(currentUrl));

      let chunkUrl = persistedUrl;
      if (shouldUpload) {
        if (!chunk.sourceFile) {
          throw new Error('A generated voice chunk is missing its audio file. Please regenerate the voice-over.');
        }

        chunkUrl = await uploadManagedFile(chunk.sourceFile, {
          resourceType: 'audio',
          folder: 'auto-video-generator/voice-chunks',
        });
      }

      if (!chunkUrl) {
        throw new Error('A voice chunk could not be persisted. Please regenerate the voice-over.');
      }

      return {
        index: chunk.index,
        text: chunk.text,
        sentences: Array.isArray(chunk.sentences) ? [...chunk.sentences] : [],
        provider: normalizeVoiceProvider(chunk.provider),
        providerVoiceId: chunk.providerVoiceId,
        providerVoiceName: chunk.providerVoiceName,
        mimeType: chunk.mimeType,
        styleInstructions: chunk.styleInstructions,
        durationSeconds: chunk.durationSeconds,
        estimatedSeconds: chunk.estimatedSeconds,
        url: chunkUrl,
        fileName: chunk.fileName,
        createdAt: chunk.createdAt,
        elevenLabsSettings: normalizeOptionalElevenLabsVoiceSettings(
          chunk.elevenLabsSettings,
        ),
      } satisfies ScriptVoiceOverChunkDto;
    });

    return persisted;
  };

  const rebuildVoiceOverFromSavedChunks = async (params: {
    chunks?: ScriptVoiceOverChunkDto[] | null;
    fallbackBaseName: string;
  }): Promise<GeneratedVoiceFileResult | null> => {
    const orderedChunks = Array.isArray(params.chunks)
      ? [...params.chunks]
        .filter((chunk) => String(chunk?.url ?? '').trim())
        .sort((left, right) => Number(left.index ?? 0) - Number(right.index ?? 0))
      : [];

    if (orderedChunks.length === 0) {
      return null;
    }

    const files = await Promise.all(
      orderedChunks.map((chunk, index) =>
        downloadUrlAsFile(
          chunk.url,
          chunk.fileName || `${params.fallbackBaseName}-part-${index + 1}.mp3`,
        ),
      ),
    );

    const normalizedChunks: VoiceOverChunkState[] = orderedChunks.map((chunk) =>
      toVoiceOverChunkState(chunk),
    );

    if (files.length === 1) {
      const [file] = files;
      return {
        file,
        durationSeconds: await getAudioDurationSeconds(file),
        mimeType: file.type || normalizedChunks[0]?.mimeType || 'audio/mpeg',
        chunks: normalizedChunks,
      };
    }

    const merged = await mergeGeneratedVoiceChunks({
      files,
      provider: normalizeVoiceProvider(orderedChunks[0]?.provider),
      fallbackBaseName: params.fallbackBaseName,
    });

    return {
      ...merged,
      chunks: normalizedChunks,
    };
  };

  const persistSentenceVoiceFileToManagedStorage = async (params: {
    file: File;
    sentenceId: string;
  }) => {
    return await uploadManagedFile(params.file, {
      resourceType: 'audio',
      folder: `auto-video-generator/sentence-voice-overs/${params.sentenceId}`,
    });
  };

  const rebuildVoiceOverFromChunks = async (params: {
    chunks: VoiceOverChunkState[];
    fallbackBaseName: string;
    overrideFilesByChunkId?: Record<string, File | null | undefined>;
  }): Promise<GeneratedVoiceFileResult | null> => {
    const orderedChunks = [...params.chunks]
      .filter((chunk) => String(chunk.text ?? '').trim())
      .filter(
        (chunk) =>
          Boolean(params.overrideFilesByChunkId?.[String(chunk.index)]) ||
          hasVoiceOverChunkAudio(chunk),
      )
      .sort((left, right) => left.index - right.index);

    if (orderedChunks.length === 0) {
      return null;
    }

    const files = await Promise.all(
      orderedChunks.map(async (chunk, index) => {
        const chunkId = String(chunk.index);
        const overrideFile =
          params.overrideFilesByChunkId?.[chunkId] ?? chunk.sourceFile ?? null;
        if (overrideFile) return overrideFile;

        return await downloadUrlAsFile(
          String(chunk.url ?? '').trim(),
          chunk.fileName || `${params.fallbackBaseName}-chunk-${index + 1}.mp3`,
        );
      }),
    );

    const nextChunks = cloneVoiceOverChunks(orderedChunks);

    if (files.length === 1) {
      const [file] = files;
      return {
        file,
        durationSeconds: await getAudioDurationSeconds(file),
        mimeType: file.type || nextChunks[0]?.mimeType || 'audio/mpeg',
        chunks: nextChunks,
      };
    }

    const merged = await mergeGeneratedVoiceChunks({
      files,
      provider: normalizeVoiceProvider(orderedChunks[0]?.provider),
      fallbackBaseName: params.fallbackBaseName,
    });

    return {
      ...merged,
      chunks: nextChunks,
    };
  };

  const rebuildVoiceOverFromSentenceVoices = async (params: {
    sourceSentences: SentenceItem[];
    fallbackBaseName: string;
    overrideFilesBySentenceId?: Record<string, File | null | undefined>;
  }): Promise<GeneratedVoiceFileResult | null> => {
    const orderedSentences = params.sourceSentences
      .filter((sentence) => String(sentence.text ?? '').trim())
      .filter(
        (sentence) =>
          Boolean(params.overrideFilesBySentenceId?.[sentence.id]) ||
          hasSentenceVoiceOver(sentence),
      );

    if (orderedSentences.length === 0) {
      return null;
    }

    const files = await Promise.all(
      orderedSentences.map(async (sentence, index) => {
        const overrideFile =
          params.overrideFilesBySentenceId?.[sentence.id] ?? sentence.voiceOverFile ?? null;
        if (overrideFile) return overrideFile;

        return await downloadUrlAsFile(
          String(sentence.voiceOverUrl ?? '').trim(),
          `${params.fallbackBaseName}-sentence-${index + 1}.mp3`,
        );
      }),
    );

    if (files.length === 1) {
      const [file] = files;
      return {
        file,
        durationSeconds: await getAudioDurationSeconds(file),
        mimeType: file.type || 'audio/mpeg',
        chunks: [],
      };
    }

    const merged = await mergeGeneratedVoiceChunks({
      files,
      provider:
        orderedSentences.find((sentence) => sentence.voiceOverProvider)?.voiceOverProvider ??
        voiceProvider,
      fallbackBaseName: params.fallbackBaseName,
    });

    return {
      ...merged,
      chunks: [],
    };
  };

  const generateVoiceFileWithChunkSupport = async (params: {
    sentenceTexts?: string[];
    scriptText: string;
    voiceId: string;
    provider: VoiceProvider;
    providerVoiceName?: string | null;
    styleInstructions?: string;
    elevenLabsAutoGenerationStrategy?: ElevenLabsAutoGenerationStrategy | null;
    elevenLabsModel?: ElevenLabsModel | null;
    elevenLabsSettings?: ElevenLabsVoiceSettings | null;
    fallbackBaseName: string;
    onProgress?: (progress: VoiceGenerationProgress | null) => void;
    errorLabel?: string;
  }): Promise<GeneratedVoiceFileResult> => {
    const buildSingleChunkResult = (
      chunk: PlannedVoiceChunk,
      result: {
        file: File;
        durationSeconds: number | null;
        mimeType: string;
      },
    ): GeneratedVoiceFileResult => ({
      ...result,
      chunks: [
        buildLocalVoiceOverChunkState({
          chunk: {
            index: chunk.index,
            text: chunk.script,
            sentences: [...chunk.sentences],
            provider: params.provider,
            providerVoiceId: params.voiceId,
            providerVoiceName:
              String(params.providerVoiceName ?? '').trim() || null,
            mimeType: result.mimeType,
            styleInstructions: params.styleInstructions ?? null,
            durationSeconds: result.durationSeconds,
            estimatedSeconds: chunk.estimatedSeconds,
            url: null,
            persistedUrl: null,
            fileName: result.file.name,
            createdAt: new Date().toISOString(),
            elevenLabsSettings:
              params.provider === 'elevenlabs'
                ? normalizeOptionalElevenLabsVoiceSettings(
                  params.elevenLabsSettings,
                )
                : null,
            sourceFile: null,
            needsUpload: true,
          },
          file: result.file,
          mimeType: result.mimeType,
          durationSeconds: result.durationSeconds,
          provider: params.provider,
          providerVoiceId: params.voiceId,
          providerVoiceName: params.providerVoiceName,
          styleInstructions: params.styleInstructions,
          elevenLabsSettings:
            params.provider === 'elevenlabs' ? params.elevenLabsSettings : null,
        }),
      ],
    });

    const directScript =
      String(params.scriptText ?? '').trim() ||
      mergeVoiceSentenceTexts(params.sentenceTexts ?? []);
    const directChunkSentences = normalizeVoiceSentencesForChunking(
      params.sentenceTexts ?? [],
      directScript,
    );
    const shouldUseElevenLabsOneTake =
      params.provider === 'elevenlabs' &&
      normalizeElevenLabsAutoGenerationStrategy(
        params.elevenLabsAutoGenerationStrategy,
      ) === 'oneTake';

    if (shouldUseElevenLabsOneTake) {
      if (!directScript) {
        throw new Error('No script text is available for voice generation.');
      }

      const directChunk: PlannedVoiceChunk = {
        index: 0,
        sentences:
          directChunkSentences.length > 0 ? directChunkSentences : [directScript],
        script: directScript,
        estimatedSeconds: estimateVoiceDurationSeconds(directScript),
      };

      params.onProgress?.({ stage: 'generating', current: 1, total: 1 });
      const result = await requestGeneratedVoiceFile({
        scriptForVoice: directScript,
        sentencesForVoice: undefined,
        voiceId: params.voiceId,
        provider: params.provider,
        styleInstructions: params.styleInstructions,
        elevenLabsModel: params.elevenLabsModel,
        elevenLabsSettings: params.elevenLabsSettings,
        fallbackBaseName: params.fallbackBaseName,
        errorMessage: params.errorLabel || 'Failed to generate voice.',
      });
      params.onProgress?.(null);

      return buildSingleChunkResult(directChunk, result);
    }

    const chunks = buildPlannedVoiceChunks({
      sentenceTexts: params.sentenceTexts ?? [],
      fallbackScript: params.scriptText,
    });

    if (chunks.length === 0) {
      throw new Error('No script text is available for voice generation.');
    }

    if (chunks.length === 1) {
      params.onProgress?.({ stage: 'generating', current: 1, total: 1 });
      const result = await requestGeneratedVoiceFile({
        scriptForVoice: chunks[0].script,
        sentencesForVoice: chunks[0].sentences,
        voiceId: params.voiceId,
        provider: params.provider,
        styleInstructions: params.styleInstructions,
        elevenLabsModel: params.elevenLabsModel,
        elevenLabsSettings: params.elevenLabsSettings,
        fallbackBaseName: params.fallbackBaseName,
        errorMessage: params.errorLabel || 'Failed to generate voice.',
      });
      params.onProgress?.(null);
      return buildSingleChunkResult(chunks[0], result);
    }

    const generatedFiles: File[] = [];
    const generatedChunks: VoiceOverChunkState[] = [];
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      params.onProgress?.({
        stage: 'generating',
        current: index + 1,
        total: chunks.length,
      });

      const generated = await requestGeneratedVoiceFile({
        scriptForVoice: chunk.script,
        sentencesForVoice: chunk.sentences,
        voiceId: params.voiceId,
        provider: params.provider,
        styleInstructions: params.styleInstructions,
        elevenLabsModel: params.elevenLabsModel,
        elevenLabsSettings: params.elevenLabsSettings,
        fallbackBaseName: `${params.fallbackBaseName}-part-${index + 1}`,
        errorMessage:
          params.errorLabel ||
          `Failed to generate voice chunk ${index + 1} of ${chunks.length}.`,
      });
      generatedFiles.push(generated.file);
      generatedChunks.push(
        buildLocalVoiceOverChunkState({
          chunk: {
            index: chunk.index,
            text: chunk.script,
            sentences: [...chunk.sentences],
            provider: params.provider,
            providerVoiceId: params.voiceId,
            providerVoiceName:
              String(params.providerVoiceName ?? '').trim() || null,
            mimeType: generated.mimeType,
            styleInstructions: params.styleInstructions ?? null,
            durationSeconds: generated.durationSeconds,
            estimatedSeconds: chunk.estimatedSeconds,
            url: null,
            persistedUrl: null,
            fileName: generated.file.name,
            createdAt: new Date().toISOString(),
            elevenLabsSettings:
              params.provider === 'elevenlabs'
                ? normalizeOptionalElevenLabsVoiceSettings(
                  params.elevenLabsSettings,
                )
                : null,
            sourceFile: null,
            needsUpload: true,
          },
          file: generated.file,
          mimeType: generated.mimeType,
          durationSeconds: generated.durationSeconds,
          provider: params.provider,
          providerVoiceId: params.voiceId,
          providerVoiceName: params.providerVoiceName,
          styleInstructions: params.styleInstructions,
          elevenLabsSettings:
            params.provider === 'elevenlabs' ? params.elevenLabsSettings : null,
        }),
      );
    }

    params.onProgress?.({
      stage: 'merging',
      current: chunks.length,
      total: chunks.length,
    });

    const merged = await mergeGeneratedVoiceChunks({
      files: generatedFiles,
      provider: params.provider,
      fallbackBaseName: params.fallbackBaseName,
    });

    params.onProgress?.(null);
    return {
      ...merged,
      chunks: generatedChunks,
    };
  };

  const resolveRawBackgroundMusicSrcForRender = useCallback((): string | undefined => {
    if (!addBackgroundSoundtrack) return '__none__';

    const value = String(selectedBackgroundSoundtrackValue ?? '').trim();
    if (value === '__none__') return '__none__';
    if (!value || value === '__default__') return undefined;

    if (value === '__oneoff__') {
      const oneOffUrl = String(oneOffBackgroundSoundtrackUrl ?? '').trim();
      return oneOffUrl || undefined;
    }

    if (value.startsWith('lib:')) {
      const id = value.slice('lib:'.length);
      const found = backgroundSoundtracks.find((t) => t.id === id);
      return found?.url ? String(found.url).trim() : undefined;
    }

    return undefined;
  }, [
    addBackgroundSoundtrack,
    backgroundSoundtracks,
    oneOffBackgroundSoundtrackUrl,
    selectedBackgroundSoundtrackValue,
  ]);

  async function resolveBackgroundMusicRenderAsset() {
    const rawBackgroundMusicSrc = resolveRawBackgroundMusicSrcForRender();

    if (!selectedBackgroundSoundtrackRequiresMaterialization) {
      return {
        backgroundMusicSrc: rawBackgroundMusicSrc,
        backgroundMusicFile: null as File | null,
      };
    }

    const activeAssetMatchesSelection =
      activeMaterializedBackgroundSoundtrack?.cacheKey ===
        selectedBackgroundSoundtrackMaterializationCacheKey
        ? activeMaterializedBackgroundSoundtrack
        : null;

    const materialized =
      activeAssetMatchesSelection ??
      (await materializeBackgroundSoundtrackAsset(
        selectedBackgroundSoundtrackLibraryItem,
      ));

    if (!materialized) {
      throw new Error('Failed to prepare the edited background soundtrack.');
    }

    return {
      backgroundMusicSrc: undefined,
      backgroundMusicFile: materialized.file,
    };
  }

  const materializeRenderSoundEffect = async (
    source: RenderSoundEffectMaterializationSource,
  ): Promise<MaterializedRenderSoundEffectAsset> => {
    const sourceUrl = String(source.url ?? '').trim();
    if (!sourceUrl) {
      return {
        cacheKey: '',
        uploadedUrl: '',
        durationSeconds: null,
      };
    }

    const normalizedAudioSettings = normalizeSoundEffectAudioSettings(
      source.audioSettings,
    );
    const cacheKey = JSON.stringify({
      sourceUrl,
      audioSettings: normalizedAudioSettings,
    });

    const cached = renderSoundEffectAssetCacheRef.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inFlight = renderSoundEffectAssetInFlightRef.current.get(cacheKey);
    if (inFlight) {
      return await inFlight;
    }

    const request = (async () => {
      const rendered = await renderEditedAudioFile({
        sourceUrl,
        values: {
          name: String(source.title ?? '').trim() || 'sound-effect',
          volumePercent: 100,
          audioSettings: normalizedAudioSettings,
        },
        fallbackName: String(source.title ?? '').trim() || 'sound-effect',
      });

      const uploadedUrl = await uploadManagedFile(rendered.file, {
        resourceType: 'audio',
        folder: RENDER_SOUND_EFFECT_UPLOAD_FOLDER,
        excludedProviders: [...RENDER_UPLOAD_EXCLUDED_PROVIDERS],
      });

      const asset: MaterializedRenderSoundEffectAsset = {
        cacheKey,
        uploadedUrl,
        durationSeconds:
          rendered.durationSeconds > 0 ? rendered.durationSeconds : null,
      };

      renderSoundEffectAssetCacheRef.current.set(cacheKey, asset);
      return asset;
    })();

    renderSoundEffectAssetInFlightRef.current.set(cacheKey, request);

    try {
      return await request;
    } finally {
      if (renderSoundEffectAssetInFlightRef.current.get(cacheKey) === request) {
        renderSoundEffectAssetInFlightRef.current.delete(cacheKey);
      }
    }
  };

  const buildRenderSentencePayload = async (
    sourceSentences: SentenceItem[],
    options?: {
      clearLastTransition?: boolean;
      overlayTransportByIndex?: Array<
        | {
          url: string | null;
          mimeType: string | null;
        }
        | null
      >;
    },
  ) => {
    const materializeSentenceSoundEffectsForRender = async (
      items: SentenceSoundEffectItem[] | null | undefined,
    ): Promise<SentenceSoundEffectItem[]> => {
      console.log(items,'dsadasdsaasdas')
      if (!Array.isArray(items) || items.length === 0) return [];

      return await mapWithConcurrency(
        items,
        RENDER_SOUND_EFFECT_MATERIALIZATION_CONCURRENCY,
        async (item) => {
          const sourceUrl = String(item?.url ?? '').trim();
          if (sourceUrl) return item;

          const effectiveAudioSettings = normalizeSoundEffectAudioSettings(
            item.audioSettings ?? item.defaultAudioSettings,
          );

          if (
            areSoundEffectAudioSettingsEqual(
              effectiveAudioSettings,
              DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
            )
          ) {
            return item;
          }

          const materialized = await materializeRenderSoundEffect({
            title: item.title,
            url: sourceUrl,
            durationSeconds: item.durationSeconds ?? null,
            audioSettings: effectiveAudioSettings,
          });

          return {
            ...item,
            url: materialized.uploadedUrl || sourceUrl,
            durationSeconds:
              typeof materialized.durationSeconds === 'number' &&
                Number.isFinite(materialized.durationSeconds)
                ? Math.max(0, materialized.durationSeconds)
                : item.durationSeconds ?? null,
            audioSettings: cloneSoundEffectAudioSettings(
              DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
            ),
            defaultAudioSettings: cloneSoundEffectAudioSettings(
              DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
            ),
          };
        },
      );
    };

    const materializeTransitionSoundEffectsForRender = async (
      items: SentenceItem['transitionSoundEffects'],
    ) => {
      console.log(items,'dsdasasasdsa')
      if (!Array.isArray(items) || items.length === 0) return [];

      return await mapWithConcurrency(
        items,
        RENDER_SOUND_EFFECT_MATERIALIZATION_CONCURRENCY,
        async (item) => {
          const sourceUrl = String(item?.url ?? '').trim();
          if (sourceUrl) return item;

          const effectiveAudioSettings = normalizeSoundEffectAudioSettings(
            item.audioSettings,
          );

          if (
            areSoundEffectAudioSettingsEqual(
              effectiveAudioSettings,
              DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
            )
          ) {
            return item;
          }

          const materialized = await materializeRenderSoundEffect({
            title: item.title,
            url: sourceUrl,
            audioSettings: effectiveAudioSettings,
          });

          return {
            ...item,
            url: materialized.uploadedUrl || sourceUrl,
            audioSettings: cloneSoundEffectAudioSettings(
              DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
            ),
          };
        },
      );
    };

    return await Promise.all(sourceSentences.map(async (s, index) => {
      const text = String(s.text ?? '');
      const trimmed = text.trim();
      const tab = resolveSentenceSceneTab(s);

      const toRenderSoundEffects = (
        items: SentenceSoundEffectItem[] | null | undefined,
        ignoreOffsets = false,
      ) => {
        if (!Array.isArray(items) || items.length === 0) return [];

        return computeSentenceSoundEffectTiming(items, { ignoreOffsets })
          .filter((effect) => Boolean(effect?.url))
          .map((effect) => ({
            src: String(effect.url).trim(),
            delaySeconds: Math.max(0, Number(effect.absoluteDelaySeconds ?? 0) || 0),
            durationSeconds:
              typeof effect.durationSeconds === 'number' && Number.isFinite(effect.durationSeconds)
                ? Math.max(0, effect.durationSeconds)
                : undefined,
            trimStartSeconds:
              effect.trimStartSeconds > 0 ? Math.max(0, effect.trimStartSeconds) : undefined,
            volumePercent: Math.max(
              0,
              Math.min(300, Number(effect.volumePercent ?? 100) || 100),
            ),
          }));
      };

      const activeDetachedSoundEffects =
        tab === 'text'
          ? s.textSoundEffects
          : tab === 'overlay'
            ? s.overlaySoundEffects
            : [];

      const materializedSentenceSoundEffects =
        await materializeSentenceSoundEffectsForRender(s.soundEffects);
      const materializedDetachedSoundEffects =
        await materializeSentenceSoundEffectsForRender(activeDetachedSoundEffects);

      const soundEffects = [
        ...toRenderSoundEffects(
          materializedSentenceSoundEffects,
          s.alignSoundEffectsToSceneEnd === true,
        ),
        ...toRenderSoundEffects(materializedDetachedSoundEffects),
      ];

      const materializedTransitionSoundEffects =
        await materializeTransitionSoundEffectsForRender(
          s.transitionSoundEffects,
        );

      const transitionSoundEffects = Array.isArray(materializedTransitionSoundEffects)
        ? materializedTransitionSoundEffects
          .filter((e) => Boolean(e?.url))
          .map((e) => ({
            src: String(e.url).trim(),
            delaySeconds: Math.max(0, Number(e.delaySeconds ?? 0) || 0),
            volumePercent: Math.max(0, Math.min(300, Number(e.volumePercent ?? 100) || 100)),
          }))
        : [];

      const soundEffectsPatch = soundEffects.length ? { soundEffects } : {};
      const soundEffectsAlignPatch =
        s.alignSoundEffectsToSceneEnd === true ? { soundEffectsAlignToSceneEnd: true } : {};
      const transitionSoundEffectsPatch = transitionSoundEffects.length
        ? { transitionSoundEffects }
        : {};

      const transitionToNext =
        options?.clearLastTransition && index === sourceSentences.length - 1
          ? null
          : (s.transitionToNext ?? null);

      if (isSubscribeLikeSentence(trimmed)) {
        return {
          text,
          isSuspense: false,
          mediaType: 'video' as const,
          videoUrl: '/subscribe.mp4',
          ...(transitionToNext ? { transitionToNext } : {}),
          ...soundEffectsPatch,
          ...soundEffectsAlignPatch,
          ...transitionSoundEffectsPatch,
        };
      }
      if (tab === 'video') {
        const videoUrl = resolvePersistedRenderAssetUrl({
          file: s.video ?? null,
          url: s.videoUrl,
        });

        return {
          text,
          isSuspense: Boolean(s.isSuspense),
          mediaType: 'video' as const,
          ...(videoUrl ? { videoUrl } : {}),
          ...(transitionToNext ? { transitionToNext } : {}),
          ...soundEffectsPatch,
          ...soundEffectsAlignPatch,
          ...transitionSoundEffectsPatch,
        };
      }

      if (tab === 'text') {
        const textAnimationEffect = resolveTextAnimationEffectFromSettings(
          s.textAnimationSettings,
          s.textAnimationEffect,
        );
        const visualEffect = s.visualEffect ?? null;
        const backgroundAsset = resolveTextSceneRenderBackgroundAsset(
          s,
          effectiveIsShort,
        );
        const textBackgroundVideoUrl =
          backgroundAsset.transport === 'video'
            ? resolvePersistedRenderAssetUrl({
              file: backgroundAsset.file,
              url: backgroundAsset.url,
            })
            : null;

        return {
          text,
          isSuspense: Boolean(s.isSuspense),
          mediaType: 'text' as const,
          textAnimationEffect,
          textAnimationText: resolveTextAnimationText(s.textAnimationText, text),
          textAnimationSettings: serializeTextAnimationSettingsForRender(
            s,
            textAnimationEffect,
            effectiveIsShort,
          ),
          ...(visualEffect ? { visualEffect } : {}),
          ...(s.imageFilterSettings
            ? { imageFilterSettings: normalizeSettingsObject(s.imageFilterSettings) }
            : {}),
          ...(textBackgroundVideoUrl
            ? { textBackgroundVideoUrl }
            : {}),
          ...(transitionToNext ? { transitionToNext } : {}),
          ...soundEffectsPatch,
          ...soundEffectsAlignPatch,
          ...transitionSoundEffectsPatch,
        };
      }

      if (tab === 'overlay') {
        const textAnimationEffect = resolveTextAnimationEffectFromSettings(
          s.textAnimationSettings,
          s.textAnimationEffect,
        );
        const overlayTransport = options?.overlayTransportByIndex?.[index] ?? null;
        const overlayAsset = resolveOverlaySceneRenderAsset(s);
        const overlayUrl = String(
          overlayTransport
            ? overlayTransport.url ?? ''
            : resolvePersistedRenderAssetUrl({
              file: overlayAsset.file,
              url: overlayAsset.url,
            }) ?? '',
        ).trim();
        const overlayMimeType = String(
          overlayTransport
            ? overlayTransport.mimeType ?? ''
            : overlayAsset.mimeType ?? '',
        ).trim();
        const overlaySettings = normalizeOverlaySettings(s.overlaySettings, 'image');
        const backgroundAsset = resolveOverlaySceneRenderBackgroundAsset(s);
        const backgroundVideoUrl =
          backgroundAsset.transport === 'video'
            ? resolvePersistedRenderAssetUrl({
              file: backgroundAsset.file,
              url: backgroundAsset.url,
            })
            : null;

        return {
          text,
          isSuspense: Boolean(s.isSuspense),
          mediaType: 'overlay' as const,
          overlaySettings,
          ...(overlayUrl ? { overlayUrl } : {}),
          ...(overlayMimeType ? { overlayMimeType } : {}),
          ...(backgroundVideoUrl ? { videoUrl: backgroundVideoUrl } : {}),
          textAnimationEffect,
          textAnimationText: resolveTextAnimationText(s.textAnimationText, text),
          textAnimationSettings: serializeTextAnimationSettingsForRender(
            s,
            textAnimationEffect,
            effectiveIsShort,
          ),
          ...(transitionToNext ? { transitionToNext } : {}),
          ...soundEffectsPatch,
          ...soundEffectsAlignPatch,
          ...transitionSoundEffectsPatch,
        };
      }

      const visualEffect = s.visualEffect ?? null;
      const secondaryImageUrl = resolvePersistedRenderAssetUrl({
        file: s.secondaryImage ?? null,
        url: s.secondaryImageUrl,
      });

      return {
        text,
        isSuspense: Boolean(s.isSuspense),
        mediaType: 'image' as const,
        ...(secondaryImageUrl
          ? { secondaryImageUrl }
          : {}),
        ...(hasLocalRenderAssetSource(s.secondaryImage ?? null, s.secondaryImageUrl)
          ? { hasSecondaryImageUpload: true }
          : {}),
        imageEffectsMode: s.imageEffectsMode ?? 'quick',
        ...(transitionToNext ? { transitionToNext } : {}),
        ...(visualEffect ? { visualEffect } : {}),
        ...(s.customImageFilterId ? { imageFilterId: s.customImageFilterId } : {}),
        ...(s.imageFilterSettings
          ? { imageFilterSettings: normalizeSettingsObject(s.imageFilterSettings) }
          : {}),
        imageMotionEffect: s.imageMotionEffect ?? 'default',
        ...(s.customMotionEffectId
          ? { motionEffectId: s.customMotionEffectId }
          : {}),
        ...(s.imageMotionSettings
          ? { imageMotionSettings: normalizeSettingsObject(s.imageMotionSettings) }
          : {}),
        imageMotionSpeed: normalizeImageMotionSpeedValue(s.imageMotionSpeed),
        ...soundEffectsPatch,
        ...soundEffectsAlignPatch,
        ...transitionSoundEffectsPatch,
      };
    }));
  };

  const prepareImageUploadsForRender = async (sourceSentences: SentenceItem[]) => {
    const imageUploads: File[] = [];

    for (let index = 0; index < sourceSentences.length; index += 1) {
      const s = sourceSentences[index];
      const text = String(s?.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) continue;

      const tab = resolveSentenceSceneTab(s);
      if (tab === 'video') continue;

      if (tab === 'overlay') {
        const backgroundAsset = resolveOverlaySceneRenderBackgroundAsset(s);

        if (backgroundAsset.backgroundMode !== 'image') {
          continue;
        }

        if (!backgroundAsset.file && !backgroundAsset.url) {
          throw new Error(
            `Failed to prepare the Image tab background for overlay scene ${index + 1}. Please provide an image or switch the overlay background mode.`,
          );
        }

        const persistedUrl = getPersistedRenderUrl(backgroundAsset.url);
        if (persistedUrl) {
          continue;
        }

        try {
          const fileToUpload = await prepareLocalRenderAssetFile({
            file: backgroundAsset.file,
            url: backgroundAsset.url,
            fallbackName: `sentence-${index + 1}-overlay-background.png`,
          });
          if (!fileToUpload) {
            throw new Error('Missing overlay background image');
          }
          imageUploads.push(fileToUpload);
          continue;
        } catch {
          throw new Error(
            `Failed to prepare the Image tab background for overlay scene ${index + 1}. Please re-select the image and try again.`,
          );
        }
      }

      if (tab === 'text') {
        const backgroundAsset = resolveTextSceneRenderBackgroundAsset(s, effectiveIsShort);

        if (!backgroundAsset.file && !backgroundAsset.url) {
          if (
            backgroundAsset.backgroundMode === 'solid' ||
            backgroundAsset.backgroundMode === 'gradient'
          ) {
            continue;
          }

          throw new Error(
            `Failed to prepare a background image for text scene ${index + 1}. Please provide an image background or switch that scene to a solid or gradient background.`,
          );
        }

        const persistedUrl = getPersistedRenderUrl(backgroundAsset.url);
        if (persistedUrl) {
          continue;
        }

        try {
          const fileToUpload = await prepareLocalRenderAssetFile({
            file: backgroundAsset.file,
            url: backgroundAsset.url,
            fallbackName: `sentence-${index + 1}-text-background.png`,
          });
          if (!fileToUpload) {
            throw new Error('Missing text background image');
          }
          imageUploads.push(fileToUpload);
          continue;
        } catch {
          throw new Error(
            `Failed to prepare the background image for text scene ${index + 1}. Please re-select the image and try again.`,
          );
        }
      }

      const persistedUrl = resolvePersistedRenderAssetUrl({
        file: s.image ?? null,
        url: s.imageUrl,
      });
      if (persistedUrl) {
        continue;
      }

      try {
        const fileToUpload = await prepareLocalRenderAssetFile({
          file: s.image,
          url: s.imageUrl,
          fallbackName: `sentence-${index + 1}.png`,
        });
        if (!fileToUpload) {
          throw new Error('Missing image');
        }
        imageUploads.push(fileToUpload);
      } catch {
        throw new Error(
          `Failed to prepare image for selected scene ${index + 1}. Please re-select the image and try again.`,
        );
      }
    }

    return imageUploads;
  };

  const prepareTextBackgroundVideoUploadsForRender = async (
    sourceSentences: SentenceItem[],
  ) => {
    const videoUploads: File[] = [];

    for (let index = 0; index < sourceSentences.length; index += 1) {
      const sentence = sourceSentences[index];
      const text = String(sentence?.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) continue;
      if (resolveSentenceSceneTab(sentence) !== 'text') continue;

      const backgroundAsset = resolveTextSceneRenderBackgroundAsset(
        sentence,
        effectiveIsShort,
      );

      if (backgroundAsset.transport !== 'video') {
        continue;
      }

      if (!backgroundAsset.file && !backgroundAsset.url) {
        throw new Error(
          `Failed to prepare a video background for text scene ${index + 1}. Please provide a video background and try again.`,
        );
      }

      const persistedUrl = getPersistedRenderUrl(backgroundAsset.url);
      if (persistedUrl) {
        continue;
      }

      const fileToUpload = await prepareLocalRenderAssetFile({
        file: backgroundAsset.file,
        url: backgroundAsset.url,
        fallbackName: `sentence-${index + 1}-text-background.mp4`,
      });
      if (!fileToUpload) {
        throw new Error(
          `Failed to prepare a video background for text scene ${index + 1}. Please provide a video background and try again.`,
        );
      }

      videoUploads.push(fileToUpload);
    }

    return videoUploads;
  };

  const prepareVoiceOverUploadForRender = async () => {
    if (voiceOver) {
      return voiceOver;
    }

    const persistedUrl = getPersistedRenderUrl(voiceLibraryUrl);
    if (persistedUrl) {
      return null;
    }

    return await prepareLocalRenderAssetFile({
      url: voiceOverPreviewUrl,
      fallbackName: 'voice-over.mp3',
    });
  };

  const resolveRenderAudioUrl = async () => {
    if (voiceOver) {
      return null;
    }

    const persistedUrl = getPersistedRenderUrl(voiceLibraryUrl);
    if (persistedUrl) {
      return persistedUrl;
    }

    return getPersistedRenderUrl(voiceOverPreviewUrl);
  };

  const buildRenderImageUrls = async (sourceSentences: SentenceItem[]) => {
    return await mapWithConcurrency(sourceSentences, 4, async (sentence, index) => {
      const text = String(sentence?.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) {
        return null;
      }

      const tab = resolveSentenceSceneTab(sentence);
      if (tab === 'video') {
        return null;
      }

      if (tab === 'overlay') {
        const backgroundAsset = resolveOverlaySceneRenderBackgroundAsset(sentence);

        if (backgroundAsset.backgroundMode !== 'image') {
          return null;
        }

        if (!backgroundAsset.url && !backgroundAsset.file) {
          throw new Error(
            `Missing an image background for overlay scene ${index + 1}. Please provide an image on the Image tab or switch the overlay background mode.`,
          );
        }

        if (hasLocalRenderAssetSource(backgroundAsset.file, backgroundAsset.url)) {
          return null;
        }

        const persistedUrl = resolvePersistedRenderAssetUrl({
          file: backgroundAsset.file,
          url: backgroundAsset.url,
        });
        if (!persistedUrl) {
          throw new Error(
            `Missing an image background for overlay scene ${index + 1}. Please provide an image on the Image tab or switch the overlay background mode.`,
          );
        }

        return persistedUrl;
      }

      if (tab === 'text') {
        const backgroundAsset = resolveTextSceneRenderBackgroundAsset(
          sentence,
          effectiveIsShort,
        );

        if (!backgroundAsset.url && !backgroundAsset.file) {
          if (
            backgroundAsset.backgroundMode === 'solid' ||
            backgroundAsset.backgroundMode === 'gradient'
          ) {
            return null;
          }

          throw new Error(
            `Missing a background image for text scene ${index + 1}. Please provide one or switch the background mode to solid or gradient.`,
          );
        }

        if (hasLocalRenderAssetSource(backgroundAsset.file, backgroundAsset.url)) {
          return null;
        }

        const persistedUrl = resolvePersistedRenderAssetUrl({
          file: backgroundAsset.file,
          url: backgroundAsset.url,
        });
        if (!persistedUrl) {
          throw new Error(
            `Missing a background image for text scene ${index + 1}. Please provide one or switch the background mode to solid or gradient.`,
          );
        }

        return persistedUrl;
      }

      if (hasLocalRenderAssetSource(sentence.image ?? null, sentence.imageUrl)) {
        return null;
      }

      const persistedUrl = resolvePersistedRenderAssetUrl({
        file: sentence.image ?? null,
        url: sentence.imageUrl,
      });
      if (!persistedUrl) {
        throw new Error(
          `Missing image for sentence ${index + 1}. Please provide an image for every sentence on the Image tab.`,
        );
      }

      return persistedUrl;
    });
  };

  const buildRenderSecondaryImageUrls = async (sourceSentences: SentenceItem[]) => {
    return await mapWithConcurrency(sourceSentences, 4, async (sentence) => {
      const text = String(sentence?.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) {
        return null;
      }

      const tab = resolveSentenceSceneTab(sentence);
      if (tab !== 'image') {
        return null;
      }

      if (hasLocalRenderAssetSource(sentence.secondaryImage ?? null, sentence.secondaryImageUrl)) {
        return null;
      }

      return resolvePersistedRenderAssetUrl({
        file: sentence.secondaryImage ?? null,
        url: sentence.secondaryImageUrl,
      });
    });
  };

  const buildRenderOverlayTransportAssets = async (sourceSentences: SentenceItem[]) => {
    return await mapWithConcurrency(sourceSentences, 4, async (sentence, index) => {
      const text = String(sentence?.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) return null;
      if (resolveSentenceSceneTab(sentence) !== 'overlay') return null;

      const overlayAsset = resolveOverlaySceneRenderAsset(sentence);
      if (!overlayAsset.file && !overlayAsset.url) {
        throw new Error(
          `Missing an overlay asset for scene ${index + 1}. Please upload or choose an overlay before rendering.`,
        );
      }

      const currentMimeType =
        String(overlayAsset.file?.type ?? overlayAsset.mimeType ?? '').trim() || null;

      if (hasLocalRenderAssetSource(overlayAsset.file, overlayAsset.url)) {
        return {
          url: null,
          mimeType: currentMimeType,
        };
      }

      const persistedUrl = resolvePersistedRenderAssetUrl({
        file: overlayAsset.file,
        url: overlayAsset.url,
      });
      if (persistedUrl) {
        return {
          url: persistedUrl,
          mimeType: currentMimeType,
        };
      }

      return {
        url: null,
        mimeType: currentMimeType,
      };
    });
  };

  const prepareSecondaryImageUploadsForRender = async (
    sourceSentences: SentenceItem[],
  ) => {
    const imageUploads: File[] = [];

    for (let index = 0; index < sourceSentences.length; index += 1) {
      const sentence = sourceSentences[index];
      const text = String(sentence?.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) continue;
      if (resolveSentenceSceneTab(sentence) !== 'image') continue;

      const persistedUrl = resolvePersistedRenderAssetUrl({
        file: sentence.secondaryImage ?? null,
        url: sentence.secondaryImageUrl,
      });
      if (persistedUrl) {
        continue;
      }

      const fileToUpload = await prepareLocalRenderAssetFile({
        file: sentence.secondaryImage,
        url: sentence.secondaryImageUrl,
        fallbackName: `sentence-${index + 1}-secondary.png`,
      });

      if (fileToUpload) {
        imageUploads.push(fileToUpload);
      }
    }

    return imageUploads;
  };

  const prepareSceneVideoUploadsForRender = async (
    sourceSentences: SentenceItem[],
  ) => {
    const videoUploads: File[] = [];

    for (let index = 0; index < sourceSentences.length; index += 1) {
      const sentence = sourceSentences[index];
      const text = String(sentence?.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) continue;

      const tab = resolveSentenceSceneTab(sentence);
      if (tab === 'video') {
        const persistedUrl = resolvePersistedRenderAssetUrl({
          file: sentence.video ?? null,
          url: sentence.videoUrl,
        });
        if (persistedUrl) continue;

        const fileToUpload = await prepareLocalRenderAssetFile({
          file: sentence.video,
          url: sentence.videoUrl,
          fallbackName: `sentence-${index + 1}-video.mp4`,
        });
        if (!fileToUpload) {
          throw new Error(
            `Failed to prepare the video for sentence ${index + 1}. Please re-select the video and try again.`,
          );
        }

        videoUploads.push(fileToUpload);
        continue;
      }

      if (tab !== 'overlay') continue;

      const backgroundAsset = resolveOverlaySceneRenderBackgroundAsset(sentence);
      if (backgroundAsset.transport !== 'video') {
        continue;
      }

      const persistedUrl = resolvePersistedRenderAssetUrl({
        file: backgroundAsset.file,
        url: backgroundAsset.url,
      });
      if (persistedUrl) {
        continue;
      }

      const fileToUpload = await prepareLocalRenderAssetFile({
        file: backgroundAsset.file,
        url: backgroundAsset.url,
        fallbackName: `sentence-${index + 1}-overlay-background.mp4`,
      });
      if (!fileToUpload) {
        throw new Error(
          `Failed to prepare the video background for overlay scene ${index + 1}. Please re-select the video and try again.`,
        );
      }

      videoUploads.push(fileToUpload);
    }

    return videoUploads;
  };

  const prepareOverlayAssetUploadsForRender = async (
    sourceSentences: SentenceItem[],
  ) => {
    const overlayUploads: File[] = [];

    for (let index = 0; index < sourceSentences.length; index += 1) {
      const sentence = sourceSentences[index];
      const text = String(sentence?.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) continue;
      if (resolveSentenceSceneTab(sentence) !== 'overlay') continue;

      const overlayAsset = resolveOverlaySceneRenderAsset(sentence);
      const persistedUrl = resolvePersistedRenderAssetUrl({
        file: overlayAsset.file,
        url: overlayAsset.url,
      });
      if (persistedUrl) {
        continue;
      }

      const resourceType = inferOverlayResourceType({
        url: overlayAsset.url,
        mimeType: overlayAsset.file?.type ?? overlayAsset.mimeType,
      });
      const fileToUpload = await prepareLocalRenderAssetFile({
        file: overlayAsset.file,
        url: overlayAsset.url,
        fallbackName:
          resourceType === 'video'
            ? `sentence-${index + 1}-overlay.mp4`
            : `sentence-${index + 1}-overlay.png`,
      });
      if (!fileToUpload) {
        throw new Error(
          `Failed to prepare the overlay asset for scene ${index + 1}. Please re-select the asset and try again.`,
        );
      }

      overlayUploads.push(fileToUpload);
    }

    return overlayUploads;
  };

  const generateVoiceFileForSentences = async (
    sentenceTexts: string[],
    voiceId: string,
    options?: {
      styleInstructions?: string | null;
    },
  ) => {
    const normalizedSentences = sentenceTexts
      .map((sentence) => String(sentence ?? '').trim())
      .filter(Boolean);

    if (normalizedSentences.length === 0) {
      throw new Error('No sentences available for test voice-over generation');
    }

    const resolvedStyleInstructions =
      options && 'styleInstructions' in options
        ? String(options.styleInstructions ?? '').trim() || undefined
        : voiceProvider === 'google'
          ? String(aiStudioStyleInstructions ?? '').trim() || undefined
          : undefined;

    return generateVoiceFileWithChunkSupport({
      sentenceTexts: normalizedSentences,
      scriptText: mergeVoiceSentenceTexts(normalizedSentences),
      voiceId,
      provider: voiceProvider,
      providerVoiceName: selectedVoiceOption?.name ?? null,
      styleInstructions: resolvedStyleInstructions,
      elevenLabsAutoGenerationStrategy:
        voiceProvider === 'elevenlabs'
          ? elevenLabsAutoGenerationStrategy
          : undefined,
      elevenLabsModel:
        voiceProvider === 'elevenlabs' ? elevenLabsGlobalModel : undefined,
      elevenLabsSettings:
        voiceProvider === 'elevenlabs' ? elevenLabsGlobalSettings : undefined,
      fallbackBaseName: `test-${voiceProvider}-voice-over`,
      errorLabel: 'Failed to generate test voice-over.',
    });
  };

  const canUseCurrentTestVoiceSettings = Boolean(selectedVoiceId);

  const handleCloseTestVideoModal = () => {
    resetTestVideoJob();
  };

  const handleGenerateTestVideo = async (params: GenerateTestVideoRequest) => {
    const selectedSentences = Array.isArray(params.selectedSentences)
      ? params.selectedSentences.filter((value): value is SentenceItem => Boolean(value))
      : params.selectedIndices
        .map((index) => sentences[index])
        .filter((value): value is SentenceItem => Boolean(value));

    if (selectedSentences.length < 2) {
      showAlert('Please select at least two scenes for the test video.', { type: 'warning' });
      return;
    }

    const missingMediaForImageTab = selectedSentences.some((s) => {
      const text = String(s.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) return false;
      const tab = resolveSentenceSceneTab(s);
      if (tab !== 'image') return false;
      return !s.image && !s.imageUrl;
    });
    if (missingMediaForImageTab) {
      showAlert('Please provide an image for each selected image scene before generating a test video.', {
        type: 'warning',
      });
      return;
    }

    const missingVideoTab = selectedSentences
      .map((s, index) => {
        const text = String(s.text ?? '').trim();
        if (isSubscribeLikeSentence(text)) return null;
        const tab = resolveSentenceSceneTab(s);
        if (tab !== 'video') return null;

        const url = String(s.videoUrl ?? '').trim();
        const hasHttpUrl = url.startsWith('http://') || url.startsWith('https://') || url === '/subscribe.mp4';
        return hasHttpUrl ? null : index;
      })
      .filter((value): value is number => value !== null);
    if (missingVideoTab.length > 0) {
      showAlert(
        `One or more selected video scenes do not have a generated video yet. Generate the scene video first or switch those scenes back to the Image tab.`,
        { type: 'warning' },
      );
      return;
    }

    const missingTextBackground = selectedSentences.some((s) => {
      const text = String(s.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) return false;
      if (resolveSentenceSceneTab(s) !== 'text') return false;

      const backgroundAsset = resolveTextSceneRenderBackgroundAsset(s, effectiveIsShort);
      if (
        backgroundAsset.backgroundMode === 'solid' ||
        backgroundAsset.backgroundMode === 'gradient'
      ) {
        return false;
      }

      return !backgroundAsset.file && !backgroundAsset.url;
    });

    if (missingTextBackground) {
      showAlert(
        'Please provide a background image or video for each selected text scene, or switch those scenes to a solid or gradient background.',
        { type: 'warning' },
      );
      return;
    }

    const missingOverlayAsset = selectedSentences.some((s) => {
      const text = String(s.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) return false;
      if (resolveSentenceSceneTab(s) !== 'overlay') return false;

      const overlayAsset = resolveOverlaySceneRenderAsset(s);
      return !overlayAsset.file && !overlayAsset.url;
    });

    if (missingOverlayAsset) {
      showAlert('Please provide an overlay asset for each selected overlay scene.', {
        type: 'warning',
      });
      return;
    }

    const missingOverlayBackground = selectedSentences.some((s) => {
      const text = String(s.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) return false;
      if (resolveSentenceSceneTab(s) !== 'overlay') return false;

      const backgroundAsset = resolveOverlaySceneRenderBackgroundAsset(s);
      if (
        backgroundAsset.backgroundMode === 'solid' ||
        backgroundAsset.backgroundMode === 'gradient'
      ) {
        return false;
      }

      return !backgroundAsset.file && !backgroundAsset.url;
    });

    if (missingOverlayBackground) {
      showAlert(
        'Please provide the required Image or Video tab background for each selected overlay scene, or switch that overlay background to solid or gradient.',
        { type: 'warning' },
      );
      return;
    }

    resetTestVideoJob();

    try {
      let voiceFile: File | null = null;
      let audioDurationSeconds: number | null = null;
      let isSilent = false;

      if (params.voiceMode === 'current') {
        if (!selectedVoiceId) {
          isSilent = true;
        } else {
          const selectedTexts = selectedSentences
            .map((s) => String(s.text ?? '').trim())
            .filter(Boolean);
          const generated = await generateVoiceFileForSentences(
            selectedTexts,
            selectedVoiceId,
            {
              styleInstructions:
                voiceProvider === 'google' && selectedSentences.length < sentences.length
                  ? null
                  : undefined,
            },
          );
          voiceFile = generated.file;
          audioDurationSeconds = generated.durationSeconds;
        }
      } else if (params.voiceMode === 'upload') {
        voiceFile = params.uploadedVoiceOver;
        if (!voiceFile) {
          showAlert('Please upload a voice-over file for this test video.', { type: 'warning' });
          return;
        }
        audioDurationSeconds = await getAudioDurationSeconds(voiceFile);
      } else {
        isSilent = true;
      }

      const form = new FormData();
      if (voiceFile) {
        form.append('voiceOver', voiceFile);
      }
      if (isSilent) {
        form.append('isSilent', 'true');
      }

      const {
        backgroundMusicSrc,
        backgroundMusicFile,
      } = await resolveBackgroundMusicRenderAsset();

      const normalizedBackgroundMusicVolume = Math.max(
        0,
        Math.min(1, (backgroundSoundtrackVolumePercent ?? 100) / 100),
      );
      const shouldIncludeBackgroundMusicVolume =
        addBackgroundSoundtrack && normalizedBackgroundMusicVolume !== 1;
      if (backgroundMusicSrc) {
        form.append('backgroundMusicSrc', backgroundMusicSrc);
      }
      if (backgroundMusicFile) {
        form.append('backgroundMusicFile', backgroundMusicFile, backgroundMusicFile.name);
      }
      if (normalizedBackgroundMusicVolume !== 1) {
        if (shouldIncludeBackgroundMusicVolume) {
          form.append('backgroundMusicVolume', String(normalizedBackgroundMusicVolume));
        }
      }

      const imageUrls = await buildRenderImageUrls(selectedSentences);
      const imageUploads = await prepareImageUploadsForRender(selectedSentences);
      const secondaryImageUploads =
        await prepareSecondaryImageUploadsForRender(selectedSentences);
      const sceneVideoUploads = await prepareSceneVideoUploadsForRender(
        selectedSentences,
      );
      const textBackgroundVideoUploads =
        await prepareTextBackgroundVideoUploadsForRender(selectedSentences);
      const overlayTransportAssets = await buildRenderOverlayTransportAssets(
        selectedSentences,
      );
      const overlayAssetUploads = await prepareOverlayAssetUploadsForRender(
        selectedSentences,
      );

      const testSentencePayload = await buildRenderSentencePayload(selectedSentences, {
        clearLastTransition: true,
        overlayTransportByIndex: overlayTransportAssets,
      });

      form.append('sentences', JSON.stringify(testSentencePayload));
      form.append('scriptLength', scriptLength);
      form.append('language', scriptLanguage);
      if (audioDurationSeconds && audioDurationSeconds > 0) {
        form.append('audioDurationSeconds', String(audioDurationSeconds));
      }

      form.append('isShort', effectiveIsShort ? 'true' : 'false');
      form.append('useLowerFps', useLowerFps ? 'true' : 'false');
      form.append('useLowerResolution', useLowerResolution ? 'true' : 'false');
      form.append('addSubtitles', addSubtitles ? 'true' : 'false');
      form.append('enableGlitchTransitions', enableGlitchTransitions ? 'true' : 'false');
      form.append('enableZoomRotateTransitions', enableZoomRotateTransitions ? 'true' : 'false');
      form.append(
        'enableLongFormSubscribeOverlay',
        effectiveEnableLongFormSubscribeOverlay ? 'true' : 'false',
      );

      form.append('imageUrls', JSON.stringify(imageUrls));
      imageUploads.forEach((file) => form.append('images', file));
      secondaryImageUploads.forEach((file) => form.append('secondaryImages', file));
      sceneVideoUploads.forEach((file) => form.append('sceneVideos', file));
      textBackgroundVideoUploads.forEach((file) => {
        form.append('textBackgroundVideos', file);
      });
      overlayAssetUploads.forEach((file) => {
        form.append('overlayAssets', file);
      });

      const res = await fetch(`${API_URL}/videos/test`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        throw new Error('Failed to start test video generation');
      }

      const data = (await res.json()) as {
        id: string;
        status: string;
      };

      setTestVideoJobFromResponse(data.id, data.status);
    } catch (error) {
      console.error('Start test video generation failed', error);
      setTestVideoJobError('Failed to start test video generation. Please try again.');
    }
  };

  const handleSelectVoice = (voiceId: string) => {
    setSelectedVoiceIdByProvider((prev) => ({ ...prev, [voiceProvider]: voiceId }));
  };

  const fetchProviderVoices = async (provider: VoiceProvider) => {
    setIsLoadingVoicesByProvider((prev) => ({ ...prev, [provider]: true }));
    setVoicesErrorByProvider((prev) => ({ ...prev, [provider]: null }));
    try {
      const res = await api.get<VoiceOverOption[]>('/voice-overs', {
        params: { provider },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setVoicesByProvider((prev) => ({ ...prev, [provider]: data }));

      setSelectedVoiceIdByProvider((prev) => {
        const previousSelected = prev[provider];
        const favorite = data.find((v) => v.isFavorite);
        const fallbackId = favorite?.voice_id ?? (data.length > 0 ? data[0].voice_id : null);
        if (!fallbackId) return { ...prev, [provider]: null };
        if (!previousSelected) return { ...prev, [provider]: fallbackId };
        const stillExists = data.some((v) => v.voice_id === previousSelected);
        return {
          ...prev,
          [provider]: stillExists ? previousSelected : fallbackId,
        };
      });
    } catch (error) {
      console.error('Failed to load voices', error);
      setVoicesErrorByProvider((prev) => ({
        ...prev,
        [provider]: 'Failed to load voices.',
      }));
    } finally {
      setIsLoadingVoicesByProvider((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const fetchVoices = async () => fetchProviderVoices(voiceProvider);

  const fetchBackgroundSoundtracks = async () => {
    if (!user) return;

    setIsLoadingBackgroundSoundtracks(true);
    setBackgroundSoundtracksError(null);
    try {
      const res = await api.get<{
        items: BackgroundSoundtrackItem[];
        total: number;
        page: number;
        limit: number;
      }>('/background-soundtracks', { params: { page: 1, limit: 100 } });

      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setBackgroundSoundtracks(items.map((item) => normalizeBackgroundSoundtrackItem(item)));

      setSelectedBackgroundSoundtrackValue((prev) => {
        const current = String(prev ?? '').trim() || '__default__';

        const favorite = items.find((t) => Boolean(t?.is_favorite));
        const favoriteValue = favorite?.id ? `lib:${favorite.id}` : '__default__';

        if (current === '__default__' && favoriteValue !== '__default__') {
          return favoriteValue;
        }

        if (current.startsWith('lib:')) {
          const id = current.slice('lib:'.length);
          const exists = items.some((t) => t.id === id);
          if (!exists) return favoriteValue;
        }

        return current;
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load background soundtracks', error);
      setBackgroundSoundtracksError('Failed to load soundtracks.');
    } finally {
      setIsLoadingBackgroundSoundtracks(false);
    }
  };

  const fetchImageFilterPresets = useCallback(
    async (): Promise<ImageFilterPresetDto[] | null> => {
      if (!user) {
        setImageFilterPresets([]);
        return [];
      }

      setIsLoadingImageFilterPresets(true);
      try {
        const res = await api.get<PresetLibraryResponse<ImageFilterPresetDto>>(
          '/image-filters',
          { params: { page: 1, limit: 100 } },
        );

        const items = Array.isArray(res.data?.items)
          ? res.data.items.map((item) => ({
            id: String(item.id ?? '').trim(),
            title: String(item.title ?? '').trim() || 'Untitled look',
            settings: normalizeSettingsObject(item.settings),
          }))
          : [];

        const normalizedItems = items.filter((item) => item.id);
        setImageFilterPresets(normalizedItems);
        return normalizedItems;
      } catch (error) {
        console.error('Failed to load image filter presets', error);
        showToast('Failed to load look presets.', 'error');
        return null;
      } finally {
        setIsLoadingImageFilterPresets(false);
      }
    },
    [showToast, user],
  );

  const fetchMotionEffectPresets = useCallback(
    async (): Promise<MotionEffectPresetDto[] | null> => {
      if (!user) {
        setMotionEffectPresets([]);
        return [];
      }

      setIsLoadingMotionEffectPresets(true);
      try {
        const res = await api.get<PresetLibraryResponse<MotionEffectPresetDto>>(
          '/motion-effects',
          { params: { page: 1, limit: 100 } },
        );

        const items = Array.isArray(res.data?.items)
          ? res.data.items.map((item) => ({
            id: String(item.id ?? '').trim(),
            title: String(item.title ?? '').trim() || 'Untitled motion',
            settings: normalizeSettingsObject(item.settings),
          }))
          : [];

        const normalizedItems = items.filter((item) => item.id);
        setMotionEffectPresets(normalizedItems);
        return normalizedItems;
      } catch (error) {
        console.error('Failed to load motion effect presets', error);
        showToast('Failed to load motion presets.', 'error');
        return null;
      } finally {
        setIsLoadingMotionEffectPresets(false);
      }
    },
    [showToast, user],
  );

  const fetchTextAnimationPresets = async () => {
    if (!user) {
      setTextAnimationPresets([]);
      return;
    }

    setIsLoadingTextAnimationPresets(true);
    try {
      const res = await api.get<PresetLibraryResponse<BackendTextAnimationPresetDto>>(
        '/text-animations',
        { params: { page: 1, limit: 100 } },
      );

      const items = Array.isArray(res.data?.items)
        ? res.data.items
          .map((item) => normalizeTextAnimationPresetItem(item))
          .filter((item): item is TextAnimationPresetDto => Boolean(item))
        : [];

      setTextAnimationPresets(items.filter((item) => item.id));
    } catch (error) {
      console.error('Failed to load text animation presets', error);
      showToast('Failed to load text animation presets.', 'error');
    } finally {
      setIsLoadingTextAnimationPresets(false);
    }
  };

  const fetchOverlayPresets = async () => {
    if (!user) {
      setOverlayPresets([]);
      return;
    }

    setIsLoadingOverlayPresets(true);
    try {
      const res = await api.get<PresetLibraryResponse<BackendOverlayPresetDto>>('/overlays', {
        params: { page: 1, limit: 100 },
      });

      const items = Array.isArray(res.data?.items)
        ? res.data.items
          .map((item) => normalizeOverlayPresetItem(item))
          .filter((item): item is OverlayPresetDto => Boolean(item))
        : [];

      setOverlayPresets(items);
    } catch (error) {
      console.error('Failed to load overlay presets', error);
      // showToast('Failed to load overlay presets.', 'error');
    } finally {
      setIsLoadingOverlayPresets(false);
    }
  };

  const handleSaveImageFilterPreset = async (
    title: string,
    settings: ImageFilterSettings,
  ): Promise<ImageFilterPresetDto | null> => {
    if (!user) {
      showAlert('You must be logged in to save a look preset.', { type: 'warning' });
      return null;
    }

    const trimmedTitle = String(title ?? '').trim();
    if (!trimmedTitle) return null;

    try {
      const res = await api.post<ImageFilterPresetDto>('/image-filters', {
        title: trimmedTitle,
        settings,
      });

      const saved: ImageFilterPresetDto = {
        id: String(res.data?.id ?? '').trim(),
        title: String(res.data?.title ?? trimmedTitle).trim() || trimmedTitle,
        settings: normalizeSettingsObject(res.data?.settings) ?? settings,
      };

      if (!saved.id) {
        showToast('Look preset could not be saved.', 'error');
        return null;
      }

      setImageFilterPresets((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      showToast('Look preset saved.', 'success');
      return saved;
    } catch (error) {
      console.error('Failed to save image filter preset', error);
      showToast('Failed to save look preset.', 'error');
      return null;
    }
  };

  const handleUpdateImageFilterPreset = async (
    imageFilterId: string,
    settings: ImageFilterSettings,
  ): Promise<ImageFilterPresetDto | null> => {
    if (!user) {
      showAlert('You must be logged in to update a look preset.', { type: 'warning' });
      return null;
    }

    const trimmedId = String(imageFilterId ?? '').trim();
    if (!trimmedId) return null;

    try {
      const res = await api.patch<ImageFilterPresetDto>(`/image-filters/${trimmedId}`, {
        settings,
      });

      const currentPreset = imageFilterPresets.find((item) => item.id === trimmedId);
      const saved: ImageFilterPresetDto = {
        id: String(res.data?.id ?? trimmedId).trim(),
        title:
          String(res.data?.title ?? currentPreset?.title ?? 'Untitled look').trim() ||
          'Untitled look',
        settings: normalizeSettingsObject(res.data?.settings) ?? settings,
      };

      setImageFilterPresets((prev) => {
        const next = prev.map((item) => (item.id === saved.id ? saved : item));
        return next.some((item) => item.id === saved.id) ? next : [saved, ...next];
      });
      showToast('Look preset updated.', 'success');
      return saved;
    } catch (error) {
      console.error('Failed to update image filter preset', error);
      showToast(getRequestErrorMessage(error, 'Failed to update look preset.'), 'error');
      return null;
    }
  };

  const handleDeleteImageFilterPreset = async (imageFilterId: string): Promise<boolean> => {
    if (!user) {
      showAlert('You must be logged in to delete a look preset.', { type: 'warning' });
      return false;
    }

    const trimmedId = String(imageFilterId ?? '').trim();
    if (!trimmedId) return false;

    try {
      await api.delete(`/image-filters/${trimmedId}`);
      setImageFilterPresets((prev) => prev.filter((item) => item.id !== trimmedId));
      setSentences((prev) =>
        prev.map((sentence) =>
          sentence.customImageFilterId === trimmedId
            ? {
              ...sentence,
              visualEffect: null,
              customImageFilterId: null,
              imageFilterSettings: getDefaultImageFilterSettings(null),
            }
            : sentence,
        ),
      );
      showToast('Look preset deleted.', 'success');
      return true;
    } catch (error) {
      console.error('Failed to delete image filter preset', error);
      showToast(getRequestErrorMessage(error, 'Failed to delete look preset.'), 'error');
      return false;
    }
  };

  const handleSaveMotionEffectPreset = async (
    title: string,
    settings: ImageMotionSettings,
  ): Promise<MotionEffectPresetDto | null> => {
    if (!user) {
      showAlert('You must be logged in to save a motion preset.', { type: 'warning' });
      return null;
    }

    const trimmedTitle = String(title ?? '').trim();
    if (!trimmedTitle) return null;

    try {
      const res = await api.post<MotionEffectPresetDto>('/motion-effects', {
        title: trimmedTitle,
        settings,
      });

      const saved: MotionEffectPresetDto = {
        id: String(res.data?.id ?? '').trim(),
        title: String(res.data?.title ?? trimmedTitle).trim() || trimmedTitle,
        settings: normalizeSettingsObject(res.data?.settings) ?? settings,
      };

      if (!saved.id) {
        showToast('Motion preset could not be saved.', 'error');
        return null;
      }

      setMotionEffectPresets((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      showToast('Motion preset saved.', 'success');
      return saved;
    } catch (error) {
      console.error('Failed to save motion effect preset', error);
      showToast('Failed to save motion preset.', 'error');
      return null;
    }
  };

  const handleUpdateMotionEffectPreset = async (
    motionEffectId: string,
    settings: ImageMotionSettings,
  ): Promise<MotionEffectPresetDto | null> => {
    if (!user) {
      showAlert('You must be logged in to update a motion preset.', { type: 'warning' });
      return null;
    }

    const trimmedId = String(motionEffectId ?? '').trim();
    if (!trimmedId) return null;

    try {
      const res = await api.patch<MotionEffectPresetDto>(`/motion-effects/${trimmedId}`, {
        settings,
      });

      const currentPreset = motionEffectPresets.find((item) => item.id === trimmedId);
      const saved: MotionEffectPresetDto = {
        id: String(res.data?.id ?? trimmedId).trim(),
        title:
          String(res.data?.title ?? currentPreset?.title ?? 'Untitled motion').trim() ||
          'Untitled motion',
        settings: normalizeSettingsObject(res.data?.settings) ?? settings,
      };

      setMotionEffectPresets((prev) => {
        const next = prev.map((item) => (item.id === saved.id ? saved : item));
        return next.some((item) => item.id === saved.id) ? next : [saved, ...next];
      });
      showToast('Motion preset updated.', 'success');
      return saved;
    } catch (error) {
      console.error('Failed to update motion effect preset', error);
      showToast(getRequestErrorMessage(error, 'Failed to update motion preset.'), 'error');
      return null;
    }
  };

  const handleDeleteMotionEffectPreset = async (motionEffectId: string): Promise<boolean> => {
    if (!user) {
      showAlert('You must be logged in to delete a motion preset.', { type: 'warning' });
      return false;
    }

    const trimmedId = String(motionEffectId ?? '').trim();
    if (!trimmedId) return false;

    try {
      await api.delete(`/motion-effects/${trimmedId}`);
      setMotionEffectPresets((prev) => prev.filter((item) => item.id !== trimmedId));
      const defaultSpeed = getDefaultImageMotionSpeed(effectiveIsShort);
      const defaultSettings = getDefaultImageMotionSettings(
        'default',
        defaultSpeed,
        effectiveIsShort,
      );
      setSentences((prev) =>
        prev.map((sentence) =>
          sentence.customMotionEffectId === trimmedId
            ? {
              ...sentence,
              imageMotionEffect: 'default',
              customMotionEffectId: null,
              imageMotionSpeed: defaultSpeed,
              imageMotionSettings: defaultSettings,
            }
            : sentence,
        ),
      );
      showToast('Motion preset deleted.', 'success');
      return true;
    } catch (error) {
      console.error('Failed to delete motion effect preset', error);
      showToast(getRequestErrorMessage(error, 'Failed to delete motion preset.'), 'error');
      return false;
    }
  };

  const syncTextAnimationPresetToLinkedSentences = (preset: TextAnimationPresetDto) => {
    const nextSoundEffects = normalizeDetachedSentenceSoundEffects(preset.soundEffects);

    setSentences((prev) =>
      prev.map((sentence) => {
        if (sentence.customTextAnimationId !== preset.id) {
          return sentence;
        }

        const nextEffect = resolveTextAnimationEffectFromSettings(
          preset.settings,
          sentence.textAnimationEffect ?? 'slideCutFast',
        );

        return {
          ...sentence,
          textAnimationEffect: nextEffect,
          textAnimationSettings: {
            ...normalizeTextAnimationSettings(
              preset.settings,
              nextEffect,
              effectiveIsShort,
              resolveTextAnimationText(sentence.textAnimationText, sentence.text),
            ),
            presetKey: 'custom',
          },
          textSoundEffects: nextSoundEffects,
        };
      }),
    );
  };

  const syncOverlayPresetToLinkedSentences = (preset: OverlayPresetDto) => {
    const nextSoundEffects = normalizeDetachedSentenceSoundEffects(preset.soundEffects);

    setSentences((prev) =>
      prev.map((sentence) =>
        sentence.customOverlayId === preset.id
          ? {
            ...sentence,
            customOverlayId: preset.id,
            overlayFile: null,
            overlayUrl: preset.url,
            overlayMimeType: preset.mimeType ?? null,
            overlaySettings: {
              ...normalizeOverlaySettings(preset.settings, 'image'),
              presetKey: 'custom',
            },
            overlaySoundEffects: nextSoundEffects,
          }
          : sentence,
      ),
    );
  };

  const handleSaveTextAnimationPreset = async (
    title: string,
    settings: TextAnimationSettings,
    soundEffects: SentenceSoundEffectItem[] | null | undefined,
  ): Promise<TextAnimationPresetDto | null> => {
    if (!user) {
      showAlert('You must be logged in to save a text animation preset.', { type: 'warning' });
      return null;
    }

    const trimmedTitle = String(title ?? '').trim();
    if (!trimmedTitle) return null;

    try {
      const res = await api.post<BackendTextAnimationPresetDto>('/text-animations', {
        title: trimmedTitle,
        settings,
        sound_effects: serializeDetachedSentenceSoundEffects(soundEffects),
      });

      const saved = normalizeTextAnimationPresetItem(res.data) ?? {
        id: String(res.data?.id ?? '').trim(),
        title: String(res.data?.title ?? trimmedTitle).trim() || trimmedTitle,
        settings: normalizeSettingsObject(res.data?.settings) ?? settings,
        soundEffects:
          soundEffects && soundEffects.length > 0 ? [...soundEffects] : null,
      };

      if (!saved.id) {
        showToast('Text animation preset could not be saved.', 'error');
        return null;
      }

      setTextAnimationPresets((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      showToast('Text animation preset saved.', 'success');
      return saved;
    } catch (error) {
      console.error('Failed to save text animation preset', error);
      showToast('Failed to save text animation preset.', 'error');
      return null;
    }
  };

  const handleUpdateTextAnimationPreset = async (
    textAnimationId: string,
    settings: TextAnimationSettings,
    soundEffects: SentenceSoundEffectItem[] | null | undefined,
  ): Promise<TextAnimationPresetDto | null> => {
    if (!user) {
      showAlert('You must be logged in to update a text animation preset.', { type: 'warning' });
      return null;
    }

    const trimmedId = String(textAnimationId ?? '').trim();
    if (!trimmedId) return null;

    try {
      const res = await api.patch<BackendTextAnimationPresetDto>(`/text-animations/${trimmedId}`, {
        settings,
        sound_effects: serializeDetachedSentenceSoundEffects(soundEffects),
      });

      const currentPreset = textAnimationPresets.find((item) => item.id === trimmedId);
      const saved = normalizeTextAnimationPresetItem(res.data) ?? {
        id: String(res.data?.id ?? trimmedId).trim(),
        title:
          String(res.data?.title ?? currentPreset?.title ?? 'Untitled text animation').trim() ||
          'Untitled text animation',
        settings: normalizeSettingsObject(res.data?.settings) ?? settings,
        soundEffects:
          soundEffects && soundEffects.length > 0 ? [...soundEffects] : currentPreset?.soundEffects ?? null,
      };

      setTextAnimationPresets((prev) => {
        const next = prev.map((item) => (item.id === saved.id ? saved : item));
        return next.some((item) => item.id === saved.id) ? next : [saved, ...next];
      });
      syncTextAnimationPresetToLinkedSentences(saved);
      showToast('Text animation preset updated.', 'success');
      return saved;
    } catch (error) {
      console.error('Failed to update text animation preset', error);
      showToast(getRequestErrorMessage(error, 'Failed to update text animation preset.'), 'error');
      return null;
    }
  };

  const handleDeleteTextAnimationPreset = async (textAnimationId: string): Promise<boolean> => {
    if (!user) {
      showAlert('You must be logged in to delete a text animation preset.', { type: 'warning' });
      return false;
    }

    const trimmedId = String(textAnimationId ?? '').trim();
    if (!trimmedId) return false;

    try {
      await api.delete(`/text-animations/${trimmedId}`);
      setTextAnimationPresets((prev) => prev.filter((item) => item.id !== trimmedId));
      setSentences((prev) =>
        prev.map((sentence) =>
          sentence.customTextAnimationId === trimmedId
            ? {
              ...sentence,
              textAnimationEffect: 'slideCutFast',
              customTextAnimationId: null,
              textAnimationSettings: getDefaultTextAnimationSettings(
                'slideCutFast',
                effectiveIsShort,
                resolveTextAnimationText(
                  sentence.textAnimationText,
                  sentence.text,
                ),
              ),
              textSoundEffects: [],
            }
            : sentence,
        ),
      );
      showToast('Text animation preset deleted.', 'success');
      return true;
    } catch (error) {
      console.error('Failed to delete text animation preset', error);
      showToast(getRequestErrorMessage(error, 'Failed to delete text animation preset.'), 'error');
      return false;
    }
  };

  const saveOverlayPresetRequest = async (params: {
    title: string;
    settings: OverlaySettings;
    file?: File | null;
    sourceUrl?: string | null;
    overlayId?: string | null;
    soundEffects?: SentenceSoundEffectItem[] | null;
  }): Promise<OverlayPresetDto | null> => {
    const resolvedTitle = resolveOverlayPresetTitle({
      preferredTitle: params.title,
      file: params.file ?? null,
      sourceUrl: params.sourceUrl ?? null,
      fallback: 'Overlay preset',
    });
    const trimmedSourceUrl = String(params.sourceUrl ?? '').trim();
    if (!resolvedTitle) return null;
    if (!params.file && !trimmedSourceUrl) return null;

    const formData = new FormData();
    formData.append('title', resolvedTitle);
    formData.append('settings', JSON.stringify(normalizeOverlaySettings(params.settings)));
    formData.append(
      'sound_effects',
      JSON.stringify(serializeDetachedSentenceSoundEffects(params.soundEffects)),
    );
    if (trimmedSourceUrl) {
      formData.append('sourceUrl', trimmedSourceUrl);
    }
    if (params.file) {
      formData.append('file', params.file);
    }

    try {
      const res = params.overlayId
        ? await api.patch<BackendOverlayPresetDto>(`/overlays/${encodeURIComponent(params.overlayId)}`, formData)
        : await api.post<BackendOverlayPresetDto>('/overlays', formData);

      const saved = normalizeOverlayPresetItem(res.data);
      if (!saved) {
        showToast('Overlay preset could not be saved.', 'error');
        return null;
      }

      setOverlayPresets((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      if (params.overlayId) {
        syncOverlayPresetToLinkedSentences(saved);
      }
      return saved;
    } catch (error) {
      console.error('Failed to save overlay preset', error);
      showToast(
        getRequestErrorMessage(error, 'Failed to save overlay preset.'),
        'error',
      );
      return null;
    }
  };

  const handleDeleteOverlayPreset = async (overlayId: string): Promise<boolean> => {
    if (!user) {
      showAlert('You must be logged in to delete an overlay preset.', { type: 'warning' });
      return false;
    }

    const trimmedId = String(overlayId ?? '').trim();
    if (!trimmedId) return false;

    try {
      await api.delete(`/overlays/${trimmedId}`);
      setOverlayPresets((prev) => prev.filter((item) => item.id !== trimmedId));
      setSentences((prev) =>
        prev.map((sentence) =>
          sentence.customOverlayId === trimmedId
            ? {
              ...sentence,
              customOverlayId: null,
              overlayFile: null,
              overlayUrl: null,
              overlayMimeType: null,
              overlaySettings: null,
              overlaySoundEffects: [],
            }
            : sentence,
        ),
      );
      showToast('Overlay preset deleted.', 'success');
      return true;
    } catch (error) {
      console.error('Failed to delete overlay preset', error);
      showToast(getRequestErrorMessage(error, 'Failed to delete overlay preset.'), 'error');
      return false;
    }
  };

  useEffect(() => {
    const value = String(selectedBackgroundSoundtrackValue ?? '').trim();
    if (!value.startsWith('lib:')) return;

    const id = value.slice('lib:'.length);
    const found = backgroundSoundtracks.find((t) => t.id === id);
    const next = Number(found?.volume_percent);
    if (Number.isFinite(next)) {
      setBackgroundSoundtrackVolumePercent(next);
    } else {
      setBackgroundSoundtrackVolumePercent(100);
    }
  }, [backgroundSoundtracks, selectedBackgroundSoundtrackValue]);

  const handleSetFavoriteBackgroundSoundtrack = async (soundtrackId: string) => {
    if (!user) {
      showAlert('You must be logged in to set a favorite soundtrack.', { type: 'warning' });
      return;
    }

    const id = String(soundtrackId ?? '').trim();
    if (!id) return;

    try {
      setIsSettingFavoriteBackgroundSoundtrack(true);
      const res = await api.patch<{ id: string }>('/background-soundtracks/favorite/' + encodeURIComponent(id));
      const updatedId = String(res.data?.id ?? id).trim();

      setBackgroundSoundtracks((prev) =>
        prev.map((t) => ({
          ...t,
          is_favorite: t.id === updatedId,
        })),
      );
      setSelectedBackgroundSoundtrackValue(`lib:${updatedId}`);
      showToast('Favorite soundtrack updated', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to set favorite soundtrack', error);
      showToast('Failed to set favorite soundtrack', 'error');
    } finally {
      setIsSettingFavoriteBackgroundSoundtrack(false);
    }
  };

  const handleSaveBackgroundSoundtrackVolume = async (params: {
    soundtrackId: string;
    volumePercent: number;
  }) => {
    if (!user) {
      showAlert('You must be logged in to save a soundtrack volume.', { type: 'warning' });
      return;
    }

    const id = String(params.soundtrackId ?? '').trim();
    if (!id) return;

    const raw = Number(params.volumePercent);
    const volumePercent = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 100;

    try {
      setIsSavingBackgroundSoundtrackVolume(true);
      const res = await api.patch<{ id: string; volume_percent?: number }>(
        '/background-soundtracks/volume/' + encodeURIComponent(id),
        { volumePercent },
      );

      const updatedId = String(res.data?.id ?? id).trim();
      const saved = Number(res.data?.volume_percent);

      setBackgroundSoundtracks((prev) =>
        prev.map((t) =>
          t.id === updatedId
            ? { ...t, volume_percent: Number.isFinite(saved) ? saved : volumePercent }
            : t,
        ),
      );

      showToast('Default volume saved.', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save soundtrack volume', error);
      showToast('Failed to save default volume.', 'error');
    } finally {
      setIsSavingBackgroundSoundtrackVolume(false);
    }
  };

  const handleDeleteBackgroundSoundtrack = async (soundtrackId: string) => {
    if (!user) {
      showAlert('You must be logged in to delete a soundtrack.', { type: 'warning' });
      return;
    }

    const id = String(soundtrackId ?? '').trim();
    if (!id) return;

    try {
      setIsDeletingBackgroundSoundtrack(true);
      await api.delete('/background-soundtracks/' + encodeURIComponent(id));

      revokeCachedBackgroundSoundtrackAssets(
        (asset) => asset.soundtrackId === id,
      );

      setBackgroundSoundtracks((prev) => prev.filter((t) => t.id !== id));

      setSelectedBackgroundSoundtrackValue((prev) => {
        const current = String(prev ?? '').trim() || '__default__';
        if (current === `lib:${id}`) return '__default__';
        return current;
      });

      showToast('Soundtrack deleted.', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete soundtrack', error);
      showToast('Failed to delete soundtrack.', 'error');
    } finally {
      setIsDeletingBackgroundSoundtrack(false);
    }
  };

  const handleUploadBackgroundSoundtrackUseOnce = async (file: File) => {
    if (!user) {
      showAlert('You must be logged in to upload a soundtrack.', { type: 'warning' });
      return;
    }
    if (!file) return;

    setIsUploadingBackgroundSoundtrack(true);
    try {
      const form = new FormData();
      form.append('soundtrack', file);

      const res = await api.post<{ url: string }>('/background-soundtracks/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = String(res.data?.url ?? '').trim();
      if (!url) {
        throw new Error('Upload succeeded but response was missing url');
      }

      setOneOffBackgroundSoundtrackUrl(url);
      setSelectedBackgroundSoundtrackValue('__oneoff__');
      showToast('Soundtrack uploaded (one-off).', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Upload soundtrack (one-off) failed', error);
      showAlert('Failed to upload soundtrack. Please try again.', { type: 'error' });
    } finally {
      setIsUploadingBackgroundSoundtrack(false);
    }
  };

  const handleUploadBackgroundSoundtrackAddToLibrary = async (params: { file: File; title: string }) => {
    if (!user) {
      showAlert('You must be logged in to add a soundtrack.', { type: 'warning' });
      return;
    }
    const file = params.file;
    const title = String(params.title ?? '').trim();
    if (!file) return;
    if (!title) {
      showAlert('Please enter a title for this soundtrack.', { type: 'warning' });
      return;
    }

    setIsUploadingBackgroundSoundtrack(true);
    try {
      const form = new FormData();
      form.append('soundtrack', file);
      form.append('title', title);

      const res = await api.post<BackgroundSoundtrackItem>(
        '/background-soundtracks',
        form,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      const created = normalizeBackgroundSoundtrackItem(res.data);

      if (!created.id || !created.url) {
        throw new Error('Create succeeded but response was missing id/url');
      }

      setBackgroundSoundtracks((prev) => {
        const withoutDup = prev.filter((t) => t.id !== created.id);
        return [created, ...withoutDup];
      });
      setSelectedBackgroundSoundtrackValue(`lib:${created.id}`);
      showToast('Soundtrack added to your library.', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Add soundtrack to library failed', error);
      showAlert('Failed to add soundtrack. Please try again.', { type: 'error' });
    } finally {
      setIsUploadingBackgroundSoundtrack(false);
    }
  };

  const backgroundSoundtrackEditTarget = backgroundSoundtrackEditTargetId
    ? backgroundSoundtracks.find((item) => item.id === backgroundSoundtrackEditTargetId) ?? null
    : null;

  const handleOpenBackgroundSoundtrackEditor = (soundtrackId: string) => {
    const id = String(soundtrackId ?? '').trim();
    if (!id) return;
    setBackgroundSoundtrackEditTargetId(id);
  };

  const mergeBackgroundSoundtrackItemIntoState = (item: BackgroundSoundtrackItem) => {
    const nextItem = normalizeBackgroundSoundtrackItem(item);

    setBackgroundSoundtracks((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.id === nextItem.id);
      if (existingIndex === -1) return [nextItem, ...prev];

      return prev.map((entry) =>
        entry.id === nextItem.id
          ? {
            ...entry,
            ...nextItem,
          }
          : entry,
      );
    });
  };

  const revokeCachedBackgroundSoundtrackAssets = useCallback(
    (predicate?: (asset: MaterializedBackgroundSoundtrackAsset) => boolean) => {
      backgroundSoundtrackAssetCacheRef.current.forEach((asset, key) => {
        if (predicate && !predicate(asset)) return;

        try {
          URL.revokeObjectURL(asset.objectUrl);
        } catch {
          // ignore URL cleanup failures
        }

        backgroundSoundtrackAssetCacheRef.current.delete(key);
      });
    },
    [],
  );

  const buildBackgroundSoundtrackMaterializationCacheKey = useCallback(
    (item: BackgroundSoundtrackItem | null | undefined) => {
      const soundtrackId = String(item?.id ?? '').trim();
      const sourceUrl = String(item?.url ?? '').trim();
      if (!soundtrackId || !sourceUrl) return null;

      const normalizedAudioSettings = normalizeSoundEffectAudioSettings(
        item?.audio_settings ?? DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
      );
      if (
        areSoundEffectAudioSettingsEqual(
          normalizedAudioSettings,
          DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
        )
      ) {
        return null;
      }

      return JSON.stringify({
        soundtrackId,
        sourceUrl,
        audioSettings: normalizedAudioSettings,
      });
    },
    [],
  );

  const materializeBackgroundSoundtrackAsset = useCallback(
    async (item: BackgroundSoundtrackItem | null | undefined) => {
      const normalizedItem = item ? normalizeBackgroundSoundtrackItem(item) : null;
      const cacheKey = buildBackgroundSoundtrackMaterializationCacheKey(normalizedItem);
      if (!cacheKey || !normalizedItem?.url) {
        return null;
      }

      const cached = backgroundSoundtrackAssetCacheRef.current.get(cacheKey);
      if (cached) {
        return cached;
      }

      const inFlight = backgroundSoundtrackAssetInFlightRef.current.get(cacheKey);
      if (inFlight) {
        return await inFlight;
      }

      const request = (async () => {
        const rendered = await renderEditedAudioFile({
          sourceUrl: normalizedItem.url,
          values: {
            name: normalizedItem.title,
            volumePercent: 100,
            audioSettings:
              normalizedItem.audio_settings ?? DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
          },
          fallbackName: normalizedItem.title || 'background-soundtrack',
        });

        const asset: MaterializedBackgroundSoundtrackAsset = {
          cacheKey,
          soundtrackId: normalizedItem.id,
          sourceUrl: normalizedItem.url,
          title: normalizedItem.title,
          file: rendered.file,
          objectUrl: URL.createObjectURL(rendered.file),
        };

        backgroundSoundtrackAssetCacheRef.current.set(cacheKey, asset);
        return asset;
      })();

      backgroundSoundtrackAssetInFlightRef.current.set(cacheKey, request);

      try {
        return await request;
      } finally {
        if (backgroundSoundtrackAssetInFlightRef.current.get(cacheKey) === request) {
          backgroundSoundtrackAssetInFlightRef.current.delete(cacheKey);
        }
      }
    },
    [buildBackgroundSoundtrackMaterializationCacheKey],
  );

  const selectedBackgroundSoundtrackLibraryItem = useMemo(() => {
    const value = String(selectedBackgroundSoundtrackValue ?? '').trim();
    if (!value.startsWith('lib:')) return null;

    const soundtrackId = value.slice('lib:'.length);
    return backgroundSoundtracks.find((item) => item.id === soundtrackId) ?? null;
  }, [backgroundSoundtracks, selectedBackgroundSoundtrackValue]);

  const selectedBackgroundSoundtrackMaterializationCacheKey = useMemo(
    () =>
      buildBackgroundSoundtrackMaterializationCacheKey(
        selectedBackgroundSoundtrackLibraryItem,
      ),
    [
      buildBackgroundSoundtrackMaterializationCacheKey,
      selectedBackgroundSoundtrackLibraryItem,
    ],
  );

  const selectedBackgroundSoundtrackRequiresMaterialization = Boolean(
    selectedBackgroundSoundtrackMaterializationCacheKey,
  );

  useEffect(() => {
    if (!selectedBackgroundSoundtrackMaterializationCacheKey) {
      setActiveMaterializedBackgroundSoundtrack(null);
      setIsMaterializingBackgroundSoundtrack(false);
      return;
    }

    const cached = backgroundSoundtrackAssetCacheRef.current.get(
      selectedBackgroundSoundtrackMaterializationCacheKey,
    );
    if (cached) {
      setActiveMaterializedBackgroundSoundtrack(cached);
      setIsMaterializingBackgroundSoundtrack(false);
      return;
    }

    let cancelled = false;
    setIsMaterializingBackgroundSoundtrack(true);

    void materializeBackgroundSoundtrackAsset(selectedBackgroundSoundtrackLibraryItem)
      .then((asset) => {
        if (cancelled) return;
        setActiveMaterializedBackgroundSoundtrack(asset);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to materialize background soundtrack', error);
        setActiveMaterializedBackgroundSoundtrack(null);
        showToast(
          'Failed to prepare the edited soundtrack for preview. The raw track will stay selected.',
          'error',
        );
      })
      .finally(() => {
        if (cancelled) return;
        setIsMaterializingBackgroundSoundtrack(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    materializeBackgroundSoundtrackAsset,
    selectedBackgroundSoundtrackLibraryItem,
    selectedBackgroundSoundtrackMaterializationCacheKey,
    showToast,
  ]);

  useEffect(() => {
    const inFlightBackgroundSoundtrackAssets = backgroundSoundtrackAssetInFlightRef.current;

    return () => {
      inFlightBackgroundSoundtrackAssets.clear();
      revokeCachedBackgroundSoundtrackAssets();
    };
  }, [revokeCachedBackgroundSoundtrackAssets]);

  const applyBackgroundSoundtrackEditsLocally = async (values: SoundEffectEditValues) => {
    const target = backgroundSoundtrackEditTarget;
    if (!target?.id) return;

    setIsApplyingBackgroundSoundtrackEdit(true);
    try {
      const normalizedAudioSettings = normalizeSoundEffectAudioSettings(values.audioSettings);

      const nextItem = normalizeBackgroundSoundtrackItem({
        ...target,
        title: String(values.name ?? '').trim() || target.title,
        volume_percent: Math.max(0, Math.min(300, Number(values.volumePercent) || 100)),
        audio_settings: normalizedAudioSettings,
      });

      revokeCachedBackgroundSoundtrackAssets(
        (asset) => asset.soundtrackId === nextItem.id,
      );
      mergeBackgroundSoundtrackItemIntoState(nextItem);
      setBackgroundSoundtrackVolumePercent(Math.max(0, Math.min(300, Number(values.volumePercent) || 100)));

      if (`lib:${nextItem.id}` === String(selectedBackgroundSoundtrackValue ?? '').trim()) {
        const materialized = await materializeBackgroundSoundtrackAsset(nextItem);
        setActiveMaterializedBackgroundSoundtrack(materialized);
      }

      setBackgroundSoundtrackEditTargetId(null);
      showToast('Background soundtrack changes applied to this draft.', 'success');
    } finally {
      setIsApplyingBackgroundSoundtrackEdit(false);
    }
  };

  const saveBackgroundSoundtrackEdits = async (values: SoundEffectEditValues) => {
    const target = backgroundSoundtrackEditTarget;
    if (!target?.id) return;

    setIsSavingBackgroundSoundtrackEdit(true);
    try {
      const response = await api.patch<BackgroundSoundtrackItem>(
        `/background-soundtracks/${encodeURIComponent(target.id)}`,
        {
          title: String(values.name ?? '').trim(),
          volumePercent: Math.max(0, Math.min(300, Number(values.volumePercent) || 100)),
          audioSettings: normalizeSoundEffectAudioSettings(values.audioSettings),
        },
      );

      const updated = normalizeBackgroundSoundtrackItem(response.data);
      revokeCachedBackgroundSoundtrackAssets(
        (asset) => asset.soundtrackId === updated.id,
      );
      mergeBackgroundSoundtrackItemIntoState(updated);
      setSelectedBackgroundSoundtrackValue(`lib:${updated.id}`);
      setBackgroundSoundtrackVolumePercent(updated.volume_percent ?? 100);

      const materialized = await materializeBackgroundSoundtrackAsset(updated);
      setActiveMaterializedBackgroundSoundtrack(materialized);

      setBackgroundSoundtrackEditTargetId(null);
      showToast('Background soundtrack updated.', 'success');
    } catch (error) {
      console.error('Failed to update background soundtrack', error);
      showAlert(getRequestErrorMessage(error, 'Failed to update background soundtrack.'), {
        type: 'error',
      });
    } finally {
      setIsSavingBackgroundSoundtrackEdit(false);
    }
  };

  const saveBackgroundSoundtrackAsPreset = async (values: SoundEffectEditValues) => {
    const target = backgroundSoundtrackEditTarget;
    if (!target?.id) return;

    setIsSavingBackgroundSoundtrackPreset(true);
    try {
      const response = await api.post<BackgroundSoundtrackItem>(
        `/background-soundtracks/${encodeURIComponent(target.id)}/presets`,
        {
          title: String(values.name ?? '').trim(),
          volumePercent: Math.max(0, Math.min(300, Number(values.volumePercent) || 100)),
          audioSettings: normalizeSoundEffectAudioSettings(values.audioSettings),
        },
      );

      const created = normalizeBackgroundSoundtrackItem(response.data);
      revokeCachedBackgroundSoundtrackAssets(
        (asset) => asset.soundtrackId === created.id,
      );
      mergeBackgroundSoundtrackItemIntoState(created);
      setSelectedBackgroundSoundtrackValue(`lib:${created.id}`);
      setBackgroundSoundtrackVolumePercent(created.volume_percent ?? 100);

      const materialized = await materializeBackgroundSoundtrackAsset(created);
      setActiveMaterializedBackgroundSoundtrack(materialized);

      setBackgroundSoundtrackEditTargetId(null);
      showToast('Background soundtrack preset saved.', 'success');
    } catch (error) {
      console.error('Failed to save background soundtrack preset', error);
      showAlert(getRequestErrorMessage(error, 'Failed to save background soundtrack preset.'), {
        type: 'error',
      });
    } finally {
      setIsSavingBackgroundSoundtrackPreset(false);
    }
  };

  const handleSetFavoriteVoice = async (voiceId: string) => {
    if (!user) {
      showAlert('You must be logged in to set a favorite voice.', { type: 'warning' });
      return;
    }

    try {
      setIsSettingFavoriteVoice(true);
      await api.patch(`/voice-overs/favorite/${encodeURIComponent(voiceId)}`);
      await fetchProviderVoices(voiceProvider);

      showToast('Favorite voice updated', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to set favorite voice', error);
      showToast('Failed to set favorite voice', 'error');
    }
    finally {
      setIsSettingFavoriteVoice(false);
    }
  };

  const handleOpenScriptReferences = () => {
    setIsScriptReferencesOpen(true);
  };

  const handleApplyReferenceScripts = (scripts: ScriptReferenceDto[]) => {
    const normalized: ReferenceScriptPayload[] = (scripts ?? [])
      .filter((s) => Boolean(s?.id) && Boolean(s?.script?.trim()))
      .map((s) => ({
        id: s.id,
        title: s.title ?? null,
        script: s.script,
      }));
    setReferenceScripts(normalized);
    showToast(
      normalized.length > 0
        ? `Selected ${normalized.length} reference script${normalized.length === 1 ? '' : 's'}`
        : 'No reference scripts selected',
      'success',
    );
  };

  const handleRemoveReferenceScript = (id: string) => {
    setReferenceScripts((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearReferenceScripts = () => {
    setReferenceScripts([]);
  };

  useEffect(() => {
    // Prefetch both providers so switching is instant.
    void Promise.all([fetchProviderVoices('google'), fetchProviderVoices('elevenlabs')]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authenticatedUserId) {
      generateLibrariesBootstrapRef.current = {
        userId: null,
        status: 'idle',
      };
      setBackgroundSoundtracks([]);
      setBackgroundSoundtracksError(null);
      setIsLoadingBackgroundSoundtracks(false);
      setSelectedBackgroundSoundtrackValue('__default__');
      setBackgroundSoundtrackVolumePercent(100);
      setImageFilterPresets([]);
      setMotionEffectPresets([]);
      setTextAnimationPresets([]);
      setOverlayPresets([]);
      setIsLoadingImageFilterPresets(false);
      setIsLoadingMotionEffectPresets(false);
      setIsLoadingTextAnimationPresets(false);
      setIsLoadingOverlayPresets(false);
      return;
    }

    const bootstrapState = generateLibrariesBootstrapRef.current;
    if (
      bootstrapState.userId === authenticatedUserId &&
      bootstrapState.status !== 'idle'
    ) {
      return;
    }

    bootstrapState.userId = authenticatedUserId;
    bootstrapState.status = 'loading';

    let cancelled = false;

    const bootstrapLibraries = async () => {
      await Promise.all([
        fetchBackgroundSoundtracks(),
        fetchImageFilterPresets(),
        fetchMotionEffectPresets(),
        fetchTextAnimationPresets(),
        fetchOverlayPresets(),
      ]);

      if (cancelled) return;
      if (generateLibrariesBootstrapRef.current.userId !== authenticatedUserId) {
        return;
      }

      generateLibrariesBootstrapRef.current.status = 'loaded';
    };

    void bootstrapLibraries();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticatedUserId]);

  const stopVoicePreview = () => {
    try {
      previewAbortRef.current?.abort();
    } catch {
      // ignore
    }
    previewAbortRef.current = null;

    try {
      previewAudioRef.current?.pause();
    } catch {
      // ignore
    }
    previewAudioRef.current = null;

    if (previewAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(previewAudioUrlRef.current);
      } catch {
        // ignore
      }
    }
    previewAudioUrlRef.current = null;
  };

  useEffect(() => {
    // Switching providers should stop any currently playing preview.
    stopVoicePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceProvider]);

  useEffect(() => {
    return () => {
      stopVoicePreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreviewVoice = async (voiceId: string) => {
    if (!voiceId) return;

    // Stop any previous preview first.
    stopVoicePreview();
    setIsPreviewingVoice(true);

    const controller = new AbortController();
    previewAbortRef.current = controller;

    try {
      const style =
        voiceProvider === 'google'
          ? String(aiStudioStyleInstructions ?? '').trim()
          : '';

      // If the user provided style instructions, generate a fresh preview so the audio matches.
      // Otherwise use the cached managed preview URL endpoint.
      if (voiceProvider === 'google' && style) {
        const previewText = 'Hello! This is a short preview of the selected voice.';

        const response = await fetch(`${API_URL}/ai/generate-voice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            script: previewText,
            voiceId,
            styleInstructions: style,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate preview');
        }

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type');
        const mimeType = contentType || 'audio/wav';

        const blob = new Blob([arrayBuffer], { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        previewAudioUrlRef.current = objectUrl;

        const audio = new Audio(objectUrl);
        previewAudioRef.current = audio;
        audio.addEventListener(
          'ended',
          () => {
            stopVoicePreview();
          },
          { once: true },
        );
        audio.addEventListener(
          'error',
          () => {
            stopVoicePreview();
          },
          { once: true },
        );

        await audio.play();
        return;
      }

      const response = await api.post<{ preview_url?: string }>(
        `/voice-overs/preview/${encodeURIComponent(voiceId)}`,
        undefined,
        {
          signal: controller.signal,
        },
      );

      const url = String(response.data?.preview_url ?? '').trim();
      if (!url) {
        throw new Error('Missing preview_url from server');
      }

      // Cache the URL locally so next preview can play instantly.
      setVoicesByProvider((prev) => {
        const next = { ...prev } as typeof prev;
        const providerKey = voiceProvider;
        const list = next[providerKey];
        if (!Array.isArray(list) || list.length === 0) return prev;
        next[providerKey] = list.map((v) =>
          v.voice_id === voiceId ? { ...v, preview_url: url } : v,
        );
        return next;
      });

      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.addEventListener(
        'ended',
        () => {
          stopVoicePreview();
        },
        { once: true },
      );
      audio.addEventListener(
        'error',
        () => {
          stopVoicePreview();
        },
        { once: true },
      );

      await audio.play();
    } catch (error) {
      const isAbortError =
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        (error as { name?: unknown }).name === 'AbortError';

      if (!isAbortError) {
        console.error('Voice preview failed', error);
        showToast('Failed to preview voice. Please try again.', 'error');
      }
      stopVoicePreview();
    } finally {
      setIsPreviewingVoice(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...newFiles]);
    }
  };

  const handleVoiceUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      stopVoicePreview();
      const file = e.target.files[0];
      setVoiceOver(file);
      setVoiceOverChunks([]);
      setVoiceDuration(null);
      setSavedVoiceId(null);
      setVoiceLibraryUrl(null);

      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        if (!Number.isNaN(audio.duration) && audio.duration > 0) {
          setVoiceDuration(audio.duration);
        }
      });
    }
  };

  const applyGeneratedVoiceResultToState = (result: GeneratedVoiceFileResult) => {
    setVoiceOver(result.file);
    setVoiceOverChunks(
      result.chunks.length > 1 ? cloneVoiceOverChunks(result.chunks) : [],
    );
    setVoiceDuration(
      typeof result.durationSeconds === 'number' && result.durationSeconds > 0
        ? result.durationSeconds
        : null,
    );
    setSavedVoiceId(null);
    setVoiceLibraryUrl(null);
  };

  const buildSentenceVoiceOverrideFiles = (
    candidateBySentenceId:
      | Record<string, SentenceVoiceCandidate | null | undefined>
      | null
      | undefined,
  ) => {
    const entries = Object.entries(candidateBySentenceId ?? {}).flatMap(
      ([sentenceId, candidate]) => (candidate?.file ? [[sentenceId, candidate.file] as const] : []),
    );

    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  };

  const rebuildMergedSentenceVoiceOverPreview = async (
    sourceSentences: SentenceItem[],
    fallbackBaseName = `${voiceProvider}-voice-over`,
    candidateBySentenceId = sentenceVoiceCandidateByIdRef.current,
  ) => {
    const rebuilt = await rebuildVoiceOverFromSentenceVoices({
      sourceSentences,
      fallbackBaseName,
      overrideFilesBySentenceId: buildSentenceVoiceOverrideFiles(candidateBySentenceId),
    });

    if (!rebuilt) {
      return null;
    }

    applyGeneratedVoiceResultToState(rebuilt);
    return rebuilt;
  };

  const disposeSentenceVoiceCandidate = (candidate: SentenceVoiceCandidate | null | undefined) => {
    if (!candidate?.previewUrl) return;
    URL.revokeObjectURL(candidate.previewUrl);
  };

  const disposeChunkVoiceCandidate = (candidate: SentenceVoiceCandidate | null | undefined) => {
    disposeSentenceVoiceCandidate(candidate);
  };

  const generateVoicePerSentence = async (voiceId: string) => {
    const sentenceEntries = sentences
      .map((sentence, index) => ({ sentence, index }))
      .filter(({ sentence }) => String(sentence.text ?? '').trim());

    if (sentenceEntries.length === 0) {
      throw new Error('No sentence text is available for sentence-level voice generation.');
    }

    const nextSentences = [...sentences];
    const generatedFiles: File[] = [];
    const generatedDurations: number[] = [];
    const failedSentenceLabels: string[] = [];
    const selectedVoice = findVoiceOption(voiceProvider, voiceId);

    for (let index = 0; index < sentenceEntries.length; index += 1) {
      const entry = sentenceEntries[index];
      const sentenceText = String(entry.sentence.text ?? '').trim();
      setVoiceGenerationProgress({
        stage: 'generating',
        current: index + 1,
        total: sentenceEntries.length,
      });

      try {
        const googleStyleInstructions =
          voiceProvider === 'google'
            ? String(entry.sentence.voiceOverStyleInstructions ?? '').trim() ||
            String(aiStudioStyleInstructions ?? '').trim() ||
            undefined
            : undefined;

        const generated = await requestGeneratedVoiceFile({
          scriptForVoice: sentenceText,
          sentencesForVoice: [sentenceText],
          voiceId,
          provider: voiceProvider,
          styleInstructions: googleStyleInstructions,
          elevenLabsModel:
            voiceProvider === 'elevenlabs'
              ? normalizeElevenLabsModel(
                entry.sentence.elevenLabsModel ?? elevenLabsGlobalModel,
              )
              : undefined,
          elevenLabsSettings:
            voiceProvider === 'elevenlabs'
              ? entry.sentence.elevenLabsSettings ?? elevenLabsGlobalSettings
              : undefined,
          fallbackBaseName: `${voiceProvider}-sentence-${index + 1}`,
          errorMessage: `Failed to generate voice for sentence ${index + 1}.`,
        });

        generatedFiles.push(generated.file);
        if (
          typeof generated.durationSeconds === 'number' &&
          generated.durationSeconds > 0
        ) {
          generatedDurations.push(generated.durationSeconds);
        }

        nextSentences[entry.index] = buildLocalSentenceVoiceState({
          sentence: entry.sentence,
          file: generated.file,
          mimeType: generated.mimeType,
          durationSeconds: generated.durationSeconds,
          provider: voiceProvider,
          providerVoiceId: voiceId,
          providerVoiceName: selectedVoice?.name ?? null,
          styleInstructions: googleStyleInstructions ?? null,
        });
      } catch (error) {
        console.error(`Sentence ${index + 1} voice generation failed`, error);
        failedSentenceLabels.push(`Sentence ${index + 1}`);
      }
    }

    if (failedSentenceLabels.length > 0) {
      showAlert(
        `${failedSentenceLabels.join(', ')} failed to generate. The merged voice-over was built from the successful sentence clips only.`,
        { type: 'warning' },
      );
    }

    const availableSentenceVoices = nextSentences.filter((sentence) =>
      hasSentenceVoiceOver(sentence),
    );
    if (availableSentenceVoices.length === 0) {
      throw new Error('All sentence voice generations failed.');
    }

    setVoiceGenerationProgress({
      stage: 'merging',
      current: availableSentenceVoices.length,
      total: availableSentenceVoices.length,
    });

    if (generatedFiles.length === 0) {
      const rebuilt = await rebuildVoiceOverFromSentenceVoices({
        sourceSentences: nextSentences,
        fallbackBaseName: `${voiceProvider}-voice-over`,
      });
      if (!rebuilt) {
        throw new Error('All sentence voice generations failed.');
      }
      setSentences(nextSentences);
      applyGeneratedVoiceResultToState(rebuilt);
      return;
    }

    const merged: GeneratedVoiceFileResult =
      generatedFiles.length === 1
        ? {
          file: generatedFiles[0],
          durationSeconds:
            generatedDurations.length === 1 ? generatedDurations[0] : null,
          mimeType: generatedFiles[0]?.type || 'audio/mpeg',
          chunks: [],
        }
        : {
          ...(await mergeGeneratedVoiceChunks({
            files: generatedFiles,
            provider: voiceProvider,
            fallbackBaseName: `${voiceProvider}-voice-over`,
          })),
          chunks: [],
        };

    setSentences(nextSentences);
    applyGeneratedVoiceResultToState(merged);
  };

  const handleGenerateSentenceVoiceStyle = async (sentenceId: string) => {
    const sentence = sentences.find((item) => item.id === sentenceId);
    if (!sentence || !String(sentence.text ?? '').trim()) {
      showAlert('This sentence is empty.', { type: 'warning' });
      return;
    }

    setIsGeneratingSentenceVoiceStyleById((prev) => ({
      ...prev,
      [sentenceId]: true,
    }));
    patchSentenceById(sentenceId, { voiceOverStyleInstructions: '' });

    try {
      const response = await fetch(`${API_URL}/ai/generate-voice-style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: String(sentence.text ?? '').trim(),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to generate sentence style instructions');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        acc += chunk;
        patchSentenceById(sentenceId, {
          voiceOverStyleInstructions: acc,
        });
      }
    } catch (error) {
      console.error('Sentence voice style generation failed', error);
      showToast('Failed to generate sentence style.', 'error');
    } finally {
      setIsGeneratingSentenceVoiceStyleById((prev) => ({
        ...prev,
        [sentenceId]: false,
      }));
    }
  };

  const generateSentenceVoiceClip = async (sentence: SentenceItem) => {
    const sentenceText = String(sentence.text ?? '').trim();
    if (!sentenceText) {
      throw new Error('This sentence is empty.');
    }

    const sentenceProvider = sentence.voiceOverProvider ?? voiceProvider;
    const voiceId =
      String(sentence.voiceOverVoiceId ?? '').trim() ||
      selectedVoiceIdByProvider[sentenceProvider];
    if (!voiceId) {
      throw new Error('Please select a voice before generating a sentence.');
    }

    const selectedVoice = findVoiceOption(sentenceProvider, voiceId);
    const googleStyleInstructions =
      sentenceProvider === 'google'
        ? String(sentence.voiceOverStyleInstructions ?? '').trim() ||
        String(aiStudioStyleInstructions ?? '').trim() ||
        undefined
        : undefined;

    const generated = await requestGeneratedVoiceFile({
      scriptForVoice: sentenceText,
      sentencesForVoice: [sentenceText],
      voiceId,
      provider: sentenceProvider,
      styleInstructions: googleStyleInstructions,
      elevenLabsModel:
        sentenceProvider === 'elevenlabs'
          ? normalizeElevenLabsModel(
            sentence.elevenLabsModel ?? elevenLabsGlobalModel,
          )
          : undefined,
      elevenLabsSettings:
        sentenceProvider === 'elevenlabs'
          ? sentence.elevenLabsSettings ?? elevenLabsGlobalSettings
          : undefined,
      fallbackBaseName: `${sentenceProvider}-${sentence.id}`,
      errorMessage: 'Failed to regenerate sentence voice.',
    });

    return {
      generated,
      provider: sentenceProvider,
      voiceId,
      voiceName:
        String(sentence.voiceOverVoiceName ?? '').trim() || selectedVoice?.name || null,
      styleInstructions: googleStyleInstructions ?? null,
      shouldAttachDirectly: !hasSentenceVoiceOver(sentence),
    };
  };

  const buildSentenceVoiceCandidate = (
    generatedVoice: Awaited<ReturnType<typeof generateSentenceVoiceClip>>,
  ): SentenceVoiceCandidate => ({
    file: generatedVoice.generated.file,
    previewUrl: URL.createObjectURL(generatedVoice.generated.file),
    durationSeconds: generatedVoice.generated.durationSeconds,
    mimeType: generatedVoice.generated.mimeType,
    provider: generatedVoice.provider,
    voiceId: generatedVoice.voiceId,
    voiceName: generatedVoice.voiceName,
  });

  const applyGeneratedSentenceVoiceToSentences = (
    sourceSentences: SentenceItem[],
    sentenceId: string,
    generatedVoice: Awaited<ReturnType<typeof generateSentenceVoiceClip>>,
  ) =>
    sourceSentences.map((item) =>
      item.id === sentenceId
        ? buildLocalSentenceVoiceState({
          sentence: item,
          file: generatedVoice.generated.file,
          mimeType: generatedVoice.generated.mimeType,
          durationSeconds: generatedVoice.generated.durationSeconds,
          provider: generatedVoice.provider,
          providerVoiceId: generatedVoice.voiceId,
          providerVoiceName: generatedVoice.voiceName,
          styleInstructions: generatedVoice.styleInstructions,
        })
        : item,
    );

  const replaceSentenceVoiceCandidate = (
    sentenceId: string,
    candidate: SentenceVoiceCandidate | null,
  ) => {
    setSentenceVoiceCandidateById((prev) => {
      const previousCandidate = prev[sentenceId] ?? null;
      if (!previousCandidate && !candidate) {
        return prev;
      }

      disposeSentenceVoiceCandidate(previousCandidate);
      return {
        ...prev,
        [sentenceId]: candidate,
      };
    });
  };

  const handleRegenerateSentenceVoice = async (sentenceId: string) => {
    const sentence = sentences.find((item) => item.id === sentenceId);
    if (!sentence || !String(sentence.text ?? '').trim()) {
      showAlert('This sentence is empty.', { type: 'warning' });
      return;
    }

    const sentenceProvider = sentence.voiceOverProvider ?? voiceProvider;
    const voiceId =
      String(sentence.voiceOverVoiceId ?? '').trim() ||
      selectedVoiceIdByProvider[sentenceProvider];
    if (!voiceId) {
      showAlert('Please select a voice before regenerating a sentence.', {
        type: 'warning',
      });
      return;
    }

    setIsRegeneratingSentenceVoiceById((prev) => ({
      ...prev,
      [sentenceId]: true,
    }));

    try {
      const generatedVoice = await generateSentenceVoiceClip(sentence);

      if (generatedVoice.shouldAttachDirectly) {
        const merged = await rebuildVoiceOverFromSentenceVoices({
          sourceSentences: sentences,
          fallbackBaseName: `${voiceProvider}-voice-over`,
          overrideFilesBySentenceId: {
            [sentenceId]: generatedVoice.generated.file,
          },
        });

        if (!merged) {
          throw new Error('Failed to rebuild the merged voice-over.');
        }

        const nextSentences = applyGeneratedSentenceVoiceToSentences(
          sentences,
          sentenceId,
          generatedVoice,
        );

        setSentences(nextSentences);
        applyGeneratedVoiceResultToState(merged);
        handleCancelSentenceVoiceCandidate(sentenceId);
        return;
      }

      replaceSentenceVoiceCandidate(
        sentenceId,
        buildSentenceVoiceCandidate(generatedVoice),
      );
    } catch (error) {
      console.error('Sentence voice regeneration failed', error);
      showToast('Failed to regenerate sentence voice.', 'error');
    } finally {
      setIsRegeneratingSentenceVoiceById((prev) => ({
        ...prev,
        [sentenceId]: false,
      }));
    }
  };

  const handleCancelSentenceVoiceCandidate = (sentenceId: string) => {
    const nextCandidateBySentenceId = {
      ...sentenceVoiceCandidateByIdRef.current,
      [sentenceId]: null,
    };

    replaceSentenceVoiceCandidate(sentenceId, null);

    if (!sentences.some((sentence) => hasSentenceVoiceOver(sentence))) {
      return;
    }

    void rebuildMergedSentenceVoiceOverPreview(
      sentences,
      `${voiceProvider}-voice-over`,
      nextCandidateBySentenceId,
    ).catch((error) => {
      console.error('Failed to rebuild the sentence voice-over preview after cancel', error);
      showToast('Failed to update the merged voice-over preview.', 'error');
    });
  };

  const handleApplySentenceVoiceCandidate = async (sentenceId: string) => {
    const candidate = sentenceVoiceCandidateById[sentenceId];
    const sentence = sentences.find((item) => item.id === sentenceId);
    if (!candidate || !sentence) return;

    setIsApplyingSentenceVoiceCandidateById((prev) => ({
      ...prev,
      [sentenceId]: true,
    }));

    try {
      const nextSentences = sentences.map((item) =>
        item.id === sentenceId
          ? buildLocalSentenceVoiceState({
            sentence: item,
            file: candidate.file,
            mimeType: candidate.mimeType,
            durationSeconds: candidate.durationSeconds,
            provider: candidate.provider,
            providerVoiceId: candidate.voiceId,
            providerVoiceName: candidate.voiceName,
            styleInstructions: item.voiceOverStyleInstructions,
          })
          : item,
      );

      const nextCandidateBySentenceId = {
        ...sentenceVoiceCandidateByIdRef.current,
        [sentenceId]: null,
      };

      const merged = await rebuildMergedSentenceVoiceOverPreview(
        nextSentences,
        `${voiceProvider}-voice-over`,
        nextCandidateBySentenceId,
      );

      if (!merged) {
        throw new Error('Failed to rebuild the merged voice-over.');
      }

      setSentences(nextSentences);
      replaceSentenceVoiceCandidate(sentenceId, null);
    } catch (error) {
      console.error('Applying sentence voice candidate failed', error);
      showToast('Failed to replace the sentence voice.', 'error');
    } finally {
      setIsApplyingSentenceVoiceCandidateById((prev) => ({
        ...prev,
        [sentenceId]: false,
      }));
    }
  };

  const runGenerateAllSentenceVoices = async (sentenceIds: string[]) => {
    if (!sentenceIds.length || isGeneratingAllSentenceVoices) return;

    const sourceSentences = sentences;
    let nextSentences = sourceSentences;
    const nextCandidateBySentenceId = { ...sentenceVoiceCandidateByIdRef.current };
    let didGenerateSentenceVoice = false;
    const failedSentenceLabels: string[] = [];

    setIsGeneratingAllSentenceVoices(true);

    try {
      for (const sentenceId of sentenceIds) {
        const sentenceIndex = nextSentences.findIndex((item) => item.id === sentenceId);
        if (sentenceIndex < 0) continue;

        const sentence = nextSentences[sentenceIndex];
        const sentenceLabel = `Sentence ${sentenceIndex + 1}`;

        setIsRegeneratingSentenceVoiceById((prev) => ({
          ...prev,
          [sentenceId]: true,
        }));

        try {
          const generatedVoice = await generateSentenceVoiceClip(sentence);

          if (generatedVoice.shouldAttachDirectly) {
            nextSentences = applyGeneratedSentenceVoiceToSentences(
              nextSentences,
              sentenceId,
              generatedVoice,
            );
            didGenerateSentenceVoice = true;
            nextCandidateBySentenceId[sentenceId] = null;
            setSentences(nextSentences);
            replaceSentenceVoiceCandidate(sentenceId, null);
          } else {
            const nextCandidate = buildSentenceVoiceCandidate(generatedVoice);
            didGenerateSentenceVoice = true;
            nextCandidateBySentenceId[sentenceId] = nextCandidate;
            replaceSentenceVoiceCandidate(
              sentenceId,
              nextCandidate,
            );
          }
        } catch (error) {
          console.error(`${sentenceLabel} voice generation failed`, error);
          failedSentenceLabels.push(sentenceLabel);
        } finally {
          setIsRegeneratingSentenceVoiceById((prev) => ({
            ...prev,
            [sentenceId]: false,
          }));
        }
      }

      if (didGenerateSentenceVoice) {
        setSentences(nextSentences);

        const merged = await rebuildMergedSentenceVoiceOverPreview(
          nextSentences,
          `${voiceProvider}-voice-over`,
          nextCandidateBySentenceId,
        );
        if (!merged) {
          throw new Error('Failed to rebuild the merged voice-over.');
        }
      }

      if (failedSentenceLabels.length > 0) {
        showAlert(
          `${failedSentenceLabels.join(', ')} failed to generate. Successful sentence voices were kept.`,
          { type: 'warning' },
        );
      }
    } catch (error) {
      console.error('Generate all sentence voices failed', error);
      showToast('Failed to generate all sentence voices.', 'error');
    } finally {
      setIsGeneratingAllSentenceVoices(false);
    }
  };

  const handleGenerateAllSentenceVoices = async () => {
    if (isGeneratingAllSentenceVoices) return;

    const eligibleSentenceIds = sentences
      .filter((sentence) => String(sentence.text ?? '').trim())
      .map((sentence) => sentence.id);

    if (!eligibleSentenceIds.length) {
      showAlert('No sentence text is available for voice generation.', {
        type: 'warning',
      });
      return;
    }

    const missingSentenceIds = eligibleSentenceIds.filter((sentenceId) => {
      const sentence = sentences.find((item) => item.id === sentenceId);
      if (!sentence) {
        return false;
      }

      return !hasSentenceVoiceOver(sentence);
    });
    const existingCount = eligibleSentenceIds.length - missingSentenceIds.length;

    if (!missingSentenceIds.length) {
      setGenerateAllSentenceVoicesConfirm({
        kind: 'all',
        eligibleSentenceIds,
        missingSentenceIds: [],
        existingCount: eligibleSentenceIds.length,
        missingCount: 0,
      });
      return;
    }

    if (existingCount > 0) {
      setGenerateAllSentenceVoicesConfirm({
        kind: 'some',
        eligibleSentenceIds,
        missingSentenceIds,
        existingCount,
        missingCount: missingSentenceIds.length,
      });
      return;
    }

    await runGenerateAllSentenceVoices(missingSentenceIds);
  };

  const handleDownloadAllSentenceVoices = async () => {
    if (typeof window === 'undefined') {
      showToast('Voice download is only available in the browser.', 'error');
      return;
    }

    const sentenceEntries = sentences
      .map((sentence, index) => ({ sentence, index }))
      .filter(({ sentence }) => String(sentence.text ?? '').trim())
      .filter(({ sentence }) => hasSentenceVoiceOver(sentence));

    if (!sentenceEntries.length) {
      showAlert('No sentence voices are attached yet.', { type: 'warning' });
      return;
    }

    let directoryHandle: FileSystemDirectoryHandleLike | null = null;
    if (sentenceEntries.length > LARGE_BATCH_DOWNLOAD_THRESHOLD) {
      if (supportsDirectoryPicker(window)) {
        try {
          const windowWithDirectoryPicker = window as WindowWithDirectoryPicker;
          directoryHandle = await windowWithDirectoryPicker.showDirectoryPicker!({
            id: 'sentence-voice-downloads',
            mode: 'readwrite',
          });
        } catch (error) {
          if (isDirectoryPickerCancelError(error)) {
            showToast('Sentence voice download canceled.', 'info');
            return;
          }

          console.error('Opening sentence voice download folder failed', error);
          showToast('Failed to choose a folder for sentence voice downloads.', 'error');
          return;
        }
      } else {
        showAlert(
          'Your browser may limit large automatic download batches. Use a Chromium browser to save all sentence voices into a folder.',
          { type: 'warning' },
        );
      }
    }

    const failedSentenceLabels: string[] = [];

    for (const entry of sentenceEntries) {
      try {
        const sourceFile =
          entry.sentence.voiceOverFile ??
          (String(entry.sentence.voiceOverUrl ?? '').trim()
            ? await downloadUrlAsFile(
              String(entry.sentence.voiceOverUrl ?? '').trim(),
              `sentence-${entry.index + 1}-voice-over.mp3`,
            )
            : null);

        if (!sourceFile) {
          throw new Error('Missing sentence voice file.');
        }

        const extension =
          fileExtensionFromName(sourceFile.name) ||
          extensionFromAudioMimeType(sourceFile.type) ||
          'mp3';
        const targetFileName = `${entry.index + 1}-sentence-voice.${extension}`;

        if (directoryHandle) {
          await saveBlobToDirectory(directoryHandle, sourceFile, targetFileName);
        } else {
          downloadBlobAsFile(sourceFile, targetFileName);
        }
      } catch (error) {
        console.error(`Sentence ${entry.index + 1} voice download failed`, error);
        failedSentenceLabels.push(`Sentence ${entry.index + 1}`);
      }
    }

    const successCount = sentenceEntries.length - failedSentenceLabels.length;
    if (successCount > 0) {
      showToast(
        directoryHandle
          ? `Saved ${successCount} sentence voice${successCount === 1 ? '' : 's'} to the selected folder.`
          : `Started ${successCount} sentence voice download${successCount === 1 ? '' : 's'}.`,
        failedSentenceLabels.length > 0 ? 'warning' : 'success',
      );
    }

    if (failedSentenceLabels.length > 0) {
      showAlert(`${failedSentenceLabels.join(', ')} failed to download.`, {
        type: 'warning',
      });
    }
  };

  const handleDownloadSentenceVoice = async (
    sentenceId: string,
    source: SentenceVoiceDownloadSource,
  ) => {
    if (typeof window === 'undefined') {
      showToast('Voice download is only available in the browser.', 'error');
      return;
    }

    const sentenceIndex = sentences.findIndex((item) => item.id === sentenceId);
    if (sentenceIndex < 0) {
      showAlert('This sentence could not be found.', { type: 'warning' });
      return;
    }

    const sentence = sentences[sentenceIndex];
    const previewCandidate = sentenceVoiceCandidateById[sentenceId] ?? null;

    try {
      const sourceFile =
        source === 'preview'
          ? previewCandidate?.file ?? null
          : sentence.voiceOverFile ??
          (String(sentence.voiceOverUrl ?? '').trim()
            ? await downloadUrlAsFile(
              String(sentence.voiceOverUrl ?? '').trim(),
              `sentence-${sentenceIndex + 1}-voice-over.mp3`,
            )
            : null);

      if (!sourceFile) {
        showAlert(
          source === 'preview'
            ? 'No preview voice is available to download for this sentence.'
            : 'No attached voice is available to download for this sentence.',
          { type: 'warning' },
        );
        return;
      }

      const extension =
        fileExtensionFromName(sourceFile.name) ||
        extensionFromAudioMimeType(sourceFile.type) ||
        'mp3';
      const targetFileName =
        source === 'preview'
          ? `${sentenceIndex + 1}-sentence-preview-voice.${extension}`
          : `${sentenceIndex + 1}-sentence-voice.${extension}`;

      downloadBlobAsFile(sourceFile, targetFileName);
    } catch (error) {
      console.error(`Sentence ${sentenceIndex + 1} voice download failed`, error);
      showToast('Failed to download the sentence voice.', 'error');
    }
  };

  const handleGenerateChunkVoiceStyle = async (chunkId: string) => {
    const chunk = voiceOverChunks.find((item) => String(item.index) === chunkId);
    if (!chunk || !String(chunk.text ?? '').trim()) {
      showAlert('This chunk is empty.', { type: 'warning' });
      return;
    }

    setIsGeneratingChunkVoiceStyleById((prev) => ({
      ...prev,
      [chunkId]: true,
    }));
    setVoiceOverChunks((prev) =>
      prev.map((item) =>
        String(item.index) === chunkId ? { ...item, styleInstructions: '' } : item,
      ),
    );

    try {
      const response = await fetch(`${API_URL}/ai/generate-voice-style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: String(chunk.text ?? '').trim(),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to generate chunk style instructions');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunkText = decoder.decode(value, { stream: true });
        if (!chunkText) continue;
        acc += chunkText;
        setVoiceOverChunks((prev) =>
          prev.map((item) =>
            String(item.index) === chunkId
              ? { ...item, styleInstructions: acc }
              : item,
          ),
        );
      }
    } catch (error) {
      console.error('Chunk voice style generation failed', error);
      showToast('Failed to generate chunk style.', 'error');
    } finally {
      setIsGeneratingChunkVoiceStyleById((prev) => ({
        ...prev,
        [chunkId]: false,
      }));
    }
  };

  const handleRegenerateChunkVoice = async (chunkId: string) => {
    const chunk = voiceOverChunks.find((item) => String(item.index) === chunkId);
    if (!chunk || !String(chunk.text ?? '').trim()) {
      showAlert('This chunk is empty.', { type: 'warning' });
      return;
    }

    const chunkProvider = normalizeVoiceProvider(chunk.provider);
    const voiceId =
      String(chunk.providerVoiceId ?? '').trim() ||
      selectedVoiceIdByProvider[chunkProvider];
    if (!voiceId) {
      showAlert('Please select a voice before regenerating a chunk.', {
        type: 'warning',
      });
      return;
    }

    const selectedVoice = findVoiceOption(chunkProvider, voiceId);

    setIsRegeneratingChunkVoiceById((prev) => ({
      ...prev,
      [chunkId]: true,
    }));

    try {
      const googleStyleInstructions =
        chunkProvider === 'google'
          ? String(chunk.styleInstructions ?? '').trim() ||
          String(aiStudioStyleInstructions ?? '').trim() ||
          undefined
          : undefined;

      const generated = await requestGeneratedVoiceFile({
        scriptForVoice: String(chunk.text ?? '').trim(),
        sentencesForVoice:
          Array.isArray(chunk.sentences) && chunk.sentences.length > 0
            ? chunk.sentences
            : [String(chunk.text ?? '').trim()],
        voiceId,
        provider: chunkProvider,
        styleInstructions: googleStyleInstructions,
        elevenLabsModel:
          chunkProvider === 'elevenlabs' ? elevenLabsGlobalModel : undefined,
        elevenLabsSettings:
          chunkProvider === 'elevenlabs'
            ? chunk.elevenLabsSettings ?? elevenLabsGlobalSettings
            : undefined,
        fallbackBaseName: `${chunkProvider}-chunk-${chunk.index + 1}`,
        errorMessage: 'Failed to regenerate chunk voice.',
      });

      setChunkVoiceCandidateById((prev) => {
        disposeSentenceVoiceCandidate(prev[chunkId]);
        return {
          ...prev,
          [chunkId]: {
            file: generated.file,
            previewUrl: URL.createObjectURL(generated.file),
            durationSeconds: generated.durationSeconds,
            mimeType: generated.mimeType,
            provider: chunkProvider,
            voiceId,
            voiceName:
              String(chunk.providerVoiceName ?? '').trim() ||
              selectedVoice?.name ||
              null,
          },
        };
      });
    } catch (error) {
      console.error('Chunk voice regeneration failed', error);
      showToast('Failed to regenerate chunk voice.', 'error');
    } finally {
      setIsRegeneratingChunkVoiceById((prev) => ({
        ...prev,
        [chunkId]: false,
      }));
    }
  };

  const handleCancelChunkVoiceCandidate = (chunkId: string) => {
    setChunkVoiceCandidateById((prev) => {
      disposeSentenceVoiceCandidate(prev[chunkId]);
      return {
        ...prev,
        [chunkId]: null,
      };
    });
  };

  const handleApplyChunkVoiceCandidate = async (chunkId: string) => {
    const candidate = chunkVoiceCandidateById[chunkId];
    const chunkIndex = voiceOverChunks.findIndex(
      (item) => String(item.index) === chunkId,
    );
    const chunk = chunkIndex >= 0 ? voiceOverChunks[chunkIndex] : null;
    if (!candidate || !chunk) return;

    setIsApplyingChunkVoiceCandidateById((prev) => ({
      ...prev,
      [chunkId]: true,
    }));

    try {
      const nextChunks = cloneVoiceOverChunks(voiceOverChunks);
      nextChunks[chunkIndex] = buildLocalVoiceOverChunkState({
        chunk,
        file: candidate.file,
        mimeType: candidate.mimeType,
        durationSeconds: candidate.durationSeconds,
        provider: candidate.provider,
        providerVoiceId: candidate.voiceId,
        providerVoiceName: candidate.voiceName,
        styleInstructions: chunk.styleInstructions,
        elevenLabsSettings:
          candidate.provider === 'elevenlabs'
            ? chunk.elevenLabsSettings ?? elevenLabsGlobalSettings
            : null,
      });

      const merged = await rebuildVoiceOverFromChunks({
        chunks: nextChunks,
        fallbackBaseName: `${voiceProvider}-voice-over`,
        overrideFilesByChunkId: {
          [chunkId]: candidate.file,
        },
      });

      if (!merged) {
        throw new Error('Failed to rebuild the merged voice-over.');
      }

      applyGeneratedVoiceResultToState(merged);
      handleCancelChunkVoiceCandidate(chunkId);
    } catch (error) {
      console.error('Applying chunk voice candidate failed', error);
      showToast('Failed to replace the chunk voice.', 'error');
    } finally {
      setIsApplyingChunkVoiceCandidateById((prev) => ({
        ...prev,
        [chunkId]: false,
      }));
    }
  };

  const handleGenerateVoice = async (
    voiceId?: string | null,
  ) => {
    if (!script.trim()) {
      showAlert('Please provide a script before generating a voice-over.', { type: 'warning' });
      return;
    }

    if (!voiceId) {
      showAlert('Please select a voice before generating.', { type: 'warning' });
      return;
    }

    stopVoicePreview();
    setVoiceError(null);
    setIsGeneratingVoice(true);
    setVoiceGenerationProgress(null);

    try {
      if (voiceGenerationMode === 'perSentence') {
        await generateVoicePerSentence(voiceId);
        return;
      }

      const sentenceTexts = (sentences || [])
        .map((s) => s.text)
        .filter(Boolean);
      const sentencesForVoice = sentenceTexts;
      const scriptForVoice =
        sentencesForVoice.length > 0 ? mergeVoiceSentenceTexts(sentencesForVoice) : script;

      const generatedVoice = await generateVoiceFileWithChunkSupport({
        sentenceTexts: sentencesForVoice,
        scriptText: scriptForVoice,
        voiceId,
        provider: voiceProvider,
        providerVoiceName: selectedVoiceOption?.name ?? null,
        styleInstructions:
          voiceProvider === 'google'
            ? String(aiStudioStyleInstructions ?? '').trim() || undefined
            : undefined,
        elevenLabsAutoGenerationStrategy:
          voiceProvider === 'elevenlabs'
            ? elevenLabsAutoGenerationStrategy
            : undefined,
        elevenLabsModel:
          voiceProvider === 'elevenlabs' ? elevenLabsGlobalModel : undefined,
        elevenLabsSettings:
          voiceProvider === 'elevenlabs' ? elevenLabsGlobalSettings : undefined,
        fallbackBaseName: `${voiceProvider}-voice-over`,
        errorLabel: 'Failed to generate voice.',
        onProgress: setVoiceGenerationProgress,
      });

      applyGeneratedVoiceResultToState(generatedVoice);
    } catch (error) {
      console.error('Voice generation failed', error);
      setVoiceError(
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Failed to generate voice. Please try again in a moment.',
      );
    } finally {
      setVoiceGenerationProgress(null);
      setIsGeneratingVoice(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVoice = () => {
    stopVoicePreview();

    if (voiceGenerationMode === 'perSentence') {
      setSentences((prev) => prev.map((sentence) => clearSentenceVoiceOverState(sentence)));
    }

    Object.values(sentenceVoiceCandidateByIdRef.current).forEach((candidate) => {
      disposeSentenceVoiceCandidate(candidate);
    });
    Object.values(chunkVoiceCandidateByIdRef.current).forEach((candidate) => {
      disposeChunkVoiceCandidate(candidate);
    });
    setVoiceOver(null);
    setVoiceOverChunks([]);
    setVoiceDuration(null);
    setSavedVoiceId(null);
    setVoiceLibraryUrl(null);
    setVoiceGenerationProgress(null);
    setIsVoiceOverEditorOpen(false);
    setActiveSentenceVoiceEditorSentenceId(null);
    setActiveChunkVoiceEditorId(null);
    setSentenceVoiceEditActionError(null);
    setChunkVoiceEditActionError(null);
    setIsSentenceVoiceManagerOpen(false);
    setIsChunkVoiceManagerOpen(false);
    setSentenceVoiceCandidateById({});
    setChunkVoiceCandidateById({});
    setIsGeneratingSentenceVoiceStyleById({});
    setIsGeneratingChunkVoiceStyleById({});
    setIsRegeneratingSentenceVoiceById({});
    setIsRegeneratingChunkVoiceById({});
    setIsApplyingSentenceVoiceCandidateById({});
    setIsApplyingChunkVoiceCandidateById({});
  };

  const handleGenerateBulkFeelingCues = async () => {
    if (isApplyingBulkFeelingCues) {
      return;
    }

    const payload = sentences
      .map((sentence, index) => {
        const text = String(sentence.text ?? '').trim();
        if (!text) {
          return null;
        }

        return {
          index,
          sentenceId: sentence.id,
          text,
        } satisfies BulkFeelingCueRequestItem;
      })
      .filter(Boolean) as BulkFeelingCueRequestItem[];

    if (!payload.length) {
      showToast('No sentence text is available for AI feeling cues.', 'warning');
      return;
    }

    try {
      setIsApplyingBulkFeelingCues(true);
      const items = await requestAiFeelingCues(payload);

      if (!items.length) {
        showToast('AI did not return any feeling cues.', 'warning');
        return;
      }

      const nextTextBySentenceId = new Map<string, string>();
      for (const item of items) {
        const sentence = sentences.find((entry) => entry.id === item.sentenceId);
        if (!sentence) {
          continue;
        }

        const nextText = applyFeelingCueToSentenceText(sentence.text, item.feeling);
        if (nextText && nextText !== sentence.text) {
          nextTextBySentenceId.set(item.sentenceId, nextText);
        }
      }

      if (!nextTextBySentenceId.size) {
        showToast('AI feeling cues are already up to date.', 'info');
        return;
      }

      nextTextBySentenceId.forEach((nextText, sentenceId) => {
        handleSentenceTextChangeById(sentenceId, nextText);
      });
      removeVoice();
      showToast('AI feeling cues applied to the scene sentences.', 'success');
    } catch (error) {
      console.error('Failed to generate AI feeling cues:', error);
      showToast('Failed to generate AI feeling cues.', 'error');
    } finally {
      setIsApplyingBulkFeelingCues(false);
    }
  };

  const resolveBackgroundSoundtrackPreviewUrl = () => {
    if (selectedBackgroundSoundtrackRequiresMaterialization) {
      const asset =
        activeMaterializedBackgroundSoundtrack?.cacheKey ===
          selectedBackgroundSoundtrackMaterializationCacheKey
          ? activeMaterializedBackgroundSoundtrack
          : null;
      return asset?.objectUrl ?? null;
    }

    const resolved = resolveRawBackgroundMusicSrcForRender();
    if (!resolved || resolved === '__none__') return null;
    return resolved;
  };

  const timelineBackgroundSoundtrack = (() => {
    if (!addBackgroundSoundtrack) return null;

    const normalizedVolumePercent = Math.max(
      0,
      Math.min(300, Number(backgroundSoundtrackVolumePercent ?? 100) || 100),
    );
    const value = String(selectedBackgroundSoundtrackValue ?? '').trim();

    if (value === '__none__') {
      return null;
    }

    if (selectedBackgroundSoundtrackLibraryItem) {
      return {
        label:
          String(selectedBackgroundSoundtrackLibraryItem.title ?? '').trim() ||
          'Background soundtrack',
        subtitle: 'Library soundtrack',
        volumePercent: normalizedVolumePercent,
        canEdit: true,
      };
    }

    if (value === '__oneoff__') {
      return {
        label: 'One-off soundtrack',
        subtitle: 'Uploaded once for this render',
        volumePercent: normalizedVolumePercent,
        canEdit: false,
      };
    }

    return {
      label: 'Default soundtrack',
      subtitle: 'Default background soundtrack',
      volumePercent: normalizedVolumePercent,
      canEdit: false,
    };
  })();

  const timelineVoiceTrack = String(voiceOverPreviewUrl ?? '').trim()
    ? {
        label: 'Merged voice-over',
        subtitle: 'Full narration track',
        durationSeconds:
          typeof voiceDuration === 'number' && Number.isFinite(voiceDuration) && voiceDuration > 0
            ? voiceDuration
            : 0.35,
        canEdit: true,
      }
    : null;

  const handleOpenTimelineSentenceVoiceEditor = (sentenceId: string) => {
    const normalizedSentenceId = String(sentenceId ?? '').trim();
    if (!normalizedSentenceId) return;

    if (sentenceVoiceCandidateById[normalizedSentenceId]) {
      showAlert(
        'Resolve the pending preview for this sentence before editing its committed voice.',
        { type: 'warning' },
      );
      return;
    }

    const sentence = sentences.find((item) => item.id === normalizedSentenceId);
    if (!sentence || !hasSentenceVoiceOver(sentence)) {
      showAlert('No committed sentence voice is available to edit.', {
        type: 'warning',
      });
      return;
    }

    setIsSentenceVoiceManagerOpen(false);
    setIsChunkVoiceManagerOpen(false);
    setSentenceVoiceEditActionError(null);
    setActiveSentenceVoiceEditorSentenceId(normalizedSentenceId);
  };

  const handleOpenTimelineBackgroundSoundtrackEditor = () => {
    if (!selectedBackgroundSoundtrackLibraryItem) {
      showAlert(
        'Select a saved library soundtrack to edit it from the timeline.',
        { type: 'warning' },
      );
      return;
    }

    handleOpenBackgroundSoundtrackEditor(selectedBackgroundSoundtrackLibraryItem.id);
  };

  const activeSentenceVoiceEditorTarget = activeSentenceVoiceEditorSentenceId
    ? (() => {
      const sentenceIndex = sentences.findIndex(
        (sentence) => sentence.id === activeSentenceVoiceEditorSentenceId,
      );
      if (sentenceIndex < 0) return null;

      const sentence = sentences[sentenceIndex];
      if (!hasSentenceVoiceOver(sentence)) return null;

      return {
        sentence,
        sentenceIndex,
      };
    })()
    : null;

  const activeChunkVoiceEditorTarget = activeChunkVoiceEditorId
    ? (() => {
      const chunkIndex = voiceOverChunks.findIndex(
        (chunk) => String(chunk.index) === activeChunkVoiceEditorId,
      );
      if (chunkIndex < 0) return null;

      const chunk = voiceOverChunks[chunkIndex];
      if (!hasVoiceOverChunkAudio(chunk)) return null;

      return {
        chunk,
        chunkIndex,
      };
    })()
    : null;

  const sentenceVoiceManagerSegments: VoiceSegmentManagerItem[] = sentences
    .filter((sentence) => String(sentence.text ?? '').trim())
    .map((sentence, index) => ({
      id: sentence.id,
      index,
      text: sentence.text,
      audioUrl: sentence.voiceOverUrl ?? null,
      durationSeconds: sentence.voiceOverDurationSeconds ?? null,
      provider: sentence.voiceOverProvider ?? null,
      voiceName: sentence.voiceOverVoiceName ?? null,
      styleInstructions: sentence.voiceOverStyleInstructions ?? null,
      elevenLabsSettings: sentence.elevenLabsSettings ?? null,
      elevenLabsModel: sentence.elevenLabsModel ?? null,
    }));

  const chunkVoiceManagerSegments: VoiceSegmentManagerItem[] = voiceOverChunks
    .filter((chunk) => String(chunk.text ?? '').trim())
    .sort((left, right) => left.index - right.index)
    .map((chunk) => ({
      id: String(chunk.index),
      index: chunk.index,
      text: chunk.text,
      audioUrl: chunk.url ?? null,
      durationSeconds: chunk.durationSeconds ?? null,
      provider: normalizeVoiceProvider(chunk.provider),
      voiceName: chunk.providerVoiceName ?? null,
      styleInstructions: chunk.styleInstructions ?? null,
      elevenLabsSettings: chunk.elevenLabsSettings ?? null,
    }));

  const persistVoiceToLibrary = async (file: File) => {
    const managedUrl = await uploadManagedFile(file, {
      resourceType: 'audio',
      folder: 'auto-video-generator/voices',
    });

    const hash = await sha256HexForFile(file);

    const response = await api.post<{ id: string }>('/voices/url', {
      voice: managedUrl,
      hash: hash ?? undefined,
    });

    return { id: response.data.id, url: managedUrl };
  };

  const syncPersistedVoiceChunksIntoState = (
    persistedPayload: ScriptVoiceOverChunkDto[] | null,
    sourceChunks: VoiceOverChunkState[],
  ) => {
    if (!persistedPayload) {
      return [] as VoiceOverChunkState[];
    }

    return persistedPayload.map((chunk) => {
      const sourceChunk = sourceChunks.find(
        (candidate) => candidate.index === chunk.index,
      );

      return toVoiceOverChunkState(chunk, sourceChunk?.sourceFile ?? null);
    });
  };

  const patchCurrentScriptVoiceState = async (params: {
    scriptId: string;
    voiceId: string;
    chunks: VoiceOverChunkState[];
  }) => {
    const voiceOverChunksPayload = await persistVoiceOverChunksToManagedStorage(
      params.chunks,
    );

    await api.patch(`/scripts/${encodeURIComponent(params.scriptId)}`, {
      voice_id: params.voiceId,
      voice_over_chunks: voiceOverChunksPayload,
    });

    return syncPersistedVoiceChunksIntoState(voiceOverChunksPayload, params.chunks);
  };

  const materializeEditedVoiceOver = async (values: SoundEffectEditValues) => {
    return await renderEditedAudioFile({
      sourceFile: voiceOver,
      sourceUrl: voiceOverPreviewUrl,
      values,
      fallbackName: voiceOver?.name ?? 'voice-over',
    });
  };

  const materializeEditedSentenceVoiceOvers = async (
    values: SoundEffectEditValues,
  ) => {
    const voiceSentences = sentences
      .map((sentence, index) => ({ sentence, index }))
      .filter(({ sentence }) => hasSentenceVoiceOver(sentence));

    if (voiceSentences.length === 0) {
      throw new Error('No sentence voice-overs are available to edit.');
    }

    const nextSentences = [...sentences];
    for (const entry of voiceSentences) {
      const rendered = await renderEditedAudioFile({
        sourceFile: entry.sentence.voiceOverFile ?? null,
        sourceUrl: entry.sentence.voiceOverUrl ?? null,
        values,
        fallbackName: `sentence-${entry.index + 1}-voice-over`,
      });

      nextSentences[entry.index] = buildLocalSentenceVoiceState({
        sentence: entry.sentence,
        file: rendered.file,
        mimeType:
          rendered.file.type || entry.sentence.voiceOverMimeType || 'audio/mpeg',
        durationSeconds: rendered.durationSeconds,
        provider: entry.sentence.voiceOverProvider ?? voiceProvider,
        providerVoiceId:
          entry.sentence.voiceOverVoiceId ??
          selectedVoiceIdByProvider[entry.sentence.voiceOverProvider ?? voiceProvider] ??
          null,
        providerVoiceName:
          entry.sentence.voiceOverVoiceName ??
          findVoiceOption(
            entry.sentence.voiceOverProvider ?? voiceProvider,
            entry.sentence.voiceOverVoiceId ??
            selectedVoiceIdByProvider[entry.sentence.voiceOverProvider ?? voiceProvider],
          )?.name ??
          null,
        styleInstructions: entry.sentence.voiceOverStyleInstructions,
      });
    }

    const merged = await rebuildVoiceOverFromSentenceVoices({
      sourceSentences: nextSentences,
      fallbackBaseName: `${voiceProvider}-voice-over-edited`,
    });
    if (!merged) {
      throw new Error('Failed to rebuild the edited voice-over.');
    }

    return {
      sentences: nextSentences,
      merged,
    };
  };

  const applyVoiceOverEditsLocally = async (values: SoundEffectEditValues) => {
    if (!voiceOver && !voiceOverPreviewUrl) {
      showAlert('No voice-over available to edit.', { type: 'warning' });
      return;
    }

    setIsApplyingVoiceOverEdit(true);
    try {
      if (voiceGenerationMode === 'perSentence') {
        const rendered = await materializeEditedSentenceVoiceOvers(values);
        setSentences(rendered.sentences);
        applyGeneratedVoiceResultToState(rendered.merged);
        setIsVoiceOverEditorOpen(false);
        showToast('Voice-over edits applied to all sentence clips.', 'success');
        return;
      }

      const rendered = await materializeEditedVoiceOver(values);
      setVoiceOver(rendered.file);
      setVoiceOverChunks([]);
      setVoiceDuration(rendered.durationSeconds > 0 ? rendered.durationSeconds : null);
      setSavedVoiceId(null);
      setVoiceLibraryUrl(null);
      setIsVoiceOverEditorOpen(false);
      showToast('Voice-over edits applied to this draft.', 'success');
    } catch (error) {
      console.error('Apply voice-over edits failed', error);
      showAlert(getRequestErrorMessage(error, 'Failed to apply voice-over edits.'), { type: 'error' });
    } finally {
      setIsApplyingVoiceOverEdit(false);
    }
  };

  const applySentenceVoiceEditLocally = async (values: SoundEffectEditValues) => {
    const sentenceId = String(activeSentenceVoiceEditorSentenceId ?? '').trim();
    if (!sentenceId) {
      showAlert('No sentence voice is selected for editing.', { type: 'warning' });
      return;
    }

    const sentenceIndex = sentences.findIndex((item) => item.id === sentenceId);
    const sentence = sentenceIndex >= 0 ? sentences[sentenceIndex] : null;
    if (!sentence || !hasSentenceVoiceOver(sentence)) {
      showAlert('No committed sentence voice is available to edit.', {
        type: 'warning',
      });
      return;
    }

    setIsApplyingSentenceVoiceEdit(true);
    setSentenceVoiceEditActionError(null);
    try {
      const rendered = await renderEditedAudioFile({
        sourceFile: sentence.voiceOverFile ?? null,
        sourceUrl: sentence.voiceOverUrl ?? null,
        values,
        fallbackName: `sentence-${sentenceIndex + 1}-voice-over`,
      });

      const nextSentences = [...sentences];
      nextSentences[sentenceIndex] = buildLocalSentenceVoiceState({
        sentence,
        file: rendered.file,
        mimeType: rendered.file.type || sentence.voiceOverMimeType || 'audio/mpeg',
        durationSeconds: rendered.durationSeconds,
        provider: sentence.voiceOverProvider ?? voiceProvider,
        providerVoiceId:
          sentence.voiceOverVoiceId ??
          selectedVoiceIdByProvider[sentence.voiceOverProvider ?? voiceProvider] ??
          null,
        providerVoiceName:
          sentence.voiceOverVoiceName ??
          findVoiceOption(
            sentence.voiceOverProvider ?? voiceProvider,
            sentence.voiceOverVoiceId ??
            selectedVoiceIdByProvider[sentence.voiceOverProvider ?? voiceProvider],
          )?.name ??
          null,
        styleInstructions: sentence.voiceOverStyleInstructions,
      });

      const merged = await rebuildVoiceOverFromSentenceVoices({
        sourceSentences: nextSentences,
        fallbackBaseName: `${voiceProvider}-voice-over-edited`,
      });
      if (!merged) {
        throw new Error('Failed to rebuild the edited voice-over.');
      }

      setSentences(nextSentences);
      applyGeneratedVoiceResultToState(merged);
      setActiveSentenceVoiceEditorSentenceId(null);
      setSentenceVoiceEditActionError(null);
      showToast('Sentence voice edits applied to the merged voice-over.', 'success');
    } catch (error) {
      console.error('Apply sentence voice edits failed', error);
      setSentenceVoiceEditActionError(
        getRequestErrorMessage(error, 'Failed to apply sentence voice edits.'),
      );
    } finally {
      setIsApplyingSentenceVoiceEdit(false);
    }
  };

  const applyChunkVoiceEditLocally = async (values: SoundEffectEditValues) => {
    const chunkId = String(activeChunkVoiceEditorId ?? '').trim();
    if (!chunkId) {
      showAlert('No chunk voice is selected for editing.', { type: 'warning' });
      return;
    }

    const chunkIndex = voiceOverChunks.findIndex(
      (item) => String(item.index) === chunkId,
    );
    const chunk = chunkIndex >= 0 ? voiceOverChunks[chunkIndex] : null;
    if (!chunk || !hasVoiceOverChunkAudio(chunk)) {
      showAlert('No committed chunk voice is available to edit.', {
        type: 'warning',
      });
      return;
    }

    setIsApplyingChunkVoiceEdit(true);
    setChunkVoiceEditActionError(null);
    try {
      const rendered = await renderEditedAudioFile({
        sourceFile: chunk.sourceFile ?? null,
        sourceUrl: chunk.url ?? null,
        values,
        fallbackName: `chunk-${chunk.index + 1}-voice-over`,
      });

      const nextChunks = cloneVoiceOverChunks(voiceOverChunks);
      nextChunks[chunkIndex] = buildLocalVoiceOverChunkState({
        chunk,
        file: rendered.file,
        mimeType: rendered.file.type || chunk.mimeType || 'audio/mpeg',
        durationSeconds: rendered.durationSeconds,
        provider: normalizeVoiceProvider(chunk.provider),
        providerVoiceId:
          chunk.providerVoiceId ??
          selectedVoiceIdByProvider[normalizeVoiceProvider(chunk.provider)] ??
          null,
        providerVoiceName:
          chunk.providerVoiceName ??
          findVoiceOption(
            normalizeVoiceProvider(chunk.provider),
            chunk.providerVoiceId ??
            selectedVoiceIdByProvider[normalizeVoiceProvider(chunk.provider)],
          )?.name ??
          null,
        styleInstructions: chunk.styleInstructions,
        elevenLabsSettings: chunk.elevenLabsSettings,
      });

      const merged = await rebuildVoiceOverFromChunks({
        chunks: nextChunks,
        fallbackBaseName: `${voiceProvider}-voice-over-edited`,
      });
      if (!merged) {
        throw new Error('Failed to rebuild the edited voice-over.');
      }

      applyGeneratedVoiceResultToState(merged);
      setActiveChunkVoiceEditorId(null);
      setChunkVoiceEditActionError(null);
      showToast('Chunk voice edits applied to the merged voice-over.', 'success');
    } catch (error) {
      console.error('Apply chunk voice edits failed', error);
      setChunkVoiceEditActionError(
        getRequestErrorMessage(error, 'Failed to apply chunk voice edits.'),
      );
    } finally {
      setIsApplyingChunkVoiceEdit(false);
    }
  };

  const saveVoiceOverEditsToDraft = async (values: SoundEffectEditValues) => {
    if (voiceGenerationMode !== 'perSentence' && !user) {
      showAlert('You must be logged in to save voice-over edits.', { type: 'warning' });
      return;
    }

    if (!voiceOver && !voiceOverPreviewUrl) {
      showAlert('No voice-over available to edit.', { type: 'warning' });
      return;
    }

    setIsSavingVoiceOverEdit(true);
    try {
      if (voiceGenerationMode === 'perSentence') {
        const rendered = await materializeEditedSentenceVoiceOvers(values);
        setSentences(rendered.sentences);
        applyGeneratedVoiceResultToState(rendered.merged);
        setIsVoiceOverEditorOpen(false);
        showToast('Voice-over edits applied to all sentence clips. Save the draft to persist them.', 'success');
        return;
      }

      const rendered = await materializeEditedVoiceOver(values);
      const saved = await persistVoiceToLibrary(rendered.file);

      setVoiceOver(rendered.file);
      setVoiceOverChunks([]);
      setVoiceDuration(rendered.durationSeconds > 0 ? rendered.durationSeconds : null);
      setSavedVoiceId(saved.id);
      setVoiceLibraryUrl(saved.url);

      const scriptId = String(activeScriptId ?? '').trim();
      if (scriptId) {
        await api.patch(`/scripts/${encodeURIComponent(scriptId)}`, {
          voice_id: saved.id,
          voice_over_chunks: null,
        });
      }

      setIsVoiceOverEditorOpen(false);
      showToast('Voice-over enhancements saved to this draft.', 'success');
    } catch (error) {
      console.error('Save voice-over edits failed', error);
      showAlert(getRequestErrorMessage(error, 'Failed to save voice-over enhancements.'), { type: 'error' });
    } finally {
      setIsSavingVoiceOverEdit(false);
    }
  };

  const handleSaveVoice = async () => {
    if (!voiceOver) {
      showAlert('No voice-over to save.', { type: 'warning' });
      return;
    }

    if (savedVoiceId) {
      return;
    }

    if (!user) {
      showAlert('You must be logged in to save voice-overs.', { type: 'warning' });
      return;
    }

    setIsSavingVoice(true);

    try {
      const saved = await persistVoiceToLibrary(voiceOver);
      setSavedVoiceId(saved.id);
      setVoiceLibraryUrl(saved.url);

      const currentScriptId = String(activeScriptId ?? '').trim() || null;
      if (currentScriptId && hasPersistableVoiceChunks(voiceOverChunks)) {
        const persistedChunks = await patchCurrentScriptVoiceState({
          scriptId: currentScriptId,
          voiceId: saved.id,
          chunks: voiceOverChunks,
        });

        setVoiceOverChunks(cloneVoiceOverChunks(persistedChunks));
      }
    } catch (error) {
      console.error('Save voice-over failed', error);
      showAlert(
        getRequestErrorMessage(error, 'Failed to save voice-over. Please try again.'),
        { type: 'error' },
      );
    } finally {
      setIsSavingVoice(false);
    }
  };

  const handleOpenVoiceLibrary = () => {
    setIsVoiceLibraryOpen(true);
  };

  const handleVoiceLibrarySelect = async (voiceUrl: string, id: string) => {
    try {
      stopVoicePreview();
      setVoiceOver(null);
      setVoiceOverChunks([]);
      setSavedVoiceId(id);
      setVoiceLibraryUrl(voiceUrl);

      const duration = await getAudioDurationSecondsFromUrl(voiceUrl);
      setVoiceDuration(duration);
    } catch (error) {
      console.error('Select voice from library failed', error);
      showAlert('Failed to load voice from library. Please try again.', { type: 'error' });
    }
  };

  const startVideoGeneration = async (allowSilentRender = false) => {
    if (!script.trim()) {
      showAlert('Please provide a script', { type: 'warning' });
      return;
    }
    if (!sentences.length) {
      showAlert('Please split the script into sentences first', { type: 'warning' });
      return;
    }

    const missingMediaForImageTab = sentences.some((s) => {
      const text = String(s.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) return false;
      const tab = resolveSentenceSceneTab(s);
      if (tab !== 'image') return false;
      return !s.image && !s.imageUrl;
    });

    if (missingMediaForImageTab) {
      showAlert('Please provide an image for each sentence on the Image tab.', {
        type: 'warning',
      });
      return;
    }

    const missingVideoTab = sentences
      .map((s, index) => {
        const text = String(s.text ?? '').trim();
        if (isSubscribeLikeSentence(text)) return null;
        const tab = resolveSentenceSceneTab(s);
        if (tab !== 'video') return null;

        const url = String(s.videoUrl ?? '').trim();
        const hasHttpUrl = url.startsWith('http://') || url.startsWith('https://');
        return hasHttpUrl ? null : index;
      })
      .filter((v): v is number => v !== null);

    if (missingVideoTab.length > 0) {
      showAlert(
        `You are on the Video tab for ${missingVideoTab.length} sentence(s), but no video is generated yet. Generate the sentence video or switch back to the Image tab.`,
        { type: 'warning' },
      );
      return;
    }

    const missingTextBackground = sentences.some((s) => {
      const text = String(s.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) return false;
      if (resolveSentenceSceneTab(s) !== 'text') return false;

      const backgroundAsset = resolveTextSceneRenderBackgroundAsset(s, effectiveIsShort);
      if (
        backgroundAsset.backgroundMode === 'solid' ||
        backgroundAsset.backgroundMode === 'gradient'
      ) {
        return false;
      }

      return !backgroundAsset.file && !backgroundAsset.url;
    });

    if (missingTextBackground) {
      showAlert(
        'Please provide a background image or video for each text scene, or switch those scenes to a solid or gradient background.',
        { type: 'warning' },
      );
      return;
    }

    const missingOverlayAsset = sentences.some((s) => {
      const text = String(s.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) return false;
      if (resolveSentenceSceneTab(s) !== 'overlay') return false;

      const overlayAsset = resolveOverlaySceneRenderAsset(s);
      return !overlayAsset.file && !overlayAsset.url;
    });

    if (missingOverlayAsset) {
      showAlert('Please provide an overlay asset for each overlay scene before rendering.', {
        type: 'warning',
      });
      return;
    }

    const missingOverlayBackground = sentences.some((s) => {
      const text = String(s.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) return false;
      if (resolveSentenceSceneTab(s) !== 'overlay') return false;

      const backgroundAsset = resolveOverlaySceneRenderBackgroundAsset(s);
      if (
        backgroundAsset.backgroundMode === 'solid' ||
        backgroundAsset.backgroundMode === 'gradient'
      ) {
        return false;
      }

      return !backgroundAsset.file && !backgroundAsset.url;
    });

    if (missingOverlayBackground) {
      showAlert(
        'Please provide the required Image or Video tab background for each overlay scene, or switch that overlay background to solid or gradient.',
        { type: 'warning' },
      );
      return;
    }

    const hasVoiceSource = Boolean(
      voiceOver ||
      getPersistedRenderUrl(voiceLibraryUrl) ||
      String(voiceOverPreviewUrl ?? '').trim(),
    );
    if (!hasVoiceSource && !allowSilentRender) {
      setIsSilentRenderConfirmOpen(true);
      return;
    }

    resetJob();

    setIsGenerating(true);
    try {
      const {
        backgroundMusicSrc,
        backgroundMusicFile,
      } = await resolveBackgroundMusicRenderAsset();

      const normalizedBackgroundMusicVolume = Math.max(
        0,
        Math.min(1, (backgroundSoundtrackVolumePercent ?? 100) / 100),
      );
      const shouldIncludeBackgroundMusicVolume =
        addBackgroundSoundtrack && normalizedBackgroundMusicVolume !== 1;

      const audioUrl = allowSilentRender ? null : await resolveRenderAudioUrl();
      const voiceOverFileForRender =
        allowSilentRender ? null : await prepareVoiceOverUploadForRender();
      const imageUrls = await buildRenderImageUrls(sentences);
      const secondaryImageUrls = await buildRenderSecondaryImageUrls(sentences);
      const imageUploads = await prepareImageUploadsForRender(sentences);
      const secondaryImageUploads =
        await prepareSecondaryImageUploadsForRender(sentences);
      const sceneVideoUploads = await prepareSceneVideoUploadsForRender(sentences);
      const textBackgroundVideoUploads =
        await prepareTextBackgroundVideoUploadsForRender(sentences);
      const overlayTransportAssets = await buildRenderOverlayTransportAssets(sentences);
      const overlayAssetUploads = await prepareOverlayAssetUploadsForRender(
        sentences,
      );
      const sentencePayload = await buildRenderSentencePayload(sentences, {
        overlayTransportByIndex: overlayTransportAssets,
      });
      const effectiveAddSubtitles = allowSilentRender ? false : addSubtitles;
      const requiresMultipartPrimaryImages = imageUploads.length > 0;
      const requiresMultipartSecondaryImages = secondaryImageUploads.length > 0;
      const requiresMultipartSceneVideos = sceneVideoUploads.length > 0;
      const requiresMultipartTextBackgroundVideos = textBackgroundVideoUploads.length > 0;
      const requiresMultipartVoiceOver = Boolean(voiceOverFileForRender);
      const requiresMultipartOverlayAssets = overlayAssetUploads.length > 0;
      const requiresMultipartBackgroundMusic = Boolean(backgroundMusicFile);

      let res: Response | null = null;

      if (
        !requiresMultipartPrimaryImages &&
        !requiresMultipartSecondaryImages &&
        !requiresMultipartSceneVideos &&
        !requiresMultipartTextBackgroundVideos &&
        !requiresMultipartVoiceOver &&
        !requiresMultipartOverlayAssets &&
        !requiresMultipartBackgroundMusic &&
        !allowSilentRender &&
        audioUrl
      ) {
        res = await fetch(`${API_URL}/videos/url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioUrl,
            sentences: sentencePayload,
            imageUrls,
            secondaryImageUrls,
            scriptLength,
            language: scriptLanguage,
            ...(voiceDuration && voiceDuration > 0
              ? { audioDurationSeconds: voiceDuration }
              : {}),
            isShort: effectiveIsShort,
            useLowerFps,
            useLowerResolution,
            addSubtitles: effectiveAddSubtitles,
            enableGlitchTransitions,
            enableZoomRotateTransitions,
            enableLongFormSubscribeOverlay: effectiveEnableLongFormSubscribeOverlay,
            ...(backgroundMusicSrc ? { backgroundMusicSrc } : {}),
            ...(shouldIncludeBackgroundMusicVolume
              ? { backgroundMusicVolume: normalizedBackgroundMusicVolume }
              : {}),
          }),
        });
      }

      if (!res || !res.ok) {
        const fallbackForm = new FormData();
        if (voiceOverFileForRender) {
          fallbackForm.append('voiceOver', voiceOverFileForRender);
        } else if (audioUrl) {
          fallbackForm.append('audioUrl', audioUrl);
        }
        if (allowSilentRender) {
          fallbackForm.append('isSilent', 'true');
        }
        if (backgroundMusicFile) {
          fallbackForm.append(
            'backgroundMusicFile',
            backgroundMusicFile,
            backgroundMusicFile.name,
          );
        }
        fallbackForm.append('sentences', JSON.stringify(sentencePayload));
        fallbackForm.append('scriptLength', scriptLength);
        fallbackForm.append('language', scriptLanguage);
        if (voiceDuration && voiceDuration > 0) {
          fallbackForm.append('audioDurationSeconds', String(voiceDuration));
        }
        fallbackForm.append('isShort', effectiveIsShort ? 'true' : 'false');
        fallbackForm.append('useLowerFps', useLowerFps ? 'true' : 'false');
        fallbackForm.append(
          'useLowerResolution',
          useLowerResolution ? 'true' : 'false',
        );
        fallbackForm.append(
          'addSubtitles',
          effectiveAddSubtitles ? 'true' : 'false',
        );
        fallbackForm.append(
          'enableGlitchTransitions',
          enableGlitchTransitions ? 'true' : 'false',
        );
        fallbackForm.append(
          'enableZoomRotateTransitions',
          enableZoomRotateTransitions ? 'true' : 'false',
        );
        fallbackForm.append(
          'enableLongFormSubscribeOverlay',
          effectiveEnableLongFormSubscribeOverlay ? 'true' : 'false',
        );
        if (backgroundMusicSrc) {
          fallbackForm.append('backgroundMusicSrc', backgroundMusicSrc);
        }
        if (shouldIncludeBackgroundMusicVolume) {
          fallbackForm.append(
            'backgroundMusicVolume',
            String(normalizedBackgroundMusicVolume),
          );
        }

        fallbackForm.append('imageUrls', JSON.stringify(imageUrls));
        imageUploads.forEach((file) => fallbackForm.append('images', file));
        secondaryImageUploads.forEach((file) => {
          fallbackForm.append('secondaryImages', file);
        });
        sceneVideoUploads.forEach((file) => {
          fallbackForm.append('sceneVideos', file);
        });
        textBackgroundVideoUploads.forEach((file) => {
          fallbackForm.append('textBackgroundVideos', file);
        });
        overlayAssetUploads.forEach((file) => {
          fallbackForm.append('overlayAssets', file);
        });

        res = await fetch(`${API_URL}/videos`, {
          method: 'POST',
          body: fallbackForm,
        });
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to start video generation');
      }

      const data = (await res.json()) as {
        id: string;
        status: string;
      };

      setJobFromResponse(data.id, data.status);

      // Smoothly scroll to the video status section after starting generation
      if (videoSectionRef.current) {
        videoSectionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    } catch (err) {
      console.error('Start video generation failed', err);
      setVideoJobError('Failed to start video generation. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    await startVideoGeneration(false);
  };

  const resetStateForGeneratedScript = () => {
    setScript('');
    setSentences([]);
    setSplitError(null);
    setScriptCharacters([]);
    setScriptLocations([]);
    setVoiceOver(null);
    setVoiceOverChunks([]);
    setVoiceDuration(null);
    setSavedVoiceId(null);
    setVoiceLibraryUrl(null);
    setOriginalScriptSubject(undefined);
    setOriginalScriptSubjectContent(undefined);
  };

  const generateScriptFromSelection = async (
    selectedIdea?: ScriptIdeaRequestPayload,
  ) => {
    setRandomScriptError(null);
    setScriptIdeasError(null);
    setIsRandomScriptLoading(true);
    resetStateForGeneratedScript();

    try {
      const usingReferences = referenceScripts.length > 0;

      const response = await fetch(`${API_URL}/ai/generate-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: scriptLanguage,
          subject: scriptSubject,
          subjectContent:
            scriptSubject === 'religious (Islam)'
              ? scriptSubjectContent || undefined
              : undefined,
          length: scriptLength,
          technique: scriptTechnique,
          model: scriptModel,
          useWebSearch: selectedIdea ? false : useWebSearchForTrending,
          selectedIdea,
          ...(usingReferences
            ? {
              referenceScripts: referenceScripts.map((s) => ({
                id: s.id,
                title: s.title ?? undefined,
                script: s.script,
              })),
            }
            : {
              style: scriptStyle,
              systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : undefined,
            }),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start script generation');
      }

      const warning = String(
        response.headers.get('X-AI-Web-Search-Warning') ?? '',
      ).trim();
      if (warning) {
        showToast(warning, 'warning', 5000);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Stream chunks into the textarea as they arrive
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          setScript((prev) => prev + chunk);
        }
      }
    } catch (error) {
      console.error('Random script generation failed', error);
      setRandomScriptError(
        'Failed to generate script. Please try again in a moment.',
      );
    } finally {
      setIsRandomScriptLoading(false);
      // After generation completes, if we have a script, capture original config
      // Excludes model/length/style per requirements
      setOriginalScriptSubject(scriptSubject);
      setOriginalScriptSubjectContent(
        scriptSubject === 'religious (Islam)' ? scriptSubjectContent : ''
      );
    }
  };

  const handleGenerateRandomScript = async () => {
    setSelectedScriptIdeaTitle(null);
    await generateScriptFromSelection();
  };

  const handleFetchScriptIdeas = async () => {
    if (isScriptIdeasLoading || isRandomScriptLoading) return;

    setScriptIdeasError(null);
    setSelectedScriptIdeaTitle(null);
    setIsScriptIdeasLoading(true);

    try {
      const usingReferences = referenceScripts.length > 0;
      const response = await api.post<{
        ideas: ScriptIdeaOption[];
        warning?: string;
      }>(
        '/ai/generate-script-ideas',
        {
          language: scriptLanguage,
          subject: scriptSubject,
          subjectContent:
            scriptSubject === 'religious (Islam)'
              ? scriptSubjectContent || undefined
              : undefined,
          length: scriptLength,
          technique: scriptTechnique,
          model: scriptModel,
          useWebSearch: useWebSearchForTrending,
          count: 5,
          ...(usingReferences
            ? {
              referenceScripts: referenceScripts.map((s) => ({
                id: s.id,
                title: s.title ?? undefined,
                script: s.script,
              })),
            }
            : {
              style: scriptStyle,
              systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : undefined,
            }),
        },
      );

      const nextIdeas = Array.isArray(response.data?.ideas)
        ? response.data.ideas.filter(
          (idea) =>
            typeof idea?.id === 'string' &&
            typeof idea?.title === 'string',
        )
        : [];

      const warning = String(response.data?.warning ?? '').trim();
      if (warning) {
        showToast(warning, 'warning', 5000);
      }

      setScriptIdeas(nextIdeas);
    } catch (error) {
      const message = getRequestErrorMessage(
        error,
        'Failed to generate script ideas. Please try again.',
      );
      setScriptIdeas([]);
      setScriptIdeasError(message);
      showToast(message, 'error');
    } finally {
      setIsScriptIdeasLoading(false);
    }
  };

  const handleGenerateFromIdea = async (idea: ScriptIdeaOption) => {
    setSelectedScriptIdeaTitle(idea.title);
    await generateScriptFromSelection({
      title: idea.title,
    });
  };

  const handleSplitScript = async () => {
    if (!script.trim()) {
      setSplitError('Please enter or generate a script first.');
      return;
    }

    setSplitError(null);
    setIsSplitting(true);
    try {
      const response = await fetch(`${API_URL}/ai/split-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script,
          model: scriptModel,
          systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to split script');
      }

      const data = (await response.json()) as {
        sentences: Array<{
          id?: string;
          index?: number;
          text: string;
          characterKeys: string[];
          locationKey: string | null;
        }>;
        characters?: ScriptCharacter[];
        locations?: ScriptLocation[];
      };

      // Normalize and ensure the subscribe sentence appears only once at the end
      const normalize = (value: string) => {
        return value
          .toLowerCase()
          .trim()
          .replace(/[.!?]+$/u, '')
          .replace(/&/g, 'and')
          .replace(/\s+/g, ' ');
      };

      const subscribeSentence = getSubscribeSentence(scriptLanguage);
      const targetNorm = normalize(subscribeSentence);

      const processed: Array<{
        id: string | null;
        text: string;
        characterKeys: string[];
        locationKey: string | null;
      }> = [];
      let hasSubscribe = false;

      for (const raw of data.sentences ?? []) {
        const trimmed = String(raw?.text ?? '').trim();
        if (!trimmed) continue;
        const norm = normalize(trimmed);
        if (norm === targetNorm || isSubscribeCtaSentence(trimmed)) {
          if (!hasSubscribe) {
            hasSubscribe = true;
            processed.push({
              id: String(raw?.id ?? '').trim() || null,
              text: subscribeSentence,
              characterKeys: [],
              locationKey: null,
            });
          }
        } else {
          processed.push({
            id: String(raw?.id ?? '').trim() || null,
            text: trimmed,
            characterKeys: Array.isArray(raw?.characterKeys)
              ? raw.characterKeys.map((k) => String(k ?? '').trim()).filter(Boolean)
              : [],
            locationKey: String(raw?.locationKey ?? '').trim() || null,
          });
        }
      }

      if (!hasSubscribe) {
        processed.push({
          id: null,
          text: subscribeSentence,
          characterKeys: [],
          locationKey: null,
        });
      }

      const now = Date.now();
      const items: SentenceItem[] = processed.map(({ id, text, characterKeys, locationKey }, idx) => {
        const subscribeLike = isSubscribeCtaSentence(text);
        return {
          id: id || `${now}-${idx}`,
          text,
          characterKeys: characterKeys.length ? Array.from(new Set(characterKeys)) : null,
          locationKey,
          forcedLocationKey: locationKey,
          mediaMode: 'single',
          sceneTab: subscribeLike ? 'video' : 'image',
          forcedCharacterKeys: Array.from(new Set(characterKeys)),
          image: null,
          imageUrl: null,
          video: subscribeLike ? null : null,
          videoUrl: subscribeLike ? '/subscribe.mp4' : null,
          startImage: null,
          startImageUrl: null,
          startImagePrompt: null,
          startSavedImageId: null,
          endImage: null,
          endImageUrl: null,
          endImagePrompt: null,
          endSavedImageId: null,
          isSuspense: false,
        };
      });

      setFullScriptId(null);
      setActiveScriptId(null);
      setActiveShortTabIndex(null);
      setShortRanges([]);
      setShortScriptIds([]);
      setManualSplitEnabled(false);
      setShortsValidationError(null);
      tabSnapshotsRef.current = {};
      aiSplitCacheRef.current = null;
      setSentences(items);
      setScriptCharacters(Array.isArray(data.characters) ? data.characters : []);
      setScriptLocations(Array.isArray(data.locations) ? data.locations : []);
    } catch (error) {
      console.error('Split script failed', error);
      setSplitError('Failed to split script. Please try again.');
    } finally {
      setIsSplitting(false);
    }
  };

  const handleSplitIntoShortsWithAi = async () => {
    if (!isLongForm) return;
    if (sentences.length === 0) return;

    setIsSplittingIntoShorts(true);
    try {
      // Persist any edits on the current tab before splitting.
      tabSnapshotsRef.current[tabKeyForIndex(activeShortTabIndex)] =
        captureActiveTabSnapshot();

      // Ensure we have a stable full snapshot to split from.
      if (activeShortTabIndex === null) {
        tabSnapshotsRef.current.full = tabSnapshotsRef.current.full ?? captureActiveTabSnapshot();
      }

      const fullSnapshot = tabSnapshotsRef.current.full;
      if (!fullSnapshot) {
        showToast('Unable to locate Full Video content for splitting.', 'error');
        return;
      }

      const fullSentences = fullSnapshot.sentences;
      const storySentences = fullSentences.filter((s) => !isSubscribeLikeSentence(s.text));
      const storyTexts = storySentences.map((s) => String(s.text ?? '').trim()).filter(Boolean);

      if (storyTexts.length < 2) {
        showToast('Not enough sentences to split into shorts.', 'error');
        return;
      }

      const res = await api.post('/ai/split-into-shorts', {
        sentences: storyTexts,
        model: imagePromptModel,
      });

      const data = res.data as { ranges?: Array<{ start: number; end: number }> };
      const ranges = Array.isArray(data?.ranges) ? data.ranges : [];

      // This was generated by AI, so the Manual split switch should be OFF.
      setManualSplitEnabled(false);
      setShortRanges(ranges);
      const error = rebuildShortTabSnapshots(ranges);
      if (error) {
        showToast(error, 'error');
        return;
      }

      // Cache the AI split so toggling Manual split OFF can restore it.
      const shortSnapshotsByKey: Record<string, TabSnapshot> = {};
      for (let i = 0; i < ranges.length; i += 1) {
        const key = tabKeyForIndex(i);
        const snap = tabSnapshotsRef.current[key];
        if (snap) shortSnapshotsByKey[key] = cloneSnapshot(snap);
      }
      aiSplitCacheRef.current = {
        ranges: ranges.map((r) => ({ start: r.start, end: r.end })),
        shortSnapshotsByKey,
      };

      // After re-splitting, return to Full Video to avoid landing on an invalid short tab index.
      setActiveShortTabIndex(null);
      applyTabSnapshot(fullSnapshot);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Split into shorts failed', error);
      showToast('Failed to split into shorts. Please try again.', 'error');
    } finally {
      setIsSplittingIntoShorts(false);
    }
  };

  const handleSplitIntoShortsManually = () => {
    if (!isLongForm) return;
    if (sentences.length === 0) return;

    // Persist any edits on the current tab before splitting.
    tabSnapshotsRef.current[tabKeyForIndex(activeShortTabIndex)] =
      captureActiveTabSnapshot();

    // Ensure we have a stable full snapshot to split from.
    if (activeShortTabIndex === null) {
      tabSnapshotsRef.current.full = tabSnapshotsRef.current.full ?? captureActiveTabSnapshot();
    }

    const fullSnapshot = tabSnapshotsRef.current.full;
    if (!fullSnapshot) {
      showToast('Unable to locate Full Video content for splitting.', 'error');
      return;
    }

    const fullSentences = fullSnapshot.sentences;
    const storySentences = fullSentences.filter((s) => !isSubscribeLikeSentence(s.text));
    const ranges = buildManualShortRanges(storySentences);

    const error = rebuildShortTabSnapshots(ranges);
    if (error) {
      showToast(error, 'error');
      return;
    }

    setManualSplitEnabled(true);
    setShortRanges(ranges);
    setActiveShortTabIndex(null);
    applyTabSnapshot(fullSnapshot);
  };

  const handleResetScriptAndSentences = () => {
    // Also reset any voice-over + video generation artifacts.
    stopVoicePreview();
    removeVoice();
    setVoiceError(null);
    setIsPreviewingVoice(false);
    setIsGeneratingVoice(false);
    setVoiceGenerationProgress(null);
    setIsSavingVoice(false);
    setIsVoiceLibraryOpen(false);
    setAiStudioStyleInstructions('');

    resetJob();

    setFullScriptId(null);
    setActiveScriptId(null);
    setActiveShortTabIndex(null);
    setShortRanges([]);
    setShortScriptIds([]);
    setManualSplitEnabled(false);
    setShortsValidationError(null);
    tabSnapshotsRef.current = {};
    aiSplitCacheRef.current = null;
    aiSplitCacheRef.current = null;
    setScript('');
    setSentences([]);
    setSplitError(null);
    setScriptCharacters([]);
    setScriptLocations([]);
    setOriginalScriptSubject(undefined);
    setOriginalScriptSubjectContent(undefined);
  };

  const handleScriptCharactersChange = (next: ScriptCharacter[]) => {
    setScriptCharacters(Array.isArray(next) ? next : []);
  };

  const handleScriptLocationsChange = (next: ScriptLocation[]) => {
    setScriptLocations(Array.isArray(next) ? next : []);
  };

  const handleOpenScriptLibrary = () => {
    setIsScriptLibraryOpen(true);
  };

  const mapBackendSentencesToUi = (backend: BackendSentenceDto[]): SentenceItem[] => {
    const sorted = [...backend].sort((a, b) => a.index - b.index);
    return sorted.map((s) => {
      const subscribeLike = isSubscribeLikeSentence(s.text);

      const inferredCharacterKeys = Array.isArray(s.character_keys)
        ? s.character_keys
        : null;
      const forcedCharacterKeys = Array.isArray(s.forced_character_keys)
        ? s.forced_character_keys
        : null;
      const resolvedForcedCharacterKeys =
        forcedCharacterKeys ?? inferredCharacterKeys;

      const inferredLocationKey = String(s.location_key ?? '').trim() || null;
      const forcedLocationKey =
        s.forced_location_key === null || s.forced_location_key === undefined
          ? null
          : String(s.forced_location_key).trim();
      const resolvedForcedLocationKey =
        forcedLocationKey !== null ? forcedLocationKey : inferredLocationKey;

      const soundEffects = (s.sound_effects ?? [])
        .slice()
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
        .map((row) => {
          const lib = row.sound_effect;
          const resolvedVolumePercent =
            row.volume_percent ?? (lib?.volume_percent ?? 100);

          return {
            id: lib.id,
            title: lib.title,
            url: lib.url,
            delaySeconds: Number(row.delay_seconds ?? 0) || 0,
            volumePercent: Math.max(
              0,
              Math.min(300, Number(resolvedVolumePercent ?? 100) || 100),
            ),
            audioSettings: cloneSoundEffectAudioSettings(
              row.audio_settings_override ?? lib?.audio_settings,
            ),
            defaultAudioSettings: cloneSoundEffectAudioSettings(lib?.audio_settings),
            timingMode: (
              row.timing_mode === 'after_previous_ends'
                ? 'afterPreviousEnds'
                : 'withPrevious'
            ) as 'withPrevious' | 'afterPreviousEnds',
            durationSeconds:
              typeof lib?.duration_seconds === 'number' &&
                Number.isFinite(lib.duration_seconds)
                ? Math.max(0, lib.duration_seconds)
                : null,
          };
        });
      const textSoundEffects = normalizeDetachedSentenceSoundEffects(
        s.text_animation_sound_effects ?? s.textAnimationSoundEffects,
      );
      const overlaySoundEffects = normalizeDetachedSentenceSoundEffects(
        s.overlay_sound_effects ?? s.overlaySoundEffects,
      );

      const transitionSoundEffects = (s.transition_sound_effects ?? [])
        .map((row) => ({
          id: String(row.sound_effect_id ?? '').trim(),
          title: String(row.title ?? 'Transition sound').trim() || 'Transition sound',
          url: String(row.url ?? '').trim(),
          delaySeconds: Math.max(0, Number(row.delay_seconds ?? 0) || 0),
          volumePercent: Math.max(0, Math.min(300, Number(row.volume_percent ?? 100) || 100)),
        }))
        .filter((row) => Boolean(row.id) && Boolean(row.url));

      const sceneTabValue = s.scene_tab ?? s.sceneTab ?? null;
      const alignSoundEffectsToSceneEnd =
        s.align_sound_effects_to_scene_end ?? s.alignSoundEffectsToSceneEnd ?? null;
      const imageEffectsMode = s.image_effects_mode ?? s.imageEffectsMode ?? null;
      const imageFilterId = s.image_filter_id ?? s.imageFilterId ?? null;
      const imageFilterSettings = s.image_filter_settings ?? s.imageFilterSettings ?? null;
      const motionEffectId = s.motion_effect_id ?? s.motionEffectId ?? null;
      const imageMotionSettings = s.image_motion_settings ?? s.imageMotionSettings ?? null;
      const textAnimationTextValue = s.text_animation_text ?? s.textAnimationText ?? null;
      const textAnimationEffectValue = s.text_animation_effect ?? s.textAnimationEffect ?? null;
      const textAnimationId = s.text_animation_id ?? s.textAnimationId ?? null;
      const textAnimationSettingsValue =
        s.text_animation_settings ?? s.textAnimationSettings ?? null;
      const overlayId = s.overlay_id ?? s.overlayId ?? s.overlay?.id ?? null;
      const overlaySettingsValue = s.overlay_settings ?? s.overlaySettings ?? s.overlay?.settings ?? null;
      const overlayUrl = s.overlay?.url ?? null;
      const overlayMimeType = s.overlay?.mime_type ?? s.overlay?.mimeType ?? null;
      const videoPromptValue = s.video_prompt ?? s.videoPrompt ?? null;
      const transitionToNext = s.transition_to_next ?? s.transitionToNext ?? null;
      const visualEffect = s.visual_effect ?? s.visualEffect ?? null;
      const imageMotionEffect = s.image_motion_effect ?? s.imageMotionEffect ?? 'default';
      const imageMotionSpeed = s.image_motion_speed ?? s.imageMotionSpeed ?? null;
      const voiceOverUrl = s.voice_over_url ?? s.voiceOverUrl ?? null;
      const voiceOverMimeType =
        s.voice_over_mime_type ?? s.voiceOverMimeType ?? null;
      const voiceOverDurationSeconds =
        s.voice_over_duration_seconds ?? s.voiceOverDurationSeconds ?? null;
      const voiceOverProvider =
        s.voice_over_provider ?? s.voiceOverProvider ?? null;
      const voiceOverVoiceId =
        s.voice_over_voice_id ?? s.voiceOverVoiceId ?? null;
      const voiceOverVoiceName =
        s.voice_over_voice_name ?? s.voiceOverVoiceName ?? null;
      const voiceOverStyleInstructions =
        s.voice_over_style_instructions ?? s.voiceOverStyleInstructions ?? null;
      const elevenLabsSettings =
        s.eleven_labs_settings ?? s.elevenLabsSettings ?? null;
      const elevenLabsModel = s.eleven_labs_model ?? s.elevenLabsModel ?? null;

      const hasTextSceneData = Boolean(
        textAnimationEffectValue ||
        textAnimationId ||
        textAnimationSettingsValue ||
        textAnimationTextValue ||
        s.textBackgroundImage ||
        s.textBackgroundVideo,
      );
      const hasOverlaySceneData = Boolean(
        overlayId || overlaySettingsValue || overlayUrl,
      );
      const resolvedSceneTab = subscribeLike
        ? 'video'
        : sceneTabValue === 'image' ||
          sceneTabValue === 'video' ||
          sceneTabValue === 'text' ||
          sceneTabValue === 'overlay'
          ? sceneTabValue
          : hasOverlaySceneData
            ? 'overlay'
            : hasTextSceneData
              ? 'text'
              : s.video
                ? 'video'
                : 'image';
      const textAnimationEffect = resolveTextAnimationEffectFromSettings(
        textAnimationSettingsValue,
        textAnimationEffectValue,
      );
      const resolvedTextAnimationText = resolveTextAnimationText(
        textAnimationTextValue,
        s.text,
      );
      const normalizedTextAnimationSettings = normalizeTextAnimationSettings(
        textAnimationSettingsValue,
        textAnimationEffect,
        effectiveIsShort,
        resolvedTextAnimationText,
      );
      const normalizedTextAnimationText =
        typeof textAnimationTextValue === 'string' && textAnimationTextValue.trim().length > 0
          ? textAnimationTextValue
          : null;

      return {
        id: s.id,
        text: s.text,
        voiceOverFile: null,
        voiceOverUrl: String(voiceOverUrl ?? '').trim() || null,
        voiceOverMimeType: String(voiceOverMimeType ?? '').trim() || null,
        voiceOverDurationSeconds:
          typeof voiceOverDurationSeconds === 'number' &&
            Number.isFinite(voiceOverDurationSeconds)
            ? Math.max(0, voiceOverDurationSeconds)
            : null,
        voiceOverProvider:
          voiceOverProvider === 'google' || voiceOverProvider === 'elevenlabs'
            ? voiceOverProvider
            : null,
        voiceOverVoiceId: String(voiceOverVoiceId ?? '').trim() || null,
        voiceOverVoiceName: String(voiceOverVoiceName ?? '').trim() || null,
        voiceOverStyleInstructions:
          String(voiceOverStyleInstructions ?? '').trim() || null,
        elevenLabsSettings:
          normalizeOptionalElevenLabsVoiceSettings(elevenLabsSettings),
        elevenLabsModel: normalizeOptionalElevenLabsModel(elevenLabsModel),
        alignSoundEffectsToSceneEnd: alignSoundEffectsToSceneEnd === true,
        soundEffects,
        textSoundEffects,
        overlaySoundEffects,
        transitionSoundEffects,
        characterKeys: inferredCharacterKeys,
        locationKey: inferredLocationKey,
        forcedLocationKey: resolvedForcedLocationKey,
        mediaMode: subscribeLike || s.startFrameImage || s.endFrameImage ? 'frames' : 'single',
        sceneTab: resolvedSceneTab,
        forcedCharacterKeys: resolvedForcedCharacterKeys,
        transitionToNext,
        imageEffectsMode: imageEffectsMode === 'detailed' ? 'detailed' : 'quick',
        visualEffect,
        customImageFilterId: imageFilterId,
        imageFilterSettings: normalizeSettingsObject(imageFilterSettings),
        textAnimationEffect,
        textAnimationText: normalizedTextAnimationText,
        customTextAnimationId: textAnimationId,
        textAnimationSettings: normalizedTextAnimationSettings,
        customOverlayId: String(overlayId ?? '').trim() || null,
        overlayFile: null,
        overlayUrl: String(overlayUrl ?? '').trim() || null,
        overlayMimeType: String(overlayMimeType ?? '').trim() || null,
        overlaySettings: overlaySettingsValue
          ? normalizeOverlaySettings(overlaySettingsValue)
          : null,
        imageMotionEffect,
        customMotionEffectId: motionEffectId,
        imageMotionSettings: normalizeSettingsObject(imageMotionSettings),
        imageMotionSpeed: normalizeImageMotionSpeedValue(imageMotionSpeed),
        image: null,
        imageUrl: subscribeLike ? null : s.image?.image ?? null,
        textBackgroundImage: null,
        textBackgroundImageUrl: subscribeLike ? null : s.textBackgroundImage?.image ?? null,
        textBackgroundSavedImageId: s.textBackgroundImage?.id ?? null,
        textBackgroundVideo: null,
        textBackgroundVideoUrl: subscribeLike ? null : s.textBackgroundVideo?.video ?? null,
        textBackgroundSavedVideoId: s.textBackgroundVideo?.id ?? null,
        secondaryImage: null,
        secondaryImageUrl: subscribeLike ? null : s.secondaryImage?.image ?? null,
        secondaryImagePrompt: s.secondaryImage?.prompt ?? null,
        secondarySavedImageId: s.secondaryImage?.id ?? null,
        isGeneratingSecondaryImage: false,
        hasSecondaryImageSlot: !subscribeLike && Boolean(s.secondaryImage?.image),
        startImage: null,
        startImageUrl: s.startFrameImage?.image ?? null,
        startImagePrompt: s.startFrameImage?.prompt ?? null,
        startSavedImageId: s.startFrameImage?.id ?? null,
        endImage: null,
        endImageUrl: s.endFrameImage?.image ?? null,
        endImagePrompt: s.endFrameImage?.prompt ?? null,
        endSavedImageId: s.endFrameImage?.id ?? null,
        video: null,
        videoUrl: subscribeLike ? '/subscribe.mp4' : s.video?.video ?? null,
        savedVideoId: s.video?.id ?? null,
        videoPrompt: String(videoPromptValue ?? '').trim() || null,
        imagePrompt: s.image?.prompt ?? null,
        isGeneratingImage: false,
        isGeneratingStartImage: false,
        isGeneratingEndImage: false,
        isSavingImage: false,
        savedImageId: subscribeLike ? null : s.image?.id ?? null,
        isFromLibrary: !!s.image,
        isSuspense: !subscribeLike && Boolean(s.isSuspense),
      };
    });
  };

  const hydrateVoiceStateFromDraft = async (params: {
    voice?: { id: string; voice: string } | null;
    voiceOverChunks?: ScriptVoiceOverChunkDto[] | null;
    fallbackBaseName: string;
  }): Promise<{
    voiceFile: File | null;
    voiceDuration: number | null;
    savedVoiceId: string | null;
    voiceLibraryUrl: string | null;
    voiceOverChunks: VoiceOverChunkState[];
  }> => {
    const chunkedVoice = await rebuildVoiceOverFromSavedChunks({
      chunks: params.voiceOverChunks,
      fallbackBaseName: params.fallbackBaseName,
    }).catch((error) => {
      console.error('Failed to rebuild saved voice chunks', error);
      return null;
    });

    if (chunkedVoice) {
      return {
        voiceFile: chunkedVoice.file,
        voiceDuration: chunkedVoice.durationSeconds,
        savedVoiceId: params.voice?.id ?? null,
        voiceLibraryUrl: null,
        voiceOverChunks: cloneVoiceOverChunks(chunkedVoice.chunks),
      };
    }

    if (params.voice?.voice) {
      return {
        voiceFile: null,
        voiceDuration: await getAudioDurationSecondsFromUrl(params.voice.voice),
        savedVoiceId: params.voice.id ?? null,
        voiceLibraryUrl: params.voice.voice,
        voiceOverChunks: [],
      };
    }

    return {
      voiceFile: null,
      voiceDuration: null,
      savedVoiceId: null,
      voiceLibraryUrl: null,
      voiceOverChunks: [],
    };
  };

  const handleSelectScriptFromLibrary = async (draft: ScriptDraftDto) => {
    setActiveScriptId(draft.id);
    setFullScriptId(draft.id);
    setActiveShortTabIndex(null);
    setManualSplitEnabled(false);
    setShortRanges([]);
    setShortScriptIds([]);
    setShortsValidationError(null);
    resetJob();
    resetTestVideoJob();

    Object.keys(tabSnapshotsRef.current)
      .filter((k) => k.startsWith('short-'))
      .forEach((k) => {
        delete tabSnapshotsRef.current[k as keyof typeof tabSnapshotsRef.current];
      });

    setScript(String(draft.script ?? ''));
    if (draft.language) {
      setScriptLanguage(String(draft.language));
    }

    const loadedSubject = String(draft.subject ?? '').trim();
    const loadedSubjectContent = String(draft.subject_content ?? '').trim();
    if (loadedSubject) {
      setScriptSubject(loadedSubject);
    }
    setScriptSubjectContent(loadedSubjectContent);
    if (draft.length) {
      setScriptLength(String(draft.length));
    }
    if (draft.style) {
      setScriptStyle(String(draft.style));
    }
    if (draft.technique) {
      setScriptTechnique(String(draft.technique));
    }

    setReferenceScripts(
      Array.isArray(draft.reference_scripts)
        ? draft.reference_scripts.map((item) => ({
          id: item.id,
          title: item.title,
          script: item.script,
        }))
        : [],
    );

    setOriginalScriptSubject(loadedSubject || undefined);
    setOriginalScriptSubjectContent(
      loadedSubject === 'religious (Islam)' ? loadedSubjectContent : '',
    );

    const loadedVoiceGenerationConfig = draft.voice_generation_config ?? null;
    setVoiceGenerationMode(
      normalizeVoiceGenerationMode(loadedVoiceGenerationConfig?.mode),
    );
    setVoiceProvider(
      loadedVoiceGenerationConfig?.provider === 'elevenlabs'
        ? 'elevenlabs'
        : 'google',
    );
    setAiStudioStyleInstructions(
      String(loadedVoiceGenerationConfig?.styleInstructions ?? '').trim(),
    );
    setElevenLabsAutoGenerationStrategy(
      normalizeElevenLabsAutoGenerationStrategy(
        loadedVoiceGenerationConfig?.elevenLabsAutoGenerationStrategy,
      ),
    );
    setElevenLabsGlobalModel(
      normalizeElevenLabsModel(loadedVoiceGenerationConfig?.elevenLabsModel),
    );
    setElevenLabsGlobalSettings(
      normalizeOptionalElevenLabsVoiceSettings(
        loadedVoiceGenerationConfig?.elevenLabsSettings,
      ),
    );
    if (loadedVoiceGenerationConfig?.provider) {
      setSelectedVoiceIdByProvider((prev) => ({
        ...prev,
        [loadedVoiceGenerationConfig.provider as VoiceProvider]:
          String(loadedVoiceGenerationConfig.providerVoiceId ?? '').trim() || null,
      }));
    }

    setScriptCharacters(Array.isArray(draft.characters) ? draft.characters : []);
    setScriptLocations(Array.isArray(draft.locations) ? draft.locations : []);

    setVoiceOver(null);
    setVoiceOverChunks([]);
    setVoiceDuration(null);
    setSavedVoiceId(null);
    setVoiceLibraryUrl(null);

    let mappedDraftSentences: SentenceItem[] = [];
    if (draft.sentences && draft.sentences.length > 0) {
      const mapped = mapBackendSentencesToUi(draft.sentences);
      mappedDraftSentences = mapped;
      setSentences(mapped);

      tabSnapshotsRef.current.full = {
        scriptId: draft.id,
        sentences: mapped,
        voiceOver: null,
        voiceOverChunks: [],
        voiceDuration: null,
        savedVoiceId: null,
        voiceLibraryUrl: null,
        videoJobId: null,
        videoJobStatus: null,
        videoJobError: null,
        videoUrl: draft.video_url ?? null,
      };
    } else {
      setSentences([]);
    }

    const shouldHydrateVoiceOver =
      Boolean(String(draft.voice?.voice ?? '').trim()) ||
      Boolean(draft.voice_over_chunks?.length) ||
      mappedDraftSentences.some((sentence) => hasSentenceVoiceOver(sentence));

    setIsHydratingVoiceOver(shouldHydrateVoiceOver);

    let resolvedDraftVoiceFile: File | null = null;
    let resolvedDraftVoiceDuration: number | null = null;
    let resolvedDraftVoiceChunks: VoiceOverChunkState[] = [];
    let resolvedDraftSavedVoiceId: string | null = null;
    let resolvedDraftVoiceLibraryUrl: string | null = null;

    try {
      const loadedVoiceState = await hydrateVoiceStateFromDraft({
        voice: draft.voice ?? null,
        voiceOverChunks: draft.voice_over_chunks,
        fallbackBaseName: 'draft-voice-over',
      });
      const rebuiltSentenceVoiceState =
        !loadedVoiceState.voiceFile &&
          !loadedVoiceState.voiceLibraryUrl &&
          mappedDraftSentences.some((sentence) => hasSentenceVoiceOver(sentence))
          ? await rebuildVoiceOverFromSentenceVoices({
            sourceSentences: mappedDraftSentences,
            fallbackBaseName: 'draft-voice-over',
          }).catch((error) => {
            console.error('Failed to rebuild draft sentence voices', error);
            return null;
          })
          : null;

      setVoiceOver(loadedVoiceState.voiceFile);
      setVoiceOverChunks(loadedVoiceState.voiceOverChunks);
      setVoiceDuration(loadedVoiceState.voiceDuration);
      setSavedVoiceId(loadedVoiceState.savedVoiceId);
      setVoiceLibraryUrl(loadedVoiceState.voiceLibraryUrl);

      if (rebuiltSentenceVoiceState) {
        setVoiceOver(rebuiltSentenceVoiceState.file);
        setVoiceOverChunks([]);
        setVoiceDuration(rebuiltSentenceVoiceState.durationSeconds);
        setSavedVoiceId(null);
        setVoiceLibraryUrl(null);
      }

      resolvedDraftVoiceFile = rebuiltSentenceVoiceState?.file ?? loadedVoiceState.voiceFile;
      resolvedDraftVoiceDuration =
        rebuiltSentenceVoiceState?.durationSeconds ?? loadedVoiceState.voiceDuration;
      resolvedDraftVoiceChunks = rebuiltSentenceVoiceState
        ? []
        : cloneVoiceOverChunks(loadedVoiceState.voiceOverChunks);
      resolvedDraftSavedVoiceId = rebuiltSentenceVoiceState
        ? null
        : loadedVoiceState.savedVoiceId;
      resolvedDraftVoiceLibraryUrl = rebuiltSentenceVoiceState
        ? null
        : loadedVoiceState.voiceLibraryUrl;
    } finally {
      setIsHydratingVoiceOver(false);
    }

    if (tabSnapshotsRef.current.full) {
      tabSnapshotsRef.current.full = {
        ...tabSnapshotsRef.current.full,
        voiceOver: resolvedDraftVoiceFile,
        voiceOverChunks: resolvedDraftVoiceChunks,
        voiceDuration: resolvedDraftVoiceDuration,
        savedVoiceId: resolvedDraftSavedVoiceId,
        voiceLibraryUrl: resolvedDraftVoiceLibraryUrl,
      };
    }

    if (draft.video_url) {
      setVideoJobError(null);
      setVideoUrl(draft.video_url);
      setJobFromResponse(draft.id, 'completed');

      if (videoSectionRef.current) {
        videoSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    setSplitError(null);
    setRandomScriptError(null);

    const shortIds = Array.isArray(draft.shorts_scripts)
      ? draft.shorts_scripts.map((s: string) => String(s ?? '').trim()).filter(Boolean)
      : [];

    if (shortIds.length > 0) {
      setManualSplitEnabled(true);
      setShortScriptIds(shortIds);

      void (async () => {
        try {
          const embeddedShorts = Array.isArray(draft.short_scripts)
            ? draft.short_scripts
            : [];

          if (embeddedShorts.length === 0) {
            console.warn('Selected script has shorts_scripts but no short_scripts payload.');
            return;
          }

          const fullSnapshot = tabSnapshotsRef.current.full;
          const fullSentencesForMatch = fullSnapshot?.sentences ?? [];
          const fullStory = fullSentencesForMatch
            .filter((s) => !isSubscribeLikeSentence(s.text))
            .map((s) => normalizeSentenceForMatch(s.text));

          const ranges: Array<{ start: number; end: number }> = [];
          let cursor = 0;

          for (let idx = 0; idx < embeddedShorts.length; idx += 1) {
            const shortScript = embeddedShorts[idx];
            const mappedShortRaw = Array.isArray(shortScript.sentences)
              ? mapBackendSentencesToUi(shortScript.sentences)
              : [];
            const mappedShort = normalizeShortTabSentences(mappedShortRaw);
            const shortVoiceGenerationConfig =
              shortScript.voice_generation_config ?? loadedVoiceGenerationConfig;

            const shortVoiceState = await hydrateVoiceStateFromDraft({
              voice: shortScript.voice ?? null,
              voiceOverChunks: shortScript.voice_over_chunks,
              fallbackBaseName: `draft-short-${idx + 1}-voice-over`,
            });
            const rebuiltShortSentenceVoiceState =
              !shortVoiceState.voiceFile &&
                !shortVoiceState.voiceLibraryUrl &&
                mappedShort.some((sentence) => hasSentenceVoiceOver(sentence))
                ? await rebuildVoiceOverFromSentenceVoices({
                  sourceSentences: mappedShort,
                  fallbackBaseName: `draft-short-${idx + 1}-voice-over`,
                }).catch((error) => {
                  console.error('Failed to rebuild short draft sentence voices', error);
                  return null;
                })
                : null;

            if (idx === 0 && shortVoiceGenerationConfig) {
              setVoiceGenerationMode(
                normalizeVoiceGenerationMode(shortVoiceGenerationConfig.mode),
              );
            }

            tabSnapshotsRef.current[tabKeyForIndex(idx)] = {
              scriptId: shortScript.id,
              sentences: mappedShort,
              voiceOver:
                rebuiltShortSentenceVoiceState?.file ?? shortVoiceState.voiceFile,
              voiceOverChunks: shortVoiceState.voiceOverChunks,
              voiceDuration:
                rebuiltShortSentenceVoiceState?.durationSeconds ??
                shortVoiceState.voiceDuration,
              savedVoiceId:
                rebuiltShortSentenceVoiceState ? null : shortVoiceState.savedVoiceId,
              voiceLibraryUrl:
                rebuiltShortSentenceVoiceState ? null : shortVoiceState.voiceLibraryUrl,
              videoJobId: null,
              videoJobStatus: null,
              videoJobError: null,
              videoUrl: shortScript.video_url ?? null,
            };

            const shortStory = mappedShort
              .filter((s) => !isSubscribeLikeSentence(s.text))
              .map((s) => normalizeSentenceForMatch(s.text));

            const len = shortStory.length;
            if (!len) return;

            let foundStart = -1;
            for (let i = cursor; i <= fullStory.length - len; i += 1) {
              let ok = true;
              for (let j = 0; j < len; j += 1) {
                if (fullStory[i + j] !== shortStory[j]) {
                  ok = false;
                  break;
                }
              }
              if (ok) {
                foundStart = i;
                break;
              }
            }

            if (foundStart === -1) {
              foundStart = cursor;
            }

            const end = Math.min(fullStory.length - 1, foundStart + len - 1);
            ranges.push({ start: foundStart, end });
            cursor = end + 1;
          }

          if (fullStory.length > 0 && ranges.length > 0) {
            setShortRanges(ranges);
          }
        } catch (e) {
          console.error('Failed to load short scripts', e);
        }
      })();
    }
  };

  handleSelectScriptFromLibraryRef.current = handleSelectScriptFromLibrary;

  useEffect(() => {
    if (isLoading || !user || !pendingScriptHandoffId) {
      return;
    }

    if (handledScriptHandoffRef.current === pendingScriptHandoffId) {
      return;
    }

    if (activeScriptHandoffRequestRef.current === pendingScriptHandoffId) {
      return;
    }

    handledScriptHandoffRef.current = pendingScriptHandoffId;
    activeScriptHandoffRequestRef.current = pendingScriptHandoffId;
    setIsLoadingScriptHandoff(true);

    void (async () => {
      try {
        const response = await api.get<ScriptDraftDto>(
          `/scripts/${encodeURIComponent(pendingScriptHandoffId)}`,
        );

        if (activeScriptHandoffRequestRef.current !== pendingScriptHandoffId) {
          return;
        }

        const loadScript = handleSelectScriptFromLibraryRef.current;
        if (!loadScript) {
          throw new Error('Script hydration handler is unavailable.');
        }

        await loadScript(response.data);
        clearPendingScriptHandoff();
      } catch (error) {
        console.error('Failed to load redirected script handoff:', error);

        if (activeScriptHandoffRequestRef.current !== pendingScriptHandoffId) {
          return;
        }

        showToast('Failed to load the selected script.', 'error');
        clearPendingScriptHandoff();
      } finally {
        if (activeScriptHandoffRequestRef.current === pendingScriptHandoffId) {
          activeScriptHandoffRequestRef.current = null;
        }

        setIsLoadingScriptHandoff(false);
      }
    })();
  }, [
    clearPendingScriptHandoff,
    isLoading,
    pendingScriptHandoffId,
    showToast,
    user,
  ]);

  const handleEnhanceScript = async () => {
    if (!script.trim()) {
      setRandomScriptError('Please enter or generate a script before enhancing.');
      return;
    }

    try {
      setRandomScriptError(null);
      setIsEnhancingScript(true);
      // Clear any previous split state but keep the prior script
      setSentences([]);
      setSplitError(null);

      const res = await fetch(`${API_URL}/ai/enhance-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script,
          language: scriptLanguage,
          length: scriptLength,
          style: scriptStyle,
          technique: scriptTechnique,
          model: scriptModel,
          systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to start script enhancement');
      }

      // Start streaming the enhanced script into the textarea
      setScript('');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          setScript((prev) => prev + chunk);
        }
      }
    } catch (error) {
      console.error('Enhance script failed', error);
      setRandomScriptError('Failed to enhance script. Please try again.');
    } finally {
      setIsEnhancingScript(false);
    }
  };

  const handleSentenceImageUpload = (
    index: number,
    e: ChangeEvent<HTMLInputElement>,
    slot: SentenceImageSlot = 'primary',
  ) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const isVideo = file.type?.startsWith('video/');
    setSentences((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            mediaMode: 'single',
            sceneTab: isVideo ? 'video' : 'image',
            image:
              slot === 'primary' && !isVideo ? file : item.image ?? null,
            imageUrl:
              slot === 'primary' && !isVideo ? null : item.imageUrl ?? null,
            secondaryImage:
              slot === 'secondary' && !isVideo ? file : item.secondaryImage ?? null,
            secondaryImageUrl:
              slot === 'secondary' && !isVideo ? null : item.secondaryImageUrl ?? null,
            video: isVideo ? file : null,
            videoUrl: isVideo ? null : null,
            savedVideoId: null,
            imagePrompt:
              isVideo
                ? null
                : slot === 'primary'
                  ? null
                  : item.imagePrompt,
            secondaryImagePrompt:
              isVideo
                ? null
                : slot === 'secondary'
                  ? null
                  : item.secondaryImagePrompt ?? null,
            savedImageId: slot === 'primary' ? null : item.savedImageId ?? null,
            secondarySavedImageId:
              slot === 'secondary' ? null : item.secondarySavedImageId ?? null,
            hasSecondaryImageSlot:
              slot === 'secondary'
                ? true
                : item.hasSecondaryImageSlot || Boolean(item.secondaryImage || item.secondaryImageUrl),
            isFromLibrary: false,
          }
          : item,
      ),
    );
  };

  const handleSentenceVideoUpload = (
    index: number,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';

    if (!file) return;

    if (!String(file.type ?? '').startsWith('video/')) {
      showAlert('Please choose a video file.', { type: 'warning' });
      return;
    }

    setSentences((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            mediaMode: 'frames',
            sceneTab: 'video',
            video: file,
            videoUrl: null,
            savedVideoId: null,
            framesVideoUrl: null,
            framesSavedVideoId: null,
            textVideoUrl: null,
            textSavedVideoId: null,
            referenceVideoUrl: null,
            referenceSavedVideoId: null,
          }
          : item,
      ),
    );
  };

  const handleAddSentenceImageSlot = (index: number) => {
    setSentences((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            hasSecondaryImageSlot: true,
          }
          : item,
      ),
    );
  };

  const handleSentenceMediaModeChange = (
    index: number,
    mode: 'single' | 'frames',
  ) => {
    setSentences((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        // When switching from Image -> Video, seed the video reference/start frame
        // from the existing single image (if present) so users don't need to re-select it.
        // Only fill empty targets; never overwrite explicit video inputs.
        const hasSingleImage = Boolean(item.image || item.imageUrl);
        const hasReference = Boolean(item.referenceImage || item.referenceImageUrl);
        const hasStartFrame = Boolean(item.startImage || item.startImageUrl);

        const seededReferenceFields =
          mode === 'frames' && hasSingleImage && !hasReference
            ? {
              referenceImage: item.image ?? null,
              referenceImageUrl: item.image ? null : item.imageUrl ?? null,
            }
            : {};

        const seededStartFrameFields =
          mode === 'frames' && hasSingleImage && !hasStartFrame
            ? {
              startImage: item.image ?? null,
              startImageUrl: item.image ? null : item.imageUrl ?? null,
            }
            : {};

        // Important: do not clear previously generated/uploaded media when toggling.
        // Users may want to switch modes temporarily and come back without losing frames.
        return {
          ...item,
          mediaMode: mode,
          sceneTab: mode === 'frames' ? 'video' : 'image',
          ...seededReferenceFields,
          ...seededStartFrameFields,
        };
      }),
    );
  };

  const handleSentenceFrameImageUpload = (
    index: number,
    which: 'start' | 'end',
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const target = sentences[index];

    // Uploaded start/end frames are not persisted unless the draft exists.
    // Require a saved/loaded draft so the user doesn't lose frame images on refresh.
    // if (!activeScriptId || !target || !isUuid(target.id)) {
    //   showAlert('Save/load this script draft first to persist frame images.', {
    //     type: 'warning',
    //   });
    //   // Reset input so selecting the same file again still triggers onChange.
    //   // eslint-disable-next-line no-param-reassign
    //   e.target.value = '';
    //   return;
    // }

    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.type?.startsWith('image/')) return;

    setSentences((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          mediaMode: 'frames',
          startImage: which === 'start' ? file : item.startImage ?? null,
          startImageUrl: which === 'start' ? null : item.startImageUrl ?? null,
          startImagePrompt: which === 'start' ? null : item.startImagePrompt ?? null,
          startSavedImageId: which === 'start' ? null : item.startSavedImageId ?? null,
          endImage: which === 'end' ? file : item.endImage ?? null,
          endImageUrl: which === 'end' ? null : item.endImageUrl ?? null,
          endImagePrompt: which === 'end' ? null : item.endImagePrompt ?? null,
          endSavedImageId: which === 'end' ? null : item.endSavedImageId ?? null,
        };
      }),
    );
  };

  const removeSentenceFrameImage = (index: number, which: 'start' | 'end') => {
    setSentences((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          startImage: which === 'start' ? null : item.startImage ?? null,
          startImageUrl: which === 'start' ? null : item.startImageUrl ?? null,
          startImagePrompt: which === 'start' ? null : item.startImagePrompt ?? null,
          startSavedImageId: which === 'start' ? null : item.startSavedImageId ?? null,
          endImage: which === 'end' ? null : item.endImage ?? null,
          endImageUrl: which === 'end' ? null : item.endImageUrl ?? null,
          endImagePrompt: which === 'end' ? null : item.endImagePrompt ?? null,
          endSavedImageId: which === 'end' ? null : item.endSavedImageId ?? null,
        };
      }),
    );
  };

  const removeSentenceImage = (index: number, slot: SentenceImageSlot = 'primary') => {
    setSentences((prev) =>
      prev.map((item, i) =>
        i === index
          ? slot === 'secondary'
            ? {
              ...item,
              secondaryImage: null,
              secondaryImageUrl: null,
              secondaryImagePrompt: null,
              secondarySavedImageId: null,
              isGeneratingSecondaryImage: false,
              hasSecondaryImageSlot: false,
            }
            : item.secondaryImage || item.secondaryImageUrl
              ? {
                ...item,
                image: item.secondaryImage ?? null,
                imageUrl: item.secondaryImage ? null : item.secondaryImageUrl ?? null,
                imagePrompt: item.secondaryImagePrompt ?? null,
                savedImageId: item.secondarySavedImageId ?? null,
                secondaryImage: null,
                secondaryImageUrl: null,
                secondaryImagePrompt: null,
                secondarySavedImageId: null,
                isGeneratingImage: false,
                isGeneratingSecondaryImage: false,
                hasSecondaryImageSlot: false,
                isFromLibrary: Boolean(item.secondaryImageUrl),
              }
              : {
                ...item,
                image: null,
                imageUrl: null,
                secondaryImage: null,
                secondaryImageUrl: null,
                secondaryImagePrompt: null,
                secondarySavedImageId: null,
                video: null,
                videoUrl: null,
                savedVideoId: null,
                startImage: null,
                startImageUrl: null,
                startImagePrompt: null,
                startSavedImageId: null,
                endImage: null,
                endImageUrl: null,
                endImagePrompt: null,
                endSavedImageId: null,
                imagePrompt: null,
                savedImageId: null,
                isFromLibrary: false,
                sceneTab: 'image',
                mediaMode: 'single',
                hasSecondaryImageSlot: false,
              }
          : item,
      ),
    );
  };

  const handleGenerateSentenceImage = async (
    index: number,
    promptOverride?: string,
    slot: SentenceImageSlot = 'primary',
  ) => {
    const target = sentences[index];
    if (!target) return;
    const sentenceId = target.id;

    const {
      style,
      aspectRatio,
      promptModel,
      imageModel: currentImageModel,
    } = getCurrentImageGenerationConfig();

    patchSentenceById(sentenceId, {
      ...(slot === 'primary'
        ? { isGeneratingImage: true }
        : { isGeneratingSecondaryImage: true, hasSecondaryImageSlot: true }),
    });

    try {
      const res = await api.post('/ai/generate-image-from-sentence', {
        sentence: target.text,
        script,
        subject: scriptSubject,
        locations: scriptLocations.length ? scriptLocations : undefined,
        forcedLocationKey:
          typeof target.forcedLocationKey === 'string' ? target.forcedLocationKey.trim() : '',
        style,
        scriptLength,
        isShort: effectiveIsShort,
        aspectRatio,
        promptModel,
        imageModel: currentImageModel,
        characters: scriptCharacters.length ? scriptCharacters : undefined,
        forcedCharacterKeys: Array.isArray(target.forcedCharacterKeys)
          ? target.forcedCharacterKeys
          : undefined,
        imageVariant: slot === 'secondary' ? 'secondary' : 'primary',
        continuityPrompt:
          slot === 'secondary'
            ? String(target.imagePrompt ?? '').trim() || undefined
            : undefined,
        prompt: promptOverride?.trim() ? promptOverride.trim() : undefined,
      });

      const data = res.data as {
        prompt: string;
        imageBase64?: string;
        imageUrl?: string;
        savedImageId?: string;
      };

      const imageUrl =
        (data.imageUrl && String(data.imageUrl)) ||
        (data.imageBase64
          ? `data:image/png;base64,${data.imageBase64}`
          : null);

      if (!imageUrl) {
        throw new Error('Image generation returned no imageUrl');
      }

      updateSentenceById(sentenceId, (item) => ({
        ...item,
        ...(slot === 'primary'
          ? {
            imageUrl,
            image: null,
            imagePrompt: data.prompt,
            isGeneratingImage: false,
            savedImageId: data.savedImageId ?? item.savedImageId ?? null,
          }
          : {
            secondaryImageUrl: imageUrl,
            secondaryImage: null,
            secondaryImagePrompt: data.prompt,
            isGeneratingSecondaryImage: false,
            secondarySavedImageId:
              data.savedImageId ?? item.secondarySavedImageId ?? null,
            hasSecondaryImageSlot: true,
          }),
        isFromLibrary: false,
      }));
    } catch (error) {
      console.error('Generate image failed', error);
      patchSentenceById(sentenceId, {
        ...(slot === 'primary'
          ? { isGeneratingImage: false }
          : { isGeneratingSecondaryImage: false, hasSecondaryImageSlot: true }),
      });
      setSplitError('Failed to generate image for this sentence.');
    }
  };

  const handleGenerateSentenceReferenceImage = async (index: number) => {
    const target = sentences[index];
    if (!target) return;
    const sentenceId = target.id;

    const {
      style,
      aspectRatio,
      promptModel,
      imageModel: currentImageModel,
    } = getCurrentImageGenerationConfig();

    patchSentenceById(sentenceId, { isGeneratingReferenceImage: true });

    try {
      const res = await api.post('/ai/generate-image-from-sentence', {
        sentence: target.text,
        script,
        subject: scriptSubject,
        locations: scriptLocations.length ? scriptLocations : undefined,
        forcedLocationKey:
          typeof target.forcedLocationKey === 'string' ? target.forcedLocationKey.trim() : '',
        style,
        scriptLength,
        isShort: effectiveIsShort,
        aspectRatio,
        promptModel,
        imageModel: currentImageModel,
        characters: scriptCharacters.length ? scriptCharacters : undefined,
        forcedCharacterKeys: Array.isArray(target.forcedCharacterKeys)
          ? target.forcedCharacterKeys
          : undefined,
      });

      const data = res.data as {
        prompt: string;
        imageBase64?: string;
        imageUrl?: string;
      };

      const imageUrl =
        (data.imageUrl && String(data.imageUrl)) ||
        (data.imageBase64
          ? `data:image/png;base64,${data.imageBase64}`
          : null);

      if (!imageUrl) {
        throw new Error('Image generation returned no imageUrl');
      }

      patchSentenceById(sentenceId, {
        referenceImage: null,
        referenceImageUrl: imageUrl,
        isGeneratingReferenceImage: false,
      });
    } catch (error) {
      console.error('Generate reference image failed', error);
      patchSentenceById(sentenceId, { isGeneratingReferenceImage: false });
      setSplitError('Failed to generate reference image for this sentence.');
    }
  };

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );

  const handleGenerateSentenceFrameImage = async (
    index: number,
    which: 'start' | 'end',
  ) => {
    const target = sentences[index];
    if (!target) return;
    const sentenceId = target.id;

    const {
      style,
      aspectRatio,
      promptModel,
      imageModel: currentImageModel,
    } = getCurrentImageGenerationConfig();

    // if (!activeScriptId || !isUuid(target.id)) {
    //   showAlert('Save/load this script draft first to persist frame images.', {
    //     type: 'warning',
    //   });
    //   return;
    // }

    updateSentenceById(sentenceId, (item) => ({
      ...item,
      isGeneratingStartImage:
        which === 'start' ? true : item.isGeneratingStartImage,
      isGeneratingEndImage:
        which === 'end' ? true : item.isGeneratingEndImage,
    }));

    try {
      const continuityPrompt =
        which === 'end'
          ? (target.startImagePrompt ?? target.imagePrompt ?? undefined)
          : undefined;

      const res = await api.post('/ai/generate-image-from-sentence', {
        sentence: target.text,
        script,
        subject: scriptSubject,
        locations: scriptLocations.length ? scriptLocations : undefined,
        forcedLocationKey:
          typeof target.forcedLocationKey === 'string' ? target.forcedLocationKey.trim() : '',
        style,
        scriptLength,
        isShort: effectiveIsShort,
        aspectRatio,
        promptModel,
        imageModel: currentImageModel,
        characters: scriptCharacters.length ? scriptCharacters : undefined,
        forcedCharacterKeys: Array.isArray(target.forcedCharacterKeys)
          ? target.forcedCharacterKeys
          : undefined,
        frameType: which,
        continuityPrompt,
      });

      const data = res.data as {
        prompt: string;
        imageBase64?: string;
        imageUrl?: string;
        savedImageId?: string;
      };

      const imageUrl =
        (data.imageUrl && String(data.imageUrl)) ||
        (data.imageBase64
          ? `data:image/png;base64,${data.imageBase64}`
          : null);

      if (!imageUrl) {
        throw new Error('Image generation returned no imageUrl');
      }

      const savedId = data.savedImageId ?? null;

      updateSentenceById(sentenceId, (item) => {
        if (which === 'start') {
          return {
            ...item,
            startImageUrl: imageUrl,
            startImagePrompt: data.prompt,
            startSavedImageId: savedId,
            isGeneratingStartImage: false,
          };
        }
        return {
          ...item,
          endImageUrl: imageUrl,
          endImagePrompt: data.prompt,
          endSavedImageId: savedId,
          isGeneratingEndImage: false,
        };
      });

      if (!savedId) {
        showAlert('Frame image generated but not saved. Please try again.', {
          type: 'warning',
        });
        return;
      }
    } catch (error) {
      console.error('Generate frame image failed', error);
      updateSentenceById(sentenceId, (item) => ({
        ...item,
        isGeneratingStartImage:
          which === 'start' ? false : item.isGeneratingStartImage,
        isGeneratingEndImage:
          which === 'end' ? false : item.isGeneratingEndImage,
      }));
      setSplitError('Failed to generate frame image for this sentence.');
    }
  };

  const handleGenerateSentenceVideoFrames = async (index: number) => {
    const sentence = sentences[index];
    if (!sentence) return;
    const sentenceId = sentence.id;

    const scriptId = String(activeScriptId ?? '').trim();
    const canUsePersistedEndpoint = Boolean(scriptId) && isUuid(sentence.id);

    try {
      showToast('Generating video for this sentence…', 'info');

      const prompt = String(sentence.text ?? '').trim();
      if (!prompt) {
        showToast('Sentence text is required to generate a video.', 'error');
        return;
      }

      const isLooping = !sentence.endImage && !sentence.endImageUrl;

      const resolveFrameFile = async (
        which: 'start' | 'end',
      ): Promise<File | null> => {
        if (which === 'start') {
          if (sentence.startImage) return sentence.startImage;
          if (sentence.startImageUrl?.startsWith('data:')) {
            return dataUrlToFile(sentence.startImageUrl, `sentence-${index + 1}-start.png`);
          }
          if (sentence.startImageUrl) {
            const r = await fetch(sentence.startImageUrl);
            if (!r.ok) return null;
            const blob = await r.blob();
            return new File([blob], `sentence-${index + 1}-start.png`, {
              type: blob.type || 'image/png',
            });
          }
          return null;
        }

        // end frame
        if (sentence.endImage) return sentence.endImage;
        if (sentence.endImageUrl?.startsWith('data:')) {
          return dataUrlToFile(sentence.endImageUrl, `sentence-${index + 1}-end.png`);
        }
        if (sentence.endImageUrl) {
          const r = await fetch(sentence.endImageUrl);
          if (!r.ok) return null;
          const blob = await r.blob();
          return new File([blob], `sentence-${index + 1}-end.png`, {
            type: blob.type || 'image/png',
          });
        }
        return null;
      };

      const startFrame = await resolveFrameFile('start');
      if (!startFrame) {
        showToast('Start frame image is required.', 'error');
        return;
      }

      const endFrame = isLooping ? null : await resolveFrameFile('end');
      if (!isLooping && !endFrame) {
        showToast('End frame image is required (or enable looping).', 'error');
        return;
      }

      const form = new FormData();
      form.append('startFrame', startFrame);
      if (endFrame) {
        form.append('endFrame', endFrame);
      }
      form.append('isLooping', isLooping ? 'true' : 'false');
      form.append('prompt', prompt);
      form.append('aspectRatio', effectiveAspectRatio);

      let url: string | null = null;
      let savedVideoId: string | null = null;

      if (canUsePersistedEndpoint) {
        const res = await api.post(
          `/scripts/${encodeURIComponent(scriptId)}/sentences/${encodeURIComponent(
            sentence.id,
          )}/generate-video`,
          form,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          },
        );

        const updatedScript = res.data as {
          sentences?: Array<{
            id: string;
            video?: { id: string; video: string } | null;
          }>;
        };

        const updated = (updatedScript.sentences ?? []).find(
          (s) => s.id === sentence.id,
        );

        url = updated?.video?.video ?? null;
        savedVideoId = updated?.video?.id ?? null;
      } else {
        const res = await api.post('/ai/generate-video-from-frames', form, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        url = (res.data as { videoUrl?: string })?.videoUrl ?? null;
        savedVideoId = null;
      }

      if (!url) {
        showToast('Video generated but no URL was returned.', 'warning');
        return;
      }

      // Persist per-mode video so it can be restored when switching modes.
      patchSentenceById(sentenceId, {
        videoUrl: url,
        savedVideoId,
        framesVideoUrl: url,
        framesSavedVideoId: savedVideoId,
      });

      showToast('Sentence video generated.', 'success');
    } catch (error) {
      console.error('Generate sentence video failed', error);
      showToast('Failed to generate sentence video. Please try again.', 'error');
    }
  };

  const handleGenerateSentenceVideoFromText = async (index: number) => {
    const sentence = sentences[index];
    if (!sentence) return;
    const sentenceId = sentence.id;

    try {
      showToast('Generating video for this sentence…', 'info');

      const prompt = String(sentence.videoPrompt ?? '').trim();
      if (!prompt) {
        showToast('Video prompt is required.', 'error');
        return;
      }

      const res = await api.post('/ai/generate-video-from-text', {
        prompt,
        aspectRatio: effectiveAspectRatio,
        ...(videoModel === 'grok' ? { model: 'grok-imagine-video' } : {}),
      });

      const url = (res.data as { videoUrl?: string })?.videoUrl ?? null;
      if (!url) {
        showToast('Video generated but no URL was returned.', 'warning');
        return;
      }

      patchSentenceById(sentenceId, {
        videoUrl: url,
        savedVideoId: null,
        textVideoUrl: url,
        textSavedVideoId: null,
      });

      showToast('Sentence video generated.', 'success');
    } catch (error) {
      console.error('Generate sentence video (text) failed', error);
      showToast('Failed to generate sentence video. Please try again.', 'error');
    }
  };

  const handleGenerateSentenceVideoFromReferenceImage = async (index: number) => {
    const sentence = sentences[index];
    if (!sentence) return;
    const sentenceId = sentence.id;

    try {
      showToast('Generating video for this sentence…', 'info');

      const prompt = String(sentence.videoPrompt ?? '').trim();
      if (!prompt) {
        showToast('Video prompt is required.', 'error');
        return;
      }

      const resolveReferenceFile = async (): Promise<File | null> => {
        if (sentence.referenceImage) return sentence.referenceImage;
        if (sentence.referenceImageUrl?.startsWith('data:')) {
          return dataUrlToFile(
            sentence.referenceImageUrl,
            `sentence-${index + 1}-reference.png`,
          );
        }
        if (sentence.referenceImageUrl) {
          const r = await fetch(sentence.referenceImageUrl);
          if (!r.ok) return null;
          const blob = await r.blob();
          return new File([blob], `sentence-${index + 1}-reference.png`, {
            type: blob.type || 'image/png',
          });
        }
        return null;
      };

      const referenceImage = await resolveReferenceFile();
      if (!referenceImage) {
        showToast('Reference image is required.', 'error');
        return;
      }

      const form = new FormData();
      form.append('referenceImage', referenceImage);
      form.append('prompt', prompt);
      form.append('aspectRatio', effectiveAspectRatio);
      if (videoModel === 'grok') {
        form.append('model', 'grok-imagine-video');
      }

      const res = await api.post('/ai/generate-video-from-reference-image', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const url = (res.data as { videoUrl?: string })?.videoUrl ?? null;
      if (!url) {
        showToast('Video generated but no URL was returned.', 'warning');
        return;
      }

      patchSentenceById(sentenceId, {
        videoUrl: url,
        savedVideoId: null,
        referenceVideoUrl: url,
        referenceSavedVideoId: null,
      });

      showToast('Sentence video generated.', 'success');
    } catch (error) {
      console.error('Generate sentence video (reference image) failed', error);
      showToast('Failed to generate sentence video. Please try again.', 'error');
    }
  };

  const handleSentenceVideoGenerationModeChange = (
    index: number,
    mode: 'frames' | 'text' | 'referenceImage',
  ) => {
    setSentences((prev) =>
      prev.map((s, i) =>
        i === index
          ? (() => {
            if (s.videoUrl === '/subscribe.mp4') {
              const nextSubscribe: SentenceItem = { ...s, videoGenerationMode: mode };
              nextSubscribe.videoPrompt =
                mode === 'text' || mode === 'referenceImage'
                  ? (nextSubscribe.videoPrompt ?? '')
                  : nextSubscribe.videoPrompt ?? null;
              return nextSubscribe;
            }

            const previousMode = (s.videoGenerationMode ?? 'referenceImage') as NonNullable<
              SentenceItem['videoGenerationMode']
            >;

            const next: SentenceItem = { ...s, videoGenerationMode: mode };

            // Migrate legacy surface fields into the previous mode slot once.
            if (next.videoUrl && next.videoUrl !== '/subscribe.mp4') {
              if (previousMode === 'frames' && !next.framesVideoUrl) {
                next.framesVideoUrl = next.videoUrl;
                next.framesSavedVideoId = next.savedVideoId ?? null;
              } else if (previousMode === 'text' && !next.textVideoUrl) {
                next.textVideoUrl = next.videoUrl;
                next.textSavedVideoId = next.savedVideoId ?? null;
              } else if (previousMode === 'referenceImage' && !next.referenceVideoUrl) {
                next.referenceVideoUrl = next.videoUrl;
                next.referenceSavedVideoId = next.savedVideoId ?? null;
              }
            }

            // Restore the target mode's video into the surface fields.
            if (mode === 'frames') {
              next.videoUrl = next.framesVideoUrl ?? null;
              next.savedVideoId = next.framesSavedVideoId ?? null;
            } else if (mode === 'text') {
              next.videoUrl = next.textVideoUrl ?? null;
              next.savedVideoId = next.textSavedVideoId ?? null;
            } else {
              next.videoUrl = next.referenceVideoUrl ?? null;
              next.savedVideoId = next.referenceSavedVideoId ?? null;
            }

            next.videoPrompt =
              mode === 'text' || mode === 'referenceImage'
                ? (next.videoPrompt ?? '')
                : next.videoPrompt ?? null;

            return next;
          })()
          : s,
      ),
    );
  };

  const handleRemoveSentenceGeneratedVideoForMode = (
    index: number,
    mode: 'frames' | 'text' | 'referenceImage',
  ) => {
    setSentences((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;

        const next: typeof s = { ...s };

        if (mode === 'frames') {
          next.framesVideoUrl = null;
          next.framesSavedVideoId = null;
        } else if (mode === 'text') {
          next.textVideoUrl = null;
          next.textSavedVideoId = null;
        } else {
          next.referenceVideoUrl = null;
          next.referenceSavedVideoId = null;
        }

        // Keep the active-mode surface fields in sync.
        const activeMode = (next.videoGenerationMode ?? 'referenceImage') as NonNullable<SentenceItem['videoGenerationMode']>;
        if (activeMode === mode) {
          next.video = null;
          next.videoUrl = null;
          next.savedVideoId = null;
        }

        return next;
      }),
    );
  };

  const handleSentenceVideoPromptChange = (index: number, next: string) => {
    setSentences((prev) =>
      prev.map((s, i) => (i === index ? { ...s, videoPrompt: next } : s)),
    );
  };

  const handleGenerateSentenceVideoPromptWithAi = async (index: number) => {
    const sentence = sentences[index];
    if (!sentence) return;
    if (sentence.videoUrl === '/subscribe.mp4') return;
    const sentenceId = sentence.id;

    setIsGeneratingVideoPromptBySentenceId((prev) => ({
      ...prev,
      [sentenceId]: true,
    }));

    try {
      const mode =
        (sentence.videoGenerationMode ?? 'referenceImage') === 'referenceImage'
          ? 'referenceImage'
          : 'text';

      const res = await api.post<{ prompt: string }>('/ai/generate-video-prompt', {
        script,
        sentence: sentence.text,
        mode,
      });

      const prompt = String(res.data?.prompt ?? '').trim();
      if (!prompt) {
        showAlert('AI did not return a prompt. Please try again.', { type: 'warning' });
        return;
      }

      patchSentenceById(sentenceId, { videoPrompt: prompt });
    } catch (error) {
      console.error('Generate video prompt failed', error);
      showAlert('Failed to generate a video prompt. Please try again.', { type: 'error' });
    } finally {
      setIsGeneratingVideoPromptBySentenceId((prev) => ({
        ...prev,
        [sentenceId]: false,
      }));
    }
  };

  const handleSentenceReferenceImageUpload = (
    index: number,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    setSentences((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
            ...s,
            referenceImage: file,
            referenceImageUrl: file ? null : s.referenceImageUrl ?? null,
          }
          : s,
      ),
    );
  };

  const handleRemoveSentenceReferenceImage = (index: number) => {
    setSentences((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, referenceImage: null, referenceImageUrl: null }
          : s,
      ),
    );
  };

  const handleGenerateSentenceVideo = async (index: number) => {
    const sentence = sentences[index];
    if (!sentence) return;
    if (sentence.videoUrl === '/subscribe.mp4') return;

    setIsGeneratingVideoBySentenceId((prev) => ({
      ...prev,
      [sentence.id]: true,
    }));

    try {
      const mode = (sentence.videoGenerationMode ?? 'referenceImage') as NonNullable<
        SentenceItem['videoGenerationMode']
      >;

      if (mode === 'frames') {
        if (videoModel === 'grok') {
          showToast('Grok video generation does not support Frames mode.', 'error');
          return;
        }
        await handleGenerateSentenceVideoFrames(index);
      } else if (mode === 'text') {
        await handleGenerateSentenceVideoFromText(index);
      } else {
        await handleGenerateSentenceVideoFromReferenceImage(index);
      }
    } finally {
      setIsGeneratingVideoBySentenceId((prev) => ({
        ...prev,
        [sentence.id]: false,
      }));
    }
  };

  const handleGenerateAllSentenceImages = async () => {
    if (!sentences.length || isGeneratingAllImages) return;

    const eligibleIndices = sentences
      .map((item, index) => (isSubscribeLikeSentence(item.text) ? null : index))
      .filter((index): index is number => index !== null);

    const missingIndices = eligibleIndices.filter((index) => {
      const item = sentences[index];
      return Boolean(item) && !item.image && !item.imageUrl;
    });

    const existingCount = eligibleIndices.length - missingIndices.length;

    const runGenerateAll = async (indices: number[]) => {
      if (!indices.length) return;

      setIsGeneratingAllImages(true);
      try {
        // Generate images sequentially to avoid overwhelming the backend/API
        // eslint-disable-next-line no-restricted-syntax
        for (const index of indices) {
          // eslint-disable-next-line no-await-in-loop
          await handleGenerateSentenceImage(index);
        }
      } finally {
        setIsGeneratingAllImages(false);
      }
    };

    // All sentences already have images.
    if (!missingIndices.length) {
      showToast('All sentence images are already generated. Replace all images?', 'info');
      setGenerateAllImagesConfirm({
        kind: 'all',
        eligibleIndices,
        missingIndices: [],
        existingCount: eligibleIndices.length,
        missingCount: 0,
      });
      return;
    }

    // Some sentences already have images.
    if (existingCount > 0) {
      setGenerateAllImagesConfirm({
        kind: 'some',
        eligibleIndices,
        missingIndices,
        existingCount,
        missingCount: missingIndices.length,
      });
      return;
    }

    // None have images yet - generate all missing (which is all eligible).
    await runGenerateAll(missingIndices);
    return;
  };

  const getBulkEffectEligibleIndices = useCallback(() => {
    return sentences.reduce<number[]>((acc, sentence, index) => {
      const imagePrompt = String(sentence.imagePrompt ?? '').trim();
      if (resolveSentenceSceneTab(sentence) !== 'image') return acc;
      if (!imagePrompt) return acc;
      acc.push(index);
      return acc;
    }, []);
  }, [sentences]);

  const bulkLookPresetOptions = useMemo<BulkSceneEffectPresetOption[]>(
    () => [
      { value: 'builtin:none', label: 'None', group: 'built-in' },
      ...VISUAL_EFFECT_SELECT_VALUES.map((value) => ({
        value: `builtin:${value}`,
        label: getVisualEffectLabel(value),
        group: 'built-in' as const,
      })),
      ...imageFilterPresets.map((preset) => ({
        value: `custom:${preset.id}`,
        label: preset.title,
        group: 'saved' as const,
      })),
    ],
    [imageFilterPresets],
  );
  const bulkMotionPresetOptions = useMemo<BulkSceneEffectPresetOption[]>(
    () => [
      ...IMAGE_MOTION_EFFECT_SELECT_VALUES.map((value) => ({
        value: `builtin:${value}`,
        label: getImageMotionEffectLabel(value),
        group: 'built-in' as const,
      })),
      ...motionEffectPresets.map((preset) => ({
        value: `custom:${preset.id}`,
        label: preset.title,
        group: 'saved' as const,
      })),
    ],
    [motionEffectPresets],
  );

  const getDefaultBulkManualEffectValue = useCallback(
    (kind: BulkAiEffectKind) =>
      kind === 'look'
        ? `builtin:${VISUAL_EFFECT_SELECT_VALUES[0] ?? 'colorGrading'}`
        : 'builtin:default',
    [],
  );

  const getBulkManualEffectSceneItems = useCallback(
    (kind: BulkAiEffectKind): BulkSceneEffectScenePickerItem[] => {
      return sentences.map((sentence, index) => {
        const sceneTab = resolveSentenceSceneTab(sentence);
        const previewAsset = resolveBulkSceneEffectPreviewAsset(sentence);
        let disabled = false;
        let disabledReason: string | undefined;

        if (kind === 'motion') {
          if (sceneTab === 'video') {
            disabled = true;
            disabledReason = 'Video scenes do not use image motion effects.';
          } else if (sceneTab === 'text') {
            const backgroundMode = resolveTextSceneBackgroundMode(sentence, effectiveIsShort);
            if (backgroundMode === 'video' || backgroundMode === 'inheritVideo') {
              disabled = true;
              disabledReason = 'This text scene currently uses a video background.';
            } else if (backgroundMode === 'solid' || backgroundMode === 'gradient') {
              disabled = true;
              disabledReason = 'This text scene currently uses a non-image background.';
            }
          } else if (sceneTab === 'overlay') {
            const backgroundMode = resolveOverlaySceneBackgroundMode(sentence);
            if (backgroundMode === 'video') {
              disabled = true;
              disabledReason = 'This overlay scene currently uses a video background.';
            } else if (backgroundMode === 'solid' || backgroundMode === 'gradient') {
              disabled = true;
              disabledReason = 'This overlay scene currently uses a non-image background.';
            }
          }
        }

        const sceneKindLabel =
          sceneTab === 'image'
            ? 'Image'
            : sceneTab === 'video'
              ? 'Video'
              : sceneTab === 'text'
                ? 'Text'
                : 'Overlay';
        const text = String(sentence.text ?? '').trim();
        const textPreview = !text
          ? 'No sentence text yet.'
          : text.length > 160
            ? `${text.slice(0, 157).trimEnd()}...`
            : text;

        return {
          sentenceId: sentence.id,
          title: `Scene ${index + 1}`,
          textPreview,
          sceneKindLabel,
          mediaTransport: previewAsset.transport,
          mediaFile: previewAsset.file,
          mediaUrl: previewAsset.url,
          disabled,
          disabledReason,
        } satisfies BulkSceneEffectScenePickerItem;
      });
    },
    [effectiveIsShort, sentences],
  );

  const getBulkManualSelectableSentenceIds = useCallback(
    (kind: BulkAiEffectKind) =>
      getBulkManualEffectSceneItems(kind)
        .filter((item) => !item.disabled)
        .map((item) => item.sentenceId),
    [getBulkManualEffectSceneItems],
  );

  const applyManualBulkEffect = useCallback(
    async (kind: BulkAiEffectKind, selectedValue: string, sentenceIds: string[]) => {
      const uniqueSentenceIds = Array.from(new Set(sentenceIds.filter(Boolean)));
      if (!uniqueSentenceIds.length) {
        showToast(
          kind === 'look'
            ? 'Choose at least one scene for the look preset.'
            : 'Choose at least one eligible scene for the motion preset.',
          'warning',
        );
        return;
      }

      const sceneById = new Map(
        getBulkManualEffectSceneItems(kind).map((item) => [item.sentenceId, item]),
      );
      const sentenceById = new Map(sentences.map((sentence) => [sentence.id, sentence]));

      let appliedCount = 0;
      let skippedCount = 0;

      try {
        setIsApplyingManualBulkEffect(kind);

        uniqueSentenceIds.forEach((sentenceId) => {
          const sentence = sentenceById.get(sentenceId);
          if (!sentence) {
            skippedCount += 1;
            return;
          }

          if (kind === 'motion' && sceneById.get(sentenceId)?.disabled) {
            skippedCount += 1;
            return;
          }

          const patch =
            kind === 'look'
              ? buildLookPresetSelectionPatch({
                value: selectedValue,
                sentence: {
                  visualEffect: sentence.visualEffect ?? null,
                  imageFilterSettings: sentence.imageFilterSettings ?? null,
                },
                imageFilterPresets,
              })
              : buildMotionPresetSelectionPatch({
                value: selectedValue,
                sentence: {
                  imageMotionEffect: sentence.imageMotionEffect ?? 'default',
                  imageMotionSettings: sentence.imageMotionSettings ?? null,
                  imageMotionSpeed: sentence.imageMotionSpeed ?? null,
                },
                motionEffectPresets,
                isShortVideo: effectiveIsShort,
              });

          if (!patch) {
            skippedCount += 1;
            return;
          }

          patchSentenceById(sentenceId, patch);
          appliedCount += 1;
        });

        if (!appliedCount) {
          showToast(
            kind === 'look'
              ? 'No scenes were updated by the selected look preset.'
              : 'No scenes were updated by the selected motion preset.',
            'warning',
          );
          return;
        }

        showToast(
          skippedCount > 0
            ? kind === 'look'
              ? `Look preset applied to ${appliedCount} scenes. Skipped ${skippedCount} scene${skippedCount === 1 ? '' : 's'}.`
              : `Motion preset applied to ${appliedCount} scenes. Skipped ${skippedCount} scene${skippedCount === 1 ? '' : 's'}.`
            : kind === 'look'
              ? `Look preset applied to ${appliedCount} scenes.`
              : `Motion preset applied to ${appliedCount} scenes.`,
          'success',
        );
      } finally {
        setIsApplyingManualBulkEffect(null);
      }
    },
    [
      effectiveIsShort,
      getBulkManualEffectSceneItems,
      imageFilterPresets,
      motionEffectPresets,
      patchSentenceById,
      sentences,
      showToast,
    ],
  );

  const handleOpenBulkManualEffectModal = useCallback(
    (kind: BulkAiEffectKind) => {
      if (isApplyingBulkAiEffect || isApplyingManualBulkEffect) return;

      const selectableSentenceIds = getBulkManualSelectableSentenceIds(kind);
      if (!selectableSentenceIds.length) {
        showToast(
          kind === 'look'
            ? 'No scenes are available for bulk look presets.'
            : 'No eligible scenes currently support bulk motion presets.',
          'warning',
        );
        return;
      }

      setBulkManualEffectScenePicker(null);
      setBulkManualEffectModal({
        kind,
        selectedValue: getDefaultBulkManualEffectValue(kind),
      });
    },
    [
      getBulkManualSelectableSentenceIds,
      getDefaultBulkManualEffectValue,
      isApplyingBulkAiEffect,
      isApplyingManualBulkEffect,
      showToast,
    ],
  );

  const handleOpenBulkManualScenePicker = useCallback(() => {
    if (!bulkManualEffectModal || isApplyingManualBulkEffect) return;

    const selectableSentenceIds = getBulkManualSelectableSentenceIds(bulkManualEffectModal.kind);
    if (!selectableSentenceIds.length) {
      showToast(
        bulkManualEffectModal.kind === 'look'
          ? 'No scenes are available for bulk look presets.'
          : 'No eligible scenes currently support bulk motion presets.',
        'warning',
      );
      return;
    }

    setBulkManualEffectScenePicker({
      kind: bulkManualEffectModal.kind,
      selectedValue: bulkManualEffectModal.selectedValue,
      selectedSentenceIds: selectableSentenceIds,
    });
    setBulkManualEffectModal(null);
  }, [
    bulkManualEffectModal,
    getBulkManualSelectableSentenceIds,
    isApplyingManualBulkEffect,
    showToast,
  ]);

  const handleApplyManualBulkEffectToAllScenes = useCallback(() => {
    if (!bulkManualEffectModal || isApplyingManualBulkEffect) return;

    const { kind, selectedValue } = bulkManualEffectModal;
    const selectableSentenceIds = getBulkManualSelectableSentenceIds(kind);
    setBulkManualEffectModal(null);
    void applyManualBulkEffect(kind, selectedValue, selectableSentenceIds);
  }, [
    applyManualBulkEffect,
    bulkManualEffectModal,
    getBulkManualSelectableSentenceIds,
    isApplyingManualBulkEffect,
  ]);

  const handleApplyManualBulkEffectToSelectedScenes = useCallback(
    (selectedSentenceIds: string[]) => {
      if (!bulkManualEffectScenePicker || isApplyingManualBulkEffect) return;

      const { kind, selectedValue } = bulkManualEffectScenePicker;
      setBulkManualEffectScenePicker(null);
      void applyManualBulkEffect(kind, selectedValue, selectedSentenceIds);
    },
    [applyManualBulkEffect, bulkManualEffectScenePicker, isApplyingManualBulkEffect],
  );

  const requestAiLookEffects = useCallback(async (
    payload: BulkLookEffectRequestItem[],
  ): Promise<BulkLookEffectItem[]> => {
    if (!payload.length) return [];

    const sourceBySentenceId = new Map(payload.map((item) => [item.sentenceId, item]));
    const { data } = await api.post<BulkLookEffectResponse>('/ai/generate-bulk-look-effects', {
      sentences: payload,
    });

    return (Array.isArray(data?.items) ? data.items : [])
      .map((item) => {
        const sentenceId = String(item?.sentenceId ?? '').trim();
        const source = sourceBySentenceId.get(sentenceId);
        const visualEffect = item?.visualEffect;

        if (!source || !visualEffect || visualEffect === 'none') {
          return null;
        }

        const preservedBlurPx = normalizeImageFilterSettings(
          source.imageFilterSettings,
          source.visualEffect === 'none' ? null : source.visualEffect,
        ).blurPx;

        return {
          sentenceId,
          index: source.index,
          visualEffect,
          imageFilterSettings: normalizeImageFilterSettings(
            {
              ...(item?.imageFilterSettings ?? {}),
              blurPx: preservedBlurPx,
            },
            visualEffect,
          ),
        } satisfies BulkLookEffectItem;
      })
      .filter(Boolean) as BulkLookEffectItem[];
  }, []);

  const requestAiMotionEffects = useCallback(async (
    payload: BulkMotionEffectRequestItem[],
  ): Promise<BulkMotionEffectItem[]> => {
    if (!payload.length) return [];

    const sourceBySentenceId = new Map(payload.map((item) => [item.sentenceId, item]));
    const { data } = await api.post<BulkMotionEffectResponse>('/ai/generate-bulk-motion-effects', {
      sentences: payload,
    });

    return (Array.isArray(data?.items) ? data.items : [])
      .map((item) => {
        const sentenceId = String(item?.sentenceId ?? '').trim();
        const source = sourceBySentenceId.get(sentenceId);
        const imageMotionEffect = item?.imageMotionEffect;

        if (!source || !imageMotionEffect || imageMotionEffect === 'default') {
          return null;
        }

        const imageMotionSpeed = resolveImageMotionSpeed(
          source.imageMotionSpeed,
          source.imageMotionSettings,
          effectiveIsShort,
        );

        return {
          sentenceId,
          index: source.index,
          imageMotionEffect,
          imageMotionSpeed,
          imageMotionSettings: normalizeImageMotionSettings(
            item?.imageMotionSettings ?? null,
            imageMotionEffect,
            imageMotionSpeed,
            effectiveIsShort,
          ),
        } satisfies BulkMotionEffectItem;
      })
      .filter(Boolean) as BulkMotionEffectItem[];
  }, [effectiveIsShort]);

  const requestAiFeelingCues = useCallback(async (
    payload: BulkFeelingCueRequestItem[],
  ): Promise<BulkFeelingCueItem[]> => {
    if (!payload.length) return [];

    const sourceBySentenceId = new Map(payload.map((item) => [item.sentenceId, item]));
    const { data } = await api.post<BulkFeelingCueResponse>(
      '/ai/generate-bulk-feeling-cues',
      {
        sentences: payload,
      },
    );

    return (Array.isArray(data?.items) ? data.items : [])
      .map((item) => {
        const sentenceId = String(item?.sentenceId ?? '').trim();
        const source = sourceBySentenceId.get(sentenceId);
        const feeling = normalizeFeelingCueValue(item?.feeling);

        if (!source || !feeling) {
          return null;
        }

        return {
          sentenceId,
          index: source.index,
          feeling,
        } satisfies BulkFeelingCueItem;
      })
      .filter(Boolean) as BulkFeelingCueItem[];
  }, []);

  const handleGenerateSingleImageLookWithAi = useCallback(async (
    sentenceId: string,
    params: {
      visualEffect: SentenceItem['visualEffect'] | null;
      customImageFilterId: string | null;
      imageFilterSettings: ImageFilterSettings;
    },
  ) => {
    const sentence = sentences.find((item) => item.id === sentenceId);
    const sentenceIndex = sentences.findIndex((item) => item.id === sentenceId);
    const imagePrompt = String(sentence?.imagePrompt ?? '').trim();
    if (!sentence || sentenceIndex < 0 || !imagePrompt) {
      throw new Error('This image needs a prompt before AI Look can run.');
    }

    const items = await requestAiLookEffects([
      {
        index: sentenceIndex,
        sentenceId,
        imagePrompt,
        visualEffect: params.visualEffect ?? 'none',
        customImageFilterId: params.customImageFilterId,
        imageFilterSettings: params.imageFilterSettings,
      },
    ]);

    const item = items[0];
    if (!item) {
      throw new Error('AI did not return a look update for this image.');
    }

    return {
      visualEffect: item.visualEffect,
      customImageFilterId: null,
      imageFilterSettings: item.imageFilterSettings,
    };
  }, [requestAiLookEffects, sentences]);

  const handleGenerateSingleImageMotionWithAi = useCallback(async (
    sentenceId: string,
    params: {
      imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
      customMotionEffectId: string | null;
      imageMotionSettings: ImageMotionSettings;
      imageMotionSpeed: number;
    },
  ): Promise<{
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    customMotionEffectId: null;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
  }> => {
    const sentence = sentences.find((item) => item.id === sentenceId);
    const sentenceIndex = sentences.findIndex((item) => item.id === sentenceId);
    const imagePrompt = String(sentence?.imagePrompt ?? '').trim();
    if (!sentence || sentenceIndex < 0 || !imagePrompt) {
      throw new Error('This image needs a prompt before AI Motion can run.');
    }

    const items = await requestAiMotionEffects([
      {
        index: sentenceIndex,
        sentenceId,
        imagePrompt,
        imageMotionEffect: params.imageMotionEffect,
        imageMotionSpeed: params.imageMotionSpeed,
        customMotionEffectId: params.customMotionEffectId,
        imageMotionSettings: params.imageMotionSettings,
      },
    ]);

    const item = items[0];
    if (!item) {
      throw new Error('AI did not return a motion update for this image.');
    }

    const imageMotionEffect = item.imageMotionEffect as NonNullable<
      SentenceItem['imageMotionEffect']
    >;

    return {
      imageMotionEffect,
      customMotionEffectId: null,
      imageMotionSettings: item.imageMotionSettings,
      imageMotionSpeed: item.imageMotionSpeed,
    };
  }, [requestAiMotionEffects, sentences]);

  const runBulkAiLookEffects = useCallback(async (indices: number[]) => {
    const payload = indices
      .map((index) => {
        const sentence = sentences[index];
        if (!sentence) return null;

        const imagePrompt = String(sentence.imagePrompt ?? '').trim();
        if (!imagePrompt) return null;

        return {
          index,
          sentenceId: sentence.id,
          imagePrompt,
          visualEffect: sentence.visualEffect ?? 'none',
          customImageFilterId: sentence.customImageFilterId ?? null,
          imageFilterSettings: sentence.imageFilterSettings ?? null,
        };
      })
      .filter(Boolean);

    if (!payload.length) {
      showToast('No eligible image scenes with prompts were found for look effects.', 'warning');
      return;
    }

    try {
      setIsApplyingBulkAiEffect('look');
      const items = await requestAiLookEffects(payload as BulkLookEffectRequestItem[]);
      if (!items.length) {
        showToast('AI did not return any look updates.', 'warning');
        return;
      }

      items.forEach((item) => {
        patchSentenceById(item.sentenceId, {
          visualEffect: item.visualEffect,
          customImageFilterId: null,
          imageFilterSettings: item.imageFilterSettings,
        });
      });

      showToast('AI look effects applied in the editor.', 'success');
    } catch (error) {
      console.error('Failed to apply AI look effects:', error);
      showToast('Failed to apply AI look effects.', 'error');
    } finally {
      setIsApplyingBulkAiEffect(null);
    }
  }, [patchSentenceById, requestAiLookEffects, showToast]);

  const runBulkAiMotionEffects = useCallback(async (indices: number[]) => {
    const payload = indices
      .map((index) => {
        const sentence = sentences[index];
        if (!sentence) return null;

        const imagePrompt = String(sentence.imagePrompt ?? '').trim();
        if (!imagePrompt) return null;

        return {
          index,
          sentenceId: sentence.id,
          imagePrompt,
          imageMotionEffect: sentence.imageMotionEffect ?? 'default',
          imageMotionSpeed: sentence.imageMotionSpeed ?? null,
          customMotionEffectId: sentence.customMotionEffectId ?? null,
          imageMotionSettings: sentence.imageMotionSettings ?? null,
        };
      })
      .filter(Boolean);

    if (!payload.length) {
      showToast('No eligible image scenes with prompts were found for motion effects.', 'warning');
      return;
    }

    try {
      setIsApplyingBulkAiEffect('motion');
      const items = await requestAiMotionEffects(payload as BulkMotionEffectRequestItem[]);
      if (!items.length) {
        showToast('AI did not return any motion updates.', 'warning');
        return;
      }

      items.forEach((item) => {
        patchSentenceById(item.sentenceId, {
          imageMotionEffect: item.imageMotionEffect,
          customMotionEffectId: null,
          imageMotionSpeed: item.imageMotionSpeed,
          imageMotionSettings: item.imageMotionSettings,
        });
      });

      showToast('AI motion effects applied in the editor.', 'success');
    } catch (error) {
      console.error('Failed to apply AI motion effects:', error);
      showToast('Failed to apply AI motion effects.', 'error');
    } finally {
      setIsApplyingBulkAiEffect(null);
    }
  }, [patchSentenceById, requestAiMotionEffects, showToast]);

  const handleOpenBulkAiEffects = useCallback((kind: BulkAiEffectKind) => {
    if (isApplyingBulkAiEffect) return;

    const eligibleIndices = getBulkEffectEligibleIndices();
    if (!eligibleIndices.length) {
      showToast('No eligible image scenes with image prompts were found.', 'warning');
      return;
    }

    const uneditedIndices = eligibleIndices.filter((index) => {
      const sentence = sentences[index];
      if (!sentence) return false;
      return kind === 'look'
        ? !hasCustomLookSelection(sentence)
        : !hasCustomMotionSelection(sentence);
    });

    const existingCount = eligibleIndices.length - uneditedIndices.length;
    if (!uneditedIndices.length) {
      showToast(
        kind === 'look'
          ? 'All eligible images already have custom look settings. Replace them all?'
          : 'All eligible images already have custom motion settings. Replace them all?',
        'info',
      );
    }

    setBulkAiEffectsConfirm({
      kind,
      eligibleIndices,
      uneditedIndices,
      existingCount,
      uneditedCount: uneditedIndices.length,
    });
  }, [getBulkEffectEligibleIndices, isApplyingBulkAiEffect, runBulkAiLookEffects, runBulkAiMotionEffects, sentences, showToast]);

  const handleResetBulkLookEffects = useCallback(() => {
    setSentences((prev) =>
      prev.map((s) => ({
        ...s,
        visualEffect: null,
        customImageFilterId: null,
        imageFilterSettings: null,
      })),
    );
    showToast('Look effects reset to none for all scenes.', 'success');
  }, [setSentences, showToast]);

  const handleResetBulkMotionEffects = useCallback(() => {
    setSentences((prev) =>
      prev.map((s) => ({
        ...s,
        imageMotionEffect: 'default' as const,
        customMotionEffectId: null,
        imageMotionSettings: null,
        imageMotionSpeed: null,
      })),
    );
    showToast('Motion effects reset to default scale for all scenes.', 'success');
  }, [setSentences, showToast]);

  const handleSaveSceneSequence = useCallback(async (title: string) => {
    if (sentences.length === 0) {
      showToast('No scenes are available to save.', 'warning');
      return;
    }

    const unsavedOverlaySceneIndex = sentences.findIndex((sentence) =>
      hasUnsavedOverlaySequenceAsset(sentence),
    );

    if (unsavedOverlaySceneIndex >= 0) {
      showToast(
        `Scene ${unsavedOverlaySceneIndex + 1} has an unsaved overlay asset. Save the draft or overlay preset first.`,
        'error',
      );
      return;
    }

    setIsSavingSavedSequence(true);
    try {
      await api.post('/saved-sequences', {
        title,
        scenes: sentences.map((sentence) =>
          buildSavedSequenceSceneSnapshot(sentence, effectiveIsShort),
        ),
      });

      setIsSavedSequenceSaveModalOpen(false);
      showToast('Scene sequence saved.', 'success');
    } catch (error) {
      showToast(
        getRequestErrorMessage(error, 'Failed to save scene sequence.'),
        'error',
      );
    } finally {
      setIsSavingSavedSequence(false);
    }
  }, [effectiveIsShort, sentences, showToast]);

  const handleApplySavedSequence = useCallback(async (sequence: SavedSequenceDetailDto) => {
    setIsApplyingSavedSequence(true);
    try {
      const sequenceScenes = Array.isArray(sequence.scenes) ? sequence.scenes : [];
      const needsLookPresetRefresh = sequenceScenes.some((scene) =>
        String(scene.custom_image_filter_id ?? scene.customImageFilterId ?? '').trim().length > 0,
      );
      const needsMotionPresetRefresh = sequenceScenes.some((scene) =>
        String(scene.custom_motion_effect_id ?? scene.customMotionEffectId ?? '').trim().length > 0,
      );

      let nextImageFilterPresets = imageFilterPresets;
      let nextMotionEffectPresets = motionEffectPresets;

      if (needsLookPresetRefresh || needsMotionPresetRefresh) {
        const [refreshedImageFilterPresets, refreshedMotionEffectPresets] = await Promise.all([
          needsLookPresetRefresh
            ? fetchImageFilterPresets()
            : Promise.resolve<ImageFilterPresetDto[] | null>(null),
          needsMotionPresetRefresh
            ? fetchMotionEffectPresets()
            : Promise.resolve<MotionEffectPresetDto[] | null>(null),
        ]);

        if (refreshedImageFilterPresets !== null) {
          nextImageFilterPresets = refreshedImageFilterPresets;
        }
        if (refreshedMotionEffectPresets !== null) {
          nextMotionEffectPresets = refreshedMotionEffectPresets;
        }
      }

      const result = applySavedSequenceToSentences({
        sentences,
        sequence,
        isShortVideo: effectiveIsShort,
        imageFilterPresets: nextImageFilterPresets,
        motionEffectPresets: nextMotionEffectPresets,
      });

      if (result.appliedCount === 0 && result.resetCount === 0) {
        showToast('The selected saved sequence has no scenes to apply.', 'warning');
        return;
      }

      setSentences(result.sentences);
      setIsSavedSequenceLibraryOpen(false);

      const messageParts: string[] = [];
      if (result.appliedCount > 0) {
        messageParts.push(
          `Applied ${result.appliedCount} scene${result.appliedCount === 1 ? '' : 's'}`,
        );
      }
      if (result.resetCount > 0) {
        messageParts.push(
          `reset ${result.resetCount} trailing scene${result.resetCount === 1 ? '' : 's'}`,
        );
      }
      if (result.ignoredCount > 0) {
        messageParts.push(
          `ignored ${result.ignoredCount} extra saved scene${result.ignoredCount === 1 ? '' : 's'}`,
        );
      }

      showToast(`${messageParts.join(', ')}.`, 'success');
    } finally {
      setIsApplyingSavedSequence(false);
    }
  }, [
    effectiveIsShort,
    fetchImageFilterPresets,
    fetchMotionEffectPresets,
    imageFilterPresets,
    motionEffectPresets,
    sentences,
    setSentences,
    showToast,
  ]);

  const handleVideoModelChange = (next: 'gemini' | 'grok') => {
    setVideoModel(next);
    if (next !== 'grok') return;

    setSentences((prev) =>
      prev.map((s) => {
        const mode = (s.videoGenerationMode ?? 'referenceImage') as NonNullable<
          SentenceItem['videoGenerationMode']
        >;

        if (mode !== 'frames') return s;

        const keepSubscribe = s.videoUrl === '/subscribe.mp4';
        const restoredUrl = keepSubscribe
          ? s.videoUrl
          : (s.referenceVideoUrl ?? null);

        return {
          ...s,
          videoGenerationMode: 'referenceImage',
          videoUrl: restoredUrl,
          savedVideoId: keepSubscribe ? s.savedVideoId ?? null : null,
        };
      }),
    );
  };

  const handleSaveSentenceImage = async (index: number) => {
    const target = sentences[index];
    if (!target) return;
    const sentenceId = target.id;
    if (target.savedImageId) {
      return;
    }
    if (!user) {
      showAlert('You must be logged in to save images.', { type: 'warning' });
      return;
    }
    if (!target.image && !target.imageUrl) {
      showAlert('No image to save for this sentence.', { type: 'warning' });
      return;
    }

    patchSentenceById(sentenceId, { isSavingImage: true });

    try {
      let fileToUpload: File | null = null;

      if (target.image) {
        fileToUpload = target.image;
      } else if (target.imageUrl?.startsWith('data:')) {
        fileToUpload = dataUrlToFile(target.imageUrl, `sentence-${index + 1}.png`);
      }

      if (!fileToUpload) {
        throw new Error('Unable to prepare image file for upload');
      }

      const formData = new FormData();
      formData.append('image', fileToUpload);

      const response = await api.post<{ id: string }>('/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const saved = response.data;

      patchSentenceById(sentenceId, {
        isSavingImage: false,
        savedImageId: saved.id,
      });
    } catch (error) {
      console.error('Save image failed', error);
      showAlert('Failed to save image. Please try again.', { type: 'error' });
      patchSentenceById(sentenceId, { isSavingImage: false });
    }
  };

  const handleSelectFromLibrary = (
    index: number,
    which: 'single' | 'secondary' | 'start' | 'end' | 'reference' = 'single',
  ) => {
    const sentenceId = sentences[index]?.id;
    if (!sentenceId) return;
    setLibraryTarget({ sentenceId, which });
    setIsLibraryModalOpen(true);
  };

  const handleSelectVideoFromLibrary = (index: number) => {
    const sentenceId = sentences[index]?.id;
    if (!sentenceId) return;
    setVideoLibraryTargetId(sentenceId);
    setIsVideoLibraryOpen(true);
  };

  const handleSaveSentenceVideoToLibrary = useCallback(
    async (index: number) => {
      const sentence = sentences[index];
      const sentenceId = sentence?.id;
      if (!sentence || !sentenceId) return;

      if (!user) {
        showAlert('You must be logged in to save a video.', { type: 'warning' });
        return;
      }

      if (isSavingSentenceVideoLibraryById[sentenceId]) return;

      if (sentence.savedVideoId) {
        showToast('This video is already saved to your library.', 'success');
        return;
      }

      const localVideoFile = sentence.video ?? null;
      const currentVideoUrl = String(sentence.videoUrl ?? '').trim();
      const sourceVideoUrl =
        currentVideoUrl && currentVideoUrl !== '/subscribe.mp4' ? currentVideoUrl : null;

      if (!localVideoFile && !sourceVideoUrl) {
        showAlert('Add or generate a video before saving it to your library.', {
          type: 'warning',
        });
        return;
      }

      setIsSavingSentenceVideoLibraryById((prev) => ({
        ...prev,
        [sentenceId]: true,
      }));

      try {
        const managedVideoUrl = localVideoFile
          ? await uploadManagedFile(localVideoFile, {
            resourceType: 'video',
            folder: VIDEO_LIBRARY_MANAGED_FOLDER,
          })
          : await ensureManagedPublicUrl(sourceVideoUrl as string, {
            resourceType: 'video',
            folder: VIDEO_LIBRARY_MANAGED_FOLDER,
          });

        const { width, height } = await getVideoMetadataFromSource({
          file: localVideoFile,
          url: localVideoFile ? null : managedVideoUrl,
        });
        const video_size = inferVideoOrientationFromDimensions(width, height);

        const response = await api.post<SavedVideoLibraryRecord>('/videos-library/url', {
          video: managedVideoUrl,
          ...(video_size ? { video_size } : {}),
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
        });

        const savedVideoId = String(response.data?.id ?? '').trim();
        const persistedVideoUrl =
          String(response.data?.video ?? managedVideoUrl).trim() || managedVideoUrl;

        if (!savedVideoId) {
          throw new Error('Saved video response is missing an id.');
        }

        updateSentenceById(sentenceId, (item) =>
          applyVideoSelectionToSentence(item, {
            videoUrl: persistedVideoUrl,
            savedVideoId,
            clearLocalFile: true,
          }),
        );

        showToast('Video saved to your library.', 'success');
      } catch (error) {
        console.error('Save sentence video to library failed', error);
        showToast(
          getRequestErrorMessage(error, 'Failed to save video to library.'),
          'error',
        );
      } finally {
        setIsSavingSentenceVideoLibraryById((prev) => {
          const next = { ...prev };
          delete next[sentenceId];
          return next;
        });
      }
    },
    [
      isSavingSentenceVideoLibraryById,
      sentences,
      showAlert,
      showToast,
      updateSentenceById,
      user,
    ],
  );

  const handleLibraryVideoSelect = (videoUrl: string, id: string | null) => {
    if (videoLibraryTargetId === null) return;

    updateSentenceById(videoLibraryTargetId, (item) =>
      applyVideoSelectionToSentence(item, {
        videoUrl,
        savedVideoId: id,
        clearLocalFile: true,
      }),
    );

    setVideoLibraryTargetId(null);
  };

  const handleLibraryImageSelect = (
    imageUrl: string,
    id: string | null,
    prompt?: string | null,
  ) => {
    if (!libraryTarget) return;

    const { sentenceId, which } = libraryTarget;

    updateSentenceById(sentenceId, (item) =>
      which === 'single'
        ? {
          ...item,
          imageUrl,
          image: null,
          imagePrompt: prompt ?? null,
          isFromLibrary: true,
          savedImageId: id,
        }
        : which === 'secondary'
          ? {
            ...item,
            secondaryImageUrl: imageUrl,
            secondaryImage: null,
            secondaryImagePrompt: prompt ?? null,
            isFromLibrary: true,
            secondarySavedImageId: id,
            hasSecondaryImageSlot: true,
          }
          : which === 'start'
            ? {
              ...item,
              startImageUrl: imageUrl,
              startImage: null,
              startImagePrompt: prompt ?? null,
              isFromLibrary: true,
              startSavedImageId: id,
            }
            : which === 'end'
              ? {
                ...item,
                endImageUrl: imageUrl,
                endImage: null,
                endImagePrompt: prompt ?? null,
                isFromLibrary: true,
                endSavedImageId: id,
              }
              : {
                ...item,
                referenceImageUrl: imageUrl,
                referenceImage: null,
                isFromLibrary: true,
              },
    );

    setLibraryTarget(null);
  };

  const handleOpenSentenceSoundEffectsLibrary = (index: number) => {
    const sentenceId = sentences[index]?.id;
    if (!sentenceId) return;
    setSoundEffectsLibraryTargetId(sentenceId);
    setIsSoundEffectsLibraryOpen(true);
  };

  const handleApplySentenceSoundEffectsFromLibrary = (items: SoundEffectDto[]) => {
    if (soundEffectsLibraryTargetId === null) return;

    updateSentenceById(soundEffectsLibraryTargetId, (s) => {
      const current = Array.isArray(s.soundEffects) ? s.soundEffects : [];
      const additions = (items ?? []).map((it) => ({
        id: it.id,
        title: String(it.name ?? it.title ?? 'Sound effect'),
        url: it.url,
        delaySeconds: 0,
        volumePercent: Math.max(0, Math.min(300, Number(it.volume_percent ?? 100) || 100)),
        audioSettings: cloneSoundEffectAudioSettings(it.audio_settings),
        defaultAudioSettings: cloneSoundEffectAudioSettings(it.audio_settings),
        timingMode: 'withPrevious' as const,
        durationSeconds:
          typeof it.duration_seconds === 'number' && Number.isFinite(it.duration_seconds)
            ? Math.max(0, it.duration_seconds)
            : null,
      }));

      return {
        ...s,
        soundEffects: [...current, ...additions],
      };
    });

    setIsSoundEffectsLibraryOpen(false);
    setSoundEffectsLibraryTargetId(null);
  };

  const handleUploadSentenceSoundEffect = async (index: number, files: File[]) => {
    const sentence = sentences[index];
    if (!sentence) return;

    const list = Array.isArray(files) ? files.filter(Boolean) : [];
    if (list.length === 0) return;

    const sentenceId = sentence.id;
    setIsUploadingSentenceSfxBySentenceId((prev) => ({ ...prev, [sentenceId]: true }));

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

        const res = await api.post<{
          id: string;
          title: string;
          name?: string;
          url: string;
          volume_percent?: number;
          audio_settings?: Record<string, unknown> | null;
          duration_seconds?: number | null;
        }>('/sound-effects', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        createdItems.push(res.data);
      } else {
        const form = new FormData();
        for (const f of list) {
          form.append('soundEffects', f);
        }

        const res = await api.post<{
          items: Array<{
            id: string;
            title: string;
            name?: string;
            url: string;
            volume_percent?: number;
            audio_settings?: Record<string, unknown> | null;
            duration_seconds?: number | null;
          }>;
        }>('/sound-effects/batch', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        createdItems.push(...items);
      }

      updateSentenceById(sentenceId, (s) => {
        const current = Array.isArray(s.soundEffects) ? s.soundEffects : [];
        return {
          ...s,
          soundEffects: [
            ...current,
            ...createdItems.map((created, idx) => {
              const fallbackTitle =
                String(list[idx]?.name ?? '')
                  .replace(/\.[^.]+$/u, '')
                  .trim() || 'Sound effect';
              return {
                id: created.id,
                title: String(created.name ?? created.title ?? fallbackTitle),
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
                  typeof created.duration_seconds === 'number' &&
                    Number.isFinite(created.duration_seconds)
                    ? Math.max(0, created.duration_seconds)
                    : null,
              };
            }),
          ],
        };
      });

      showToast(
        createdItems.length > 1
          ? `${createdItems.length} sound effects uploaded.`
          : 'Sound effect uploaded.',
        'success',
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Upload sound effect failed', err);
      showToast('Failed to upload sound effect. Try again.', 'error');
    } finally {
      setIsUploadingSentenceSfxBySentenceId((prev) => ({ ...prev, [sentenceId]: false }));
    }
  };

  const handleSaveSentenceSoundEffectsMix = async (index: number) => {
    const sentence = sentences[index];
    if (!sentence) return;

    const effects = Array.isArray(sentence.soundEffects) ? sentence.soundEffects : [];
    if (effects.length < 2) {
      showToast('Add at least 2 sound effects to save a mix.', 'warning');
      return;
    }

    const sentenceId = sentence.id;
    setIsSavingSentenceSfxMixBySentenceId((prev) => ({ ...prev, [sentenceId]: true }));

    try {
      const title = `Sentence ${index + 1} SFX mix`;
      const timedEffects = computeSentenceSoundEffectTiming(effects, {
        ignoreOffsets: sentence.alignSoundEffectsToSceneEnd === true,
      });
      const res = await api.post<{
        id: string;
        title: string;
        url: string;
        volume_percent?: number;
        audio_settings?: Record<string, unknown> | null;
        duration_seconds?: number | null;
      }>('/sound-effects/merge', {
        title,
        items: timedEffects.map((e) => {
          const audioSettings = normalizeSoundEffectAudioSettings(
            e.audioSettings ?? e.defaultAudioSettings,
          );

          return {
            sound_effect_id: e.id,
            delay_seconds: Math.max(0, Number(e.absoluteDelaySeconds ?? 0) || 0),
            volume_percent: Math.max(0, Math.min(300, Number(e.volumePercent ?? 100) || 100)),
            trim_start_seconds: Math.max(0, Number(e.trimStartSeconds ?? 0) || 0),
            duration_seconds:
              typeof e.durationSeconds === 'number' && Number.isFinite(e.durationSeconds)
                ? Math.max(0, e.durationSeconds)
                : null,
            audio_settings_override: audioSettings,
          };
        }),
      });

      const merged = res.data;

      patchSentenceById(sentenceId, {
        soundEffects: [
          {
            id: merged.id,
            title: merged.title,
            url: merged.url,
            delaySeconds: 0,
            volumePercent: Math.max(
              0,
              Math.min(300, Number(merged.volume_percent ?? 100) || 100),
            ),
            audioSettings: cloneSoundEffectAudioSettings(merged.audio_settings),
            defaultAudioSettings: cloneSoundEffectAudioSettings(merged.audio_settings),
            timingMode: 'withPrevious',
            durationSeconds:
              typeof merged.duration_seconds === 'number' &&
                Number.isFinite(merged.duration_seconds)
                ? Math.max(0, merged.duration_seconds)
                : null,
          },
        ],
      });

      showToast('Mix saved to your sound effects library.', 'success');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Save sound effects mix failed', err);
      showToast('Failed to save mix. Try again.', 'error');
    } finally {
      setIsSavingSentenceSfxMixBySentenceId((prev) => ({ ...prev, [sentenceId]: false }));
    }
  };

  const handleSentenceSoundEffectsChange = (
    index: number,
    next: NonNullable<SentenceItem['soundEffects']>,
  ) => {
    setSentences((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
            ...s,
            soundEffects: Array.isArray(next) ? next : [],
          }
          : s,
      ),
    );
  };

  const handleSentenceAlignSoundEffectsToSceneEndChange = (
    index: number,
    next: boolean,
  ) => {
    setSentences((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
            ...s,
            alignSoundEffectsToSceneEnd: next,
          }
          : s,
      ),
    );
  };

  const handleOpenTransitionSoundEditor = (index: number) => {
    const sentence = sentences[index];
    if (!sentence) return;
    setTransitionSoundDraftItems(
      Array.isArray(sentence?.transitionSoundEffects)
        ? sentence.transitionSoundEffects.map((item) => ({ ...item }))
        : [],
    );
    setTransitionSoundEditorTargetId(sentence.id);
  };

  const handleCloseTransitionSoundEditor = () => {
    setTransitionSoundDraftItems([]);
    setTransitionSoundEditorTargetId(null);
  };

  const handleSentenceTransitionSoundEffectsChange = (
    index: number,
    next: NonNullable<SentenceItem['transitionSoundEffects']>,
  ) => {
    setSentences((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
            ...s,
            transitionSoundEffects: Array.isArray(next) ? next : [],
          }
          : s,
      ),
    );
  };

  const handleApplyTransitionSoundEditor = () => {
    if (transitionSoundEditorTargetId === null) {
      handleCloseTransitionSoundEditor();
      return;
    }

    updateSentenceById(transitionSoundEditorTargetId, (sentence) => ({
      ...sentence,
      transitionSoundEffects: Array.isArray(transitionSoundDraftItems)
        ? transitionSoundDraftItems
        : [],
    }));
    handleCloseTransitionSoundEditor();
  };

  const handleSaveSentenceTransitionSound = async (
    sentenceId: string,
    itemsOverride?: NonNullable<SentenceItem['transitionSoundEffects']>,
  ): Promise<NonNullable<SentenceItem['transitionSoundEffects']> | null> => {
    const index = sentences.findIndex((sentence) => sentence.id === sentenceId);
    const sentence = index >= 0 ? sentences[index] : null;
    if (!sentence) return null;

    const itemsSource = itemsOverride ?? sentence.transitionSoundEffects;
    const items = Array.isArray(itemsSource)
      ? itemsSource.filter((item) => Boolean(item?.id))
      : [];
    if (items.length === 0) return null;

    const targetSentenceId = sentence.id;
    setIsSavingTransitionSoundBySentenceId((prev) => ({ ...prev, [targetSentenceId]: true }));

    try {
      if (items.length === 1) {
        const [item] = items;
        if (item.isTransitionSound !== true) {
          await api.patch(`/sound-effects/transition/${encodeURIComponent(item.id)}`, {
            isTransitionSound: true,
            volumePercent: Math.max(0, Math.min(300, Number(item.volumePercent ?? 100) || 100)),
          });
        }

        const savedItems = items.map((entry) => ({
          ...entry,
          isTransitionSound: true,
        }));

        showToast('Transition sound saved for reuse.', 'success');
        return savedItems;
      }

      const mergedRes = await api.post<SoundEffectDto>('/sound-effects/merge', {
        title: `Transition sound mix ${index + 1}`,
        items: items.map((item) => {
          const audioSettings = normalizeSoundEffectAudioSettings(item.audioSettings);

          return {
            sound_effect_id: item.id,
            delay_seconds: Math.max(0, Number(item.delaySeconds ?? 0) || 0),
            volume_percent: Math.max(0, Math.min(300, Number(item.volumePercent ?? 100) || 100)),
            trim_start_seconds: Math.max(0, Number(audioSettings.trim.startSeconds ?? 0) || 0),
            duration_seconds:
              typeof audioSettings.trim.durationSeconds === 'number' &&
                Number.isFinite(audioSettings.trim.durationSeconds) &&
                audioSettings.trim.durationSeconds > 0
                ? Math.max(0, audioSettings.trim.durationSeconds)
                : null,
            audio_settings_override: audioSettings,
          };
        }),
      });

      const mergedId = String(mergedRes.data?.id ?? '').trim();
      const mergedUrl = String(mergedRes.data?.url ?? '').trim();
      if (!mergedId || !mergedUrl) {
        throw new Error('Merged transition sound response is missing id or url.');
      }

      if (mergedRes.data?.is_transition_sound !== true) {
        await api.patch(`/sound-effects/transition/${encodeURIComponent(mergedId)}`, {
          isTransitionSound: true,
        });
      }

      const savedItems: NonNullable<SentenceItem['transitionSoundEffects']> = [
        {
          id: mergedId,
          title:
            String(mergedRes.data?.name ?? mergedRes.data?.title ?? `Transition sound mix ${index + 1}`).trim() ||
            `Transition sound mix ${index + 1}`,
          url: mergedUrl,
          delaySeconds: 0,
          volumePercent: Math.max(
            0,
            Math.min(300, Number(mergedRes.data?.volume_percent ?? 100) || 100),
          ),
          isTransitionSound: true,
        },
      ];

      showToast('Transition sound saved for reuse.', 'success');
      return savedItems;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save transition sound', err);
      showToast('Failed to save transition sound.', 'error');
      return null;
    } finally {
      setIsSavingTransitionSoundBySentenceId((prev) => ({ ...prev, [targetSentenceId]: false }));
    }
  };

  const handleSyncElevenLabsVoices = async () => {
    setSyncVoicesResult(null);
    setIsSyncingVoices(true);
    try {
      const res = await api.post<{
        imported: number;
        updated: number;
      }>('/voice-overs/sync', undefined, {
        params: { provider: voiceProvider },
      });
      const data = res.data;
      setSyncVoicesResult(
        `Synced voices successfully. Imported: ${data.imported}, Updated: ${data.updated}`,
      );

      // Refresh local cache of voices after a successful sync
      fetchVoices();
    } catch (error) {
      console.error('Sync ElevenLabs voices failed', error);
      setSyncVoicesResult('Failed to sync ElevenLabs voices. Check backend logs.');
    } finally {
      setIsSyncingVoices(false);
    }
  };

  const handleSaveScriptDraft = async () => {
    if (!script.trim()) {
      showAlert('Please enter or generate a script before saving a draft.', { type: 'warning' });
      return;
    }

    // Shorts are only supported for long-form scripts.
    if (activeShortTabIndex !== null && (!isLongForm || !tabSnapshotsRef.current.full)) {
      showAlert('Switch to Full Video tab before saving this draft.', { type: 'warning' });
      return;
    }

    setIsSavingDraft(true);

    try {
      flushSync(() => { });

      // Snapshot the active tab before saving.
      tabSnapshotsRef.current[tabKeyForIndex(activeShortTabIndex)] = captureActiveTabSnapshot();
      if (activeShortTabIndex === null) {
        tabSnapshotsRef.current.full = tabSnapshotsRef.current.full ?? captureActiveTabSnapshot();
      }

      const fullSnapshot =
        tabSnapshotsRef.current.full ?? (activeShortTabIndex === null ? captureActiveTabSnapshot() : null);

      if (!fullSnapshot) {
        showAlert('Nothing to save yet.', { type: 'warning' });
        return;
      }

      const localActiveSnapshot =
        tabSnapshotsRef.current[tabKeyForIndex(activeShortTabIndex)] ?? captureActiveTabSnapshot();

      const coerceImageFile = async (params: {
        file?: File | null;
        url?: string | null;
        filename: string;
      }): Promise<File | null> => {
        if (params.file) return params.file;
        const url = String(params.url ?? '').trim();
        if (!url) return null;

        if (url.startsWith('data:')) {
          return dataUrlToFile(url, params.filename);
        }

        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const blob = await res.blob();
          const mimeType = String(blob.type ?? '').trim();
          if (!mimeType.startsWith('image/')) return null;
          const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
          const base = params.filename.replace(/\.[a-z0-9]+$/i, '');
          return new File([blob], `${base}.${ext}`, { type: mimeType || 'image/png' });
        } catch {
          return null;
        }
      };

      const uploadImageIfNeeded = async (params: {
        existingId?: string | null;
        file?: File | null;
        url?: string | null;
        filename: string;
        prompt?: string | null;
      }): Promise<string | null> => {
        if (params.existingId) return params.existingId;
        if (!params.file && !params.url) return null;

        const fileToUpload = await coerceImageFile({
          file: params.file,
          url: params.url,
          filename: params.filename,
        });
        if (!fileToUpload) return null;

        const formData = new FormData();
        formData.append('image', fileToUpload);
        if ((params.prompt ?? '').trim()) {
          formData.append('prompt', (params.prompt ?? '').trim());
        }

        const response = await api.post<{ id: string }>('/images', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.id;
      };

      const buildSentencePayload = async (items: SentenceItem[], prefix: string) => {
        const payload: {
          text: string;
          voice_over_url?: string | null;
          voice_over_mime_type?: string | null;
          voice_over_duration_seconds?: number | null;
          voice_over_provider?: VoiceProvider | null;
          voice_over_voice_id?: string | null;
          voice_over_voice_name?: string | null;
          voice_over_style_instructions?: string | null;
          eleven_labs_settings?: ElevenLabsVoiceSettings | null;
          eleven_labs_model?: ElevenLabsModel | null;
          scene_tab?: SentenceItem['sceneTab'] | null;
          character_keys?: string[] | null;
          location_key?: string | null;
          forced_location_key?: string | null;
          image_id?: string;
          secondary_image_id?: string;
          start_frame_image_id?: string;
          end_frame_image_id?: string;
          text_background_image_id?: string;
          text_background_video_id?: string;
          video_id?: string;
          video_prompt?: string;
          isSuspense?: boolean;
          forced_character_keys?: string[];
          align_sound_effects_to_scene_end?: boolean;
          transition_to_next?: SentenceItem['transitionToNext'] | null;
          text_animation_text?: string | null;
          text_animation_effect?: SentenceItem['textAnimationEffect'] | null;
          text_animation_id?: string | null;
          text_animation_settings?: Record<string, unknown> | null;
          text_animation_sound_effects?: Array<{
            sound_effect_id: string;
            title?: string;
            url?: string;
            delay_seconds: number;
            volume_percent: number;
            audio_settings_override?: Record<string, unknown> | null;
            timing_mode: 'with_previous' | 'after_previous_ends';
            duration_seconds?: number | null;
          }>;
          overlay_id?: string | null;
          overlay_settings?: Record<string, unknown> | null;
          overlay_sound_effects?: Array<{
            sound_effect_id: string;
            title?: string;
            url?: string;
            delay_seconds: number;
            volume_percent: number;
            audio_settings_override?: Record<string, unknown> | null;
            timing_mode: 'with_previous' | 'after_previous_ends';
            duration_seconds?: number | null;
          }>;
          image_effects_mode?: 'quick' | 'detailed' | null;
          visual_effect?: Exclude<SentenceItem['visualEffect'], 'none'> | null;
          image_filter_id?: string | null;
          image_filter_settings?: Record<string, unknown> | null;
          image_motion_effect?: NonNullable<SentenceItem['imageMotionEffect']> | null;
          motion_effect_id?: string | null;
          image_motion_settings?: Record<string, unknown> | null;
          image_motion_speed?: number | null;
          sound_effects?: Array<{
            sound_effect_id: string;
            delay_seconds: number;
            volume_percent: number;
            timing_mode: 'with_previous' | 'after_previous_ends';
          }>;
          transition_sound_effects?: Array<{
            sound_effect_id: string;
            title?: string;
            url?: string;
            delay_seconds: number;
            volume_percent: number;
          }>;
        }[] = [];

        for (let index = 0; index < items.length; index += 1) {
          const s = items[index];
          const imageId = await uploadImageIfNeeded({
            existingId: s.savedImageId ?? null,
            file: s.image,
            url: s.imageUrl,
            filename: `${prefix}-sentence-${index + 1}.png`,
            prompt: s.imagePrompt ?? null,
          });

          const secondaryImageId = await uploadImageIfNeeded({
            existingId: s.secondarySavedImageId ?? null,
            file: s.secondaryImage,
            url: s.secondaryImageUrl,
            filename: `${prefix}-sentence-${index + 1}-secondary.png`,
            prompt: s.secondaryImagePrompt ?? null,
          });

          const startFrameImageId = await uploadImageIfNeeded({
            existingId: s.startSavedImageId ?? null,
            file: s.startImage,
            url: s.startImageUrl,
            filename: `${prefix}-sentence-${index + 1}-start.png`,
            prompt: s.startImagePrompt ?? null,
          });

          const endFrameImageId = await uploadImageIfNeeded({
            existingId: s.endSavedImageId ?? null,
            file: s.endImage,
            url: s.endImageUrl,
            filename: `${prefix}-sentence-${index + 1}-end.png`,
            prompt: s.endImagePrompt ?? null,
          });

          const textBackgroundImageId = await uploadImageIfNeeded({
            existingId: s.textBackgroundSavedImageId ?? null,
            file: s.textBackgroundImage,
            url: s.textBackgroundImageUrl,
            filename: `${prefix}-sentence-${index + 1}-text-background.png`,
            prompt: null,
          });

          const normalizedOverlaySettings = s.overlaySettings
            ? normalizeOverlaySettings(s.overlaySettings)
            : null;
          const currentOverlayPreset = s.customOverlayId
            ? overlayPresets.find((item) => item.id === s.customOverlayId)
            : null;
          const overlaySourceUrl = String(s.overlayUrl ?? '').trim() || null;
          const overlayPresetNeedsCreate = Boolean(
            (s.overlayFile || overlaySourceUrl) &&
            (!currentOverlayPreset ||
              currentOverlayPreset.url !== overlaySourceUrl ||
              JSON.stringify(
                normalizeOverlaySettings(currentOverlayPreset.settings ?? null),
              ) !== JSON.stringify(normalizedOverlaySettings) ||
              !areDetachedSentenceSoundEffectsEqual(
                currentOverlayPreset.soundEffects,
                s.overlaySoundEffects,
              )),
          );
          const savedOverlayPreset = overlayPresetNeedsCreate
            ? await saveOverlayPresetRequest({
              title: currentOverlayPreset?.title ?? '',
              settings: normalizedOverlaySettings ?? getDefaultOverlaySettings('image'),
              file: s.overlayFile ?? null,
              sourceUrl: overlaySourceUrl,
              soundEffects: s.overlaySoundEffects,
            })
            : currentOverlayPreset;
          const overlayId = savedOverlayPreset?.id ?? s.customOverlayId ?? null;

          const sceneTab = isSubscribeLikeSentence(String(s.text ?? '').trim())
            ? 'video'
            : resolveSentenceSceneTab(s);

          payload.push({
            text: s.text,
            voice_over_url: s.voiceOverFile
              ? await persistSentenceVoiceFileToManagedStorage({
                file: s.voiceOverFile,
                sentenceId: s.id,
              })
              : isBlobUrl(s.voiceOverUrl)
                ? null
                : String(s.voiceOverUrl ?? '').trim() || null,
            voice_over_mime_type:
              String(s.voiceOverMimeType ?? '').trim() || null,
            voice_over_duration_seconds:
              typeof s.voiceOverDurationSeconds === 'number' &&
                Number.isFinite(s.voiceOverDurationSeconds)
                ? Math.max(0, s.voiceOverDurationSeconds)
                : null,
            voice_over_provider: s.voiceOverProvider ?? null,
            voice_over_voice_id: String(s.voiceOverVoiceId ?? '').trim() || null,
            voice_over_voice_name:
              String(s.voiceOverVoiceName ?? '').trim() || null,
            voice_over_style_instructions:
              String(s.voiceOverStyleInstructions ?? '').trim() || null,
            eleven_labs_settings: s.elevenLabsSettings ?? null,
            eleven_labs_model: s.elevenLabsModel ?? null,
            scene_tab: sceneTab,
            character_keys:
              Array.isArray(s.characterKeys) && s.characterKeys.length
                ? s.characterKeys
                : null,
            location_key: String(s.locationKey ?? '').trim() || null,
            forced_location_key:
              s.forcedLocationKey === null || s.forcedLocationKey === undefined
                ? null
                : String(s.forcedLocationKey).trim(),
            image_id: imageId ?? undefined,
            secondary_image_id: secondaryImageId ?? undefined,
            start_frame_image_id: startFrameImageId ?? undefined,
            end_frame_image_id: endFrameImageId ?? undefined,
            text_background_image_id: textBackgroundImageId ?? undefined,
            text_background_video_id: s.textBackgroundSavedVideoId ?? undefined,
            video_id: s.savedVideoId ?? undefined,
            video_prompt: String(s.videoPrompt ?? '').trim() || undefined,
            isSuspense: Boolean(s.isSuspense) && !isSubscribeLikeSentence(s.text),
            forced_character_keys: Array.isArray(s.forcedCharacterKeys)
              ? s.forcedCharacterKeys
              : undefined,
            align_sound_effects_to_scene_end: s.alignSoundEffectsToSceneEnd === true,
            transition_to_next: s.transitionToNext ?? null,
            text_animation_text: String(s.textAnimationText ?? '').trim() || null,
            text_animation_effect:
              resolveTextAnimationEffectFromSettings(
                s.textAnimationSettings,
                s.textAnimationEffect,
              ) ?? null,
            text_animation_id: s.customTextAnimationId ?? null,
            text_animation_settings: normalizeTextAnimationSettings(
              s.textAnimationSettings,
              s.textAnimationEffect,
              effectiveIsShort,
              resolveTextAnimationText(s.textAnimationText, s.text),
            ),
            text_animation_sound_effects:
              serializeDetachedSentenceSoundEffects(s.textSoundEffects),
            overlay_id: overlayId,
            overlay_settings: normalizedOverlaySettings,
            overlay_sound_effects:
              serializeDetachedSentenceSoundEffects(s.overlaySoundEffects),
            image_effects_mode: s.imageEffectsMode ?? 'quick',
            visual_effect:
              s.visualEffect === 'colorGrading' ||
                s.visualEffect === 'animatedLighting' ||
                s.visualEffect === 'glassSubtle' ||
                s.visualEffect === 'glassReflections' ||
                s.visualEffect === 'glassStrong'
                ? s.visualEffect
                : null,
            image_filter_id: s.customImageFilterId ?? null,
            image_filter_settings: normalizeSettingsObject(s.imageFilterSettings),
            image_motion_effect: s.imageMotionEffect ?? 'default',
            motion_effect_id: s.customMotionEffectId ?? null,
            image_motion_settings: normalizeSettingsObject(s.imageMotionSettings),
            image_motion_speed: normalizeImageMotionSpeedValue(s.imageMotionSpeed),
            sound_effects: Array.isArray(s.soundEffects)
              ? s.soundEffects
                .filter((e) => Boolean(e?.id))
                .map((e) => ({
                  sound_effect_id: String(e.id),
                  delay_seconds: Math.max(0, Number(e.delaySeconds ?? 0) || 0),
                  volume_percent: Math.max(
                    0,
                    Math.min(300, Number(e.volumePercent ?? 100) || 100),
                  ),
                  audio_settings_override: areSoundEffectAudioSettingsEqual(
                    e.audioSettings,
                    e.defaultAudioSettings,
                  )
                    ? null
                    : normalizeSoundEffectAudioSettings(e.audioSettings),
                  timing_mode:
                    e.timingMode === 'afterPreviousEnds'
                      ? 'after_previous_ends'
                      : 'with_previous',
                }))
              : undefined,
            transition_sound_effects: Array.isArray(s.transitionSoundEffects)
              ? s.transitionSoundEffects
                .filter((e) => Boolean(e?.id) && Boolean(e?.url))
                .map((e) => ({
                  sound_effect_id: String(e.id),
                  title: String(e.title ?? '').trim() || undefined,
                  url: String(e.url ?? '').trim() || undefined,
                  delay_seconds: Math.max(0, Number(e.delaySeconds ?? 0) || 0),
                  volume_percent: Math.max(
                    0,
                    Math.min(300, Number(e.volumePercent ?? 100) || 100),
                  ),
                }))
              : undefined,
          });
        }

        return payload;
      };

      const persistMissingSentenceVideos = async (params: {
        scriptId: string;
        backendSentences: BackendSentenceDto[];
        localSentences: SentenceItem[];
      }): Promise<
        Map<
          number,
          {
            primary?: { id: string; video: string };
            textBackground?: { id: string; video: string };
          }
        >
      > => {
        const updates = new Map<
          number,
          {
            primary?: { id: string; video: string };
            textBackground?: { id: string; video: string };
          }
        >();

        const persistTargetVideo = async (params: {
          scriptId: string;
          sentenceId: string;
          file: File | null;
          url: string | null;
          target: 'primary' | 'textBackground';
        }) => {
          const endpoint = `/scripts/${encodeURIComponent(params.scriptId)}/sentences/${encodeURIComponent(params.sentenceId)}/video`;

          const response = params.file
            ? await api.post<{ id: string; video: string }>(
              endpoint,
              (() => {
                const formData = new FormData();
                formData.append('video', params.file);
                formData.append('video_type', videoModel);
                formData.append('video_size', 'portrait');
                formData.append('target', params.target);
                return formData;
              })(),
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              },
            )
            : await api.post<{ id: string; video: string }>(
              endpoint,
              {
                videoUrl: params.url,
                video_type: videoModel,
                video_size: 'portrait',
                target: params.target,
              },
            );

          const saved = response.data;
          return saved?.id ? saved : null;
        };

        const sorted = [...(params.backendSentences ?? [])].sort(
          (a, b) => a.index - b.index,
        );

        for (const bs of sorted) {
          const local = params.localSentences?.[bs.index];
          if (!local) continue;

          try {
            const nextUpdate: {
              primary?: { id: string; video: string };
              textBackground?: { id: string; video: string };
            } = {};

            const localFile = local.video ?? null;
            const url = String(local.videoUrl ?? '').trim() || null;
            if (
              (localFile || url) &&
              url !== '/subscribe.mp4' &&
              !local.savedVideoId &&
              !bs.video?.id
            ) {
              const saved = await persistTargetVideo({
                scriptId: params.scriptId,
                sentenceId: bs.id,
                file: localFile,
                url,
                target: 'primary',
              });
              if (saved) {
                nextUpdate.primary = saved;
              }
            }

            const backgroundAsset = resolveTextSceneRenderBackgroundAsset(
              local,
              effectiveIsShort,
            );
            const backgroundFile =
              backgroundAsset.file ??
              (backgroundAsset.url?.startsWith('data:')
                ? dataUrlToFile(
                  backgroundAsset.url,
                  `sentence-${bs.index + 1}-text-background.mp4`,
                )
                : null);
            const backgroundUrl =
              backgroundAsset.url && !backgroundAsset.url.startsWith('data:')
                ? backgroundAsset.url
                : null;

            if (
              backgroundAsset.backgroundMode === 'video' &&
              (backgroundFile || backgroundUrl) &&
              !local.textBackgroundSavedVideoId &&
              !bs.textBackgroundVideo?.id
            ) {
              const saved = await persistTargetVideo({
                scriptId: params.scriptId,
                sentenceId: bs.id,
                file: backgroundFile,
                url: backgroundUrl,
                target: 'textBackground',
              });
              if (saved) {
                nextUpdate.textBackground = saved;
              }
            }

            if (nextUpdate.primary || nextUpdate.textBackground) {
              updates.set(bs.index, nextUpdate);
            }
          } catch (error) {
            // Best-effort: draft save should still succeed even if some video persistence fails.
            console.error('Persist sentence video failed', error);
          }
        }

        return updates;
      };

      const fullSentencePayload = await buildSentencePayload(fullSnapshot.sentences, 'full');
      const fullVoiceOverChunksPayload = await persistVoiceOverChunksToManagedStorage(
        fullSnapshot.voiceOverChunks,
      );

      const persistedFullVoiceChunks = syncPersistedVoiceChunksIntoState(
        fullVoiceOverChunksPayload,
        fullSnapshot.voiceOverChunks,
      );

      // Optionally attach a voice-over to the draft if available
      let voiceId = fullSnapshot.savedVoiceId;

      if (
        !voiceId &&
        fullSnapshot.voiceOver &&
        !hasPersistableVoiceChunks(fullSnapshot.voiceOverChunks)
      ) {
        const saved = await persistVoiceToLibrary(fullSnapshot.voiceOver);
        voiceId = saved.id;

        // Only update the visible state if we're on the full tab.
        if (activeShortTabIndex === null) {
          setSavedVoiceId(voiceId);
        }
      }

      fullSnapshot.voiceOverChunks = cloneVoiceOverChunks(persistedFullVoiceChunks);
      if (activeShortTabIndex === null) {
        setVoiceOverChunks(cloneVoiceOverChunks(persistedFullVoiceChunks));
      }

      const shouldSendShorts =
        isLongForm && (shortRanges.length > 0 || shortScriptIds.length > 0);

      let shortsScriptIdsToLink: string[] | undefined;

      if (shouldSendShorts) {
        const shortsCount = shortRanges.length > 0 ? shortRanges.length : shortScriptIds.length;

        if (shortRanges.length > 0) {
          const storySentences = fullSnapshot.sentences.filter(
            (s) => !isSubscribeLikeSentence(s.text),
          );
          const rangeError = validateShortRanges(shortRanges, storySentences);
          if (rangeError) {
            showAlert(rangeError, { type: 'warning' });
            return;
          }
        }

        // If we have explicit ranges (manual/AI split), ensure short snapshots exist.
        if (shortRanges.length > 0) {
          const missingAny = shortRanges.some(
            (_, idx) => !tabSnapshotsRef.current[tabKeyForIndex(idx)],
          );
          if (missingAny) {
            // Rebuild from the full tab so shorts inherit media.
            tabSnapshotsRef.current.full = fullSnapshot;
            const rebuildError = rebuildShortTabSnapshots(shortRanges);
            if (rebuildError) {
              showAlert(rebuildError, { type: 'warning' });
              return;
            }
          }
        }

        if (shortsCount > 0) {
          const upsertedShortIds: string[] = [];

          for (let i = 0; i < shortsCount; i += 1) {
            const snapKey = tabKeyForIndex(i);
            const snap = tabSnapshotsRef.current[snapKey];
            const items = snap?.sentences ?? [];

            // Optionally attach a voice-over to the short if available
            let shortVoiceId = snap?.savedVoiceId ?? null;
            let shortVoiceLibraryUrl = snap?.voiceLibraryUrl ?? null;
            const shortVoiceOverChunksPayload = await persistVoiceOverChunksToManagedStorage(
              snap?.voiceOverChunks ?? [],
            );
            const persistedShortVoiceChunks = syncPersistedVoiceChunksIntoState(
              shortVoiceOverChunksPayload,
              snap?.voiceOverChunks ?? [],
            );

            if (
              !shortVoiceId &&
              snap?.voiceOver &&
              !hasPersistableVoiceChunks(snap?.voiceOverChunks)
            ) {
              const saved = await persistVoiceToLibrary(snap.voiceOver);
              shortVoiceId = saved.id;
              shortVoiceLibraryUrl = saved.url;

              // Only update the visible state if we're on this short tab.
              if (activeShortTabIndex === i) {
                setSavedVoiceId(shortVoiceId);
                setVoiceLibraryUrl(shortVoiceLibraryUrl);
                setVoiceOverChunks(cloneVoiceOverChunks(persistedShortVoiceChunks));
              }
            }

            const withoutEmpty = items.filter((s) => String(s.text ?? '').trim());
            const finalItems = withoutEmpty;

            const shortSentencesPayload = await buildSentencePayload(
              finalItems,
              `short-${i + 1}`,
            );

            const shortPayload = {
              script: finalItems
                .map((s) => String(s.text ?? '').trim())
                .filter(Boolean)
                .join(' '),
              voice_id: shortVoiceId ?? undefined,
              voice_over_chunks: shortVoiceOverChunksPayload,
              voice_generation_config: buildVoiceGenerationConfig({
                mode: voiceGenerationMode,
                provider: voiceProvider,
                providerVoiceId: selectedVoiceIdByProvider[voiceProvider],
                elevenLabsAutoGenerationStrategy,
                elevenLabsModel: elevenLabsGlobalModel,
                styleInstructions: aiStudioStyleInstructions,
                elevenLabsSettings: elevenLabsGlobalSettings,
              }),
              title: `Short ${i + 1}`,
              video_url: snap?.videoUrl ?? undefined,
              language: scriptLanguage,
              characters: scriptCharacters.length ? scriptCharacters : undefined,
              locations: scriptLocations.length ? scriptLocations : undefined,
              sentences: shortSentencesPayload,
              subject: scriptSubject,
              subject_content:
                scriptSubject === 'religious (Islam)' ? (scriptSubjectContent || null) : null,
              length: scriptLength,
              style: referenceScripts.length > 0 ? null : scriptStyle,
              technique: scriptTechnique,
              reference_script_ids:
                referenceScripts.length > 0
                  ? referenceScripts.map((s) => s.id)
                  : undefined,
              is_short_script: script.length < 2500 ? true : false,
            };

            const existingShortId =
              String(snap?.scriptId ?? shortScriptIds[i] ?? '').trim() || null;

            const upsertedShort = existingShortId
              ? await api.patch<{ id: string; sentences?: BackendSentenceDto[] }>(
                `/scripts/${encodeURIComponent(existingShortId)}`,
                shortPayload,
              )
              : await api.post<{ id: string; sentences?: BackendSentenceDto[] }>(
                '/scripts',
                shortPayload,
              );

            const id = String(upsertedShort.data?.id ?? '').trim();
            if (!id) {
              showAlert('Failed to save a short draft. Please try again.', { type: 'error' });
              return;
            }

            upsertedShortIds.push(id);

            // Persist any generated sentence videos (best-effort) so video_id is stored in the draft.
            const shortBackendSentences = Array.isArray(upsertedShort.data?.sentences)
              ? upsertedShort.data.sentences
              : [];
            const shortVideoUpdates =
              shortBackendSentences.length > 0
                ? await persistMissingSentenceVideos({
                  scriptId: id,
                  backendSentences: shortBackendSentences,
                  localSentences: finalItems,
                })
                : new Map();
            const mergedShortSentences =
              shortBackendSentences.length > 0
                ? mapBackendSentencesToUi(shortBackendSentences).map((sentence, idx) => {
                  const localSentence = finalItems[idx];
                  const update = shortVideoUpdates.get(idx);

                  const mergedVideoUrl =
                    sentence.videoUrl ??
                    (localSentence?.videoUrl && localSentence.videoUrl !== '/subscribe.mp4'
                      ? localSentence.videoUrl
                      : null);
                  const mergedVideoFile =
                    !sentence.videoUrl && !update?.primary
                      ? (localSentence?.video ?? null)
                      : null;
                  const mergedTextBackgroundVideoUrl =
                    sentence.textBackgroundVideoUrl ??
                    localSentence?.textBackgroundVideoUrl ??
                    null;
                  const mergedTextBackgroundVideoFile =
                    !sentence.textBackgroundVideoUrl && !update?.textBackground
                      ? (localSentence?.textBackgroundVideo ?? null)
                      : null;

                  return {
                    ...sentence,
                    ...(update?.primary
                      ? {
                        videoUrl: update.primary.video,
                        savedVideoId: update.primary.id,
                      }
                      : {
                        video: mergedVideoFile,
                        videoUrl: mergedVideoUrl,
                        savedVideoId:
                          sentence.savedVideoId ??
                          localSentence?.savedVideoId ??
                          null,
                      }),
                    ...(update?.textBackground
                      ? {
                        textBackgroundVideoUrl: update.textBackground.video,
                        textBackgroundSavedVideoId: update.textBackground.id,
                      }
                      : {
                        textBackgroundVideo: mergedTextBackgroundVideoFile,
                        textBackgroundVideoUrl: mergedTextBackgroundVideoUrl,
                        textBackgroundSavedVideoId:
                          sentence.textBackgroundSavedVideoId ??
                          localSentence?.textBackgroundSavedVideoId ??
                          null,
                      }),
                  };
                })
                : finalItems;

            // Keep local snapshot IDs in sync.
            tabSnapshotsRef.current[snapKey] = {
              ...(tabSnapshotsRef.current[snapKey] ?? {
                sentences: mergedShortSentences,
                voiceOver: null,
                voiceOverChunks: [],
                voiceDuration: null,
                savedVoiceId: null,
                voiceLibraryUrl: null,
                videoJobId: null,
                videoJobStatus: null,
                videoJobError: null,
                videoUrl: snap?.videoUrl ?? null,
              }),
              scriptId: id,
              sentences: mergedShortSentences,
              voiceOverChunks: cloneVoiceOverChunks(persistedShortVoiceChunks),
              savedVoiceId: shortVoiceId,
              voiceLibraryUrl: shortVoiceLibraryUrl,
            };

            if (activeShortTabIndex === i) {
              setSentences(mergedShortSentences);
              setVoiceOverChunks(cloneVoiceOverChunks(persistedShortVoiceChunks));
            }
          }

          shortsScriptIdsToLink = upsertedShortIds;
          setShortScriptIds(upsertedShortIds);
        } else {
          // Explicitly clear shorts on save.
          shortsScriptIdsToLink = [];
          setShortScriptIds([]);
        }
      }

      const existingFullId = String(fullScriptId ?? fullSnapshot.scriptId ?? '').trim() || null;

      const payload: {
        script: string;
        voice_id?: string;
        voice_over_chunks?: ScriptVoiceOverChunkDto[] | null;
        voice_generation_config?: ScriptVoiceGenerationConfigDto | null;
        video_url?: string;
        characters?: ScriptCharacter[];
        locations?: ScriptLocation[];
        sentences?: {
          text: string;
          scene_tab?: SentenceItem['sceneTab'] | null;
          character_keys?: string[] | null;
          location_key?: string | null;
          forced_location_key?: string | null;
          image_id?: string;
          secondary_image_id?: string;
          start_frame_image_id?: string;
          end_frame_image_id?: string;
          text_background_image_id?: string;
          text_background_video_id?: string;
          video_id?: string;
          video_prompt?: string;
          isSuspense?: boolean;
          forced_character_keys?: string[];
          transition_to_next?: SentenceItem['transitionToNext'] | null;
          text_animation_text?: string | null;
          text_animation_effect?: SentenceItem['textAnimationEffect'] | null;
          text_animation_id?: string | null;
          text_animation_settings?: Record<string, unknown> | null;
          image_effects_mode?: 'quick' | 'detailed' | null;
          visual_effect?: Exclude<SentenceItem['visualEffect'], 'none'> | null;
          image_filter_id?: string | null;
          image_filter_settings?: Record<string, unknown> | null;
          image_motion_effect?: NonNullable<SentenceItem['imageMotionEffect']> | null;
          motion_effect_id?: string | null;
          image_motion_settings?: Record<string, unknown> | null;
          image_motion_speed?: number | null;
        }[];
        subject?: string;
        subject_content?: string | null;
        length?: string;
        style?: string | null;
        technique?: string | null;
        language?: string;
        reference_script_ids?: string[];
        shorts_script_ids?: string[];
      } = {
        script,
        voice_id: voiceId ?? undefined,
        voice_over_chunks: fullVoiceOverChunksPayload,
        voice_generation_config: buildVoiceGenerationConfig({
          mode: voiceGenerationMode,
          provider: voiceProvider,
          providerVoiceId: selectedVoiceIdByProvider[voiceProvider],
          elevenLabsAutoGenerationStrategy,
          elevenLabsModel: elevenLabsGlobalModel,
          styleInstructions: aiStudioStyleInstructions,
          elevenLabsSettings: elevenLabsGlobalSettings,
        }),
        video_url: existingFullId ? undefined : fullSnapshot.videoUrl ?? undefined,
        characters: scriptCharacters.length ? scriptCharacters : undefined,
        locations: scriptLocations.length ? scriptLocations : undefined,
        sentences: fullSentencePayload.length > 0 ? fullSentencePayload : undefined,
        subject: scriptSubject,
        subject_content:
          scriptSubject === 'religious (Islam)' ? (scriptSubjectContent || null) : null,
        length: scriptLength,
        style: referenceScripts.length > 0 ? null : scriptStyle,
        technique: scriptTechnique,
        language: scriptLanguage,
        reference_script_ids:
          referenceScripts.length > 0 ? referenceScripts.map((s) => s.id) : undefined,
        shorts_script_ids: shouldSendShorts ? (shortsScriptIdsToLink ?? []) : undefined,
      };

      const upserted = existingFullId
        ? await api.patch(`/scripts/${encodeURIComponent(existingFullId)}`, payload)
        : await api.post('/scripts', payload);

      const upsertedScript = upserted.data as {
        id: string;
        characters?: ScriptCharacter[];
        locations?: ScriptLocation[];
        sentences?: BackendSentenceDto[];
        shorts_scripts?: string[] | null;
      };

      if (upsertedScript?.id) {
        setFullScriptId(upsertedScript.id);
        if (activeShortTabIndex === null) {
          setActiveScriptId(upsertedScript.id);
        }
      }

      if (Array.isArray(upsertedScript?.characters)) {
        setScriptCharacters(upsertedScript.characters);
      }

      if (Array.isArray(upsertedScript?.locations)) {
        setScriptLocations(upsertedScript.locations);
      }

      if (upsertedScript?.sentences && upsertedScript.sentences.length > 0) {
        const videoUpdates = await persistMissingSentenceVideos({
          scriptId: upsertedScript.id,
          backendSentences: upsertedScript.sentences,
          localSentences: fullSnapshot.sentences,
        });

        const mappedFull = mapBackendSentencesToUi(upsertedScript.sentences).map((s, idx) => {
          const local = fullSnapshot.sentences?.[idx];
          const update = videoUpdates.get(idx);

          // Preserve local generated videoUrl immediately after save, even before it's persisted.
          const mergedVideoUrl =
            s.videoUrl ?? (local?.videoUrl && local.videoUrl !== '/subscribe.mp4' ? local.videoUrl : null);
          const mergedVideoFile = !s.videoUrl && !update?.primary ? (local?.video ?? null) : null;
          const mergedTextBackgroundVideoUrl =
            s.textBackgroundVideoUrl ?? local?.textBackgroundVideoUrl ?? null;
          const mergedTextBackgroundVideoFile =
            !s.textBackgroundVideoUrl && !update?.textBackground
              ? (local?.textBackgroundVideo ?? null)
              : null;

          return {
            ...s,
            ...(update?.primary
              ? {
                videoUrl: update.primary.video ?? mergedVideoUrl,
                savedVideoId: update.primary.id,
              }
              : {
                video: mergedVideoFile,
                videoUrl: mergedVideoUrl,
                savedVideoId: s.savedVideoId ?? local?.savedVideoId ?? null,
              }),
            ...(update?.textBackground
              ? {
                textBackgroundVideoUrl: update.textBackground.video,
                textBackgroundSavedVideoId: update.textBackground.id,
              }
              : {
                textBackgroundVideo: mergedTextBackgroundVideoFile,
                textBackgroundVideoUrl: mergedTextBackgroundVideoUrl,
                textBackgroundSavedVideoId:
                  s.textBackgroundSavedVideoId ??
                  local?.textBackgroundSavedVideoId ??
                  null,
              }),
          };
        });

        tabSnapshotsRef.current.full = {
          ...fullSnapshot,
          scriptId: upsertedScript.id,
          sentences: mappedFull,
          savedVoiceId: voiceId ?? null,
        };

        if (activeShortTabIndex === null) {
          setSentences(mappedFull);
        }
      }

      const returnedShortIds = Array.isArray(upsertedScript?.shorts_scripts)
        ? upsertedScript.shorts_scripts.map((s) => String(s ?? '').trim()).filter(Boolean)
        : [];

      if (shouldSendShorts) {
        const idsToUse =
          returnedShortIds.length > 0
            ? returnedShortIds
            : Array.isArray(shortsScriptIdsToLink)
              ? shortsScriptIdsToLink
              : [];

        setShortScriptIds(idsToUse);

        // Keep snapshots aligned with the final ID list without re-fetching.
        for (let idx = 0; idx < idsToUse.length; idx += 1) {
          const key = tabKeyForIndex(idx);
          const snap = tabSnapshotsRef.current[key];
          if (!snap) continue;
          tabSnapshotsRef.current[key] = { ...snap, scriptId: idsToUse[idx] };
        }

        if (activeShortTabIndex !== null) {
          const snap = tabSnapshotsRef.current[tabKeyForIndex(activeShortTabIndex)];
          if (snap) applyTabSnapshot(snap);
        }
      }

      showAlert(existingFullId ? 'Draft updated successfully.' : 'Draft saved successfully.', {
        type: 'success',
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Save script draft failed', error);
      showAlert('Failed to save draft. Please try again.', { type: 'error' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const clearVoiceState = () => {
    try {
      previewAbortRef.current?.abort();
    } catch {
      // ignore
    }

    setVoiceOver(null);
    setVoiceOverChunks([]);
    setVoiceDuration(null);
    setVoiceError(null);
    setSavedVoiceId(null);
    setVoiceLibraryUrl(null);
    setIsPreviewingVoice(false);
    setIsGeneratingVoice(false);
    setVoiceGenerationProgress(null);
    Object.values(sentenceVoiceCandidateByIdRef.current).forEach((candidate) => {
      disposeSentenceVoiceCandidate(candidate);
    });
    Object.values(chunkVoiceCandidateByIdRef.current).forEach((candidate) => {
      disposeChunkVoiceCandidate(candidate);
    });
    setVoiceGenerationMode('auto');
    setElevenLabsAutoGenerationStrategy('oneTake');
    setAiStudioStyleInstructions('');
    setElevenLabsGlobalModel(DEFAULT_ELEVENLABS_MODEL);
    setElevenLabsGlobalSettings(null);
    setIsElevenLabsSettingsModalOpen(false);
    setIsSentenceVoiceManagerOpen(false);
    setIsChunkVoiceManagerOpen(false);
    setActiveSentenceVoiceEditorSentenceId(null);
    setActiveChunkVoiceEditorId(null);
    setSentenceVoiceEditActionError(null);
    setChunkVoiceEditActionError(null);
    setSentenceVoiceCandidateById({});
    setChunkVoiceCandidateById({});
    setIsGeneratingSentenceVoiceStyleById({});
    setIsGeneratingChunkVoiceStyleById({});
    setIsRegeneratingSentenceVoiceById({});
    setIsRegeneratingChunkVoiceById({});
    setIsApplyingSentenceVoiceCandidateById({});
    setIsApplyingChunkVoiceCandidateById({});

    setSelectedVoiceIdByProvider({ google: null, elevenlabs: null });
  };

  const resetDraftIdentity = () => {
    setFullScriptId(null);
    setActiveScriptId(null);
    setActiveShortTabIndex(null);
    setShortRanges([]);
    setShortScriptIds([]);
    setManualSplitEnabled(false);
    setShortsValidationError(null);
    tabSnapshotsRef.current = {};
    aiSplitCacheRef.current = null;
    setOriginalScriptSubject(undefined);
    setOriginalScriptSubjectContent(undefined);
  };

  const handleOpenTranslateModal = () => {
    // Shorts translation is intentionally not supported (parent-only).
    if (activeShortTabIndex !== null) {
      showAlert('Switch to Full Video tab before translating.', { type: 'warning' });
      return;
    }

    const nextTargetLanguage = String(scriptLanguage ?? '').trim() || 'ar';
    setTranslateTargetLanguage(nextTargetLanguage);
    setTranslateMethod(isLlmOnlyTranslateLanguage(nextTargetLanguage) ? 'llm' : 'google');
    setTranslateLoadingAction(null);
    setIsTranslateModalOpen(true);
  };

  const handleTranslateTargetLanguageChange = (value: string) => {
    setTranslateTargetLanguage(value);
    if (isLlmOnlyTranslateLanguage(value)) {
      setTranslateMethod('llm');
    }
  };

  const getExplicitTextAnimationText = (sentence: SentenceItem) => {
    const raw = String(sentence.textAnimationText ?? '');
    if (!raw.trim()) {
      return null;
    }

    // Older hydration paths materialized fallback hook text into state.
    // Treat that derived value as blank so translation preserves fallback behavior.
    const fallback = resolveTextAnimationText(null, sentence.text);
    return raw.trim() === fallback.trim() ? null : raw;
  };

  const translateEditorContent = async (): Promise<
    | { kind: 'sentences'; sentences: string[]; hookTexts: Array<string | null>; script?: string }
    | { kind: 'script'; script: string }
  > => {
    const targetLanguage = String(translateTargetLanguage ?? '').trim();
    if (!targetLanguage) {
      throw new Error('Target language is required');
    }

    const method = isLlmOnlyTranslateLanguage(targetLanguage) ? 'llm' : translateMethod;
    const model = method === 'llm' ? scriptModel : undefined;

    const sourceScript = String(script ?? '').trim();

    const coerceTranslateResponse = (data: unknown): { script?: unknown; sentences?: unknown[] } => {
      if (data && typeof data === 'object') {
        return data as { script?: unknown; sentences?: unknown[] };
      }
      if (typeof data === 'string') {
        try {
          const parsed: unknown = JSON.parse(data);
          if (parsed && typeof parsed === 'object') {
            return parsed as { script?: unknown; sentences?: unknown[] };
          }
        } catch {
          // ignore
        }
      }
      return {};
    };

    if (sentences.length > 0) {
      const sentenceTexts = sentences.map((s) => String(s.text ?? ''));
      const explicitHookTextEntries = sentences
        .map((sentence, index) => ({
          index,
          text: getExplicitTextAnimationText(sentence),
        }))
        .filter((entry): entry is { index: number; text: string } => Boolean(entry.text));
      const textsToTranslate = [
        ...sentenceTexts,
        ...explicitHookTextEntries.map((entry) => entry.text),
      ];

      // When sentences exist we also ask the API to translate the full script text.
      // This keeps formatting/newlines closer to the original instead of re-joining sentences.
      const res = await api.post<{ sentences?: unknown[]; script?: unknown }>('/ai/translate', {
        targetLanguage,
        method,
        model,
        ...(sourceScript ? { script: sourceScript } : {}),
        sentences: textsToTranslate,
      });

      const data = coerceTranslateResponse(res.data);

      const translatedRaw = data?.sentences;
      const translated = Array.isArray(translatedRaw)
        ? translatedRaw.map((t) => String(t ?? ''))
        : null;

      // Be strict about length to preserve sentence-media mapping, but provide a safer error message.
      if (!translated || translated.length !== textsToTranslate.length) {
        throw new Error(
          `Translation failed (sentence count mismatch). Expected ${textsToTranslate.length}, got ${Array.isArray(translatedRaw) ? translatedRaw.length : 0}`,
        );
      }

      const translatedSentenceTexts = translated.slice(0, sentenceTexts.length);

      // Force CTA lines to be exactly the localized CTA for the target language.
      const subscribeTarget = getSubscribeSentence(targetLanguage);
      const shortsTarget = getShortsCtaSentence(targetLanguage);
      const fixed = translatedSentenceTexts.map((t, idx) => {
        const original = String(sentences[idx]?.text ?? '');
        if (isShortsCtaSentence(original)) return shortsTarget;
        if (isSubscribeCtaSentence(original)) return subscribeTarget;
        return String(t ?? '');
      });

      const translatedHookTexts = Array<string | null>(sentenceTexts.length).fill(null);
      explicitHookTextEntries.forEach((entry, entryIndex) => {
        translatedHookTexts[entry.index] =
          String(translated[sentenceTexts.length + entryIndex] ?? '').trim() || entry.text;
      });

      const translatedScript = String(data?.script ?? '').trim();
      return {
        kind: 'sentences',
        sentences: fixed,
        hookTexts: translatedHookTexts,
        script: translatedScript || undefined,
      };
    }

    if (!sourceScript) {
      throw new Error('Script is empty');
    }

    const res = await api.post<{ script?: unknown }>('/ai/translate', {
      targetLanguage,
      method,
      model,
      script: sourceScript,
    });

    const data = coerceTranslateResponse(res.data);

    const translated = String(data?.script ?? '').trim();
    if (!translated) {
      throw new Error('Translation failed');
    }

    return { kind: 'script', script: translated };
  };

  const applyTranslationToEditor = (params: {
    targetLanguage: string;
    result:
    | { kind: 'sentences'; sentences: string[]; hookTexts: Array<string | null>; script?: string }
    | { kind: 'script'; script: string };
  }) => {
    clearVoiceState();
    resetDraftIdentity();
    setScriptLanguage(params.targetLanguage);

    if (params.result.kind === 'sentences') {
      const translatedSentences = params.result.sentences;
      const translatedHookTexts = params.result.hookTexts;
      setSentences((prev) =>
        prev.map((s, idx) => ({
          ...s,
          text: String(translatedSentences[idx] ?? s.text ?? ''),
          textAnimationText: translatedHookTexts[idx] ?? null,
        })),
      );

      const translatedScript = String(params.result.script ?? '').trim();
      setScript(
        translatedScript ||
        translatedSentences
          .map((t) => String(t ?? '').trim())
          .filter(Boolean)
          .join(' '),
      );
    } else {
      setScript(params.result.script);
      Object.values(chunkVoiceCandidateByIdRef.current).forEach((candidate) => {
        disposeChunkVoiceCandidate(candidate);
      });
    }
  };

  const handleTranslateOnly = async () => {
    if (activeShortTabIndex !== null) {
      showAlert('Switch to Full Video tab before translating.', { type: 'warning' });
      return;
    }

    setTranslateLoadingAction('only');
    setIsTranslatingScript(true);
    try {
      const targetLanguage = String(translateTargetLanguage ?? '').trim() || 'en';
      const result = await translateEditorContent();

      applyTranslationToEditor({ targetLanguage, result });
      setIsTranslateModalOpen(false);
      showToast('Translation applied in editor (not saved).', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Translate failed', error);
      showAlert('Failed to translate. Please try again.', { type: 'error' });
    } finally {
      setIsTranslatingScript(false);
      setTranslateLoadingAction(null);
    }
  };

  const handleTranslateAndSave = async () => {
    if (activeShortTabIndex !== null) {
      showAlert('Switch to Full Video tab before translating.', { type: 'warning' });
      return;
    }

    const targetLanguage = String(translateTargetLanguage ?? '').trim();
    if (!targetLanguage) {
      showAlert('Please choose a target language.', { type: 'warning' });
      return;
    }

    const method = isLlmOnlyTranslateLanguage(targetLanguage) ? 'llm' : translateMethod;
    const model = method === 'llm' ? scriptModel : undefined;

    const existingId = String(fullScriptId ?? activeScriptId ?? '').trim() || null;

    setTranslateLoadingAction('save');
    setIsTranslatingScript(true);
    try {
      if (existingId) {
        const res = await api.post<ScriptDraftDto>(
          `/scripts/${encodeURIComponent(existingId)}/translate`,
          {
            targetLanguage,
            method,
            model,
          },
        );

        const translatedDraft = res.data;
        if (!translatedDraft?.id) {
          showAlert('Failed to save translated draft. Please try again.', { type: 'error' });
          return;
        }

        setIsTranslateModalOpen(false);
        handleSelectScriptFromLibrary(translatedDraft);
        showToast('Translated draft saved.', 'success');
        return;
      }

      // Unsaved source: translate in editor, then save as a new draft (no grouping).
      const result = await translateEditorContent();
      applyTranslationToEditor({ targetLanguage, result });
      setIsTranslateModalOpen(false);

      await new Promise((r) => setTimeout(r, 0));
      await handleSaveScriptDraft();
    } finally {
      setIsTranslatingScript(false);
      setTranslateLoadingAction(null);
    }
  };

  if (isLoading || isLoadingScriptHandoff) {
    return <GeneratePageSkeleton />;
  }

  return (
    <div className="flex h-screen bg-white text-gray-900">
      <ToastContainer />
      {/* Sidebar */}
      <Sidebar
        user={user}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <HeaderBar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

          <div className="p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="text-center py-12 relative">
                <div className="inline-block relative mb-6">
                  <div className="absolute inset-0 bg-linear-to-r from-purple-400 to-blue-400 blur-xl opacity-50 rounded-full"></div>
                  <div className="relative bg-linear-to-br from-purple-500 to-blue-600 p-4 rounded-2xl shadow-xl">
                    <Video className="h-16 w-16 text-white" />
                  </div>
                </div>
                <h2 className="text-4xl font-bold mb-3 bg-linear-to-r from-gray-900 via-purple-900 to-blue-900 bg-clip-text text-transparent">
                  Generate Your Video
                </h2>
                <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                  Provide your script, images, and voice-over to create an
                  AI-directed video with professional results
                </p>
              </div>

              {/* Generate Form */}
              <div className="bg-linear-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                <Accordion type="multiple" defaultValue={['script', 'sentences', 'voice']} className="w-full">
                  <ScriptSection
                    user={user}
                    script={script}
                    onScriptChange={setScript}
                    scriptLanguage={scriptLanguage}
                    setScriptLanguage={setScriptLanguage}
                    systemPrompt={systemPrompt}
                    onSystemPromptChange={setSystemPrompt}
                    referenceScripts={referenceScripts}
                    onOpenReferenceLibrary={handleOpenScriptReferences}
                    onRemoveReferenceScript={handleRemoveReferenceScript}
                    onClearReferenceScripts={handleClearReferenceScripts}
                    hasSentences={sentences.length > 0}
                    scriptSubject={scriptSubject}
                    setScriptSubject={setScriptSubject}
                    scriptSubjectContent={scriptSubjectContent}
                    setScriptSubjectContent={setScriptSubjectContent}
                    scriptLength={scriptLength}
                    setScriptLength={setScriptLength}
                    scriptStyle={scriptStyle}
                    setScriptStyle={setScriptStyle}
                    scriptTechnique={scriptTechnique}
                    setScriptTechnique={setScriptTechnique}
                    useWebSearchForTrending={useWebSearchForTrending}
                    setUseWebSearchForTrending={setUseWebSearchForTrending}
                    scriptModel={scriptModel}
                    setScriptModel={setScriptModel}
                    isRandomScriptLoading={isRandomScriptLoading}
                    isScriptIdeasLoading={isScriptIdeasLoading}
                    isSplitting={isSplitting}
                    randomScriptError={randomScriptError}
                    scriptIdeasError={scriptIdeasError}
                    splitError={splitError}
                    scriptIdeas={scriptIdeas}
                    selectedScriptIdeaTitle={selectedScriptIdeaTitle}
                    onGenerateScriptIdeas={handleFetchScriptIdeas}
                    onGenerateFromScriptIdea={handleGenerateFromIdea}
                    onGenerateRandomScript={handleGenerateRandomScript}
                    onSplitScript={handleSplitScript}
                    onResetScript={handleResetScriptAndSentences}
                    onSaveDraft={handleSaveScriptDraft}
                    isSavingDraft={isSavingDraft}
                    onOpenLibrary={handleOpenScriptLibrary}
                    isLongForm={isLongForm}
                    originalScriptSubject={originalScriptSubject}
                    originalScriptSubjectContent={originalScriptSubjectContent}
                    isEnhancingScript={isEnhancingScript}
                    onEnhanceScript={handleEnhanceScript}
                    onOpenTranslate={handleOpenTranslateModal}
                  />

                  <SentencesImagesSection
                    sentences={sentences}
                    isShortVideo={effectiveIsShort}
                    sceneDurationSecondsByIndex={buildEstimatedSceneDurationSeconds(
                      sentences,
                      voiceDuration,
                    )}
                    editorMode={sceneEditorMode}
                    onEditorModeChange={setSceneEditorMode}
                    isLongForm={isLongForm}
                    shortsTabs={(shortRanges.length
                      ? shortRanges
                      : shortScriptIds.map((_id, idx) => {
                        const snap = tabSnapshotsRef.current[tabKeyForIndex(idx)];
                        const count = (snap?.sentences ?? []).filter(
                          (s) => !isSubscribeLikeSentence(s.text),
                        ).length;
                        return { start: 0, end: Math.max(0, count - 1) };
                      })
                    ).map((r, idx) => ({
                      label: `Short ${idx + 1}`,
                      count: Math.max(0, r.end - r.start + 1),
                    }))}
                    activeShortTabIndex={activeShortTabIndex}
                    onSelectShortTab={handleSelectShortTab}
                    manualSplitEnabled={manualSplitEnabled}
                    onManualSplitToggle={async (next) => {
                      if (!next) {
                        // Persist any edits on the current tab.
                        tabSnapshotsRef.current[tabKeyForIndex(activeShortTabIndex)] =
                          captureActiveTabSnapshot();

                        // Restore the full tab content (if we have it).
                        if (tabSnapshotsRef.current.full) {
                          applyTabSnapshot(tabSnapshotsRef.current.full);
                        }

                        setManualSplitEnabled(false);
                        setActiveShortTabIndex(null);

                        const cachedAi = aiSplitCacheRef.current;
                        if (cachedAi && cachedAi.ranges.length > 0) {
                          setShortRanges(cachedAi.ranges);
                          setShortScriptIds([]);
                          setShortsValidationError(null);

                          // Replace current short snapshots with the cached AI ones.
                          Object.keys(tabSnapshotsRef.current)
                            .filter((k) => k.startsWith('short-'))
                            .forEach((k) => {
                              delete tabSnapshotsRef.current[k];
                            });

                          Object.entries(cachedAi.shortSnapshotsByKey).forEach(([k, snap]) => {
                            tabSnapshotsRef.current[k] = cloneSnapshot(snap);
                          });
                        } else {
                          setShortRanges([]);
                          setShortScriptIds([]);
                          setShortsValidationError(null);

                          // Drop all short snapshots.
                          Object.keys(tabSnapshotsRef.current)
                            .filter((k) => k.startsWith('short-'))
                            .forEach((k) => {
                              delete tabSnapshotsRef.current[k];
                            });
                        }
                        return;
                      }
                      handleSplitIntoShortsManually();
                    }}
                    onSplitWithAi={handleSplitIntoShortsWithAi}
                    isSplittingWithAi={isSplittingIntoShorts}
                    shortsValidationError={shortsValidationError}
                    imageAspectRatio={imageAspectRatio}
                    onImageAspectRatioChange={handleImageAspectRatioChange}
                    imagePromptModel={imagePromptModel}
                    onImagePromptModelChange={handleImagePromptModelChange}
                    imageModel={imageModel}
                    onImageModelChange={handleImageModelChange}
                    imageStyle={imageStyle}
                    onImageStyleChange={handleImageStyleChange}
                    videoModel={videoModel}
                    onVideoModelChange={handleVideoModelChange}
                    scriptCharacters={scriptCharacters}
                    onScriptCharactersChange={handleScriptCharactersChange}
                    onSentenceForcedCharacterKeysChange={handleSentenceForcedCharacterKeysChange}
                    scriptLocations={scriptLocations}
                    onScriptLocationsChange={handleScriptLocationsChange}
                    onSentenceForcedLocationKeyChange={handleSentenceForcedLocationKeyChange}
                    imageFilterPresets={imageFilterPresets}
                    motionEffectPresets={motionEffectPresets}
                    textAnimationPresets={textAnimationPresets}
                    overlayPresets={overlayPresets}
                    isLoadingImageFilterPresets={isLoadingImageFilterPresets}
                    isLoadingMotionEffectPresets={isLoadingMotionEffectPresets}
                    isLoadingTextAnimationPresets={isLoadingTextAnimationPresets}
                    isLoadingOverlayPresets={isLoadingOverlayPresets}
                    onSentencePatch={handleSentencePatch}
                    onSaveImageFilterPreset={handleSaveImageFilterPreset}
                    onUpdateImageFilterPreset={handleUpdateImageFilterPreset}
                    onDeleteImageFilterPreset={handleDeleteImageFilterPreset}
                    onSaveMotionEffectPreset={handleSaveMotionEffectPreset}
                    onUpdateMotionEffectPreset={handleUpdateMotionEffectPreset}
                    onDeleteMotionEffectPreset={handleDeleteMotionEffectPreset}
                    onSaveTextAnimationPreset={handleSaveTextAnimationPreset}
                    onUpdateTextAnimationPreset={handleUpdateTextAnimationPreset}
                    onDeleteTextAnimationPreset={handleDeleteTextAnimationPreset}
                    onSaveOverlayPreset={saveOverlayPresetRequest}
                    onDeleteOverlayPreset={handleDeleteOverlayPreset}
                    onGenerateSingleImageLookWithAi={handleGenerateSingleImageLookWithAi}
                    onGenerateSingleImageMotionWithAi={handleGenerateSingleImageMotionWithAi}
                    onSentenceVisualEffectChange={handleSentenceVisualEffectChange}
                    onSentenceImageMotionEffectChange={
                      handleSentenceImageMotionEffectChange
                    }
                    onSentenceImageMotionSpeedChange={
                      handleSentenceImageMotionSpeedChange
                    }
                    onTransitionToNextChange={handleTransitionToNextChange}
                    onOpenTransitionSoundEditor={handleOpenTransitionSoundEditor}
                    timelineVoiceTrack={timelineVoiceTrack}
                    onOpenTimelineVoiceEditor={() => setIsVoiceOverEditorOpen(true)}
                    onOpenSentenceVoiceEditor={handleOpenTimelineSentenceVoiceEditor}
                    timelineSoundtrack={timelineBackgroundSoundtrack}
                    onOpenTimelineSoundtrackEditor={handleOpenTimelineBackgroundSoundtrackEditor}
                    onInsertEmptySentenceAfter={handleInsertEmptySentenceAfter}
                    onSentenceImageUpload={handleSentenceImageUpload}
                    onSentenceVideoUpload={handleSentenceVideoUpload}
                    onAddSentenceImageSlot={handleAddSentenceImageSlot}
                    onRemoveSentenceImage={removeSentenceImage}
                    onSentenceFrameImageUpload={handleSentenceFrameImageUpload}
                    onRemoveSentenceFrameImage={removeSentenceFrameImage}
                    onSentenceMediaModeChange={handleSentenceMediaModeChange}
                    onGenerateSentenceFrameImage={handleGenerateSentenceFrameImage}
                    onGenerateSentenceVideo={handleGenerateSentenceVideo}
                    onRemoveSentenceGeneratedVideoForMode={handleRemoveSentenceGeneratedVideoForMode}
                    onSentenceVideoGenerationModeChange={
                      handleSentenceVideoGenerationModeChange
                    }
                    onSentenceVideoPromptChange={handleSentenceVideoPromptChange}
                    onGenerateSentenceVideoPrompt={handleGenerateSentenceVideoPromptWithAi}
                    isGeneratingVideoPromptBySentenceId={isGeneratingVideoPromptBySentenceId}

                    onOpenSentenceSoundEffectsLibrary={handleOpenSentenceSoundEffectsLibrary}
                    onSentenceSoundEffectsChange={handleSentenceSoundEffectsChange}
                    onSentenceAlignSoundEffectsToSceneEndChange={
                      handleSentenceAlignSoundEffectsToSceneEndChange
                    }
                    onUploadSentenceSoundEffect={handleUploadSentenceSoundEffect}
                    isUploadingSentenceSfxBySentenceId={isUploadingSentenceSfxBySentenceId}
                    onSaveSentenceSoundEffectsMix={handleSaveSentenceSoundEffectsMix}
                    isSavingSentenceSfxMixBySentenceId={isSavingSentenceSfxMixBySentenceId}
                    onSentenceReferenceImageUpload={
                      handleSentenceReferenceImageUpload
                    }
                    onRemoveSentenceReferenceImage={
                      handleRemoveSentenceReferenceImage
                    }
                    isGeneratingVideoBySentenceId={isGeneratingVideoBySentenceId}
                    setIsGeneratingVideoBySentenceId={setIsGeneratingVideoBySentenceId}
                    onDeleteSentence={handleDeleteSentence}
                    onGenerateSentenceImage={handleGenerateSentenceImage}
                    onGenerateSentenceReferenceImage={handleGenerateSentenceReferenceImage}
                    onGenerateAllImages={handleGenerateAllSentenceImages}
                    isGeneratingAllImages={isGeneratingAllImages}
                    onGenerateBulkFeelingCues={handleGenerateBulkFeelingCues}
                    isApplyingBulkFeelingCues={isApplyingBulkFeelingCues}
                    onGenerateBulkLookEffects={() => handleOpenBulkAiEffects('look')}
                    isApplyingBulkLookEffects={isApplyingBulkAiEffect === 'look'}
                    onOpenBulkLookPresetModal={() => handleOpenBulkManualEffectModal('look')}
                    isApplyingBulkLookPreset={isApplyingManualBulkEffect === 'look'}
                    onResetBulkLookEffects={handleResetBulkLookEffects}
                    onGenerateBulkMotionEffects={() => handleOpenBulkAiEffects('motion')}
                    isApplyingBulkMotionEffects={isApplyingBulkAiEffect === 'motion'}
                    onOpenBulkMotionPresetModal={() => handleOpenBulkManualEffectModal('motion')}
                    isApplyingBulkMotionPreset={isApplyingManualBulkEffect === 'motion'}
                    onResetBulkMotionEffects={handleResetBulkMotionEffects}
                    isSavingSceneSequence={isSavingSavedSequence}
                    isApplyingSavedSequence={isApplyingSavedSequence}
                    onOpenSaveSceneSequence={() => {
                      setSavedSequenceSaveModalVersion((prev) => prev + 1);
                      setIsSavedSequenceSaveModalOpen(true);
                    }}
                    onOpenLoadSceneSequence={() => setIsSavedSequenceLibraryOpen(true)}
                    onSentenceTextChange={handleSentenceTextChange}
                    onMergeSentenceIntoPrevious={handleMergeSentenceIntoPrevious}
                    onMergeSentenceIntoNext={handleMergeSentenceIntoNext}
                    onSaveSentenceImage={handleSaveSentenceImage}
                    onSelectFromLibrary={handleSelectFromLibrary}
                    onSelectVideoFromLibrary={handleSelectVideoFromLibrary}
                    onSaveSentenceVideoToLibrary={handleSaveSentenceVideoToLibrary}
                    isSavingSentenceVideoLibraryBySentenceId={isSavingSentenceVideoLibraryById}
                    onAddSuspenseScene={handleAddSuspenseScene}
                    onGenerateTestVideo={handleGenerateTestVideo}
                    canUseCurrentTestVoiceSettings={canUseCurrentTestVoiceSettings}
                    testVideoJobStatus={testVideoJobStatus}
                    testVideoJobError={testVideoJobError}
                    testVideoUrl={testVideoUrl}
                    onCloseTestVideoModal={handleCloseTestVideoModal}
                    scriptStyle={scriptStyle}
                    scriptTechnique={scriptTechnique}
                    scriptModel={scriptModel}
                    systemPrompt={systemPrompt}
                    apiUrl={API_URL}
                  />

                  <VoiceOverSection
                    script={script}
                    voiceOver={voiceOver}
                    voicePreviewUrl={voiceOverPreviewUrl}
                    isHydratingVoiceOver={isHydratingVoiceOver}
                    voiceDuration={voiceDuration}
                    voiceError={voiceError}
                    isGeneratingVoice={isGeneratingVoice}
                    voiceGenerationProgress={voiceGenerationProgress}
                    isPreviewingVoice={isPreviewingVoice}
                    isSavingVoice={isSavingVoice}
                    savedVoiceId={savedVoiceId}
                    voiceProvider={voiceProvider}
                    voiceGenerationMode={voiceGenerationMode}
                    elevenLabsAutoGenerationStrategy={
                      elevenLabsAutoGenerationStrategy
                    }
                    onVoiceProviderChange={(p) => {
                      setVoiceProvider(p);
                    }}
                    onVoiceGenerationModeChange={setVoiceGenerationMode}
                    onElevenLabsAutoGenerationStrategyChange={
                      setElevenLabsAutoGenerationStrategy
                    }
                    styleInstructions={
                      voiceProvider === 'google' ? aiStudioStyleInstructions : ''
                    }
                    onStyleInstructionsChange={(value) => {
                      setAiStudioStyleInstructions(value);
                    }}
                    voices={voices}
                    isLoadingVoices={isLoadingVoices}
                    voicesError={voicesError}
                    selectedVoiceId={selectedVoiceId}
                    onSelectVoice={handleSelectVoice}
                    onRefreshVoices={fetchVoices}
                    onSetFavoriteVoice={handleSetFavoriteVoice}
                    isSettingFavoriteVoice={isSettingFavoriteVoice}
                    onVoiceUpload={handleVoiceUpload}
                    onGenerateVoice={handleGenerateVoice}
                    onPreviewVoice={handlePreviewVoice}
                    onRemoveVoice={removeVoice}
                    onSaveVoice={handleSaveVoice}
                    onOpenLibrary={handleOpenVoiceLibrary}
                    onOpenVoiceEditor={
                      String(voiceOverPreviewUrl ?? '').trim()
                        ? () => setIsVoiceOverEditorOpen(true)
                        : undefined
                    }
                    onOpenElevenLabsSettings={() => setIsElevenLabsSettingsModalOpen(true)}
                    canManageVoiceChunks={voiceGenerationMode !== 'perSentence' && voiceOverChunks.length > 1}
                    onOpenVoiceChunkManager={() => {
                      setIsSentenceVoiceManagerOpen(false);
                      setIsChunkVoiceManagerOpen(true);
                    }}
                    canManageSentenceVoices={sentences.some((sentence) => String(sentence.text ?? '').trim())}
                    onOpenSentenceVoiceManager={() => {
                      setIsChunkVoiceManagerOpen(false);
                      setIsSentenceVoiceManagerOpen(true);

                      if (
                        !String(voiceOverPreviewUrl ?? '').trim() &&
                        sentences.some((sentence) => hasSentenceVoiceOver(sentence))
                      ) {
                        void rebuildMergedSentenceVoiceOverPreview(sentences).catch((error) => {
                          console.error('Failed to prepare sentence voice manager preview', error);
                          showToast('Failed to prepare the merged voice-over preview.', 'error');
                        });
                      }
                    }}
                  />
                </Accordion>
                <RenderSettingsSection
                  isShort={isShortsTabActive ? true : isShort}
                  isLongForm={isLongForm}
                  onIsShortChange={isShortsTabActive ? (() => { }) : setIsShort}
                  disableIsShort={isLongForm || isShortsTabActive}
                  addBackgroundSoundtrack={addBackgroundSoundtrack}
                  onAddBackgroundSoundtrackChange={(value) => {
                    setAddBackgroundSoundtrack(value);
                    if (!value) {
                      setBackgroundSoundtrackEditTargetId(null);
                    }
                  }}
                  useLowerFps={useLowerFps}
                  onUseLowerFpsChange={setUseLowerFps}
                  useLowerResolution={useLowerResolution}
                  onUseLowerResolutionChange={setUseLowerResolution}
                  addSubtitles={addSubtitles}
                  onAddSubtitlesChange={setAddSubtitles}
                  enableLongFormSubscribeOverlay={effectiveEnableLongFormSubscribeOverlay}
                  onEnableLongFormSubscribeOverlayChange={setEnableLongFormSubscribeOverlay}
                />

                {addBackgroundSoundtrack ? (
                  <BackgroundSoundtrackSection
                    isGenerating={isGenerating}
                    isGeneratingVoice={isGeneratingVoice}
                    videoJobStatus={videoJobStatus}
                    voiceOver={voiceOver}
                    voicePreviewUrl={voiceOverPreviewUrl}
                    backgroundSoundtracks={backgroundSoundtracks}
                    selectedBackgroundSoundtrackValue={selectedBackgroundSoundtrackValue}
                    selectedBackgroundSoundtrackPreviewUrl={resolveBackgroundSoundtrackPreviewUrl()}
                    selectedBackgroundSoundtrackRequiresMaterialization={selectedBackgroundSoundtrackRequiresMaterialization}
                    isMaterializingSelectedBackgroundSoundtrack={isMaterializingBackgroundSoundtrack}
                    backgroundSoundtrackVolumePercent={backgroundSoundtrackVolumePercent}
                    onBackgroundSoundtrackVolumePercentChange={setBackgroundSoundtrackVolumePercent}
                    onSelectedBackgroundSoundtrackValueChange={(value: string) => {
                      setSelectedBackgroundSoundtrackValue(value);

                      if (value !== '__oneoff__') return;
                      if (oneOffBackgroundSoundtrackUrl) return;
                      setSelectedBackgroundSoundtrackValue('__default__');
                    }}
                    hasOneOffBackgroundSoundtrack={Boolean(oneOffBackgroundSoundtrackUrl)}
                    oneOffBackgroundSoundtrackUrl={oneOffBackgroundSoundtrackUrl}
                    onToast={showToast}
                    onSetFavoriteBackgroundSoundtrack={handleSetFavoriteBackgroundSoundtrack}
                    isSettingFavoriteBackgroundSoundtrack={isSettingFavoriteBackgroundSoundtrack}
                    onSaveBackgroundSoundtrackVolume={handleSaveBackgroundSoundtrackVolume}
                    isSavingBackgroundSoundtrackVolume={isSavingBackgroundSoundtrackVolume}
                    onDeleteBackgroundSoundtrack={handleDeleteBackgroundSoundtrack}
                    isDeletingBackgroundSoundtrack={isDeletingBackgroundSoundtrack}
                    onOpenBackgroundSoundtrackEditor={handleOpenBackgroundSoundtrackEditor}
                    onUploadBackgroundSoundtrackUseOnce={handleUploadBackgroundSoundtrackUseOnce}
                    onUploadBackgroundSoundtrackAddToLibrary={handleUploadBackgroundSoundtrackAddToLibrary}
                    isUploadingBackgroundSoundtrack={isUploadingBackgroundSoundtrack}
                  />
                ) : null}

                {/* Generate Button */}
                <GenerateVideoButton
                  isGenerating={isGenerating}
                  videoJobStatus={videoJobStatus}
                  script={script}
                  onGenerate={handleGenerate}
                  onUploadVideo={handleUploadFinalVideo}
                  isUploadingVideo={isUploadingVideo}
                  user={user}
                />
                {addBackgroundSoundtrack && backgroundSoundtrackEditTarget ? (
                  <SoundEffectEditModal
                    isOpen
                    title="Edit background soundtrack"
                    audioUrl={backgroundSoundtrackEditTarget.url}
                    companionAudioUrl={voiceOverPreviewUrl}
                    companionAudioLabel="voice-over"
                    companionAudioDefaultEnabled={Boolean(voiceOverPreviewUrl)}
                    initialName={backgroundSoundtrackEditTarget.title}
                    initialVolumePercent={backgroundSoundtrackEditTarget.volume_percent ?? 100}
                    initialAudioSettings={backgroundSoundtrackEditTarget.audio_settings}
                    isApplying={isApplyingBackgroundSoundtrackEdit}
                    isSaving={isSavingBackgroundSoundtrackEdit}
                    isSavingAsPreset={isSavingBackgroundSoundtrackPreset}
                    onClose={() => {
                      if (isApplyingBackgroundSoundtrackEdit || isSavingBackgroundSoundtrackEdit || isSavingBackgroundSoundtrackPreset) {
                        return;
                      }
                      setBackgroundSoundtrackEditTargetId(null);
                    }}
                    onApply={applyBackgroundSoundtrackEditsLocally}
                    onSave={saveBackgroundSoundtrackEdits}
                    onSaveAsPreset={saveBackgroundSoundtrackAsPreset}
                  />
                ) : null}
                {isVoiceOverEditorOpen && voiceOverPreviewUrl ? (
                  <SoundEffectEditModal
                    isOpen
                    title="Edit voice-over"
                    audioUrl={voiceOverPreviewUrl}
                    companionAudioUrl={resolveBackgroundSoundtrackPreviewUrl()}
                    companionAudioLabel="soundtrack"
                    companionAudioDefaultEnabled={Boolean(resolveBackgroundSoundtrackPreviewUrl())}
                    companionPreviewIcon="music"
                    initialName={stripFileExtension(voiceOver?.name ?? 'voice-over')}
                    initialVolumePercent={100}
                    isApplying={isApplyingVoiceOverEdit}
                    isSaving={isSavingVoiceOverEdit}
                    showSaveAsPreset={false}
                    onClose={() => {
                      if (isApplyingVoiceOverEdit || isSavingVoiceOverEdit) {
                        return;
                      }
                      setIsVoiceOverEditorOpen(false);
                    }}
                    onApply={applyVoiceOverEditsLocally}
                    onSave={saveVoiceOverEditsToDraft}
                  />
                ) : null}
                {activeSentenceVoiceEditorTarget ? (
                  <SoundEffectEditModal
                    isOpen
                    title={`Edit sentence ${activeSentenceVoiceEditorTarget.sentenceIndex + 1} voice`}
                    audioUrl={activeSentenceVoiceEditorTarget.sentence.voiceOverUrl}
                    initialName={`sentence-${activeSentenceVoiceEditorTarget.sentenceIndex + 1}-voice-over`}
                    initialVolumePercent={100}
                    isApplying={isApplyingSentenceVoiceEdit}
                    showSaveButton={false}
                    showSaveAsPreset={false}
                    showEditPresetsSection={false}
                    actionError={sentenceVoiceEditActionError}
                    onClose={() => {
                      if (isApplyingSentenceVoiceEdit) {
                        return;
                      }
                      setSentenceVoiceEditActionError(null);
                      setActiveSentenceVoiceEditorSentenceId(null);
                    }}
                    onApply={applySentenceVoiceEditLocally}
                    onSave={async () => undefined}
                  />
                ) : null}
                {activeChunkVoiceEditorTarget ? (
                  <SoundEffectEditModal
                    isOpen
                    title={`Edit chunk ${activeChunkVoiceEditorTarget.chunk.index + 1} voice`}
                    audioUrl={activeChunkVoiceEditorTarget.chunk.url}
                    initialName={`chunk-${activeChunkVoiceEditorTarget.chunk.index + 1}-voice-over`}
                    initialVolumePercent={100}
                    isApplying={isApplyingChunkVoiceEdit}
                    showSaveButton={false}
                    showSaveAsPreset={false}
                    showEditPresetsSection={false}
                    actionError={chunkVoiceEditActionError}
                    onClose={() => {
                      if (isApplyingChunkVoiceEdit) {
                        return;
                      }
                      setChunkVoiceEditActionError(null);
                      setActiveChunkVoiceEditorId(null);
                    }}
                    onApply={applyChunkVoiceEditLocally}
                    onSave={async () => undefined}
                  />
                ) : null}
                {isElevenLabsSettingsModalOpen ? (
                  <ElevenLabsVoiceSettingsModal
                    voiceName={selectedVoiceOption?.name ?? null}
                    initialModel={elevenLabsGlobalModel}
                    initialSettings={elevenLabsGlobalSettings}
                    onClose={() => setIsElevenLabsSettingsModalOpen(false)}
                    onSave={({ model, settings }) => {
                      setElevenLabsGlobalModel(model);
                      setElevenLabsGlobalSettings(settings);
                      setIsElevenLabsSettingsModalOpen(false);
                      showToast('ElevenLabs defaults updated.', 'success');
                    }}
                  />
                ) : null}
                <SentenceVoiceOverManagerModal
                  isOpen={isSentenceVoiceManagerOpen}
                  title="Sentence Voice Overs"
                  description="Regenerate a single sentence, preview it, then replace only when it sounds right."
                  segmentNoun="sentence"
                  segments={sentenceVoiceManagerSegments}
                  voiceProvider={voiceProvider}
                  fullVoiceOverPreviewUrl={voiceOverPreviewUrl}
                  soundtrackPreviewUrl={resolveBackgroundSoundtrackPreviewUrl()}
                  globalElevenLabsSettings={elevenLabsGlobalSettings}
                  globalElevenLabsModel={elevenLabsGlobalModel}
                  isGeneratingStyleById={isGeneratingSentenceVoiceStyleById}
                  isRegeneratingVoiceById={isRegeneratingSentenceVoiceById}
                  isApplyingCandidateById={isApplyingSentenceVoiceCandidateById}
                  voiceCandidateById={Object.fromEntries(
                    Object.entries(sentenceVoiceCandidateById).map(([key, value]) => [
                      key,
                      value
                        ? {
                          previewUrl: value.previewUrl,
                          durationSeconds: value.durationSeconds,
                          provider: value.provider,
                          voiceName: value.voiceName,
                        }
                        : null,
                    ]),
                  )}
                  isGeneratingAllVoices={isGeneratingAllSentenceVoices}
                  canDownloadAllVoices={sentenceVoiceManagerSegments.some((segment) =>
                    Boolean(String(segment.audioUrl ?? '').trim()),
                  )}
                  onClose={() => setIsSentenceVoiceManagerOpen(false)}
                  onOpenFullVoiceEditor={() => setIsVoiceOverEditorOpen(true)}
                  onGenerateAllVoices={() => {
                    void handleGenerateAllSentenceVoices();
                  }}
                  onDownloadAllVoices={() => {
                    void handleDownloadAllSentenceVoices();
                  }}
                  onDownloadSegmentVoice={(sentenceId, source) => {
                    void handleDownloadSentenceVoice(sentenceId, source);
                  }}
                  onOpenSegmentVoiceEditor={(sentenceId) => {
                    if (sentenceVoiceCandidateById[sentenceId]) {
                      showAlert(
                        'Resolve the pending preview for this sentence before editing its committed voice.',
                        { type: 'warning' },
                      );
                      return;
                    }

                    const sentence = sentences.find((item) => item.id === sentenceId);
                    if (!sentence || !hasSentenceVoiceOver(sentence)) {
                      showAlert('No committed sentence voice is available to edit.', {
                        type: 'warning',
                      });
                      return;
                    }

                    setSentenceVoiceEditActionError(null);
                    setActiveSentenceVoiceEditorSentenceId(sentenceId);
                  }}
                  onSegmentStyleChange={(sentenceId, value) => {
                    patchSentenceById(sentenceId, {
                      voiceOverStyleInstructions: value,
                    });
                  }}
                  onSegmentElevenLabsSettingsChange={(sentenceId, settings) => {
                    patchSentenceById(sentenceId, {
                      elevenLabsSettings: settings,
                    });
                  }}
                  onSegmentElevenLabsModelChange={(sentenceId, model) => {
                    patchSentenceById(sentenceId, {
                      elevenLabsModel: model,
                    });
                  }}
                  onGenerateSegmentStyle={handleGenerateSentenceVoiceStyle}
                  onRegenerateSegmentVoice={handleRegenerateSentenceVoice}
                  onApplyCandidate={handleApplySentenceVoiceCandidate}
                  onCancelCandidate={handleCancelSentenceVoiceCandidate}
                />
                <SentenceVoiceOverManagerModal
                  isOpen={isChunkVoiceManagerOpen}
                  title="Long-Form Voice Chunks"
                  description="Treat each generated chunk like a sentence voice: regenerate it, preview it, replace it, or edit only that chunk."
                  segmentNoun="chunk"
                  segments={chunkVoiceManagerSegments}
                  voiceProvider={voiceProvider}
                  fullVoiceOverPreviewUrl={voiceOverPreviewUrl}
                  soundtrackPreviewUrl={resolveBackgroundSoundtrackPreviewUrl()}
                  globalElevenLabsSettings={elevenLabsGlobalSettings}
                  globalElevenLabsModel={elevenLabsGlobalModel}
                  isGeneratingStyleById={isGeneratingChunkVoiceStyleById}
                  isRegeneratingVoiceById={isRegeneratingChunkVoiceById}
                  isApplyingCandidateById={isApplyingChunkVoiceCandidateById}
                  voiceCandidateById={Object.fromEntries(
                    Object.entries(chunkVoiceCandidateById).map(([key, value]) => [
                      key,
                      value
                        ? {
                          previewUrl: value.previewUrl,
                          durationSeconds: value.durationSeconds,
                          provider: value.provider,
                          voiceName: value.voiceName,
                        }
                        : null,
                    ]),
                  )}
                  onClose={() => setIsChunkVoiceManagerOpen(false)}
                  onOpenFullVoiceEditor={() => setIsVoiceOverEditorOpen(true)}
                  onOpenSegmentVoiceEditor={(chunkId) => {
                    if (chunkVoiceCandidateById[chunkId]) {
                      showAlert(
                        'Resolve the pending preview for this chunk before editing its committed voice.',
                        { type: 'warning' },
                      );
                      return;
                    }

                    const chunk = voiceOverChunks.find(
                      (item) => String(item.index) === chunkId,
                    );
                    if (!chunk || !hasVoiceOverChunkAudio(chunk)) {
                      showAlert('No committed chunk voice is available to edit.', {
                        type: 'warning',
                      });
                      return;
                    }

                    setChunkVoiceEditActionError(null);
                    setActiveChunkVoiceEditorId(chunkId);
                  }}
                  onSegmentStyleChange={(chunkId, value) => {
                    setVoiceOverChunks((prev) =>
                      prev.map((chunk) =>
                        String(chunk.index) === chunkId
                          ? { ...chunk, styleInstructions: value }
                          : chunk,
                      ),
                    );
                  }}
                  onSegmentElevenLabsSettingsChange={(chunkId, settings) => {
                    setVoiceOverChunks((prev) =>
                      prev.map((chunk) =>
                        String(chunk.index) === chunkId
                          ? {
                            ...chunk,
                            elevenLabsSettings: normalizeOptionalElevenLabsVoiceSettings(
                              settings,
                            ),
                          }
                          : chunk,
                      ),
                    );
                  }}
                  onSegmentElevenLabsModelChange={() => undefined}
                  onGenerateSegmentStyle={handleGenerateChunkVoiceStyle}
                  onRegenerateSegmentVoice={handleRegenerateChunkVoice}
                  onApplyCandidate={handleApplyChunkVoiceCandidate}
                  onCancelCandidate={handleCancelChunkVoiceCandidate}
                />
              </div>

              {/* Video job status & preview */}
              <div ref={videoSectionRef}>
                <VideoJobSection
                  videoJobId={videoJobId}
                  videoJobStatus={videoJobStatus}
                  videoJobError={videoJobError}
                  videoUrl={videoUrl}
                  isShortVideo={effectiveIsShort}
                  scriptId={activeScriptId}
                  scriptTextForUpload={sentences
                    .map((s) => String(s?.text ?? '').trim())
                    .filter(Boolean)
                    .join(' ')
                    .trim()}
                  scriptCharacters={scriptCharacters}
                  onRetry={handleGenerate}
                />
              </div>

              {/* Debug: Sync ElevenLabs voices into backend DB */}
              {/* <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Debug: Sync ElevenLabs Voices</p>
                <button
                  type="button"
                  onClick={handleSyncElevenLabsVoices}
                  disabled={isSyncingVoices}
                  className="inline-flex items-center rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSyncingVoices && (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            </div>
                  )}
                  {isSyncingVoices ? 'Syncing...' : 'Sync Voices Now'}
                </button>
              </div>
              {syncVoicesResult && (
                <p className="text-xs text-gray-600">{syncVoicesResult}</p>
              )}
            </div> */}
            </div>
          </div>
        </div>
      </div>

      <SavedSequenceSaveModal
        key={savedSequenceSaveModalVersion}
        isOpen={isSavedSequenceSaveModalOpen}
        isSaving={isSavingSavedSequence}
        onClose={() => {
          if (isSavingSavedSequence) return;
          setIsSavedSequenceSaveModalOpen(false);
        }}
        onSave={handleSaveSceneSequence}
      />

      <GenerateModalsHost
        isImageLibraryOpen={isLibraryModalOpen}
        libraryTarget={libraryTarget}
        videoLibraryTargetId={videoLibraryTargetId}
        scriptContext={script}
        sentences={sentences}
        onCloseImageLibrary={() => {
          setIsLibraryModalOpen(false);
          setLibraryTarget(null);
        }}
        onSelectImage={handleLibraryImageSelect}
        isVoiceLibraryOpen={isVoiceLibraryOpen}
        selectedVoiceUrl={voiceLibraryUrl}
        onCloseVoiceLibrary={() => {
          setIsVoiceLibraryOpen(false);
        }}
        onSelectVoice={handleVoiceLibrarySelect}

        isVideoLibraryOpen={isVideoLibraryOpen}
        selectedVideoUrl={
          videoLibraryTargetId === null
            ? null
            : sentences.find((sentence) => sentence.id === videoLibraryTargetId)?.videoUrl ?? null
        }
        onCloseVideoLibrary={() => {
          setIsVideoLibraryOpen(false);
          setVideoLibraryTargetId(null);
        }}
        onSelectVideo={handleLibraryVideoSelect}
        isScriptLibraryOpen={isScriptLibraryOpen}
        onCloseScriptLibrary={() => setIsScriptLibraryOpen(false)}
        onSelectScript={handleSelectScriptFromLibrary}
        isScriptReferencesOpen={isScriptReferencesOpen}
        onCloseScriptReferences={() => setIsScriptReferencesOpen(false)}
        initialSelectedReferenceScripts={referenceScripts.map((s) => ({
          id: s.id,
          title: s.title,
          script: s.script,
        }))}
        onApplyReferenceScripts={handleApplyReferenceScripts}
        isSavedSequenceLibraryOpen={isSavedSequenceLibraryOpen}
        isApplyingSavedSequence={isApplyingSavedSequence}
        onCloseSavedSequenceLibrary={() => setIsSavedSequenceLibraryOpen(false)}
        onApplySavedSequence={handleApplySavedSequence}
        onToast={showToast}

        isSoundEffectsLibraryOpen={isSoundEffectsLibraryOpen}
        onCloseSoundEffectsLibrary={() => {
          setIsSoundEffectsLibraryOpen(false);
          setSoundEffectsLibraryTargetId(null);
        }}
        onApplySoundEffects={handleApplySentenceSoundEffectsFromLibrary}
        isTransitionSoundModalOpen={transitionSoundEditorTargetId !== null}
        transitionSoundTransitionType={
          transitionSoundEditorTargetId === null
            ? null
            : sentences.find((sentence) => sentence.id === transitionSoundEditorTargetId)?.transitionToNext ?? null
        }
        transitionSoundItems={transitionSoundDraftItems}
        onCloseTransitionSoundModal={handleCloseTransitionSoundEditor}
        onChangeTransitionSoundDraft={setTransitionSoundDraftItems}
        onApplyTransitionSound={handleApplyTransitionSoundEditor}
        onSaveTransitionSoundReusable={async () => {
          if (transitionSoundEditorTargetId === null) return;

          const savedItems = await handleSaveSentenceTransitionSound(
            transitionSoundEditorTargetId,
            transitionSoundDraftItems,
          );
          if (!savedItems) return;

          updateSentenceById(transitionSoundEditorTargetId, (sentence) => ({
            ...sentence,
            transitionSoundEffects: savedItems,
          }));
          setTransitionSoundDraftItems(savedItems);
          handleCloseTransitionSoundEditor();
        }}
        isSavingTransitionSoundReusable={
          transitionSoundEditorTargetId === null
            ? false
            : Boolean(
              isSavingTransitionSoundBySentenceId[
              transitionSoundEditorTargetId
              ]
            )
        }
        alertState={alertState}
        onCloseAlert={closeAlert}
      />

      <TranslateScriptModal
        isOpen={isTranslateModalOpen}
        onClose={() => {
          if (isTranslatingScript) return;
          setIsTranslateModalOpen(false);
        }}
        targetLanguage={translateTargetLanguage}
        onTargetLanguageChange={handleTranslateTargetLanguageChange}
        method={translateMethod}
        onMethodChange={setTranslateMethod}
        llmModel={scriptModel}
        onTranslateOnly={handleTranslateOnly}
        onTranslateAndSave={handleTranslateAndSave}
        isLoading={isTranslatingScript}
        loadingAction={translateLoadingAction}
      />

      <BulkSceneEffectPresetModal
        isOpen={Boolean(bulkManualEffectModal)}
        kind={bulkManualEffectModal?.kind ?? 'look'}
        selectedValue={
          bulkManualEffectModal?.selectedValue ?? getDefaultBulkManualEffectValue('look')
        }
        options={
          bulkManualEffectModal?.kind === 'motion'
            ? bulkMotionPresetOptions
            : bulkLookPresetOptions
        }
        selectableSceneCount={
          bulkManualEffectModal
            ? getBulkManualSelectableSentenceIds(bulkManualEffectModal.kind).length
            : 0
        }
        onClose={() => {
          if (isApplyingManualBulkEffect) return;
          setBulkManualEffectModal(null);
        }}
        onSelectedValueChange={(value) => {
          setBulkManualEffectModal((prev) => {
            if (!prev) return prev;
            return { ...prev, selectedValue: value };
          });
        }}
        onApplyAllScenes={handleApplyManualBulkEffectToAllScenes}
        onApplyCertainScenes={handleOpenBulkManualScenePicker}
        isLoading={Boolean(isApplyingManualBulkEffect)}
      />

      <BulkSceneEffectScenePickerModal
        key={
          bulkManualEffectScenePicker
            ? `${bulkManualEffectScenePicker.kind}:${bulkManualEffectScenePicker.selectedSentenceIds.join(',')}`
            : 'bulk-manual-scene-picker-closed'
        }
        isOpen={Boolean(bulkManualEffectScenePicker)}
        kind={bulkManualEffectScenePicker?.kind ?? 'look'}
        scenes={
          bulkManualEffectScenePicker
            ? getBulkManualEffectSceneItems(bulkManualEffectScenePicker.kind)
            : []
        }
        selectedSentenceIds={bulkManualEffectScenePicker?.selectedSentenceIds ?? []}
        onClose={() => {
          if (isApplyingManualBulkEffect) return;
          setBulkManualEffectScenePicker(null);
        }}
        onApply={handleApplyManualBulkEffectToSelectedScenes}
        isLoading={Boolean(isApplyingManualBulkEffect)}
      />

      {/* Generate All Images Confirmation */}
      <AlertDialog
        isOpen={Boolean(bulkAiEffectsConfirm)}
        onClose={() => {
          if (isApplyingBulkAiEffect) return;
          setBulkAiEffectsConfirm(null);
        }}
        onCancel={() => {
          if (!bulkAiEffectsConfirm || isApplyingBulkAiEffect) return;

          if (
            bulkAiEffectsConfirm.existingCount > 0 &&
            bulkAiEffectsConfirm.uneditedIndices.length > 0
          ) {
            const { kind, uneditedIndices } = bulkAiEffectsConfirm;
            setBulkAiEffectsConfirm(null);
            if (kind === 'look') {
              void runBulkAiLookEffects(uneditedIndices);
            } else {
              void runBulkAiMotionEffects(uneditedIndices);
            }
            return;
          }

          setBulkAiEffectsConfirm(null);
        }}
        onConfirm={() => {
          if (!bulkAiEffectsConfirm || isApplyingBulkAiEffect) return;
          const { kind, eligibleIndices } = bulkAiEffectsConfirm;
          setBulkAiEffectsConfirm(null);
          if (kind === 'look') {
            void runBulkAiLookEffects(eligibleIndices);
          } else {
            void runBulkAiMotionEffects(eligibleIndices);
          }
        }}
        title={
          bulkAiEffectsConfirm?.kind === 'look'
            ? bulkAiEffectsConfirm?.existingCount === 0
              ? 'Apply AI look to eligible images?'
              : bulkAiEffectsConfirm?.uneditedIndices.length
                ? 'Apply AI look to all eligible images?'
                : 'Replace all custom look settings?'
            : bulkAiEffectsConfirm?.existingCount === 0
              ? 'Apply AI motion to eligible images?'
              : bulkAiEffectsConfirm?.uneditedIndices.length
                ? 'Apply AI motion to all eligible images?'
                : 'Replace all custom motion settings?'
        }
        description={
          bulkAiEffectsConfirm?.kind === 'look'
            ? bulkAiEffectsConfirm?.existingCount === 0
              ? `AI Look will generate random custom look settings for all eligible images in the editor (${bulkAiEffectsConfirm?.eligibleIndices.length ?? 0}). Do you want to continue?`
              : bulkAiEffectsConfirm?.uneditedIndices.length
                ? `Some eligible images already have custom look settings (${bulkAiEffectsConfirm?.existingCount ?? 0}). Apply AI look to every eligible image, or only to the ones without custom look (${bulkAiEffectsConfirm?.uneditedCount ?? 0})?`
                : 'Every eligible image already has custom look settings. This will replace all of them in the editor.'
            : bulkAiEffectsConfirm?.existingCount === 0
              ? `AI Motion will generate random custom motion settings for all eligible images in the editor (${bulkAiEffectsConfirm?.eligibleIndices.length ?? 0}). It will keep each image motion speed unchanged. Do you want to continue?`
              : bulkAiEffectsConfirm?.uneditedIndices.length
                ? `Some eligible images already have custom motion settings (${bulkAiEffectsConfirm?.existingCount ?? 0}). Apply AI motion to every eligible image, or only to the ones without custom motion (${bulkAiEffectsConfirm?.uneditedCount ?? 0})?`
                : 'Every eligible image already has custom motion settings. This will replace all of them in the editor.'
        }
        confirmText="Apply to all eligible images"
        cancelText={
          bulkAiEffectsConfirm &&
            bulkAiEffectsConfirm.existingCount > 0 &&
            bulkAiEffectsConfirm.uneditedIndices.length > 0
            ? bulkAiEffectsConfirm?.kind === 'look'
              ? 'Apply only to images without custom look'
              : 'Apply only to images without custom motion'
            : 'Cancel'
        }
        variant="info"
        isLoading={Boolean(isApplyingBulkAiEffect)}
      />

      <AlertDialog
        isOpen={Boolean(generateAllImagesConfirm)}
        onClose={() => setGenerateAllImagesConfirm(null)}
        onCancel={() => {
          if (!generateAllImagesConfirm) return;

          if (generateAllImagesConfirm.kind === 'some') {
            const indices = generateAllImagesConfirm.missingIndices;
            setGenerateAllImagesConfirm(null);
            if (indices.length) {
              void (async () => {
                setIsGeneratingAllImages(true);
                try {
                  // eslint-disable-next-line no-restricted-syntax
                  for (const index of indices) {
                    // eslint-disable-next-line no-await-in-loop
                    await handleGenerateSentenceImage(index);
                  }
                } finally {
                  setIsGeneratingAllImages(false);
                }
              })();
            }
            return;
          }

          setGenerateAllImagesConfirm(null);
        }}
        onConfirm={() => {
          if (!generateAllImagesConfirm) return;
          const indices = generateAllImagesConfirm.eligibleIndices;
          setGenerateAllImagesConfirm(null);
          if (indices.length) {
            void (async () => {
              setIsGeneratingAllImages(true);
              try {
                // eslint-disable-next-line no-restricted-syntax
                for (const index of indices) {
                  // eslint-disable-next-line no-await-in-loop
                  await handleGenerateSentenceImage(index);
                }
              } finally {
                setIsGeneratingAllImages(false);
              }
            })();
          }
        }}
        title={
          generateAllImagesConfirm?.kind === 'all'
            ? 'Replace all sentence images?'
            : 'Replace existing sentence images?'
        }
        description={
          generateAllImagesConfirm?.kind === 'all'
            ? 'All sentences already have images. This will regenerate and overwrite every sentence image (except the subscribe sentence).'
            : `Some sentences already have images (${generateAllImagesConfirm?.existingCount ?? 0}). Do you want to replace them too, or only generate the missing ones (${generateAllImagesConfirm?.missingCount ?? 0})?`
        }
        confirmText={
          generateAllImagesConfirm?.kind === 'all' ? 'Replace all' : 'Replace all images'
        }
        cancelText={
          generateAllImagesConfirm?.kind === 'some' ? 'Generate missing only' : 'Cancel'
        }
        variant="warning"
      />

      <AlertDialog
        isOpen={Boolean(generateAllSentenceVoicesConfirm)}
        onClose={() => setGenerateAllSentenceVoicesConfirm(null)}
        onCancel={() => {
          if (!generateAllSentenceVoicesConfirm || isGeneratingAllSentenceVoices) return;

          if (generateAllSentenceVoicesConfirm.kind === 'some') {
            const sentenceIds = generateAllSentenceVoicesConfirm.missingSentenceIds;
            setGenerateAllSentenceVoicesConfirm(null);
            if (sentenceIds.length) {
              void runGenerateAllSentenceVoices(sentenceIds);
            }
            return;
          }

          setGenerateAllSentenceVoicesConfirm(null);
        }}
        onConfirm={() => {
          if (!generateAllSentenceVoicesConfirm || isGeneratingAllSentenceVoices) return;
          const sentenceIds = generateAllSentenceVoicesConfirm.eligibleSentenceIds;
          setGenerateAllSentenceVoicesConfirm(null);
          if (sentenceIds.length) {
            void runGenerateAllSentenceVoices(sentenceIds);
          }
        }}
        title={
          generateAllSentenceVoicesConfirm?.kind === 'all'
            ? 'Generate new previews for all sentence voices?'
            : 'Generate voices for all sentences or empty ones only?'
        }
        description={
          generateAllSentenceVoicesConfirm?.kind === 'all'
            ? 'All sentences already have voices. Generating again will create fresh preview voices for every sentence so you can replace the current clips selectively.'
            : `Some sentences already have voices (${generateAllSentenceVoicesConfirm?.existingCount ?? 0}). Generate fresh preview voices for those too, or only attach voices to the empty sentences (${generateAllSentenceVoicesConfirm?.missingCount ?? 0})?`
        }
        confirmText={
          generateAllSentenceVoicesConfirm?.kind === 'all'
            ? 'Generate all previews'
            : 'Generate for all sentences'
        }
        cancelText={
          generateAllSentenceVoicesConfirm?.kind === 'some'
            ? 'Generate empty only'
            : 'Cancel'
        }
        variant="info"
        isLoading={isGeneratingAllSentenceVoices}
      />

      <AlertDialog
        isOpen={isSilentRenderConfirmOpen}
        onClose={() => {
          if (isGenerating) return;
          setIsSilentRenderConfirmOpen(false);
        }}
        onCancel={() => {
          if (isGenerating) return;
          setIsSilentRenderConfirmOpen(false);
        }}
        onConfirm={() => {
          setIsSilentRenderConfirmOpen(false);
          void startVideoGeneration(true);
        }}
        title="Generate without a voice-over?"
        description="This render will continue without narration. Audio alignment will be skipped, and word-by-word subtitles will be disabled for this video."
        confirmText="Generate without voice-over"
        cancelText="Keep editing"
        variant="warning"
      />

    </div>
  );
}
