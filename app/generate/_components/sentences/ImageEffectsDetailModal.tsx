'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
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
import { Clapperboard, Clock3, Loader2, Save, SlidersHorizontal, Sparkles, Timer, Trash2, Upload, Wand2, X } from 'lucide-react';

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
import {
  getDefaultTextAnimationSettings,
  getTextAnimationEffectLabel,
  normalizeTextAnimationSettings,
  resolveTextAnimationEffectFromSettings,
  resolveTextAnimationText,
  TextAnimationPreview,
  TEXT_ANIMATION_EFFECT_VALUES,
  type TextAnimationPresetDto,
  type TextAnimationSettings,
} from './TextAnimationPreview';
import { TEMPORARY_CUSTOM_PRESET_ID } from '../../_utils/imageEffectSelection';
import { useManagedObjectUrl } from './useManagedObjectUrl';

const LOOK_EFFECT_VALUES = [
  'none',
  'colorGrading',
  'animatedLighting',
  'glassSubtle',
  'glassReflections',
  'glassStrong',
] as const;

type DetailTab = 'visual' | 'motion' | 'text';

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
  previewTextInheritedImageUrl?: string | null;
  previewTextInheritedVideoUrl?: string | null;
  sentenceText?: string;
  visualEffect: SentenceItem['visualEffect'] | null | undefined;
  imageMotionEffect: SentenceItem['imageMotionEffect'] | null | undefined;
  imageMotionSpeed: number | null | undefined;
  textAnimationEffect: SentenceItem['textAnimationEffect'] | null | undefined;
  textAnimationText: string | null | undefined;
  textBackgroundImage?: File | null;
  textBackgroundImageUrl?: string | null;
  textBackgroundSavedImageId?: string | null;
  textBackgroundVideo?: File | null;
  textBackgroundVideoUrl?: string | null;
  textBackgroundSavedVideoId?: string | null;
  customImageFilterId: string | null | undefined;
  customMotionEffectId: string | null | undefined;
  customTextAnimationId: string | null | undefined;
  imageFilterSettings: Record<string, unknown> | null | undefined;
  imageMotionSettings: Record<string, unknown> | null | undefined;
  textAnimationSettings: Record<string, unknown> | null | undefined;
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
  textAnimationPresets: TextAnimationPresetDto[];
  onClose: () => void;
  onApply: (params: {
    visualEffect: SentenceItem['visualEffect'] | null;
    customImageFilterId: string | null;
    imageFilterSettings: ImageFilterSettings;
    imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
    customMotionEffectId: string | null;
    imageMotionSettings: ImageMotionSettings;
    imageMotionSpeed: number;
    textAnimationEffect: SentenceItem['textAnimationEffect'] | null;
    customTextAnimationId: string | null;
    textAnimationSettings: TextAnimationSettings;
    textAnimationText: string | null;
    textBackgroundImage: File | null;
    textBackgroundImageUrl: string | null;
    textBackgroundSavedImageId: string | null;
    textBackgroundVideo: File | null;
    textBackgroundVideoUrl: string | null;
    textBackgroundSavedVideoId: string | null;
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
  onSaveTextAnimationPreset: (
    title: string,
    settings: TextAnimationSettings,
  ) => Promise<TextAnimationPresetDto | null> | TextAnimationPresetDto | null;
  onUpdateTextAnimationPreset: (
    presetId: string,
    settings: TextAnimationSettings,
  ) => Promise<TextAnimationPresetDto | null> | TextAnimationPresetDto | null;
  onDeleteTextAnimationPreset: (presetId: string) => Promise<boolean> | boolean;
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
  previewTextInheritedImageUrl = null,
  previewTextInheritedVideoUrl = null,
  sentenceText,
  visualEffect,
  imageMotionEffect,
  imageMotionSpeed,
  textAnimationEffect,
  textAnimationText,
  textBackgroundImage = null,
  textBackgroundImageUrl = null,
  textBackgroundSavedImageId = null,
  textBackgroundVideo = null,
  textBackgroundVideoUrl = null,
  textBackgroundSavedVideoId = null,
  customImageFilterId,
  customMotionEffectId,
  customTextAnimationId,
  imageFilterSettings,
  imageMotionSettings,
  textAnimationSettings,
  retainedTemporaryLook,
  retainedTemporaryMotion,
  imageFilterPresets,
  motionEffectPresets,
  textAnimationPresets,
  onClose,
  onApply,
  onSaveImageFilterPreset,
  onUpdateImageFilterPreset,
  onDeleteImageFilterPreset,
  onSaveMotionEffectPreset,
  onUpdateMotionEffectPreset,
  onDeleteMotionEffectPreset,
  onSaveTextAnimationPreset,
  onUpdateTextAnimationPreset,
  onDeleteTextAnimationPreset,
  onGenerateLookWithAi,
  onGenerateMotionWithAi,
}: ImageEffectsDetailModalProps) {
  const incomingImageMotionSpeed = resolveImageMotionSpeed(
    imageMotionSpeed,
    imageMotionSettings,
    isShortVideo,
  );
  const textBackgroundInputRef = useRef<HTMLInputElement | null>(null);
  const textBackgroundVideoInputRef = useRef<HTMLInputElement | null>(null);
  const [currentTab, setCurrentTab] = useState<DetailTab>(activeTab);
  const [lookSaveTitle, setLookSaveTitle] = useState('');
  const [motionSaveTitle, setMotionSaveTitle] = useState('');
  const [textSaveTitle, setTextSaveTitle] = useState('');
  const [isSavingLookPreset, setIsSavingLookPreset] = useState(false);
  const [isSavingMotionPreset, setIsSavingMotionPreset] = useState(false);
  const [isSavingTextPreset, setIsSavingTextPreset] = useState(false);
  const [isOverridingLookPreset, setIsOverridingLookPreset] = useState(false);
  const [isOverridingMotionPreset, setIsOverridingMotionPreset] = useState(false);
  const [isOverridingTextPreset, setIsOverridingTextPreset] = useState(false);
  const [isDeletingLookPreset, setIsDeletingLookPreset] = useState(false);
  const [isDeletingMotionPreset, setIsDeletingMotionPreset] = useState(false);
  const [isDeletingTextPreset, setIsDeletingTextPreset] = useState(false);
  const [isGeneratingLookWithAi, setIsGeneratingLookWithAi] = useState(false);
  const [isGeneratingMotionWithAi, setIsGeneratingMotionWithAi] = useState(false);
  const [lookActionError, setLookActionError] = useState<string | null>(null);
  const [motionActionError, setMotionActionError] = useState<string | null>(null);
  const [textActionError, setTextActionError] = useState<string | null>(null);
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
  const [draftTextAnimationEffect, setDraftTextAnimationEffect] = useState<
    SentenceItem['textAnimationEffect'] | null
  >(
    resolveTextAnimationEffectFromSettings(textAnimationSettings, textAnimationEffect),
  );
  const [draftTextAnimationText, setDraftTextAnimationText] = useState<string>(
    resolveTextAnimationText(textAnimationText, sentenceText),
  );
  const [draftTextBackgroundImage, setDraftTextBackgroundImage] = useState<File | null>(
    textBackgroundImage ?? null,
  );
  const [draftTextBackgroundImageUrl, setDraftTextBackgroundImageUrl] = useState<string | null>(
    textBackgroundImageUrl ?? null,
  );
  const [draftTextBackgroundSavedImageId, setDraftTextBackgroundSavedImageId] = useState<string | null>(
    textBackgroundSavedImageId ?? null,
  );
  const [draftTextBackgroundVideo, setDraftTextBackgroundVideo] = useState<File | null>(
    textBackgroundVideo ?? null,
  );
  const [draftTextBackgroundVideoUrl, setDraftTextBackgroundVideoUrl] = useState<string | null>(
    textBackgroundVideoUrl ?? null,
  );
  const [draftTextBackgroundSavedVideoId, setDraftTextBackgroundSavedVideoId] = useState<string | null>(
    textBackgroundSavedVideoId ?? null,
  );
  const [draftCustomTextAnimationId, setDraftCustomTextAnimationId] = useState<string | null>(
    customTextAnimationId ?? null,
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
  const [draftTextAnimationSettings, setDraftTextAnimationSettings] = useState<TextAnimationSettings>(
    () =>
      normalizeTextAnimationSettings(
        textAnimationSettings,
        resolveTextAnimationEffectFromSettings(textAnimationSettings, textAnimationEffect),
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
  const resolvedText = useMemo(
    () =>
      normalizeTextAnimationSettings(
        draftTextAnimationSettings,
        draftTextAnimationEffect,
        isShortVideo,
      ),
    [draftTextAnimationEffect, draftTextAnimationSettings, isShortVideo],
  );
  const draftTextBackgroundObjectUrl = useManagedObjectUrl(draftTextBackgroundImage);
  const draftTextBackgroundVideoObjectUrl = useManagedObjectUrl(draftTextBackgroundVideo);
  const customTextBackgroundPreviewUrl =
    draftTextBackgroundObjectUrl ?? draftTextBackgroundImageUrl ?? null;
  const customTextBackgroundVideoPreviewUrl =
    draftTextBackgroundVideoObjectUrl ?? draftTextBackgroundVideoUrl ?? null;
  const resolvedTextPreviewBackgroundUrl =
    resolvedText.backgroundMode === 'image'
      ? customTextBackgroundPreviewUrl
      : resolvedText.backgroundMode === 'inheritImage'
        ? previewTextInheritedImageUrl
        : null;
  const resolvedTextPreviewBackgroundVideoUrl =
    resolvedText.backgroundMode === 'video'
      ? customTextBackgroundVideoPreviewUrl
      : resolvedText.backgroundMode === 'inheritVideo'
        ? previewTextInheritedVideoUrl
        : null;
  const textPreviewFrameClass = isShortVideo
    ? 'w-full max-w-[22rem] aspect-[9/16]'
    : 'w-full max-w-4xl aspect-video';
  const selectedLookPreset = useMemo(
    () => imageFilterPresets.find((item) => item.id === draftCustomImageFilterId) ?? null,
    [draftCustomImageFilterId, imageFilterPresets],
  );
  const selectedMotionPreset = useMemo(
    () => motionEffectPresets.find((item) => item.id === draftCustomMotionEffectId) ?? null,
    [draftCustomMotionEffectId, motionEffectPresets],
  );
  const selectedTextPreset = useMemo(
    () => textAnimationPresets.find((item) => item.id === draftCustomTextAnimationId) ?? null,
    [draftCustomTextAnimationId, textAnimationPresets],
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
  const selectedTextPresetEffect = useMemo(
    () =>
      selectedTextPreset
        ? resolveTextAnimationEffectFromSettings(
            selectedTextPreset.settings,
            draftTextAnimationEffect,
          )
        : resolveTextAnimationEffectFromSettings(
            draftTextAnimationSettings,
            draftTextAnimationEffect,
          ),
    [draftTextAnimationEffect, draftTextAnimationSettings, selectedTextPreset],
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
  const selectedTextPresetSettings = useMemo(
    () =>
      selectedTextPreset
        ? normalizeTextAnimationSettings(
            selectedTextPreset.settings,
            selectedTextPresetEffect,
            isShortVideo,
          )
        : null,
    [isShortVideo, selectedTextPreset, selectedTextPresetEffect],
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
  const isTextDirtyFromSelectedPreset = Boolean(
    selectedTextPreset &&
      (selectedTextPresetEffect !== draftTextAnimationEffect ||
        JSON.stringify(selectedTextPresetSettings) !== JSON.stringify(resolvedText)),
  );
  const canOverrideLookPreset = Boolean(selectedLookPreset && isLookDirtyFromSelectedPreset);
  const canOverrideMotionPreset = Boolean(selectedMotionPreset && isMotionDirtyFromSelectedPreset);
  const canOverrideTextPreset = Boolean(selectedTextPreset && isTextDirtyFromSelectedPreset);
  const trimmedLookSaveTitle = lookSaveTitle.trim();
  const trimmedMotionSaveTitle = motionSaveTitle.trim();
  const trimmedTextSaveTitle = textSaveTitle.trim();
  const canSaveLookAsNew = (draftVisualEffect ?? null) !== null;
  const canSaveMotionAsNew = true;
  const canSaveTextAsNew = Boolean(draftTextAnimationEffect);
  const isLookSaveTitleValid =
    trimmedLookSaveTitle.length > 0 &&
    (!selectedLookPreset || trimmedLookSaveTitle !== selectedLookPreset.title.trim());
  const isMotionSaveTitleValid =
    trimmedMotionSaveTitle.length > 0 &&
    (!selectedMotionPreset || trimmedMotionSaveTitle !== selectedMotionPreset.title.trim());
  const isTextSaveTitleValid =
    trimmedTextSaveTitle.length > 0 &&
    (!selectedTextPreset || trimmedTextSaveTitle !== selectedTextPreset.title.trim());
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
    setDraftTextAnimationEffect(
      resolveTextAnimationEffectFromSettings(textAnimationSettings, textAnimationEffect),
    );
    setDraftTextAnimationText(resolveTextAnimationText(textAnimationText, sentenceText));
    setDraftTextBackgroundImage(textBackgroundImage ?? null);
    setDraftTextBackgroundImageUrl(textBackgroundImageUrl ?? null);
    setDraftTextBackgroundSavedImageId(textBackgroundSavedImageId ?? null);
    setDraftTextBackgroundVideo(textBackgroundVideo ?? null);
    setDraftTextBackgroundVideoUrl(textBackgroundVideoUrl ?? null);
    setDraftTextBackgroundSavedVideoId(textBackgroundSavedVideoId ?? null);
    setDraftCustomTextAnimationId(customTextAnimationId ?? null);
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
    setDraftTextAnimationSettings(
      normalizeTextAnimationSettings(
        textAnimationSettings,
        resolveTextAnimationEffectFromSettings(textAnimationSettings, textAnimationEffect),
        isShortVideo,
      ),
    );
    setRetainedDraftTemporaryLook(retainedTemporaryLook ?? null);
    setRetainedDraftTemporaryMotion(retainedTemporaryMotion ?? null);
    setLookSaveTitle('');
    setMotionSaveTitle('');
    setTextSaveTitle('');
    setLookActionError(null);
    setMotionActionError(null);
    setTextActionError(null);
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
    customTextAnimationId,
    imageFilterSettings,
    imageMotionEffect,
    imageMotionSettings,
    incomingImageMotionSpeed,
    isShortVideo,
    isOpen,
    retainedTemporaryLook,
    retainedTemporaryMotion,
    textBackgroundImage,
    textBackgroundImageUrl,
    textBackgroundSavedImageId,
    textBackgroundVideo,
    textBackgroundVideoUrl,
    textBackgroundSavedVideoId,
    textAnimationEffect,
    textAnimationSettings,
    textAnimationText,
    sentenceText,
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
  const textSelectValue = draftCustomTextAnimationId
    ? `custom:${draftCustomTextAnimationId}`
    : draftTextAnimationSettings?.presetKey === 'custom'
      ? `custom:${TEMPORARY_CUSTOM_PRESET_ID}`
      : `builtin:${resolveTextAnimationEffectFromSettings(draftTextAnimationSettings, draftTextAnimationEffect)}`;
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

  const handleTextPresetChange = (value: string) => {
    if (value.startsWith('custom:')) {
      const presetId = value.slice('custom:'.length);
      if (presetId === TEMPORARY_CUSTOM_PRESET_ID) return;

      const preset = textAnimationPresets.find((item) => item.id === presetId);
      if (!preset) return;

      const effect = resolveTextAnimationEffectFromSettings(
        preset.settings,
        draftTextAnimationEffect,
      );
      const settings = normalizeTextAnimationSettings(
        preset.settings,
        effect,
        isShortVideo,
      );

      setDraftTextAnimationEffect(effect);
      setDraftCustomTextAnimationId(preset.id);
      setDraftTextAnimationSettings({ ...settings, presetKey: 'custom' });
      setTextActionError(null);
      return;
    }

    const effect = value.replace('builtin:', '') as SentenceItem['textAnimationEffect'];
    setDraftTextAnimationEffect(effect);
    setDraftCustomTextAnimationId(null);
    setDraftTextAnimationSettings(getDefaultTextAnimationSettings(effect, isShortVideo));
    setTextActionError(null);
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

  const updateTextSettings = (patch: Partial<TextAnimationSettings>) => {
    const nextSettings: TextAnimationSettings = {
      ...resolvedText,
      ...patch,
      presetKey: 'custom',
    };
    setDraftTextAnimationEffect(
      resolveTextAnimationEffectFromSettings(nextSettings, draftTextAnimationEffect),
    );
    setDraftTextAnimationSettings(nextSettings);
    setTextActionError(null);
  };

  const handleTextBackgroundUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file || !file.type.startsWith('image/')) return;

    setDraftTextBackgroundImage(file);
    setDraftTextBackgroundImageUrl(null);
    setDraftTextBackgroundSavedImageId(null);
    setDraftCustomTextAnimationId(null);
    setDraftTextAnimationSettings({
      ...resolvedText,
      backgroundMode: 'image',
      presetKey: 'custom',
    });
    setTextActionError(null);
    event.target.value = '';
  };

  const handleTextBackgroundVideoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file || !file.type.startsWith('video/')) return;

    setDraftTextBackgroundVideo(file);
    setDraftTextBackgroundVideoUrl(null);
    setDraftTextBackgroundSavedVideoId(null);
    setDraftCustomTextAnimationId(null);
    setDraftTextAnimationSettings({
      ...resolvedText,
      backgroundMode: 'video',
      presetKey: 'custom',
    });
    setTextActionError(null);
    event.target.value = '';
  };

  const handleRemoveTextBackground = () => {
    setDraftTextBackgroundImage(null);
    setDraftTextBackgroundImageUrl(null);
    setDraftTextBackgroundSavedImageId(null);
    setDraftCustomTextAnimationId(null);
    setDraftTextAnimationSettings({
      ...resolvedText,
      backgroundMode: 'image',
      presetKey: 'custom',
    });
    setTextActionError(null);
  };

  const handleRemoveTextBackgroundVideo = () => {
    setDraftTextBackgroundVideo(null);
    setDraftTextBackgroundVideoUrl(null);
    setDraftTextBackgroundSavedVideoId(null);
    setDraftCustomTextAnimationId(null);
    setDraftTextAnimationSettings({
      ...resolvedText,
      backgroundMode: 'video',
      presetKey: 'custom',
    });
    setTextActionError(null);
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

  const handleSaveTextPreset = async () => {
    if (!isTextSaveTitleValid || isSavingTextPreset) return;
    setIsSavingTextPreset(true);
    setTextActionError(null);
    try {
      const saved = await onSaveTextAnimationPreset(trimmedTextSaveTitle, resolvedText);
      if (saved) {
        setDraftCustomTextAnimationId(saved.id);
        setDraftTextAnimationSettings({ ...resolvedText, presetKey: 'custom' });
        setTextSaveTitle('');
      }
    } catch (error) {
      setTextActionError(error instanceof Error ? error.message : 'Failed to save text preset.');
    }
    setIsSavingTextPreset(false);
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

  const handleOverrideTextPreset = async () => {
    if (!selectedTextPreset || !canOverrideTextPreset || isOverridingTextPreset) return;
    setIsOverridingTextPreset(true);
    setTextActionError(null);
    try {
      const saved = await onUpdateTextAnimationPreset(selectedTextPreset.id, resolvedText);
      if (saved) {
        setDraftCustomTextAnimationId(saved.id);
        setDraftTextAnimationSettings({ ...resolvedText, presetKey: 'custom' });
      }
    } catch (error) {
      setTextActionError(error instanceof Error ? error.message : 'Failed to override text preset.');
    }
    setIsOverridingTextPreset(false);
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

  const handleDeleteTextPreset = async () => {
    if (!selectedTextPreset || isDeletingTextPreset) return;
    setIsDeletingTextPreset(true);
    setTextActionError(null);
    try {
      const deleted = await onDeleteTextAnimationPreset(selectedTextPreset.id);
      if (deleted) {
        const fallbackEffect = draftTextAnimationEffect ?? 'popInBounceHook';
        setDraftTextAnimationEffect(fallbackEffect);
        setDraftCustomTextAnimationId(null);
        setDraftTextAnimationSettings(
          getDefaultTextAnimationSettings(fallbackEffect, isShortVideo),
        );
        setTextSaveTitle('');
        setDeletePresetKind(null);
      }
    } catch (error) {
      setTextActionError(error instanceof Error ? error.message : 'Failed to delete text preset.');
    }
    setIsDeletingTextPreset(false);
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
    const nextCustomTextAnimationId =
      draftCustomTextAnimationId && !isTextDirtyFromSelectedPreset
        ? draftCustomTextAnimationId
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
      textAnimationEffect: draftTextAnimationEffect,
      customTextAnimationId: nextCustomTextAnimationId,
      textAnimationSettings:
        nextCustomTextAnimationId
          ? resolvedText
          : { ...resolvedText, presetKey: 'custom' },
      textAnimationText: String(draftTextAnimationText ?? '').trim() || null,
      textBackgroundImage: draftTextBackgroundImage,
      textBackgroundImageUrl: draftTextBackgroundImageUrl,
      textBackgroundSavedImageId: draftTextBackgroundSavedImageId,
      textBackgroundVideo: draftTextBackgroundVideo,
      textBackgroundVideoUrl: draftTextBackgroundVideoUrl,
      textBackgroundSavedVideoId: draftTextBackgroundSavedVideoId,
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
              <h3 className="mt-2 text-2xl font-semibold">
                {currentTab === 'text' ? 'Text animation studio' : 'Image effects studio'}
              </h3>
              <p className="mt-1 text-sm text-slate-300">
                {currentTab === 'text'
                  ? 'Tune flashy hook text, background modes, and reusable animation presets.'
                  : 'Look edits preview as a still. Motion edits preview with your current look applied.'}
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
              <Clapperboard className="mr-2 h-4 w-4" />
              Motion
            </Button>
            <Button
              type="button"
              onClick={() => setCurrentTab('text')}
              className={
                currentTab === 'text'
                  ? 'h-11 flex-1 rounded-xl bg-white text-slate-900 hover:bg-white'
                  : 'h-11 flex-1 rounded-xl bg-transparent text-slate-200 hover:bg-white/10'
              }
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Text
            </Button>
          </div>

          <div className="mt-6 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/30 p-4">
            {currentTab === 'text' ? (
              <TextAnimationPreview
                sentenceText={sentenceText}
                text={draftTextAnimationText}
                effect={draftTextAnimationEffect}
                settings={resolvedText}
                backgroundImageUrl={resolvedTextPreviewBackgroundUrl}
                backgroundVideoUrl={resolvedTextPreviewBackgroundVideoUrl}
                isShortVideo={isShortVideo}
                className={`${textPreviewFrameClass} overflow-hidden rounded-[1.5rem]`}
                contentClassName="p-[7%]"
                enableMotion
                motionResetKey={`${currentTab}-${draftTextAnimationEffect}-${resolvedText.speed ?? 1}-${resolvedText.animationIntensity ?? 1}`}
              />
            ) : previewImageUrl ? (
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
              {currentTab === 'visual'
                ? 'Look controls'
                : currentTab === 'motion'
                  ? 'Motion controls'
                  : 'Text controls'}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {currentTab === 'visual'
                ? 'Blend preset selection with direct filter tuning.'
                : currentTab === 'motion'
                  ? 'Tune transform values and save reusable motion presets.'
                  : 'Edit hook text, layout, colors, and reusable animation presets.'}
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
            {currentTab === 'text' ? (
              <>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      Text preset
                    </div>
                    {selectedTextPreset ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setDeletePresetKind('text')}
                        disabled={isDeletingTextPreset || isOverridingTextPreset || isSavingTextPreset}
                      >
                        {isDeletingTextPreset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    ) : null}
                  </div>
                  <Select value={textSelectValue} onValueChange={handleTextPresetChange}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Choose text preset" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {TEXT_ANIMATION_EFFECT_VALUES.map((value) => (
                        <SelectItem key={value} value={`builtin:${value}`}>
                          {getTextAnimationEffectLabel(value)}
                        </SelectItem>
                      ))}
                      {draftTextAnimationSettings?.presetKey === 'custom' ? (
                        <SelectItem value={`custom:${TEMPORARY_CUSTOM_PRESET_ID}`}>
                          Custom
                        </SelectItem>
                      ) : null}
                      {textAnimationPresets.map((preset) => (
                        <SelectItem key={preset.id} value={`custom:${preset.id}`}>
                          {preset.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <SlidersHorizontal className="h-4 w-4 text-amber-600" />
                    Text tuning
                  </div>
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Hook text</span>
                    <Input
                      value={draftTextAnimationText}
                      onChange={(e) => setDraftTextAnimationText(e.target.value)}
                      placeholder={resolveTextAnimationText(null, sentenceText)}
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-3">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Horizontal align</div>
                      <Select
                        value={resolvedText.horizontalAlign ?? 'center'}
                        onValueChange={(value) => updateTextSettings({ horizontalAlign: value as TextAnimationSettings['horizontalAlign'] })}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Horizontal align" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Vertical align</div>
                      <Select
                        value={resolvedText.verticalAlign ?? 'middle'}
                        onValueChange={(value) => updateTextSettings({ verticalAlign: value as TextAnimationSettings['verticalAlign'] })}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Vertical align" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="middle">Middle</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Text color</span>
                      <Input type="color" value={resolvedText.textColor ?? '#ffffff'} onChange={(e) => updateTextSettings({ textColor: e.target.value })} className="h-11 rounded-xl border-slate-200 p-2" />
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Accent color</span>
                      <Input type="color" value={resolvedText.accentColor ?? '#facc15'} onChange={(e) => updateTextSettings({ accentColor: e.target.value })} className="h-11 rounded-xl border-slate-200 p-2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Background mode</div>
                    <Select
                      value={resolvedText.backgroundMode ?? 'inheritImage'}
                      onValueChange={(value) => updateTextSettings({ backgroundMode: value as TextAnimationSettings['backgroundMode'] })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="Background mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inheritImage">Use image tab image</SelectItem>
                        <SelectItem value="image">Custom background image</SelectItem>
                        <SelectItem value="inheritVideo">Use video tab video</SelectItem>
                        <SelectItem value="video">Custom background video</SelectItem>
                        <SelectItem value="solid">Solid color</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <input
                    ref={textBackgroundInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleTextBackgroundUpload}
                    className="hidden"
                  />
                  <input
                    ref={textBackgroundVideoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleTextBackgroundVideoUpload}
                    className="hidden"
                  />
                  {resolvedText.backgroundMode === 'inheritImage' ? (
                    previewTextInheritedImageUrl ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        This text scene is using the current image tab image as its background.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        No image is currently available on the image tab. Upload one there or switch this text scene to a custom image, solid color, or gradient background.
                      </div>
                    )
                  ) : null}
                  {resolvedText.backgroundMode === 'inheritVideo' ? (
                    resolvedTextPreviewBackgroundVideoUrl ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        This text scene is using the current video tab video as its background.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        No video is currently available on the video tab. Upload one there or switch this text scene to a custom video, image, solid color, or gradient background.
                      </div>
                    )
                  ) : null}
                  {resolvedText.backgroundMode === 'image' ? (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Background image</p>
                          <p className="text-xs text-slate-500">Upload a dedicated image for this text scene.</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => textBackgroundInputRef.current?.click()}
                            className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </Button>
                          {customTextBackgroundPreviewUrl ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleRemoveTextBackground}
                              className="h-9 rounded-xl border-red-200 bg-white text-red-600 hover:bg-red-50"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {customTextBackgroundPreviewUrl ? (
                        <img
                          src={customTextBackgroundPreviewUrl}
                          alt="Text scene background"
                          className="h-36 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                          Upload a background image to preview this text scene.
                        </div>
                      )}
                    </div>
                  ) : null}
                  {resolvedText.backgroundMode === 'video' ? (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Background video</p>
                          <p className="text-xs text-slate-500">Upload a dedicated looping video for this text scene.</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => textBackgroundVideoInputRef.current?.click()}
                            className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </Button>
                          {customTextBackgroundVideoPreviewUrl ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleRemoveTextBackgroundVideo}
                              className="h-9 rounded-xl border-red-200 bg-white text-red-600 hover:bg-red-50"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {customTextBackgroundVideoPreviewUrl ? (
                        <video
                          src={customTextBackgroundVideoPreviewUrl}
                          className="h-36 w-full rounded-xl object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                          Upload a background video to preview this text scene.
                        </div>
                      )}
                    </div>
                  ) : null}
                  {resolvedText.backgroundMode === 'solid' ? (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Background color</span>
                      <Input type="color" value={resolvedText.backgroundColor ?? '#0f172a'} onChange={(e) => updateTextSettings({ backgroundColor: e.target.value })} className="h-11 rounded-xl border-slate-200 p-2" />
                    </div>
                  ) : null}
                  {resolvedText.backgroundMode === 'gradient' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Gradient from</span>
                        <Input type="color" value={resolvedText.gradientFrom ?? '#0f172a'} onChange={(e) => updateTextSettings({ gradientFrom: e.target.value })} className="h-11 rounded-xl border-slate-200 p-2" />
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Gradient to</span>
                        <Input type="color" value={resolvedText.gradientTo ?? '#1d4ed8'} onChange={(e) => updateTextSettings({ gradientTo: e.target.value })} className="h-11 rounded-xl border-slate-200 p-2" />
                      </div>
                    </div>
                  ) : null}
                  <RangeField label="Speed" value={resolvedText.speed ?? 1} min={0.4} max={2.4} step={0.1} onChange={(value) => updateTextSettings({ speed: value })} />
                  <RangeField label="Font size" value={resolvedText.fontSizePercent ?? 12} min={5} max={24} step={0.1} onChange={(value) => updateTextSettings({ fontSizePercent: value })} />
                  <RangeField label="Max width" value={resolvedText.maxWidthPercent ?? 76} min={30} max={100} step={1} onChange={(value) => updateTextSettings({ maxWidthPercent: value })} />
                  <RangeField label="Offset X" value={resolvedText.offsetX ?? 0} min={-35} max={35} step={1} onChange={(value) => updateTextSettings({ offsetX: value })} />
                  <RangeField label="Offset Y" value={resolvedText.offsetY ?? 0} min={-35} max={35} step={1} onChange={(value) => updateTextSettings({ offsetY: value })} />
                  <RangeField label="Background dim" value={resolvedText.backgroundDim ?? 0.38} min={0} max={0.92} step={0.01} onChange={(value) => updateTextSettings({ backgroundDim: value })} />
                  <RangeField label="Animation intensity" value={resolvedText.animationIntensity ?? 0.82} min={0} max={1.2} step={0.01} onChange={(value) => updateTextSettings({ animationIntensity: value })} />
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Save className="h-4 w-4 text-amber-600" />
                    Output actions
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>Apply updates only this text scene in the editor.</p>
                    <p>Save as new preset creates a reusable text animation preset with a different title.</p>
                    {selectedTextPreset ? (
                      <p>Override preset updates {selectedTextPreset.title} in your preset library.</p>
                    ) : null}
                  </div>
                  {textActionError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {textActionError}
                    </div>
                  ) : null}
                  {canSaveTextAsNew ? (
                    <div className="flex gap-2">
                      <Input
                        value={textSaveTitle}
                        onChange={(e) => setTextSaveTitle(e.target.value)}
                        placeholder={selectedTextPreset ? 'New preset title' : 'Preset title'}
                        className="h-11 rounded-xl border-slate-200"
                      />
                      <Button
                        type="button"
                        onClick={handleSaveTextPreset}
                        disabled={!isTextSaveTitleValid || isSavingTextPreset}
                        className="h-11 rounded-xl bg-amber-600 px-4 text-white hover:bg-amber-700"
                      >
                        {isSavingTextPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Save as new preset
                      </Button>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOverrideTextPreset}
                    disabled={!canOverrideTextPreset || isOverridingTextPreset}
                    className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    {isOverridingTextPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Override preset
                  </Button>
                </div>
              </>
            ) : currentTab === 'visual' ? (
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
            return;
          }

          if (deletePresetKind === 'text') {
            void handleDeleteTextPreset();
          }
        }}
        variant="danger"
        title={
          deletePresetKind === 'visual'
            ? 'Delete look preset?'
            : deletePresetKind === 'motion'
              ? 'Delete motion preset?'
              : 'Delete text preset?'
        }
        description={
          deletePresetKind === 'visual'
            ? 'This deletes the selected look preset from your library and resets this image to the built-in none look.'
            : deletePresetKind === 'motion'
              ? 'This deletes the selected motion preset from your library and resets this image to the built-in default motion.'
              : 'This deletes the selected text preset from your library and resets this scene to the built-in pop-in / bounce text animation.'
        }
        confirmText={
          deletePresetKind === 'visual'
            ? 'Delete look preset'
            : deletePresetKind === 'motion'
              ? 'Delete motion preset'
              : 'Delete text preset'
        }
        cancelText="Cancel"
        isLoading={isDeletingLookPreset || isDeletingMotionPreset || isDeletingTextPreset}
      />
    </div>
  );
}