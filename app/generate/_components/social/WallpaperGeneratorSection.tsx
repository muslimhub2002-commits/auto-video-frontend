'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Loader2, Pencil, Sparkles, Upload, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { uploadManagedFile } from '@/lib/cloudinary';
import { useImageModelOptions } from '../../_hooks/useImageModelOptions';
import { LlmModelSelect } from '../LlmModelSelect';
import {
  getDefaultImageFilterSettings,
  ImageEffectPreview,
  normalizeImageFilterSettings,
  type ImageFilterPresetDto,
  type ImageFilterSettings,
  type MotionEffectPresetDto,
} from '../sentences/ImageEffectPreview';
import {
  ImageEffectsDetailModal,
  type ImageEffectsDetailApplyParams,
} from '../sentences/ImageEffectsDetailModal';
import type { TextAnimationPresetDto } from '../sentences/TextAnimationPreview';
import type { SentenceItem } from '../../_types/sentences';

export type SocialUploadScriptCharacter = {
  key: string;
  name: string;
  description: string;
  isSahaba: boolean;
  isProphet: boolean;
  isWoman: boolean;
};

type SafeCharacter = {
  key: string;
  name: string;
  description: string;
};

export type WallpaperGeneratorTheme = {
  shellClassName: string;
  iconWrapperClassName: string;
  generateButtonClassName: string;
  uploadButtonClassName: string;
  selectedCharacterChipClassName: string;
  unselectedCharacterChipClassName: string;
  previewBorderClassName: string;
  successBadgeClassName: string;
  accentPanelClassName: string;
  accentTextClassName: string;
};

type WallpaperGeneratorCopy = {
  title: string;
  description: string;
  promptNote: string;
  standaloneNote?: string;
};

type WallpaperGeneratorSectionProps = {
  isOpen: boolean;
  isShortVideo: boolean;
  script: string;
  scriptCharacters: SocialUploadScriptCharacter[];
  titleContext?: string;
  disabled?: boolean;
  onBusyChange?: (isBusy: boolean) => void;
  theme: WallpaperGeneratorTheme;
  copy: WallpaperGeneratorCopy;
};

const WALLPAPER_STYLE_PRESETS = [
  {
    key: 'anime',
    label: 'Anime',
    style: 'Modern Anime style, detailed, vibrant, high quality',
  },
  {
    key: 'realism',
    label: 'Realism',
    style: 'Photorealistic, ultra-detailed, natural lighting, high quality',
  },
  {
    key: 'cinematic',
    label: 'Cinematic',
    style: 'Cinematic film still, dramatic lighting, shallow depth of field, ultra-detailed',
  },
  {
    key: '3d',
    label: '3D Render',
    style: '3D render, high detail, global illumination, physically based rendering, high quality',
  },
  {
    key: 'watercolor',
    label: 'Watercolor',
    style: 'Watercolor illustration, soft washes, textured paper, high quality',
  },
  {
    key: 'classical oil-painting',
    label: 'Classical oil-painting',
    style: 'Classical oil painting, rich brushwork, museum-quality, high detail, dramatic composition',
  },
] as const;

const EMPTY_IMAGE_FILTER_PRESETS: ImageFilterPresetDto[] = [];
const EMPTY_MOTION_PRESETS: MotionEffectPresetDto[] = [];
const EMPTY_TEXT_PRESETS: TextAnimationPresetDto[] = [];

function resetLookState() {
  return {
    visualEffect: null as SentenceItem['visualEffect'] | null,
    customImageFilterId: null as string | null,
    imageFilterSettings: getDefaultImageFilterSettings(null),
  };
}

function buildCanvasFilter(settings: ImageFilterSettings) {
  return [
    `contrast(${(settings.contrast ?? 1).toFixed(3)})`,
    `saturate(${(settings.saturation ?? 1).toFixed(3)})`,
    `brightness(${(settings.brightness ?? 1).toFixed(3)})`,
    (settings.blurPx ?? 0) > 0 ? `blur(${(settings.blurPx ?? 0).toFixed(2)}px)` : null,
    (settings.sepia ?? 0) > 0 ? `sepia(${(settings.sepia ?? 0).toFixed(3)})` : null,
    (settings.grayscale ?? 0) > 0 ? `grayscale(${(settings.grayscale ?? 0).toFixed(3)})` : null,
    (settings.hueRotateDeg ?? 0) !== 0
      ? `hue-rotate(${(settings.hueRotateDeg ?? 0).toFixed(1)}deg)`
      : null,
  ]
    .filter(Boolean)
    .join(' ');
}

