'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Loader2,
  Pause,
  Play,
  Save,
  SlidersHorizontal,
  Star,
  Trash2,
  Video,
} from 'lucide-react';

type BackgroundSoundtrackItem = {
  id: string;
  title: string;
  url: string;
  is_favorite?: boolean;
  volume_percent?: number;
};

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface BackgroundSoundtrackSectionProps {
  isGenerating: boolean;
  videoJobStatus: string | null;
  voiceOver: File | null;
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
  onDeleteBackgroundSoundtrack?: (soundtrackId: string) => Promise<void> | void;
  isDeletingBackgroundSoundtrack?: boolean;
  onOpenBackgroundSoundtrackEditor?: (soundtrackId: string) => void;
  onUploadBackgroundSoundtrackUseOnce: (file: File) => Promise<void> | void;
  onUploadBackgroundSoundtrackAddToLibrary: (params: {
    file: File;
    title: string;
  }) => Promise<void> | void;
  isUploadingBackgroundSoundtrack: boolean;
}

export function BackgroundSoundtrackSection(props: BackgroundSoundtrackSectionProps) {
  const {
    isGenerating,
    videoJobStatus,
    voiceOver,
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
    onDeleteBackgroundSoundtrack,
    isDeletingBackgroundSoundtrack,
    onOpenBackgroundSoundtrackEditor,
    onUploadBackgroundSoundtrackAddToLibrary,
    isUploadingBackgroundSoundtrack,
  } = props;

  const [selectedSoundtrack, setSelectedSoundtrack] = useState<File | null>(null);
  const [soundtrackTitle, setSoundtrackTitle] = useState('');
  const [soundtrackError, setSoundtrackError] = useState<string | null>(null);
  const soundtrackInputRef = useRef<HTMLInputElement | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const [previewKind, setPreviewKind] = useState<'selected' | 'file' | null>(null);
  const [isSoundtrackPreviewPlaying, setIsSoundtrackPreviewPlaying] = useState(false);
  const [isSoundtrackPreviewLoading, setIsSoundtrackPreviewLoading] = useState(false);
  const [isSoundtrackDownloadLoading, setIsSoundtrackDownloadLoading] = useState(false);

  const mixAudioContextRef = useRef<AudioContext | null>(null);
  const mixBackgroundGainRef = useRef<GainNode | null>(null);
  const mixBackgroundSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const mixVoiceSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isMixPreviewPlaying, setIsMixPreviewPlaying] = useState(false);
  const [isMixPreviewLoading, setIsMixPreviewLoading] = useState(false);

  const [deleteSoundtrackDialogOpen, setDeleteSoundtrackDialogOpen] = useState(false);
  const [pendingDeleteSoundtrack, setPendingDeleteSoundtrack] =
    useState<BackgroundSoundtrackItem | null>(null);

  const isJobInProgress = !!videoJobStatus && videoJobStatus !== 'completed';
  const soundtrackUploadDisabled =
    isGenerating || isJobInProgress || isUploadingBackgroundSoundtrack;

  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  const normalizedBackgroundVolume = clamp01(
    (backgroundSoundtrackVolumePercent ?? 100) / 100,
  );

  const closeDeleteSoundtrackDialog = () => {
    if (isDeletingBackgroundSoundtrack) return;
    setDeleteSoundtrackDialogOpen(false);
    setPendingDeleteSoundtrack(null);
  };

  const confirmDeleteSoundtrack = async () => {
    const id = pendingDeleteSoundtrack?.id;
    if (!id || !onDeleteBackgroundSoundtrack) return;

    await onDeleteBackgroundSoundtrack(id);
    setDeleteSoundtrackDialogOpen(false);
    setPendingDeleteSoundtrack(null);
  };

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
    setIsSoundtrackPreviewLoading(false);
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
    setIsMixPreviewLoading(false);
  };

  const playSoundtrackPreview = async (src: string, kind: 'selected' | 'file') => {
    setIsSoundtrackPreviewLoading(true);
    setPreviewKind(kind);
    try {
      await stopMixPreview();
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio();
        previewAudioRef.current.addEventListener('ended', () => {
          setIsSoundtrackPreviewPlaying(false);
          setIsSoundtrackPreviewLoading(false);
          setPreviewKind(null);
        });
      }

      previewAudioRef.current.volume = normalizedBackgroundVolume;
      previewAudioRef.current.src = src;
      await previewAudioRef.current.play();
      setIsSoundtrackPreviewPlaying(true);
    } catch {
      onToast?.('Failed to play preview.', 'error');
      setIsSoundtrackPreviewPlaying(false);
      setPreviewKind(null);
    } finally {
      setIsSoundtrackPreviewLoading(false);
    }
  };

  const selectedSoundtrackPreviewSrc = useMemo(() => {
    const value = String(selectedBackgroundSoundtrackValue ?? '').trim();
    if (!value || value === '__default__' || value === '__none__') return null;

    if (value === '__oneoff__') {
      return oneOffBackgroundSoundtrackUrl
        ? String(oneOffBackgroundSoundtrackUrl).trim()
        : null;
    }

    if (value.startsWith('lib:')) {
      const id = value.slice('lib:'.length);
      const found = backgroundSoundtracks.find((soundtrack) => soundtrack.id === id);
      return found?.url ? String(found.url).trim() : null;
    }

    return null;
  }, [
    backgroundSoundtracks,
    oneOffBackgroundSoundtrackUrl,
    selectedBackgroundSoundtrackValue,
  ]);

  const mixPreviewBlockedReason = useMemo(() => {
    if (soundtrackUploadDisabled) return 'Preview is disabled while a job is running.';
    if (isMixPreviewPlaying) return null;
    if (!voiceOver) return 'Add a voice-over first to preview the mix.';
    if (!selectedSoundtrackPreviewSrc && !selectedSoundtrack) {
      return 'Select or choose a background soundtrack to preview.';
    }
    return null;
  }, [
    isMixPreviewPlaying,
    selectedSoundtrack,
    selectedSoundtrackPreviewSrc,
    soundtrackUploadDisabled,
    voiceOver,
  ]);

  const selectedLibrarySoundtrack = useMemo(() => {
    const value = String(selectedBackgroundSoundtrackValue ?? '').trim();
    if (!value.startsWith('lib:')) return null;
    const id = value.slice('lib:'.length);
    return backgroundSoundtracks.find((soundtrack) => soundtrack.id === id) ?? null;
  }, [backgroundSoundtracks, selectedBackgroundSoundtrackValue]);

  const canSaveVolume = Boolean(selectedLibrarySoundtrack?.id);

  useEffect(() => {
    return () => {
      stopSoundtrackPreview();
      void stopMixPreview();
    };
  }, []);

  useEffect(() => {
    if (previewAudioRef.current && isSoundtrackPreviewPlaying) {
      previewAudioRef.current.volume = normalizedBackgroundVolume;
    }

    if (mixBackgroundGainRef.current && isMixPreviewPlaying) {
      mixBackgroundGainRef.current.gain.value = normalizedBackgroundVolume;
    }
  }, [isMixPreviewPlaying, isSoundtrackPreviewPlaying, normalizedBackgroundVolume]);

  const handlePickSoundtrack = () => {
    soundtrackInputRef.current?.click();
  };

  const handleAddSoundtrackToLibrary = async () => {
    if (!selectedSoundtrack) return;
    const title = soundtrackTitle.trim();
    const filename = String(selectedSoundtrack.name ?? '').trim();
    const baseName = filename ? filename.replace(/\.[^/.]+$/, '') : '';
    const fallbackTitle = baseName.trim() || 'Untitled soundtrack';
    const finalTitle = (title || fallbackTitle).slice(0, 255);

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

    if (isSoundtrackPreviewLoading) return;

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

    if (isSoundtrackPreviewLoading) return;

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
    if (ctx.decodeAudioData.length <= 1) {
      return await ctx.decodeAudioData(buffer);
    }
    return await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(buffer, resolve, reject);
    });
  };

  const audioBufferToWav = (audioBuffer: AudioBuffer) => {
    const channelCount = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const frameCount = audioBuffer.length;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = channelCount * bytesPerSample;
    const dataSize = frameCount * blockAlign;
    const wavBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wavBuffer);

    const writeString = (offset: number, value: string) => {
      for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let sampleIndex = 0; sampleIndex < frameCount; sampleIndex += 1) {
      for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
        const sample = audioBuffer.getChannelData(channelIndex)[sampleIndex] ?? 0;
        const clamped = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
        offset += 2;
      }
    }

    return wavBuffer;
  };

  const sanitizeDownloadName = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'soundtrack';

  const downloadBlob = (blob: Blob, fileName: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const handleDownloadSelectedSoundtrack = async () => {
    if (isSoundtrackDownloadLoading) return;

    const soundtrackSrc = String(selectedSoundtrackPreviewSrc ?? '').trim();
    if (!soundtrackSrc) {
      onToast?.('Select a soundtrack to download.', 'warning');
      return;
    }

    if (typeof window === 'undefined') {
      onToast?.('Audio download is only available in the browser.', 'error');
      return;
    }

    const selectedValue = String(selectedBackgroundSoundtrackValue ?? '').trim();
    const soundtrackLabel =
      selectedLibrarySoundtrack?.title?.trim() ||
      (selectedValue === '__oneoff__' ? 'one-off soundtrack' : 'soundtrack');

    const AudioContextCtor = window.AudioContext || (window as Window & typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
    const OfflineAudioContextCtor =
      window.OfflineAudioContext ||
      (window as Window & typeof globalThis & {
        webkitOfflineAudioContext?: typeof OfflineAudioContext;
      }).webkitOfflineAudioContext;

    if (!AudioContextCtor || !OfflineAudioContextCtor) {
      onToast?.('Web Audio is not supported in this browser.', 'error');
      return;
    }

    setIsSoundtrackDownloadLoading(true);
    try {
      const response = await fetch(soundtrackSrc);
      if (!response.ok) {
        throw new Error('Failed to load the current soundtrack.');
      }

      const audioData = await response.arrayBuffer();
      const decodeContext = new AudioContextCtor();

      try {
        const decodedBuffer = await decodeAudio(decodeContext, audioData.slice(0));
        const frameCount = Math.max(1, decodedBuffer.length);
        const channelCount = Math.max(1, decodedBuffer.numberOfChannels);
        const offlineContext = new OfflineAudioContextCtor(
          channelCount,
          frameCount,
          decodedBuffer.sampleRate,
        );

        const sourceNode = offlineContext.createBufferSource();
        sourceNode.buffer = decodedBuffer;

        const gainNode = offlineContext.createGain();
        gainNode.gain.value = normalizedBackgroundVolume;

        sourceNode.connect(gainNode);
        gainNode.connect(offlineContext.destination);
        sourceNode.start(0);

        const renderedBuffer = await offlineContext.startRendering();
        const wavBuffer = audioBufferToWav(renderedBuffer);
        const fileName = `${sanitizeDownloadName(soundtrackLabel)}-${Math.round(
          backgroundSoundtrackVolumePercent ?? 100,
        )}pct.wav`;

        downloadBlob(new Blob([wavBuffer], { type: 'audio/wav' }), fileName);
      } finally {
        await decodeContext.close().catch(() => undefined);
      }
    } catch (error) {
      console.error('Background soundtrack download failed', error);
      onToast?.('Failed to download the current soundtrack.', 'error');
    } finally {
      setIsSoundtrackDownloadLoading(false);
    }
  };

  const handlePreviewMix = async () => {
    if (isMixPreviewPlaying) {
      await stopMixPreview();
      return;
    }

    if (isMixPreviewLoading) return;

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
      setIsMixPreviewLoading(true);
      const audioContextConstructor =
        window.AudioContext ||
        (window as Window & typeof globalThis & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;
      if (!audioContextConstructor) {
        throw new Error('AudioContext is not supported in this browser');
      }
      const ctx = new audioContextConstructor();
      mixAudioContextRef.current = ctx;

      const voiceBufferRaw = await voiceOver.arrayBuffer();
      const voiceAudioBuffer = await decodeAudio(ctx, voiceBufferRaw);

      let bgAudioBuffer: AudioBuffer;
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
    } finally {
      setIsMixPreviewLoading(false);
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

  const handleDeleteSelectedSoundtrack = () => {
    const target = selectedLibrarySoundtrack;
    if (!target?.id) {
      onToast?.('Select a library soundtrack to delete.', 'warning');
      return;
    }
    if (!onDeleteBackgroundSoundtrack) return;

    stopSoundtrackPreview();
    void stopMixPreview();
    setPendingDeleteSoundtrack(target);
    setDeleteSoundtrackDialogOpen(true);
  };

  const handleOpenSelectedSoundtrackEditor = () => {
    const id = String(selectedLibrarySoundtrack?.id ?? '').trim();
    if (!id) {
      onToast?.('Select a library soundtrack to edit.', 'warning');
      return;
    }

    onOpenBackgroundSoundtrackEditor?.(id);
  };

  const handleSelectSoundtrack = (value: string) => {
    stopSoundtrackPreview();
    void stopMixPreview();
    onSelectedBackgroundSoundtrackValueChange(value);
  };

  return (
    <>
      <div className="mb-4 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        <Accordion type="single" collapsible defaultValue="background-soundtrack" className="w-full">
          <AccordionItem value="background-soundtrack" className="border-0">
            <AccordionTrigger className="px-5 py-5 hover:no-underline">
              <div className="flex items-start gap-3 text-left">
                <div className="relative">
                  <div className="absolute inset-0 bg-linear-to-br from-emerald-400 to-teal-500 blur-md opacity-30 rounded-xl"></div>
                  <div className="relative p-2.5 bg-linear-to-br from-emerald-600 to-teal-600 rounded-xl shadow-lg">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                </div>

                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">Background Soundtrack</h4>
                  <p className="text-xs text-gray-600 mt-0.5">Select a track, mute, or upload an MP3.</p>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-5 pb-5">
              <div className="mt-3 flex flex-col gap-2">
                <label className="block text-sm font-medium text-gray-700">Background Soundtrack</label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Select
                      value={selectedBackgroundSoundtrackValue}
                      onValueChange={handleSelectSoundtrack}
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
                        {backgroundSoundtracks.map((soundtrack) => (
                          <SelectItem key={soundtrack.id} value={`lib:${soundtrack.id}`}>
                            <span className="inline-flex items-center gap-2 min-w-0">
                              {soundtrack.is_favorite ? (
                                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                              ) : (
                                <Star className="h-4 w-4 fill-gray-500 text-gray-500" />
                              )}
                              <span className="truncate">{soundtrack.title}</span>
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
                    disabled={
                      !selectedLibrarySoundtrack?.id ||
                      !onSetFavoriteBackgroundSoundtrack ||
                      Boolean(isSettingFavoriteBackgroundSoundtrack)
                    }
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
                    className="border-gray-300 hover:bg-gray-50 h-10 shrink-0"
                    onClick={handleDeleteSelectedSoundtrack}
                    disabled={
                      !selectedLibrarySoundtrack?.id ||
                      !onDeleteBackgroundSoundtrack ||
                      Boolean(isDeletingBackgroundSoundtrack)
                    }
                    aria-label="Delete soundtrack"
                    title="Delete soundtrack"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50 h-10 shrink-0"
                    onClick={handleOpenSelectedSoundtrackEditor}
                    disabled={
                      !selectedLibrarySoundtrack?.id ||
                      !onOpenBackgroundSoundtrackEditor ||
                      soundtrackUploadDisabled
                    }
                    aria-label="Edit soundtrack"
                    title="Edit soundtrack"
                  >
                    <SlidersHorizontal className="h-4 w-4 text-gray-700" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50 h-10 shrink-0"
                    onClick={() => void handlePreviewSelectedSoundtrack()}
                    disabled={
                      isSoundtrackPreviewLoading ||
                      (!selectedSoundtrackPreviewSrc && !isSoundtrackPreviewPlaying)
                    }
                  >
                    {isSoundtrackPreviewLoading && previewKind !== 'file' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isSoundtrackPreviewPlaying && previewKind === 'selected' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50 h-10 shrink-0"
                    onClick={() => void handleDownloadSelectedSoundtrack()}
                    disabled={
                      isSoundtrackDownloadLoading ||
                      !selectedSoundtrackPreviewSrc
                    }
                    aria-label="Download soundtrack with current volume"
                    title="Download soundtrack with current volume"
                  >
                    {isSoundtrackDownloadLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
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
                        String(selectedBackgroundSoundtrackValue ?? '').trim() === '__none__' ||
                        soundtrackUploadDisabled
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
                          onToast?.(
                            'Select a library soundtrack to save a default volume.',
                            'warning',
                          );
                          return;
                        }
                        if (!onSaveBackgroundSoundtrackVolume) return;
                        void onSaveBackgroundSoundtrackVolume({
                          soundtrackId: id,
                          volumePercent: backgroundSoundtrackVolumePercent ?? 100,
                        });
                      }}
                      disabled={
                        !canSaveVolume ||
                        !onSaveBackgroundSoundtrackVolume ||
                        Boolean(isSavingBackgroundSoundtrackVolume) ||
                        soundtrackUploadDisabled
                      }
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
                      disabled={soundtrackUploadDisabled || isMixPreviewLoading}
                      aria-disabled={Boolean(mixPreviewBlockedReason)}
                      title={mixPreviewBlockedReason ?? 'Preview voice-over + background together'}
                    >
                      {isMixPreviewLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : isMixPreviewPlaying ? (
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
                    <p className="mt-2 text-[11px] text-amber-700">{mixPreviewBlockedReason}</p>
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

                    const isAudioMime = String(file.type || '')
                      .toLowerCase()
                      .startsWith('audio/');
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
                      placeholder="Title (optional)"
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
                      disabled={
                        soundtrackUploadDisabled ||
                        !selectedSoundtrack ||
                        isSoundtrackPreviewLoading
                      }
                    >
                      {isSoundtrackPreviewLoading && previewKind === 'file' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : isSoundtrackPreviewPlaying && previewKind === 'file' ? (
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {onDeleteBackgroundSoundtrack ? (
        <AlertDialog
          isOpen={deleteSoundtrackDialogOpen}
          onClose={closeDeleteSoundtrackDialog}
          onCancel={closeDeleteSoundtrackDialog}
          onConfirm={() => void confirmDeleteSoundtrack()}
          title="Delete soundtrack?"
          description={`This will permanently delete “${pendingDeleteSoundtrack?.title ?? ''}” from your library.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          isLoading={Boolean(isDeletingBackgroundSoundtrack)}
        />
      ) : null}
    </>
  );
}