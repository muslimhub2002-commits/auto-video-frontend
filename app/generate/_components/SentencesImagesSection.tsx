'use client';

import {
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

import type { SentenceItem } from '../_types/sentences';
import { useSentenceEnhancement } from '../_hooks/useSentenceEnhancement';
import { useEnhanceImagePrompt } from '../_hooks/useEnhanceImagePrompt';
import { LlmModelSelect } from './LlmModelSelect';
import { ImagePreviewOverlay } from './sentences/ImagePreviewOverlay';
import { EnhanceWithPromptModal } from './sentences/EnhanceWithPromptModal';
import { EnhanceImagePromptModal } from './sentences/EnhanceImagePromptModal';
import { AddSuspenseSceneModal } from './sentences/AddSuspenseSceneModal';
import { GenerateTestVideoModal } from './sentences/GenerateTestVideoModal';
import { EmptyScenesState } from './sentences/EmptyScenesState';
import { SceneEditorSection } from './sentences/SceneEditorSection';
import type { TestVideoVoiceMode } from './sentences/test-video.types';

type ScriptCharacter = {
  key: string;
  name: string;
  description: string;
  isSahaba: boolean;
  isProphet: boolean;
  isWoman: boolean;
};

type ScriptEra = {
  key: string;
  name: string;
  description?: string;
};

type ShortsTabMeta = {
  label: string;
  count: number;
};

type SentencesImagesSectionProps = {
  sentences: SentenceItem[];
  isShortVideo: boolean;
  sceneDurationSecondsByIndex: Array<number | null>;
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

  imageAspectRatio: '16:9' | '9:16' | '1:1';
  onImageAspectRatioChange: (value: '16:9' | '9:16' | '1:1') => void;

  scriptCharacters: ScriptCharacter[];
  onScriptCharactersChange: (next: ScriptCharacter[]) => void;
  onSentenceForcedCharacterKeysChange: (index: number, next: string[] | null) => void;

  scriptEras: ScriptEra[];
  onScriptErasChange: (next: ScriptEra[]) => void;
  onSentenceForcedEraKeyChange: (index: number, next: string | null) => void;
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
  imagePromptModel: string;
  onImagePromptModelChange: (value: string) => void;
  imageModel: string;
  onImageModelChange: (value: string) => void;
  imageStyle: string;
  onImageStyleChange: (value: string) => void;

  videoModel: 'gemini' | 'grok';
  onVideoModelChange: (value: 'gemini' | 'grok') => void;
  onInsertEmptySentenceAfter: (index: number) => string;
  onSentenceTextChange: (index: number, next: string) => void;
  onSentenceMediaModeChange: (index: number, mode: 'single' | 'frames') => void;
  onSentenceImageUpload: (index: number, e: ChangeEvent<HTMLInputElement>) => void;
  onSentenceFrameImageUpload: (
    index: number,
    which: 'start' | 'end',
    e: ChangeEvent<HTMLInputElement>,
  ) => void;
  onGenerateSentenceImage: (index: number, promptOverride?: string) => void | Promise<void>;
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
  onSelectFromLibrary: (
    index: number,
    which: 'single' | 'start' | 'end' | 'reference',
  ) => void;
  isGeneratingVideoBySentenceId: Record<string, boolean>;
  setIsGeneratingVideoBySentenceId: Dispatch<SetStateAction<Record<string, boolean>>>;
  onSaveSentenceImage?: (index: number) => void | Promise<void>;
  onRemoveSentenceImage: (index: number) => void;
  onRemoveSentenceFrameImage: (index: number, which: 'start' | 'end') => void;
  onMergeSentenceIntoPrevious: (index: number) => void;
  onMergeSentenceIntoNext: (index: number) => void;
  onDeleteSentence: (index: number) => void;
  onAddSuspenseScene: (sourceIndex: number) => void;
  onGenerateTestVideo: (params: {
    selectedIndices: number[];
    voiceMode: TestVideoVoiceMode;
    uploadedVoiceOver: File | null;
  }) => void | Promise<void>;
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
  isGeneratingAllImages,
  onGenerateAllImages,

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

  scriptEras,
  onScriptErasChange,
  onSentenceForcedEraKeyChange,
  onSentenceVisualEffectChange,
  onSentenceImageMotionEffectChange,
  onSentenceImageMotionSpeedChange,
  onTransitionToNextChange,
  onOpenTransitionSoundEditor,
  imagePromptModel,
  onImagePromptModelChange,
  imageModel,
  onImageModelChange,
  imageStyle,
  onImageStyleChange,
  videoModel,
  onVideoModelChange,
  onInsertEmptySentenceAfter,
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
  isGeneratingVideoBySentenceId,
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
  const [isPreviewClosing, setIsPreviewClosing] = useState(false);

  const {
    applyingImagePromptById,
    imagePromptErrorById,
    enhanceImagePromptModalOpen,
    enhanceImagePromptText,
    setEnhanceImagePromptText,
    enhanceImagePromptError,
    openEnhanceImagePromptModal,
    closeEnhanceImagePromptModal,
    applyEnhanceImagePrompt,
  } = useEnhanceImagePrompt({
    sentences,
    onGenerateSentenceImage,
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
                </SelectContent>
              </Select>

              <Select value={imageModel} onValueChange={onImageModelChange}>
                <SelectTrigger label="Image Model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leonardo">Leonardo AI</SelectItem>
                  <SelectItem value="grok-imagine-image">Grok — grok-imagine-image</SelectItem>
                  <SelectItem value="gpt-image-1">OpenAI — gpt-image-1</SelectItem>
                  <SelectItem value="gpt-image-1-mini">OpenAI — gpt-image-1-mini</SelectItem>
                  <SelectItem value="gpt-image-1.5">OpenAI — gpt-image-1.5</SelectItem>
                  <SelectItem value="modelslab:flux">
                    Flux (ModelsLab)
                  </SelectItem>
                  <SelectItem value="modelslab:flux-2-pro">
                    Flux 2 Pro (ModelsLab)
                  </SelectItem>
                  <SelectItem value="imagen-4">Imagen 4</SelectItem>
                  <SelectItem value="imagen-4-ultra">Imagen 4 Ultra</SelectItem>
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
            <SceneEditorSection
              sentences={sentences}
              isShortVideo={isShortVideo}
              sceneDurationSecondsByIndex={sceneDurationSecondsByIndex}
              isGeneratingAllImages={isGeneratingAllImages}
              onGenerateAllImages={onGenerateAllImages}
              onSelectVideoFromLibrary={onSelectVideoFromLibrary}
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
              scriptEras={scriptEras}
              onScriptErasChange={onScriptErasChange}
              onSentenceForcedEraKeyChange={onSentenceForcedEraKeyChange}
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
              onPreviewImage={(url, effect, imageMotionEffect, imageMotionSpeed) => {
                setIsPreviewClosing(false);
                setPreviewImageUrl(url);
                setPreviewVisualEffect(effect ?? null);
                setPreviewImageMotionEffect(imageMotionEffect ?? 'default');
                setPreviewImageMotionSpeed(imageMotionSpeed ?? 1);
              }}
            />
          ) : (
            <EmptyScenesState />
          )}
          {previewImageUrl ? (
            <ImagePreviewOverlay
              previewImageUrl={previewImageUrl}
              visualEffect={previewVisualEffect}
              imageMotionEffect={previewImageMotionEffect}
              imageMotionSpeed={previewImageMotionSpeed}
              isPreviewClosing={isPreviewClosing}
              onRequestClose={() => {
                setIsPreviewClosing(true);
                setTimeout(() => {
                  setPreviewImageUrl(null);
                  setPreviewVisualEffect(null);
                  setPreviewImageMotionEffect(null);
                  setPreviewImageMotionSpeed(null);
                }, 200);
              }}
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
        onEnhanceImagePromptTextChange={setEnhanceImagePromptText}
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
