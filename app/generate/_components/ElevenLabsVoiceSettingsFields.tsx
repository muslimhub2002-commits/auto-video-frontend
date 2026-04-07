'use client';

import { Button } from '@/components/ui/button';
import type { ElevenLabsVoiceSettings } from '../_types/sentences';

export const DEFAULT_ELEVENLABS_VOICE_SETTINGS: ElevenLabsVoiceSettings = {
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0,
  speed: 1,
  useSpeakerBoost: true,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

export const normalizeElevenLabsVoiceSettings = (
  value: Partial<ElevenLabsVoiceSettings> | null | undefined,
): ElevenLabsVoiceSettings => ({
  stability: clamp(Number(value?.stability ?? DEFAULT_ELEVENLABS_VOICE_SETTINGS.stability), 0, 1),
  similarityBoost: clamp(
    Number(value?.similarityBoost ?? DEFAULT_ELEVENLABS_VOICE_SETTINGS.similarityBoost),
    0,
    1,
  ),
  style: clamp(Number(value?.style ?? DEFAULT_ELEVENLABS_VOICE_SETTINGS.style), 0, 1),
  speed: clamp(Number(value?.speed ?? DEFAULT_ELEVENLABS_VOICE_SETTINGS.speed), 0.5, 1.5),
  useSpeakerBoost:
    typeof value?.useSpeakerBoost === 'boolean'
      ? value.useSpeakerBoost
      : DEFAULT_ELEVENLABS_VOICE_SETTINGS.useSpeakerBoost,
});

export const describeElevenLabsVoiceSettings = (
  value: Partial<ElevenLabsVoiceSettings> | null | undefined,
) => {
  const settings = normalizeElevenLabsVoiceSettings(value);
  return [
    `Stability ${formatPercent(settings.stability)}`,
    `Similarity ${formatPercent(settings.similarityBoost)}`,
    `Style ${formatPercent(settings.style)}`,
    `Speed ${settings.speed.toFixed(2)}x`,
    settings.useSpeakerBoost ? 'Speaker boost on' : 'Speaker boost off',
  ].join(' • ');
};

type ElevenLabsVoiceSettingsFieldsProps = {
  value: Partial<ElevenLabsVoiceSettings> | null | undefined;
  onChange: (next: ElevenLabsVoiceSettings) => void;
  disabled?: boolean;
  showReset?: boolean;
  resetLabel?: string;
};

type RangeControlProps = {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  displayValue: string;
  onChange: (next: number) => void;
};

function RangeControl({
  label,
  hint,
  min,
  max,
  step,
  value,
  disabled,
  displayValue,
  onChange,
}: RangeControlProps) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-white px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{hint}</p>
        </div>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-sky-100 accent-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

export function ElevenLabsVoiceSettingsFields({
  value,
  onChange,
  disabled = false,
  showReset = false,
  resetLabel = 'Reset to provider defaults',
}: ElevenLabsVoiceSettingsFieldsProps) {
  const settings = normalizeElevenLabsVoiceSettings(value);

  const patch = (patchValue: Partial<ElevenLabsVoiceSettings>) => {
    onChange(normalizeElevenLabsVoiceSettings({ ...settings, ...patchValue }));
  };

  return (
    <div className="space-y-3">
      <RangeControl
        label="Stability"
        hint="Higher values make delivery more consistent and less expressive."
        min={0}
        max={1}
        step={0.01}
        value={settings.stability}
        disabled={disabled}
        displayValue={formatPercent(settings.stability)}
        onChange={(next) => patch({ stability: next })}
      />
      <RangeControl
        label="Similarity"
        hint="Controls how strongly the output adheres to the selected voice profile."
        min={0}
        max={1}
        step={0.01}
        value={settings.similarityBoost}
        disabled={disabled}
        displayValue={formatPercent(settings.similarityBoost)}
        onChange={(next) => patch({ similarityBoost: next })}
      />
      <RangeControl
        label="Style"
        hint="Increases style exaggeration when the selected voice supports it."
        min={0}
        max={1}
        step={0.01}
        value={settings.style}
        disabled={disabled}
        displayValue={formatPercent(settings.style)}
        onChange={(next) => patch({ style: next })}
      />
      <RangeControl
        label="Speed"
        hint="Adjusts pacing. 1.00x is the provider default speed."
        min={0.5}
        max={1.5}
        step={0.01}
        value={settings.speed}
        disabled={disabled}
        displayValue={`${settings.speed.toFixed(2)}x`}
        onChange={(next) => patch({ speed: next })}
      />
      <div className="rounded-2xl border border-sky-100 bg-white px-4 py-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={settings.useSpeakerBoost}
            disabled={disabled}
            onChange={(event) => patch({ useSpeakerBoost: event.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Speaker boost</p>
            <p className="text-xs text-gray-500">
              Keeps the output closer to the source voice at a slightly higher compute cost.
            </p>
          </div>
        </label>
      </div>
      {showReset ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange({ ...DEFAULT_ELEVENLABS_VOICE_SETTINGS })}
            className="border-sky-200 text-sky-700 hover:bg-sky-50"
          >
            {resetLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}