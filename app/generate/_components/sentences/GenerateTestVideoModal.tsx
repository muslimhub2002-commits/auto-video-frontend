'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { SentenceItem } from '../../_types/sentences';
import type { TestVideoVoiceMode } from './test-video.types';
import {
  CheckSquare,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mic,
  Square,
  Upload,
  Video as VideoIcon,
  X,
} from 'lucide-react';

type GenerateTestVideoModalProps = {
  isOpen: boolean;
  sentences: SentenceItem[];
  jobStatus: string | null;
  jobError: string | null;
  videoUrl: string | null;
  canUseCurrentVoiceSettings: boolean;
  onClose: () => void;
  onGenerate: (params: {
    selectedIndices: number[];
    voiceMode: TestVideoVoiceMode;
    uploadedVoiceOver: File | null;
  }) => void | Promise<void>;
};

function getSceneMediaUrl(sentence: SentenceItem): string | null {
  if (sentence.video) return URL.createObjectURL(sentence.video);
  if (sentence.videoUrl) return sentence.videoUrl;
  if (sentence.image) return URL.createObjectURL(sentence.image);
  if (sentence.imageUrl) return sentence.imageUrl;
  if (sentence.startImage) return URL.createObjectURL(sentence.startImage);
  if (sentence.startImageUrl) return sentence.startImageUrl;
  if (sentence.endImage) return URL.createObjectURL(sentence.endImage);
  if (sentence.endImageUrl) return sentence.endImageUrl;
  return null;
}

