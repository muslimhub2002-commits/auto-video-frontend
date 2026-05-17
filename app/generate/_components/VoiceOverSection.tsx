'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { API_URL, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Mic, Upload, X, Sparkles, Loader2, Play, Library, SlidersHorizontal, Star } from 'lucide-react';

interface VoiceOverSectionProps {
  script: string;
  voiceOver: File | null;
  voicePreviewUrl?: string | null;
  isHydratingVoiceOver?: boolean;
  voiceDuration: number | null;
  voiceError: string | null;
  isGeneratingVoice: boolean;
  voiceGenerationProgress?: {
    stage: 'generating' | 'merging';
    current: number;
    total: number;
  } | null;
  isPreviewingVoice?: boolean;
  isSavingVoice: boolean;
  savedVoiceId: string | null;
  voiceProvider: 'google' | 'elevenlabs';
  voiceGenerationMode: 'auto' | 'perSentence';
  elevenLabsAutoGenerationStrategy: 'oneTake' | 'chunks';
  onVoiceProviderChange: (provider: 'google' | 'elevenlabs') => void;
  onVoiceGenerationModeChange: (mode: 'auto' | 'perSentence') => void;
  onElevenLabsAutoGenerationStrategyChange: (strategy: 'oneTake' | 'chunks') => void;
  styleInstructions?: string;
  onStyleInstructionsChange?: (value: string) => void;
  voices: {
    id: number;
    voice_id: string;
    name: string;
    use_case?: string | null;
    preview_url?: string | null;
    isFavorite?: boolean;
  }[];
  isLoadingVoices: boolean;
  voicesError: string | null;
  selectedVoiceId: string | null;
  onSelectVoice: (voiceId: string) => void;
  onRefreshVoices: () => void;
  onSetFavoriteVoice: (voiceId: string) => void;
  isSettingFavoriteVoice: boolean;
  onVoiceUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onGenerateVoice: (voiceId?: string | null) => void;
  onPreviewVoice?: (voiceId: string) => void;
  onRemoveVoice: () => void;
  onOpenLibrary: () => void;
  onSaveVoice: () => void;
  onOpenVoiceEditor?: () => void;
  onOpenElevenLabsSettings?: () => void;
  canManageVoiceChunks?: boolean;
  onOpenVoiceChunkManager?: () => void;
  canManageSentenceVoices?: boolean;
  onOpenSentenceVoiceManager?: () => void;
}

