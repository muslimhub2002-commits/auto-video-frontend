'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock3, Save, SlidersHorizontal, Sparkles, Timer, X } from 'lucide-react';

import type { SentenceItem } from '../../_types/sentences';
import {
  getDefaultImageFilterSettings,
  getDefaultImageMotionSettings,
  getImageMotionEffectLabel,
  getVisualEffectLabel,
  IMAGE_MOTION_EFFECT_SELECT_VALUES,
  IMAGE_MOTION_SPEED_MAX,
  IMAGE_MOTION_SPEED_MIN,
  IMAGE_MOTION_SPEED_STEP,
  ImageEffectPreview,
  type ImageFilterPresetDto,
  type ImageFilterSettings,
  type ImageMotionSettings,
  type MotionEffectPresetDto,
  normalizeImageFilterSettings,
  normalizeImageMotionSettings,
  resolveMotionEffectFromSettings,
  resolveVisualEffectFromSettings,
} from './ImageEffectPreview';

const LOOK_EFFECT_VALUES = [
  'none',
  'colorGrading',
  'animatedLighting',
  'glassSubtle',
  'glassReflections',
  'glassStrong',
] as const;

type DetailTab = 'visual' | 'motion';

type ImageEffectsDetailModalProps = {
  isOpen: boolean;
  activeTab: DetailTab;
  previewImageUrl: string | null;
  visualEffect: SentenceItem['visualEffect'] | null | undefined;
  imageMotionEffect: SentenceItem['imageMotionEffect'] | null | undefined;
  imageMotionSpeed: number | null | undefined;
  customImageFilterId: string | null | undefined;
  customMotionEffectId: string | null | undefined;
  imageFilterSettings: Record<string, unknown> | null | undefined;
  imageMotionSettings: Record<string, unknown> | null | undefined;
  imageFilterPresets: ImageFilterPresetDto[];
  motionEffectPresets: MotionEffectPresetDto[];
  onClose: () => void;
  onApply: (params: {
    visualEffect: SentenceItem['visualEffect'] | null;
    customImageFilterId: string | null;
    imageFilterSettings: ImageFilterSettings;
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    customMotionEffectId: string | null;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
  }) => void;
  onSaveImageFilterPreset: (
    title: string,
    settings: ImageFilterSettings,
  ) => Promise<ImageFilterPresetDto | null> | ImageFilterPresetDto | null;
  onSaveMotionEffectPreset: (
    title: string,
    settings: ImageMotionSettings,
  ) => Promise<MotionEffectPresetDto | null> | MotionEffectPresetDto | null;
};

function RangeField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
        <span>{props.label}</span>
        <span>{props.value.toFixed(props.step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-indigo-600"
      />
    </label>
  );
}

