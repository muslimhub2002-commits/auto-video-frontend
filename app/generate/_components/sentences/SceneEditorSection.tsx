'use client';

import { memo, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clapperboard,
  FolderOpen,
  Images,
  LayoutGrid,
  ListFilter,
  Loader2,
  MapPin,
  Music2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Users,
  Video as VideoIcon,
} from 'lucide-react';

import type { SentenceItem, VideoProvider } from '../../_types/sentences';
import { AlertDialog } from '@/components/ui/alert-dialog';
import {
  BulkSceneAssignmentModal,
  type BulkSceneAssignmentKind,
} from './BulkSceneAssignmentModal';
import {
  BulkSceneAssignmentScenePickerModal,
  type BulkSceneAssignmentScenePickerItem,
} from './BulkSceneAssignmentScenePickerModal';
import { SentenceEditorCard } from './SentenceEditorCardGrid';
import { CharactersModal } from './CharactersModal';
import { LocationsModal, type ScriptLocation } from './LocationsModal';
import type {
  ImageFilterPresetDto,
  ImageFilterSettings,
  ImageMotionSettings,
  MotionEffectPresetDto,
  OverlayPresetDto,
  OverlaySettings,
} from './ImageEffectPreview';
import type {
  TextAnimationPresetDto,
  TextAnimationSettings,
} from './TextAnimationPreview';

type ScriptCharacter = {
  key: string;
  name: string;
  description: string;
  isSahaba: boolean;
  isProphet: boolean;
  isWoman: boolean;
};

type BulkSceneAssignmentModalState =
  | {
      kind: 'characters';
      selectedCharacterKeys: string[];
    }
  | {
      kind: 'locations';
      selectedLocationKey: string | null;
    };

type BulkSceneAssignmentScenePickerState =
  | {
      kind: 'characters';
      selectedCharacterKeys: string[];
      selectedSentenceIds: string[];
    }
  | {
      kind: 'locations';
      selectedLocationKey: string | null;
      selectedSentenceIds: string[];
    };

type BulkScenePreviewAsset = {
  transport: 'image' | 'video' | 'none';
  file: File | null;
  url: string | null;
};

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

function getFirstNonEmptyUrl(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    const resolved = String(candidate ?? '').trim();
    if (resolved) return resolved;
  }

  return null;
}