async function loadImageElement(url: string): Promise<HTMLImageElement> {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) {
    throw new Error('No wallpaper image available to download.');
  }

  const isDataUrl = /^data:/i.test(trimmed);

  const loadDirect = () =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      if (!isDataUrl) {
        image.crossOrigin = 'anonymous';
      }
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load the wallpaper image.'));
      image.src = trimmed;
    });

  try {
    return await loadDirect();
  } catch {
    if (isDataUrl) {
      throw new Error('Failed to load the wallpaper image.');
    }

    const response = await fetch(trimmed, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to download the wallpaper image bytes.');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to decode the wallpaper image.'));
        image.src = objectUrl;
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

async function downloadWallpaperWithEffects(params: {
  imageUrl: string;
  imageFilterSettings: ImageFilterSettings;
  fileName: string;
}) {
  const image = await loadImageElement(params.imageUrl);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error('Wallpaper image dimensions could not be read.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to prepare the wallpaper download canvas.');
  }

  const settings = normalizeImageFilterSettings(params.imageFilterSettings, null);
  const filter = buildCanvasFilter(settings);
  if (filter) {
    context.filter = filter;
  }
  context.drawImage(image, 0, 0, width, height);
  context.filter = 'none';

  const lighting = settings.animatedLightingIntensity ?? 0;
  if (lighting > 0.001) {
    context.save();
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = Math.min(0.7, lighting * 1.15);
    const radial = context.createRadialGradient(
      width * 0.28,
      height * 0.22,
      width * 0.06,
      width * 0.28,
      height * 0.22,
      width * 0.72,
    );
    radial.addColorStop(0, 'rgba(255, 236, 181, 0.92)');
    radial.addColorStop(0.22, 'rgba(255, 215, 130, 0.58)');
    radial.addColorStop(0.48, 'rgba(255, 176, 90, 0.22)');
    radial.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = radial;
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  const glassOverlayOpacity = settings.glassOverlayOpacity ?? 0;
  if (glassOverlayOpacity > 0.001) {
    context.save();
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = glassOverlayOpacity;
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(0.18, 'rgba(255,255,255,0.08)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.62, 'rgba(255,255,255,0.10)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) {
        resolve(nextBlob);
        return;
      }
      reject(new Error('Failed to export the edited wallpaper image.'));
    }, 'image/png');
  });

  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = params.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
}

function getDownloadFileName(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'wallpaper';
  return `${slug}.png`;
}

