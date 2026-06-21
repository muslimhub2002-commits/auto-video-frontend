'use client';

import {
  Suspense,
  lazy,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Images,
  Scissors,
  Film,
  LayoutGrid,
  Loader2,
} from 'lucide-react';
import { AlertDialog } from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  KLING_IMAGE_TO_VIDEO_MODEL_OPTIONS,
  KLING_TEXT_TO_VIDEO_MODEL_OPTIONS,
} from '../_types/sentences';
import type {
  KlingVideoModel,
  SentenceItem,
  VideoProvider,
} from '../_types/sentences';
import type { TimelineDraftClip } from '../_types/timeline-editor';
import { useTimelineEditorDraft } from '../_hooks/useTimelineEditorDraft';
import { useSentenceEnhancement } from '../_hooks/useSentenceEnhancement';
import { useEnhanceImagePrompt } from '../_hooks/useEnhanceImagePrompt';
import { useImageModelOptions } from '../_hooks/useImageModelOptions';
import { LlmModelSelect } from './LlmModelSelect';
import { ImagePreviewOverlay } from './sentences/ImagePreviewOverlay';
import { ImageEffectsDetailModal } from './sentences/ImageEffectsDetailModal';
import { EnhanceWithPromptModal } from './sentences/EnhanceWithPromptModal';
import { EnhanceImagePromptModal } from './sentences/EnhanceImagePromptModal';
import { AddSuspenseSceneModal } from './sentences/AddSuspenseSceneModal';
import { GenerateTestVideoModal } from './sentences/GenerateTestVideoModal';
import { EmptyScenesState } from './sentences/EmptyScenesState';
import {
  getDefaultImageMotionSpeed,
  normalizeOverlaySettings,
} from './sentences/ImageEffectPreview';
import type { GenerateTestVideoRequest } from './sentences/test-video.types';
import type {
  ImageFilterPresetDto,
  ImageFilterSettings,
  ImageMotionSettings,
  MotionEffectPresetDto,
  OverlayPresetDto,
  OverlaySettings,
} from './sentences/ImageEffectPreview';
import type {
  TextAnimationPresetDto,
  TextAnimationSettings,
} from './sentences/TextAnimationPreview';
import {
  normalizeTextAnimationSettings,
  resolveTextAnimationEffectFromSettings,
  resolveTextAnimationText,
} from './sentences/TextAnimationPreview';
import { useManagedObjectUrl } from './sentences/useManagedObjectUrl';

const LazySceneEditorSection = lazy(() =>
  import('./sentences/SceneEditorSection').then((module) => ({
    default: module.SceneEditorSection,
  })),
);

const LazyTimelineEditorSection = lazy(() =>
  import('./sentences/TimelineEditorSection').then((module) => ({
    default: module.TimelineEditorSection,
  })),
);

type EditorMode = 'scene' | 'timeline';

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

type ShortsTabMeta = {
  label: string;
  count: number;
};

type TimelineSoundtrackSelection = {
  label: string;
  subtitle: string;
  volumePercent: number;
  canEdit: boolean;
};

type TimelineVoiceTrackSelection = {
  label: string;
  subtitle: string;
  durationSeconds: number;
  canEdit: boolean;
};

type TimelineDetailTab = 'visual' | 'motion' | 'text' | 'overlay';

type TimelineEffectModalState = {
  sentenceId: string;
  activeTab: TimelineDetailTab;
};

const KLING_MODEL_OPTIONS = Array.from(
  new Set([
    ...KLING_TEXT_TO_VIDEO_MODEL_OPTIONS,
    ...KLING_IMAGE_TO_VIDEO_MODEL_OPTIONS,
  ]),
);

function formatKlingModelLabel(model: string) {
  return model
    .split('-')
    .map((part) => part.toUpperCase())
    .join(' ');
}

function resolveTimelineFallbackSceneTab(
  sentence: Pick<SentenceItem, 'mediaMode'>,
): 'image' | 'video' {
  return sentence.mediaMode === 'frames' ? 'video' : 'image';
}