function resolveBulkScenePreviewAsset(
  sentence: Pick<
    SentenceItem,
    | 'sceneTab'
    | 'mediaMode'
    | 'image'
    | 'imageUrl'
    | 'secondaryImage'
    | 'secondaryImageUrl'
    | 'startImage'
    | 'startImageUrl'
    | 'endImage'
    | 'endImageUrl'
    | 'video'
    | 'videoUrl'
  >,
): BulkScenePreviewAsset {
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
      file:
        sentence.image ??
        sentence.secondaryImage ??
        sentence.startImage ??
        sentence.endImage ??
        null,
      url: getFirstNonEmptyUrl(
        sentence.imageUrl,
        sentence.secondaryImageUrl,
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

function sanitizeCharacterKeys(keys: string[] | null | undefined): string[] {
  return Array.from(
    new Set(
      (Array.isArray(keys) ? keys : []).map((key) => String(key ?? '').trim()).filter(Boolean),
    ),
  );
}

function sanitizeLocationKey(key: string | null | undefined): string | null {
  const normalized = String(key ?? '').trim();
  return normalized || null;
}

type SceneEditorSectionProps = {
  sentences: SentenceItem[];
  isShortVideo: boolean;
  sceneDurationSecondsByIndex: Array<number | null>;
  onOpenTimelineEditor?: () => void;
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

  onSelectVideoFromLibrary?: (index: number) => void;
  onSaveSentenceVideoToLibrary?: (index: number) => void | Promise<void>;
  isSavingSentenceVideoLibraryBySentenceId?: Record<string, boolean>;

  onOpenSentenceSoundEffectsLibrary: (index: number) => void;
  onSentenceSoundEffectsChange: (
    index: number,
    next: NonNullable<SentenceItem['soundEffects']>,
  ) => void;
  onSentenceAlignSoundEffectsToSceneEndChange: (
    index: number,
    next: boolean,
  ) => void;
  onUploadSentenceSoundEffect: (index: number, files: File[]) => void | Promise<void>;
  isUploadingSentenceSfxBySentenceId: Record<string, boolean>;
  onSaveSentenceSoundEffectsMix: (index: number) => void | Promise<void>;
  isSavingSentenceSfxMixBySentenceId: Record<string, boolean>;

  videoModel: VideoProvider;

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
    value: NonNullable<SentenceItem['visualEffect']> | null,
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

  onInsertEmptySentenceAfter: (index: number) => string;

  onOpenAddSuspense: () => void;
  onOpenGenerateTestVideo: () => void;

  enhanceError: string | null;
  enhancingById: Record<string, boolean>;

  enhanceMenuOpenById: Record<string, boolean>;
  setEnhanceMenuOpenById: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  isApplyingPrompt: boolean;
  onAutoEnhance: (index: number) => void | Promise<void>;
  onCustomPrompt: (index: number) => void;

  applyingImagePromptById: Record<string, boolean>;
  imagePromptErrorById: Record<string, string | undefined>;
  onOpenEnhanceImagePromptModal: (index: number) => void;

  onMergeSentenceIntoPrevious: (index: number) => void;
  onMergeSentenceIntoNext: (index: number) => void;
  onRequestDelete: (index: number) => void;

  onSentenceTextChange: (index: number, next: string) => void;
  onSentenceMediaModeChange: (index: number, mode: 'single' | 'frames') => void;
  onSentenceImageUpload: (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
    slot?: 'primary' | 'secondary',
  ) => void;
  onSentenceVideoUpload: (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onSentenceFrameImageUpload: (
    index: number,
    which: 'start' | 'end',
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;

  onGenerateSentenceImage: (
    index: number,
    promptOverride?: string,
    slot?: 'primary' | 'secondary',
  ) => void | Promise<void>;
  onGenerateSentenceReferenceImage?: (index: number) => void | Promise<void>;
  onGenerateSentenceFrameImage?: (index: number, which: 'start' | 'end') => void | Promise<void>;

  onGenerateSentenceVideo?: (index: number) => void | Promise<void>;
  onRemoveSentenceGeneratedVideoForMode?: (
    index: number,
    mode: 'frames' | 'text' | 'referenceImage',
  ) => void;
  isGeneratingVideoBySentenceId: Record<string, boolean>;
  setIsGeneratingVideoBySentenceId: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  onSentenceVideoGenerationModeChange: (
    index: number,
    mode: 'frames' | 'text' | 'referenceImage',
  ) => void;
  onSentenceVideoPromptChange: (index: number, next: string) => void;
  onGenerateSentenceVideoPrompt?: (index: number) => void | Promise<void>;
  isGeneratingVideoPromptBySentenceId: Record<string, boolean>;
  onSentenceReferenceImageUpload: (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onRemoveSentenceReferenceImage: (index: number) => void;

  onSelectFromLibrary: (
    index: number,
    which: 'single' | 'secondary' | 'start' | 'end' | 'reference',
  ) => void;
  onAddSentenceImageSlot?: (index: number) => void;
  onRemoveSentenceImage: (index: number, slot?: 'primary' | 'secondary') => void;
  onRemoveSentenceFrameImage: (index: number, which: 'start' | 'end') => void;

  onPreviewImage: (
    url: string,
    visualEffect: SentenceItem['visualEffect'] | null,
    imageMotionEffect: SentenceItem['imageMotionEffect'] | null,
    imageMotionSpeed: number | null,
    imageFilterSettings: Record<string, unknown> | null,
    imageMotionSettings: Record<string, unknown> | null,
  ) => void;
};

type SentenceRowProps = {
  item: SentenceItem;
  index: number;
  sentenceCount: number;
  sceneDurationSeconds: number | null;
  isShortVideo: boolean;
  isJustInserted: boolean;
  enhanceError: string | null;
  isEnhancing: boolean;
  isEnhanceMenuOpen: boolean;
  isApplyingPrompt: boolean;
  isApplyingImagePrompt: boolean;
  imagePromptError?: string;
  isUploadingSoundEffect: boolean;
  isSavingSoundEffectsMix: boolean;
  isGeneratingVideo: boolean;
  isGeneratingVideoPrompt: boolean;
  isSavingVideoToLibrary: boolean;
  onOpenSentenceSoundEffectsLibrary: (index: number) => void;
  onSentenceSoundEffectsChange: (
    index: number,
    next: NonNullable<SentenceItem['soundEffects']>,
  ) => void;
  onSentenceAlignSoundEffectsToSceneEndChange: (index: number, next: boolean) => void;
  onUploadSentenceSoundEffect: (index: number, files: File[]) => void | Promise<void>;
  onSaveSentenceSoundEffectsMix: (index: number) => void | Promise<void>;
  onSelectVideoFromLibrary?: (index: number) => void;
  onSaveSentenceVideoToLibrary?: (index: number) => void | Promise<void>;
  videoModel: VideoProvider;
  scriptCharacters: ScriptCharacter[];
  onSentenceForcedCharacterKeysChange: (index: number, next: string[] | null) => void;
  scriptLocations: ScriptLocation[];
  onSentenceForcedLocationKeyChange: (index: number, next: string | null) => void;
  imageFilterPresets: ImageFilterPresetDto[];
  motionEffectPresets: MotionEffectPresetDto[];
  textAnimationPresets: TextAnimationPresetDto[];
  overlayPresets: OverlayPresetDto[];
  isLoadingImageFilterPresets: boolean;
  isLoadingMotionEffectPresets: boolean;
  isLoadingTextAnimationPresets: boolean;
  isLoadingOverlayPresets: boolean;
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
    value: NonNullable<SentenceItem['visualEffect']> | null,
  ) => void;
  onSentenceImageMotionEffectChange: (
    index: number,
    value: NonNullable<SentenceItem['imageMotionEffect']> | null,
  ) => void;
  onSentenceImageMotionSpeedChange: (index: number, value: number) => void;
  setEnhanceMenuOpenById: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onAutoEnhance: (index: number) => void | Promise<void>;
  onCustomPrompt: (index: number) => void;
  onOpenEnhanceImagePromptModal: (index: number) => void;
  onMergeSentenceIntoPrevious: (index: number) => void;
  onMergeSentenceIntoNext: (index: number) => void;
  onRequestDelete: (index: number) => void;
  onSentenceTextChange: (index: number, next: string) => void;
  onSentenceMediaModeChange: (index: number, mode: 'single' | 'frames') => void;
  onSentenceImageUpload: (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
    slot?: 'primary' | 'secondary',
  ) => void;
  onSentenceVideoUpload: (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onSentenceFrameImageUpload: (
    index: number,
    which: 'start' | 'end',
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onGenerateSentenceImage: (
    index: number,
    promptOverride?: string,
    slot?: 'primary' | 'secondary',
  ) => void | Promise<void>;
  onGenerateSentenceReferenceImage?: (index: number) => void | Promise<void>;
  onGenerateSentenceFrameImage?: (index: number, which: 'start' | 'end') => void | Promise<void>;
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
  onSentenceReferenceImageUpload: (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onRemoveSentenceReferenceImage: (index: number) => void;
  onSelectFromLibrary: (
    index: number,
    which: 'single' | 'secondary' | 'start' | 'end' | 'reference',
  ) => void;
  onAddSentenceImageSlot?: (index: number) => void;
  onRemoveSentenceImage: (index: number, slot?: 'primary' | 'secondary') => void;
  onRemoveSentenceFrameImage: (index: number, which: 'start' | 'end') => void;
  onPreviewImage: (
    url: string,
    visualEffect: SentenceItem['visualEffect'] | null,
    imageMotionEffect: SentenceItem['imageMotionEffect'] | null,
    imageMotionSpeed: number | null,
    imageFilterSettings: Record<string, unknown> | null,
    imageMotionSettings: Record<string, unknown> | null,
  ) => void;
  onTransitionToNextChange: (
    index: number,
    value: NonNullable<SentenceItem['transitionToNext']> | null,
  ) => void;
  onOpenTransitionSoundEditor: (index: number) => void;
  onInsertEmptySentenceAfter: (index: number) => string;
  setJustInsertedId: React.Dispatch<React.SetStateAction<string | null>>;
  clearInsertedTimeoutRef: React.MutableRefObject<number | null>;
};

const SentenceRow = memo(function SentenceRow({
  item,
  index,
  sentenceCount,
  sceneDurationSeconds,
  isShortVideo,
  isJustInserted,
  enhanceError,
  isEnhancing,
  isEnhanceMenuOpen,
  isApplyingPrompt,
  isApplyingImagePrompt,
  imagePromptError,
  isUploadingSoundEffect,
  isSavingSoundEffectsMix,
  isGeneratingVideo,
  isGeneratingVideoPrompt,
  isSavingVideoToLibrary,
  onOpenSentenceSoundEffectsLibrary,
  onSentenceSoundEffectsChange,
  onSentenceAlignSoundEffectsToSceneEndChange,
  onUploadSentenceSoundEffect,
  onSaveSentenceSoundEffectsMix,
  onSelectVideoFromLibrary,
  onSaveSentenceVideoToLibrary,
  videoModel,
  scriptCharacters,
  onSentenceForcedCharacterKeysChange,
  scriptLocations,
  onSentenceForcedLocationKeyChange,
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
  onSentenceVisualEffectChange,
  onSentenceImageMotionEffectChange,
  onSentenceImageMotionSpeedChange,
  setEnhanceMenuOpenById,
  onAutoEnhance,
  onCustomPrompt,
  onOpenEnhanceImagePromptModal,
  onMergeSentenceIntoPrevious,
  onMergeSentenceIntoNext,
  onRequestDelete,
  onSentenceTextChange,
  onSentenceMediaModeChange,
  onSentenceImageUpload,
  onSentenceVideoUpload,
  onSentenceFrameImageUpload,
  onGenerateSentenceImage,
  onGenerateSentenceReferenceImage,
  onGenerateSentenceFrameImage,
  onGenerateSentenceVideo,
  onRemoveSentenceGeneratedVideoForMode,
  onSentenceVideoGenerationModeChange,
  onSentenceVideoPromptChange,
  onGenerateSentenceVideoPrompt,
  onSentenceReferenceImageUpload,
  onRemoveSentenceReferenceImage,
  onSelectFromLibrary,
  onAddSentenceImageSlot,
  onRemoveSentenceImage,
  onRemoveSentenceFrameImage,
  onPreviewImage,
  onTransitionToNextChange,
  onOpenTransitionSoundEditor,
  onInsertEmptySentenceAfter,
  setJustInsertedId,
  clearInsertedTimeoutRef,
}: SentenceRowProps) {
  return (
    <div>
      <div
        className={
          isJustInserted
            ? 'animate-in fade-in slide-in-from-top-2 duration-500'
            : ''
        }
      >
        <SentenceEditorCard
          item={item}
          index={index}
          isShortVideo={isShortVideo}
          sceneDurationSeconds={sceneDurationSeconds}
          isFirst={index === 0}
          isLast={index === sentenceCount - 1}
          onOpenSoundEffectsLibrary={() => onOpenSentenceSoundEffectsLibrary(index)}
          onSoundEffectsChange={(next) => onSentenceSoundEffectsChange(index, next)}
          onAlignSoundEffectsToSceneEndChange={(next) =>
            onSentenceAlignSoundEffectsToSceneEndChange(index, next)
          }
          onUploadSoundEffect={(files) => onUploadSentenceSoundEffect(index, files)}
          isUploadingSoundEffect={isUploadingSoundEffect}
          onSaveSoundEffectsMix={() => onSaveSentenceSoundEffectsMix(index)}
          isSavingSoundEffectsMix={isSavingSoundEffectsMix}
          onSelectVideoFromLibrary={
            onSelectVideoFromLibrary
              ? () => onSelectVideoFromLibrary(index)
              : undefined
          }
          onSaveVideoToLibrary={
            onSaveSentenceVideoToLibrary
              ? () => onSaveSentenceVideoToLibrary(index)
              : undefined
          }
          isSavingVideoToLibrary={isSavingVideoToLibrary}
          videoModel={videoModel}
          scriptCharacters={scriptCharacters}
          onForcedCharacterKeysChange={(next) =>
            onSentenceForcedCharacterKeysChange(index, next)
          }
          scriptLocations={scriptLocations}
          onForcedLocationKeyChange={(next) => onSentenceForcedLocationKeyChange(index, next)}
          imageFilterPresets={imageFilterPresets}
          motionEffectPresets={motionEffectPresets}
          textAnimationPresets={textAnimationPresets}
          overlayPresets={overlayPresets}
          isLoadingImageFilterPresets={isLoadingImageFilterPresets}
          isLoadingMotionEffectPresets={isLoadingMotionEffectPresets}
          isLoadingTextAnimationPresets={isLoadingTextAnimationPresets}
          isLoadingOverlayPresets={isLoadingOverlayPresets}
          onSentencePatch={(patch) => onSentencePatch(index, patch)}
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
          onVisualEffectChange={(value) =>
            onSentenceVisualEffectChange(index, value)
          }
          onImageMotionEffectChange={(value) =>
            onSentenceImageMotionEffectChange(index, value)
          }
          onImageMotionSpeedChange={(value) =>
            onSentenceImageMotionSpeedChange(index, value)
          }
          enhanceError={enhanceError}
          isEnhancing={isEnhancing}
          isApplyingPrompt={isApplyingPrompt}
          isEnhanceMenuOpen={isEnhanceMenuOpen}
          onToggleEnhanceMenu={() => {
            setEnhanceMenuOpenById((prev) => ({
              ...prev,
              [item.id]: !prev[item.id],
            }));
          }}
          onAutoEnhance={() => onAutoEnhance(index)}
          onCustomPrompt={() => onCustomPrompt(index)}
          onMergeUp={() => onMergeSentenceIntoPrevious(index)}
          onMergeDown={() => onMergeSentenceIntoNext(index)}
          onRequestDelete={() => onRequestDelete(index)}
          onSentenceTextChange={(next) => onSentenceTextChange(index, next)}
          onSentenceMediaModeChange={(mode) => onSentenceMediaModeChange(index, mode)}
          onSentenceImageUpload={(event, slot) => onSentenceImageUpload(index, event, slot)}
          onSentenceVideoUpload={(event) => onSentenceVideoUpload(index, event)}
          onSentenceFrameImageUpload={(which, event) =>
            onSentenceFrameImageUpload(index, which, event)
          }
          onGenerateSentenceImage={(promptOverride, slot) =>
            onGenerateSentenceImage(index, promptOverride, slot)
          }
          onGenerateSentenceReferenceImage={
            onGenerateSentenceReferenceImage
              ? () => onGenerateSentenceReferenceImage(index)
              : undefined
          }
          onGenerateSentenceFrameImage={
            onGenerateSentenceFrameImage
              ? (which) => onGenerateSentenceFrameImage(index, which)
              : undefined
          }
          onSelectFromLibrary={(which) => onSelectFromLibrary(index, which)}
          onAddSentenceImageSlot={
            onAddSentenceImageSlot ? () => onAddSentenceImageSlot(index) : undefined
          }
          onRemoveSentenceImage={(slot) => onRemoveSentenceImage(index, slot)}
          onRemoveSentenceFrameImage={(which) =>
            onRemoveSentenceFrameImage(index, which)
          }
          onOpenEnhanceImagePromptModal={() =>
            onOpenEnhanceImagePromptModal(index)
          }
          isApplyingImagePrompt={isApplyingImagePrompt}
          imagePromptError={imagePromptError}
          isGeneratingVideo={isGeneratingVideo}
          onGenerateVideo={
            onGenerateSentenceVideo
              ? async (_canGenerateVideo) => {
                if (item.videoUrl === '/subscribe.mp4') return;
                await Promise.resolve(onGenerateSentenceVideo(index));
              }
              : undefined
          }
          onRemoveGeneratedVideo={
            onRemoveSentenceGeneratedVideoForMode
              ? () => {
                const mode =
                  (item.videoGenerationMode ??
                    'referenceImage') as 'frames' | 'text' | 'referenceImage';
                onRemoveSentenceGeneratedVideoForMode(
                  index,
                  videoModel === 'grok' && mode === 'frames'
                    ? 'referenceImage'
                    : mode,
                );
              }
              : undefined
          }
          onVideoGenerationModeChange={(mode) =>
            onSentenceVideoGenerationModeChange(index, mode)
          }
          onVideoPromptChange={(next) =>
            onSentenceVideoPromptChange(index, next)
          }
          isGeneratingVideoPrompt={isGeneratingVideoPrompt}
          onGenerateVideoPrompt={
            onGenerateSentenceVideoPrompt
              ? async () => {
                if (item.videoUrl === '/subscribe.mp4') return;
                await Promise.resolve(onGenerateSentenceVideoPrompt(index));
              }
              : undefined
          }
          onSentenceReferenceImageUpload={(event) =>
            onSentenceReferenceImageUpload(index, event)
          }
          onRemoveReferenceImage={() => onRemoveSentenceReferenceImage(index)}
          onPreviewImage={onPreviewImage}
        />
      </div>

      {index < sentenceCount  ? (
        <div className="relative py-3">
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-200" />
          <div className="relative flex items-center justify-center gap-2">
            {(() => {
              const value = item.transitionToNext ?? '__auto__';
              const transitionSoundCount = Array.isArray(item.transitionSoundEffects)
                ? item.transitionSoundEffects.length
                : 0;

              return (
                <>
                  <Select
                    value={value}
                    onValueChange={(nextValue) => {
                      if (nextValue === '__auto__') {
                        onTransitionToNextChange(index, null);
                        return;
                      }
                      onTransitionToNextChange(
                        index,
                        nextValue as NonNullable<SentenceItem['transitionToNext']>,
                      );
                    }}
                  >
                    <SelectTrigger
                      className="h-9 w-44 bg-white border-gray-200 text-gray-700 shadow-sm"
                      title="Optional: override the transition into the next scene"
                    >
                      <SelectValue placeholder="Transition (Auto)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto__">Transition (Random)</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="glitch">Glitch</SelectItem>
                      <SelectItem value="whip">Whip</SelectItem>
                      <SelectItem value="flash">Flash</SelectItem>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="chromaLeak">Chroma leak</SelectItem>
                      <SelectItem value="impactZoom">Impact zoom</SelectItem>
                      <SelectItem value="slicePush">Slice push</SelectItem>
                      <SelectItem value="irisReveal">Iris reveal</SelectItem>
                      <SelectItem value="echoStutter">Echo stutter</SelectItem>
                      <SelectItem value="tiltSnap">Tilt snap</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenTransitionSoundEditor(index)}
                    className={
                      transitionSoundCount > 0
                        ? 'h-9 gap-2 border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        : 'h-9 gap-2 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                    }
                    title="Configure the sound used for this transition"
                  >
                    <Music2 className="h-4 w-4" />
                    <span className="text-xs font-semibold">
                      Sound Transition{transitionSoundCount > 0 ? ` (${transitionSoundCount})` : ''}
                    </span>
                  </Button>
                </>
              );
            })()}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const insertedId = onInsertEmptySentenceAfter(index);
                setJustInsertedId(insertedId);

                if (clearInsertedTimeoutRef.current) {
                  window.clearTimeout(clearInsertedTimeoutRef.current);
                }
                clearInsertedTimeoutRef.current = window.setTimeout(() => {
                  setJustInsertedId(null);
                  clearInsertedTimeoutRef.current = null;
                }, 700);
              }}
              className="h-9 gap-2 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
              title="Insert a new empty sentence here"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs font-semibold">Add Sentence</span>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}, (prev, next) =>
  prev.item === next.item &&
  prev.index === next.index &&
  prev.sentenceCount === next.sentenceCount &&
  prev.sceneDurationSeconds === next.sceneDurationSeconds &&
  prev.isShortVideo === next.isShortVideo &&
  prev.isJustInserted === next.isJustInserted &&
  prev.enhanceError === next.enhanceError &&
  prev.isEnhancing === next.isEnhancing &&
  prev.isEnhanceMenuOpen === next.isEnhanceMenuOpen &&
  prev.isApplyingPrompt === next.isApplyingPrompt &&
  prev.isApplyingImagePrompt === next.isApplyingImagePrompt &&
  prev.imagePromptError === next.imagePromptError &&
  prev.isUploadingSoundEffect === next.isUploadingSoundEffect &&
  prev.isSavingSoundEffectsMix === next.isSavingSoundEffectsMix &&
  prev.isGeneratingVideo === next.isGeneratingVideo &&
  prev.isGeneratingVideoPrompt === next.isGeneratingVideoPrompt &&
  prev.isSavingVideoToLibrary === next.isSavingVideoToLibrary &&
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
  prev.isLoadingOverlayPresets === next.isLoadingOverlayPresets,
);

export function SceneEditorSection({
  sentences,
  isShortVideo,
  sceneDurationSecondsByIndex,
  onOpenTimelineEditor,
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

  onSelectVideoFromLibrary,
  onSaveSentenceVideoToLibrary,
  isSavingSentenceVideoLibraryBySentenceId = {},

  onOpenSentenceSoundEffectsLibrary,
  onSentenceSoundEffectsChange,
  onSentenceAlignSoundEffectsToSceneEndChange,
  onUploadSentenceSoundEffect,
  isUploadingSentenceSfxBySentenceId,
  onSaveSentenceSoundEffectsMix,
  isSavingSentenceSfxMixBySentenceId,

  videoModel,

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
  onInsertEmptySentenceAfter,
  onOpenAddSuspense,
  onOpenGenerateTestVideo,

  enhanceError,
  enhancingById,

  enhanceMenuOpenById,
  setEnhanceMenuOpenById,

  isApplyingPrompt,
  onAutoEnhance,
  onCustomPrompt,

  applyingImagePromptById,
  imagePromptErrorById,
  onOpenEnhanceImagePromptModal,

  onMergeSentenceIntoPrevious,
  onMergeSentenceIntoNext,
  onRequestDelete,

  onSentenceTextChange,
  onSentenceMediaModeChange,
  onSentenceImageUpload,
  onSentenceVideoUpload,
  onSentenceFrameImageUpload,

  onGenerateSentenceImage,
  onGenerateSentenceReferenceImage,
  onGenerateSentenceFrameImage,

  onGenerateSentenceVideo,
  onRemoveSentenceGeneratedVideoForMode,
  isGeneratingVideoBySentenceId,
  setIsGeneratingVideoBySentenceId,

  onSentenceVideoGenerationModeChange,
  onSentenceVideoPromptChange,
  onGenerateSentenceVideoPrompt,
  isGeneratingVideoPromptBySentenceId,
  onSentenceReferenceImageUpload,
  onRemoveSentenceReferenceImage,

  onSelectFromLibrary,
  onAddSentenceImageSlot,
  onRemoveSentenceImage,
  onRemoveSentenceFrameImage,

  onPreviewImage,
}: SceneEditorSectionProps) {
  const [justInsertedId, setJustInsertedId] = useState<string | null>(null);
  const clearInsertedTimeoutRef = useRef<number | null>(null);

  const [isCharactersModalOpen, setIsCharactersModalOpen] = useState(false);
  const [isLocationsModalOpen, setIsLocationsModalOpen] = useState(false);
  const [bulkAssignmentModal, setBulkAssignmentModal] =
    useState<BulkSceneAssignmentModalState | null>(null);
  const [bulkAssignmentScenePicker, setBulkAssignmentScenePicker] =
    useState<BulkSceneAssignmentScenePickerState | null>(null);
  const [pendingReset, setPendingReset] = useState<'look' | 'motion' | null>(null);

  const completeCount = useMemo(
    () =>
      sentences.filter((sentence) =>
        Boolean(
          sentence.image ||
          sentence.imageUrl ||
          sentence.video ||
          sentence.videoUrl ||
          sentence.startImage ||
          sentence.startImageUrl ||
          sentence.endImage ||
          sentence.endImageUrl,
        ),
      ).length,
    [sentences],
  );

  const allSentenceIds = useMemo(
    () => sentences.map((sentence) => sentence.id).filter(Boolean),
    [sentences],
  );

  const bulkScenePickerItems = useMemo<BulkSceneAssignmentScenePickerItem[]>(
    () =>
      sentences.map((sentence, index) => {
        const sceneTab = resolveSentenceSceneTab(sentence);
        const previewAsset = resolveBulkScenePreviewAsset(sentence);
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
        };
      }),
    [sentences],
  );

  const handleOpenBulkAssignmentModal = (kind: BulkSceneAssignmentKind) => {
    if (kind === 'characters') {
      setBulkAssignmentModal({ kind, selectedCharacterKeys: [] });
      return;
    }

    setBulkAssignmentModal({ kind, selectedLocationKey: null });
  };

  const closeBulkAssignmentFlow = () => {
    setBulkAssignmentModal(null);
    setBulkAssignmentScenePicker(null);
  };

  const applyBulkCharactersToScenes = (
    selectedSentenceIds: string[],
    selectedCharacterKeys: string[],
  ) => {
    const normalizedKeys = sanitizeCharacterKeys(selectedCharacterKeys);
    if (normalizedKeys.length === 0) return;

    const targetIds = new Set(selectedSentenceIds.filter(Boolean));
    sentences.forEach((sentence, index) => {
      if (!targetIds.has(sentence.id)) return;
      onSentenceForcedCharacterKeysChange(index, normalizedKeys);
    });

    closeBulkAssignmentFlow();
  };

  const applyBulkLocationToScenes = (
    selectedSentenceIds: string[],
    selectedLocationKey: string | null,
  ) => {
    const normalizedKey = sanitizeLocationKey(selectedLocationKey);
    if (!normalizedKey) return;

    const targetIds = new Set(selectedSentenceIds.filter(Boolean));
    sentences.forEach((sentence, index) => {
      if (!targetIds.has(sentence.id)) return;
      onSentenceForcedLocationKeyChange(index, normalizedKey);
    });

    closeBulkAssignmentFlow();
  };

  const handleApplyBulkAssignmentToAllScenes = () => {
    if (!bulkAssignmentModal) return;

    if (bulkAssignmentModal.kind === 'characters') {
      applyBulkCharactersToScenes(
        allSentenceIds,
        bulkAssignmentModal.selectedCharacterKeys,
      );
      return;
    }

    applyBulkLocationToScenes(allSentenceIds, bulkAssignmentModal.selectedLocationKey);
  };

  const handleOpenBulkAssignmentScenePicker = () => {
    if (!bulkAssignmentModal) return;

    if (bulkAssignmentModal.kind === 'characters') {
      const selectedCharacterKeys = sanitizeCharacterKeys(
        bulkAssignmentModal.selectedCharacterKeys,
      );
      if (selectedCharacterKeys.length === 0) return;
      setBulkAssignmentScenePicker({
        kind: 'characters',
        selectedCharacterKeys,
        selectedSentenceIds: allSentenceIds,
      });
      setBulkAssignmentModal(null);
      return;
    }

    const selectedLocationKey = sanitizeLocationKey(
      bulkAssignmentModal.selectedLocationKey,
    );
    if (!selectedLocationKey) return;
    setBulkAssignmentScenePicker({
      kind: 'locations',
      selectedLocationKey,
      selectedSentenceIds: allSentenceIds,
    });
    setBulkAssignmentModal(null);
  };

  const handleApplyBulkAssignmentToSelectedScenes = (selectedSentenceIds: string[]) => {
    if (!bulkAssignmentScenePicker) return;

    if (bulkAssignmentScenePicker.kind === 'characters') {
      applyBulkCharactersToScenes(
        selectedSentenceIds,
        bulkAssignmentScenePicker.selectedCharacterKeys,
      );
      return;
    }

    applyBulkLocationToScenes(
      selectedSentenceIds,
      bulkAssignmentScenePicker.selectedLocationKey,
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-linear-to-br from-indigo-50 via-purple-50/40 to-white rounded-2xl p-6 border border-indigo-100/60 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-4">
              <div className="p-3 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Images className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-bold text-gray-900 mb-0.5">Scene Editor</h4>
                <p className="text-xs text-gray-600">Craft your story with visuals for each sentence</p>
              </div>
              <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-200 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm"></div>
                  <span className="text-sm font-bold text-gray-700">{completeCount}</span>
                  <span className="text-xs text-gray-500 font-medium">of</span>
                  <span className="text-sm font-bold text-gray-700">{sentences.length}</span>
                  <span className="text-xs text-gray-500 font-medium">complete</span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={onOpenTimelineEditor}
              disabled={!onOpenTimelineEditor}
              className="gap-2 h-11 px-5 rounded-xl bg-linear-to-r from-fuchsia-600 via-violet-600 to-indigo-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all duration-200 hover:from-fuchsia-700 hover:via-violet-700 hover:to-indigo-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              title="Switch to the multi-lane timeline editor"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="text-sm font-semibold">Open Timeline Editor</span>
            </Button>
          </div>

          <div className="flex w-full flex-wrap items-stretch gap-3">

            <div className="flex h-10 overflow-hidden rounded-lg border border-indigo-200 bg-white shadow-sm transition-all hover:shadow">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCharactersModalOpen(true);
                }}
                className="h-full gap-2 rounded-none px-4 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-700"
                title="View and edit all characters"
              >
                <Users className="h-4 w-4" />
                <span className="text-sm font-semibold">Characters</span>
              </Button>
              <div className="my-1.5 w-px bg-indigo-200" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleOpenBulkAssignmentModal('characters')}
                disabled={sentences.length === 0 || scriptCharacters.length === 0}
                className="h-full w-9 rounded-none p-0 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                title="Choose characters to apply to all or selected scenes"
              >
                <ListFilter className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex h-10 overflow-hidden rounded-lg border border-cyan-200 bg-white shadow-sm transition-all hover:shadow">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsLocationsModalOpen(true);
                }}
                className="h-full gap-2 rounded-none px-4 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-700"
                title="View and edit all locations"
              >
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-semibold">Locations</span>
              </Button>
              <div className="my-1.5 w-px bg-cyan-200" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleOpenBulkAssignmentModal('locations')}
                disabled={sentences.length === 0 || scriptLocations.length === 0}
                className="h-full w-9 rounded-none p-0 text-cyan-500 hover:bg-cyan-50 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-40"
                title="Choose a location to apply to all or selected scenes"
              >
                <ListFilter className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenAddSuspense}
              disabled={sentences.length === 0}
              className="gap-2 h-10 px-4 border-purple-200 bg-white text-purple-700 hover:bg-purple-50 hover:border-purple-300 shadow-sm hover:shadow transition-all"
              title="Copy one existing scene and insert it at the beginning"
            >
              <VideoIcon className="h-4 w-4" />
              <span className="text-sm font-semibold">Add Suspense Scene</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenGenerateTestVideo}
              disabled={sentences.length < 2}
              className="gap-2 h-10 px-4 border-sky-200 bg-white text-sky-700 hover:bg-sky-50 hover:border-sky-300 shadow-sm hover:shadow transition-all"
              title="Preview a subset of scenes with current transitions and audio"
            >
              <Clapperboard className="h-4 w-4" />
              <span className="text-sm font-semibold">Generate Test Video</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenSaveSceneSequence}
              disabled={!onOpenSaveSceneSequence || isSavingSceneSequence || isApplyingSavedSequence}
              className="gap-2 h-10 px-4 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 shadow-sm hover:shadow transition-all"
              title="Save the current scene configuration as a reusable sequence"
            >
              {isSavingSceneSequence ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="text-sm font-semibold">Save Sequence</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenLoadSceneSequence}
              disabled={!onOpenLoadSceneSequence || isSavingSceneSequence || isApplyingSavedSequence}
              className="gap-2 h-10 px-4 border-amber-200 bg-white text-amber-700 hover:bg-amber-50 hover:border-amber-300 shadow-sm hover:shadow transition-all"
              title="Load a saved scene sequence and apply it from the first scene"
            >
              {isApplyingSavedSequence ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderOpen className="h-4 w-4" />
              )}
              <span className="text-sm font-semibold">Load Sequence</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onGenerateAllImages}
              disabled={!onGenerateAllImages || isGeneratingAllImages}
              className="gap-2 h-10 px-5 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <>
                {isGeneratingAllImages ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="text-sm font-semibold">Generate All Images</span>
              </>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onGenerateBulkFeelingCues}
              disabled={!onGenerateBulkFeelingCues || isApplyingBulkFeelingCues}
              className="gap-2 h-10 px-4 border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:border-rose-300 shadow-sm hover:shadow transition-all disabled:cursor-not-allowed disabled:opacity-70"
              title="Add or replace bracketed feeling cues for all sentence lines"
            >
              {isApplyingBulkFeelingCues ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="text-sm font-semibold">AI Feeling</span>
            </Button>

            <div className="flex h-10 overflow-hidden rounded-lg border border-fuchsia-200 bg-white shadow-sm transition-all hover:shadow">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onGenerateBulkLookEffects}
                disabled={!onGenerateBulkLookEffects || isApplyingBulkLookEffects}
                className="h-full gap-2 rounded-none px-4 text-fuchsia-700 hover:bg-fuchsia-50 hover:text-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-70"
                title="Use AI to apply look settings to all eligible image scenes"
              >
                <>
                  {isApplyingBulkLookEffects ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span className="text-sm font-semibold">AI Look</span>
                </>
              </Button>
              <div className="my-1.5 w-px bg-fuchsia-200" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onOpenBulkLookPresetModal}
                disabled={!onOpenBulkLookPresetModal || isApplyingBulkLookEffects || isApplyingBulkLookPreset}
                className="h-full w-9 rounded-none p-0 text-fuchsia-500 hover:bg-fuchsia-50 hover:text-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-40"
                title="Choose a look preset to apply to all or selected scenes"
              >
                <ListFilter className="h-3.5 w-3.5" />
              </Button>
              <div className="my-1.5 w-px bg-fuchsia-200" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPendingReset('look')}
                disabled={!onResetBulkLookEffects || isApplyingBulkLookEffects || isApplyingBulkLookPreset}
                className="h-full w-9 rounded-none p-0 text-fuchsia-400 hover:bg-fuchsia-50 hover:text-fuchsia-600 disabled:cursor-not-allowed disabled:opacity-40"
                title="Reset all image look effects to none"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex h-10 overflow-hidden rounded-lg border border-sky-200 bg-white shadow-sm transition-all hover:shadow">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onGenerateBulkMotionEffects}
                disabled={!onGenerateBulkMotionEffects || isApplyingBulkMotionEffects}
                className="h-full gap-2 rounded-none px-4 text-sky-700 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                title="Use AI to apply motion settings to all eligible image scenes"
              >
                <>
                  {isApplyingBulkMotionEffects ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clapperboard className="h-4 w-4" />
                  )}
                  <span className="text-sm font-semibold">AI Motion</span>
                </>
              </Button>
              <div className="my-1.5 w-px bg-sky-200" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onOpenBulkMotionPresetModal}
                disabled={!onOpenBulkMotionPresetModal || isApplyingBulkMotionEffects || isApplyingBulkMotionPreset}
                className="h-full w-9 rounded-none p-0 text-sky-500 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
                title="Choose a motion preset to apply to all or selected scenes"
              >
                <ListFilter className="h-3.5 w-3.5" />
              </Button>
              <div className="my-1.5 w-px bg-sky-200" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPendingReset('motion')}
                disabled={!onResetBulkMotionEffects || isApplyingBulkMotionEffects || isApplyingBulkMotionPreset}
                className="h-full w-9 rounded-none p-0 text-sky-400 hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
                title="Reset all image motion effects to default scale"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        isOpen={pendingReset !== null}
        onClose={() => setPendingReset(null)}
        onConfirm={() => {
          if (pendingReset === 'look') onResetBulkLookEffects?.();
          if (pendingReset === 'motion') onResetBulkMotionEffects?.();
          setPendingReset(null);
        }}
        variant="warning"
        title={pendingReset === 'look' ? 'Reset all look effects?' : 'Reset all motion effects?'}
        description={
          pendingReset === 'look'
            ? `This will remove the look effect (color grading, lighting, etc.) from all ${sentences.length} scenes and set them back to none. This cannot be undone.`
            : `This will reset the motion effect on all ${sentences.length} scenes back to the default scale. This cannot be undone.`
        }
        confirmText={pendingReset === 'look' ? 'Reset Look' : 'Reset Motion'}
        cancelText="Keep Current"
      />

      <BulkSceneAssignmentModal
        isOpen={Boolean(bulkAssignmentModal)}
        kind={bulkAssignmentModal?.kind ?? 'characters'}
        characters={scriptCharacters}
        locations={scriptLocations}
        selectedCharacterKeys={
          bulkAssignmentModal?.kind === 'characters'
            ? bulkAssignmentModal.selectedCharacterKeys
            : []
        }
        selectedLocationKey={
          bulkAssignmentModal?.kind === 'locations'
            ? bulkAssignmentModal.selectedLocationKey
            : null
        }
        selectableSceneCount={sentences.length}
        onClose={() => setBulkAssignmentModal(null)}
        onSelectedCharacterKeysChange={(next) => {
          setBulkAssignmentModal((prev) =>
            prev?.kind === 'characters'
              ? {
                  ...prev,
                  selectedCharacterKeys: sanitizeCharacterKeys(next),
                }
              : prev,
          );
        }}
        onSelectedLocationKeyChange={(next) => {
          setBulkAssignmentModal((prev) =>
            prev?.kind === 'locations'
              ? {
                  ...prev,
                  selectedLocationKey: sanitizeLocationKey(next),
                }
              : prev,
          );
        }}
        onApplyAllScenes={handleApplyBulkAssignmentToAllScenes}
        onApplyCertainScenes={handleOpenBulkAssignmentScenePicker}
      />

      <BulkSceneAssignmentScenePickerModal
        key={
          bulkAssignmentScenePicker
            ? `${bulkAssignmentScenePicker.kind}:${bulkAssignmentScenePicker.selectedSentenceIds.join(',')}:${bulkAssignmentScenePicker.kind === 'characters' ? bulkAssignmentScenePicker.selectedCharacterKeys.join(',') : bulkAssignmentScenePicker.selectedLocationKey ?? ''}`
            : 'bulk-scene-assignment-picker-closed'
        }
        isOpen={Boolean(bulkAssignmentScenePicker)}
        kind={bulkAssignmentScenePicker?.kind ?? 'characters'}
        scenes={bulkScenePickerItems}
        selectedSentenceIds={bulkAssignmentScenePicker?.selectedSentenceIds ?? []}
        onClose={() => setBulkAssignmentScenePicker(null)}
        onApply={handleApplyBulkAssignmentToSelectedScenes}
      />

      <CharactersModal
        isOpen={isCharactersModalOpen}
        characters={scriptCharacters}
        onClose={() => setIsCharactersModalOpen(false)}
        onSave={onScriptCharactersChange}
      />

      <LocationsModal
        isOpen={isLocationsModalOpen}
        locations={scriptLocations}
        onClose={() => setIsLocationsModalOpen(false)}
        onSave={onScriptLocationsChange}
      />

      {/* Sentences List */}
      <div className="space-y-4">
        {sentences.map((item, index) => {
          return (
            <SentenceRow
              key={item.id}
              item={item}
              index={index}
              sentenceCount={sentences.length}
              sceneDurationSeconds={sceneDurationSecondsByIndex[index] ?? null}
              isShortVideo={isShortVideo}
              isJustInserted={justInsertedId === item.id}
              enhanceError={enhanceError}
              isEnhancing={Boolean(enhancingById[item.id])}
              isEnhanceMenuOpen={Boolean(enhanceMenuOpenById[item.id])}
              isApplyingPrompt={isApplyingPrompt}
              isApplyingImagePrompt={Boolean(applyingImagePromptById[item.id])}
              imagePromptError={imagePromptErrorById[item.id]}
              isUploadingSoundEffect={Boolean(isUploadingSentenceSfxBySentenceId[item.id])}
              isSavingSoundEffectsMix={Boolean(isSavingSentenceSfxMixBySentenceId[item.id])}
              isGeneratingVideo={Boolean(isGeneratingVideoBySentenceId[item.id])}
              isGeneratingVideoPrompt={Boolean(isGeneratingVideoPromptBySentenceId[item.id])}
              isSavingVideoToLibrary={
                Boolean(isSavingSentenceVideoLibraryBySentenceId[item.id])
              }
              onOpenSentenceSoundEffectsLibrary={onOpenSentenceSoundEffectsLibrary}
              onSentenceSoundEffectsChange={onSentenceSoundEffectsChange}
              onSentenceAlignSoundEffectsToSceneEndChange={onSentenceAlignSoundEffectsToSceneEndChange}
              onUploadSentenceSoundEffect={onUploadSentenceSoundEffect}
              onSaveSentenceSoundEffectsMix={onSaveSentenceSoundEffectsMix}
              onSelectVideoFromLibrary={onSelectVideoFromLibrary}
              onSaveSentenceVideoToLibrary={onSaveSentenceVideoToLibrary}
              videoModel={videoModel}
              scriptCharacters={scriptCharacters}
              onSentenceForcedCharacterKeysChange={onSentenceForcedCharacterKeysChange}
              scriptLocations={scriptLocations}
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
              setEnhanceMenuOpenById={setEnhanceMenuOpenById}
              onAutoEnhance={onAutoEnhance}
              onCustomPrompt={onCustomPrompt}
              onOpenEnhanceImagePromptModal={onOpenEnhanceImagePromptModal}
              onMergeSentenceIntoPrevious={onMergeSentenceIntoPrevious}
              onMergeSentenceIntoNext={onMergeSentenceIntoNext}
              onRequestDelete={onRequestDelete}
              onSentenceTextChange={onSentenceTextChange}
              onSentenceMediaModeChange={onSentenceMediaModeChange}
              onSentenceImageUpload={onSentenceImageUpload}
              onSentenceVideoUpload={onSentenceVideoUpload}
              onSentenceFrameImageUpload={onSentenceFrameImageUpload}
              onGenerateSentenceImage={onGenerateSentenceImage}
              onGenerateSentenceReferenceImage={onGenerateSentenceReferenceImage}
              onGenerateSentenceFrameImage={onGenerateSentenceFrameImage}
              onGenerateSentenceVideo={onGenerateSentenceVideo}
              onRemoveSentenceGeneratedVideoForMode={onRemoveSentenceGeneratedVideoForMode}
              onSentenceVideoGenerationModeChange={onSentenceVideoGenerationModeChange}
              onSentenceVideoPromptChange={onSentenceVideoPromptChange}
              onGenerateSentenceVideoPrompt={onGenerateSentenceVideoPrompt}
              onSentenceReferenceImageUpload={onSentenceReferenceImageUpload}
              onRemoveSentenceReferenceImage={onRemoveSentenceReferenceImage}
              onSelectFromLibrary={onSelectFromLibrary}
              onRemoveSentenceImage={onRemoveSentenceImage}
              onRemoveSentenceFrameImage={onRemoveSentenceFrameImage}
              onPreviewImage={onPreviewImage}
              onAddSentenceImageSlot={onAddSentenceImageSlot}
              onTransitionToNextChange={onTransitionToNextChange}
              onOpenTransitionSoundEditor={onOpenTransitionSoundEditor}
              onInsertEmptySentenceAfter={onInsertEmptySentenceAfter}
              setJustInsertedId={setJustInsertedId}
              clearInsertedTimeoutRef={clearInsertedTimeoutRef}
            />
          );
        })}
      </div>
    </div>
  );
}