export function WallpaperGeneratorSection({
  isOpen,
  isShortVideo,
  script,
  scriptCharacters,
  titleContext,
  disabled = false,
  onBusyChange,
  theme,
  copy,
}: WallpaperGeneratorSectionProps) {
  const [wallpaperPromptModel, setWallpaperPromptModel] = useState('gpt-5.2');
  const [wallpaperImageStyle, setWallpaperImageStyle] = useState<string>('cinematic');
  const [wallpaperImageModel, setWallpaperImageModel] = useState('leonardo');
  const [isGeneratingWallpaper, setIsGeneratingWallpaper] = useState(false);
  const [wallpaperError, setWallpaperError] = useState<string | null>(null);
  const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);
  const [wallpaperUploadError, setWallpaperUploadError] = useState<string | null>(null);
  const [wallpaperUploadedUrl, setWallpaperUploadedUrl] = useState<string | null>(null);
  const [wallpaperLocalFileName, setWallpaperLocalFileName] = useState<string | null>(null);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [wallpaperHeadline, setWallpaperHeadline] = useState<string | null>(null);
  const [wallpaperSafeCharacters, setWallpaperSafeCharacters] = useState<SafeCharacter[]>([]);
  const [wallpaperUsedCharacterKeys, setWallpaperUsedCharacterKeys] = useState<string[]>([]);
  const [selectedCharacterKeys, setSelectedCharacterKeys] = useState<string[]>([]);
  const [characterSelectionError, setCharacterSelectionError] = useState<string | null>(null);
  const [isLookEditorOpen, setIsLookEditorOpen] = useState(false);
  const [visualEffect, setVisualEffect] = useState<SentenceItem['visualEffect'] | null>(null);
  const [customImageFilterId, setCustomImageFilterId] = useState<string | null>(null);
  const [imageFilterSettings, setImageFilterSettings] = useState<ImageFilterSettings>(
    getDefaultImageFilterSettings(null),
  );

  const wallpaperFileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    providerOptions: wallpaperProviderOptions,
    selectedProvider: wallpaperSelectedProvider,
    selectedModelValue: wallpaperSelectedModelValue,
    modelOptions: wallpaperModelOptions,
    onProviderChange: onWallpaperProviderChange,
    onModelChange: onWallpaperModelChange,
  } = useImageModelOptions({
    selectedValue: wallpaperImageModel,
    onSelectedValueChange: setWallpaperImageModel,
    enabled: isOpen && !isShortVideo,
  });

  const safeSelectableCharacters = useMemo(
    () =>
      (Array.isArray(scriptCharacters) ? scriptCharacters : [])
        .filter((character) => !character.isProphet && !character.isSahaba && !character.isWoman)
        .map((character) => ({
          key: String(character.key ?? '').trim(),
          name: String(character.name ?? '').trim(),
          description: String(character.description ?? '').trim(),
        }))
        .filter((character) => character.key && character.name && character.description),
    [scriptCharacters],
  );

  const isBusy = disabled || isGeneratingWallpaper || isUploadingWallpaper;

  useEffect(() => {
    onBusyChange?.(isGeneratingWallpaper || isUploadingWallpaper);
  }, [isGeneratingWallpaper, isUploadingWallpaper, onBusyChange]);

  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  useEffect(() => {
    if (!isOpen) return;

    setWallpaperError(null);
    setWallpaperUploadError(null);
    setWallpaperUploadedUrl(null);
    setWallpaperLocalFileName(null);
    setWallpaperUrl(null);
    setWallpaperHeadline(null);
    setWallpaperSafeCharacters([]);
    setWallpaperUsedCharacterKeys([]);
    setSelectedCharacterKeys([]);
    setCharacterSelectionError(null);
    setIsLookEditorOpen(false);

    const defaults = resetLookState();
    setVisualEffect(defaults.visualEffect);
    setCustomImageFilterId(defaults.customImageFilterId);
    setImageFilterSettings(defaults.imageFilterSettings);
  }, [isOpen]);

  const clearWallpaperState = () => {
    setWallpaperError(null);
    setWallpaperUploadError(null);
    setWallpaperUploadedUrl(null);
    setWallpaperLocalFileName(null);
    setWallpaperUrl(null);
    setWallpaperHeadline(null);
    setWallpaperSafeCharacters([]);
    setWallpaperUsedCharacterKeys([]);
    setSelectedCharacterKeys([]);
    setCharacterSelectionError(null);
    setIsLookEditorOpen(false);

    const defaults = resetLookState();
    setVisualEffect(defaults.visualEffect);
    setCustomImageFilterId(defaults.customImageFilterId);
    setImageFilterSettings(defaults.imageFilterSettings);
  };

  const toggleCharacterKey = (key: string) => {
    setCharacterSelectionError(null);
    setSelectedCharacterKeys((current) => {
      if (current.includes(key)) {
        return current.filter((value) => value !== key);
      }

      if (current.length >= 4) {
        setCharacterSelectionError('You can choose up to 4 characters for one wallpaper.');
        return current;
      }

      return [...current, key];
    });
  };

  const handleGenerateWallpaper = async () => {
    setWallpaperError(null);
    setWallpaperUploadError(null);
    setWallpaperUploadedUrl(null);
    setWallpaperUrl(null);
    setWallpaperHeadline(null);
    setWallpaperSafeCharacters([]);
    setWallpaperUsedCharacterKeys([]);

    const trimmedScript = String(script ?? '').trim();
    if (!trimmedScript) {
      setWallpaperError('No script available. Generate or paste a script first.');
      return;
    }

    setIsGeneratingWallpaper(true);
    try {
      const stylePreset =
        WALLPAPER_STYLE_PRESETS.find((preset) => preset.key === wallpaperImageStyle) ||
        WALLPAPER_STYLE_PRESETS[0];

      const response = await api.post('/ai/youtube-wallpaper', {
        script: trimmedScript,
        title: String(titleContext ?? '').trim() || undefined,
        promptModel: wallpaperPromptModel || undefined,
        imageModel: wallpaperImageModel,
        style: stylePreset.style,
        characters: Array.isArray(scriptCharacters) ? scriptCharacters : [],
        selectedCharacterKeys: selectedCharacterKeys.length ? selectedCharacterKeys : undefined,
      });

      const data = response.data as {
        headline?: string;
        usedCharacterKeys?: string[];
        safeCharacters?: SafeCharacter[];
        imageBase64?: string;
        imageUrl?: string;
      };

      const nextUrl =
        (data?.imageUrl && String(data.imageUrl)) ||
        (data?.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : null);

      if (!nextUrl) {
        throw new Error('Wallpaper generated, but no image URL was returned.');
      }

      setWallpaperUrl(nextUrl);
      setWallpaperLocalFileName(null);
      if (typeof data?.headline === 'string' && data.headline.trim()) {
        setWallpaperHeadline(data.headline.trim());
      }
      if (Array.isArray(data?.safeCharacters)) {
        setWallpaperSafeCharacters(
          data.safeCharacters
            .map((character) => ({
              key: String(character?.key ?? '').trim(),
              name: String(character?.name ?? '').trim(),
              description: String(character?.description ?? '').trim(),
            }))
            .filter((character) => character.key && character.name && character.description),
        );
      }
      if (Array.isArray(data?.usedCharacterKeys)) {
        setWallpaperUsedCharacterKeys(
          data.usedCharacterKeys.map((key) => String(key ?? '').trim()).filter(Boolean),
        );
      }
    } catch (error: unknown) {
      const messageFromApi = (() => {
        if (typeof error === 'object' && error !== null && 'response' in error) {
          const response = (error as { response?: { data?: { message?: unknown } } }).response;
          const message = response?.data?.message;
          if (typeof message === 'string' && message.trim()) return message;
        }
        if (error instanceof Error && error.message.trim()) return error.message;
        return null;
      })();
      setWallpaperError(messageFromApi ?? 'Failed to generate wallpaper. Please try again.');
    } finally {
      setIsGeneratingWallpaper(false);
    }
  };

  const handleUploadWallpaper = async (file: File) => {
    setWallpaperUploadError(null);
    setWallpaperError(null);
    setCharacterSelectionError(null);
    setWallpaperLocalFileName(file.name || null);

    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setWallpaperUploadError('Wallpaper image is too large. Please use an image under 15MB.');
      return;
    }

    if (!file.type?.startsWith('image/')) {
      setWallpaperUploadError('Please select a valid image file (PNG/JPG/WebP).');
      return;
    }

    setIsUploadingWallpaper(true);
    try {
      const url = await uploadManagedFile(file, {
        resourceType: 'image',
        folder: 'auto-video-generator/wallpapers',
      });

      setWallpaperUrl(url);
      setWallpaperUploadedUrl(url);
      setWallpaperHeadline(null);
      setWallpaperSafeCharacters([]);
      setWallpaperUsedCharacterKeys([]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : null;
      setWallpaperUploadError(message || 'Failed to upload wallpaper. Please try again.');
    } finally {
      setIsUploadingWallpaper(false);
    }
  };

  const handleWallpaperFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    await handleUploadWallpaper(file);
  };

  const handleLookApply = (params: ImageEffectsDetailApplyParams) => {
    setVisualEffect(params.visualEffect);
    setCustomImageFilterId(params.customImageFilterId);
    setImageFilterSettings(params.imageFilterSettings);
  };

  const handleLookDownload = async (params: ImageEffectsDetailApplyParams) => {
    if (!wallpaperUrl) {
      throw new Error('No wallpaper image available to download.');
    }

    await downloadWallpaperWithEffects({
      imageUrl: wallpaperUrl,
      imageFilterSettings: params.imageFilterSettings,
      fileName: getDownloadFileName(copy.title),
    });
  };

  if (isShortVideo) return null;

  return (
    <>
      <div className={theme.shellClassName}>
        <div className="flex items-start gap-4">
          <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${theme.iconWrapperClassName}`}>
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-bold text-gray-900">{copy.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{copy.description}</p>
            {copy.standaloneNote ? (
              <p className={`mt-2 text-xs font-medium ${theme.accentTextClassName}`}>
                {copy.standaloneNote}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <LlmModelSelect
            value={wallpaperPromptModel}
            onValueChange={setWallpaperPromptModel}
            label="Prompt Model"
            placeholder="Server Default"
            disabled={isBusy}
          />

          <Select value={wallpaperImageStyle} onValueChange={setWallpaperImageStyle} disabled={isBusy}>
            <SelectTrigger label="Image Style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WALLPAPER_STYLE_PRESETS.map((preset) => (
                <SelectItem key={preset.key} value={preset.key}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={wallpaperSelectedProvider}
            onValueChange={(value) => onWallpaperProviderChange(value as typeof wallpaperSelectedProvider)}
            disabled={isBusy}
          >
            <SelectTrigger label="Image Provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {wallpaperProviderOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={wallpaperSelectedModelValue} onValueChange={onWallpaperModelChange} disabled={isBusy}>
            <SelectTrigger label="Image Model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {wallpaperModelOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={`mt-5 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm ${theme.accentPanelClassName}`}>
          <div className="flex items-start gap-3">
            <Users className={`mt-0.5 h-4 w-4 shrink-0 ${theme.accentTextClassName}`} />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Characters in the image</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Pick up to 4 safe characters to guide the image. Leave all unselected to let the AI auto-pick from the safe character list.
                </p>
              </div>

              {safeSelectableCharacters.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {safeSelectableCharacters.map((character) => {
                    const isSelected = selectedCharacterKeys.includes(character.key);
                    return (
                      <button
                        key={character.key}
                        type="button"
                        onClick={() => toggleCharacterKey(character.key)}
                        disabled={isBusy}
                        className={`rounded-full border px-3 py-2 text-left text-xs font-semibold transition ${
                          isSelected
                            ? theme.selectedCharacterChipClassName
                            : theme.unselectedCharacterChipClassName
                        } ${isBusy ? 'cursor-not-allowed opacity-70' : ''}`}
                        title={`${character.key} - ${character.name}: ${character.description}`}
                      >
                        <span className="block">{character.key} - {character.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  No safe characters are available in this script, so wallpaper generation will avoid forced human character selection.
                </div>
              )}

              <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
                <span>{selectedCharacterKeys.length}/4 selected</span>
                <span>{copy.promptNote}</span>
              </div>

              {characterSelectionError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                  {characterSelectionError}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <Button
            type="button"
            onClick={handleGenerateWallpaper}
            disabled={isBusy || !String(script ?? '').trim()}
            className={theme.generateButtonClassName}
          >
            {isGeneratingWallpaper ? (
              <>
                <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                <span>Generating wallpaper...</span>
              </>
            ) : (
              <>
                <Sparkles className="mr-2.5 h-5 w-5" />
                <span>Generate Wallpaper</span>
              </>
            )}
          </Button>

          <p className="text-sm text-gray-600">{copy.promptNote}</p>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-white/80 p-4 backdrop-blur-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Upload Wallpaper</p>
              <p className="text-sm leading-relaxed text-gray-700">
                Prefer your own design? Upload a 16:9 image and use it as the current wallpaper preview.
              </p>
              <p className="text-xs text-gray-600">PNG/JPG/WebP. Recommended 1280x720 or higher. Max 15MB.</p>
            </div>

            <div className="flex items-center gap-3 md:shrink-0">
              <input
                ref={wallpaperFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleWallpaperFileChange}
                disabled={isBusy || isUploadingWallpaper}
                className="hidden"
              />

              <Button
                type="button"
                onClick={() => wallpaperFileInputRef.current?.click()}
                disabled={isBusy || isUploadingWallpaper}
                className={theme.uploadButtonClassName}
              >
                {isUploadingWallpaper ? (
                  <>
                    <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="mr-2.5 h-5 w-5" />
                    <span>Choose Image</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={clearWallpaperState}
                disabled={isBusy || (!wallpaperUrl && !wallpaperUploadedUrl)}
                className="h-12 rounded-xl"
              >
                Remove
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Selected:</span>{' '}
              {wallpaperLocalFileName ? (
                <span className="font-medium">{wallpaperLocalFileName}</span>
              ) : (
                <span className="text-gray-500">No file selected</span>
              )}
            </div>

            {wallpaperUploadedUrl ? (
              <div className={theme.successBadgeClassName}>Uploaded and set as current wallpaper</div>
            ) : null}
          </div>

          {wallpaperUploadError ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {wallpaperUploadError}
            </div>
          ) : null}
        </div>

        {wallpaperError ? (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {wallpaperError}
          </div>
        ) : null}

        {wallpaperUrl ? (
          <div className={`mt-5 rounded-2xl bg-white/85 p-4 backdrop-blur-sm ${theme.previewBorderClassName}`}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Wallpaper Preview</p>

            {wallpaperHeadline ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Headline</p>
                <p className="mt-1 text-sm font-bold text-amber-950">{wallpaperHeadline}</p>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <ImageEffectPreview
                visualEffect={visualEffect}
                imageMotionEffect="default"
                imageMotionSpeed={1}
                isShortVideo={false}
                imageFilterSettings={imageFilterSettings}
                imageMotionSettings={null}
                enableMotion={false}
              >
                <img src={wallpaperUrl} alt="Generated wallpaper" className="w-full h-auto" />
              </ImageEffectPreview>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLookEditorOpen(true)}
                disabled={isBusy || !wallpaperUrl}
                className="h-11 rounded-xl"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Look
              </Button>
            </div>

            {(wallpaperSafeCharacters.length > 0 || safeSelectableCharacters.length > 0) ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Safe Characters (non-Prophet / non-Sahaba / non-women)
                </p>
                <div className="space-y-2">
                  {(wallpaperSafeCharacters.length > 0 ? wallpaperSafeCharacters : safeSelectableCharacters).map((character) => {
                    const isUsed = wallpaperUsedCharacterKeys.includes(character.key);
                    const isSelected = selectedCharacterKeys.includes(character.key);
                    return (
                      <div
                        key={character.key}
                        className={`rounded-lg border px-3 py-2 ${
                          isUsed
                            ? 'border-emerald-200 bg-emerald-50'
                            : isSelected
                              ? 'border-sky-200 bg-sky-50'
                              : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {character.key} - {character.name}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isUsed
                                ? 'bg-emerald-600 text-white'
                                : isSelected
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {isUsed ? 'Used' : isSelected ? 'Selected' : 'Available'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-gray-700">{character.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <ImageEffectsDetailModal
        isOpen={isLookEditorOpen}
        isShortVideo={false}
        activeTab="visual"
        enabledTabs={['visual']}
        variant="look-only-upload"
        previewImageUrl={wallpaperUrl}
        sentenceText={wallpaperHeadline ?? copy.title}
        visualEffect={visualEffect}
        imageMotionEffect="default"
        imageMotionSpeed={1}
        textAnimationEffect={null}
        textAnimationText={null}
        textBackgroundImage={null}
        textBackgroundImageUrl={null}
        textBackgroundSavedImageId={null}
        textBackgroundVideo={null}
        textBackgroundVideoUrl={null}
        textBackgroundSavedVideoId={null}
        overlayFile={null}
        overlayUrl={null}
        overlayMimeType={null}
        customImageFilterId={customImageFilterId}
        customMotionEffectId={null}
        customTextAnimationId={null}
        customOverlayId={null}
        imageFilterSettings={imageFilterSettings}
        imageMotionSettings={null}
        textAnimationSettings={null}
        overlaySettings={null}
        retainedTemporaryLook={null}
        retainedTemporaryMotion={null}
        imageFilterPresets={EMPTY_IMAGE_FILTER_PRESETS}
        motionEffectPresets={EMPTY_MOTION_PRESETS}
        textAnimationPresets={EMPTY_TEXT_PRESETS}
        overlayPresets={[]}
        onClose={() => setIsLookEditorOpen(false)}
        onApply={handleLookApply}
        onDownload={handleLookDownload}
        onSaveImageFilterPreset={async () => null}
        onUpdateImageFilterPreset={async () => null}
        onDeleteImageFilterPreset={async () => false}
        onSaveMotionEffectPreset={async () => null}
        onUpdateMotionEffectPreset={async () => null}
        onDeleteMotionEffectPreset={async () => false}
        onSaveTextAnimationPreset={async () => null}
        onUpdateTextAnimationPreset={async () => null}
        onDeleteTextAnimationPreset={async () => false}
        onSaveOverlayPreset={async () => null}
        onDeleteOverlayPreset={async () => false}
        onGenerateLookWithAi={async () => null}
        onGenerateMotionWithAi={async () => null}
      />
    </>
  );
}

export const YOUTUBE_WALLPAPER_THEME: WallpaperGeneratorTheme = {
  shellClassName:
    'bg-linear-to-br from-amber-50 via-rose-50 to-purple-50 border-2 border-amber-200/70 rounded-2xl p-6',
  iconWrapperClassName: 'bg-linear-to-br from-amber-500 to-rose-500',
  generateButtonClassName:
    'h-12 md:w-auto rounded-xl bg-linear-to-r from-amber-600 to-rose-600 text-white shadow-md transition-all duration-200 hover:from-amber-700 hover:to-rose-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60',
  uploadButtonClassName:
    'h-12 rounded-xl border-2 border-amber-200/80 bg-white text-gray-900 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md',
  selectedCharacterChipClassName: 'border-amber-300 bg-amber-100 text-amber-950 shadow-sm',
  unselectedCharacterChipClassName: 'border-amber-200 bg-white text-gray-700 hover:bg-amber-50',
  previewBorderClassName: 'border border-amber-200/60',
  successBadgeClassName:
    'w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800',
  accentPanelClassName: 'border-amber-200/60',
  accentTextClassName: 'text-amber-800',
};

export const META_WALLPAPER_THEME: WallpaperGeneratorTheme = {
  shellClassName:
    'bg-linear-to-br from-sky-50 via-white to-indigo-50 border border-sky-200 rounded-2xl p-6',
  iconWrapperClassName: 'bg-linear-to-br from-sky-600 to-indigo-600',
  generateButtonClassName:
    'h-12 md:w-auto rounded-xl bg-linear-to-r from-sky-700 to-indigo-700 text-white shadow-md transition-all duration-200 hover:from-sky-800 hover:to-indigo-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60',
  uploadButtonClassName:
    'h-12 rounded-xl border-2 border-sky-200 bg-white text-gray-900 shadow-sm transition-all duration-200 hover:bg-sky-50 hover:shadow-md',
  selectedCharacterChipClassName: 'border-sky-300 bg-sky-100 text-sky-950 shadow-sm',
  unselectedCharacterChipClassName: 'border-sky-200 bg-white text-gray-700 hover:bg-sky-50',
  previewBorderClassName: 'border border-sky-200',
  successBadgeClassName:
    'w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800',
  accentPanelClassName: 'border-sky-200',
  accentTextClassName: 'text-sky-800',
};

export const TIKTOK_WALLPAPER_THEME: WallpaperGeneratorTheme = {
  shellClassName:
    'bg-linear-to-br from-rose-50 via-white to-cyan-50 border border-rose-100 rounded-2xl p-6',
  iconWrapperClassName: 'bg-linear-to-br from-neutral-950 to-rose-500',
  generateButtonClassName:
    'h-12 md:w-auto rounded-xl bg-linear-to-r from-neutral-950 to-rose-500 text-white shadow-md transition-all duration-200 hover:from-black hover:to-rose-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60',
  uploadButtonClassName:
    'h-12 rounded-xl border-2 border-rose-200 bg-white text-gray-900 shadow-sm transition-all duration-200 hover:bg-rose-50 hover:shadow-md',
  selectedCharacterChipClassName: 'border-rose-300 bg-rose-100 text-rose-950 shadow-sm',
  unselectedCharacterChipClassName: 'border-rose-200 bg-white text-gray-700 hover:bg-rose-50',
  previewBorderClassName: 'border border-rose-200/70',
  successBadgeClassName:
    'w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800',
  accentPanelClassName: 'border-rose-200/70',
  accentTextClassName: 'text-rose-800',
};