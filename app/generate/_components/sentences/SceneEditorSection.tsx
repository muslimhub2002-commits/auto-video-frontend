'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Images, Video as VideoIcon } from 'lucide-react';

import type { SentenceItem } from '../../_types/sentences';
import { SentenceEditorCard } from './SentenceEditorCardGrid';

type SceneEditorSectionProps = {
  sentences: SentenceItem[];
  isGeneratingAllImages: boolean;
  onGenerateAllImages?: (() => void) | (() => Promise<void>);

  onOpenAddSuspense: () => void;

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
  onGenerateSentenceFrameImage?: (index: number, which: 'start' | 'end') => void | Promise<void>;

  onGenerateSentenceVideo?: (index: number) => void | Promise<void>;
  isGeneratingVideoBySentenceId: Record<string, boolean>;
  setIsGeneratingVideoBySentenceId: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  onSelectFromLibrary: (index: number, which: 'single' | 'start' | 'end') => void;
  onRemoveSentenceImage: (index: number) => void;
  onRemoveSentenceFrameImage: (index: number, which: 'start' | 'end') => void;

  onPreviewImage: (url: string) => void;
};

export function SceneEditorSection({
  sentences,
  isGeneratingAllImages,
  onGenerateAllImages,
  onOpenAddSuspense,

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
  onGenerateSentenceFrameImage,

  onGenerateSentenceVideo,
  isGeneratingVideoBySentenceId,
  setIsGeneratingVideoBySentenceId,

  onSelectFromLibrary,
  onRemoveSentenceImage,
  onRemoveSentenceFrameImage,

  onPreviewImage,
}: SceneEditorSectionProps) {
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
              onClick={onOpenAddSuspense}
              disabled={sentences.length === 0}
              className="gap-2 h-10 px-4 border-purple-200 bg-white text-purple-700 hover:bg-purple-50 hover:border-purple-300 shadow-sm hover:shadow transition-all"
              title="Copy one existing scene and insert it at the beginning"
            >
              <VideoIcon className="h-4 w-4" />
              <span className="text-sm font-semibold">Add Suspense</span>
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
                  <span className="text-sm font-semibold">Generate All</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Sentences List */}
      <div className="space-y-4">
        {sentences.map((item, index) => {
          const isEnhancing = Boolean(enhancingById[item.id]);
          const isApplyingImagePrompt = Boolean(applyingImagePromptById[item.id]);
          const imagePromptError = imagePromptErrorById[item.id];

          return (
            <SentenceEditorCard
              key={item.id}
              item={item}
              index={index}
              isFirst={index === 0}
              isLast={index === sentences.length - 1}
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
              onSentenceFrameImageUpload={(which, e) => onSentenceFrameImageUpload(index, which, e)}
              onGenerateSentenceImage={() => onGenerateSentenceImage(index)}
              onGenerateSentenceFrameImage={
                onGenerateSentenceFrameImage
                  ? (which) => onGenerateSentenceFrameImage(index, which)
                  : undefined
              }
              onSelectFromLibrary={(which) => onSelectFromLibrary(index, which)}
              onRemoveSentenceImage={() => onRemoveSentenceImage(index)}
              onRemoveSentenceFrameImage={(which) => onRemoveSentenceFrameImage(index, which)}
              onOpenEnhanceImagePromptModal={() => onOpenEnhanceImagePromptModal(index)}
              isApplyingImagePrompt={isApplyingImagePrompt}
              imagePromptError={imagePromptError}
              isGeneratingVideo={Boolean(isGeneratingVideoBySentenceId[item.id])}
              onGenerateVideo={
                onGenerateSentenceVideo
                  ? async (canGenerateVideo) => {
                      if (!canGenerateVideo || item.videoUrl === '/subscribe.mp4') return;

                      setIsGeneratingVideoBySentenceId((prev) => ({
                        ...prev,
                        [item.id]: true,
                      }));

                      try {
                        await Promise.resolve(onGenerateSentenceVideo(index));
                      } finally {
                        setIsGeneratingVideoBySentenceId((prev) => ({
                          ...prev,
                          [item.id]: false,
                        }));
                      }
                    }
                  : undefined
              }
              onPreviewImage={onPreviewImage}
            />
          );
        })}
      </div>
    </div>
  );
}
