'use client';

import { useRef, useState } from 'react';
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

  const completeCount = sentences.filter((s) =>
    Boolean(
      s.image ||
      s.imageUrl ||
      s.video ||
      s.videoUrl ||
      s.startImage ||
      s.startImageUrl ||
      s.endImage ||
      s.endImageUrl,
    ),
  ).length;

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
          const isEnhancing = Boolean(enhancingById[item.id]);
          const isApplyingImagePrompt = Boolean(applyingImagePromptById[item.id]);
          const imagePromptError = imagePromptErrorById[item.id];

          const isJustInserted = justInsertedId === item.id;

          return (
            <div key={item.id}>
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
                  sceneDurationSeconds={sceneDurationSecondsByIndex[index] ?? null}
                  isFirst={index === 0}
                  isLast={index === sentences.length - 1}
                  onOpenSoundEffectsLibrary={() => onOpenSentenceSoundEffectsLibrary(index)}
                  onSoundEffectsChange={(next) => onSentenceSoundEffectsChange(index, next)}
                  onAlignSoundEffectsToSceneEndChange={(next) =>
                    onSentenceAlignSoundEffectsToSceneEndChange(index, next)
                  }
                  onUploadSoundEffect={(files) => onUploadSentenceSoundEffect(index, files)}
                  isUploadingSoundEffect={Boolean(isUploadingSentenceSfxBySentenceId[item.id])}
                  onSaveSoundEffectsMix={() => onSaveSentenceSoundEffectsMix(index)}
                  isSavingSoundEffectsMix={Boolean(isSavingSentenceSfxMixBySentenceId[item.id])}
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
                  isEnhanceMenuOpen={Boolean(enhanceMenuOpenById[item.id])}
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
                  onSentenceImageUpload={(e) => onSentenceImageUpload(index, e)}
                  onSentenceFrameImageUpload={(which, e) =>
                    onSentenceFrameImageUpload(index, which, e)
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
                  isGeneratingVideo={Boolean(isGeneratingVideoBySentenceId[item.id])}
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
                  isGeneratingVideoPrompt={Boolean(isGeneratingVideoPromptBySentenceId[item.id])}
                  onGenerateVideoPrompt={
                    onGenerateSentenceVideoPrompt
                      ? async () => {
                        if (item.videoUrl === '/subscribe.mp4') return;
                        await Promise.resolve(onGenerateSentenceVideoPrompt(index));
                      }
                      : undefined
                  }
                  onSentenceReferenceImageUpload={(e) =>
                    onSentenceReferenceImageUpload(index, e)
                  }
                  onRemoveReferenceImage={() =>
                    onRemoveSentenceReferenceImage(index)
                  }
                  onPreviewImage={onPreviewImage}
                />
              </div>

              {index < sentences.length - 1 ? (
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
                            onValueChange={(v) => {
                              if (v === '__auto__') {
                                onTransitionToNextChange(index, null);
                                return;
                              }
                              onTransitionToNextChange(
                                index,
                                v as
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
        })}
      </div>
    </div>
  );
}
