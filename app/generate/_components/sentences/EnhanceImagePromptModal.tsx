'use client';

import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';

type EnhanceImagePromptModalProps = {
  isOpen: boolean;
  enhanceImagePromptError: string | null;
  enhanceImagePromptText: string;
  onEnhanceImagePromptTextChange: (next: string) => void;
  onCancel: () => void;
  onDone: () => void;
};

export function EnhanceImagePromptModal({
  isOpen,
  enhanceImagePromptError,
  enhanceImagePromptText,
  onEnhanceImagePromptTextChange,
  onCancel,
  onDone,
}: EnhanceImagePromptModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-200"
      onClick={onCancel}
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
            onClick={onCancel}
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
              onChange={(e) => onEnhanceImagePromptTextChange(e.target.value)}
              className="w-full text-sm text-gray-800 leading-relaxed bg-transparent border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 resize-none"
              rows={6}
              placeholder="Describe the image you want..."
            />
            <p className="text-[11px] text-gray-500 mt-2">Tip: Keep it descriptive (scene, mood, lighting, style).</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200/80 bg-white/80 flex items-center justify-between gap-3">
          <p className="text-[11px] text-gray-500">This will regenerate the image using your prompt.</p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onDone}
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
  );
}
