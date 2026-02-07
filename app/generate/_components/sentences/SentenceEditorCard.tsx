'use client';

import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Sparkles,
  FileText,
  X,
  Image as ImageIcon,
  Library,
  Video as VideoIcon,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';

import type { SentenceItem } from '../../_types/sentences';

type SentenceEditorCardProps = {
  item: SentenceItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;

  enhanceError: string | null;
  isEnhancing: boolean;
  isApplyingPrompt: boolean;
  isEnhanceMenuOpen: boolean;
  onToggleEnhanceMenu: () => void;
  onAutoEnhance: () => void;
  onCustomPrompt: () => void;

  onMergeUp: () => void;
  onMergeDown: () => void;
  onRequestDelete: () => void;

  onSentenceTextChange: (next: string) => void;
  onSentenceMediaModeChange: (mode: 'single' | 'frames') => void;

  onSentenceImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onSentenceFrameImageUpload: (which: 'start' | 'end', e: ChangeEvent<HTMLInputElement>) => void;

  onGenerateSentenceImage: () => void | Promise<void>;
  onGenerateSentenceFrameImage?: (which: 'start' | 'end') => void | Promise<void>;
  onSelectFromLibrary: (which: 'single' | 'start' | 'end') => void;
  onRemoveSentenceImage: () => void;
  onRemoveSentenceFrameImage: (which: 'start' | 'end') => void;

  onOpenEnhanceImagePromptModal: () => void;
  isApplyingImagePrompt: boolean;
  imagePromptError?: string;

  isGeneratingVideo: boolean;
  onGenerateVideo?: (canGenerateVideo: boolean) => void | Promise<void>;

  onPreviewImage: (url: string) => void;
};

