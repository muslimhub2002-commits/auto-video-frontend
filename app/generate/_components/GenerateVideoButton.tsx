'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Pause, Play, Save, Sparkles, Star, Upload, Video } from 'lucide-react';

type BackgroundSoundtrackItem = {
  id: string;
  title: string;
  url: string;
  is_favorite?: boolean;
  volume_percent?: number;
};

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface GenerateVideoButtonProps {
  isGenerating: boolean;
  videoJobStatus: string | null;
  script: string;
  voiceOver: File | null;
  onGenerate: () => void;
  onUploadVideo: (file: File) => Promise<void> | void;
  isUploadingVideo: boolean;

  backgroundSoundtracks: BackgroundSoundtrackItem[];
  selectedBackgroundSoundtrackValue: string;
  onSelectedBackgroundSoundtrackValueChange: (value: string) => void;
  backgroundSoundtrackVolumePercent: number;
  onBackgroundSoundtrackVolumePercentChange: (value: number) => void;
  hasOneOffBackgroundSoundtrack: boolean;
  oneOffBackgroundSoundtrackUrl?: string | null;
  onToast?: (message: string, type?: ToastType, duration?: number) => void;
  onSetFavoriteBackgroundSoundtrack?: (soundtrackId: string) => Promise<void> | void;
  isSettingFavoriteBackgroundSoundtrack?: boolean;
  onSaveBackgroundSoundtrackVolume?: (params: {
    soundtrackId: string;
    volumePercent: number;
  }) => Promise<void> | void;
  isSavingBackgroundSoundtrackVolume?: boolean;
  onUploadBackgroundSoundtrackUseOnce: (file: File) => Promise<void> | void;
  onUploadBackgroundSoundtrackAddToLibrary: (params: {
    file: File;
    title: string;
  }) => Promise<void> | void;
  isUploadingBackgroundSoundtrack: boolean;
}

