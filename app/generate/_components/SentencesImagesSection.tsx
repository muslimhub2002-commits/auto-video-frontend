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
} from 'lucide-react';

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
};

interface SentencesImagesSectionProps {
  sentences: SentenceItem[];
  onSentenceImageUpload: (index: number, e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveSentenceImage: (index: number) => void;
  onGenerateSentenceImage: (index: number) => void;
  onGenerateAllImages?: () => void;
  isGeneratingAllImages?: boolean;
  onSentenceTextChange: (index: number, text: string) => void;
  onMergeSentenceIntoPrevious: (index: number) => void;
  onMergeSentenceIntoNext: (index: number) => void;
  onSaveSentenceImage: (index: number) => void;
  onSelectFromLibrary: (index: number) => void;
}

export function SentencesImagesSection({
  sentences,
  onSentenceImageUpload,
  onRemoveSentenceImage,
  onGenerateSentenceImage,
  onGenerateAllImages,
  isGeneratingAllImages,
  onSentenceTextChange,
  onMergeSentenceIntoPrevious,
  onMergeSentenceIntoNext,
  onSelectFromLibrary,
  onSaveSentenceImage,
}: SentencesImagesSectionProps) {
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isPreviewClosing, setIsPreviewClosing] = useState(false);

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
                {sentences.map((item, index) => (
                  <div
                    key={item.id}
                    className="group relative bg-white rounded-xl border-2 border-gray-200 hover:border-primary/30 p-4 transition-all duration-200 hover:shadow-lg"
                  >
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

                        <div className="mt-3 flex flex-wrap gap-2 pl-6">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={index === 0}
                            onClick={() => onMergeSentenceIntoPrevious(index)}
                            className="gap-1.5 text-xs"
                            title="Merge this sentence into the previous one"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                            Add to Previous
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={index === sentences.length - 1}
                            onClick={() => onMergeSentenceIntoNext(index)}
                            className="gap-1.5 text-xs"
                            title="Merge this sentence into the next one"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                            Add to Next
                          </Button>
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

                            <div className="flex gap-2">
                              {item.isFromLibrary || item.video || item.videoUrl ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onSelectFromLibrary(index)}
                                  className="flex-1 gap-1.5 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                                >
                                  <Library className="h-3 w-3" />
                                  Change
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onSaveSentenceImage(index)}
                                  disabled={item.isSavingImage || !!item.savedImageId}
                                  className="flex-1 gap-1.5 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                                >
                                  {item.isSavingImage ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Saving
                                    </>
                                  ) : item.savedImageId ? (
                                    'Saved'
                                  ) : (
                                    'Save'
                                  )}
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => onGenerateSentenceImage(index)}
                                disabled={item.isGeneratingImage}
                                className="flex-1 gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                              >
                                <Sparkles className="h-3 w-3" />
                                Regenerate
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
              className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 ${
                isPreviewClosing
                  ? 'animate-out fade-out-0 duration-200'
                  : 'animate-in fade-in-0 duration-200'
              }`}
              onClick={() => {
                setIsPreviewClosing(true);
                setTimeout(() => setPreviewImageUrl(null), 200);
              }}
            >
              <div
                className={`relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center ${
                  isPreviewClosing
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
    </AccordionItem>
  );
}