export function SentenceEditorCard({
  item,
  index,
  isFirst,
  isLast,

  enhanceError,
  isEnhancing,
  isApplyingPrompt,
  isEnhanceMenuOpen,
  onToggleEnhanceMenu,
  onAutoEnhance,
  onCustomPrompt,

  onMergeUp,
  onMergeDown,
  onRequestDelete,

  onSentenceTextChange,
  onSentenceMediaModeChange,

  onSentenceImageUpload,
  onSentenceFrameImageUpload,

  onGenerateSentenceImage,
  onGenerateSentenceFrameImage,
  onSelectFromLibrary,
  onRemoveSentenceImage,
  onRemoveSentenceFrameImage,

  onOpenEnhanceImagePromptModal,
  isApplyingImagePrompt,
  imagePromptError,

  isGeneratingVideo,
  onGenerateVideo,

  onPreviewImage,
}: SentenceEditorCardProps) {
  const hasAnyVideo = Boolean(item.video || item.videoUrl);
  const hasAnyImage = Boolean(item.image || item.imageUrl);
  const mediaMode: 'single' | 'frames' = item.mediaMode ?? 'single';

  const startPreviewUrl = item.startImage ? URL.createObjectURL(item.startImage) : item.startImageUrl;
  const endPreviewUrl = item.endImage ? URL.createObjectURL(item.endImage) : item.endImageUrl;
  const hasStart = Boolean(startPreviewUrl);
  const hasEnd = Boolean(endPreviewUrl);
  const canGenerateVideo = mediaMode === 'frames' && hasStart && hasEnd;

  return (
    <div
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
                  onChange={(e) => onSentenceTextChange(e.target.value)}
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
                    disabled={isFirst}
                    onClick={onMergeUp}
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
                    disabled={isLast}
                    onClick={onMergeDown}
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
                    onClick={onToggleEnhanceMenu}
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
                  {isEnhanceMenuOpen && !isEnhancing && !isApplyingPrompt ? (
                    <div
                      className="absolute left-0 top-full mt-2 z-20 w-64 rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                      data-enhance-menu
                    >
                      <div className="p-2 space-y-1">
                        <button
                          type="button"
                          onClick={onAutoEnhance}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-linear-to-r hover:from-amber-50 hover:to-orange-50 transition-all group text-left"
                        >
                          <div className="p-2 bg-linear-to-br from-amber-100 to-orange-100 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                            <Sparkles className="h-4 w-4 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 group-hover:text-amber-700 transition-colors">
                              Auto Enhance
                            </p>
                            <p className="text-xs text-gray-500 leading-tight mt-0.5">Let AI improve your text</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={onCustomPrompt}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 transition-all group text-left"
                        >
                          <div className="p-2 bg-linear-to-br from-blue-100 to-indigo-100 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                              Custom Prompt
                            </p>
                            <p className="text-xs text-gray-500 leading-tight mt-0.5">Use your own instructions</p>
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
                  onClick={onRequestDelete}
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
                onClick={() => onSentenceMediaModeChange('single')}
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
                onClick={() => onSentenceMediaModeChange('frames')}
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
                    onChange={onSentenceImageUpload}
                    className="hidden"
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1">Click to upload</p>
                    <p className="text-xs text-gray-600">Images or videos</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 justify-center">
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    void Promise.resolve(onGenerateSentenceImage());
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
                    onSelectFromLibrary('single');
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
                            onClick={() => onPreviewImage(startPreviewUrl)}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFromLibrary('start');
                            }}
                            className="absolute top-2 left-2 p-2 bg-white/90 text-indigo-700 rounded-xl hover:bg-white shadow-lg transition-all hover:scale-110"
                            title="Choose start frame from library"
                          >
                            <Library className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveSentenceFrameImage('start')}
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
                            onChange={(e) => onSentenceFrameImageUpload('start', e)}
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
                                  void Promise.resolve(onGenerateSentenceFrameImage('start'));
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
                                onSelectFromLibrary('start');
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
                            onClick={() => onPreviewImage(endPreviewUrl)}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFromLibrary('end');
                            }}
                            className="absolute top-2 left-2 p-2 bg-white/90 text-indigo-700 rounded-xl hover:bg-white shadow-lg transition-all hover:scale-110"
                            title="Choose end frame from library"
                          >
                            <Library className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveSentenceFrameImage('end')}
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
                            onChange={(e) => onSentenceFrameImageUpload('end', e)}
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
                                  void Promise.resolve(onGenerateSentenceFrameImage('end'));
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
                                onSelectFromLibrary('end');
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
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
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
                      src={item.video ? URL.createObjectURL(item.video) : (item.videoUrl as string)}
                      controls
                      className="w-full aspect-9/16 h-96 object-cover"
                    />
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void Promise.resolve(onGenerateVideo?.(canGenerateVideo))}
                    disabled={!onGenerateVideo || !canGenerateVideo || item.videoUrl === '/subscribe.mp4' || isGeneratingVideo}
                    className="h-10 w-full gap-2 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isGeneratingVideo ? (
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
                  onClick={() => void Promise.resolve(onGenerateVideo?.(canGenerateVideo))}
                  disabled={!onGenerateVideo || !canGenerateVideo || item.videoUrl === '/subscribe.mp4' || isGeneratingVideo}
                  className="h-10 w-full gap-2 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isGeneratingVideo ? (
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
                  {item.image || item.imageUrl ? (
                    <img
                      src={item.image ? URL.createObjectURL(item.image) : (item.imageUrl as string)}
                      alt={`Scene ${index + 1}`}
                      className="w-full h-64 object-cover transition-transform duration-200 group-hover/preview:scale-105 cursor-zoom-in"
                      onClick={() => onPreviewImage(item.image ? URL.createObjectURL(item.image) : (item.imageUrl as string))}
                    />
                  ) : (
                    <video
                      src={item.video ? URL.createObjectURL(item.video) : (item.videoUrl as string)}
                      controls
                      className="w-full aspect-9/16 object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={onRemoveSentenceImage}
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
                  onClick={() => onSelectFromLibrary('single')}
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
                      onClick={() => void Promise.resolve(onGenerateSentenceImage())}
                      disabled={item.isGeneratingImage || isApplyingImagePrompt}
                      className="h-9 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-semibold"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="text-xs">Regenerate</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={onOpenEnhanceImagePromptModal}
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
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{item.imagePrompt}</p>
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
}
