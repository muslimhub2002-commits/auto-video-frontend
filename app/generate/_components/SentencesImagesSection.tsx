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
import { EmptyScenesState } from './sentences/EmptyScenesState';
import { SceneEditorSection } from './sentences/SceneEditorSection';

type ScriptCharacter = {
  key: string;
  name: string;
  description: string;
  isSahaba: boolean;
  isProphet: boolean;
  isWoman: boolean;
};

type SentencesImagesSectionProps = {
  sentences: SentenceItem[];
  isGeneratingAllImages: boolean;
  onGenerateAllImages?: (() => void) | (() => Promise<void>);

  scriptCharacters: ScriptCharacter[];
  onScriptCharactersChange: (next: ScriptCharacter[]) => void;
  onSentenceForcedCharacterKeysChange: (index: number, next: string[] | null) => void;
  imagePromptModel: string;
  onImagePromptModelChange: (value: string) => void;
  imageModel: string;
  onImageModelChange: (value: string) => void;
  imageStyle: string;
  onImageStyleChange: (value: string) => void;
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

  scriptCharacters,
  onScriptCharactersChange,
  onSentenceForcedCharacterKeysChange,
  imagePromptModel,
  onImagePromptModelChange,
  imageModel,
  onImageModelChange,
  imageStyle,
  onImageStyleChange,
  onInsertEmptySentenceAfter,
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

  const IMAGE_STYLE_OPTIONS: { value: string; label: string }[] = [
    { value: 'anime', label: 'Anime' },
    { value: 'realism', label: 'Realism' },
    { value: 'cinematic', label: 'Cinematic' },
    { value: '3d', label: '3D Render' },
    { value: 'watercolor', label: 'Watercolor' },
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

          {sentences.length > 0 ? (
            <SceneEditorSection
              sentences={sentences}
              isGeneratingAllImages={isGeneratingAllImages}
              onGenerateAllImages={onGenerateAllImages}
              scriptCharacters={scriptCharacters}
              onScriptCharactersChange={onScriptCharactersChange}
              onSentenceForcedCharacterKeysChange={onSentenceForcedCharacterKeysChange}
              onInsertEmptySentenceAfter={onInsertEmptySentenceAfter}
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
