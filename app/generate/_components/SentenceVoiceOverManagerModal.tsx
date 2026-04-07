'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ElevenLabsVoiceSettings, SentenceItem } from '../_types/sentences';
import {
  DEFAULT_ELEVENLABS_VOICE_SETTINGS,
  ElevenLabsVoiceSettingsFields,
  describeElevenLabsVoiceSettings,
  normalizeElevenLabsVoiceSettings,
} from './ElevenLabsVoiceSettingsFields';
import { Loader2, Mic, SlidersHorizontal, Sparkles, Wand2, X } from 'lucide-react';

type SentenceVoiceCandidate = {
  previewUrl: string;
  durationSeconds: number | null;
  provider: 'google' | 'elevenlabs';
  voiceName: string | null;
};

type SentenceVoiceOverManagerModalProps = {
  isOpen: boolean;
  sentences: SentenceItem[];
  voiceProvider: 'google' | 'elevenlabs';
  globalElevenLabsSettings: ElevenLabsVoiceSettings | null;
  isGeneratingSentenceStyleById: Record<string, boolean>;
  isRegeneratingSentenceVoiceById: Record<string, boolean>;
  isApplyingSentenceVoiceCandidateById: Record<string, boolean>;
  sentenceVoiceCandidateById: Record<string, SentenceVoiceCandidate | null>;
  onClose: () => void;
  onSentenceStyleChange: (sentenceId: string, value: string) => void;
  onSentenceElevenLabsSettingsChange: (
    sentenceId: string,
    settings: ElevenLabsVoiceSettings | null,
  ) => void;
  onGenerateSentenceStyle: (sentenceId: string) => void;
  onRegenerateSentenceVoice: (sentenceId: string) => void;
  onApplyCandidate: (sentenceId: string) => void;
  onCancelCandidate: (sentenceId: string) => void;
};

