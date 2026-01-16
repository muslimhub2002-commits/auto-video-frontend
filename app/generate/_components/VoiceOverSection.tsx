'use client';

import { useRef, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
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
import { Mic, Upload, X, Sparkles, Loader2, Play, Library, Star } from 'lucide-react';

interface VoiceOverSectionProps {
  script: string;
  voiceOver: File | null;
  voiceDuration: number | null;
  voiceError: string | null;
  isGeneratingVoice: boolean;
  isSavingVoice: boolean;
  savedVoiceId: string | null;
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
  onGenerateVoiceWithElevenLabs: (voiceId?: string | null) => void;
  onRemoveVoice: () => void;
  onOpenLibrary: () => void;
  onSaveVoice: () => void;
}

export function VoiceOverSection({
  script,
  voiceOver,
  voiceDuration,
  voiceError,
  isGeneratingVoice,
  isSavingVoice,
  savedVoiceId,
  voices,
  isLoadingVoices,
  voicesError,
  selectedVoiceId,
  onSelectVoice,
  onRefreshVoices,
  onSetFavoriteVoice,
  isSettingFavoriteVoice,
  onVoiceUpload,
  onGenerateVoiceWithElevenLabs,
  onRemoveVoice,
  onOpenLibrary,
  onSaveVoice,
}: VoiceOverSectionProps) {
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const selectedVoice = voices.find((v) => v.voice_id === selectedVoiceId) || null;

  const handlePlayPreview = () => {
    if (!selectedVoice?.preview_url || !previewAudioRef.current) return;
    try {
      previewAudioRef.current.currentTime = 0;
      void previewAudioRef.current.play();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to play voice preview', error);
    }
  };
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

            {!voiceOver ? (
              <div className="space-y-4">
                {/* Voice selection from synced ElevenLabs voices (Select input) */}
                <div className="bg-white rounded-xl border border-purple-200 p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-linear-to-b from-purple-500 to-indigo-500 rounded-full"></div>
                      <p className="text-sm font-semibold text-gray-900">
                        Select AI Voice
                      </p>
                    </div>
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
                        No voices found yet. Use the sync button below to
                        import voices from ElevenLabs, then refresh.
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

                      {/* Selected voice preview - Enhanced styling */}
                      {selectedVoice && selectedVoice.preview_url && (
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
                                onClick={handlePlayPreview}
                                className="gap-1.5 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
                              >
                                <Play className="h-3.5 w-3.5 fill-white" />
                                <span className="text-xs font-medium">Preview</span>
                              </Button>
                            </div>
                            <audio
                              ref={previewAudioRef}
                              src={selectedVoice.preview_url}
                              className="hidden"
                            />
                          </div>
                        </div>
                      )}
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
                <Button
                  type="button"
                  size="default"
                  onClick={() => onGenerateVoiceWithElevenLabs(selectedVoiceId)}
                  disabled={
                    isGeneratingVoice || !script.trim() || !selectedVoiceId
                  }
                  className="w-full gap-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  {isGeneratingVoice ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating voice with ElevenLabs...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate with ElevenLabs
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
                        <p className="text-sm font-semibold text-gray-900 truncate">{voiceOver.name}</p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full shrink-0">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                          Ready
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <div className="h-1 w-1 rounded-full bg-gray-400"></div>
                          <span>{(voiceOver.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        {voiceDuration && (
                          <div className="flex items-center gap-1">
                            <div className="h-1 w-1 rounded-full bg-gray-400"></div>
                            <span>{voiceDuration.toFixed(1)}s duration</span>
                          </div>
                        )}
                      </div>

                      {/* Audio Player */}
                      <div className="mt-3">
                        <audio
                          controls
                          src={URL.createObjectURL(voiceOver)}
                          className="w-full h-8"
                          style={{ maxWidth: '100%' }}
                        />
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
                    onClick={() => document.getElementById('voice')?.click()}
                    className="flex-1 gap-1.5 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                  >
                    <Upload className="h-3 w-3" />
                    Replace
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onGenerateVoiceWithElevenLabs(selectedVoiceId)
                    }
                    disabled={
                      isGeneratingVoice || !script.trim() || !selectedVoiceId
                    }
                    className="flex-1 gap-1.5 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                  >
                    <Sparkles className="h-3 w-3" />
                    Regenerate
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