export function GenerateVideoButton({
  isGenerating,
  videoJobStatus,
  script,
  voiceOver,
  onGenerate,
  onUploadVideo,
  isUploadingVideo,

  backgroundSoundtracks,
  selectedBackgroundSoundtrackValue,
  onSelectedBackgroundSoundtrackValueChange,
  backgroundSoundtrackVolumePercent,
  onBackgroundSoundtrackVolumePercentChange,
  hasOneOffBackgroundSoundtrack,
  oneOffBackgroundSoundtrackUrl,
  onToast,
  onSetFavoriteBackgroundSoundtrack,
  isSettingFavoriteBackgroundSoundtrack,
  onSaveBackgroundSoundtrackVolume,
  isSavingBackgroundSoundtrackVolume,
  onUploadBackgroundSoundtrackUseOnce,
  onUploadBackgroundSoundtrackAddToLibrary,
  isUploadingBackgroundSoundtrack,
}: GenerateVideoButtonProps) {
  const MAX_UPLOAD_MB = 250;
  const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

  const isJobInProgress = !!videoJobStatus && videoJobStatus !== 'completed';
  const isDisabled =
    isGenerating ||
    isJobInProgress ||
    !script.trim() ||
    !voiceOver;

  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [selectedSoundtrack, setSelectedSoundtrack] = useState<File | null>(null);
  const [soundtrackTitle, setSoundtrackTitle] = useState('');
  const [soundtrackError, setSoundtrackError] = useState<string | null>(null);
  const soundtrackInputRef = useRef<HTMLInputElement | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const [previewKind, setPreviewKind] = useState<'selected' | 'file' | null>(null);
  const [isSoundtrackPreviewPlaying, setIsSoundtrackPreviewPlaying] = useState(false);

  const mixAudioContextRef = useRef<AudioContext | null>(null);
  const mixBackgroundGainRef = useRef<GainNode | null>(null);
  const mixBackgroundSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const mixVoiceSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isMixPreviewPlaying, setIsMixPreviewPlaying] = useState(false);

  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  const normalizedBackgroundVolume = clamp01(
    (backgroundSoundtrackVolumePercent ?? 100) / 100,
  );

  const selectedVideoLabel = useMemo(() => {
    if (!selectedVideo) return null;
    const mb = selectedVideo.size / (1024 * 1024);
    const sizeLabel = Number.isFinite(mb) ? `${mb.toFixed(1)} MB` : '';
    return `${selectedVideo.name}${sizeLabel ? ` • ${sizeLabel}` : ''}`;
  }, [selectedVideo]);

  const uploadDisabled = isGenerating || isJobInProgress || isUploadingVideo;
  const soundtrackUploadDisabled =
    isGenerating || isJobInProgress || isUploadingBackgroundSoundtrack;

  const stopSoundtrackPreview = () => {
    try {
      previewAudioRef.current?.pause();
      if (previewAudioRef.current) previewAudioRef.current.currentTime = 0;
    } catch {
      // ignore
    }

    if (previewObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      } catch {
        // ignore
      }
      previewObjectUrlRef.current = null;
    }

    setIsSoundtrackPreviewPlaying(false);
    setPreviewKind(null);
  };

  const stopMixPreview = async () => {
    try {
      mixBackgroundSourceRef.current?.stop();
    } catch {
      // ignore
    }
    try {
      mixVoiceSourceRef.current?.stop();
    } catch {
      // ignore
    }

    mixBackgroundSourceRef.current = null;
    mixVoiceSourceRef.current = null;
    mixBackgroundGainRef.current = null;

    const ctx = mixAudioContextRef.current;
    mixAudioContextRef.current = null;
    if (ctx) {
      try {
        await ctx.close();
      } catch {
        // ignore
      }
    }

    setIsMixPreviewPlaying(false);
  };

  const playSoundtrackPreview = async (src: string, kind: 'selected' | 'file') => {
    try {
      await stopMixPreview();
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio();
        previewAudioRef.current.addEventListener('ended', () => {
          setIsSoundtrackPreviewPlaying(false);
          setPreviewKind(null);
        });
      }

      previewAudioRef.current.volume = normalizedBackgroundVolume;

      previewAudioRef.current.src = src;
      await previewAudioRef.current.play();
      setIsSoundtrackPreviewPlaying(true);
      setPreviewKind(kind);
    } catch {
      onToast?.('Failed to play preview.', 'error');
      setIsSoundtrackPreviewPlaying(false);
      setPreviewKind(null);
    }
  };

  const selectedSoundtrackPreviewSrc = useMemo(() => {
    const value = String(selectedBackgroundSoundtrackValue ?? '').trim();
    if (!value || value === '__default__' || value === '__none__') return null;

    if (value === '__oneoff__') {
      return oneOffBackgroundSoundtrackUrl ? String(oneOffBackgroundSoundtrackUrl).trim() : null;
    }

    if (value.startsWith('lib:')) {
      const id = value.slice('lib:'.length);
      const found = backgroundSoundtracks.find((t) => t.id === id);
      return found?.url ? String(found.url).trim() : null;
    }

    return null;
  }, [backgroundSoundtracks, oneOffBackgroundSoundtrackUrl, selectedBackgroundSoundtrackValue]);

  const canMixPreview = useMemo(() => {
    if (isMixPreviewPlaying) return true;
    if (!voiceOver) return false;
    if (selectedSoundtrackPreviewSrc) return true;
    // Allow mixing with a chosen (not yet uploaded) file as well.
    return Boolean(selectedSoundtrack);
  }, [isMixPreviewPlaying, selectedSoundtrack, selectedSoundtrackPreviewSrc, voiceOver]);

  const mixPreviewBlockedReason = useMemo(() => {
    if (soundtrackUploadDisabled) return 'Preview is disabled while a job is running.';
    if (isMixPreviewPlaying) return null;
    if (!voiceOver) return 'Add a voice-over first to preview the mix.';
    if (!selectedSoundtrackPreviewSrc && !selectedSoundtrack) {
      return 'Select or choose a background soundtrack to preview.';
    }
    return null;
  }, [isMixPreviewPlaying, selectedSoundtrack, selectedSoundtrackPreviewSrc, soundtrackUploadDisabled, voiceOver]);

  const selectedLibrarySoundtrack = useMemo(() => {
    const value = String(selectedBackgroundSoundtrackValue ?? '').trim();
    if (!value.startsWith('lib:')) return null;
    const id = value.slice('lib:'.length);
    return backgroundSoundtracks.find((t) => t.id === id) ?? null;
  }, [backgroundSoundtracks, selectedBackgroundSoundtrackValue]);

  const canSaveVolume = Boolean(selectedLibrarySoundtrack?.id);

  useEffect(() => {
    return () => {
      stopSoundtrackPreview();
      void stopMixPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Live-update preview volume.
    if (previewAudioRef.current && isSoundtrackPreviewPlaying) {
      previewAudioRef.current.volume = normalizedBackgroundVolume;
    }

    // Live-update mix background gain.
    if (mixBackgroundGainRef.current && isMixPreviewPlaying) {
      mixBackgroundGainRef.current.gain.value = normalizedBackgroundVolume;
    }
  }, [isMixPreviewPlaying, isSoundtrackPreviewPlaying, normalizedBackgroundVolume]);

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handlePickSoundtrack = () => {
    soundtrackInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedVideo) return;
    await onUploadVideo(selectedVideo);
    setSelectedVideo(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleAddSoundtrackToLibrary = async () => {
    if (!selectedSoundtrack) return;
    const title = soundtrackTitle.trim();
    const filename = String(selectedSoundtrack.name ?? '').trim();
    const baseName = filename ? filename.replace(/\.[^/.]+$/, '') : '';
    const fallbackTitle = baseName.trim() || 'Untitled soundtrack';
    const finalTitle = (title || fallbackTitle).slice(0, 255);

    // If the user left it blank, reflect the auto-picked title in the UI.
    if (!title) setSoundtrackTitle(finalTitle);
    setSoundtrackError(null);

    await onUploadBackgroundSoundtrackAddToLibrary({
      file: selectedSoundtrack,
      title: finalTitle,
    });
    setSelectedSoundtrack(null);
    setSoundtrackTitle('');
    if (soundtrackInputRef.current) soundtrackInputRef.current.value = '';
  };

  const handlePreviewSelectedSoundtrack = async () => {
    if (isSoundtrackPreviewPlaying && previewKind === 'selected') {
      stopSoundtrackPreview();
      return;
    }

    if (!selectedSoundtrackPreviewSrc) {
      onToast?.('Select a soundtrack to preview.', 'warning');
      return;
    }

    stopSoundtrackPreview();
    await playSoundtrackPreview(selectedSoundtrackPreviewSrc, 'selected');
  };

  const handlePreviewChosenFile = async () => {
    if (isSoundtrackPreviewPlaying && previewKind === 'file') {
      stopSoundtrackPreview();
      return;
    }

    if (!selectedSoundtrack) {
      onToast?.('Choose an MP3 file first.', 'warning');
      return;
    }

    stopSoundtrackPreview();
    const objectUrl = URL.createObjectURL(selectedSoundtrack);
    previewObjectUrlRef.current = objectUrl;
    await playSoundtrackPreview(objectUrl, 'file');
  };

  const decodeAudio = async (ctx: AudioContext, buffer: ArrayBuffer) => {
    const anyCtx = ctx as any;
    const maybePromise = anyCtx.decodeAudioData(buffer);
    if (maybePromise && typeof maybePromise.then === 'function') {
      return (await maybePromise) as AudioBuffer;
    }
    return await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(buffer, resolve, reject);
    });
  };

  const handlePreviewMix = async () => {
    if (isMixPreviewPlaying) {
      await stopMixPreview();
      return;
    }

    if (!voiceOver) {
      onToast?.('Add a voice-over first to preview the mix.', 'warning');
      return;
    }

    const hasBackground = Boolean(selectedSoundtrack) || Boolean(selectedSoundtrackPreviewSrc);
    if (!hasBackground) {
      onToast?.('Select or choose a background soundtrack to preview.', 'warning');
      return;
    }

    stopSoundtrackPreview();
    await stopMixPreview();

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      mixAudioContextRef.current = ctx;

      const voiceBufferRaw = await voiceOver.arrayBuffer();
      const voiceAudioBuffer = await decodeAudio(ctx, voiceBufferRaw);

      let bgAudioBuffer: AudioBuffer;
      // If the user has chosen a file to upload, prefer that for mix preview.
      // This avoids surprising behavior where a selected library track overrides the uploaded file.
      if (selectedSoundtrack) {
        const bgRaw = await selectedSoundtrack.arrayBuffer();
        bgAudioBuffer = await decodeAudio(ctx, bgRaw);
      } else {
        const selectedValue = String(selectedBackgroundSoundtrackValue ?? '').trim();
        const preferOneOffOverLibrary =
          Boolean(oneOffBackgroundSoundtrackUrl) && selectedValue.startsWith('lib:');

        const bgSrc = preferOneOffOverLibrary
          ? String(oneOffBackgroundSoundtrackUrl ?? '').trim()
          : selectedSoundtrackPreviewSrc;

        if (!bgSrc) {
          throw new Error('Missing background soundtrack');
        }

        const res = await fetch(bgSrc);
        if (!res.ok) {
          throw new Error('Failed to fetch background soundtrack');
        }
        const bgRaw = await res.arrayBuffer();
        bgAudioBuffer = await decodeAudio(ctx, bgRaw);
      }

      const bgGain = ctx.createGain();
      bgGain.gain.value = normalizedBackgroundVolume;
      mixBackgroundGainRef.current = bgGain;

      const bgSource = ctx.createBufferSource();
      bgSource.buffer = bgAudioBuffer;
      bgSource.loop = true;
      bgSource.connect(bgGain);
      bgGain.connect(ctx.destination);
      mixBackgroundSourceRef.current = bgSource;

      const voiceSource = ctx.createBufferSource();
      voiceSource.buffer = voiceAudioBuffer;
      voiceSource.connect(ctx.destination);
      mixVoiceSourceRef.current = voiceSource;

      const stopIfPlaying = () => {
        // Avoid racey onended calls when already stopped.
        if (!mixAudioContextRef.current) return;
        void stopMixPreview();
      };
      bgSource.addEventListener('ended', stopIfPlaying);
      voiceSource.addEventListener('ended', stopIfPlaying);

      const startAt = ctx.currentTime + 0.08;
      bgSource.start(startAt);
      voiceSource.start(startAt);

      setIsMixPreviewPlaying(true);
    } catch (err) {
      console.error('Mix preview failed', err);
      await stopMixPreview();
      onToast?.('Failed to preview mix. Try again.', 'error');
    }
  };

  const handleSetFavorite = async () => {
    const id = selectedLibrarySoundtrack?.id;
    if (!id) {
      onToast?.('Select a library soundtrack to favorite.', 'warning');
      return;
    }
    if (!onSetFavoriteBackgroundSoundtrack) return;
    await onSetFavoriteBackgroundSoundtrack(id);
  };

  const onSelectSoundTrack = (selectedBackgroundSoundtrackValue:string) => {
    stopSoundtrackPreview();
    void stopMixPreview();
    onSelectedBackgroundSoundtrackValueChange(selectedBackgroundSoundtrackValue);
  }
  return (
    <div className="px-6 pb-6 pt-4">
      {/* Background soundtrack */}
      <div className="mb-4 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-br from-emerald-400 to-teal-500 blur-md opacity-30 rounded-xl"></div>
              <div className="relative p-2.5 bg-linear-to-br from-emerald-600 to-teal-600 rounded-xl shadow-lg">
                <Video className="h-5 w-5 text-white" />
              </div>
            </div>

            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900">Background Soundtrack</h4>
              <p className="text-xs text-gray-600 mt-0.5">Select a track, mute, or upload an MP3.</p>

              <div className="mt-3 flex flex-col gap-2">
                <label className="block text-sm font-medium text-gray-700">Background Soundtrack</label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Select
                      value={selectedBackgroundSoundtrackValue}
                      onValueChange={onSelectSoundTrack}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Default</SelectItem>
                        <SelectItem value="__none__">None</SelectItem>
                        {hasOneOffBackgroundSoundtrack ? (
                          <SelectItem value="__oneoff__">Uploaded (one-off)</SelectItem>
                        ) : null}
                        {backgroundSoundtracks.map((t) => (
                          <SelectItem key={t.id} value={`lib:${t.id}`}>
                            <span className="inline-flex items-center gap-2">
                              {t.is_favorite ? (
                                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                              ) : (
                                <Star className="h-4 w-4 fill-gray-500 text-gray-500" />
                              )}
                              <span>{t.title}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50 h-10 shrink-0"
                    onClick={() => void handleSetFavorite()}
                    disabled={!selectedLibrarySoundtrack?.id || !onSetFavoriteBackgroundSoundtrack || Boolean(isSettingFavoriteBackgroundSoundtrack)}
                    aria-label="Set favorite soundtrack"
                    title="Set favorite soundtrack"
                  >
                    <Star
                      className={
                        selectedLibrarySoundtrack?.is_favorite
                          ? 'h-4 w-4 fill-amber-500 text-amber-500'
                          : 'h-4 w-4 text-gray-700'
                      }
                    />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50 h-10 shrink-0 w-32"
                    onClick={() => void handlePreviewSelectedSoundtrack()}
                    disabled={!selectedSoundtrackPreviewSrc && !isSoundtrackPreviewPlaying}
                  >
                    {isSoundtrackPreviewPlaying && previewKind === 'selected' ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Stop Preview
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Preview
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-700 shrink-0">Volume</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.5}
                      value={
                        Number.isFinite(backgroundSoundtrackVolumePercent)
                          ? backgroundSoundtrackVolumePercent
                          : 100
                      }
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        onBackgroundSoundtrackVolumePercentChange(
                          Number.isFinite(next) ? next : 100,
                        );
                      }}
                      className="flex-1 h-2 rounded-lg bg-gray-200 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                      disabled={
                        String(selectedBackgroundSoundtrackValue ?? '').trim() ===
                          '__none__' || soundtrackUploadDisabled
                      }
                      aria-label="Background soundtrack volume"
                    />
                    <span className="text-xs text-gray-600 w-12 text-right">
                      {Math.round(backgroundSoundtrackVolumePercent ?? 100)}%
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-50 h-8 w-8 p-0 shrink-0"
                      onClick={() => {
                        const id = selectedLibrarySoundtrack?.id;
                        if (!id) {
                          onToast?.('Select a library soundtrack to save a default volume.', 'warning');
                          return;
                        }
                        if (!onSaveBackgroundSoundtrackVolume) return;
                        void onSaveBackgroundSoundtrackVolume({
                          soundtrackId: id,
                          volumePercent: backgroundSoundtrackVolumePercent ?? 100,
                        });
                      }}
                      disabled={!canSaveVolume || !onSaveBackgroundSoundtrackVolume || Boolean(isSavingBackgroundSoundtrackVolume) || soundtrackUploadDisabled}
                      aria-label="Save default volume for soundtrack"
                      title="Save default volume for this soundtrack"
                    >
                      {isSavingBackgroundSoundtrackVolume ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <p className="mt-1 text-[11px] text-gray-500">
                    Applies to previews and the final render.
                  </p>
                </div>

                <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800">Mix Preview</p>
                      <p className="text-[11px] text-gray-600">
                        Listen to voice-over + background together (background uses the volume slider).
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className={
                        mixPreviewBlockedReason
                          ? 'border-gray-300 h-9 shrink-0 opacity-60 cursor-not-allowed'
                          : 'border-gray-300 hover:bg-gray-50 h-9 shrink-0'
                      }
                      onClick={() => void handlePreviewMix()}
                      disabled={soundtrackUploadDisabled}
                      aria-disabled={Boolean(mixPreviewBlockedReason)}
                      title={mixPreviewBlockedReason ?? 'Preview voice-over + background together'}
                    >
                      {isMixPreviewPlaying ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Preview
                        </>
                      )}
                    </Button>
                  </div>

                  {mixPreviewBlockedReason ? (
                    <p className="mt-2 text-[11px] text-amber-700">
                      {mixPreviewBlockedReason}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <input
                  ref={soundtrackInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) {
                      setSelectedSoundtrack(null);
                      setSoundtrackError(null);
                      return;
                    }

                    const isAudioMime = String(file.type || '').toLowerCase().startsWith('audio/');
                    if (!isAudioMime) {
                      setSelectedSoundtrack(null);
                      setSoundtrackError('Please choose a valid audio file (mp3 recommended).');
                      if (soundtrackInputRef.current) soundtrackInputRef.current.value = '';
                      return;
                    }

                    setSoundtrackError(null);
                    setSelectedSoundtrack(file);
                  }}
                />

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={soundtrackTitle}
                      onChange={(e) => setSoundtrackTitle(e.target.value)}
                      placeholder="Title (required to add to library)"
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      disabled={soundtrackUploadDisabled}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-50"
                      onClick={handlePickSoundtrack}
                      disabled={soundtrackUploadDisabled}
                    >
                      Choose MP3
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-50"
                      onClick={() => void handlePreviewChosenFile()}
                      disabled={soundtrackUploadDisabled || !selectedSoundtrack}
                    >
                      {isSoundtrackPreviewPlaying && previewKind === 'file' ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Stop File
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Play File
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  className="bg-linear-to-r from-emerald-600 mt-1 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => void handleAddSoundtrackToLibrary()}
                  disabled={soundtrackUploadDisabled || !selectedSoundtrack}
                >
                  {isUploadingBackgroundSoundtrack ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>Add to Library</>
                  )}
                </Button>
                {soundtrackError ? (
                  <p className="text-xs text-red-600">{soundtrackError}</p>
                ) : selectedSoundtrack ? (
                  <p className="text-xs text-gray-600 truncate">
                    Selected: {selectedSoundtrack.name}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload video */}
      <div className="mb-4 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-br from-purple-400 to-blue-500 blur-md opacity-30 rounded-xl"></div>
              <div className="relative p-2.5 bg-linear-to-br from-purple-600 to-blue-600 rounded-xl shadow-lg">
                <Upload className="h-5 w-5 text-white" />
              </div>
            </div>

            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900">Upload a video instead</h4>
              <p className="text-xs text-gray-600 mt-0.5">MP4 recommended. We’ll treat this like a generated video.</p>

              <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                <input
                  ref={inputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) {
                      setSelectedVideo(null);
                      setUploadError(null);
                      return;
                    }

                    const isVideoMime = String(file.type || '').toLowerCase().startsWith('video/');
                    if (!isVideoMime) {
                      setSelectedVideo(null);
                      setUploadError('Please choose a valid video file.');
                      if (inputRef.current) inputRef.current.value = '';
                      return;
                    }

                    if (file.size > MAX_UPLOAD_BYTES) {
                      setSelectedVideo(null);
                      setUploadError(`Video is too large. Max size is ${MAX_UPLOAD_MB} MB.`);
                      if (inputRef.current) inputRef.current.value = '';
                      return;
                    }

                    setUploadError(null);
                    setSelectedVideo(file);
                  }}
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <Video className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-gray-700 truncate">
                      {selectedVideoLabel ?? 'No video selected'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50"
                    onClick={handlePick}
                    disabled={uploadDisabled}
                  >
                    Choose
                  </Button>
                  <Button
                    type="button"
                    className="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={() => void handleUpload()}
                    disabled={uploadDisabled || !selectedVideo}
                  >
                    {isUploadingVideo ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {isJobInProgress ? (
                <p className="mt-2 text-xs text-amber-700">Upload is disabled while a video job is running.</p>
              ) : null}

              {uploadError ? (
                <p className="mt-2 text-xs text-red-600">{uploadError}</p>
              ) : (
                <p className="mt-2 text-xs text-gray-500">Max upload size: {MAX_UPLOAD_MB} MB.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute -inset-1 bg-linear-to-r from-pink-600 via-purple-600 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
        <Button
          onClick={onGenerate}
          disabled={isDisabled}
          className="relative w-full bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
          size="lg"
        >
          {isGenerating || isJobInProgress ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span className="font-semibold">Generating Video...</span>
            </>
          ) : (
            <>
              <Video className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Generate Video</span>
              <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