function resolveTimelineSentenceSceneTab(
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

function getFirstNonEmptyTimelineUrl(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    const normalized = String(candidate ?? '').trim();
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function buildClearedTimelineTextLayerPatch(): Partial<SentenceItem> {
  return {
    textAnimationEffect: null,
    textAnimationText: null,
    customTextAnimationId: null,
    textAnimationSettings: null,
    textSoundEffects: [],
    textBackgroundImage: null,
    textBackgroundImageUrl: null,
    textBackgroundSavedImageId: null,
    textBackgroundVideo: null,
    textBackgroundVideoUrl: null,
    textBackgroundSavedVideoId: null,
  };
}

function buildClearedTimelineOverlayLayerPatch(): Partial<SentenceItem> {
  return {
    customOverlayId: null,
    overlayFile: null,
    overlayUrl: null,
    overlayMimeType: null,
    overlaySettings: null,
    overlaySoundEffects: [],
  };
}

function buildClearedTimelineVideoPatch(): Partial<SentenceItem> {
  return {
    video: null,
    videoUrl: null,
    savedVideoId: null,
    framesVideoUrl: null,
    framesSavedVideoId: null,
    textVideoUrl: null,
    textSavedVideoId: null,
    referenceVideoUrl: null,
    referenceSavedVideoId: null,
  };
}

type SentencesImagesSectionProps = {
  sentences: SentenceItem[];
  isShortVideo: boolean;
  sceneDurationSecondsByIndex: Array<number | null>;
  editorMode?: EditorMode;
  onEditorModeChange?: (mode: EditorMode) => void;
  isLongForm?: boolean;

  shortsTabs?: ShortsTabMeta[];
  activeShortTabIndex?: number | null;
  onSelectShortTab?: (index: number | null) => void;
  manualSplitEnabled?: boolean;
  onManualSplitToggle?: (next: boolean) => void | Promise<void>;
  onSplitWithAi?: (() => void) | (() => Promise<void>);
  isSplittingWithAi?: boolean;
  shortsValidationError?: string | null;
  isGeneratingAllImages: boolean;
  onGenerateAllImages?: (() => void) | (() => Promise<void>);
  isApplyingBulkFeelingCues?: boolean;
  onGenerateBulkFeelingCues?: (() => void) | (() => Promise<void>);
  isApplyingBulkLookEffects?: boolean;
  onGenerateBulkLookEffects?: (() => void) | (() => Promise<void>);
  onOpenBulkLookPresetModal?: (() => void) | (() => Promise<void>);
  onResetBulkLookEffects?: () => void;
  isApplyingBulkLookPreset?: boolean;
  isApplyingBulkMotionEffects?: boolean;
  onGenerateBulkMotionEffects?: (() => void) | (() => Promise<void>);
  onOpenBulkMotionPresetModal?: (() => void) | (() => Promise<void>);
  onResetBulkMotionEffects?: () => void;
  isApplyingBulkMotionPreset?: boolean;
  isSavingSceneSequence?: boolean;
  isApplyingSavedSequence?: boolean;
  onOpenSaveSceneSequence?: () => void;
  onOpenLoadSceneSequence?: () => void;

  imageAspectRatio: '16:9' | '9:16' | '1:1';
  onImageAspectRatioChange: (value: '16:9' | '9:16' | '1:1') => void;

  scriptCharacters: ScriptCharacter[];
  onScriptCharactersChange: (next: ScriptCharacter[]) => void;
  onSentenceForcedCharacterKeysChange: (index: number, next: string[] | null) => void;

  scriptLocations: ScriptLocation[];
  onScriptLocationsChange: (next: ScriptLocation[]) => void;
  onSentenceForcedLocationKeyChange: (index: number, next: string | null) => void;
  imageFilterPresets: ImageFilterPresetDto[];
  motionEffectPresets: MotionEffectPresetDto[];
  textAnimationPresets: TextAnimationPresetDto[];
  overlayPresets: OverlayPresetDto[];
  isLoadingImageFilterPresets?: boolean;
  isLoadingMotionEffectPresets?: boolean;
  isLoadingTextAnimationPresets?: boolean;
  isLoadingOverlayPresets?: boolean;
  onSentencePatch: (index: number, patch: Partial<SentenceItem>) => void;
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
  onSentenceVisualEffectChange: (
    index: number,
    value:
      | 'none'
      | 'colorGrading'
      | 'animatedLighting'
      | 'glassSubtle'
      | 'glassReflections'
      | 'glassStrong'
      | null,
  ) => void;
  onSentenceImageMotionEffectChange: (
    index: number,
    value: NonNullable<SentenceItem['imageMotionEffect']> | null,
  ) => void;
  onSentenceImageMotionSpeedChange: (index: number, value: number) => void;
  onTransitionToNextChange: (
    index: number,
    value: NonNullable<SentenceItem['transitionToNext']> | null,
  ) => void;
  onOpenTransitionSoundEditor: (index: number) => void;
  timelineVoiceTrack?: TimelineVoiceTrackSelection | null;
  onOpenTimelineVoiceEditor?: () => void;
  onOpenSentenceVoiceEditor?: (sentenceId: string) => void;
  timelineSoundtrack?: TimelineSoundtrackSelection | null;
  onOpenTimelineSoundtrackEditor?: () => void;
  imagePromptModel: string;
  onImagePromptModelChange: (value: string) => void;
  imageModel: string;
  onImageModelChange: (value: string) => void;
  imageStyle: string;
  onImageStyleChange: (value: string) => void;

  videoModel: VideoProvider;
  onVideoModelChange: (value: VideoProvider) => void;
  klingModel: KlingVideoModel;
  onKlingModelChange: (value: KlingVideoModel) => void;
  onInsertEmptySentenceAfter: (index: number) => string;
  onSentenceTextChange: (index: number, next: string) => void;
  onSentenceMediaModeChange: (index: number, mode: 'single' | 'frames') => void;
  onSentenceImageUpload: (
    index: number,
    e: ChangeEvent<HTMLInputElement>,
    slot?: 'primary' | 'secondary',
  ) => void;
  onSentenceVideoUpload: (
    index: number,
    e: ChangeEvent<HTMLInputElement>,
  ) => void;
  onSentenceFrameImageUpload: (
    index: number,
    which: 'start' | 'end',
    e: ChangeEvent<HTMLInputElement>,
  ) => void;
  onGenerateSentenceImage: (
    index: number,
    promptOverride?: string,
    slot?: 'primary' | 'secondary',
  ) => void | Promise<void>;
  onGenerateSentenceReferenceImage?: (index: number) => void | Promise<void>;
  onGenerateSentenceFrameImage?: (
    index: number,
    which: 'start' | 'end',
  ) => void | Promise<void>;
  onGenerateSentenceVideo?: (index: number) => void | Promise<void>;
  onRemoveSentenceGeneratedVideoForMode?: (
    index: number,
    mode: 'frames' | 'text' | 'referenceImage',
  ) => void;

  onSentenceVideoGenerationModeChange: (
    index: number,
    mode: 'frames' | 'text' | 'referenceImage',
  ) => void;
  onSentenceVideoPromptChange: (index: number, next: string) => void;
  onGenerateSentenceVideoPrompt?: (index: number) => void | Promise<void>;
  isGeneratingVideoPromptBySentenceId: Record<string, boolean>;

  onOpenSentenceSoundEffectsLibrary: (index: number) => void;
  onSentenceSoundEffectsChange: (index: number, next: NonNullable<SentenceItem['soundEffects']>) => void;
  onSentenceAlignSoundEffectsToSceneEndChange: (index: number, next: boolean) => void;
  onUploadSentenceSoundEffect: (index: number, files: File[]) => void | Promise<void>;
  isUploadingSentenceSfxBySentenceId: Record<string, boolean>;
  onSaveSentenceSoundEffectsMix: (index: number) => void | Promise<void>;
  isSavingSentenceSfxMixBySentenceId: Record<string, boolean>;
  onSentenceReferenceImageUpload: (
    index: number,
    e: ChangeEvent<HTMLInputElement>,
  ) => void;
  onRemoveSentenceReferenceImage: (index: number) => void;
  onSelectVideoFromLibrary?: (index: number) => void;
  onSaveSentenceVideoToLibrary?: (index: number) => void | Promise<void>;
  onSelectFromLibrary: (
    index: number,
    which: 'single' | 'secondary' | 'start' | 'end' | 'reference',
  ) => void;
  isGeneratingVideoBySentenceId: Record<string, boolean>;
  isSavingSentenceVideoLibraryBySentenceId?: Record<string, boolean>;
  setIsGeneratingVideoBySentenceId: Dispatch<SetStateAction<Record<string, boolean>>>;
  onSaveSentenceImage?: (index: number) => void | Promise<void>;
  onAddSentenceImageSlot?: (index: number) => void;
  onRemoveSentenceImage: (index: number, slot?: 'primary' | 'secondary') => void;
  onRemoveSentenceFrameImage: (index: number, which: 'start' | 'end') => void;
  onMergeSentenceIntoPrevious: (index: number) => void;
  onMergeSentenceIntoNext: (index: number) => void;
  onDeleteSentence: (index: number) => void;
  onAddSuspenseScene: (sourceIndex: number) => void;
  onGenerateTestVideo: (params: GenerateTestVideoRequest) => void | Promise<void>;
  canUseCurrentTestVoiceSettings: boolean;
  testVideoJobStatus: string | null;
  testVideoJobError: string | null;
  testVideoUrl: string | null;
  onCloseTestVideoModal: () => void;
  scriptStyle?: string | null;
  scriptTechnique?: string | null;
  scriptModel?: string | null;
  systemPrompt?: string | null;
  apiUrl?: string;
};

export function SentencesImagesSection({
  sentences,
  isShortVideo,
  sceneDurationSecondsByIndex,
  editorMode = 'scene',
  onEditorModeChange,
  isGeneratingAllImages,
  onGenerateAllImages,
  isApplyingBulkFeelingCues = false,
  onGenerateBulkFeelingCues,
  isApplyingBulkLookEffects = false,
  onGenerateBulkLookEffects,
  onOpenBulkLookPresetModal,
  onResetBulkLookEffects,
  isApplyingBulkLookPreset = false,
  isApplyingBulkMotionEffects = false,
  onGenerateBulkMotionEffects,
  onOpenBulkMotionPresetModal,
  onResetBulkMotionEffects,
  isApplyingBulkMotionPreset = false,
  isSavingSceneSequence = false,
  isApplyingSavedSequence = false,
  onOpenSaveSceneSequence,
  onOpenLoadSceneSequence,

  isLongForm = false,
  shortsTabs = [],
  activeShortTabIndex = null,
  onSelectShortTab,
  manualSplitEnabled = false,
  onManualSplitToggle,
  onSplitWithAi,
  isSplittingWithAi = false,
  shortsValidationError = null,

  imageAspectRatio,
  onImageAspectRatioChange,

  scriptCharacters,
  onScriptCharactersChange,
  onSentenceForcedCharacterKeysChange,

  scriptLocations,
  onScriptLocationsChange,
  onSentenceForcedLocationKeyChange,
  imageFilterPresets,
  motionEffectPresets,
  textAnimationPresets,
  overlayPresets,
  isLoadingImageFilterPresets = false,
  isLoadingMotionEffectPresets = false,
  isLoadingTextAnimationPresets = false,
  isLoadingOverlayPresets = false,
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
  onSentenceVisualEffectChange,
  onSentenceImageMotionEffectChange,
  onSentenceImageMotionSpeedChange,
  onTransitionToNextChange,
  onOpenTransitionSoundEditor,
  timelineVoiceTrack = null,
  onOpenTimelineVoiceEditor,
  onOpenSentenceVoiceEditor,
  timelineSoundtrack = null,
  onOpenTimelineSoundtrackEditor,
  imagePromptModel,
  onImagePromptModelChange,
  imageModel,
  onImageModelChange,
  imageStyle,
  onImageStyleChange,
  videoModel,
  onVideoModelChange,
  klingModel,
  onKlingModelChange,
  onInsertEmptySentenceAfter,
  onSentenceTextChange,
  onSentenceMediaModeChange,
  onSentenceImageUpload,
  onSentenceVideoUpload,
  onAddSentenceImageSlot,
  onSentenceFrameImageUpload,
  onGenerateSentenceImage,
  onGenerateSentenceReferenceImage,
  onGenerateSentenceFrameImage,
  onGenerateSentenceVideo,
  onRemoveSentenceGeneratedVideoForMode,

  onSentenceVideoGenerationModeChange,
  onSentenceVideoPromptChange,
  onGenerateSentenceVideoPrompt,
  isGeneratingVideoPromptBySentenceId,

  onOpenSentenceSoundEffectsLibrary,
  onSentenceSoundEffectsChange,
  onSentenceAlignSoundEffectsToSceneEndChange,
  onUploadSentenceSoundEffect,
  isUploadingSentenceSfxBySentenceId,
  onSaveSentenceSoundEffectsMix,
  isSavingSentenceSfxMixBySentenceId,
  onSentenceReferenceImageUpload,
  onRemoveSentenceReferenceImage,
  onSelectVideoFromLibrary,
  onSaveSentenceVideoToLibrary,
  isGeneratingVideoBySentenceId,
  isSavingSentenceVideoLibraryBySentenceId = {},
  setIsGeneratingVideoBySentenceId,
  onSelectFromLibrary,
  onRemoveSentenceImage,
  onRemoveSentenceFrameImage,
  onMergeSentenceIntoPrevious,
  onMergeSentenceIntoNext,
  onDeleteSentence,
  onAddSuspenseScene,
  onGenerateTestVideo,
  canUseCurrentTestVoiceSettings,
  testVideoJobStatus,
  testVideoJobError,
  testVideoUrl,
  onCloseTestVideoModal,
  apiUrl,
}: SentencesImagesSectionProps) {
  const API_URL = apiUrl || 'http://localhost:3000';
  const isTimelineEditorActive = editorMode === 'timeline';

  const renderEditorLoadingState = () => (
    <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-indigo-200 bg-white/80 px-6 py-10 text-sm text-gray-600 shadow-sm">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
        <span>Loading editor workspace...</span>
      </div>
    </div>
  );

  const {
    clips: timelineDraftClips,
    selectedClipId: selectedTimelineClipId,
    hasOverrides: hasTimelineDraftOverrides,
    overrideCount: timelineDraftOverrideCount,
    selectClip: handleTimelineClipSelect,
    patchClip: handleTimelineClipPatch,
    toggleClipLinked: handleTimelineClipLinkToggle,
    resetClip: handleTimelineClipReset,
    resetAllClips: handleTimelineDraftReset,
  } = useTimelineEditorDraft({
    sentences,
    sceneDurationSecondsByIndex,
  });

  const [timelineEffectModalState, setTimelineEffectModalState] = useState<
    TimelineEffectModalState | null
  >(null);

  const timelineDraftClipsWithEditors = timelineDraftClips.map((clip) => {
    if (clip.kind === 'visual') {
      return {
        ...clip,
        editorLabel: clip.sceneTab === 'video' ? 'Edit look' : 'Edit scene',
      };
    }

    if (clip.kind === 'text') {
      return {
        ...clip,
        editorLabel: 'Edit text',
      };
    }

    if (clip.kind === 'overlay') {
      return {
        ...clip,
        editorLabel: 'Edit overlay',
      };
    }

    return clip;
  });

  const timelineDurationSeconds = timelineDraftClipsWithEditors.reduce(
    (longest, clip) => Math.max(longest, clip.endSeconds),
    0,
  );
  const voiceTimelineClip: TimelineDraftClip | null = timelineVoiceTrack
    ? {
        id: 'voice:merged',
        sentenceId: '__merged-voice-over__',
        sentenceIndex: -1,
        kind: 'voice',
        laneId: 'voice',
        sceneTab: 'image',
        label: timelineVoiceTrack.label,
        subtitle: timelineVoiceTrack.subtitle,
        textPreview: timelineVoiceTrack.subtitle,
        startSeconds: 0,
        durationSeconds: Math.max(0.35, timelineVoiceTrack.durationSeconds),
        endSeconds: Math.max(0.35, timelineVoiceTrack.durationSeconds),
        minDurationSeconds: 0.35,
        linkedToSentence: false,
        parentClipId: null,
        linkedAnchor: 'start',
        syncDurationWithParent: false,
        allowsMove: false,
        allowsResizeStart: false,
        allowsResizeEnd: false,
        isAudio: true,
        toneClassName: 'border-emerald-300 bg-linear-to-r from-emerald-500 to-teal-500',
        editorLabel: timelineVoiceTrack.canEdit ? 'Edit voice-over' : null,
      }
    : null;
  const soundtrackTimelineClip: TimelineDraftClip | null = timelineSoundtrack
    ? {
        id: 'soundtrack:active',
        sentenceId: '__background-soundtrack__',
        sentenceIndex: -1,
        kind: 'soundtrack',
        laneId: 'soundtrack',
        sceneTab: 'image',
        label: timelineSoundtrack.label,
        subtitle: `${timelineSoundtrack.subtitle} · ${timelineSoundtrack.volumePercent}% volume`,
        textPreview: timelineSoundtrack.subtitle,
        startSeconds: 0,
        durationSeconds: Math.max(1, timelineDurationSeconds),
        endSeconds: Math.max(1, timelineDurationSeconds),
        minDurationSeconds: 1,
        linkedToSentence: false,
        parentClipId: null,
        linkedAnchor: 'start',
        syncDurationWithParent: false,
        allowsMove: false,
        allowsResizeStart: false,
        allowsResizeEnd: false,
        isAudio: true,
        toneClassName: 'border-sky-300 bg-linear-to-r from-sky-600 to-indigo-500',
        editorLabel: timelineSoundtrack.canEdit ? 'Edit soundtrack' : null,
      }
    : null;
  const renderedTimelineClips = [
    ...timelineDraftClipsWithEditors.filter((clip) => clip.kind !== 'voice'),
    ...(voiceTimelineClip ? [voiceTimelineClip] : []),
    ...(soundtrackTimelineClip ? [soundtrackTimelineClip] : []),
  ];

  const resolveTimelineClipSentenceIndex = (clip: TimelineDraftClip) => {
    if (
      clip.sentenceIndex >= 0 &&
      sentences[clip.sentenceIndex]?.id === clip.sentenceId
    ) {
      return clip.sentenceIndex;
    }

    return sentences.findIndex((sentence) => sentence.id === clip.sentenceId);
  };

  const handleTimelineClipEditorOpen = (clip: TimelineDraftClip) => {
    switch (clip.kind) {
      case 'visual':
        setTimelineEffectModalState({
          sentenceId: clip.sentenceId,
          activeTab: 'visual',
        });
        break;

      case 'text':
        setTimelineEffectModalState({
          sentenceId: clip.sentenceId,
          activeTab: 'text',
        });
        break;

      case 'overlay':
        setTimelineEffectModalState({
          sentenceId: clip.sentenceId,
          activeTab: 'overlay',
        });
        break;

      case 'voice':
        if (clip.id === 'voice:merged') {
          onOpenTimelineVoiceEditor?.();
          break;
        }

        onOpenSentenceVoiceEditor?.(clip.sentenceId);
        break;
      case 'sfx':
        if (clip.sentenceIndex >= 0) {
          onOpenSentenceSoundEffectsLibrary(clip.sentenceIndex);
        }
        break;
      case 'transition':
        if (clip.sentenceIndex >= 0) {
          onOpenTransitionSoundEditor(clip.sentenceIndex);
        }
        break;
      case 'soundtrack':
        onOpenTimelineSoundtrackEditor?.();
        break;
      default:
        break;
    }
  };

  const handleTimelineTransitionTypeChange = (
    sentenceId: string,
    value: SentenceItem['transitionToNext'] | null,
  ) => {
    const sentenceIndex = sentences.findIndex((sentence) => sentence.id === sentenceId);
    if (sentenceIndex < 0) {
      return;
    }

    onTransitionToNextChange(
      sentenceIndex,
      value as NonNullable<SentenceItem['transitionToNext']> | null,
    );
  };

  const activeTimelineEffectSentenceIndex = timelineEffectModalState
    ? sentences.findIndex((sentence) => sentence.id === timelineEffectModalState.sentenceId)
    : -1;
  const activeTimelineEffectSentence =
    activeTimelineEffectSentenceIndex >= 0
      ? sentences[activeTimelineEffectSentenceIndex]
      : null;
  const activeTimelineEffectSceneTab = activeTimelineEffectSentence
    ? resolveTimelineSentenceSceneTab(activeTimelineEffectSentence)
    : 'image';

  const timelineImagePreviewObjectUrl = useManagedObjectUrl(
    activeTimelineEffectSentence?.image ?? null,
  );
  const timelineVideoPreviewObjectUrl = useManagedObjectUrl(
    activeTimelineEffectSentence?.video ?? null,
  );
  const timelineSecondaryImagePreviewObjectUrl = useManagedObjectUrl(
    activeTimelineEffectSentence?.secondaryImage ?? null,
  );
  const timelineStartPreviewObjectUrl = useManagedObjectUrl(
    activeTimelineEffectSentence?.startImage ?? null,
  );
  const timelineEndPreviewObjectUrl = useManagedObjectUrl(
    activeTimelineEffectSentence?.endImage ?? null,
  );
  const timelineReferencePreviewObjectUrl = useManagedObjectUrl(
    activeTimelineEffectSentence?.referenceImage ?? null,
  );
  const timelineTextBackgroundPreviewObjectUrl = useManagedObjectUrl(
    activeTimelineEffectSentence?.textBackgroundImage ?? null,
  );
  const timelineTextBackgroundVideoPreviewObjectUrl = useManagedObjectUrl(
    activeTimelineEffectSentence?.textBackgroundVideo ?? null,
  );
  const timelineOverlayPreviewObjectUrl = useManagedObjectUrl(
    activeTimelineEffectSentence?.overlayFile ?? null,
  );

  const timelineImagePreviewUrl =
    timelineImagePreviewObjectUrl ?? activeTimelineEffectSentence?.imageUrl ?? null;
  const timelineVideoPreviewUrl = getFirstNonEmptyTimelineUrl(
    timelineVideoPreviewObjectUrl,
    activeTimelineEffectSentence?.videoUrl,
    activeTimelineEffectSentence?.framesVideoUrl,
    activeTimelineEffectSentence?.textVideoUrl,
    activeTimelineEffectSentence?.referenceVideoUrl,
  );
  const timelineSecondaryImagePreviewUrl =
    timelineSecondaryImagePreviewObjectUrl ??
    activeTimelineEffectSentence?.secondaryImageUrl ??
    null;
  const timelineStartPreviewUrl =
    timelineStartPreviewObjectUrl ?? activeTimelineEffectSentence?.startImageUrl ?? null;
  const timelineEndPreviewUrl =
    timelineEndPreviewObjectUrl ?? activeTimelineEffectSentence?.endImageUrl ?? null;
  const timelineReferencePreviewUrl =
    timelineReferencePreviewObjectUrl ??
    activeTimelineEffectSentence?.referenceImageUrl ??
    null;
  const timelineTextBackgroundPreviewUrl =
    timelineTextBackgroundPreviewObjectUrl ??
    activeTimelineEffectSentence?.textBackgroundImageUrl ??
    null;
  const timelineTextBackgroundVideoPreviewUrl =
    timelineTextBackgroundVideoPreviewObjectUrl ??
    activeTimelineEffectSentence?.textBackgroundVideoUrl ??
    null;
  const timelineOverlayPreviewUrl =
    timelineOverlayPreviewObjectUrl ?? activeTimelineEffectSentence?.overlayUrl ?? null;
  const timelineResolvedTextAnimationEffect = resolveTextAnimationEffectFromSettings(
    activeTimelineEffectSentence?.textAnimationSettings ?? null,
    activeTimelineEffectSentence?.textAnimationEffect ?? null,
  );
  const timelineResolvedTextAnimationValue = resolveTextAnimationText(
    activeTimelineEffectSentence?.textAnimationText ?? null,
    activeTimelineEffectSentence?.text ?? '',
  );
  const timelineResolvedTextAnimationSettings = normalizeTextAnimationSettings(
    activeTimelineEffectSentence?.textAnimationSettings ?? null,
    timelineResolvedTextAnimationEffect,
    isShortVideo,
    timelineResolvedTextAnimationValue,
  );
  const timelineTextPreviewBackgroundUrl =
    timelineResolvedTextAnimationSettings.backgroundMode === 'image'
      ? timelineTextBackgroundPreviewUrl
      : timelineResolvedTextAnimationSettings.backgroundMode === 'inheritImage'
        ? timelineImagePreviewUrl
        : null;
  const timelineTextPreviewBackgroundVideoUrl =
    timelineResolvedTextAnimationSettings.backgroundMode === 'video'
      ? timelineTextBackgroundVideoPreviewUrl
      : timelineResolvedTextAnimationSettings.backgroundMode === 'inheritVideo'
        ? timelineVideoPreviewUrl
        : null;
  const timelineRequestedDetailTab = timelineEffectModalState?.activeTab ?? 'visual';
  const timelineVisualSceneKind =
    activeTimelineEffectSceneTab === 'video' ||
    activeTimelineEffectSentence?.mediaMode === 'frames' ||
    Boolean(timelineVideoPreviewUrl)
      ? 'video'
      : 'image';
  const timelineDetailSceneKind =
    timelineRequestedDetailTab === 'text'
      ? 'text'
      : timelineRequestedDetailTab === 'overlay'
        ? 'overlay'
        : timelineVisualSceneKind;
  const activeTimelineDetailEnabledTabs =
    timelineRequestedDetailTab === 'text'
      ? (['text'] as TimelineDetailTab[])
      : timelineRequestedDetailTab === 'overlay'
        ? (['overlay'] as TimelineDetailTab[])
        : timelineDetailSceneKind === 'video'
          ? (['visual'] as TimelineDetailTab[])
          : (['visual', 'motion'] as TimelineDetailTab[]);
  const timelineDetailPreviewUrl = getFirstNonEmptyTimelineUrl(
    timelineImagePreviewUrl,
    timelineSecondaryImagePreviewUrl,
    timelineStartPreviewUrl,
    timelineReferencePreviewUrl,
    timelineEndPreviewUrl,
  );
  const timelineDetailImagePreviewUrl = timelineDetailSceneKind === 'video'
    ? null
    : timelineDetailPreviewUrl;
  const timelineDetailVideoPreviewUrl = timelineDetailSceneKind === 'video'
    ? timelineVideoPreviewUrl
    : null;
  const timelineResolvedOverlaySettings = normalizeOverlaySettings(
    activeTimelineEffectSentence?.overlaySettings ?? null,
    'image',
  );

  const handleTimelineClipDelete = (clip: TimelineDraftClip) => {
    const sentenceIndex = resolveTimelineClipSentenceIndex(clip);
    if (sentenceIndex < 0) {
      return;
    }

    const sentence = sentences[sentenceIndex];
    if (!sentence) {
      return;
    }

    switch (clip.kind) {
      case 'visual': {
        if (clip.sceneTab === 'video') {
          onSentencePatch(sentenceIndex, {
            ...buildClearedTimelineVideoPatch(),
            sceneTab: 'image',
          });
          return;
        }

        if (clip.sceneTab === 'text') {
          onSentencePatch(sentenceIndex, {
            ...buildClearedTimelineTextLayerPatch(),
            sceneTab: resolveTimelineFallbackSceneTab(sentence),
          });
          return;
        }

        if (clip.sceneTab === 'overlay') {
          onSentencePatch(sentenceIndex, {
            ...buildClearedTimelineOverlayLayerPatch(),
            sceneTab: resolveTimelineFallbackSceneTab(sentence),
          });
          return;
        }

        onRemoveSentenceImage(sentenceIndex, 'primary');
        return;
      }

      case 'text': {
        onSentencePatch(sentenceIndex, {
          ...buildClearedTimelineTextLayerPatch(),
          ...(clip.sceneTab === 'text'
            ? { sceneTab: resolveTimelineFallbackSceneTab(sentence) }
            : {}),
        });
        return;
      }

      case 'overlay': {
        onSentencePatch(sentenceIndex, {
          ...buildClearedTimelineOverlayLayerPatch(),
          ...(clip.sceneTab === 'overlay'
            ? { sceneTab: resolveTimelineFallbackSceneTab(sentence) }
            : {}),
        });
        return;
      }

      case 'sfx': {
        onSentencePatch(sentenceIndex, {
          soundEffects: [],
          alignSoundEffectsToSceneEnd: false,
        });
        return;
      }

      case 'transition': {
        onSentencePatch(sentenceIndex, {
          transitionSoundEffects: [],
        });
        return;
      }

      default:
        return;
    }
  };

  const {
    enhanceError,
    enhancingById,
    enhanceMenuOpenById,
    setEnhanceMenuOpenById,
    promptModalOpen,
    promptOriginalSentence,
    promptEnhancedSentence,
    userPrompt,
    setUserPrompt,
    isApplyingPrompt,
    handleEnhanceSentenceWithAi,
    openPromptEnhanceModal,
    closePromptModal,
    applyPromptEnhancement,
    acceptPromptEnhancement,
  } = useSentenceEnhancement({
    sentences,
    apiUrl: API_URL,
    onSentenceTextChange,
  });

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewVisualEffect, setPreviewVisualEffect] = useState<SentenceItem['visualEffect'] | null>(null);
  const [previewImageMotionEffect, setPreviewImageMotionEffect] = useState<SentenceItem['imageMotionEffect'] | null>(null);
  const [previewImageMotionSpeed, setPreviewImageMotionSpeed] = useState<number | null>(null);
  const [previewImageFilterSettings, setPreviewImageFilterSettings] = useState<Record<string, unknown> | null>(null);
  const [previewImageMotionSettings, setPreviewImageMotionSettings] = useState<Record<string, unknown> | null>(null);
  const [isPreviewClosing, setIsPreviewClosing] = useState(false);

  const {
    applyingImagePromptById,
    imagePromptErrorById,
    enhanceImagePromptModalOpen,
    enhanceImagePromptText,
    setEnhanceImagePromptText,
    enhanceImagePromptError,
    isEnhancingImagePromptText,
    openEnhanceImagePromptModal,
    closeEnhanceImagePromptModal,
    makeImagePromptMoreDescriptive,
    applyEnhanceImagePrompt,
  } = useEnhanceImagePrompt({
    sentences,
    apiUrl: API_URL,
    onGenerateSentenceImage,
  });

  const {
    providerOptions,
    selectedProvider,
    selectedModelValue,
    modelOptions,
    onProviderChange,
    onModelChange,
  } = useImageModelOptions({
    selectedValue: imageModel,
    onSelectedValueChange: onImageModelChange,
  });

  const [suspenseModalOpen, setSuspenseModalOpen] = useState(false);
  const [suspenseSelectedIndex, setSuspenseSelectedIndex] = useState<number | null>(null);
  const [isSuspenseNoMediaAlertOpen, setIsSuspenseNoMediaAlertOpen] = useState(false);
  const [generateTestVideoModalOpen, setGenerateTestVideoModalOpen] = useState(false);

  const [isDeleteSentenceOpen, setIsDeleteSentenceOpen] = useState(false);
  const [deleteSentenceIndex, setDeleteSentenceIndex] = useState<number | null>(null);

  const IMAGE_STYLE_OPTIONS: { value: string; label: string }[] = [
    { value: 'anime', label: 'Anime' },
    { value: 'realism', label: 'Realism' },
    { value: 'cinematic', label: 'Cinematic' },
    { value: 'watercolor', label: 'Watercolor' },
    { value: 'classical oil-painting', label: 'Classical oil-painting' },
    { value: '3d', label: '3D Render' },
  ];

  return (
    <AccordionItem value="sentences" className="border-b border-gray-200 px-6">
      <AccordionTrigger className="hover:no-underline py-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Images className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">Sentences & Media</h3>
            <p className="text-sm text-gray-500">
              {sentences.length > 0
                ? `${sentences.length} sentence${sentences.length !== 1 ? 's' : ''} ready`
                : 'Split script into sentences and add images'}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-8 pb-4">
          <div className="bg-linear-to-br from-gray-50 to-gray-100/50 rounded-lg p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full"></div>
              Sentence Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LlmModelSelect
                value={imagePromptModel}
                onValueChange={onImagePromptModelChange}
                label="Prompt Model"
              />

              <Select value={imageStyle} onValueChange={onImageStyleChange}>
                <SelectTrigger label="Image Style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_STYLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={imageAspectRatio}
                onValueChange={(value) =>
                  onImageAspectRatioChange(value as '16:9' | '9:16' | '1:1')
                }
              >
                <SelectTrigger label="Aspect Ratio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">Wide (16:9)</SelectItem>
                  <SelectItem value="9:16">Shorts (9:16)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={videoModel} onValueChange={onVideoModelChange}>
                <SelectTrigger label="Video Model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="grok">Grok</SelectItem>
                  <SelectItem value="kling">Kling AI</SelectItem>
                </SelectContent>
              </Select>

              {videoModel === 'kling' ? (
                <Select
                  value={klingModel}
                  onValueChange={(value) => onKlingModelChange(value as KlingVideoModel)}
                >
                  <SelectTrigger label="Kling Model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KLING_MODEL_OPTIONS.map((model) => (
                      <SelectItem key={model} value={model}>
                        {formatKlingModelLabel(model)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              <Select
                value={selectedProvider}
                onValueChange={(value) => onProviderChange(value as typeof selectedProvider)}
              >
                <SelectTrigger label="Image Provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedModelValue} onValueChange={onModelChange}>
                <SelectTrigger label="Image Model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isLongForm && sentences.length > 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white/80 shadow-sm overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-purple-400/40 blur-md rounded-xl" />
                    <div className="relative p-2.5 bg-linear-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg">
                      <Scissors className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">Split into Shorts</div>
                    <div className="text-xs text-gray-500">
                      {shortsTabs.length > 0
                        ? `${shortsTabs.length} short${shortsTabs.length === 1 ? '' : 's'} · edit each short in tabs`
                        : 'Enable manual split, then split with AI'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2.5 text-sm text-gray-700 select-none cursor-pointer">
                    <span className="font-medium text-gray-700">Manual split</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={manualSplitEnabled}
                      onClick={async () => {
                        if (onManualSplitToggle) {
                          await onManualSplitToggle(!manualSplitEnabled);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${manualSplitEnabled
                          ? 'bg-linear-to-r from-purple-500 to-violet-600'
                          : 'bg-gray-200'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${manualSplitEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </label>

                  <button
                    type="button"
                    onClick={async () => {
                      if (isSplittingWithAi) return;
                      if (onSplitWithAi) {
                        await onSplitWithAi();
                      }
                    }}
                    disabled={isSplittingWithAi}
                    aria-busy={isSplittingWithAi}
                    className={`inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-purple-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/25 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSplittingWithAi ? 'opacity-80 cursor-not-allowed' : 'hover:opacity-95'}`}
                  >
                    {isSplittingWithAi ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Splitting…
                      </>
                    ) : (
                      'Split with AI'
                    )}
                  </button>
                </div>
              </div>

              {/* Tab pills */}
              {shortsTabs.length > 0 ? (
              <div className="flex flex-wrap gap-2 px-5 pb-4">
                <button
                  type="button"
                  onClick={() => onSelectShortTab?.(null)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${activeShortTabIndex === null
                      ? 'border-purple-500 bg-linear-to-r from-purple-500 to-violet-600 text-white shadow-md shadow-purple-500/25'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Full Video
                </button>

                {shortsTabs.map((t, idx) => {
                  const isActive = activeShortTabIndex === idx;
                  return (
                    <button
                      key={`short-tab-${idx}`}
                      type="button"
                      onClick={() => onSelectShortTab?.(idx)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${isActive
                          ? 'border-purple-500 bg-linear-to-r from-purple-500 to-violet-600 text-white shadow-md shadow-purple-500/25'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <Film className="h-4 w-4" />
                      {t.label}
                      <span
                        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-gray-100 text-gray-600'
                          }`}
                      >
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              ) : null}

              {shortsValidationError ? (
                <div className="px-5 pb-3 text-xs font-medium text-red-600">{shortsValidationError}</div>
              ) : null}
            </div>
          ) : null}
          {sentences.length > 0 ? (
            <Suspense fallback={renderEditorLoadingState()}>
              {isTimelineEditorActive ? (
                <LazyTimelineEditorSection
                  clips={renderedTimelineClips}
                  sentences={sentences}
                  selectedClipId={selectedTimelineClipId}
                  hasDraftOverrides={hasTimelineDraftOverrides}
                  draftOverrideCount={timelineDraftOverrideCount}
                  isShortVideo={isShortVideo}
                  onOpenSceneEditor={() => onEditorModeChange?.('scene')}
                  onSelectClip={handleTimelineClipSelect}
                  onPatchClip={handleTimelineClipPatch}
                  onOpenClipEditor={handleTimelineClipEditorOpen}
                  onDeleteClip={handleTimelineClipDelete}
                  onChangeTransitionType={handleTimelineTransitionTypeChange}
                  onToggleClipLinked={handleTimelineClipLinkToggle}
                  onResetClip={handleTimelineClipReset}
                  onResetAllClips={handleTimelineDraftReset}
                />
              ) : (
                <LazySceneEditorSection
                  sentences={sentences}
                  isShortVideo={isShortVideo}
                  sceneDurationSecondsByIndex={sceneDurationSecondsByIndex}
                  isGeneratingAllImages={isGeneratingAllImages}
                  onGenerateAllImages={onGenerateAllImages}
                  isApplyingBulkFeelingCues={isApplyingBulkFeelingCues}
                  onGenerateBulkFeelingCues={onGenerateBulkFeelingCues}
                  isApplyingBulkLookEffects={isApplyingBulkLookEffects}
                  onGenerateBulkLookEffects={onGenerateBulkLookEffects}
                  onOpenBulkLookPresetModal={onOpenBulkLookPresetModal}
                  onResetBulkLookEffects={onResetBulkLookEffects}
                  isApplyingBulkLookPreset={isApplyingBulkLookPreset}
                  isApplyingBulkMotionEffects={isApplyingBulkMotionEffects}
                  onGenerateBulkMotionEffects={onGenerateBulkMotionEffects}
                  onOpenBulkMotionPresetModal={onOpenBulkMotionPresetModal}
                  onResetBulkMotionEffects={onResetBulkMotionEffects}
                  isApplyingBulkMotionPreset={isApplyingBulkMotionPreset}
                  isSavingSceneSequence={isSavingSceneSequence}
                  isApplyingSavedSequence={isApplyingSavedSequence}
                  onOpenSaveSceneSequence={onOpenSaveSceneSequence}
                  onOpenLoadSceneSequence={onOpenLoadSceneSequence}
                  onSelectVideoFromLibrary={onSelectVideoFromLibrary}
                  onSaveSentenceVideoToLibrary={onSaveSentenceVideoToLibrary}
                  isSavingSentenceVideoLibraryBySentenceId={isSavingSentenceVideoLibraryBySentenceId}
                  videoModel={videoModel}
                  onOpenSentenceSoundEffectsLibrary={onOpenSentenceSoundEffectsLibrary}
                  onSentenceSoundEffectsChange={onSentenceSoundEffectsChange}
                  onSentenceAlignSoundEffectsToSceneEndChange={
                    onSentenceAlignSoundEffectsToSceneEndChange
                  }
                  onUploadSentenceSoundEffect={onUploadSentenceSoundEffect}
                  isUploadingSentenceSfxBySentenceId={isUploadingSentenceSfxBySentenceId}
                  onSaveSentenceSoundEffectsMix={onSaveSentenceSoundEffectsMix}
                  isSavingSentenceSfxMixBySentenceId={isSavingSentenceSfxMixBySentenceId}
                  scriptCharacters={scriptCharacters}
                  onScriptCharactersChange={onScriptCharactersChange}
                  onSentenceForcedCharacterKeysChange={onSentenceForcedCharacterKeysChange}
                  scriptLocations={scriptLocations}
                  onScriptLocationsChange={onScriptLocationsChange}
                  onSentenceForcedLocationKeyChange={onSentenceForcedLocationKeyChange}
                  imageFilterPresets={imageFilterPresets}
                  motionEffectPresets={motionEffectPresets}
                  textAnimationPresets={textAnimationPresets}
                  overlayPresets={overlayPresets}
                  isLoadingImageFilterPresets={isLoadingImageFilterPresets}
                  isLoadingMotionEffectPresets={isLoadingMotionEffectPresets}
                  isLoadingTextAnimationPresets={isLoadingTextAnimationPresets}
                  isLoadingOverlayPresets={isLoadingOverlayPresets}
                  onSentencePatch={onSentencePatch}
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
                  onGenerateSingleImageLookWithAi={onGenerateSingleImageLookWithAi}
                  onGenerateSingleImageMotionWithAi={onGenerateSingleImageMotionWithAi}
                  onSentenceVisualEffectChange={onSentenceVisualEffectChange}
                  onSentenceImageMotionEffectChange={onSentenceImageMotionEffectChange}
                  onSentenceImageMotionSpeedChange={onSentenceImageMotionSpeedChange}
                  onTransitionToNextChange={onTransitionToNextChange}
                  onOpenTransitionSoundEditor={onOpenTransitionSoundEditor}
                  onInsertEmptySentenceAfter={onInsertEmptySentenceAfter}
                  onOpenAddSuspense={() => {
                    setSuspenseSelectedIndex(null);
                    setSuspenseModalOpen(true);
                  }}
                  onOpenGenerateTestVideo={() => {
                    setGenerateTestVideoModalOpen(true);
                  }}
                  enhanceError={enhanceError}
                  enhancingById={enhancingById}
                  enhanceMenuOpenById={enhanceMenuOpenById}
                  setEnhanceMenuOpenById={setEnhanceMenuOpenById}
                  isApplyingPrompt={isApplyingPrompt}
                  onAutoEnhance={handleEnhanceSentenceWithAi}
                  onCustomPrompt={openPromptEnhanceModal}
                  applyingImagePromptById={applyingImagePromptById}
                  imagePromptErrorById={imagePromptErrorById}
                  onOpenEnhanceImagePromptModal={openEnhanceImagePromptModal}
                  onMergeSentenceIntoPrevious={onMergeSentenceIntoPrevious}
                  onMergeSentenceIntoNext={onMergeSentenceIntoNext}
                  onRequestDelete={(index) => {
                    setDeleteSentenceIndex(index);
                    setIsDeleteSentenceOpen(true);
                  }}
                  onSentenceTextChange={onSentenceTextChange}
                  onSentenceMediaModeChange={onSentenceMediaModeChange}
                  onSentenceImageUpload={onSentenceImageUpload}
                  onSentenceVideoUpload={onSentenceVideoUpload}
                  onAddSentenceImageSlot={onAddSentenceImageSlot}
                  onSentenceFrameImageUpload={onSentenceFrameImageUpload}
                  onGenerateSentenceImage={onGenerateSentenceImage}
                  onGenerateSentenceReferenceImage={onGenerateSentenceReferenceImage}
                  onGenerateSentenceFrameImage={onGenerateSentenceFrameImage}
                  onGenerateSentenceVideo={onGenerateSentenceVideo}
                  onRemoveSentenceGeneratedVideoForMode={onRemoveSentenceGeneratedVideoForMode}
                  isGeneratingVideoBySentenceId={isGeneratingVideoBySentenceId}
                  setIsGeneratingVideoBySentenceId={setIsGeneratingVideoBySentenceId}
                  onSentenceVideoGenerationModeChange={
                    onSentenceVideoGenerationModeChange
                  }
                  onSentenceVideoPromptChange={onSentenceVideoPromptChange}
                  onGenerateSentenceVideoPrompt={onGenerateSentenceVideoPrompt}
                  isGeneratingVideoPromptBySentenceId={isGeneratingVideoPromptBySentenceId}
                  onSentenceReferenceImageUpload={onSentenceReferenceImageUpload}
                  onRemoveSentenceReferenceImage={onRemoveSentenceReferenceImage}
                  onSelectFromLibrary={onSelectFromLibrary}
                  onRemoveSentenceImage={onRemoveSentenceImage}
                  onRemoveSentenceFrameImage={onRemoveSentenceFrameImage}
                  onPreviewImage={(
                    url,
                    effect,
                    imageMotionEffect,
                    imageMotionSpeed,
                    imageFilterSettings,
                    imageMotionSettings,
                  ) => {
                    setIsPreviewClosing(false);
                    setPreviewImageUrl(url);
                    setPreviewVisualEffect(effect ?? null);
                    setPreviewImageMotionEffect(imageMotionEffect ?? 'default');
                    setPreviewImageMotionSpeed(
                      imageMotionSpeed ?? getDefaultImageMotionSpeed(isShortVideo),
                    );
                    setPreviewImageFilterSettings(imageFilterSettings ?? null);
                    setPreviewImageMotionSettings(imageMotionSettings ?? null);
                  }}
                  onOpenTimelineEditor={() => onEditorModeChange?.('timeline')}
                />
              )}
            </Suspense>
          ) : (
            <EmptyScenesState />
          )}
          {previewImageUrl ? (
            <ImagePreviewOverlay
              previewImageUrl={previewImageUrl}
              visualEffect={previewVisualEffect}
              imageMotionEffect={previewImageMotionEffect}
              imageMotionSpeed={previewImageMotionSpeed}
              imageFilterSettings={previewImageFilterSettings}
              imageMotionSettings={previewImageMotionSettings}
              isPreviewClosing={isPreviewClosing}
              onRequestClose={() => {
                setIsPreviewClosing(true);
                setTimeout(() => {
                  setPreviewImageUrl(null);
                  setPreviewVisualEffect(null);
                  setPreviewImageMotionEffect(null);
                  setPreviewImageMotionSpeed(null);
                  setPreviewImageFilterSettings(null);
                  setPreviewImageMotionSettings(null);
                }, 200);
              }}
            />
          ) : null}

          {activeTimelineEffectSentence && timelineEffectModalState ? (
            <ImageEffectsDetailModal
              isOpen
              isShortVideo={isShortVideo}
              activeTab={timelineEffectModalState.activeTab}
              enabledTabs={activeTimelineDetailEnabledTabs}
              sceneKind={timelineDetailSceneKind}
              previewImageUrl={timelineDetailImagePreviewUrl}
              previewVideoUrl={timelineDetailVideoPreviewUrl}
              previewTextInheritedImageUrl={timelineImagePreviewUrl}
              previewTextInheritedVideoUrl={timelineVideoPreviewUrl}
              previewOverlayInheritedImageUrl={timelineImagePreviewUrl}
              previewOverlayInheritedVideoUrl={timelineVideoPreviewUrl}
              sentenceText={activeTimelineEffectSentence.text}
              visualEffect={activeTimelineEffectSentence.visualEffect}
              imageMotionEffect={activeTimelineEffectSentence.imageMotionEffect}
              imageMotionSpeed={activeTimelineEffectSentence.imageMotionSpeed}
              textAnimationEffect={timelineResolvedTextAnimationEffect}
              textAnimationText={activeTimelineEffectSentence.textAnimationText}
              textSoundEffects={activeTimelineEffectSentence.textSoundEffects ?? []}
              textBackgroundImage={activeTimelineEffectSentence.textBackgroundImage ?? null}
              textBackgroundImageUrl={activeTimelineEffectSentence.textBackgroundImageUrl ?? null}
              textBackgroundSavedImageId={activeTimelineEffectSentence.textBackgroundSavedImageId ?? null}
              textBackgroundVideo={activeTimelineEffectSentence.textBackgroundVideo ?? null}
              textBackgroundVideoUrl={activeTimelineEffectSentence.textBackgroundVideoUrl ?? null}
              textBackgroundSavedVideoId={activeTimelineEffectSentence.textBackgroundSavedVideoId ?? null}
              overlayFile={activeTimelineEffectSentence.overlayFile ?? null}
              overlayUrl={timelineOverlayPreviewUrl}
              overlayMimeType={activeTimelineEffectSentence.overlayMimeType ?? null}
              overlaySoundEffects={activeTimelineEffectSentence.overlaySoundEffects ?? []}
              customImageFilterId={activeTimelineEffectSentence.customImageFilterId ?? null}
              customMotionEffectId={activeTimelineEffectSentence.customMotionEffectId ?? null}
              customTextAnimationId={activeTimelineEffectSentence.customTextAnimationId ?? null}
              customOverlayId={activeTimelineEffectSentence.customOverlayId ?? null}
              imageFilterSettings={activeTimelineEffectSentence.imageFilterSettings ?? null}
              imageMotionSettings={activeTimelineEffectSentence.imageMotionSettings ?? null}
              textAnimationSettings={timelineResolvedTextAnimationSettings}
              overlaySettings={timelineResolvedOverlaySettings}
              imageFilterPresets={imageFilterPresets}
              motionEffectPresets={motionEffectPresets}
              textAnimationPresets={textAnimationPresets}
              overlayPresets={overlayPresets}
              onClose={() => setTimelineEffectModalState(null)}
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
                if (activeTimelineEffectSentenceIndex < 0) {
                  return;
                }

                onSentencePatch(activeTimelineEffectSentenceIndex, {
                  ...(timelineEffectModalState.activeTab === 'text'
                    ? {
                        sceneTab: 'text' as const,
                        mediaMode: 'single' as const,
                      }
                    : timelineEffectModalState.activeTab === 'overlay'
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
              onGenerateLookWithAi={(params) =>
                onGenerateSingleImageLookWithAi(activeTimelineEffectSentence.id, params)
              }
              onGenerateMotionWithAi={(params) =>
                onGenerateSingleImageMotionWithAi(activeTimelineEffectSentence.id, params)
              }
            />
          ) : null}
        </div>
      </AccordionContent>

      {/* Enhance With Prompt Modal */}
      <EnhanceWithPromptModal
        isOpen={promptModalOpen}
        enhanceError={enhanceError}
        isApplyingPrompt={isApplyingPrompt}
        promptOriginalSentence={promptOriginalSentence}
        promptEnhancedSentence={promptEnhancedSentence}
        userPrompt={userPrompt}
        onUserPromptChange={setUserPrompt}
        onCancel={closePromptModal}
        onApply={applyPromptEnhancement}
        onDone={acceptPromptEnhancement}
      />

      {/* Enhance Image Prompt Modal */}
      <EnhanceImagePromptModal
        isOpen={enhanceImagePromptModalOpen}
        enhanceImagePromptError={enhanceImagePromptError}
        enhanceImagePromptText={enhanceImagePromptText}
        isEnhancingImagePromptText={isEnhancingImagePromptText}
        onEnhanceImagePromptTextChange={setEnhanceImagePromptText}
        onMakeMoreDescriptive={makeImagePromptMoreDescriptive}
        onCancel={closeEnhanceImagePromptModal}
        onDone={applyEnhanceImagePrompt}
      />

      {/* Add Suspense Scene Modal */}
      <AddSuspenseSceneModal
        isOpen={suspenseModalOpen}
        sentences={sentences}
        suspenseSelectedIndex={suspenseSelectedIndex}
        onChangeSelectedIndex={setSuspenseSelectedIndex}
        onClose={() => setSuspenseModalOpen(false)}
        onAddSuspenseScene={onAddSuspenseScene}
        onMissingMedia={() => setIsSuspenseNoMediaAlertOpen(true)}
      />

      <GenerateTestVideoModal
        key={generateTestVideoModalOpen ? 'test-video-open' : 'test-video-closed'}
        isOpen={generateTestVideoModalOpen}
        sentences={sentences}
        jobStatus={testVideoJobStatus}
        jobError={testVideoJobError}
        videoUrl={testVideoUrl}
        canUseCurrentVoiceSettings={canUseCurrentTestVoiceSettings}
        onClose={() => {
          setGenerateTestVideoModalOpen(false);
          onCloseTestVideoModal();
        }}
        onGenerate={onGenerateTestVideo}
      />

      <AlertDialog
        isOpen={isSuspenseNoMediaAlertOpen}
        onClose={() => setIsSuspenseNoMediaAlertOpen(false)}
        onConfirm={() => setIsSuspenseNoMediaAlertOpen(false)}
        title="Scene needs an image"
        description="Please generate or upload an image for this sentence before choosing it as a suspense scene."
        confirmText="OK"
        cancelText="Close"
        variant="warning"
      />

      <AlertDialog
        isOpen={isDeleteSentenceOpen}
        onClose={() => {
          setIsDeleteSentenceOpen(false);
          setDeleteSentenceIndex(null);
        }}
        onConfirm={() => {
          if (deleteSentenceIndex === null) return;
          onDeleteSentence(deleteSentenceIndex);
          setIsDeleteSentenceOpen(false);
          setDeleteSentenceIndex(null);
        }}
        title="Delete sentence?"
        description="This will remove the sentence and its attached media from your project."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </AccordionItem>
  );
}
