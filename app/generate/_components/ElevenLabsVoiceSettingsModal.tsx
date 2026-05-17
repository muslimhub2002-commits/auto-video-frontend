'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type {
  ElevenLabsModel,
  ElevenLabsVoiceSettings,
} from '../_types/sentences';
import {
  DEFAULT_ELEVENLABS_MODEL,
  DEFAULT_ELEVENLABS_VOICE_SETTINGS,
  ELEVENLABS_MODEL_OPTIONS,
  ElevenLabsVoiceSettingsFields,
  describeElevenLabsVoiceSettings,
  formatElevenLabsModelLabel,
  normalizeElevenLabsModel,
  normalizeElevenLabsVoiceSettings,
} from './ElevenLabsVoiceSettingsFields';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SlidersHorizontal, X } from 'lucide-react';

type ElevenLabsVoiceSettingsModalProps = {
  voiceName: string | null;
  initialModel?: ElevenLabsModel | null;
  initialSettings: ElevenLabsVoiceSettings | null;
  onClose: () => void;
  onSave: (value: {
    model: ElevenLabsModel;
    settings: ElevenLabsVoiceSettings;
  }) => void;
};

export function ElevenLabsVoiceSettingsModal({
  voiceName,
  initialModel,
  initialSettings,
  onClose,
  onSave,
}: ElevenLabsVoiceSettingsModalProps) {
  const [draftModel, setDraftModel] = useState<ElevenLabsModel>(
    normalizeElevenLabsModel(initialModel ?? DEFAULT_ELEVENLABS_MODEL),
  );
  const [draft, setDraft] = useState<ElevenLabsVoiceSettings>(
    normalizeElevenLabsVoiceSettings(initialSettings ?? DEFAULT_ELEVENLABS_VOICE_SETTINGS),
  );

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-sky-50 via-white to-indigo-50 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              ElevenLabs voice settings
            </h3>
            <p className="text-sm text-gray-500">
              {voiceName
                ? `Defaults for ${voiceName}. These affect future ElevenLabs generations.`
                : 'These defaults affect future ElevenLabs generations.'}
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
          <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <SlidersHorizontal className="h-4 w-4" />
              Current defaults
            </div>
            <p className="text-xs leading-5 text-sky-800">
              {describeElevenLabsVoiceSettings(draft, { model: draftModel })}
            </p>
          </div>

          <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-indigo-950">Model</p>
                <p className="text-xs text-indigo-900/80">
                  Choose which ElevenLabs model new generations should use.
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {formatElevenLabsModelLabel(draftModel)}
              </span>
            </div>
            <Select
              value={draftModel}
              onValueChange={(value) => setDraftModel(normalizeElevenLabsModel(value))}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select an ElevenLabs model" />
              </SelectTrigger>
              <SelectContent>
                {ELEVENLABS_MODEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs leading-5 text-indigo-900/80">
              {
                ELEVENLABS_MODEL_OPTIONS.find((option) => option.value === draftModel)
                  ?.description
              }
            </p>
          </div>

          <ElevenLabsVoiceSettingsFields
            value={draft}
            model={draftModel}
            onChange={setDraft}
            showReset
          />
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <p className="text-xs text-gray-500">
            Existing clips stay unchanged until you regenerate them.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => onSave({ model: draftModel, settings: draft })}>
              Save defaults
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}