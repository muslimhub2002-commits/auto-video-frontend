'use client';

import { useMemo } from 'react';
import { X, Loader2, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type TranslateMethod = 'google' | 'llm';

export type TranslateLoadingAction = 'only' | 'save';

type TranslateScriptModalProps = {
  isOpen: boolean;
  onClose: () => void;

  targetLanguage: string;
  onTargetLanguageChange: (value: string) => void;

  method: TranslateMethod;
  onMethodChange: (value: TranslateMethod) => void;

  llmModel: string;

  onTranslateOnly: () => void | Promise<void>;
  onTranslateAndSave: () => void | Promise<void>;

  isLoading?: boolean;
  loadingAction?: TranslateLoadingAction | null;
};

export function TranslateScriptModal({
  isOpen,
  onClose,
  targetLanguage,
  onTargetLanguageChange,
  method,
  onMethodChange,
  llmModel,
  onTranslateOnly,
  onTranslateAndSave,
  isLoading = false,
  loadingAction = null,
}: TranslateScriptModalProps) {
  const languageOptions = useMemo(
    () => [
      { code: 'en', label: 'English' },
      { code: 'ar', label: 'Arabic' },
      { code: 'es', label: 'Spanish' },
      { code: 'fr', label: 'French' },
      { code: 'de', label: 'German' },
      { code: 'it', label: 'Italian' },
      { code: 'pt', label: 'Portuguese' },
      { code: 'ru', label: 'Russian' },
      { code: 'tr', label: 'Turkish' },
      { code: 'hi', label: 'Hindi' },
      { code: 'ur', label: 'Urdu' },
      { code: 'id', label: 'Indonesian' },
      { code: 'ja', label: 'Japanese' },
      { code: 'ko', label: 'Korean' },
      { code: 'zh-CN', label: 'Chinese (Simplified)' },
    ],
    [],
  );

  if (!isOpen) return null;

  const anyLoading = Boolean(isLoading || loadingAction);
  const translateOnlyLoading = loadingAction === 'only' || (isLoading && !loadingAction);
  const translateSaveLoading = loadingAction === 'save' || (isLoading && !loadingAction);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={anyLoading ? undefined : onClose}
    >
      <div
        className="bg-linear-to-br from-white via-gray-50 to-blue-50/30 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-gray-200/50 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <Languages className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Translate Script</h3>
              <p className="text-xs text-gray-500">
                Translates text while preserving sentence media. Voice-over will be cleared.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={anyLoading}
            className="p-2 hover:bg-white/80 rounded-xl transition-all hover:scale-105 hover:shadow-md group disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-600">Target Language</Label>
              <Select value={targetLanguage} onValueChange={onTargetLanguageChange}>
                <SelectTrigger className="w-full bg-white border-gray-300">
                  <SelectValue placeholder="Choose language" />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((opt) => (
                    <SelectItem key={opt.code} value={opt.code}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-600">Method</Label>
              <Select value={method} onValueChange={(v) => onMethodChange(v as TranslateMethod)}>
                <SelectTrigger className="w-full bg-white border-gray-300">
                  <SelectValue placeholder="Choose method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google Translate</SelectItem>
                  <SelectItem value="llm">Selected LLM Model</SelectItem>
                </SelectContent>
              </Select>
              {method === 'llm' ? (
                <p className="text-xs text-gray-500">Model: {llmModel}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-white/80 border-t border-gray-200/80 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={anyLoading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onTranslateOnly}
            disabled={anyLoading}
            className="gap-2 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          >
            {translateOnlyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Translate (no save)
          </Button>

          <Button
            type="button"
            onClick={onTranslateAndSave}
            disabled={anyLoading}
            className="gap-2 bg-linear-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white"
          >
            {translateSaveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Translate + Save draft
          </Button>
        </div>
      </div>
    </div>
  );
}
