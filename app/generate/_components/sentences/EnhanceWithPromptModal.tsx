'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, X } from 'lucide-react';

type EnhanceWithPromptModalProps = {
  isOpen: boolean;
  enhanceError: string | null;
  isApplyingPrompt: boolean;
  promptOriginalSentence: string;
  promptEnhancedSentence: string;
  userPrompt: string;
  onUserPromptChange: (next: string) => void;
  onCancel: () => void;
  onApply: () => void;
  onDone: () => void;
};

export function EnhanceWithPromptModal({
  isOpen,
  enhanceError,
  isApplyingPrompt,
  promptOriginalSentence,
  promptEnhancedSentence,
  userPrompt,
  onUserPromptChange,
  onCancel,
  onApply,
  onDone,
}: EnhanceWithPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-200"
      onClick={() => {
        if (isApplyingPrompt) return;
        onCancel();
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
              onCancel();
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
              <p className="text-[11px] text-gray-500 mt-2">Updated from original</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-700 mb-2">Your Prompt</p>
            <textarea
              value={userPrompt}
              onChange={(e) => onUserPromptChange(e.target.value)}
              className="w-full text-sm text-gray-800 leading-relaxed bg-transparent border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 resize-none"
              rows={3}
              placeholder="e.g., Make it more dramatic, shorter, and add urgency."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200/80 bg-white/80 flex items-center justify-between gap-3">
          <p className="text-[11px] text-gray-500">Tip: You can Apply multiple times, then Done when satisfied.</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (isApplyingPrompt) return;
                onCancel();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onApply}
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
              onClick={onDone}
              disabled={isApplyingPrompt || !promptEnhancedSentence.trim()}
              className="gap-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