export function GenerateTestVideoModal({
  isOpen,
  sentences,
  jobStatus,
  jobError,
  videoUrl,
  canUseCurrentVoiceSettings,
  onClose,
  onGenerate,
}: GenerateTestVideoModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [voiceMode, setVoiceMode] = useState<TestVideoVoiceMode>('none');
  const [uploadedVoiceOver, setUploadedVoiceOver] = useState<File | null>(null);
  const [showSilentFallbackAlert, setShowSilentFallbackAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sortedSelected = useMemo(
    () => selectedIndices.slice().sort((a, b) => a - b),
    [selectedIndices],
  );
  const minSelected = sortedSelected[0] ?? null;
  const maxSelected = sortedSelected[sortedSelected.length - 1] ?? null;
  const isRendering =
    jobStatus === 'queued' ||
    jobStatus === 'processing' ||
    jobStatus === 'rendering';
  const hasResult = Boolean(jobStatus || videoUrl || jobError);
  const isStartingRequest = isSubmitting && !hasResult;

  const isSelectable = (index: number) => {
    if (sortedSelected.length === 0) return true;
    if (sortedSelected.includes(index)) {
      if (sortedSelected.length <= 1) return true;
      return index === minSelected || index === maxSelected;
    }

    return index === (minSelected ?? 0) - 1 || index === (maxSelected ?? 0) + 1;
  };

  const handleToggleScene = (index: number) => {
    if (hasResult) return;
    if (sortedSelected.length === 0) {
      setSelectedIndices([index]);
      return;
    }

    const exists = sortedSelected.includes(index);
    if (exists) {
      if (sortedSelected.length === 1) {
        setSelectedIndices([]);
        return;
      }

      if (index !== minSelected && index !== maxSelected) {
        return;
      }

      setSelectedIndices(sortedSelected.filter((value) => value !== index));
      return;
    }

    if (!isSelectable(index)) {
      return;
    }

    setSelectedIndices([...sortedSelected, index].sort((a, b) => a - b));
  };

  const handleGenerateClick = async () => {
    if (sortedSelected.length < 2) return;
    if (voiceMode === 'upload' && !uploadedVoiceOver) return;

    if (voiceMode === 'current' && !canUseCurrentVoiceSettings) {
      setShowSilentFallbackAlert(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onGenerate({
        selectedIndices: sortedSelected,
        voiceMode,
        uploadedVoiceOver,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSilentFallback = async () => {
    setShowSilentFallbackAlert(false);
    setIsSubmitting(true);
    try {
      await onGenerate({
        selectedIndices: sortedSelected,
        voiceMode: 'none',
        uploadedVoiceOver: null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="w-full max-w-5xl rounded-3xl bg-linear-to-br from-white via-sky-50/30 to-indigo-50/40 shadow-2xl border border-sky-200/60 overflow-hidden animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-8 py-6 border-b border-sky-200/60 bg-linear-to-r from-sky-100 via-cyan-100 to-indigo-100">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-linear-to-br from-sky-600 to-indigo-600 rounded-2xl shadow-lg">
                  <VideoIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Generate Test Video</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Pick a contiguous block of scenes to preview transitions, sound effects, and pacing.
                  </p>
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

          {hasResult ? (
            <div className="p-8 space-y-6">
              <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h4 className="text-base font-bold text-gray-900">Test Render</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {isRendering
                        ? 'Rendering your selected scenes with the current transition and audio setup.'
                        : jobStatus === 'completed'
                          ? 'Preview ready. Closing this modal will discard it.'
                          : 'The preview render could not be generated.'}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                    {isRendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <VideoIcon className="h-4 w-4" />}
                    {jobStatus ?? 'idle'}
                  </div>
                </div>
              </div>

              {jobError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                  {jobError}
                </div>
              ) : null}

              {videoUrl ? (
                <div className="rounded-3xl border border-gray-200 bg-black p-3 shadow-xl overflow-hidden">
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    className="w-full max-h-[65vh] rounded-2xl bg-black"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 px-6 py-12 text-center text-sm text-sky-800">
                  {isRendering ? 'Rendering in progress...' : 'No preview video available yet.'}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 max-h-[72vh] overflow-y-auto scrollbar-hide overscroll-contain touch-pan-y">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
                    Start anywhere. Once you pick the first scene, only the adjacent scene before and after the current block stay unlocked.
                  </div>

                  {sentences.map((sentence, index) => {
                    const selected = sortedSelected.includes(index);
                    const selectable = isSelectable(index);
                    const hasVideo = Boolean(sentence.video || sentence.videoUrl);
                    const hasImage = Boolean(
                      sentence.image ||
                        sentence.imageUrl ||
                        sentence.startImage ||
                        sentence.startImageUrl ||
                        sentence.endImage ||
                        sentence.endImageUrl,
                    );
                    const mediaUrl = getSceneMediaUrl(sentence);

                    return (
                      <button
                        key={sentence.id}
                        type="button"
                        onClick={() => handleToggleScene(index)}
                        disabled={!selectable && !selected}
                        className={`group w-full text-left rounded-2xl border-2 p-4 transition-all ${selected
                          ? 'border-sky-400 bg-linear-to-br from-sky-50 to-indigo-50 shadow-lg scale-[1.01]'
                          : selectable
                            ? 'border-gray-200 bg-white hover:border-sky-300 hover:shadow-md'
                            : 'border-gray-200 bg-gray-50/80 opacity-65 cursor-not-allowed'
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                            <div
                              className={`w-28 h-20 rounded-xl overflow-hidden border-2 ${selected
                                ? 'border-sky-400 shadow-lg'
                                : selectable
                                  ? 'border-gray-200 group-hover:border-sky-300'
                                  : 'border-gray-200'
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
                                  <img src={mediaUrl} alt={`Scene ${index + 1}`} className="w-full h-full object-cover" />
                                )
                              ) : (
                                <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                  <FileText className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="absolute -top-2 -left-2 h-7 w-7 rounded-full border-2 border-white bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow-md">
                              {index + 1}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <p className={`text-sm font-semibold mb-2 line-clamp-2 leading-relaxed ${selected ? 'text-sky-900' : 'text-gray-900'}`}>
                                {sentence.text?.trim() || 'Untitled scene'}
                              </p>
                              <div className="shrink-0 mt-0.5">
                                {selected ? (
                                  <CheckSquare className="h-5 w-5 text-sky-600" />
                                ) : (
                                  <Square className={`h-5 w-5 ${selectable ? 'text-gray-400' : 'text-gray-300'}`} />
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {hasImage ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 text-[11px] font-bold">
                                  <ImageIcon className="h-3 w-3" />
                                  Image
                                </span>
                              ) : null}
                              {hasVideo ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 border border-blue-300 text-[11px] font-bold">
                                  <VideoIcon className="h-3 w-3" />
                                  Video
                                </span>
                              ) : null}
                              {!hasImage && !hasVideo ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold">
                                  <FileText className="h-3 w-3" />
                                  Missing media
                                </span>
                              ) : null}
                              {!selectable && !selected ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-[11px] font-bold">
                                  Locked until you extend from the current range
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-4 lg:sticky lg:top-0">
                  <div className="rounded-3xl border border-sky-200 bg-white p-5 shadow-sm space-y-4">
                    <div>
                      <h4 className="text-base font-bold text-gray-900">Preview setup</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Selected scenes render with the same scene media, sentence SFX, and transition audio they use in the final video.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-3">
                      <p className="text-xs font-semibold text-sky-900">Selection</p>
                      <p className="text-sm text-sky-800 mt-1">
                        {sortedSelected.length >= 2
                          ? `Scenes ${minSelected! + 1} to ${maxSelected! + 1} selected (${sortedSelected.length} total)`
                          : sortedSelected.length === 1
                            ? `Scene ${sortedSelected[0] + 1} selected. Pick at least one more scene.`
                            : 'Pick at least two scenes.'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Voice-over</p>

                      <label className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors cursor-pointer ${voiceMode === 'current' ? 'border-sky-300 bg-sky-50' : 'border-gray-200 bg-white hover:border-sky-200'}`}>
                        <input
                          type="radio"
                          name="test-video-voice-mode"
                          className="mt-1"
                          checked={voiceMode === 'current'}
                          onChange={() => setVoiceMode('current')}
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Use current voice settings</p>
                          <p className="text-xs text-gray-600 mt-1">Generate fresh test voice-over from the selected scene texts.</p>
                        </div>
                      </label>

                      <label className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors cursor-pointer ${voiceMode === 'none' ? 'border-sky-300 bg-sky-50' : 'border-gray-200 bg-white hover:border-sky-200'}`}>
                        <input
                          type="radio"
                          name="test-video-voice-mode"
                          className="mt-1"
                          checked={voiceMode === 'none'}
                          onChange={() => setVoiceMode('none')}
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">No voice-over</p>
                          <p className="text-xs text-gray-600 mt-1">Render a silent preview so you can focus on transitions and sound design.</p>
                        </div>
                      </label>

                      <label className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors cursor-pointer ${voiceMode === 'upload' ? 'border-sky-300 bg-sky-50' : 'border-gray-200 bg-white hover:border-sky-200'}`}>
                        <input
                          type="radio"
                          name="test-video-voice-mode"
                          className="mt-1"
                          checked={voiceMode === 'upload'}
                          onChange={() => setVoiceMode('upload')}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">Upload voice-over</p>
                          <p className="text-xs text-gray-600 mt-1">Use a temporary audio file for this preview only.</p>
                          {voiceMode === 'upload' ? (
                            <div className="mt-3 space-y-2">
                              <label className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-medium text-sky-800 cursor-pointer hover:bg-sky-50">
                                <Upload className="h-4 w-4" />
                                <span>{uploadedVoiceOver ? 'Replace audio' : 'Choose audio file'}</span>
                                <input
                                  ref={inputRef}
                                  type="file"
                                  accept="audio/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setUploadedVoiceOver(file);
                                  }}
                                />
                              </label>
                              <p className="text-xs text-gray-600">
                                {uploadedVoiceOver ? uploadedVoiceOver.name : 'No uploaded voice-over selected yet.'}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 border-t border-sky-200/60 bg-linear-to-r from-white via-sky-50/30 to-indigo-50/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                  <Mic className="h-4 w-4 text-sky-600" />
                  {voiceMode === 'current'
                    ? canUseCurrentVoiceSettings
                      ? 'Current voice settings will be used.'
                      : 'Current voice settings are missing. You will be asked before falling back to silent preview.'
                    : voiceMode === 'none'
                      ? 'This preview will render without voice-over.'
                      : uploadedVoiceOver
                        ? `${uploadedVoiceOver.name} will be used for this preview.`
                        : 'Upload a temporary voice-over file to continue.'}
                </div>

                <div className="flex items-center gap-3">
                  <Button type="button" size="sm" variant="outline" onClick={onClose} className="border-gray-300 hover:bg-gray-100">
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      isSubmitting ||
                      sortedSelected.length < 2 ||
                      (voiceMode === 'upload' && !uploadedVoiceOver)
                    }
                    onClick={() => {
                      void handleGenerateClick();
                    }}
                    className="gap-2 bg-linear-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isStartingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <VideoIcon className="h-4 w-4" />}
                    {isStartingRequest ? 'Starting Preview...' : 'Generate Test Video'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <AlertDialog
        isOpen={showSilentFallbackAlert}
        onClose={() => setShowSilentFallbackAlert(false)}
        onConfirm={() => {
          void handleConfirmSilentFallback();
        }}
        title="Current voice settings are unavailable"
        description="This project does not have usable current voice settings for a subset preview. Continue by generating the test video without voice-over, or go back and choose Upload voice-over / No voice-over explicitly."
        confirmText="Continue Without Voice-over"
        cancelText="Go Back"
        variant="warning"
      />
    </>
  );
}