'use client';

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Loader2,
  Sparkles,
  FileText,
  Images,
  X,
  Image as ImageIcon,
  Library,
  Video as VideoIcon,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { AlertDialog } from '@/components/ui/alert-dialog';

export type SentenceItem = {
  id: string;
  text: string;
  image?: File | null;
  imageUrl?: string | null;
  video?: File | null;
  videoUrl?: string | null;
  imagePrompt?: string | null;
  isGeneratingImage?: boolean;
  isSavingImage?: boolean;
  savedImageId?: string | null;
  isFromLibrary?: boolean;
  isSuspense?: boolean;
};

interface SentencesImagesSectionProps {
  sentences: SentenceItem[];
  onSentenceImageUpload: (index: number, e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveSentenceImage: (index: number) => void;
  onDeleteSentence: (index: number) => void;
  onGenerateSentenceImage: (index: number, promptOverride?: string) => void | Promise<void>;
  onGenerateAllImages?: () => void;
  isGeneratingAllImages?: boolean;
  onSentenceTextChange: (index: number, text: string) => void;
  onMergeSentenceIntoPrevious: (index: number) => void;
  onMergeSentenceIntoNext: (index: number) => void;
  onSaveSentenceImage: (index: number) => void;
  onSelectFromLibrary: (index: number) => void;

  // Copies a selected sentence/media and inserts it as the first scene.
  onAddSuspenseScene: (sourceIndex: number) => void;

  // Optional: keep sentence enhancement consistent with Script enhance settings.
  scriptStyle?: string;
  scriptModel?: string;
  systemPrompt?: string;

  // Base URL for backend streaming endpoints (must match GeneratePageInner's API_URL).
  apiUrl?: string;
}

export function SentencesImagesSection({
  sentences,
  onSentenceImageUpload,
  onRemoveSentenceImage,
  onDeleteSentence,
  onGenerateSentenceImage,
  onGenerateAllImages,
  isGeneratingAllImages,
  onSentenceTextChange,
  onMergeSentenceIntoPrevious,
  onMergeSentenceIntoNext,
  onSelectFromLibrary,
  onSaveSentenceImage,
  onAddSuspenseScene,
  scriptStyle,
  scriptModel,
  systemPrompt,
  apiUrl,
}: SentencesImagesSectionProps) {
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isPreviewClosing, setIsPreviewClosing] = useState(false);

  const [isDeleteSentenceOpen, setIsDeleteSentenceOpen] = useState(false);
  const [deleteSentenceIndex, setDeleteSentenceIndex] = useState<number | null>(null);

  const API_URL = apiUrl || 'http://localhost:3000';

