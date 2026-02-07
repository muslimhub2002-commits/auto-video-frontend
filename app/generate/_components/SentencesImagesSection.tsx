'use client';

import { useState, type ChangeEvent, useEffect } from 'react';
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
  mediaMode?: 'single' | 'frames';
  sceneTab?: 'image' | 'video';
  image?: File | null;
  imageUrl?: string | null;
  video?: File | null;
  videoUrl?: string | null;
  savedVideoId?: string | null;
  startImage?: File | null;
  startImageUrl?: string | null;
  startImagePrompt?: string | null;
  startSavedImageId?: string | null;
  endImage?: File | null;
  endImageUrl?: string | null;
  endImagePrompt?: string | null;
  endSavedImageId?: string | null;
  imagePrompt?: string | null;
  isGeneratingImage?: boolean;
  isGeneratingStartImage?: boolean;
  isGeneratingEndImage?: boolean;
  isSavingImage?: boolean;
  savedImageId?: string | null;
  isFromLibrary?: boolean;
  isSuspense?: boolean;
};

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

type StreamEnhanceSentenceArgs = {
  sentence: string;
  userPrompt?: string;
  onChunk: (chunk: string) => void;
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

  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [enhancingById, setEnhancingById] = useState<Record<string, boolean>>({});
  const [enhanceMenuOpenById, setEnhanceMenuOpenById] = useState<Record<string, boolean>>({});

  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [promptTargetIndex, setPromptTargetIndex] = useState<number | null>(null);
  const [promptOriginalSentence, setPromptOriginalSentence] = useState('');
  const [promptEnhancedSentence, setPromptEnhancedSentence] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isApplyingPrompt, setIsApplyingPrompt] = useState(false);

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isPreviewClosing, setIsPreviewClosing] = useState(false);

  const [isGeneratingVideoBySentenceId, setIsGeneratingVideoBySentenceId] = useState<Record<string, boolean>>({});

  const [applyingImagePromptById, setApplyingImagePromptById] = useState<Record<string, boolean>>({});
  const [imagePromptErrorById, setImagePromptErrorById] = useState<Record<string, string | undefined>>({});

  const [enhanceImagePromptModalOpen, setEnhanceImagePromptModalOpen] = useState(false);
  const [enhanceImagePromptTargetIndex, setEnhanceImagePromptTargetIndex] = useState<number | null>(null);
  const [enhanceImagePromptTargetId, setEnhanceImagePromptTargetId] = useState<string | null>(null);
  const [enhanceImagePromptText, setEnhanceImagePromptText] = useState('');
  const [enhanceImagePromptError, setEnhanceImagePromptError] = useState<string | null>(null);

  const [suspenseModalOpen, setSuspenseModalOpen] = useState(false);
  const [suspenseSelectedIndex, setSuspenseSelectedIndex] = useState<number | null>(null);
  const [isSuspenseNoMediaAlertOpen, setIsSuspenseNoMediaAlertOpen] = useState(false);

  const [isDeleteSentenceOpen, setIsDeleteSentenceOpen] = useState(false);
  const [deleteSentenceIndex, setDeleteSentenceIndex] = useState<number | null>(null);

  const streamEnhanceSentence = async ({ sentence, userPrompt: prompt, onChunk }: StreamEnhanceSentenceArgs) => {
    const body = {
      sentence,
      userPrompt: prompt?.trim() ? prompt.trim() : undefined,
    } as const;

    const res = await fetch(`${API_URL}/ai/enhance-sentence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

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
      if (chunk) onChunk(chunk);
    }
  };

  const handleEnhanceSentenceWithAi = async (index: number) => {
    const item = sentences[index];
    const base = item?.text ?? '';
    if (!item?.id || !base.trim()) return;

    setEnhanceError(null);
    setEnhancingById((prev) => ({ ...prev, [item.id]: true }));
    setEnhanceMenuOpenById((prev) => ({ ...prev, [item.id]: false }));

    try {
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

  const openEnhanceImagePromptModal = (index: number) => {
    const item = sentences[index];
    if (!item?.id) return;

    setEnhanceImagePromptError(null);
    setEnhanceImagePromptTargetIndex(index);
    setEnhanceImagePromptTargetId(item.id);
    setEnhanceImagePromptText((item.imagePrompt ?? '').trim());
    setEnhanceImagePromptModalOpen(true);
  };

  const applyEnhanceImagePrompt = async () => {
    if (enhanceImagePromptTargetIndex === null || !enhanceImagePromptTargetId) return;
    const prompt = enhanceImagePromptText.trim();
    if (!prompt) return;

    setEnhanceImagePromptError(null);
    setImagePromptErrorById((prev) => ({ ...prev, [enhanceImagePromptTargetId]: undefined }));
    setApplyingImagePromptById((prev) => ({ ...prev, [enhanceImagePromptTargetId]: true }));

    try {
      await Promise.resolve(onGenerateSentenceImage(enhanceImagePromptTargetIndex, prompt));
      setEnhanceImagePromptModalOpen(false);
      setEnhanceImagePromptTargetIndex(null);
      setEnhanceImagePromptTargetId(null);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Enhance image prompt failed', error);
      const message = 'Failed to regenerate image with your prompt. Please try again.';
      setEnhanceImagePromptError(message);
      setImagePromptErrorById((prev) => ({ ...prev, [enhanceImagePromptTargetId]: message }));
    } finally {
      setApplyingImagePromptById((prev) => ({ ...prev, [enhanceImagePromptTargetId]: false }));
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
    // Close the enhance menu
    if (item?.id) {
      setEnhanceMenuOpenById((prev) => ({ ...prev, [item.id]: false }));
    }
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

  // Close enhance menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside any enhance menu
      if (!target.closest('[data-enhance-menu]') && !target.closest('[data-enhance-button]')) {
        setEnhanceMenuOpenById({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <div className="space-y-6">
              {/* Header Section */}
              <div className="bg-linear-to-br from-indigo-50 via-purple-50/40 to-white rounded-2xl p-6 border border-indigo-100/60 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                      <Images className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900 mb-0.5">
                        Scene Editor
                      </h4>
                      <p className="text-xs text-gray-600">
                        Craft your story with visuals for each sentence
                      </p>
                    </div>
                    <div className="ml-4 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-200 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm"></div>
                        <span className="text-sm font-bold text-gray-700">
                          {sentences.filter((s) =>
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
                          ).length}
                        </span>
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
                        setSuspenseSelectedIndex(null);
                        setSuspenseModalOpen(true);
                      }}
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
                  const hasAnyVideo = Boolean(item.video || item.videoUrl);
                  const hasAnyImage = Boolean(item.image || item.imageUrl);
                  const isApplyingImagePrompt = Boolean(applyingImagePromptById[item.id]);
                  const imagePromptError = imagePromptErrorById[item.id];
                  const mediaMode: 'single' | 'frames' = item.mediaMode ?? 'single';

                  const startPreviewUrl = item.startImage
                    ? URL.createObjectURL(item.startImage)
                    : item.startImageUrl;
                  const endPreviewUrl = item.endImage
                    ? URL.createObjectURL(item.endImage)
                    : item.endImageUrl;
                  const hasStart = Boolean(startPreviewUrl);
                  const hasEnd = Boolean(endPreviewUrl);
                  const canGenerateVideo = mediaMode === 'frames' && hasStart && hasEnd;

                  return (
                    <div
                      key={item.id}
                      className="group relative bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="grid lg:grid-cols-[1fr,320px] gap-4">
                          {/* Text Content Section */}
                          <div className="space-y-4">
                            {/* Sentence Text */}
                            <div className="flex items-start gap-3">
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="h-8 w-8 rounded-xl bg-linear-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                                  {index + 1}
                                </div>
                                {item.isSuspense && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-lg">
                                    <VideoIcon className="h-3.5 w-3.5" />
                                    Suspense
                                  </span>
                                )}
                              </div>
                              <div className="relative flex-1">
                                <div className="absolute top-3 left-3 z-10 p-1.5 bg-indigo-50 rounded-lg">
                                  <FileText className="h-4 w-4 text-indigo-600" />
                                </div>
                                <textarea
                                  value={item.text}
                                  onChange={(e) => onSentenceTextChange(index, e.target.value)}
                                  className="w-full pl-12 pr-4 py-3 text-sm text-gray-800 leading-relaxed bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
                                  rows={3}
                                  placeholder="Enter your sentence text here..."
                                />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                              {/* Primary Actions Row */}
                              <div className="flex flex-wrap gap-2">
                                {/* Merge Buttons */}
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={index === 0}
                                    onClick={() => onMergeSentenceIntoPrevious(index)}
                                    variant="outline"
                                    className="gap-2 h-8 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    title="Merge this sentence into the previous one"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                    <span className="text-xs font-semibold">Merge Up</span>
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={index === sentences.length - 1}
                                    onClick={() => onMergeSentenceIntoNext(index)}
                                    variant="outline"
                                    className="gap-2 h-8 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    title="Merge this sentence into the next one"
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                    <span className="text-xs font-semibold">Merge Down</span>
                                  </Button>
                                </div>

                                {/* Enhance Button with Dropdown */}
                                <div className="relative">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="gap-2 h-8 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-sm hover:shadow-md transition-all"
                                    title="Enhance this sentence"
                                    onClick={() => {
                                      setEnhanceMenuOpenById((prev) => ({
                                        ...prev,
                                        [item.id]: !prev[item.id],
                                      }));
                                    }}
                                    disabled={isEnhancing || isApplyingPrompt}
                                    data-enhance-button
                                  >
                                    {isEnhancing ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-xs font-semibold">Enhancing...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-4 w-4" />
                                        <span className="text-xs font-semibold">Enhance</span>
                                      </>
                                    )}
                                  </Button>

                                  {/* Enhance Menu Dropdown */}
                                  {enhanceMenuOpenById[item.id] && !isEnhancing && !isApplyingPrompt ? (
                                    <div
                                      className="absolute left-0 top-full mt-2 z-20 w-64 rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden"
                                      onClick={(e) => e.stopPropagation()}
                                      data-enhance-menu
                                    >
                                      <div className="p-2 space-y-1">
                                        <button
                                          type="button"
                                          onClick={() => handleEnhanceSentenceWithAi(index)}
                                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-linear-to-r hover:from-amber-50 hover:to-orange-50 transition-all group text-left"
                                        >
                                          <div className="p-2 bg-linear-to-br from-amber-100 to-orange-100 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                                            <Sparkles className="h-4 w-4 text-amber-600" />
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-900 group-hover:text-amber-700 transition-colors">
                                              Auto Enhance
                                            </p>
                                            <p className="text-xs text-gray-500 leading-tight mt-0.5">
                                              Let AI improve your text
                                            </p>
                                          </div>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openPromptEnhanceModal(index)}
                                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 transition-all group text-left"
                                        >
                                          <div className="p-2 bg-linear-to-br from-blue-100 to-indigo-100 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                                            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                              Custom Prompt
                                            </p>
                                            <p className="text-xs text-gray-500 leading-tight mt-0.5">
                                              Use your own instructions
                                            </p>
                                          </div>
                                        </button>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>

                                {/* Delete Button */}
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={item.videoUrl === '/subscribe.mp4'}
                                  onClick={() => {
                                    setDeleteSentenceIndex(index);
                                    setIsDeleteSentenceOpen(true);
                                  }}
                                  variant="outline"
                                  className="gap-2 h-8 ml-auto border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={item.videoUrl === '/subscribe.mp4' ? 'This scene cannot be deleted' : 'Delete this sentence and its media'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="text-xs font-semibold">Delete</span>
                                </Button>
                              </div>
                            </div>

                            {/* Error Message */}
                            {enhanceError && (
                              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
                                <div className="p-1 bg-red-100 rounded-lg shrink-0">
                                  <X className="h-4 w-4 text-red-600" />
                                </div>
                                <p className="text-xs text-red-700 font-medium flex-1">{enhanceError}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Media Section */}
                        <div className="space-y-4">
                          {/* Section Divider & Label */}
                          <div className="relative py-3">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t-2 border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center">
                              <div className="px-3 py-1 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Scene Media</p>
                              </div>
                            </div>
                          </div>

                          {/* Media Mode Toggle */}
                          <div className="flex items-center justify-center">
                            <div className="inline-flex items-center gap-1 p-1 bg-linear-to-br from-gray-50 to-gray-100 rounded-2xl shadow-sm border border-gray-200">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => onSentenceMediaModeChange(index, 'single')}
                                className={
                                  mediaMode === 'single'
                                    ? 'h-9 px-4 text-sm font-bold rounded-xl bg-white text-indigo-600 shadow-md hover:bg-white hover:text-indigo-600'
                                    : 'h-9 px-4 text-sm font-semibold rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                }
                              >
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Image
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => onSentenceMediaModeChange(index, 'frames')}
                                className={
                                  mediaMode === 'frames'
                                    ? 'h-9 px-4 text-sm font-bold rounded-xl bg-white text-indigo-600 shadow-md hover:bg-white hover:text-indigo-600'
                                    : 'h-9 px-4 text-sm font-semibold rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                }
                              >
                                <VideoIcon className="h-4 w-4 mr-2" />
                                Video
                              </Button>
                            </div>
                          </div>

                          {/* Upload/Generate Area for Single Mode */}
                          {mediaMode === 'single' && !(item.image || item.imageUrl || item.video || item.videoUrl) && (
                            <div className="grid md:grid-cols-2 gap-4">
                              <div
                                className="relative bg-linear-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 border-2 border-dashed border-indigo-300 rounded-2xl p-4 text-center transition-all duration-300 cursor-pointer hover:border-indigo-400 hover:shadow-lg hover:scale-[1.01] group"
                                onClick={() => document.getElementById(`sentence-image-${item.id}`)?.click()}
                              >
                                <div className="flex flex-col items-center gap-3 pointer-events-none">
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-indigo-400 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity"></div>
                                    <div className="relative p-3 bg-white rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                                      <ImageIcon className="h-7 w-7 text-indigo-500" />
                                    </div>
                                  </div>
                                  <input
                                    type="file"
                                    id={`sentence-image-${item.id}`}
                                    accept="image/*,video/*"
                                    onChange={(e) => onSentenceImageUpload(index, e)}
                                    className="hidden"
                                  />
                                  <div>
                                    <p className="text-sm font-bold text-gray-900 mb-1">
                                      Click to upload
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      Images or videos
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 justify-center">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onGenerateSentenceImage(index);
                                  }}
                                  disabled={item.isGeneratingImage}
                                  className="h-10 gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
                                >
                                  {item.isGeneratingImage ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span className="text-sm font-bold">Generating...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-4 w-4" />
                                      <span className="text-sm font-bold">Generate with AI</span>
                                    </>
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectFromLibrary(index, 'single');
                                  }}
                                  className="h-10 gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                                >
                                  <Library className="h-4 w-4" />
                                  <span className="text-sm">From Library</span>
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Start/End Frame Uploads */}
                          {mediaMode === 'frames' && (
                            <div className="space-y-4 mx-6">
                              {!hasAnyVideo ? (
                                <>
                                  <div className="grid grid-cols-2 gap-4">
                                    {/* Start Frame */}
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-linear-to-r from-indigo-600 to-purple-600 shadow-sm"></div>
                                        <p className="text-sm font-bold text-gray-800">Start Frame</p>
                                      </div>
                                      {startPreviewUrl ? (
                                        <div className="relative group/frame rounded-2xl overflow-hidden shadow-lg border-2 border-gray-200">
                                          <img
                                            src={startPreviewUrl}
                                            alt="Start frame"
                                            className="w-full h-64 object-cover cursor-zoom-in transition-transform duration-300 group-hover/frame:scale-110"
                                            onClick={() => {
                                              setIsPreviewClosing(false);
                                              setPreviewImageUrl(startPreviewUrl);
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onSelectFromLibrary(index, 'start');
                                            }}
                                            className="absolute top-2 left-2 p-2 bg-white/90 text-indigo-700 rounded-xl hover:bg-white shadow-lg transition-all hover:scale-110"
                                            title="Choose start frame from library"
                                          >
                                            <Library className="h-4 w-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => onRemoveSentenceFrameImage(index, 'start')}
                                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                                            title="Remove start frame"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div
                                          className="bg-linear-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 border-2 border-dashed border-indigo-300 rounded-2xl p-5 text-center hover:border-indigo-400 hover:shadow-lg transition-all duration-300 cursor-pointer group/upload"
                                          onClick={() => document.getElementById(`sentence-start-image-${item.id}`)?.click()}
                                        >
                                          <input
                                            type="file"
                                            id={`sentence-start-image-${item.id}`}
                                            accept="image/*"
                                            onChange={(e) => onSentenceFrameImageUpload(index, 'start', e)}
                                            className="hidden"
                                          />
                                          <div className="flex flex-col items-center gap-3 pointer-events-none">
                                            <div className="p-3 bg-white rounded-xl shadow-md group-hover/upload:scale-110 transition-transform duration-300">
                                              <ImageIcon className="h-6 w-6 text-indigo-500" />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-800">Click to upload</span>
                                          </div>

                                          {onGenerateSentenceFrameImage && (
                                            <div className="mt-4 pointer-events-auto">
                                              <Button
                                                type="button"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  void Promise.resolve(onGenerateSentenceFrameImage(index, 'start'));
                                                }}
                                                disabled={Boolean(item.isGeneratingStartImage)}
                                                className="h-9 w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
                                              >
                                                {item.isGeneratingStartImage ? (
                                                  <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span className="text-xs font-bold">Generating...</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Sparkles className="h-4 w-4" />
                                                    <span className="text-xs font-bold">Generate AI</span>
                                                  </>
                                                )}
                                              </Button>
                                            </div>
                                          )}

                                          <div className="mt-3 pointer-events-auto">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectFromLibrary(index, 'start');
                                              }}
                                              className="h-9 w-full gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                                            >
                                              <Library className="h-4 w-4" />
                                              <span className="text-xs font-bold">From Library</span>
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* End Frame */}
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-linear-to-r from-purple-600 to-pink-600 shadow-sm"></div>
                                        <p className="text-sm font-bold text-gray-800">End Frame</p>
                                      </div>
                                      {endPreviewUrl ? (
                                        <div className="relative group/frame rounded-2xl overflow-hidden shadow-lg border-2 border-gray-200">
                                          <img
                                            src={endPreviewUrl}
                                            alt="End frame"
                                            className="w-full h-64 object-cover cursor-zoom-in transition-transform duration-300 group-hover/frame:scale-110"
                                            onClick={() => {
                                              setIsPreviewClosing(false);
                                              setPreviewImageUrl(endPreviewUrl);
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onSelectFromLibrary(index, 'end');
                                            }}
                                            className="absolute top-2 left-2 p-2 bg-white/90 text-indigo-700 rounded-xl hover:bg-white shadow-lg transition-all hover:scale-110"
                                            title="Choose end frame from library"
                                          >
                                            <Library className="h-4 w-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => onRemoveSentenceFrameImage(index, 'end')}
                                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                                            title="Remove end frame"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div
                                          className="bg-linear-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 border-2 border-dashed border-indigo-300 rounded-2xl p-5 text-center hover:border-indigo-400 hover:shadow-lg transition-all duration-300 cursor-pointer group/upload"
                                          onClick={() => document.getElementById(`sentence-end-image-${item.id}`)?.click()}
                                        >
                                          <input
                                            type="file"
                                            id={`sentence-end-image-${item.id}`}
                                            accept="image/*"
                                            onChange={(e) => onSentenceFrameImageUpload(index, 'end', e)}
                                            className="hidden"
                                          />
                                          <div className="flex flex-col items-center gap-3 pointer-events-none">
                                            <div className="p-3 bg-white rounded-xl shadow-md group-hover/upload:scale-110 transition-transform duration-300">
                                              <ImageIcon className="h-6 w-6 text-indigo-500" />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-800">Click to upload</span>
                                          </div>

                                          {onGenerateSentenceFrameImage && (
                                            <div className="mt-4 pointer-events-auto">
                                              <Button
                                                type="button"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  void Promise.resolve(onGenerateSentenceFrameImage(index, 'end'));
                                                }}
                                                disabled={Boolean(item.isGeneratingEndImage)}
                                                className="h-9 w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
                                              >
                                                {item.isGeneratingEndImage ? (
                                                  <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span className="text-xs font-bold">Generating...</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Sparkles className="h-4 w-4" />
                                                    <span className="text-xs font-bold">Generate AI</span>
                                                  </>
                                                )}
                                              </Button>
                                            </div>
                                          )}

                                          <div className="mt-3 pointer-events-auto">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectFromLibrary(index, 'end');
                                              }}
                                              className="h-9 w-full gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                                            >
                                              <Library className="h-4 w-4" />
                                              <span className="text-xs font-bold">From Library</span>
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {!canGenerateVideo && (
                                    <div className="rounded-2xl border-2 border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 px-5 py-4 flex items-start gap-3 shadow-sm">
                                      <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                                        <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <p className="text-sm text-amber-900 leading-relaxed font-medium">
                                        Upload both <span className="font-bold">Start</span> and <span className="font-bold">End</span> frames to enable video generation.
                                      </p>
                                    </div>
                                  )}
                                </>
                              ) : null}

                              {/* Generated Video + (Re)Generate Button */}
                              {item.video || item.videoUrl ? (
                                <div className="space-y-3">
                                  <div className="relative mx-64 rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-xl">
                                    <video
                                      src={
                                        item.video
                                          ? URL.createObjectURL(item.video)
                                          : (item.videoUrl as string)
                                      }
                                      controls
                                      className="w-full aspect-9/16 h-96 object-cover"
                                    />
                                  </div>

                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={async () => {
                                      if (!onGenerateSentenceVideo || !canGenerateVideo || item.videoUrl === '/subscribe.mp4') {
                                        return;
                                      }

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
                                    }}
                                    disabled={
                                      !onGenerateSentenceVideo ||
                                      !canGenerateVideo ||
                                      item.videoUrl === '/subscribe.mp4' ||
                                      Boolean(isGeneratingVideoBySentenceId[item.id])
                                    }
                                    className="h-10 w-full gap-2 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {isGeneratingVideoBySentenceId[item.id] ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm font-bold">Generating Video...</span>
                                      </>
                                    ) : (
                                      <>
                                        <VideoIcon className="h-4 w-4" />
                                        <span className="text-sm font-bold">Regenerate Video</span>
                                      </>
                                    )}
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={async () => {
                                    if (!onGenerateSentenceVideo || !canGenerateVideo || item.videoUrl === '/subscribe.mp4') {
                                      return;
                                    }

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
                                  }}
                                  disabled={
                                    !onGenerateSentenceVideo ||
                                    !canGenerateVideo ||
                                    item.videoUrl === '/subscribe.mp4' ||
                                    Boolean(isGeneratingVideoBySentenceId[item.id])
                                  }
                                  className="h-10 w-full gap-2 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {isGeneratingVideoBySentenceId[item.id] ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span className="text-sm font-bold">Generating Video...</span>
                                    </>
                                  ) : (
                                    <>
                                      <VideoIcon className="h-4 w-4" />
                                      <span className="text-sm font-bold">Generate Video</span>
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Media Preview (image or video) */}
                          {mediaMode === 'single' && (item.image || item.imageUrl || item.video || item.videoUrl) && (
                            <div className="grid md:grid-cols-2 gap-4 mx-6">
                              <div className="space-y-3">
                                <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-lg group/preview">
                                  {(item.image || item.imageUrl) ? (
                                    <img
                                      src={
                                        item.image
                                          ? URL.createObjectURL(item.image)
                                          : (item.imageUrl as string)
                                      }
                                      alt={`Scene ${index + 1}`}
                                      className="w-full h-64 object-cover transition-transform duration-200 group-hover/preview:scale-105 cursor-zoom-in"
                                      onClick={() => {
                                        setIsPreviewClosing(false);
                                        setPreviewImageUrl(
                                          item.image
                                            ? URL.createObjectURL(item.image)
                                            : (item.imageUrl as string),
                                        );
                                      }}
                                    />
                                  ) : (
                                    <video
                                      src={
                                        item.video
                                          ? URL.createObjectURL(item.video)
                                          : (item.videoUrl as string)
                                      }
                                      controls
                                      className="w-full aspect-9/16 object-cover"
                                    />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => onRemoveSentenceImage(index)}
                                    className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                  {item.imageUrl && !item.image && !item.video && !item.videoUrl && (
                                    <div className="absolute bottom-3 left-3">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg">
                                        <Sparkles className="h-3 w-3" />
                                        AI Generated
                                      </span>
                                    </div>
                                  )}
                                </div>


                              </div>

                              <div className="flex flex-col gap-2 justify-center">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onSelectFromLibrary(index, 'single')}
                                  disabled={item.isSavingImage || item.isGeneratingImage || isApplyingImagePrompt}
                                  className="h-9 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-semibold"
                                >
                                  <Library className="h-4 w-4" />
                                  <span className="text-xs">Change</span>
                                </Button>
                                {hasAnyImage && (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onGenerateSentenceImage(index)}
                                      disabled={item.isGeneratingImage || isApplyingImagePrompt}
                                      className="h-9 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-semibold"
                                    >
                                      <Sparkles className="h-4 w-4" />
                                      <span className="text-xs">Regenerate</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => openEnhanceImagePromptModal(index)}
                                      disabled={item.isGeneratingImage || isApplyingImagePrompt}
                                      className="h-9 gap-2 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {isApplyingImagePrompt ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          <span className="text-xs font-bold">Regenerating...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="h-4 w-4" />
                                          <span className="text-xs font-bold">Enhance</span>
                                        </>
                                      )}
                                    </Button>
                                  </>
                                )}
                                {item.imagePrompt && (
                                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                                    <div className="flex items-start gap-2">
                                      <div className="p-1 bg-indigo-100 rounded-lg shrink-0 mt-0.5">
                                        <Sparkles className="h-3 w-3 text-indigo-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-700 mb-1">Prompt Used</p>
                                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                                          {item.imagePrompt}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {imagePromptError && (
                                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2">
                                    <div className="p-1 bg-red-100 rounded-lg shrink-0">
                                      <X className="h-3 w-3 text-red-600" />
                                    </div>
                                    <p className="text-xs text-red-700 font-medium flex-1">{imagePromptError}</p>
                                  </div>
                                )}
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
            <div className="text-center py-20 bg-linear-to-br from-gray-50 to-gray-100/50 rounded-2xl border-2 border-dashed border-gray-300">
              <div className="flex flex-col items-center gap-4">
                <div className="p-5 bg-white rounded-2xl shadow-md">
                  <Images className="h-10 w-10 text-gray-400" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-700 mb-1.5">No scenes yet</p>
                  <p className="text-sm text-gray-500">
                    Write a script and click &quot;Split into Sentences&quot; to get started
                  </p>
                </div>
              </div>
            </div>
          )}
          {previewImageUrl && (
            <div
              className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 ${isPreviewClosing
                ? 'animate-out fade-out-0 duration-200'
                : 'animate-in fade-in-0 duration-200'
                }`}
              onClick={() => {
                setIsPreviewClosing(true);
                setTimeout(() => setPreviewImageUrl(null), 200);
              }}
            >
              <div
                className={`relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center ${isPreviewClosing
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
                  className="absolute -top-4 -right-4 p-3 rounded-full bg-white text-gray-800 shadow-2xl hover:bg-gray-100 hover:scale-110 transition-all z-10"
                  title="Close preview"
                >
                  <X className="h-5 w-5" />
                </button>
                <img
                  src={previewImageUrl}
                  alt="Full preview"
                  className="max-h-[85vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain bg-black/20"
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
                const hasStart = Boolean(s.startImage || s.startImageUrl);
                const hasEnd = Boolean(s.endImage || s.endImageUrl);
                const hasMedia = hasImage || hasVideo || hasStart || hasEnd;
                const mediaUrl = hasVideo
                  ? s.video
                    ? URL.createObjectURL(s.video)
                    : (s.videoUrl as string)
                  : hasImage
                    ? s.image
                      ? URL.createObjectURL(s.image)
                      : (s.imageUrl as string)
                    : hasStart
                      ? s.startImage
                        ? URL.createObjectURL(s.startImage)
                        : (s.startImageUrl as string)
                      : hasEnd
                        ? s.endImage
                          ? URL.createObjectURL(s.endImage)
                          : (s.endImageUrl as string)
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
