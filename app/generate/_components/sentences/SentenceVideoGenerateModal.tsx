'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Film, Image as ImageIcon, Type, X } from 'lucide-react';
import type { SentenceItem } from '../../_types/sentences';

export type SentenceVideoGenerationMode = NonNullable<
  SentenceItem['videoGenerationMode']
>;

type Props = {
  isOpen: boolean;
  sentenceIndex: number;
  sentence: SentenceItem;
  isGenerating?: boolean;
  onClose: () => void;
  onModeChange: (mode: SentenceVideoGenerationMode) => void;
  onPromptChange: (value: string) => void;
  onUploadReferenceImage: (file: File | null) => void;
  onPickReferenceFromLibrary: () => void;
  onGenerate: () => void | Promise<void>;
};

export function SentenceVideoGenerateModal({
  isOpen,
  sentenceIndex,
  sentence,
  isGenerating,
  onClose,
  onModeChange,
  onPromptChange,
  onUploadReferenceImage,
  onPickReferenceFromLibrary,
  onGenerate,
}: Props) {
  const mode = (sentence.videoGenerationMode ?? 'referenceImage') as SentenceVideoGenerationMode;
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => `Generate Video — Sentence ${sentenceIndex + 1}`,
    [sentenceIndex],
  );

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const requiresPrompt = mode === 'text' || mode === 'referenceImage';
  const requiresReference = mode === 'referenceImage';

  const promptValue = String(sentence.videoPrompt ?? '').trimEnd();
  const hasReference = Boolean(sentence.referenceImage || sentence.referenceImageUrl);

  const validate = () => {
    if (requiresPrompt && !String(sentence.videoPrompt ?? '').trim()) {
      setError('Video prompt is required.');
      return false;
    }
    if (requiresReference && !hasReference) {
      setError('Reference image is required.');
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    setError(null);
    if (!validate()) return;
    await Promise.resolve(onGenerate());
  };

  return (
    <div
      className="fixed inset-0 z-40 min-h-screen flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        if (isGenerating) return;
        onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-200/80 overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-md shadow-blue-500/20">
                <Film className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 tracking-tight">{title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Choose a generation mode and generate a temporary clip
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onClose}
              disabled={Boolean(isGenerating)}
              className="h-9 w-9 p-0 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        </div>

        <div className="px-6 py-5 max-h-[67vh] overflow-y-auto space-y-5">
          {error ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-gray-900">Mode</div>
              <div className="w-65">
                <Select
                  value={mode}
                  onValueChange={(v) => {
                    setError(null);
                    onModeChange(v as SentenceVideoGenerationMode);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frames">Start/End frames (existing)</SelectItem>
                    <SelectItem value="text">Text-to-video</SelectItem>
                    <SelectItem value="referenceImage">Reference image-to-video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {mode === 'frames' ? (
              <div className="text-sm text-gray-600 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                Uses this sentence’s start/end frames. Prompt is the sentence text.
              </div>
            ) : null}

            {mode === 'text' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Type className="h-4 w-4 text-gray-700" />
                  Video prompt
                </div>
                <Textarea
                  value={promptValue}
                  onChange={(e) => onPromptChange(e.target.value)}
                  placeholder="Describe the video you want to generate…"
                  className="min-h-27.5 rounded-2xl"
                />
              </div>
            ) : null}

            {mode === 'referenceImage' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Type className="h-4 w-4 text-gray-700" />
                    Video prompt
                  </div>
                  <Textarea
                    value={promptValue}
                    onChange={(e) => onPromptChange(e.target.value)}
                    placeholder="Describe how the reference image should be animated…"
                    className="min-h-27.5 rounded-2xl"
                  />
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <ImageIcon className="h-4 w-4 text-gray-700" />
                      Reference image
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onPickReferenceFromLibrary}
                        className="h-9 rounded-xl"
                        disabled={Boolean(isGenerating)}
                      >
                        Choose from library
                      </Button>

                      <label className="inline-flex">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            onUploadReferenceImage(f);
                          }}
                          disabled={Boolean(isGenerating)}
                        />
                        <span
                          className="inline-flex items-center justify-center h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 shadow-xs hover:bg-gray-50 cursor-pointer"
                        >
                          Upload
                        </span>
                      </label>
                    </div>
                  </div>

                  {hasReference ? (
                    <div className="text-xs text-gray-600">
                      Selected: {sentence.referenceImage ? sentence.referenceImage.name : 'Library image'}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600">
                      No reference image selected.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-8 py-5 border-t border-gray-200/80 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={Boolean(isGenerating)}
              className="h-10 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={Boolean(isGenerating)}
              className="h-10 rounded-xl"
            >
              Generate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
