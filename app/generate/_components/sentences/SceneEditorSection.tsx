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
import { Clock, Loader2, Sparkles, Images, Video as VideoIcon, Plus, Users, Music2, Clapperboard } from 'lucide-react';

import type { SentenceItem } from '../../_types/sentences';
import { SentenceEditorCard } from './SentenceEditorCardGrid';
import { CharactersModal } from './CharactersModal';
import { ErasModal, type ScriptEra } from './ErasModal';
import type {
  ImageFilterPresetDto,
  ImageFilterSettings,
  ImageMotionSettings,
  MotionEffectPresetDto,
} from './ImageEffectPreview';

type ScriptCharacter = {
  key: string;
  name: string;
  description: string;
  isSahaba: boolean;
  isProphet: boolean;
  isWoman: boolean;
};

type SceneEditorSectionProps = {
  sentences: SentenceItem[];
  isShortVideo: boolean;
  sceneDurationSecondsByIndex: Array<number | null>;
  isGeneratingAllImages: boolean;
  onGenerateAllImages?: (() => void) | (() => Promise<void>);

  onSelectVideoFromLibrary?: (index: number) => void;

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

  videoModel: 'gemini' | 'grok';

  scriptCharacters: ScriptCharacter[];
  onScriptCharactersChange: (next: ScriptCharacter[]) => void;
  onSentenceForcedCharacterKeysChange: (index: number, next: string[] | null) => void;

  scriptEras: ScriptEra[];
  onScriptErasChange: (next: ScriptEra[]) => void;
  onSentenceForcedEraKeyChange: (index: number, next: string | null) => void;
  imageFilterPresets: ImageFilterPresetDto[];
  motionEffectPresets: MotionEffectPresetDto[];
  isLoadingImageFilterPresets?: boolean;
  isLoadingMotionEffectPresets?: boolean;
  onSentencePatch: (index: number, patch: Partial<SentenceItem>) => void;
  onSaveImageFilterPreset: (
    title: string,
    settings: ImageFilterSettings,
  ) => Promise<ImageFilterPresetDto | null> | ImageFilterPresetDto | null;
  onSaveMotionEffectPreset: (
    title: string,
    settings: ImageMotionSettings,
  ) => Promise<MotionEffectPresetDto | null> | MotionEffectPresetDto | null;

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
    value:
      | 'none'
      | 'glitch'
      | 'whip'
      | 'flash'
      | 'fade'
      | 'chromaLeak'
      | null,
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
  onSentenceImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onSentenceFrameImageUpload: (
    index: number,
    which: 'start' | 'end',
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;

  onGenerateSentenceImage: (index: number) => void | Promise<void>;
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

  onSelectFromLibrary: (index: number, which: 'single' | 'start' | 'end' | 'reference') => void;
  onRemoveSentenceImage: (index: number) => void;
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
  onOpenSentenceSoundEffectsLibrary: (index: number) => void;
  onSentenceSoundEffectsChange: (
    index: number,
    next: NonNullable<SentenceItem['soundEffects']>,
  ) => void;
  onSentenceAlignSoundEffectsToSceneEndChange: (index: number, next: boolean) => void;
  onUploadSentenceSoundEffect: (index: number, files: File[]) => void | Promise<void>;
  onSaveSentenceSoundEffectsMix: (index: number) => void | Promise<void>;
  onSelectVideoFromLibrary?: (index: number) => void;
  videoModel: 'gemini' | 'grok';
  scriptCharacters: ScriptCharacter[];
  onSentenceForcedCharacterKeysChange: (index: number, next: string[] | null) => void;
  scriptEras: ScriptEra[];
  onSentenceForcedEraKeyChange: (index: number, next: string | null) => void;
  imageFilterPresets: ImageFilterPresetDto[];
  motionEffectPresets: MotionEffectPresetDto[];
  isLoadingImageFilterPresets: boolean;
  isLoadingMotionEffectPresets: boolean;
  onSentencePatch: (index: number, patch: Partial<SentenceItem>) => void;
  onSaveImageFilterPreset: (
    title: string,
    settings: ImageFilterSettings,
  ) => Promise<ImageFilterPresetDto | null> | ImageFilterPresetDto | null;
  onSaveMotionEffectPreset: (
    title: string,
    settings: ImageMotionSettings,
  ) => Promise<MotionEffectPresetDto | null> | MotionEffectPresetDto | null;
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
  onSentenceImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onSentenceFrameImageUpload: (
    index: number,
    which: 'start' | 'end',
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onGenerateSentenceImage: (index: number) => void | Promise<void>;
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
  onSelectFromLibrary: (index: number, which: 'single' | 'start' | 'end' | 'reference') => void;
  onRemoveSentenceImage: (index: number) => void;
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
    value:
      | 'none'
      | 'glitch'
      | 'whip'
      | 'flash'
      | 'fade'
      | 'chromaLeak'
      | null,
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
  onOpenSentenceSoundEffectsLibrary,
  onSentenceSoundEffectsChange,
  onSentenceAlignSoundEffectsToSceneEndChange,
  onUploadSentenceSoundEffect,
  onSaveSentenceSoundEffectsMix,
  onSelectVideoFromLibrary,
  videoModel,
  scriptCharacters,
  onSentenceForcedCharacterKeysChange,
  scriptEras,
  onSentenceForcedEraKeyChange,
  imageFilterPresets,
  motionEffectPresets,
  isLoadingImageFilterPresets,
  isLoadingMotionEffectPresets,
  onSentencePatch,
  onSaveImageFilterPreset,
  onSaveMotionEffectPreset,
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
          videoModel={videoModel}
          scriptCharacters={scriptCharacters}
          onForcedCharacterKeysChange={(next) =>
            onSentenceForcedCharacterKeysChange(index, next)
          }
          scriptEras={scriptEras}
          onForcedEraKeyChange={(next) => onSentenceForcedEraKeyChange(index, next)}
          imageFilterPresets={imageFilterPresets}
          motionEffectPresets={motionEffectPresets}
          isLoadingImageFilterPresets={isLoadingImageFilterPresets}
          isLoadingMotionEffectPresets={isLoadingMotionEffectPresets}
          onSentencePatch={(patch) => onSentencePatch(index, patch)}
          onSaveImageFilterPreset={onSaveImageFilterPreset}
          onSaveMotionEffectPreset={onSaveMotionEffectPreset}
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
          onSentenceImageUpload={(event) => onSentenceImageUpload(index, event)}
          onSentenceFrameImageUpload={(which, event) =>
            onSentenceFrameImageUpload(index, which, event)
          }
          onGenerateSentenceImage={() => onGenerateSentenceImage(index)}
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
          onRemoveSentenceImage={() => onRemoveSentenceImage(index)}
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

      {index < sentenceCount - 1 ? (
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
                        nextValue as
                          | 'none'
                          | 'glitch'
                          | 'whip'
                          | 'flash'
                          | 'fade'
                          | 'chromaLeak',
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
  prev.videoModel === next.videoModel &&
  prev.scriptCharacters === next.scriptCharacters &&
  prev.scriptEras === next.scriptEras &&
  prev.imageFilterPresets === next.imageFilterPresets &&
  prev.motionEffectPresets === next.motionEffectPresets &&
  prev.isLoadingImageFilterPresets === next.isLoadingImageFilterPresets &&
  prev.isLoadingMotionEffectPresets === next.isLoadingMotionEffectPresets,
);

export function SceneEditorSection({
  sentences,
  isShortVideo,
  sceneDurationSecondsByIndex,
  isGeneratingAllImages,
  onGenerateAllImages,

  onSelectVideoFromLibrary,

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

  scriptEras,
  onScriptErasChange,
  onSentenceForcedEraKeyChange,
  imageFilterPresets,
  motionEffectPresets,
  isLoadingImageFilterPresets = false,
  isLoadingMotionEffectPresets = false,
  onSentencePatch,
  onSaveImageFilterPreset,
  onSaveMotionEffectPreset,
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
  onRemoveSentenceImage,
  onRemoveSentenceFrameImage,

  onPreviewImage,
}: SceneEditorSectionProps) {
  const [justInsertedId, setJustInsertedId] = useState<string | null>(null);
  const clearInsertedTimeoutRef = useRef<number | null>(null);

  const [isCharactersModalOpen, setIsCharactersModalOpen] = useState(false);
  const [isErasModalOpen, setIsErasModalOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-linear-to-br from-indigo-50 via-purple-50/40 to-white rounded-2xl p-6 border border-indigo-100/60 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Images className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900 mb-0.5">Scene Editor</h4>
              <p className="text-xs text-gray-600">Craft your story with visuals for each sentence</p>
            </div>
            <div className="ml-4 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-200 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm"></div>
                <span className="text-sm font-bold text-gray-700">{completeCount}</span>
                <span className="text-xs text-gray-500 font-medium">of</span>
                <span className="text-sm font-bold text-gray-700">{sentences.length}</span>
                <span className="text-xs text-gray-500 font-medium">complete</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setIsCharactersModalOpen(true);
              }}
              className="gap-2 h-10 px-4 border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm hover:shadow transition-all"
              title="View and edit all characters"
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-semibold">Characters</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setIsErasModalOpen(true);
              }}
              className="gap-2 h-10 px-4 border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:border-violet-300 shadow-sm hover:shadow transition-all"
              title="View and edit all eras"
            >
              <Clock className="h-4 w-4" />

              <span className="text-sm font-semibold">Eras</span>
            </Button>

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
              onClick={onGenerateAllImages}
              disabled={!onGenerateAllImages || isGeneratingAllImages}
              className="gap-2 h-10 px-5 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGeneratingAllImages ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-semibold">Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-semibold">Generate All Images</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <CharactersModal
        isOpen={isCharactersModalOpen}
        characters={scriptCharacters}
        onClose={() => setIsCharactersModalOpen(false)}
        onSave={onScriptCharactersChange}
      />

      <ErasModal
        isOpen={isErasModalOpen}
        eras={scriptEras}
        onClose={() => setIsErasModalOpen(false)}
        onSave={onScriptErasChange}
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
              onOpenSentenceSoundEffectsLibrary={onOpenSentenceSoundEffectsLibrary}
              onSentenceSoundEffectsChange={onSentenceSoundEffectsChange}
              onSentenceAlignSoundEffectsToSceneEndChange={onSentenceAlignSoundEffectsToSceneEndChange}
              onUploadSentenceSoundEffect={onUploadSentenceSoundEffect}
              onSaveSentenceSoundEffectsMix={onSaveSentenceSoundEffectsMix}
              onSelectVideoFromLibrary={onSelectVideoFromLibrary}
              videoModel={videoModel}
              scriptCharacters={scriptCharacters}
              onSentenceForcedCharacterKeysChange={onSentenceForcedCharacterKeysChange}
              scriptEras={scriptEras}
              onSentenceForcedEraKeyChange={onSentenceForcedEraKeyChange}
              imageFilterPresets={imageFilterPresets}
              motionEffectPresets={motionEffectPresets}
              isLoadingImageFilterPresets={isLoadingImageFilterPresets}
              isLoadingMotionEffectPresets={isLoadingMotionEffectPresets}
              onSentencePatch={onSentencePatch}
              onSaveImageFilterPreset={onSaveImageFilterPreset}
              onSaveMotionEffectPreset={onSaveMotionEffectPreset}
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