export function SentenceVoiceOverManagerModal({
  isOpen,
  sentences,
  voiceProvider,
  globalElevenLabsSettings,
  isGeneratingSentenceStyleById,
  isRegeneratingSentenceVoiceById,
  isApplyingSentenceVoiceCandidateById,
  sentenceVoiceCandidateById,
  onClose,
  onSentenceStyleChange,
  onSentenceElevenLabsSettingsChange,
  onGenerateSentenceStyle,
  onRegenerateSentenceVoice,
  onApplyCandidate,
  onCancelCandidate,
}: SentenceVoiceOverManagerModalProps) {
  const [expandedSettingsSentenceId, setExpandedSettingsSentenceId] = useState<string | null>(
    null,
  );

  if (!isOpen) return null;

  const items = sentences.filter((sentence) => String(sentence.text ?? '').trim());

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-sky-50 via-white to-indigo-50 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sentence Voice Overs</h3>
            <p className="text-sm text-gray-500">
              Regenerate a single sentence, preview it, then replace only when it sounds right.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 rounded-full p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            {items.map((sentence, index) => {
              const candidate = sentenceVoiceCandidateById[sentence.id];
              const hasVoice = Boolean(String(sentence.voiceOverUrl ?? '').trim());
              const resolvedProvider = sentence.voiceOverProvider ?? voiceProvider;
              const resolvedVoiceName =
                String(sentence.voiceOverVoiceName ?? '').trim() || 'Attached voice';
              const hasCustomElevenLabsSettings = Boolean(sentence.elevenLabsSettings);
              const resolvedElevenLabsSettingsSummary = hasCustomElevenLabsSettings
                ? describeElevenLabsVoiceSettings(sentence.elevenLabsSettings)
                : globalElevenLabsSettings
                  ? `Using global defaults: ${describeElevenLabsVoiceSettings(globalElevenLabsSettings)}`
                  : 'Using ElevenLabs provider defaults.';
              const isSettingsOpen = expandedSettingsSentenceId === sentence.id;
              const isGeneratingStyle = Boolean(
                isGeneratingSentenceStyleById[sentence.id],
              );
              const isRegenerating = Boolean(
                isRegeneratingSentenceVoiceById[sentence.id],
              );
              const isApplyingCandidate = Boolean(
                isApplyingSentenceVoiceCandidateById[sentence.id],
              );

              return (
                <div
                  key={sentence.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                        Sentence {index + 1}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-6 text-gray-900">
                        {sentence.text}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-600 shadow-sm">
                        <Mic className="h-3.5 w-3.5 text-sky-600" />
                        {hasVoice ? 'Sentence voice ready' : 'No sentence voice yet'}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-800">
                        <span>
                          {resolvedProvider === 'google' ? 'AI Studio' : 'ElevenLabs'}
                        </span>
                        <span className="text-sky-400">/</span>
                        <span>{resolvedVoiceName}</span>
                      </div>
                      {resolvedProvider === 'elevenlabs' ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-800">
                          <span>
                            {hasCustomElevenLabsSettings ? 'Custom EL settings' : 'Global EL defaults'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {hasVoice ? (
                    <div className="mb-3 rounded-xl border border-sky-100 bg-white px-3 py-3">
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-500">
                        <span>Current sentence voice</span>
                        {typeof sentence.voiceOverDurationSeconds === 'number' &&
                        sentence.voiceOverDurationSeconds > 0 ? (
                          <span>{sentence.voiceOverDurationSeconds.toFixed(1)}s</span>
                        ) : null}
                      </div>
                      <audio controls src={sentence.voiceOverUrl ?? undefined} className="w-full" />
                    </div>
                  ) : null}

                  {resolvedProvider === 'google' ? (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800">
                          Sentence style instructions
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onGenerateSentenceStyle(sentence.id)}
                          disabled={isGeneratingStyle || isRegenerating || isApplyingCandidate}
                          className="h-8 gap-1.5 border-amber-200 text-[11px] text-amber-800 hover:bg-amber-50"
                        >
                          {isGeneratingStyle ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Generating
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              Generate with AI
                            </>
                          )}
                        </Button>
                      </div>
                      <Textarea
                        value={sentence.voiceOverStyleInstructions ?? ''}
                        onChange={(event) =>
                          onSentenceStyleChange(sentence.id, event.target.value)
                        }
                        placeholder="Add style instructions for this sentence only."
                        className="min-h-20 bg-white"
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {resolvedProvider === 'elevenlabs' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setExpandedSettingsSentenceId((current) =>
                            current === sentence.id ? null : sentence.id,
                          )
                        }
                        className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        {isSettingsOpen ? 'Hide settings' : 'Sentence settings'}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onRegenerateSentenceVoice(sentence.id)}
                      disabled={isRegenerating || isApplyingCandidate || isGeneratingStyle}
                      className="gap-1.5 bg-linear-to-r from-sky-600 to-indigo-600 text-white hover:from-sky-700 hover:to-indigo-700"
                    >
                      {isRegenerating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Regenerating
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3.5 w-3.5" />
                          {hasVoice ? 'Regenerate Sentence Voice' : 'Generate Sentence Voice'}
                        </>
                      )}
                    </Button>
                  </div>

                  {resolvedProvider === 'elevenlabs' && isSettingsOpen ? (
                    <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-4">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-indigo-950">
                            Sentence ElevenLabs settings
                          </p>
                          <p className="text-xs leading-5 text-indigo-900/80">
                            {resolvedElevenLabsSettingsSummary}
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-medium text-indigo-800">
                          <input
                            type="checkbox"
                            checked={hasCustomElevenLabsSettings}
                            onChange={(event) => {
                              if (!event.target.checked) {
                                onSentenceElevenLabsSettingsChange(sentence.id, null);
                                return;
                              }

                              onSentenceElevenLabsSettingsChange(
                                sentence.id,
                                normalizeElevenLabsVoiceSettings(
                                  sentence.elevenLabsSettings ??
                                    globalElevenLabsSettings ??
                                    DEFAULT_ELEVENLABS_VOICE_SETTINGS,
                                ),
                              );
                            }}
                            className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Use custom settings
                        </label>
                      </div>

                      {hasCustomElevenLabsSettings ? (
                        <ElevenLabsVoiceSettingsFields
                          value={sentence.elevenLabsSettings}
                          onChange={(settings) =>
                            onSentenceElevenLabsSettingsChange(sentence.id, settings)
                          }
                          showReset
                          resetLabel="Reset sentence settings"
                        />
                      ) : (
                        <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/70 px-4 py-4 text-sm text-indigo-900">
                          <p className="font-medium">Using global defaults</p>
                          <p className="mt-1 text-xs leading-5 text-indigo-900/80">
                            {globalElevenLabsSettings
                              ? describeElevenLabsVoiceSettings(globalElevenLabsSettings)
                              : 'No custom global defaults saved yet. ElevenLabs provider defaults will be used.'}
                          </p>
                        </div>
                      )}

                      <p className="mt-3 text-[11px] text-indigo-900/75">
                        These settings apply the next time you regenerate this sentence and replace its clip.
                      </p>
                    </div>
                  ) : null}

                  {candidate ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-emerald-900">
                          New preview
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-emerald-800">
                            {candidate.provider === 'google' ? 'AI Studio' : 'ElevenLabs'}
                            {candidate.voiceName ? ` / ${candidate.voiceName}` : ''}
                          </span>
                          {typeof candidate.durationSeconds === 'number' &&
                          candidate.durationSeconds > 0 ? (
                            <span className="text-xs text-emerald-800">
                              {candidate.durationSeconds.toFixed(1)}s
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <audio controls src={candidate.previewUrl} className="w-full" />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onCancelCandidate(sentence.id)}
                          disabled={isApplyingCandidate}
                          className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onApplyCandidate(sentence.id)}
                          disabled={isApplyingCandidate}
                          className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          {isApplyingCandidate ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Replacing
                            </>
                          ) : (
                            'Replace this sentence voice'
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}