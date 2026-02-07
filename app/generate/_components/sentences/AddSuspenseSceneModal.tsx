'use client';

import { Button } from '@/components/ui/button';
import type { SentenceItem } from '../../_types/sentences';
import { FileText, Image as ImageIcon, Sparkles, Video as VideoIcon, X } from 'lucide-react';

type AddSuspenseSceneModalProps = {
  isOpen: boolean;
  sentences: SentenceItem[];
  suspenseSelectedIndex: number | null;
  onChangeSelectedIndex: (next: number | null) => void;
  onClose: () => void;
  onAddSuspenseScene: (sourceIndex: number) => void;
  onMissingMedia: () => void;
};

export function AddSuspenseSceneModal({
  isOpen,
  sentences,
  suspenseSelectedIndex,
  onChangeSelectedIndex,
  onClose,
  onAddSuspenseScene,
  onMissingMedia,
}: AddSuspenseSceneModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-200"
      onClick={onClose}
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
                  <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full">NEW</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">Select a scene to duplicate as your opening suspense hook</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
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
                    onMissingMedia();
                    return;
                  }
                  onChangeSelectedIndex(idx);
                }}
                className={`group w-full text-left rounded-2xl border-2 p-4 transition-all ${selected
                  ? 'border-purple-400 bg-linear-to-br from-purple-50 to-indigo-50 shadow-lg scale-[1.02]'
                  : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md hover:scale-[1.01]'
                  }`}
              >
                <div className="flex items-start gap-4">
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
                            <video src={mediaUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <div className="p-2 bg-white/90 rounded-full">
                                <VideoIcon className="h-4 w-4 text-gray-700" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img src={mediaUrl} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
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

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold mb-2 line-clamp-2 leading-relaxed ${selected ? 'text-purple-900' : 'text-gray-900'
                        }`}
                    >
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
                <span className="text-purple-700 font-semibold">Scene {suspenseSelectedIndex + 1} selected</span>
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
              onClick={onClose}
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
                  onMissingMedia();
                  return;
                }

                onAddSuspenseScene(suspenseSelectedIndex);
                onClose();
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
  );
}