export function VoiceOverSection({
  script,
  voiceOver,
  voicePreviewUrl,
  isHydratingVoiceOver,
  voiceDuration,
  voiceError,
  isGeneratingVoice,
  voiceGenerationProgress,
  isPreviewingVoice,
  isSavingVoice,
  savedVoiceId,
  voiceProvider,
  voiceGenerationMode,
  elevenLabsAutoGenerationStrategy,
  onVoiceProviderChange,
  onVoiceGenerationModeChange,
  onElevenLabsAutoGenerationStrategyChange,
  styleInstructions,
  onStyleInstructionsChange,
  voices,
  isLoadingVoices,
  voicesError,
  selectedVoiceId,
  onSelectVoice,
  onRefreshVoices,
  onSetFavoriteVoice,
  isSettingFavoriteVoice,
  onVoiceUpload,
  onGenerateVoice,
  onPreviewVoice,
  onRemoveVoice,
  onOpenLibrary,
  onSaveVoice,
  onOpenVoiceEditor,
  onOpenElevenLabsSettings,
  canManageVoiceChunks,
  onOpenVoiceChunkManager,
  canManageSentenceVoices,
  onOpenSentenceVoiceManager,
}: VoiceOverSectionProps) {
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const styleAbortRef = useRef<AbortController | null>(null);
  const selectedVoice = voices.find((v) => v.voice_id === selectedVoiceId) || null;
  const providerLabel = voiceProvider === 'google' ? 'AI Studio' : 'ElevenLabs';
  const isPerSentenceMode = voiceGenerationMode === 'perSentence';
  const showElevenLabsAutoGenerationStrategy =
    voiceProvider === 'elevenlabs' && !isPerSentenceMode;
  const usesElevenLabsChunkGeneration =
    showElevenLabsAutoGenerationStrategy &&
    elevenLabsAutoGenerationStrategy === 'chunks';
  const haveStyleInstructions = Boolean(String(styleInstructions ?? '').trim());
  const hasVoiceSelection = Boolean(voiceOver || String(voicePreviewUrl ?? '').trim());
  const resolvedVoiceName = voiceOver?.name || (savedVoiceId ? 'Library voice-over' : 'Saved voice-over');
  const [isGeneratingStyle, setIsGeneratingStyle] = useState(false);
  const [styleGenError, setStyleGenError] = useState<string | null>(null);

  const [isAddElevenLabsVoiceOpen, setIsAddElevenLabsVoiceOpen] = useState(false);
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState('');
  const [isImportingElevenLabsVoice, setIsImportingElevenLabsVoice] = useState(false);
  const [importElevenLabsError, setImportElevenLabsError] = useState<string | null>(
    null,
  );

  const stopVoicePlayback = () => {
    try {
      previewAudioRef.current?.pause();
      if (previewAudioRef.current) {
        previewAudioRef.current.currentTime = 0;
      }
    } catch {
      // ignore
    }

    try {
      currentVoiceAudioRef.current?.pause();
      if (currentVoiceAudioRef.current) {
        currentVoiceAudioRef.current.currentTime = 0;
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isGeneratingVoice) return;
    stopVoicePlayback();
  }, [isGeneratingVoice]);

  useEffect(() => {
    stopVoicePlayback();
  }, [voicePreviewUrl]);

  useEffect(() => {
    return () => {
      stopVoicePlayback();
    };
  }, []);

  const handleImportElevenLabsVoice = async () => {
    if (voiceProvider !== 'elevenlabs') return;

    const trimmed = String(elevenLabsVoiceId ?? '').trim();
    if (!trimmed) {
      setImportElevenLabsError('Please enter a voiceId.');
      return;
    }

    setIsImportingElevenLabsVoice(true);
    setImportElevenLabsError(null);

    try {
      const res = await api.post<{ voice_id?: string }>(
        '/voice-overs/elevenlabs/import',
        { voiceId: trimmed },
      );
      const importedVoiceId = String(res.data?.voice_id ?? '').trim();
      if (importedVoiceId) {
        onSelectVoice(importedVoiceId);
      }

      setIsAddElevenLabsVoiceOpen(false);
      setElevenLabsVoiceId('');
      setImportElevenLabsError(null);
      onRefreshVoices();
    } catch (error) {
      console.error('Import ElevenLabs voice failed', error);
      const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      if (Array.isArray(message)) {
        const firstMessage = message.find(
          (item) => typeof item === 'string' && item.trim().length > 0,
        );
        setImportElevenLabsError(
          typeof firstMessage === 'string'
            ? firstMessage.trim()
            : 'Failed to import voice. Please try again.',
        );
      } else if (typeof message === 'string' && message.trim().length > 0) {
        setImportElevenLabsError(message.trim());
      } else {
        setImportElevenLabsError('Failed to import voice. Please try again.');
      }
    } finally {
      setIsImportingElevenLabsVoice(false);
    }
  };

  const handleGenerateStyleWithAi = async () => {
    if (!onStyleInstructionsChange) return;
    if (!script.trim()) {
      setStyleGenError('Add or generate a script first.');
      return;
    }

    // Cancel any previous stream.
    styleAbortRef.current?.abort();
    const controller = new AbortController();
    styleAbortRef.current = controller;

    setStyleGenError(null);
    setIsGeneratingStyle(true);
    onStyleInstructionsChange('');

    try {
      const response = await fetch(`${API_URL}/ai/generate-voice-style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          script,
          instructionMode: isPerSentenceMode ? 'tone-only' : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start style generation');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          acc += chunk;
          onStyleInstructionsChange(acc);
        }
      }
    } catch (error: unknown) {
      const aborted =
        error instanceof Error && error.name === 'AbortError';
      if (!aborted) {
        console.error('Generate style instructions failed', error);
        setStyleGenError('Failed to generate style. Please try again.');
      }
    } finally {
      setIsGeneratingStyle(false);
    }
  };

  const handlePlayPreview = () => {
    if (!selectedVoice) return;

    // For AI Studio: when style instructions are provided, generate a fresh preview
    // so it reflects the requested style instead of playing the cached preview_url.
    if (voiceProvider === 'google' && haveStyleInstructions && onPreviewVoice) {
      onPreviewVoice(selectedVoice.voice_id);
      return;
    }

    // ElevenLabs static preview (when provided)
    if (selectedVoice.preview_url && previewAudioRef.current) {
      try {
        previewAudioRef.current.currentTime = 0;
        void previewAudioRef.current.play();
      } catch (error) {
        console.error('Failed to play voice preview', error);
      }
      return;
    }

    // AI Studio (Gemini TTS) preview: generate a short clip via backend
    if (onPreviewVoice) {
      onPreviewVoice(selectedVoice.voice_id);
    }
  };

  const canPreview = Boolean(selectedVoice?.preview_url || onPreviewVoice);
  const isPreviewDisabled =
    !selectedVoice ||
    !canPreview ||
    Boolean(isGeneratingVoice) ||
    Boolean(isPreviewingVoice) ||
    Boolean(isSettingFavoriteVoice);
  const generateVoiceLabel = isGeneratingVoice
    ? voiceGenerationProgress?.stage === 'merging'
      ? `Merging ${voiceGenerationProgress.total} parts...`
      : voiceGenerationProgress && voiceGenerationProgress.total > 1
        ? `Generating part ${voiceGenerationProgress.current}/${voiceGenerationProgress.total}...`
        : `Generating voice with ${providerLabel}...`
    : isPerSentenceMode
      ? `Generate sentence voices with ${providerLabel}`
      : `Generate with ${providerLabel}`;
  const regenerateVoiceLabel = isGeneratingVoice
    ? voiceGenerationProgress?.stage === 'merging'
      ? `Merging ${voiceGenerationProgress.total} parts...`
      : voiceGenerationProgress && voiceGenerationProgress.total > 1
        ? `Generating part ${voiceGenerationProgress.current}/${voiceGenerationProgress.total}...`
        : 'Generating...'
    : isPerSentenceMode
      ? 'Regenerate all sentences'
      : 'Regenerate';

  return (
    <AccordionItem value="voice" className="px-6">
      <AccordionTrigger className="hover:no-underline py-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Mic className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">Voice Over</h3>
            <p className="text-sm text-gray-500">
              {voiceOver ? `${voiceOver.name} uploaded` : 'Upload or generate voice-over'}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-6 pb-2">
          {/* Upload Section */}
          <div className="bg-linear-to-br from-purple-50 to-indigo-50/50 rounded-lg p-5 border border-purple-100">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full"></div>
              Audio Configuration
            </h4>

            {isHydratingVoiceOver ? (
              <div className="rounded-xl border border-purple-200 bg-white p-5 shadow-sm">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-purple-100"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 rounded-full bg-purple-100"></div>
                      <div className="h-3 w-64 rounded-full bg-gray-100"></div>
                      <div className="h-8 w-full rounded-lg bg-gray-100"></div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="h-10 rounded-lg bg-gray-100"></div>
                    <div className="h-10 rounded-lg bg-gray-100"></div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-purple-700">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading saved voice-over...</span>
                </div>
              </div>
            ) : !hasVoiceSelection ? (
              <div className="space-y-4">
                {/* Provider toggle */}
                <div className="bg-white rounded-xl border border-purple-200 p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-linear-to-b from-purple-500 to-indigo-500 rounded-full"></div>
                      <p className="text-sm font-semibold text-gray-900">Voice Provider</p>
                    </div>
                  </div>

                  <Select
                    value={voiceProvider}
                    onValueChange={(v) => onVoiceProviderChange(v as 'google' | 'elevenlabs')}
                  >
                    <SelectTrigger label="Provider">
                      <SelectValue placeholder="Choose a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">AI Studio</SelectItem>
                      <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={voiceGenerationMode}
                    onValueChange={(v) =>
                      onVoiceGenerationModeChange(v as 'auto' | 'perSentence')
                    }
                  >
                    <SelectTrigger label="Generation mode">
                      <SelectValue placeholder="Choose generation mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="perSentence">Per sentence</SelectItem>
                    </SelectContent>
                  </Select>

                  {showElevenLabsAutoGenerationStrategy ? (
                    <Select
                      value={elevenLabsAutoGenerationStrategy}
                      onValueChange={(v) =>
                        onElevenLabsAutoGenerationStrategyChange(
                          v as 'oneTake' | 'chunks',
                        )
                      }
                    >
                      <SelectTrigger label="Long voice generation">
                        <SelectValue placeholder="Choose how long voices are generated" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oneTake">One take</SelectItem>
                        <SelectItem value="chunks">Chunked if needed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}

                  <p className="text-[11px] text-gray-500">
                    {isPerSentenceMode
                      ? 'Each sentence gets its own voice clip, then everything is merged into one final voice-over.'
                      : usesElevenLabsChunkGeneration
                        ? 'Long ElevenLabs voice-overs use the current chunked flow and merge the generated parts afterward.'
                        : voiceProvider === 'elevenlabs'
                          ? 'ElevenLabs generates the full voice-over directly as one take, even for long scripts.'
                          : 'Long scripts are split automatically when needed using the current chunked voice flow.'}
                  </p>
                </div>

                {/* Voice selection from synced ElevenLabs voices (Select input) */}
                <div className="bg-white rounded-xl border border-purple-200 p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-linear-to-b from-purple-500 to-indigo-500 rounded-full"></div>
                      <p className="text-sm font-semibold text-gray-900">
                        Select {providerLabel} Voice
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {voiceProvider === 'elevenlabs' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setImportElevenLabsError(null);
                            setIsAddElevenLabsVoiceOpen(true);
                          }}
                          disabled={isLoadingVoices}
                          className="h-7 px-3 text-[11px] border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-all"
                        >
                          Add Voice
                        </Button>
                      ) : null}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onRefreshVoices}
                        disabled={isLoadingVoices}
                        className="h-7 px-3 text-[11px] border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-all"
                      >
                        {isLoadingVoices ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Refreshing
                          </>
                        ) : (
                          'Refresh'
                        )}
                      </Button>
                    </div>
                  </div>

                  {isAddElevenLabsVoiceOpen ? (
                    <div
                      className="fixed inset-0 z-60 min-h-screen flex items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-200"
                      onClick={() => {
                        if (isImportingElevenLabsVoice) return;
                        setIsAddElevenLabsVoiceOpen(false);
                      }}
                    >
                      <div
                        className="w-full max-w-xl rounded-3xl shadow-2xl border border-gray-200/80 overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">
                                Add ElevenLabs voice
                              </h3>
                              <p className="text-sm text-gray-500 mt-0.5">
                                Import a voice from ElevenLabs by voiceId
                              </p>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (isImportingElevenLabsVoice) return;
                                setIsAddElevenLabsVoiceOpen(false);
                              }}
                              className="h-9 w-9 p-0 rounded-full hover:bg-gray-100 transition-colors"
                            >
                              <X className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-3">
                          {importElevenLabsError ? (
                            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                              {importElevenLabsError}
                            </div>
                          ) : null}

                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-700">Voice ID</p>
                            <Input
                              value={elevenLabsVoiceId}
                              onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                              placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                              disabled={isImportingElevenLabsVoice}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleImportElevenLabsVoice();
                                }
                              }}
                            />
                            <p className="text-[11px] text-gray-500">
                              Paste a voiceId from your ElevenLabs dashboard.
                            </p>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-linear-to-br from-gray-50 to-white flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isImportingElevenLabsVoice}
                            onClick={() => {
                              setIsAddElevenLabsVoiceOpen(false);
                            }}
                            className="h-10 px-5 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={handleImportElevenLabsVoice}
                            disabled={isImportingElevenLabsVoice}
                            className="h-10 px-6 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                          >
                            {isImportingElevenLabsVoice ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                              </>
                            ) : (
                              'Import'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {voicesError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-red-600">{voicesError}</p>
                    </div>
                  )}

                  {isLoadingVoices && !voices.length ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
                      <span>Loading voices...</span>
                    </div>
                  ) : null}

                  {!isLoadingVoices && !voicesError && !voices.length ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                      <p className="text-xs text-gray-600 text-center">
                        No voices found yet. Click Refresh to load voices.
                      </p>
                    </div>
                  ) : null}

                  {voices.length > 0 && (
                    <div className="space-y-3">
                      <Select
                        value={selectedVoiceId ?? undefined}
                        onValueChange={onSelectVoice}
                      >
                        <SelectTrigger label="Voice">
                          <SelectValue
                            placeholder={
                              selectedVoice
                                ? `${selectedVoice.name} — ${selectedVoice.use_case || 'General use'
                                }`
                                : 'Choose a voice'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="max-h-64 overflow-y-auto">
                          {voices.map((voice) => (
                            <SelectItem
                              key={voice.id}
                              value={voice.voice_id}
                              className="py-3"
                            >
                              <div className="flex items-center justify-between gap-3 w-full">
                                <div className="flex flex-col items-start gap-0.5 min-w-0">
                                  <span className="text-sm font-semibold text-gray-900 truncate">
                                    {voice.name}
                                  </span>
                                </div>
                              </div>
                              {/* <span className="text-xs text-gray-600">
                                {voice.use_case || 'General use'}
                              </span> */}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {voiceProvider === 'google' && onStyleInstructionsChange ? (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-gray-900">
                            {isPerSentenceMode
                              ? 'Global Style Instructions (optional)'
                              : 'Style Instructions (optional)'}
                          </p>
                          <Textarea
                            value={styleInstructions ?? ''}
                            onChange={(e) => onStyleInstructionsChange(e.target.value)}
                            placeholder={
                              isPerSentenceMode
                                ? 'E.g. Calm, grounded, documentary tone.'
                                : 'E.g. Calm, warm, and confident. Slightly slower pace. Friendly tone.'
                            }
                            className="min-h-21"
                          />
                          <div className="flex justify-end gap-2 pt-1 mt-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleGenerateStyleWithAi}
                              disabled={isGeneratingStyle || !script.trim()}
                              className="h-8 px-3 text-[11px] border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                            >
                              {isGeneratingStyle ? (
                                <>
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  {isPerSentenceMode ? 'Generating tone...' : 'Generating...'}
                                </>
                              ) : (
                                <>
                                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                  {isPerSentenceMode ? 'Generate tone with AI' : 'Generate with AI'}
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            {isPerSentenceMode
                              ? 'This applies to all AI Studio sentence generations unless a sentence override is set in the sentence voice manager.'
                              : 'These instructions affect how AI Studio speaks the script.'}
                          </p>
                          {styleGenError ? (
                            <p className="text-[11px] text-red-600">{styleGenError}</p>
                          ) : null}
                        </div>
                      ) : null}



                      {/* Selected voice preview - Enhanced styling */}
                      {selectedVoice && canPreview && (
                        <div className="relative overflow-hidden rounded-lg bg-linear-to-br from-purple-50 via-purple-50/50 to-indigo-50/50 border border-purple-200/60 shadow-sm hover:shadow transition-all duration-200">
                          <div className="absolute inset-0 bg-linear-to-br from-purple-400/5 to-indigo-400/5"></div>
                          <div className="relative flex items-center justify-between gap-4 px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="p-2 bg-white rounded-lg shadow-sm border border-purple-100">
                                <Mic className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {selectedVoice.name}
                                </p>
                                <p className="text-xs text-gray-600 truncate">
                                  {selectedVoice.use_case || 'General use'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => onSetFavoriteVoice(selectedVoice.voice_id)}
                                disabled={isSettingFavoriteVoice || selectedVoice.isFavorite}
                                className="inline-flex items-center justify-center rounded-md border border-purple-200 bg-white p-2 text-purple-700 hover:bg-purple-50"
                                title={
                                  selectedVoice.isFavorite
                                    ? 'Favorite voice'
                                    : 'Set as favorite'
                                }
                              >
                                {isSettingFavoriteVoice ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Star
                                    className={
                                      selectedVoice.isFavorite
                                        ? 'h-4 w-4 fill-purple-600'
                                        : 'h-4 w-4'
                                    }
                                  />
                                )}
                              </button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handlePlayPreview}
                                disabled={isPreviewDisabled}
                                className="h-8 gap-1.5 border-purple-200 bg-white text-purple-700 hover:bg-purple-50 hover:border-purple-300 px-3"
                              >
                                {isPreviewingVoice ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Play className="h-3.5 w-3.5 fill-white" />
                                )}
                                <span className="text-xs font-medium">Preview</span>
                              </Button>
                            </div>
                            {selectedVoice.preview_url ? (
                              <audio
                                ref={previewAudioRef}
                                src={selectedVoice.preview_url}
                                className="hidden"
                              />
                            ) : null}
                          </div>
                        </div>
                      )}
                      
                      {voiceProvider === 'elevenlabs' ? (
                        <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                                ElevenLabs defaults
                              </p>
                              {/* <p className="mt-1 text-xs leading-5 text-sky-900">
                                {elevenLabsSettingsSummary || 'Using ElevenLabs provider defaults.'}
                              </p> */}
                              <p className="mt-1 text-[11px] text-sky-700">
                                These settings affect future ElevenLabs generations only.
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={onOpenElevenLabsSettings}
                              disabled={!onOpenElevenLabsSettings || !selectedVoiceId}
                              className="gap-1.5 border-sky-200 bg-white text-sky-700 hover:bg-sky-100"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                              Settings
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Upload Box */}
                <div
                  className="bg-white border-2 border-dashed border-purple-200 rounded-lg p-8 text-center hover:border-purple-400 transition-all duration-200 cursor-pointer group"
                  onClick={() => document.getElementById('voice')?.click()}
                >
                  <input
                    type="file"
                    id="voice"
                    accept="audio/*"
                    onChange={onVoiceUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-3 pointer-events-none">
                    <div className="p-4 bg-purple-50 rounded-full shadow-sm group-hover:bg-purple-100 transition-colors">
                      <Upload className="h-8 w-8 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        Click to upload voice-over
                      </p>
                      <p className="text-xs text-gray-500">MP3, WAV, OGG up to 50MB</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onOpenLibrary}
                    className="gap-1.5 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                  >
                    <Library className="h-3 w-3" />
                    From Library
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative pointer-events-none">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-purple-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-linear-to-br from-purple-50 to-indigo-50/50 px-3 text-gray-600 font-medium">
                      or generate with AI
                    </span>
                  </div>
                </div>

                {/* ElevenLabs Button */}
                {isPerSentenceMode && canManageSentenceVoices ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onOpenSentenceVoiceManager}
                    className="w-full gap-2 text-xs border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Manage Sentence Voices
                  </Button>
                ) : null}

                <Button
                  type="button"
                  size="default"
                  onClick={() => onGenerateVoice(selectedVoiceId)}
                  disabled={
                    isGeneratingVoice || !script.trim() || !selectedVoiceId
                  }
                  className="w-full gap-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  {isGeneratingVoice ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {generateVoiceLabel}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {generateVoiceLabel}
                    </>
                  )}
                </Button>

                {voiceError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-600 text-center">{voiceError}</p>
                  </div>
                )}
              </div>
            ) : (
              /* Voice Preview Card */
              <div className="bg-white rounded-lg border-2 border-purple-200 p-5 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Icon */}
                    <div className="p-3 bg-linear-to-br from-purple-100 to-indigo-100 rounded-lg shrink-0 shadow-sm">
                      <Mic className="h-6 w-6 text-purple-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{resolvedVoiceName}</p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full shrink-0">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                          Ready
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        {voiceOver ? (
                          <div className="flex items-center gap-1">
                            <div className="h-1 w-1 rounded-full bg-gray-400"></div>
                            <span>{(voiceOver.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        ) : null}
                        {voiceDuration && (
                          <div className="flex items-center gap-1">
                            <div className="h-1 w-1 rounded-full bg-gray-400"></div>
                            <span>{voiceDuration.toFixed(1)}s duration</span>
                          </div>
                        )}
                      </div>

                      {/* Audio Player */}
                      <div className="mt-3">
                        {isGeneratingVoice ? (
                          <div className="flex h-10 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs text-amber-800">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Regenerating voice-over. Playback is temporarily disabled.</span>
                          </div>
                        ) : (
                          <audio
                            key={voicePreviewUrl ?? 'voice-preview-empty'}
                            ref={currentVoiceAudioRef}
                            controls
                            src={voicePreviewUrl ?? undefined}
                            className="w-full h-8"
                            style={{ maxWidth: '100%' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={onRemoveVoice}
                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-full transition-all hover:scale-110 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Save / Replace / Regenerate Options */}
                <div className="mt-4 pt-4 border-t border-purple-100 flex flex-col gap-2 sm:flex-row">
                  {voiceProvider === 'elevenlabs' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onOpenElevenLabsSettings}
                      disabled={!onOpenElevenLabsSettings || !selectedVoiceId}
                      className="flex-1 gap-1.5 text-xs border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      Settings
                    </Button>
                  ) : null}
                  {isPerSentenceMode && canManageSentenceVoices ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onOpenSentenceVoiceManager}
                      className="flex-1 gap-1.5 text-xs border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      Sentences
                    </Button>
                  ) : null}
                  {!isPerSentenceMode && canManageVoiceChunks ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onOpenVoiceChunkManager}
                      className="flex-1 gap-1.5 text-xs border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      Chunks
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onOpenVoiceEditor}
                    disabled={!onOpenVoiceEditor || isGeneratingVoice}
                    className="flex-1 gap-1.5 text-xs border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    {isPerSentenceMode ? 'Edit all' : 'Edit'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onSaveVoice}
                    disabled={isSavingVoice || !!savedVoiceId}
                    className="flex-1 gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                  >
                    {isSavingVoice ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving
                      </>
                    ) : savedVoiceId ? (
                      'Saved'
                    ) : (
                      'Save'
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onOpenLibrary}
                    className="flex-1 gap-1.5 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                  >
                    <Library className="h-3 w-3" />
                    From Library
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onGenerateVoice(selectedVoiceId)
                    }
                    disabled={
                      isGeneratingVoice || !script.trim() || !selectedVoiceId
                    }
                    className="flex-1 gap-1.5 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                  >
                    <Sparkles className="h-3 w-3" />
                    {regenerateVoiceLabel}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