  const [enhancingById, setEnhancingById] = useState<Record<string, boolean>>({});
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [promptTargetIndex, setPromptTargetIndex] = useState<number | null>(null);
  const [promptOriginalSentence, setPromptOriginalSentence] = useState('');
  const [promptEnhancedSentence, setPromptEnhancedSentence] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isApplyingPrompt, setIsApplyingPrompt] = useState(false);

  const [enhanceImagePromptModalOpen, setEnhanceImagePromptModalOpen] = useState(false);
  const [enhanceImagePromptTargetIndex, setEnhanceImagePromptTargetIndex] = useState<number | null>(null);
  const [enhanceImagePromptTargetId, setEnhanceImagePromptTargetId] = useState<string | null>(null);
  const [enhanceImagePromptText, setEnhanceImagePromptText] = useState('');
  const [applyingImagePromptById, setApplyingImagePromptById] = useState<Record<string, boolean>>({});
  const [imagePromptErrorById, setImagePromptErrorById] = useState<Record<string, string | null>>({});
  const [enhanceImagePromptError, setEnhanceImagePromptError] = useState<string | null>(null);

  const [suspenseModalOpen, setSuspenseModalOpen] = useState(false);
  const [suspenseSelectedIndex, setSuspenseSelectedIndex] = useState<number | null>(null);

  const [isSuspenseNoMediaAlertOpen, setIsSuspenseNoMediaAlertOpen] = useState(false);

  const openEnhanceImagePromptModal = (index: number) => {
    const item = sentences[index];
    if (!item) return;

    setEnhanceImagePromptError(null);
    setEnhanceImagePromptTargetIndex(index);
    setEnhanceImagePromptTargetId(item.id);
    setEnhanceImagePromptText(item.imagePrompt ?? '');
    setEnhanceImagePromptModalOpen(true);
  };

  const applyEnhanceImagePrompt = async () => {
    if (enhanceImagePromptTargetIndex === null) return;
    if (!enhanceImagePromptTargetId) return;
    const prompt = enhanceImagePromptText.trim();
    if (!prompt) return;

    setEnhanceImagePromptError(null);
    setEnhanceImagePromptModalOpen(false);
    setEnhanceImagePromptTargetIndex(null);
    setEnhanceImagePromptTargetId(null);

    setApplyingImagePromptById((prev) => ({ ...prev, [enhanceImagePromptTargetId]: true }));
    setImagePromptErrorById((prev) => ({ ...prev, [enhanceImagePromptTargetId]: null }));

    try {
      await Promise.resolve(
        onGenerateSentenceImage(enhanceImagePromptTargetIndex, prompt),
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Enhance image prompt failed', error);
      setImagePromptErrorById((prev) => ({
        ...prev,
        [enhanceImagePromptTargetId]:
          'Failed to regenerate image with your prompt. Please try again.',
      }));
    } finally {
      setApplyingImagePromptById((prev) => ({ ...prev, [enhanceImagePromptTargetId]: false }));
    }
  };

  const streamEnhanceSentence = async (options: {
    sentence: string;
    userPrompt?: string;
    onChunk: (chunk: string) => void;
  }) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60_000);

    const res = await fetch(`${API_URL}/ai/enhance-sentence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        sentence: options.sentence,
        style: scriptStyle,
        model: scriptModel,
        systemPrompt: systemPrompt?.trim() ? systemPrompt.trim() : undefined,
        userPrompt: options.userPrompt?.trim() ? options.userPrompt.trim() : undefined,
      }),
    });

    window.clearTimeout(timeout);

    if (!res.ok || !res.body) {
      throw new Error('Failed to start sentence enhancement');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) options.onChunk(chunk);
    }
  };

  const handleEnhanceSentenceWithAi = async (index: number) => {
    const item = sentences[index];
    const base = item?.text?.trim();
    if (!item?.id || !base) return;

    setEnhanceError(null);
    setEnhancingById((prev) => ({ ...prev, [item.id]: true }));

    try {
      // Keep the existing sentence visible until we actually start receiving chunks.
      let nextText = '';
      let started = false;

      await streamEnhanceSentence({
        sentence: base,
        onChunk: (chunk) => {
          if (!started) {
            started = true;
            nextText = '';
            onSentenceTextChange(index, '');
          }
          nextText += chunk;
          onSentenceTextChange(index, nextText);
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Enhance sentence failed', error);
      setEnhanceError('Failed to enhance sentence. Please try again.');
      onSentenceTextChange(index, item.text);
    } finally {
      setEnhancingById((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const openPromptEnhanceModal = (index: number) => {
    const item = sentences[index];
    const base = item?.text ?? '';
    setEnhanceError(null);
    setPromptTargetIndex(index);
    setPromptOriginalSentence(base);
    setPromptEnhancedSentence(base);
    setUserPrompt('');
    setPromptModalOpen(true);
  };

  const applyPromptEnhancement = async () => {
    if (promptTargetIndex === null) return;
    const current = promptEnhancedSentence.trim();
    if (!current) return;

    setEnhanceError(null);
    setIsApplyingPrompt(true);

    try {
      let nextText = '';
      setPromptEnhancedSentence('');

      await streamEnhanceSentence({
        sentence: current,
        userPrompt,
        onChunk: (chunk) => {
          nextText += chunk;
          setPromptEnhancedSentence(nextText);
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Enhance with prompt failed', error);
      setEnhanceError('Failed to enhance with your prompt. Please try again.');
      setPromptEnhancedSentence(current);
    } finally {
      setIsApplyingPrompt(false);
    }
  };

  const acceptPromptEnhancement = () => {
    if (promptTargetIndex === null) return;
    const finalText = promptEnhancedSentence.trim();
    if (!finalText) return;
    onSentenceTextChange(promptTargetIndex, finalText);
    setPromptModalOpen(false);
    setPromptTargetIndex(null);
  };

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
        <div className="space-y-6 pb-2">
          {sentences.length > 0 ? (
            <div className="space-y-5">
              {/* Header Section */}
              <div className="bg-linear-to-br from-blue-50 to-indigo-50/50 rounded-lg p-5 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                      <div className="w-1 h-4 bg-primary rounded-full"></div>
                      Sentence Gallery
                    </h4>
                    <p className="text-xs text-gray-600">
                      Upload or generate AI images for each sentence
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSuspenseSelectedIndex(null);
                        setSuspenseModalOpen(true);
                      }}
                      disabled={sentences.length === 0}
                      className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 shadow-sm"
                      title="Copy one existing scene and insert it at the beginning"
                    >
                      <VideoIcon className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">Add Suspense Scene</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={onGenerateAllImages}
                      disabled={!onGenerateAllImages || isGeneratingAllImages}
                      className="gap-2 bg-linear-to-r from-purple-500 to-indigo-600 text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isGeneratingAllImages ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span className="text-xs font-medium">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Generate All Images</span>
                        </>
                      )}
                    </Button>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-blue-200">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">
                        {sentences.filter((s) => s.image || s.imageUrl || s.video || s.videoUrl).length} / {sentences.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sentences List */}
              <div className="space-y-4 pr-2 custom-scrollbar">
                {sentences.map((item, index) => {
                  const isEnhancing = Boolean(enhancingById[item.id]);
                  const isVideo = Boolean(item.video || item.videoUrl);
                  const isApplyingImagePrompt = Boolean(applyingImagePromptById[item.id]);
                  const imagePromptError = imagePromptErrorById[item.id];

                  return (
                    <div
                      key={item.id}
                      className="group relative bg-white rounded-xl border-2 border-gray-200 hover:border-primary/30 p-4 transition-all duration-200 hover:shadow-lg"
                    >
                      {item.isSuspense ? (
                        <div className="absolute bottom-3 left-3 z-10">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-600 text-white text-[10px] font-bold shadow-md">
                            <VideoIcon className="h-3 w-3" />
                            Suspense
                          </span>
                        </div>
                      ) : null}
                      <div className="flex flex-col lg:flex-row gap-4">
                        {/* Text Content */}
                        <div className="flex-1 pt-2">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-primary mt-2.5 shrink-0" />
                            <textarea
                              value={item.text}
                              onChange={(e) => onSentenceTextChange(index, e.target.value)}
                              className="flex-1 text-sm text-gray-700 leading-relaxed bg-transparent border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none transition-all duration-200 hover:border-gray-300"
                              rows={4}
                              placeholder="Enter sentence text..."
                            />
                          </div>

                          <div className="mt-4 space-y-3 pl-6">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                disabled={index === 0}
                                onClick={() => onMergeSentenceIntoPrevious(index)}
                                className="gap-2 text-xs font-semibold bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                                title="Merge this sentence into the previous one"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                                Merge Up
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                disabled={index === sentences.length - 1}
                                onClick={() => onMergeSentenceIntoNext(index)}
                                className="gap-2 text-xs font-semibold bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                                title="Merge this sentence into the next one"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                                Merge Down
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                disabled={item.videoUrl === '/subscribe.mp4'}
                                onClick={() => {
                                  setDeleteSentenceIndex(index);
                                  setIsDeleteSentenceOpen(true);
                                }}
                                className="gap-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                                title={item.videoUrl === '/subscribe.mp4' ? 'This scene cannot be deleted' : 'Delete this sentence and its media'}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="gap-2 text-xs font-semibold bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition-all shadow-sm hover:shadow text-white"
                                title="Enhance this sentence with AI"
                                onClick={() => handleEnhanceSentenceWithAi(index)}
                                disabled={isEnhancing || isApplyingPrompt}
                              >
                                {isEnhancing ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Enhancing...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Enhance With AI
                                  </>
                                )}
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                className="gap-2 text-xs font-semibold bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all shadow-sm hover:shadow"
                                title="Enhance this sentence with your custom prompt"
                                onClick={() => openPromptEnhanceModal(index)}
                                disabled={isEnhancing || isApplyingPrompt}
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Enhance With Your Prompt
                              </Button>
                            </div>

                            {enhanceError ? (
                              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                                <p className="text-xs text-red-700 font-medium">{enhanceError}</p>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Image Section */}
                        <div className="lg:w-64 space-y-3">
                          {/* Upload/Generate Area */}
                          {!(item.image || item.imageUrl || item.video || item.videoUrl) && (
                            <div
                              className="bg-linear-to-br from-gray-50 to-gray-100/50 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center space-y-3 hover:border-primary/50 transition-all duration-200 cursor-pointer"
                              onClick={() => document.getElementById(`sentence-image-${item.id}`)?.click()}
                            >
                              <div className="flex flex-col items-center gap-2 pointer-events-none">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                                <input
                                  type="file"
                                  id={`sentence-image-${item.id}`}
                                  accept="image/*,video/*"
                                  onChange={(e) => onSentenceImageUpload(index, e)}
                                  className="hidden"
                                />
                                <span className="text-xs font-medium text-gray-600">
                                  Click to upload image or video
                                </span>
                              </div>

                              <div className="relative pointer-events-none">
                                <div className="absolute inset-0 flex items-center">
                                  <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                  <span className="bg-gray-50 px-2 text-gray-500">or</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pointer-events-auto">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onGenerateSentenceImage(index);
                                  }}
                                  disabled={item.isGeneratingImage}
                                  className="gap-1.5 bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all duration-200"
                                >
                                  {item.isGeneratingImage ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      <span className="text-[10px]">Generating...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-3 w-3" />
                                      <span className="text-[10px] font-medium">Generate AI</span>
                                    </>
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectFromLibrary(index);
                                  }}
                                  className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                                >
                                  <Library className="h-3 w-3" />
                                  <span className="text-[10px] font-medium">From Library</span>
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Media Preview (image or video) */}
                          {(item.image || item.imageUrl || item.video || item.videoUrl) && (
                            <div className="space-y-2">
                              <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-md group/img">
                                {item.video || item.videoUrl ? (
                                  <video
                                    src={
                                      item.video
                                        ? URL.createObjectURL(item.video)
                                        : (item.videoUrl as string)
                                    }
                                    controls
                                    className="w-full h-48 object-cover"
                                  />
                                ) : (
                                  <img
                                    src={
                                      item.image
                                        ? URL.createObjectURL(item.image)
                                        : (item.imageUrl as string)
                                    }
                                    alt={`Sentence ${index + 1} image`}
                                    className="w-full h-48 object-cover transition-transform duration-200 group-hover/img:scale-105 cursor-zoom-in"
                                    onClick={() => {
                                      setIsPreviewClosing(false);
                                      setPreviewImageUrl(
                                        item.image
                                          ? URL.createObjectURL(item.image)
                                          : (item.imageUrl as string),
                                      );
                                    }}
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={() => onRemoveSentenceImage(index)}
                                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                                {item.imageUrl && !item.image && !item.video && !item.videoUrl && (
                                  <div className="absolute bottom-2 left-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/90 text-white text-[10px] font-medium rounded-full shadow-sm">
                                      <Sparkles className="h-2.5 w-2.5" />
                                      AI Generated
                                    </span>
                                  </div>
                                )}
                              </div>

                              {item.imagePrompt && (
                                <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                  <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-2">
                                    <span className="font-semibold text-gray-700">Prompt:</span> {item.imagePrompt}
                                  </p>
                                </div>
                              )}

                              <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onSelectFromLibrary(index)}
                                    disabled={item.isSavingImage || item.isGeneratingImage || isApplyingImagePrompt}
                                    className={`${isVideo ? 'w-full' : 'flex-1'} gap-1.5 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300`}
                                  >
                                    <Library className="h-3 w-3" />
                                    Change
                                  </Button>
                                  {!isVideo ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onGenerateSentenceImage(index)}
                                      disabled={item.isGeneratingImage || isApplyingImagePrompt}
                                      className="flex-1 gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                                    >
                                      <Sparkles className="h-3 w-3" />
                                      Regenerate
                                    </Button>
                                  ) : null}
                                </div>
                                {!isVideo ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => openEnhanceImagePromptModal(index)}
                                    disabled={item.isGeneratingImage || isApplyingImagePrompt}
                                    className="w-full gap-1.5 text-xs font-semibold bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {isApplyingImagePrompt ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Regenerating...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-3 w-3" />
                                        Enhance Prompt
                                      </>
                                    )}
                                  </Button>
                                ) : null}

                                {imagePromptError ? (
                                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                                    <p className="text-[11px] text-red-700 font-medium">{imagePromptError}</p>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-linear-to-br from-gray-50 to-gray-100/50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-white rounded-full shadow-sm">
                  <Images className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">No sentences yet</p>
                  <p className="text-xs text-gray-500">
                    Write a script and click "Split into Sentences" to continue
                  </p>
                </div>
              </div>
            </div>
          )}
          {previewImageUrl && (
            <div
              className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 ${isPreviewClosing
                ? 'animate-out fade-out-0 duration-200'
                : 'animate-in fade-in-0 duration-200'
                }`}
              onClick={() => {
                setIsPreviewClosing(true);
                setTimeout(() => setPreviewImageUrl(null), 200);
              }}
            >
              <div
                className={`relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center ${isPreviewClosing
                  ? 'animate-out zoom-out-95 fade-out-0 duration-200'
                  : 'animate-in zoom-in-95 fade-in-0 duration-200'
                  }`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewClosing(true);
                    setTimeout(() => setPreviewImageUrl(null), 200);
                  }}
                  className="absolute -top-3 -right-3 p-2 rounded-full bg-white text-gray-800 shadow-lg hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
                <img
                  src={previewImageUrl}
                  alt="Sentence full preview"
                  className="max-h-[80vh] w-auto max-w-full rounded-lg shadow-2xl object-contain bg-black/10"
                />
              </div>
            </div>
          )}
        </div>
      </AccordionContent>

      {/* Enhance With Prompt Modal */}
      {promptModalOpen ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-200"
          onClick={() => {
            if (isApplyingPrompt) return;
            setPromptModalOpen(false);
            setPromptTargetIndex(null);
          }}
        >
          <div
            className="w-full max-w-3xl rounded-3xl bg-linear-to-br from-white via-gray-50 to-blue-50/30 shadow-2xl border border-gray-200/50 overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Enhance With Your Prompt</h3>
                <p className="text-xs text-gray-600 mt-0.5">Write an instruction and apply it to this sentence</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isApplyingPrompt) return;
                  setPromptModalOpen(false);
                  setPromptTargetIndex(null);
                }}
                className="p-2 hover:bg-white/80 rounded-xl transition-all hover:scale-105"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide overscroll-contain touch-pan-y">
              {enhanceError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700 font-medium">{enhanceError}</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-700 mb-2">Sentence</p>
                <textarea
                  value={promptEnhancedSentence}
                  readOnly
                  className="w-full text-sm text-gray-800 leading-relaxed bg-gray-50/60 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none resize-none cursor-not-allowed"
                  rows={4}
                />
                {promptOriginalSentence && promptOriginalSentence !== promptEnhancedSentence ? (
                  <p className="text-[11px] text-gray-500 mt-2">
                    Updated from original
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-700 mb-2">Your Prompt</p>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="w-full text-sm text-gray-800 leading-relaxed bg-transparent border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 resize-none"
                  rows={3}
                  placeholder="e.g., Make it more dramatic, shorter, and add urgency."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200/80 bg-white/80 flex items-center justify-between gap-3">
              <p className="text-[11px] text-gray-500">
                Tip: You can Apply multiple times, then Done when satisfied.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (isApplyingPrompt) return;
                    setPromptModalOpen(false);
                    setPromptTargetIndex(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={applyPromptEnhancement}
                  disabled={isApplyingPrompt || !promptEnhancedSentence.trim()}
                  className="gap-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  {isApplyingPrompt ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Apply
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={acceptPromptEnhancement}
                  disabled={isApplyingPrompt || !promptEnhancedSentence.trim()}
                  className="gap-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Enhance Image Prompt Modal */}
      {enhanceImagePromptModalOpen ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-200"
          onClick={() => {
            // Modal closes instantly on Done; this just prevents accidental closes while typing.
            setEnhanceImagePromptModalOpen(false);
            setEnhanceImagePromptTargetIndex(null);
            setEnhanceImagePromptTargetId(null);
          }}
        >
          <div
            className="w-full max-w-3xl rounded-3xl bg-linear-to-br from-white via-gray-50 to-pink-50/30 shadow-2xl border border-gray-200/50 overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-200/80 bg-linear-to-r from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Enhance Image Prompt</h3>
                <p className="text-xs text-gray-600 mt-0.5">Edit the prompt, then regenerate the image</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEnhanceImagePromptModalOpen(false);
                  setEnhanceImagePromptTargetIndex(null);
                  setEnhanceImagePromptTargetId(null);
                }}
                className="p-2 hover:bg-white/80 rounded-xl transition-all hover:scale-105"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide overscroll-contain touch-pan-y">
              {enhanceImagePromptError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700 font-medium">{enhanceImagePromptError}</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-700 mb-2">Prompt</p>
                <textarea
                  value={enhanceImagePromptText}
                  onChange={(e) => setEnhanceImagePromptText(e.target.value)}
                  className="w-full text-sm text-gray-800 leading-relaxed bg-transparent border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 resize-none"
                  rows={6}
                  placeholder="Describe the image you want..."
                />
                <p className="text-[11px] text-gray-500 mt-2">
                  Tip: Keep it descriptive (scene, mood, lighting, style).
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200/80 bg-white/80 flex items-center justify-between gap-3">
              <p className="text-[11px] text-gray-500">
                This will regenerate the image using your prompt.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEnhanceImagePromptModalOpen(false);
                    setEnhanceImagePromptTargetIndex(null);
                    setEnhanceImagePromptTargetId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={applyEnhanceImagePrompt}
                  disabled={!enhanceImagePromptText.trim()}
                  className="gap-2 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Add Suspense Scene Modal */}
      {suspenseModalOpen ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-200"
          onClick={() => setSuspenseModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl rounded-3xl bg-linear-to-br from-white via-purple-50/20 to-indigo-50/30 shadow-2xl border border-purple-200/50 overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-6 border-b border-purple-200/60 bg-linear-to-r from-purple-100 via-indigo-100 to-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-linear-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-lg">
                    <VideoIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      Add Suspense Scene
                      <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full">
                        NEW
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Select a scene to duplicate as your opening suspense hook
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSuspenseModalOpen(false)}
                  className="p-2.5 hover:bg-white/80 rounded-xl transition-all hover:scale-105 hover:rotate-90 duration-200"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3 max-h-[65vh] overflow-y-auto scrollbar-hide overscroll-contain touch-pan-y">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Pro Tip</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Choose an impactful scene to hook your viewers. The selected scene will be duplicated and placed at the start while keeping the original intact.
                    </p>
                  </div>
                </div>
              </div>

              {sentences.map((s, idx) => {
                const selected = suspenseSelectedIndex === idx;
                const hasVideo = Boolean(s.video || s.videoUrl);
                const hasImage = Boolean(s.image || s.imageUrl);
                const hasMedia = hasImage || hasVideo;
                const mediaUrl = hasVideo
                  ? s.video
                    ? URL.createObjectURL(s.video)
                    : (s.videoUrl as string)
                  : hasImage
                    ? s.image
                      ? URL.createObjectURL(s.image)
                      : (s.imageUrl as string)
                    : null;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (!hasMedia) {
                        setIsSuspenseNoMediaAlertOpen(true);
                        return;
                      }
                      setSuspenseSelectedIndex(idx);
                    }}
                    className={`group w-full text-left rounded-2xl border-2 p-4 transition-all ${selected
                      ? 'border-purple-400 bg-linear-to-br from-purple-50 to-indigo-50 shadow-lg scale-[1.02]'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md hover:scale-[1.01]'
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-28 h-20 rounded-xl overflow-hidden border-2 transition-all ${selected
                            ? 'border-purple-400 shadow-lg'
                            : 'border-gray-200 group-hover:border-purple-300'
                            }`}
                        >
                          {mediaUrl ? (
                            hasVideo ? (
                              <div className="relative w-full h-full">
                                <video
                                  src={mediaUrl}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <div className="p-2 bg-white/90 rounded-full">
                                    <VideoIcon className="h-4 w-4 text-gray-700" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <img
                                src={mediaUrl}
                                alt={`Scene ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )
                          ) : (
                            <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                              <FileText className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div
                          className={`absolute -top-2 -left-2 h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-md ${selected
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-700 border-gray-300'
                            }`}
                        >
                          {idx + 1}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold mb-2 line-clamp-2 leading-relaxed ${selected ? 'text-purple-900' : 'text-gray-900'
                          }`}>
                          {s.text?.trim() || 'Untitled scene'}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {hasImage && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 text-[11px] font-bold">
                              <ImageIcon className="h-3 w-3" />
                              Image
                            </span>
                          )}
                          {hasVideo && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 border border-blue-300 text-[11px] font-bold">
                              <VideoIcon className="h-3 w-3" />
                              Video
                            </span>
                          )}
                          {!hasImage && !hasVideo && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-[11px] font-bold">
                              <FileText className="h-3 w-3" />
                              Text Only
                            </span>
                          )}
                          
                          {s.isSuspense ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-600 text-white border border-purple-700 text-[11px] font-bold">
                              <VideoIcon className="h-3 w-3" />
                              Current Suspense Scene
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      <div
                        className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${selected
                          ? 'bg-purple-600 border-purple-600 scale-110'
                          : 'bg-white border-gray-300 group-hover:border-purple-400'
                          }`}
                      >
                        {selected && (
                          <svg
                            className="h-3.5 w-3.5 text-white animate-in zoom-in duration-150"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.42 0l-3.2-3.2a1 1 0 011.42-1.42l2.49 2.49 6.49-6.49a1 1 0 011.42 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-8 py-5 border-t border-purple-200/60 bg-linear-to-r from-white via-purple-50/30 to-indigo-50/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></div>
                <p className="text-xs text-gray-600 font-medium">
                  {suspenseSelectedIndex !== null ? (
                    <span className="text-purple-700 font-semibold">
                      Scene {suspenseSelectedIndex + 1} selected
                    </span>
                  ) : (
                    'Select a scene to continue'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSuspenseModalOpen(false)}
                  className="border-gray-300 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={suspenseSelectedIndex === null}
                  onClick={() => {
                    if (suspenseSelectedIndex === null) return;

                    const selectedSentence = sentences[suspenseSelectedIndex];
                    const canUse = Boolean(
                      selectedSentence &&
                      (selectedSentence.image || selectedSentence.imageUrl || selectedSentence.video || selectedSentence.videoUrl),
                    );
                    if (!canUse) {
                      setIsSuspenseNoMediaAlertOpen(true);
                      return;
                    }

                    onAddSuspenseScene(suspenseSelectedIndex);
                    setSuspenseModalOpen(false);
                  }}
                  className="gap-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-4 w-4" />
                  Add As Opening Scene
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
