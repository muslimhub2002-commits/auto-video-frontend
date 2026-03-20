'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog } from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock3, Loader2, Save, SlidersHorizontal, Sparkles, Timer, Trash2, Wand2, X } from 'lucide-react';

import type { SentenceItem } from '../../_types/sentences';
import {
  getDefaultImageFilterSettings,
  getDefaultImageMotionSettings,
  getDefaultImageMotionSpeed,
  getImageMotionEffectLabel,
  getVisualEffectLabel,
  IMAGE_MOTION_EFFECT_SELECT_VALUES,
  IMAGE_MOTION_SPEED_MAX,
  IMAGE_MOTION_SPEED_MIN,
  IMAGE_MOTION_SPEED_STEP,
  DEFAULT_IMAGE_MOTION_SPEED,
  ImageEffectPreview,
  type ImageFilterPresetDto,
  type ImageFilterSettings,
  type ImageMotionSettings,
  type MotionEffectPresetDto,
  normalizeImageFilterSettings,
  normalizeImageMotionSettings,
  resolveImageMotionSpeed,
  resolveMotionEffectFromSettings,
  resolveVisualEffectFromSettings,
} from './ImageEffectPreview';
import { TEMPORARY_CUSTOM_PRESET_ID } from '../../_utils/imageEffectSelection';

const LOOK_EFFECT_VALUES = [
  'none',
  'colorGrading',
  'animatedLighting',
  'glassSubtle',
  'glassReflections',
  'glassStrong',
] as const;

type DetailTab = 'visual' | 'motion';

type DebouncedPreviewState = {
  visualEffect: SentenceItem['visualEffect'] | null;
  imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
  imageMotionSpeed: number;
  imageFilterSettings: ImageFilterSettings;
  imageMotionSettings: ImageMotionSettings;
  resetKey: number;
};

const PREVIEW_RESTART_DEBOUNCE_MS = 140;

type ImageEffectsDetailModalProps = {
  isOpen: boolean;
  isShortVideo: boolean;
  activeTab: DetailTab;
  previewImageUrl: string | null;
  visualEffect: SentenceItem['visualEffect'] | null | undefined;
  imageMotionEffect: SentenceItem['imageMotionEffect'] | null | undefined;
  imageMotionSpeed: number | null | undefined;
  customImageFilterId: string | null | undefined;
  customMotionEffectId: string | null | undefined;
  imageFilterSettings: Record<string, unknown> | null | undefined;
  imageMotionSettings: Record<string, unknown> | null | undefined;
  retainedTemporaryLook?: {
    visualEffect: SentenceItem['visualEffect'] | null;
    imageFilterSettings: ImageFilterSettings;
  } | null;
  retainedTemporaryMotion?: {
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
  } | null;
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
  onUpdateImageFilterPreset: (
    presetId: string,
    settings: ImageFilterSettings,
  ) => Promise<ImageFilterPresetDto | null> | ImageFilterPresetDto | null;
  onDeleteImageFilterPreset: (presetId: string) => Promise<boolean> | boolean;
  onSaveMotionEffectPreset: (
    title: string,
    settings: ImageMotionSettings,
  ) => Promise<MotionEffectPresetDto | null> | MotionEffectPresetDto | null;
  onUpdateMotionEffectPreset: (
    presetId: string,
    settings: ImageMotionSettings,
  ) => Promise<MotionEffectPresetDto | null> | MotionEffectPresetDto | null;
  onDeleteMotionEffectPreset: (presetId: string) => Promise<boolean> | boolean;
  onGenerateLookWithAi: (params: {
    visualEffect: SentenceItem['visualEffect'] | null;
    customImageFilterId: string | null;
    imageFilterSettings: ImageFilterSettings;
  }) => Promise<{
    visualEffect: SentenceItem['visualEffect'] | null;
    customImageFilterId: null;
    imageFilterSettings: ImageFilterSettings;
  } | null>;
  onGenerateMotionWithAi: (params: {
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    customMotionEffectId: string | null;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
  }) => Promise<{
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    customMotionEffectId: null;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
  } | null>;
};

function RangeField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`space-y-2 ${props.disabled ? 'opacity-45' : ''}`}>
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
        disabled={props.disabled}
        className={`h-2 w-full accent-indigo-600 ${props.disabled ? 'cursor-not-allowed accent-slate-300' : 'cursor-pointer'}`}
      />
    </label>
  );
}