export function ImageEffectsDetailModal({
  isOpen,
  activeTab,
  previewImageUrl,
  visualEffect,
  imageMotionEffect,
  imageMotionSpeed,
  customImageFilterId,
  customMotionEffectId,
  imageFilterSettings,
  imageMotionSettings,
  imageFilterPresets,
  motionEffectPresets,
  onClose,
  onApply,
  onSaveImageFilterPreset,
  onSaveMotionEffectPreset,
}: ImageEffectsDetailModalProps) {
  const [currentTab, setCurrentTab] = useState<DetailTab>(activeTab);
  const [lookSaveTitle, setLookSaveTitle] = useState('');
  const [motionSaveTitle, setMotionSaveTitle] = useState('');
  const [isSavingLookPreset, setIsSavingLookPreset] = useState(false);
  const [isSavingMotionPreset, setIsSavingMotionPreset] = useState(false);
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [draftVisualEffect, setDraftVisualEffect] = useState<SentenceItem['visualEffect'] | null>(
    visualEffect ?? null,
  );
  const [draftImageMotionEffect, setDraftImageMotionEffect] = useState<
    NonNullable<SentenceItem['imageMotionEffect']>
  >(imageMotionEffect ?? 'default');
  const [draftImageMotionSpeed, setDraftImageMotionSpeed] = useState<number>(
    imageMotionSpeed ?? 1,
  );
  const [draftCustomImageFilterId, setDraftCustomImageFilterId] = useState<string | null>(
    customImageFilterId ?? null,
  );
  const [draftCustomMotionEffectId, setDraftCustomMotionEffectId] = useState<string | null>(
    customMotionEffectId ?? null,
  );
  const [draftImageFilterSettings, setDraftImageFilterSettings] = useState<ImageFilterSettings>(
    () => normalizeImageFilterSettings(imageFilterSettings, visualEffect ?? null),
  );
  const [draftImageMotionSettings, setDraftImageMotionSettings] = useState<ImageMotionSettings>(
    () =>
      normalizeImageMotionSettings(
        imageMotionSettings,
        imageMotionEffect ?? 'default',
        imageMotionSpeed,
      ),
  );

  const resolvedLook = useMemo(
    () => normalizeImageFilterSettings(draftImageFilterSettings, draftVisualEffect ?? null),
    [draftImageFilterSettings, draftVisualEffect],
  );
  const resolvedMotion = useMemo(
    () =>
      normalizeImageMotionSettings(
        draftImageMotionSettings,
        draftImageMotionEffect ?? 'default',
        draftImageMotionSpeed,
      ),
    [draftImageMotionEffect, draftImageMotionSettings, draftImageMotionSpeed],
  );

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
      return;
    }

    if (!isClosing) {
      setIsRendered(false);
    }
  }, [isClosing, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentTab(activeTab);
    setDraftVisualEffect(visualEffect ?? null);
    setDraftImageMotionEffect(imageMotionEffect ?? 'default');
    setDraftImageMotionSpeed(imageMotionSpeed ?? 1);
    setDraftCustomImageFilterId(customImageFilterId ?? null);
    setDraftCustomMotionEffectId(customMotionEffectId ?? null);
    setDraftImageFilterSettings(
      normalizeImageFilterSettings(imageFilterSettings, visualEffect ?? null),
    );
    setDraftImageMotionSettings(
      normalizeImageMotionSettings(
        imageMotionSettings,
        imageMotionEffect ?? 'default',
        imageMotionSpeed,
      ),
    );
    setLookSaveTitle('');
    setMotionSaveTitle('');
  }, [
    activeTab,
    customImageFilterId,
    customMotionEffectId,
    imageFilterSettings,
    imageMotionEffect,
    imageMotionSettings,
    imageMotionSpeed,
    isOpen,
    visualEffect,
  ]);

  if (!isRendered) return null;

  const handleRequestClose = () => {
    if (isClosing) return;

    setIsClosing(true);
    window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const lookSelectValue = draftCustomImageFilterId
    ? `custom:${draftCustomImageFilterId}`
    : `builtin:${resolveVisualEffectFromSettings(draftImageFilterSettings, draftVisualEffect ?? null)}`;

  const motionSelectValue = draftCustomMotionEffectId
    ? `custom:${draftCustomMotionEffectId}`
    : `builtin:${resolveMotionEffectFromSettings(draftImageMotionSettings, draftImageMotionEffect ?? 'default')}`;

  const handleLookPresetChange = (value: string) => {
    if (value.startsWith('custom:')) {
      const presetId = value.slice('custom:'.length);
      const preset = imageFilterPresets.find((item) => item.id === presetId);
      if (!preset) return;
      const settings = normalizeImageFilterSettings(preset.settings, visualEffect ?? null);
      setDraftVisualEffect(resolveVisualEffectFromSettings(settings, draftVisualEffect ?? null));
      setDraftCustomImageFilterId(preset.id);
      setDraftImageFilterSettings({ ...settings, presetKey: 'custom' });
      return;
    }

    const effect = value.replace('builtin:', '') as SentenceItem['visualEffect'];
    const normalizedEffect = effect === 'none' ? null : effect;
    setDraftVisualEffect(normalizedEffect);
    setDraftCustomImageFilterId(null);
    setDraftImageFilterSettings(getDefaultImageFilterSettings(normalizedEffect));
  };

  const handleMotionPresetChange = (value: string) => {
    if (value.startsWith('custom:')) {
      const presetId = value.slice('custom:'.length);
      const preset = motionEffectPresets.find((item) => item.id === presetId);
      if (!preset) return;
      const settings = normalizeImageMotionSettings(
        preset.settings,
        draftImageMotionEffect ?? 'default',
        draftImageMotionSpeed,
      );
      setDraftImageMotionEffect(
        resolveMotionEffectFromSettings(settings, draftImageMotionEffect ?? 'default'),
      );
      setDraftCustomMotionEffectId(preset.id);
      setDraftImageMotionSettings({ ...settings, presetKey: 'custom' });
      setDraftImageMotionSpeed(settings.speed ?? 1);
      return;
    }

    const effect = value.replace('builtin:', '') as NonNullable<SentenceItem['imageMotionEffect']>;
    const settings = getDefaultImageMotionSettings(effect, draftImageMotionSpeed);
    setDraftImageMotionEffect(effect);
    setDraftCustomMotionEffectId(null);
    setDraftImageMotionSettings(settings);
    setDraftImageMotionSpeed(settings.speed ?? 1);
  };

  const updateLookSettings = (patch: Partial<ImageFilterSettings>) => {
    const nextSettings: ImageFilterSettings = {
      ...resolvedLook,
      ...patch,
      presetKey:
        draftImageFilterSettings?.presetKey === 'custom' ? 'custom' : resolvedLook.presetKey,
    };
    setDraftVisualEffect(resolveVisualEffectFromSettings(nextSettings, draftVisualEffect ?? null));
    setDraftCustomImageFilterId(null);
    setDraftImageFilterSettings(nextSettings);
  };

  const updateMotionSettings = (patch: Partial<ImageMotionSettings>) => {
    const nextSettings: ImageMotionSettings = {
      ...resolvedMotion,
      ...patch,
      presetKey:
        draftImageMotionSettings?.presetKey === 'custom' ? 'custom' : resolvedMotion.presetKey,
    };
    setDraftImageMotionEffect(
      resolveMotionEffectFromSettings(nextSettings, draftImageMotionEffect ?? 'default'),
    );
    setDraftCustomMotionEffectId(null);
    setDraftImageMotionSettings(nextSettings);
    setDraftImageMotionSpeed(nextSettings.speed ?? 1);
  };

  const handleSaveLookPreset = async () => {
    const title = lookSaveTitle.trim();
    if (!title || isSavingLookPreset) return;
    setIsSavingLookPreset(true);
    const saved = await onSaveImageFilterPreset(title, resolvedLook);
    if (saved) {
      setDraftCustomImageFilterId(saved.id);
      setDraftImageFilterSettings({ ...resolvedLook, presetKey: 'custom' });
      setLookSaveTitle('');
    }
    setIsSavingLookPreset(false);
  };

  const handleSaveMotionPreset = async () => {
    const title = motionSaveTitle.trim();
    if (!title || isSavingMotionPreset) return;
    setIsSavingMotionPreset(true);
    const saved = await onSaveMotionEffectPreset(title, resolvedMotion);
    if (saved) {
      setDraftCustomMotionEffectId(saved.id);
      setDraftImageMotionSettings({ ...resolvedMotion, presetKey: 'custom' });
      setMotionSaveTitle('');
    }
    setIsSavingMotionPreset(false);
  };

  const handleApply = () => {
    onApply({
      visualEffect: draftVisualEffect,
      customImageFilterId: draftCustomImageFilterId,
      imageFilterSettings: resolvedLook,
      imageMotionEffect: draftImageMotionEffect,
      customMotionEffectId: draftCustomMotionEffectId,
      imageMotionSettings: resolvedMotion,
      imageMotionSpeed: resolvedMotion.speed ?? draftImageMotionSpeed ?? 1,
    });
    handleRequestClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md ${isClosing
        ? 'animate-out fade-out-0 duration-200'
        : 'animate-in fade-in duration-200'
        }`}
      onClick={handleRequestClose}
    >
      <div
        className={`flex h-[92vh] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl ${isClosing
          ? 'animate-out zoom-out-95 fade-out-0 duration-200'
          : 'animate-in zoom-in-95 duration-300'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 flex-1 flex-col bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Detailed settings</p>
              <h3 className="mt-2 text-2xl font-semibold">Image effects studio</h3>
              <p className="mt-1 text-sm text-slate-300">
                Look edits preview as a still. Motion edits preview with your current look applied.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              className="rounded-full border border-white/15 bg-white/10 p-3 text-white transition hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
            <Button
              type="button"
              onClick={() => setCurrentTab('visual')}
              className={
                currentTab === 'visual'
                  ? 'h-11 flex-1 rounded-xl bg-white text-slate-900 hover:bg-white'
                  : 'h-11 flex-1 rounded-xl bg-transparent text-slate-200 hover:bg-white/10'
              }
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Look
            </Button>
            <Button
              type="button"
              onClick={() => setCurrentTab('motion')}
              className={
                currentTab === 'motion'
                  ? 'h-11 flex-1 rounded-xl bg-white text-slate-900 hover:bg-white'
                  : 'h-11 flex-1 rounded-xl bg-transparent text-slate-200 hover:bg-white/10'
              }
            >
              <Timer className="mr-2 h-4 w-4" />
              Motion
            </Button>
          </div>

          <div className="mt-6 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/30 p-4">
            {previewImageUrl ? (
              <ImageEffectPreview
                visualEffect={draftVisualEffect}
                imageMotionEffect={draftImageMotionEffect}
                imageMotionSpeed={draftImageMotionSpeed}
                imageFilterSettings={resolvedLook}
                imageMotionSettings={resolvedMotion}
                enableMotion={currentTab === 'motion'}
                className="flex max-h-full max-w-full items-center justify-center"
              >
                <img
                  src={previewImageUrl}
                  alt="Detailed effect preview"
                  className="max-h-[66vh] w-auto max-w-full rounded-[1.5rem] object-contain"
                />
              </ImageEffectPreview>
            ) : (
              <div className="flex h-full min-h-80 w-full items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 text-sm text-slate-300">
                Generate or upload an image to preview detailed effect settings.
              </div>
            )}
          </div>
        </div>

        <div className="flex w-107.5 shrink-0 flex-col border-l border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 px-6 py-5">
            <h4 className="text-lg font-semibold text-slate-900">
              {currentTab === 'visual' ? 'Look controls' : 'Motion controls'}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {currentTab === 'visual'
                ? 'Blend preset selection with direct filter tuning.'
                : 'Tune transform values and save reusable motion presets.'}
            </p>
          </div>

          <div className="border-b border-slate-200 bg-white px-6 py-4">
            <Button
              type="button"
              onClick={handleApply}
              className="h-11 w-full rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-lg transition-all duration-200 hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl"
            >
              Apply
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {currentTab === 'visual' ? (
              <>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Look preset
                  </div>
                  <Select value={lookSelectValue} onValueChange={handleLookPresetChange}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Choose look preset" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {LOOK_EFFECT_VALUES.map((value) => (
                        <SelectItem key={value} value={`builtin:${value}`}>
                          {value === 'none' ? 'None' : getVisualEffectLabel(value)}
                        </SelectItem>
                      ))}
                      {imageFilterPresets.map((preset) => (
                        <SelectItem key={preset.id} value={`custom:${preset.id}`}>
                          {preset.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                    Filter tuning
                  </div>
                  <RangeField label="Saturation" value={resolvedLook.saturation ?? 1} min={0} max={2.5} step={0.01} onChange={(value) => updateLookSettings({ saturation: value })} />
                  <RangeField label="Contrast" value={resolvedLook.contrast ?? 1} min={0} max={2.5} step={0.01} onChange={(value) => updateLookSettings({ contrast: value })} />
                  <RangeField label="Brightness" value={resolvedLook.brightness ?? 1} min={0} max={2.5} step={0.01} onChange={(value) => updateLookSettings({ brightness: value })} />
                  <RangeField label="Blur" value={resolvedLook.blurPx ?? 0} min={0} max={12} step={0.1} onChange={(value) => updateLookSettings({ blurPx: value })} />
                  <RangeField label="Sepia" value={resolvedLook.sepia ?? 0} min={0} max={1} step={0.01} onChange={(value) => updateLookSettings({ sepia: value })} />
                  <RangeField label="Hue rotate" value={resolvedLook.hueRotateDeg ?? 0} min={-180} max={180} step={1} onChange={(value) => updateLookSettings({ hueRotateDeg: value })} />
                  <RangeField label="Lighting" value={resolvedLook.animatedLightingIntensity ?? 0} min={0} max={1} step={0.01} onChange={(value) => updateLookSettings({ animatedLightingIntensity: value })} />
                  <RangeField label="Glass overlay" value={resolvedLook.glassOverlayOpacity ?? 0} min={0} max={0.4} step={0.01} onChange={(value) => updateLookSettings({ glassOverlayOpacity: value })} />
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Save className="h-4 w-4 text-indigo-600" />
                    Save custom look
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={lookSaveTitle}
                      onChange={(e) => setLookSaveTitle(e.target.value)}
                      placeholder="Preset title"
                      className="h-11 rounded-xl border-slate-200"
                    />
                    <Button
                      type="button"
                      onClick={handleSaveLookPreset}
                      disabled={!lookSaveTitle.trim() || isSavingLookPreset}
                      className="h-11 rounded-xl bg-indigo-600 px-4 text-white hover:bg-indigo-700"
                    >
                      {isSavingLookPreset ? 'Saving' : 'Save'}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Timer className="h-4 w-4 text-sky-600" />
                    Motion preset
                  </div>
                  <Select value={motionSelectValue} onValueChange={handleMotionPresetChange}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Choose motion preset" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {IMAGE_MOTION_EFFECT_SELECT_VALUES.map((value) => (
                        <SelectItem key={value} value={`builtin:${value}`}>
                          {getImageMotionEffectLabel(value)}
                        </SelectItem>
                      ))}
                      {motionEffectPresets.map((preset) => (
                        <SelectItem key={preset.id} value={`custom:${preset.id}`}>
                          {preset.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Clock3 className="h-4 w-4 text-sky-600" />
                    Motion tuning
                  </div>
                  <RangeField label="Speed" value={resolvedMotion.speed ?? 1} min={IMAGE_MOTION_SPEED_MIN} max={IMAGE_MOTION_SPEED_MAX} step={IMAGE_MOTION_SPEED_STEP} onChange={(value) => updateMotionSettings({ speed: value })} />
                  <RangeField label="Initial zoom" value={resolvedMotion.startScale ?? 1} min={0.5} max={2} step={0.01} onChange={(value) => updateMotionSettings({ startScale: value })} />
                  <RangeField label="Target scale" value={resolvedMotion.endScale ?? 1.055} min={0.5} max={2} step={0.01} onChange={(value) => updateMotionSettings({ endScale: value })} />
                  <RangeField label="X start" value={resolvedMotion.translateXStart ?? 0} min={-20} max={20} step={0.1} onChange={(value) => updateMotionSettings({ translateXStart: value })} />
                  <RangeField label="X end" value={resolvedMotion.translateXEnd ?? 0} min={-20} max={20} step={0.1} onChange={(value) => updateMotionSettings({ translateXEnd: value })} />
                  <RangeField label="Y start" value={resolvedMotion.translateYStart ?? 0} min={-20} max={20} step={0.1} onChange={(value) => updateMotionSettings({ translateYStart: value })} />
                  <RangeField label="Y end" value={resolvedMotion.translateYEnd ?? 0} min={-20} max={20} step={0.1} onChange={(value) => updateMotionSettings({ translateYEnd: value })} />
                  <RangeField label="Rotate start" value={resolvedMotion.rotateStart ?? 0} min={-10} max={10} step={0.1} onChange={(value) => updateMotionSettings({ rotateStart: value })} />
                  <RangeField label="Rotate end" value={resolvedMotion.rotateEnd ?? 0} min={-10} max={10} step={0.1} onChange={(value) => updateMotionSettings({ rotateEnd: value })} />
                  <RangeField label="Origin X" value={resolvedMotion.originX ?? 50} min={0} max={100} step={1} onChange={(value) => updateMotionSettings({ originX: value })} />
                  <RangeField label="Origin Y" value={resolvedMotion.originY ?? 50} min={0} max={100} step={1} onChange={(value) => updateMotionSettings({ originY: value })} />
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Save className="h-4 w-4 text-sky-600" />
                    <span className='capitalize'>Save custom motion</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={motionSaveTitle}
                      onChange={(e) => setMotionSaveTitle(e.target.value)}
                      placeholder="Preset title"
                      className="h-11 rounded-xl border-slate-200"
                    />
                    <Button
                      type="button"
                      onClick={handleSaveMotionPreset}
                      disabled={!motionSaveTitle.trim() || isSavingMotionPreset}
                      className="h-11 rounded-xl bg-sky-600 px-4 text-white hover:bg-sky-700"
                    >
                      {isSavingMotionPreset ? 'Saving' : 'Save'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}