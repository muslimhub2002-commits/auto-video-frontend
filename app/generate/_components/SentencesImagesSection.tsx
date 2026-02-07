'use client';

import { useState, type ChangeEvent } from 'react';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Images,
} from 'lucide-react';
import { AlertDialog } from '@/components/ui/alert-dialog';

import type { SentenceItem } from '../_types/sentences';
import { useSentenceEnhancement } from '../_hooks/useSentenceEnhancement';
import { useEnhanceImagePrompt } from '../_hooks/useEnhanceImagePrompt';
import { ImagePreviewOverlay } from './sentences/ImagePreviewOverlay';
import { EnhanceWithPromptModal } from './sentences/EnhanceWithPromptModal';
import { EnhanceImagePromptModal } from './sentences/EnhanceImagePromptModal';
import { AddSuspenseSceneModal } from './sentences/AddSuspenseSceneModal';
import { EmptyScenesState } from './sentences/EmptyScenesState';
import { SceneEditorSection } from './sentences/SceneEditorSection';

type SentencesImagesSectionProps = {
  sentences: SentenceItem[];
  isGeneratingAllImages: boolean;
  onGenerateAllImages?: (() => void) | (() => Promise<void>);
  onSentenceTextChange: (index: number, next: string) => void;
  onSentenceMediaModeChange: (index: number, mode: 'single' | 'frames') => void;
  onSentenceImageUpload: (index: number, e: ChangeEvent<HTMLInputElement>) => void;
  onSentenceFrameImageUpload: (
    index: number,
    which: 'start' | 'end',
    e: ChangeEvent<HTMLInputElement>,
  ) => void;
  onGenerateSentenceImage: (index: number, promptOverride?: string) => void | Promise<void>;
  onGenerateSentenceFrameImage?: (
    index: number,
    which: 'start' | 'end',
  ) => void | Promise<void>;
  onGenerateSentenceVideo?: (index: number) => void | Promise<void>;
  onSelectFromLibrary: (index: number, which: 'single' | 'start' | 'end') => void;
  onSaveSentenceImage?: (index: number) => void | Promise<void>;
  onRemoveSentenceImage: (index: number) => void;
  onRemoveSentenceFrameImage: (index: number, which: 'start' | 'end') => void;
  onMergeSentenceIntoPrevious: (index: number) => void;
  onMergeSentenceIntoNext: (index: number) => void;
  onDeleteSentence: (index: number) => void;
  onAddSuspenseScene: (sourceIndex: number) => void;
  scriptStyle?: string | null;
  scriptTechnique?: string | null;
  scriptModel?: string | null;
  systemPrompt?: string | null;
  apiUrl?: string;
};

export function SentencesImagesSection({
  sentences,
  isGeneratingAllImages,
  onGenerateAllImages,
  onSentenceTextChange,
  onSentenceMediaModeChange,
  onSentenceImageUpload,
  onSentenceFrameImageUpload,
  onGenerateSentenceImage,
  onGenerateSentenceFrameImage,
  onGenerateSentenceVideo,
  onSelectFromLibrary,
  onRemoveSentenceImage,
  onRemoveSentenceFrameImage,
  onMergeSentenceIntoPrevious,
  onMergeSentenceIntoNext,
  onDeleteSentence,
  onAddSuspenseScene,
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
  const [isPreviewClosing, setIsPreviewClosing] = useState(false);

  const [isGeneratingVideoBySentenceId, setIsGeneratingVideoBySentenceId] = useState<Record<string, boolean>>({});

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

  const [isDeleteSentenceOpen, setIsDeleteSentenceOpen] = useState(false);
  const [deleteSentenceIndex, setDeleteSentenceIndex] = useState<number | null>(null);

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
          {sentences.length > 0 ? (
            <SceneEditorSection
              sentences={sentences}
              isGeneratingAllImages={isGeneratingAllImages}
              onGenerateAllImages={onGenerateAllImages}
              onOpenAddSuspense={() => {
                setSuspenseSelectedIndex(null);
                setSuspenseModalOpen(true);
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
              onGenerateSentenceFrameImage={onGenerateSentenceFrameImage}
              onGenerateSentenceVideo={onGenerateSentenceVideo}
              isGeneratingVideoBySentenceId={isGeneratingVideoBySentenceId}
              setIsGeneratingVideoBySentenceId={setIsGeneratingVideoBySentenceId}
              onSelectFromLibrary={onSelectFromLibrary}
              onRemoveSentenceImage={onRemoveSentenceImage}
              onRemoveSentenceFrameImage={onRemoveSentenceFrameImage}
              onPreviewImage={(url) => {
                setIsPreviewClosing(false);
                setPreviewImageUrl(url);
              }}
            />
          ) : (
            <EmptyScenesState />
          )}
          {previewImageUrl ? (
            <ImagePreviewOverlay
              previewImageUrl={previewImageUrl}
              isPreviewClosing={isPreviewClosing}
              onRequestClose={() => {
                setIsPreviewClosing(true);
                setTimeout(() => setPreviewImageUrl(null), 200);
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