function EndValueModeField(props: {
  label: string;
  value: 'loop' | 'continue';
  disabled?: boolean;
  name: string;
  onChange: (value: 'loop' | 'continue') => void;
}) {
  return (
    <div
      className={`space-y-2 mt-2 rounded-xl border px-3 py-3 ${
        props.disabled
          ? 'border-slate-200 bg-slate-50 text-slate-400'
          : 'border-sky-200 bg-sky-50 text-sky-900'
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
        {props.label}
      </div>
      <div className="flex flex-wrap gap-3">
        <label
          className={`flex items-center gap-2 text-xs font-medium ${
            props.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <input
            type="radio"
            name={props.name}
            checked={props.value === 'loop'}
            disabled={props.disabled}
            onChange={() => props.onChange('loop')}
            className="h-4 w-4 border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span>Loop between start and end</span>
        </label>
        <label
          className={`flex items-center gap-2 text-xs font-medium ${
            props.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <input
            type="radio"
            name={props.name}
            checked={props.value === 'continue'}
            disabled={props.disabled}
            onChange={() => props.onChange('continue')}
            className="h-4 w-4 border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span>Continue past the end value</span>
        </label>
      </div>
    </div>
  );
}

function getUnifiedEndValueMode(settings: ImageMotionSettings): 'loop' | 'continue' {
  return settings.scaleEndNoLimit ||
    settings.translateXEndNoLimit ||
    settings.translateYEndNoLimit ||
    settings.rotateEndNoLimit
    ? 'continue'
    : 'loop';
}

export function ImageEffectsDetailModal({
  isOpen,
  isShortVideo,
  activeTab,
  previewImageUrl,
  visualEffect,
  imageMotionEffect,
  imageMotionSpeed,
  customImageFilterId,
  customMotionEffectId,
  imageFilterSettings,
  imageMotionSettings,
  retainedTemporaryLook,
  retainedTemporaryMotion,
  imageFilterPresets,
  motionEffectPresets,
  onClose,
  onApply,
  onSaveImageFilterPreset,
  onUpdateImageFilterPreset,
  onDeleteImageFilterPreset,
  onSaveMotionEffectPreset,
  onUpdateMotionEffectPreset,
  onDeleteMotionEffectPreset,
  onGenerateLookWithAi,
  onGenerateMotionWithAi,
}: ImageEffectsDetailModalProps) {
  const incomingImageMotionSpeed = resolveImageMotionSpeed(
    imageMotionSpeed,
    imageMotionSettings,
    isShortVideo,
  );
  const [currentTab, setCurrentTab] = useState<DetailTab>(activeTab);
  const [lookSaveTitle, setLookSaveTitle] = useState('');
  const [motionSaveTitle, setMotionSaveTitle] = useState('');
  const [isSavingLookPreset, setIsSavingLookPreset] = useState(false);
  const [isSavingMotionPreset, setIsSavingMotionPreset] = useState(false);
  const [isOverridingLookPreset, setIsOverridingLookPreset] = useState(false);
  const [isOverridingMotionPreset, setIsOverridingMotionPreset] = useState(false);
  const [isDeletingLookPreset, setIsDeletingLookPreset] = useState(false);
  const [isDeletingMotionPreset, setIsDeletingMotionPreset] = useState(false);
  const [isGeneratingLookWithAi, setIsGeneratingLookWithAi] = useState(false);
  const [isGeneratingMotionWithAi, setIsGeneratingMotionWithAi] = useState(false);
  const [lookActionError, setLookActionError] = useState<string | null>(null);
  const [motionActionError, setMotionActionError] = useState<string | null>(null);
  const [deletePresetKind, setDeletePresetKind] = useState<DetailTab | null>(null);
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [draftVisualEffect, setDraftVisualEffect] = useState<SentenceItem['visualEffect'] | null>(
    visualEffect ?? null,
  );
  const [draftImageMotionEffect, setDraftImageMotionEffect] = useState<
    NonNullable<SentenceItem['imageMotionEffect']>
  >(imageMotionEffect ?? 'default');
  const [draftImageMotionSpeed, setDraftImageMotionSpeed] = useState<number>(
    incomingImageMotionSpeed,
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
        incomingImageMotionSpeed,
        isShortVideo,
      ),
  );
  const [retainedDraftTemporaryLook, setRetainedDraftTemporaryLook] = useState<{
    visualEffect: SentenceItem['visualEffect'] | null;
    imageFilterSettings: ImageFilterSettings;
  } | null>(retainedTemporaryLook ?? null);
  const [retainedDraftTemporaryMotion, setRetainedDraftTemporaryMotion] = useState<{
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
  } | null>(retainedTemporaryMotion ?? null);

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
        isShortVideo,
      ),
    [draftImageMotionEffect, draftImageMotionSettings, draftImageMotionSpeed, isShortVideo],
  );
  const selectedLookPreset = useMemo(
    () => imageFilterPresets.find((item) => item.id === draftCustomImageFilterId) ?? null,
    [draftCustomImageFilterId, imageFilterPresets],
  );
  const selectedMotionPreset = useMemo(
    () => motionEffectPresets.find((item) => item.id === draftCustomMotionEffectId) ?? null,
    [draftCustomMotionEffectId, motionEffectPresets],
  );
  const selectedLookPresetEffect = useMemo(
    () =>
      selectedLookPreset
        ? resolveVisualEffectFromSettings(selectedLookPreset.settings, draftVisualEffect ?? null)
        : null,
    [draftVisualEffect, selectedLookPreset],
  );
  const selectedMotionPresetEffect = useMemo(
    () =>
      selectedMotionPreset
        ? resolveMotionEffectFromSettings(
            selectedMotionPreset.settings,
            draftImageMotionEffect ?? 'default',
          )
        : 'default',
    [draftImageMotionEffect, selectedMotionPreset],
  );
  const selectedLookPresetSettings = useMemo(
    () =>
      selectedLookPreset
        ? normalizeImageFilterSettings(selectedLookPreset.settings, selectedLookPresetEffect)
        : null,
    [selectedLookPreset, selectedLookPresetEffect],
  );
  const selectedMotionPresetSettings = useMemo(
    () =>
      selectedMotionPreset
        ? normalizeImageMotionSettings(
            selectedMotionPreset.settings,
            selectedMotionPresetEffect,
            draftImageMotionSpeed,
            isShortVideo,
          )
        : null,
    [draftImageMotionSpeed, isShortVideo, selectedMotionPreset, selectedMotionPresetEffect],
  );
  const isLookDirtyFromSelectedPreset = Boolean(
    selectedLookPreset &&
      ((selectedLookPresetEffect ?? null) !== (draftVisualEffect ?? null) ||
        JSON.stringify(selectedLookPresetSettings) !== JSON.stringify(resolvedLook)),
  );
  const isMotionDirtyFromSelectedPreset = Boolean(
    selectedMotionPreset &&
      (selectedMotionPresetEffect !== (draftImageMotionEffect ?? 'default') ||
        JSON.stringify(selectedMotionPresetSettings) !== JSON.stringify(resolvedMotion)),
  );
  const canOverrideLookPreset = Boolean(selectedLookPreset && isLookDirtyFromSelectedPreset);
  const canOverrideMotionPreset = Boolean(selectedMotionPreset && isMotionDirtyFromSelectedPreset);
  const trimmedLookSaveTitle = lookSaveTitle.trim();
  const trimmedMotionSaveTitle = motionSaveTitle.trim();
  const canSaveLookAsNew = (draftVisualEffect ?? null) !== null;
  const canSaveMotionAsNew = true;
  const isLookSaveTitleValid =
    trimmedLookSaveTitle.length > 0 &&
    (!selectedLookPreset || trimmedLookSaveTitle !== selectedLookPreset.title.trim());
  const isMotionSaveTitleValid =
    trimmedMotionSaveTitle.length > 0 &&
    (!selectedMotionPreset || trimmedMotionSaveTitle !== selectedMotionPreset.title.trim());
  const [debouncedPreview, setDebouncedPreview] = useState<DebouncedPreviewState>(() => ({
    visualEffect: visualEffect ?? null,
    imageMotionEffect: imageMotionEffect ?? 'default',
    imageMotionSpeed: incomingImageMotionSpeed,
    imageFilterSettings: normalizeImageFilterSettings(imageFilterSettings, visualEffect ?? null),
    imageMotionSettings: normalizeImageMotionSettings(
      imageMotionSettings,
      imageMotionEffect ?? 'default',
      incomingImageMotionSpeed,
      isShortVideo,
    ),
    resetKey: 0,
  }));

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
    setDraftImageMotionSpeed(incomingImageMotionSpeed);
    setDraftCustomImageFilterId(customImageFilterId ?? null);
    setDraftCustomMotionEffectId(customMotionEffectId ?? null);
    setDraftImageFilterSettings(
      normalizeImageFilterSettings(imageFilterSettings, visualEffect ?? null),
    );
    setDraftImageMotionSettings(
      normalizeImageMotionSettings(
        imageMotionSettings,
        imageMotionEffect ?? 'default',
        incomingImageMotionSpeed,
        isShortVideo,
      ),
    );
    setRetainedDraftTemporaryLook(retainedTemporaryLook ?? null);
    setRetainedDraftTemporaryMotion(retainedTemporaryMotion ?? null);
    setLookSaveTitle('');
    setMotionSaveTitle('');
    setLookActionError(null);
    setMotionActionError(null);
    setDeletePresetKind(null);
    setDebouncedPreview((prev) => ({
      visualEffect: visualEffect ?? null,
      imageMotionEffect: imageMotionEffect ?? 'default',
      imageMotionSpeed: incomingImageMotionSpeed,
      imageFilterSettings: normalizeImageFilterSettings(imageFilterSettings, visualEffect ?? null),
      imageMotionSettings: normalizeImageMotionSettings(
        imageMotionSettings,
        imageMotionEffect ?? 'default',
        incomingImageMotionSpeed,
        isShortVideo,
      ),
      resetKey: prev.resetKey + 1,
    }));
  }, [
    activeTab,
    customImageFilterId,
    customMotionEffectId,
    imageFilterSettings,
    imageMotionEffect,
    imageMotionSettings,
    incomingImageMotionSpeed,
    isShortVideo,
    isOpen,
    retainedTemporaryLook,
    retainedTemporaryMotion,
    visualEffect,
  ]);

  useEffect(() => {
    if (!draftCustomImageFilterId && draftImageFilterSettings?.presetKey === 'custom') {
      setRetainedDraftTemporaryLook({
        visualEffect:
          resolveVisualEffectFromSettings(draftImageFilterSettings, draftVisualEffect ?? null) ??
          draftVisualEffect ??
          null,
        imageFilterSettings: resolvedLook,
      });
    }
  }, [draftCustomImageFilterId, draftImageFilterSettings, draftVisualEffect, resolvedLook]);

  useEffect(() => {
    if (!draftCustomMotionEffectId && draftImageMotionSettings?.presetKey === 'custom') {
      setRetainedDraftTemporaryMotion({
        imageMotionEffect: resolveMotionEffectFromSettings(
          draftImageMotionSettings,
          draftImageMotionEffect ?? 'default',
        ),
        imageMotionSettings: resolvedMotion,
        imageMotionSpeed: draftImageMotionSpeed,
      });
    }
  }, [
    draftCustomMotionEffectId,
    draftImageMotionEffect,
    draftImageMotionSettings,
    draftImageMotionSpeed,
    resolvedMotion,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(() => {
      setDebouncedPreview((prev) => ({
        visualEffect: draftVisualEffect,
        imageMotionEffect: draftImageMotionEffect,
        imageMotionSpeed: draftImageMotionSpeed,
        imageFilterSettings: resolvedLook,
        imageMotionSettings: resolvedMotion,
        resetKey: prev.resetKey + 1,
      }));
    }, PREVIEW_RESTART_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    draftImageMotionEffect,
    draftImageMotionSpeed,
    draftVisualEffect,
    isOpen,
    resolvedLook,
    resolvedMotion,
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
    : draftImageFilterSettings?.presetKey === 'custom'
      ? `custom:${TEMPORARY_CUSTOM_PRESET_ID}`
    : `builtin:${resolveVisualEffectFromSettings(draftImageFilterSettings, draftVisualEffect ?? null)}`;

  const motionSelectValue = draftCustomMotionEffectId
    ? `custom:${draftCustomMotionEffectId}`
    : draftImageMotionSettings?.presetKey === 'custom'
      ? `custom:${TEMPORARY_CUSTOM_PRESET_ID}`
    : `builtin:${resolveMotionEffectFromSettings(draftImageMotionSettings, draftImageMotionEffect ?? 'default')}`;
  const isBuiltinDefaultScaleMotion =
    !draftCustomMotionEffectId &&
    resolveMotionEffectFromSettings(
      draftImageMotionSettings,
      draftImageMotionEffect ?? 'default',
    ) === 'default';
  const unifiedEndValueMode = getUnifiedEndValueMode(resolvedMotion);

  const handleLookPresetChange = (value: string) => {
    if (value.startsWith('custom:')) {
      const presetId = value.slice('custom:'.length);
      if (presetId === TEMPORARY_CUSTOM_PRESET_ID) {
        if (!retainedDraftTemporaryLook) return;

        setDraftVisualEffect(retainedDraftTemporaryLook.visualEffect);
        setDraftCustomImageFilterId(null);
        setDraftImageFilterSettings({
          ...retainedDraftTemporaryLook.imageFilterSettings,
          presetKey: 'custom',
        });
        return;
      }
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
      if (presetId === TEMPORARY_CUSTOM_PRESET_ID) {
        if (!retainedDraftTemporaryMotion) return;

        setDraftImageMotionEffect(retainedDraftTemporaryMotion.imageMotionEffect);
        setDraftCustomMotionEffectId(null);
        setDraftImageMotionSettings({
          ...retainedDraftTemporaryMotion.imageMotionSettings,
          presetKey: 'custom',
        });
        setDraftImageMotionSpeed(retainedDraftTemporaryMotion.imageMotionSpeed);
        return;
      }
      const preset = motionEffectPresets.find((item) => item.id === presetId);
      if (!preset) return;
      const settings = normalizeImageMotionSettings(
        preset.settings,
        draftImageMotionEffect ?? 'default',
        draftImageMotionSpeed,
        isShortVideo,
      );
      setDraftImageMotionEffect(
        resolveMotionEffectFromSettings(settings, draftImageMotionEffect ?? 'default'),
      );
      setDraftCustomMotionEffectId(preset.id);
      setDraftImageMotionSettings({ ...settings, presetKey: 'custom' });
      setDraftImageMotionSpeed(settings.speed ?? getDefaultImageMotionSpeed(isShortVideo));
      return;
    }

    const effect = value.replace('builtin:', '') as NonNullable<SentenceItem['imageMotionEffect']>;
    const settings = getDefaultImageMotionSettings(effect, draftImageMotionSpeed, isShortVideo);
    setDraftImageMotionEffect(effect);
    setDraftCustomMotionEffectId(null);
    setDraftImageMotionSettings(settings);
    setDraftImageMotionSpeed(settings.speed ?? getDefaultImageMotionSpeed(isShortVideo));
  };

  const updateLookSettings = (patch: Partial<ImageFilterSettings>) => {
    const nextSettings: ImageFilterSettings = {
      ...resolvedLook,
      ...patch,
      presetKey: 'custom',
    };
    setDraftVisualEffect(resolveVisualEffectFromSettings(nextSettings, draftVisualEffect ?? null));
    setDraftImageFilterSettings(nextSettings);
    setLookActionError(null);
  };

  const updateMotionSettings = (patch: Partial<ImageMotionSettings>) => {
    const nextSettings: ImageMotionSettings = {
      ...resolvedMotion,
      ...patch,
      presetKey: 'custom',
    };
    setDraftImageMotionEffect(
      resolveMotionEffectFromSettings(nextSettings, draftImageMotionEffect ?? 'default'),
    );
    setDraftImageMotionSettings(nextSettings);
    setDraftImageMotionSpeed(nextSettings.speed ?? getDefaultImageMotionSpeed(isShortVideo));
    setMotionActionError(null);
  };

  const updateAllEndValueModes = (value: 'loop' | 'continue') => {
    const isContinue = value === 'continue';
    updateMotionSettings({
      scaleEndNoLimit: isContinue,
      translateXEndNoLimit: isContinue,
      translateYEndNoLimit: isContinue,
      rotateEndNoLimit: isContinue,
    });
  };

  const handleSaveLookPreset = async () => {
    if (!isLookSaveTitleValid || isSavingLookPreset) return;
    setIsSavingLookPreset(true);
    setLookActionError(null);
    try {
      const saved = await onSaveImageFilterPreset(trimmedLookSaveTitle, resolvedLook);
      if (saved) {
        setDraftCustomImageFilterId(saved.id);
        setDraftImageFilterSettings({ ...resolvedLook, presetKey: 'custom' });
        setLookSaveTitle('');
      }
    } catch (error) {
      setLookActionError(error instanceof Error ? error.message : 'Failed to save look preset.');
    }
    setIsSavingLookPreset(false);
  };

  const handleSaveMotionPreset = async () => {
    if (!isMotionSaveTitleValid || isSavingMotionPreset) return;
    setIsSavingMotionPreset(true);
    setMotionActionError(null);
    try {
      const saved = await onSaveMotionEffectPreset(trimmedMotionSaveTitle, resolvedMotion);
      if (saved) {
        setDraftCustomMotionEffectId(saved.id);
        setDraftImageMotionSettings({ ...resolvedMotion, presetKey: 'custom' });
        setMotionSaveTitle('');
      }
    } catch (error) {
      setMotionActionError(error instanceof Error ? error.message : 'Failed to save motion preset.');
    }
    setIsSavingMotionPreset(false);
  };

  const handleOverrideLookPreset = async () => {
    if (!selectedLookPreset || !canOverrideLookPreset || isOverridingLookPreset) return;
    setIsOverridingLookPreset(true);
    setLookActionError(null);
    try {
      const saved = await onUpdateImageFilterPreset(selectedLookPreset.id, resolvedLook);
      if (saved) {
        setDraftCustomImageFilterId(saved.id);
        setDraftImageFilterSettings({ ...resolvedLook, presetKey: 'custom' });
      }
    } catch (error) {
      setLookActionError(error instanceof Error ? error.message : 'Failed to override look preset.');
    }
    setIsOverridingLookPreset(false);
  };

  const handleOverrideMotionPreset = async () => {
    if (!selectedMotionPreset || !canOverrideMotionPreset || isOverridingMotionPreset) return;
    setIsOverridingMotionPreset(true);
    setMotionActionError(null);
    try {
      const saved = await onUpdateMotionEffectPreset(selectedMotionPreset.id, resolvedMotion);
      if (saved) {
        setDraftCustomMotionEffectId(saved.id);
        setDraftImageMotionSettings({ ...resolvedMotion, presetKey: 'custom' });
      }
    } catch (error) {
      setMotionActionError(
        error instanceof Error ? error.message : 'Failed to override motion preset.',
      );
    }
    setIsOverridingMotionPreset(false);
  };

  const handleDeleteLookPreset = async () => {
    if (!selectedLookPreset || isDeletingLookPreset) return;
    setIsDeletingLookPreset(true);
    setLookActionError(null);
    try {
      const deleted = await onDeleteImageFilterPreset(selectedLookPreset.id);
      if (deleted) {
        setDraftVisualEffect(null);
        setDraftCustomImageFilterId(null);
        setDraftImageFilterSettings(getDefaultImageFilterSettings(null));
        setRetainedDraftTemporaryLook(null);
        setLookSaveTitle('');
        setDeletePresetKind(null);
      }
    } catch (error) {
      setLookActionError(error instanceof Error ? error.message : 'Failed to delete look preset.');
    }
    setIsDeletingLookPreset(false);
  };

  const handleDeleteMotionPreset = async () => {
    if (!selectedMotionPreset || isDeletingMotionPreset) return;
    setIsDeletingMotionPreset(true);
    setMotionActionError(null);
    try {
      const deleted = await onDeleteMotionEffectPreset(selectedMotionPreset.id);
      if (deleted) {
        const defaultSpeed = getDefaultImageMotionSpeed(isShortVideo);
        setDraftImageMotionEffect('default');
        setDraftCustomMotionEffectId(null);
        setDraftImageMotionSpeed(defaultSpeed);
        setDraftImageMotionSettings(
          getDefaultImageMotionSettings('default', defaultSpeed, isShortVideo),
        );
        setRetainedDraftTemporaryMotion(null);
        setMotionSaveTitle('');
        setDeletePresetKind(null);
      }
    } catch (error) {
      setMotionActionError(
        error instanceof Error ? error.message : 'Failed to delete motion preset.',
      );
    }
    setIsDeletingMotionPreset(false);
  };

  const handleGenerateLookWithAi = async () => {
    if (isGeneratingLookWithAi) return;
    setIsGeneratingLookWithAi(true);
    setLookActionError(null);
    try {
      const generated = await onGenerateLookWithAi({
        visualEffect: draftVisualEffect,
        customImageFilterId: draftCustomImageFilterId,
        imageFilterSettings: resolvedLook,
      });

      if (generated) {
        setDraftVisualEffect(generated.visualEffect);
        setDraftCustomImageFilterId(null);
        setDraftImageFilterSettings({ ...generated.imageFilterSettings, presetKey: 'custom' });
      }
    } catch (error) {
      setLookActionError(error instanceof Error ? error.message : 'Failed to generate AI look.');
    }
    setIsGeneratingLookWithAi(false);
  };

  const handleGenerateMotionWithAi = async () => {
    if (isGeneratingMotionWithAi) return;
    setIsGeneratingMotionWithAi(true);
    setMotionActionError(null);
    try {
      const generated = await onGenerateMotionWithAi({
        imageMotionEffect: draftImageMotionEffect,
        customMotionEffectId: draftCustomMotionEffectId,
        imageMotionSettings: resolvedMotion,
        imageMotionSpeed: draftImageMotionSpeed,
      });

      if (generated) {
        setDraftImageMotionEffect(generated.imageMotionEffect);
        setDraftCustomMotionEffectId(null);
        setDraftImageMotionSettings({ ...generated.imageMotionSettings, presetKey: 'custom' });
        setDraftImageMotionSpeed(generated.imageMotionSpeed);
      }
    } catch (error) {
      setMotionActionError(
        error instanceof Error ? error.message : 'Failed to generate AI motion.',
      );
    }
    setIsGeneratingMotionWithAi(false);
  };

  const handleApply = () => {
    const nextCustomImageFilterId =
      draftCustomImageFilterId && !isLookDirtyFromSelectedPreset ? draftCustomImageFilterId : null;
    const nextCustomMotionEffectId =
      draftCustomMotionEffectId && !isMotionDirtyFromSelectedPreset
        ? draftCustomMotionEffectId
        : null;

    onApply({
      visualEffect: draftVisualEffect,
      customImageFilterId: nextCustomImageFilterId,
      imageFilterSettings:
        nextCustomImageFilterId ? resolvedLook : { ...resolvedLook, presetKey: 'custom' },
      imageMotionEffect: draftImageMotionEffect,
      customMotionEffectId: nextCustomMotionEffectId,
      imageMotionSettings:
        nextCustomMotionEffectId
          ? resolvedMotion
          : { ...resolvedMotion, presetKey: 'custom' },
      imageMotionSpeed:
        resolvedMotion.speed ?? draftImageMotionSpeed ?? getDefaultImageMotionSpeed(isShortVideo),
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
                visualEffect={debouncedPreview.visualEffect}
                imageMotionEffect={debouncedPreview.imageMotionEffect}
                imageMotionSpeed={debouncedPreview.imageMotionSpeed}
                isShortVideo={isShortVideo}
                imageFilterSettings={debouncedPreview.imageFilterSettings}
                imageMotionSettings={debouncedPreview.imageMotionSettings}
                enableMotion={currentTab === 'motion'}
                className="flex max-h-full max-w-full items-center justify-center"
                motionResetKey={debouncedPreview.resetKey}
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
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      Look preset
                    </div>
                    {selectedLookPreset ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setDeletePresetKind('visual')}
                        disabled={isDeletingLookPreset || isOverridingLookPreset || isSavingLookPreset}
                      >
                        {isDeletingLookPreset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    ) : null}
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
                      {retainedDraftTemporaryLook ? (
                        <SelectItem value={`custom:${TEMPORARY_CUSTOM_PRESET_ID}`}>
                          Custom
                        </SelectItem>
                      ) : null}
                      {imageFilterPresets.map((preset) => (
                        <SelectItem key={preset.id} value={`custom:${preset.id}`}>
                          {preset.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateLookWithAi}
                    disabled={isGeneratingLookWithAi}
                    className="h-11 rounded-xl border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  >
                    {isGeneratingLookWithAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Generate with AI
                  </Button>
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
                    Output actions
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>Apply updates only this image in the editor.</p>
                    <p>Save as new preset creates a reusable look preset with a different title.</p>
                    {selectedLookPreset ? (
                      <p>Override preset updates {selectedLookPreset.title} in your preset library.</p>
                    ) : null}
                  </div>
                  {lookActionError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {lookActionError}
                    </div>
                  ) : null}
                  {canSaveLookAsNew ? (
                    <div className="flex gap-2">
                      <Input
                        value={lookSaveTitle}
                        onChange={(e) => setLookSaveTitle(e.target.value)}
                        placeholder={selectedLookPreset ? 'New preset title' : 'Preset title'}
                        className="h-11 rounded-xl border-slate-200"
                      />
                      <Button
                        type="button"
                        onClick={handleSaveLookPreset}
                        disabled={!isLookSaveTitleValid || isSavingLookPreset}
                        className="h-11 rounded-xl bg-indigo-600 px-4 text-white hover:bg-indigo-700"
                      >
                        {isSavingLookPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Save as new preset
                      </Button>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOverrideLookPreset}
                    disabled={!canOverrideLookPreset || isOverridingLookPreset}
                    className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    {isOverridingLookPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Override preset
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-sky-600" />
                      Motion preset
                    </div>
                    {selectedMotionPreset ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setDeletePresetKind('motion')}
                        disabled={isDeletingMotionPreset || isOverridingMotionPreset || isSavingMotionPreset}
                      >
                        {isDeletingMotionPreset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    ) : null}
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
                      {retainedDraftTemporaryMotion ? (
                        <SelectItem value={`custom:${TEMPORARY_CUSTOM_PRESET_ID}`}>
                          Custom
                        </SelectItem>
                      ) : null}
                      {motionEffectPresets.map((preset) => (
                        <SelectItem key={preset.id} value={`custom:${preset.id}`}>
                          {preset.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateMotionWithAi}
                    disabled={isGeneratingMotionWithAi}
                    className="h-11 rounded-xl border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                  >
                    {isGeneratingMotionWithAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Generate with AI
                  </Button>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Clock3 className="h-4 w-4 text-sky-600" />
                    Motion tuning
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    No-limit end values affect the final video only. Editor previews stay bounded.
                  </div>
                  <RangeField label="Speed" value={resolvedMotion.speed ?? 1} min={IMAGE_MOTION_SPEED_MIN} max={IMAGE_MOTION_SPEED_MAX} step={IMAGE_MOTION_SPEED_STEP} onChange={(value) => updateMotionSettings({ speed: value })} />
                  {isBuiltinDefaultScaleMotion ? (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 mt-2 text-xs text-sky-800">
                      Default scale is automatic and keeps zooming for the full scene duration. Only speed is adjustable for this preset.
                    </div>
                  ) : null}
                  <EndValueModeField label="End value behavior" name="motion-end-value-behavior" value={unifiedEndValueMode} onChange={updateAllEndValueModes} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Initial zoom" value={resolvedMotion.startScale ?? 1} min={0.5} max={2} step={0.01} onChange={(value) => updateMotionSettings({ startScale: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Target scale" value={resolvedMotion.endScale ?? 1.055} min={0.5} max={2} step={0.01} onChange={(value) => updateMotionSettings({ endScale: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="X start" value={resolvedMotion.translateXStart ?? 0} min={-20} max={20} step={0.1} onChange={(value) => updateMotionSettings({ translateXStart: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="X end" value={resolvedMotion.translateXEnd ?? 0} min={-20} max={20} step={0.1} onChange={(value) => updateMotionSettings({ translateXEnd: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Y start" value={resolvedMotion.translateYStart ?? 0} min={-20} max={20} step={0.1} onChange={(value) => updateMotionSettings({ translateYStart: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Y end" value={resolvedMotion.translateYEnd ?? 0} min={-20} max={20} step={0.1} onChange={(value) => updateMotionSettings({ translateYEnd: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Rotate start" value={resolvedMotion.rotateStart ?? 0} min={-10} max={10} step={0.1} onChange={(value) => updateMotionSettings({ rotateStart: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Rotate end" value={resolvedMotion.rotateEnd ?? 0} min={-10} max={10} step={0.1} onChange={(value) => updateMotionSettings({ rotateEnd: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Origin X" value={resolvedMotion.originX ?? 50} min={0} max={100} step={1} onChange={(value) => updateMotionSettings({ originX: value })} disabled={isBuiltinDefaultScaleMotion} />
                  <RangeField label="Origin Y" value={resolvedMotion.originY ?? 50} min={0} max={100} step={1} onChange={(value) => updateMotionSettings({ originY: value })} disabled={isBuiltinDefaultScaleMotion} />
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Save className="h-4 w-4 text-sky-600" />
                    Output actions
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>Apply updates only this image in the editor.</p>
                    <p>Save as new preset creates a reusable motion preset with a different title.</p>
                    {selectedMotionPreset ? (
                      <p>Override preset updates {selectedMotionPreset.title} in your preset library.</p>
                    ) : null}
                  </div>
                  {motionActionError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {motionActionError}
                    </div>
                  ) : null}
                  {canSaveMotionAsNew ? (
                    <div className="flex gap-2">
                      <Input
                        value={motionSaveTitle}
                        onChange={(e) => setMotionSaveTitle(e.target.value)}
                        placeholder={selectedMotionPreset ? 'New preset title' : 'Preset title'}
                        className="h-11 rounded-xl border-slate-200"
                      />
                      <Button
                        type="button"
                        onClick={handleSaveMotionPreset}
                        disabled={!isMotionSaveTitleValid || isSavingMotionPreset}
                        className="h-11 rounded-xl bg-sky-600 px-4 text-white hover:bg-sky-700"
                      >
                        {isSavingMotionPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Save as new preset
                      </Button>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOverrideMotionPreset}
                    disabled={!canOverrideMotionPreset || isOverridingMotionPreset}
                    className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    {isOverridingMotionPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Override preset
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        isOpen={deletePresetKind !== null}
        onClose={() => setDeletePresetKind(null)}
        onCancel={() => setDeletePresetKind(null)}
        onConfirm={() => {
          if (deletePresetKind === 'visual') {
            void handleDeleteLookPreset();
            return;
          }

          if (deletePresetKind === 'motion') {
            void handleDeleteMotionPreset();
          }
        }}
        variant="danger"
        title={deletePresetKind === 'visual' ? 'Delete look preset?' : 'Delete motion preset?'}
        description={
          deletePresetKind === 'visual'
            ? 'This deletes the selected look preset from your library and resets this image to the built-in none look.'
            : 'This deletes the selected motion preset from your library and resets this image to the built-in default motion.'
        }
        confirmText={deletePresetKind === 'visual' ? 'Delete look preset' : 'Delete motion preset'}
        cancelText="Cancel"
        isLoading={isDeletingLookPreset || isDeletingMotionPreset}
      />
    </div>
  );
}