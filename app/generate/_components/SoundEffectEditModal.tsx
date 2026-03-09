'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Loader2,
  Music2,
  Pause,
  Play,
  Repeat,
  Scissors,
  Save,
  SlidersHorizontal,
  Sparkles,
  Wand2,
  Waves,
  X,
} from 'lucide-react';
import {
  DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS,
  cloneSoundEffectAudioSettings,
  normalizeSoundEffectAudioSettings,
  type SoundEffectAudioSettings,
} from '../_types/sound-effect-audio';

export type SoundEffectEditValues = {
  name: string;
  volumePercent: number;
  audioSettings: SoundEffectAudioSettings;
};

type SoundEffectEditModalProps = {
  isOpen: boolean;
  title?: string;
  audioUrl?: string | null;
  initialName: string;
  initialVolumePercent: number;
  initialAudioSettings?: SoundEffectAudioSettings | null;
  isSaving?: boolean;
  isApplying?: boolean;
  isSavingAsPreset?: boolean;
  canApply?: boolean;
  onClose: () => void;
  onApply?: (values: SoundEffectEditValues) => void | Promise<void>;
  onSave: (values: SoundEffectEditValues) => void | Promise<void>;
  onSaveAsPreset?: (values: SoundEffectEditValues) => void | Promise<void>;
};

type RangeFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  displayValue?: string;
  disabled?: boolean;
  onChange: (next: number) => void;
};

const clampVolume = (raw: unknown) => {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 100;
  return Math.max(0, Math.min(300, value));
};

const clampDuration = (raw: unknown, fallback = 0) => {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(600, value));
};

const roundDuration = (value: number) => Math.round(value * 100) / 100;
const MIN_TRIM_GAP_SECONDS = 0.05;
const WAVEFORM_BAR_COUNT = 72;

const formatSeconds = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return 'Unknown';
  return `${roundDuration(value).toFixed(value >= 10 ? 1 : 2)} s`;
};

const createDistortionCurve = (drive: number) => {
  const amount = Math.max(1, Math.min(10, drive)) * 60;
  const sampleCount = 44100;
  const curve = new Float32Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    const x = (index * 2) / sampleCount - 1;
    curve[index] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
  }

  return curve;
};

const buildImpulseResponse = (audioContext: AudioContext, duration: number, decay: number) => {
  const safeDuration = Math.max(0.1, Math.min(8, duration));
  const safeDecay = Math.max(0.1, Math.min(8, decay));
  const length = Math.max(1, Math.floor(audioContext.sampleRate * safeDuration));
  const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const samples = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const progress = 1 - index / length;
      samples[index] = (Math.random() * 2 - 1) * Math.pow(progress, safeDecay);
    }
  }

  return impulse;
};

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  displayValue,
  disabled,
  onChange,
}: RangeFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-300">{label}</p>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
          {displayValue ?? `${Number.isInteger(value) ? value : value.toFixed(step >= 1 ? 0 : 2)}${suffix ?? ''}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-indigo-600"
        disabled={disabled}
      />
    </div>
  );
}

export function SoundEffectEditModal({
  isOpen,
  title,
  audioUrl,
  initialName,
  initialVolumePercent,
  initialAudioSettings,
  isSaving,
  isApplying,
  isSavingAsPreset,
  canApply = true,
  onClose,
  onApply,
  onSave,
  onSaveAsPreset,
}: SoundEffectEditModalProps) {
  const [name, setName] = useState('');
  const [volumePercent, setVolumePercent] = useState(100);
  const [audioSettings, setAudioSettings] = useState<SoundEffectAudioSettings>(
    cloneSoundEffectAudioSettings(DEFAULT_SOUND_EFFECT_AUDIO_SETTINGS),
  );
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [isPreviewLoopEnabled, setIsPreviewLoopEnabled] = useState(false);
  const [audioDurationSeconds, setAudioDurationSeconds] = useState<number | null>(null);
  const [waveformSamples, setWaveformSamples] = useState<number[]>([]);
  const editSessionKeyRef = useRef<string | null>(null);
  const previewLoopEnabledRef = useRef(false);
  const previewStartRef = useRef(0);
  const previewEndRef = useRef<number | null>(null);
  const trimWaveformRef = useRef<HTMLDivElement | null>(null);
  const trimDragModeRef = useRef<'start' | 'end' | null>(null);
  const playheadAnimationFrameRef = useRef<number | null>(null);
  const playheadIndicatorRef = useRef<HTMLDivElement | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lowFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const highFilterRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const saturationRef = useRef<WaveShaperNode | null>(null);
  const saturationWetGainRef = useRef<GainNode | null>(null);
  const delayRef = useRef<DelayNode | null>(null);
  const delayFeedbackGainRef = useRef<GainNode | null>(null);
  const echoWetGainRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const reverbWetGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const resolveTrimWindow = (settings: SoundEffectAudioSettings, sourceDuration = audioDurationSeconds) => {
    const hasSourceDuration = Number.isFinite(sourceDuration) && (sourceDuration ?? 0) > 0;
    const safeSourceDuration = hasSourceDuration ? Number(sourceDuration) : null;
    const maxStart = safeSourceDuration === null ? 600 : Math.max(0, safeSourceDuration - MIN_TRIM_GAP_SECONDS);
    const startSeconds = Math.min(clampDuration(settings.trim.startSeconds), maxStart);
    const requestedDuration = clampDuration(settings.trim.durationSeconds);
    const remainingDuration = safeSourceDuration === null ? null : Math.max(MIN_TRIM_GAP_SECONDS, safeSourceDuration - startSeconds);

    if (requestedDuration <= 0) {
      return {
        startSeconds,
        endSeconds: remainingDuration === null ? null : startSeconds + remainingDuration,
        effectiveDurationSeconds: remainingDuration,
      };
    }

    const effectiveDurationSeconds =
      remainingDuration === null ? requestedDuration : Math.min(requestedDuration, remainingDuration);

    return {
      startSeconds,
      endSeconds: startSeconds + effectiveDurationSeconds,
      effectiveDurationSeconds,
    };
  };

  const syncAudioTrimWindow = (settings: SoundEffectAudioSettings, sourceDuration = audioDurationSeconds) => {
    const nextWindow = resolveTrimWindow(settings, sourceDuration);
    previewStartRef.current = nextWindow.startSeconds;
    previewEndRef.current = nextWindow.endSeconds;

    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = false;

    if (audio.currentTime < nextWindow.startSeconds) {
      audio.currentTime = nextWindow.startSeconds;
      updatePlayheadIndicator(nextWindow.startSeconds);
      return;
    }

    if (nextWindow.endSeconds !== null && audio.currentTime > nextWindow.endSeconds) {
      audio.currentTime = nextWindow.startSeconds;
      updatePlayheadIndicator(nextWindow.startSeconds);
    }
  };

  const updatePlayheadIndicator = (currentTimeSeconds: number | null) => {
    const indicator = playheadIndicatorRef.current;
    if (!indicator || !audioDurationSeconds || audioDurationSeconds <= 0 || currentTimeSeconds === null) {
      if (indicator) {
        indicator.style.opacity = '0';
      }
      return;
    }

    const percent = Math.max(0, Math.min(100, (currentTimeSeconds / audioDurationSeconds) * 100));
    indicator.style.left = `${percent}%`;
    indicator.style.opacity = '1';
  };

  const stopPlayheadAnimation = () => {
    if (typeof window === 'undefined') return;
    if (playheadAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(playheadAnimationFrameRef.current);
      playheadAnimationFrameRef.current = null;
    }
  };

  const startPlayheadAnimation = () => {
    if (typeof window === 'undefined') return;

    stopPlayheadAnimation();

    const updatePlayhead = () => {
      const audio = audioRef.current;
      if (!audio) {
        updatePlayheadIndicator(null);
        playheadAnimationFrameRef.current = null;
        return;
      }

      updatePlayheadIndicator(audio.currentTime);

      if (!audio.paused && !audio.ended) {
        playheadAnimationFrameRef.current = window.requestAnimationFrame(updatePlayhead);
        return;
      }

      playheadAnimationFrameRef.current = null;
    };

    playheadAnimationFrameRef.current = window.requestAnimationFrame(updatePlayhead);
  };

  const updateTrimFromRatio = (mode: 'start' | 'end', ratio: number) => {
    if (!audioDurationSeconds || audioDurationSeconds <= 0) return;

    const boundedRatio = Math.max(0, Math.min(1, ratio));
    const pointerSeconds = boundedRatio * audioDurationSeconds;

    setAudioSettings((prev) => {
      const normalizedSettings = normalizeSoundEffectAudioSettings(prev);
      const currentWindow = resolveTrimWindow(normalizedSettings, audioDurationSeconds);

      if (mode === 'start') {
        const currentEndSeconds = currentWindow.endSeconds ?? audioDurationSeconds;
        const nextStartSeconds = Math.min(
          Math.max(0, pointerSeconds),
          Math.max(0, currentEndSeconds - MIN_TRIM_GAP_SECONDS),
        );
        const nextDurationSeconds = normalizedSettings.trim.durationSeconds <= 0
          ? 0
          : Math.max(MIN_TRIM_GAP_SECONDS, currentEndSeconds - nextStartSeconds);

        return {
          ...prev,
          trim: {
            startSeconds: roundDuration(nextStartSeconds),
            durationSeconds: normalizedSettings.trim.durationSeconds <= 0
              ? 0
              : roundDuration(nextDurationSeconds),
          },
        };
      }

      const nextEndSeconds = Math.max(
        currentWindow.startSeconds + MIN_TRIM_GAP_SECONDS,
        Math.min(pointerSeconds, audioDurationSeconds),
      );
      const reachesSourceEnd = nextEndSeconds >= audioDurationSeconds - MIN_TRIM_GAP_SECONDS;

      return {
        ...prev,
        trim: {
          startSeconds: roundDuration(currentWindow.startSeconds),
          durationSeconds: reachesSourceEnd
            ? 0
            : roundDuration(nextEndSeconds - currentWindow.startSeconds),
        },
      };
    });
  };

  const handleWaveformPointerMove = (event: PointerEvent) => {
    const mode = trimDragModeRef.current;
    const container = trimWaveformRef.current;
    if (!mode || !container) return;

    const bounds = container.getBoundingClientRect();
    if (!bounds.width) return;

    updateTrimFromRatio(mode, (event.clientX - bounds.left) / bounds.width);
  };

  const handleWaveformPointerUp = () => {
    trimDragModeRef.current = null;
    window.removeEventListener('pointermove', handleWaveformPointerMove);
    window.removeEventListener('pointerup', handleWaveformPointerUp);
  };

  const startTrimHandleDrag = (mode: 'start' | 'end') => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isBusy) return;
    trimDragModeRef.current = mode;
    window.addEventListener('pointermove', handleWaveformPointerMove);
    window.addEventListener('pointerup', handleWaveformPointerUp, { once: true });
    const container = trimWaveformRef.current;
    if (container) {
      const bounds = container.getBoundingClientRect();
      if (bounds.width) {
        updateTrimFromRatio(mode, (event.clientX - bounds.left) / bounds.width);
      }
    }
  };

  const stopPreview = () => {
    const audio = audioRef.current;
    if (!audio) {
      setPreviewStatus('idle');
      updatePlayheadIndicator(null);
      return;
    }

    try {
      audio.pause();
      audio.currentTime = previewStartRef.current;
      updatePlayheadIndicator(previewStartRef.current);
    } catch {
      // ignore preview shutdown errors
    }

    stopPlayheadAnimation();
    setPreviewStatus('idle');
  };

  const teardownAudio = async () => {
    stopPlayheadAnimation();
    stopPreview();

    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.src = '';
    }
    audioRef.current = null;

    try {
      sourceNodeRef.current?.disconnect();
      lowFilterRef.current?.disconnect();
      midFilterRef.current?.disconnect();
      highFilterRef.current?.disconnect();
      compressorRef.current?.disconnect();
      dryGainRef.current?.disconnect();
      saturationRef.current?.disconnect();
      saturationWetGainRef.current?.disconnect();
      delayRef.current?.disconnect();
      delayFeedbackGainRef.current?.disconnect();
      echoWetGainRef.current?.disconnect();
      convolverRef.current?.disconnect();
      reverbWetGainRef.current?.disconnect();
      masterGainRef.current?.disconnect();
    } catch {
      // ignore disconnect failures
    }

    sourceNodeRef.current = null;
    lowFilterRef.current = null;
    midFilterRef.current = null;
    highFilterRef.current = null;
    compressorRef.current = null;
    dryGainRef.current = null;
    saturationRef.current = null;
    saturationWetGainRef.current = null;
    delayRef.current = null;
    delayFeedbackGainRef.current = null;
    echoWetGainRef.current = null;
    convolverRef.current = null;
    reverbWetGainRef.current = null;
    masterGainRef.current = null;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close().catch(() => undefined);
    }
  };

  const currentValues = (): SoundEffectEditValues => ({
    name: String(name ?? '').trim(),
    volumePercent: clampVolume(volumePercent),
    audioSettings: normalizeSoundEffectAudioSettings(audioSettings),
  });

  const applyAudioSettingsToNodes = (nextSettings: SoundEffectAudioSettings, nextVolumePercent: number) => {
    if (lowFilterRef.current) {
      lowFilterRef.current.frequency.value = nextSettings.eq.lowFrequencyHz;
      lowFilterRef.current.gain.value = nextSettings.eq.lowGainDb;
    }
    if (midFilterRef.current) {
      midFilterRef.current.frequency.value = nextSettings.eq.midFrequencyHz;
      midFilterRef.current.gain.value = nextSettings.eq.midGainDb;
      midFilterRef.current.Q.value = nextSettings.eq.midQ;
    }
    if (highFilterRef.current) {
      highFilterRef.current.frequency.value = nextSettings.eq.highFrequencyHz;
      highFilterRef.current.gain.value = nextSettings.eq.highGainDb;
    }
    if (compressorRef.current) {
      compressorRef.current.threshold.value = nextSettings.compressor.threshold;
      compressorRef.current.ratio.value = nextSettings.compressor.ratio;
      compressorRef.current.attack.value = nextSettings.compressor.attack;
      compressorRef.current.release.value = nextSettings.compressor.release;
      compressorRef.current.knee.value = nextSettings.compressor.knee;
    }
    if (saturationRef.current) {
      saturationRef.current.curve = createDistortionCurve(nextSettings.saturation.drive);
      saturationRef.current.oversample = '4x';
    }
    if (saturationWetGainRef.current) {
      saturationWetGainRef.current.gain.value = nextSettings.saturation.enabled
        ? nextSettings.saturation.mix
        : 0;
    }
    if (delayRef.current) {
      delayRef.current.delayTime.value = nextSettings.echo.delayMs / 1000;
    }
    if (delayFeedbackGainRef.current) {
      delayFeedbackGainRef.current.gain.value = nextSettings.echo.enabled
        ? nextSettings.echo.feedback
        : 0;
    }
    if (echoWetGainRef.current) {
      echoWetGainRef.current.gain.value = nextSettings.echo.enabled ? nextSettings.echo.mix : 0;
    }
    if (convolverRef.current && audioContextRef.current) {
      convolverRef.current.buffer = nextSettings.reverb.enabled
        ? buildImpulseResponse(audioContextRef.current, nextSettings.reverb.duration, nextSettings.reverb.decay)
        : null;
    }
    if (reverbWetGainRef.current) {
      reverbWetGainRef.current.gain.value = nextSettings.reverb.enabled ? nextSettings.reverb.mix : 0;
    }
    if (dryGainRef.current) {
      dryGainRef.current.gain.value = 1;
    }
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = clampVolume(nextVolumePercent) / 100;
    }
  };

  const handleClose = () => {
    editSessionKeyRef.current = null;
    setAudioDurationSeconds(null);
    updatePlayheadIndicator(null);
    void teardownAudio();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const normalizedInitialAudioSettings = cloneSoundEffectAudioSettings(initialAudioSettings);
    const nextSessionKey = JSON.stringify({
      audioUrl: String(audioUrl ?? '').trim(),
      initialName: String(initialName ?? '').trim(),
      initialVolumePercent: clampVolume(initialVolumePercent),
      initialAudioSettings: normalizedInitialAudioSettings,
    });

    if (editSessionKeyRef.current === nextSessionKey) return;

    editSessionKeyRef.current = nextSessionKey;
    setName(String(initialName ?? '').trim());
    setVolumePercent(clampVolume(initialVolumePercent));
    setAudioSettings(normalizedInitialAudioSettings);
    setAudioDurationSeconds(null);
    setWaveformSamples([]);
    setIsPreviewLoopEnabled(false);
    updatePlayheadIndicator(null);
  }, [isOpen, audioUrl, initialName, initialVolumePercent, initialAudioSettings]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const url = String(audioUrl ?? '').trim();
    if (!url) {
      setWaveformSamples([]);
      return;
    }

    let cancelled = false;

    const loadWaveform = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load audio waveform');
        const buffer = await response.arrayBuffer();

        const AudioContextCtor = window.AudioContext || (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

        if (!AudioContextCtor) {
          setWaveformSamples([]);
          return;
        }

        const decodeContext = new AudioContextCtor();
        try {
          const decodedBuffer = await decodeContext.decodeAudioData(buffer.slice(0));
          if (cancelled) return;

          const channelData = decodedBuffer.getChannelData(0);
          const bucketSize = Math.max(1, Math.floor(channelData.length / WAVEFORM_BAR_COUNT));
          const nextSamples = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => {
            const start = index * bucketSize;
            const end = Math.min(channelData.length, start + bucketSize);
            let peak = 0;
            for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
              peak = Math.max(peak, Math.abs(channelData[sampleIndex] ?? 0));
            }
            return peak;
          });
          const maxPeak = Math.max(...nextSamples, 0.001);
          setWaveformSamples(nextSamples.map((sample) => Math.max(0.08, sample / maxPeak)));
        } finally {
          await decodeContext.close().catch(() => undefined);
        }
      } catch {
        if (!cancelled) {
          setWaveformSamples([]);
        }
      }
    };

    void loadWaveform();

    return () => {
      cancelled = true;
    };
  }, [isOpen, audioUrl]);

  useEffect(() => {
    return () => {
      stopPlayheadAnimation();
      window.removeEventListener('pointermove', handleWaveformPointerMove);
      window.removeEventListener('pointerup', handleWaveformPointerUp);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const url = String(audioUrl ?? '').trim();
    if (!url || typeof window === 'undefined') {
      void teardownAudio();
      return;
    }

    let cancelled = false;

    const setup = async () => {
      await teardownAudio();
      if (cancelled) return;

      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.onloadedmetadata = () => {
        const nextDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null;
        setAudioDurationSeconds(nextDuration);
        syncAudioTrimWindow(normalizeSoundEffectAudioSettings(audioSettings), nextDuration);
        updatePlayheadIndicator(previewStartRef.current);
      };
      audio.ontimeupdate = () => {
        updatePlayheadIndicator(audio.currentTime);
        const endSeconds = previewEndRef.current;
        if (endSeconds === null || audio.currentTime < endSeconds - 0.02) return;

        if (previewLoopEnabledRef.current) {
          audio.currentTime = previewStartRef.current;
          updatePlayheadIndicator(previewStartRef.current);
          const replay = audio.play();
          if (replay && typeof (replay as Promise<void>).catch === 'function') {
            void (replay as Promise<void>).catch(() => setPreviewStatus('idle'));
          }
          return;
        }

        stopPreview();
      };
      audio.onended = () => {
        if (previewLoopEnabledRef.current) {
          audio.currentTime = previewStartRef.current;
          updatePlayheadIndicator(previewStartRef.current);
          const replay = audio.play();
          if (replay && typeof (replay as Promise<void>).catch === 'function') {
            void (replay as Promise<void>).catch(() => setPreviewStatus('idle'));
          }
          return;
        }
        stopPlayheadAnimation();
        setPreviewStatus('idle');
      };
      audio.onerror = () => {
        stopPlayheadAnimation();
        updatePlayheadIndicator(null);
        setPreviewStatus('idle');
      };

      const AudioContextCtor = window.AudioContext || (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

      if (!AudioContextCtor) {
        audioRef.current = audio;
        return;
      }

      const context = new AudioContextCtor();
      const sourceNode = context.createMediaElementSource(audio);
      const lowFilter = context.createBiquadFilter();
      const midFilter = context.createBiquadFilter();
      const highFilter = context.createBiquadFilter();
      const compressor = context.createDynamicsCompressor();
      const dryGain = context.createGain();
      const saturation = context.createWaveShaper();
      const saturationWetGain = context.createGain();
      const delay = context.createDelay(2.5);
      const delayFeedbackGain = context.createGain();
      const echoWetGain = context.createGain();
      const convolver = context.createConvolver();
      const reverbWetGain = context.createGain();
      const masterGain = context.createGain();

      lowFilter.type = 'lowshelf';
      midFilter.type = 'peaking';
      highFilter.type = 'highshelf';

      sourceNode.connect(lowFilter);
      lowFilter.connect(midFilter);
      midFilter.connect(highFilter);
      highFilter.connect(compressor);

      compressor.connect(dryGain);
      dryGain.connect(masterGain);

      compressor.connect(saturation);
      saturation.connect(saturationWetGain);
      saturationWetGain.connect(masterGain);

      compressor.connect(delay);
      delay.connect(delayFeedbackGain);
      delayFeedbackGain.connect(delay);
      delay.connect(echoWetGain);
      echoWetGain.connect(masterGain);

      compressor.connect(convolver);
      convolver.connect(reverbWetGain);
      reverbWetGain.connect(masterGain);

      masterGain.connect(context.destination);

      audioRef.current = audio;
      audioContextRef.current = context;
      sourceNodeRef.current = sourceNode;
      lowFilterRef.current = lowFilter;
      midFilterRef.current = midFilter;
      highFilterRef.current = highFilter;
      compressorRef.current = compressor;
      dryGainRef.current = dryGain;
      saturationRef.current = saturation;
      saturationWetGainRef.current = saturationWetGain;
      delayRef.current = delay;
      delayFeedbackGainRef.current = delayFeedbackGain;
      echoWetGainRef.current = echoWetGain;
      convolverRef.current = convolver;
      reverbWetGainRef.current = reverbWetGain;
      masterGainRef.current = masterGain;

      syncAudioTrimWindow(normalizeSoundEffectAudioSettings(audioSettings));
    };

    void setup();

    return () => {
      cancelled = true;
      void teardownAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, audioUrl]);

  useEffect(() => {
    const settings = normalizeSoundEffectAudioSettings(audioSettings);
    applyAudioSettingsToNodes(settings, volumePercent);
    syncAudioTrimWindow(settings);
  }, [audioSettings, volumePercent]);

  useEffect(() => {
    previewLoopEnabledRef.current = isPreviewLoopEnabled;
    if (!audioRef.current) return;
    audioRef.current.loop = false;
  }, [isPreviewLoopEnabled]);

  useEffect(() => {
    if (previewStatus !== 'playing') {
      stopPlayheadAnimation();
      return;
    }

    startPlayheadAnimation();

    return () => {
      stopPlayheadAnimation();
    };
  }, [previewStatus]);

  const resolvedTitle = useMemo(() => {
    const value = String(title ?? '').trim();
    return value || 'Advanced sound effect editor';
  }, [title]);

  const resolvedTrimWindow = useMemo(
    () => resolveTrimWindow(normalizeSoundEffectAudioSettings(audioSettings)),
    [audioSettings, audioDurationSeconds],
  );
  const trimStartMax = audioDurationSeconds === null ? 30 : Math.max(0, roundDuration(audioDurationSeconds - MIN_TRIM_GAP_SECONDS));
  const trimDurationMax = audioDurationSeconds === null
    ? 30
    : Math.max(MIN_TRIM_GAP_SECONDS, roundDuration(audioDurationSeconds - resolvedTrimWindow.startSeconds));
  const trimDurationDisplay =
    audioSettings.trim.durationSeconds <= 0
      ? audioDurationSeconds === null
        ? 'Full'
        : `Full (${formatSeconds(resolvedTrimWindow.effectiveDurationSeconds)})`
      : formatSeconds(resolvedTrimWindow.effectiveDurationSeconds);
  const trimSelectionStartPercent = audioDurationSeconds && audioDurationSeconds > 0
    ? (resolvedTrimWindow.startSeconds / audioDurationSeconds) * 100
    : 0;
  const trimSelectionEndPercent = audioDurationSeconds && audioDurationSeconds > 0
    ? ((resolvedTrimWindow.endSeconds ?? audioDurationSeconds) / audioDurationSeconds) * 100
    : 100;
  const hasWaveform = waveformSamples.length > 0 && Boolean(audioDurationSeconds && audioDurationSeconds > 0);

  const isBusy = Boolean(isSaving || isApplying || isSavingAsPreset);
  const canSubmit = Boolean(String(name ?? '').trim());

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={resolvedTitle}
    >
      <div
        className="flex h-[90vh] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Realtime audio chain</p>
              <h3 className="mt-2 text-2xl font-semibold">{resolvedTitle}</h3>
              <p className="mt-1 text-sm text-slate-300">
                Tune EQ, compression, reverb, echo, saturation, and volume in realtime before you save or apply.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-white/15 bg-white/10 p-3 text-white transition hover:bg-white/15"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex h-full col-span-2 flex-col rounded-[1.75rem] border border-white/10 bg-black/30 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Current sound</p>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-3 h-11 border-white/15 bg-white/10 text-white placeholder:text-slate-400"
                    placeholder="Preset title"
                    disabled={isBusy}
                  />
                </div>
                <div className="flex items-center gap-2 self-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className={`h-11 w-11 border-white/15 bg-white/5 text-white hover:bg-white/10 ${
                      isPreviewLoopEnabled ? 'ring-2 ring-cyan-300/70 ring-offset-0' : ''
                    }`}
                    disabled={!audioRef.current || isBusy}
                    onClick={() => {
                      setIsPreviewLoopEnabled((current) => {
                        const next = !current;
                        if (audioRef.current) {
                          audioRef.current.loop = next;
                        }
                        return next;
                      });
                    }}
                    aria-pressed={isPreviewLoopEnabled}
                    aria-label={isPreviewLoopEnabled ? 'Disable preview loop' : 'Enable preview loop'}
                    title={isPreviewLoopEnabled ? 'Disable preview loop' : 'Enable preview loop'}
                  >
                    <Repeat className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-11 w-11 border-white/15 bg-white/5 text-white hover:bg-white/10"
                    disabled={!audioRef.current || isBusy}
                    onClick={async () => {
                      const audio = audioRef.current;
                      const audioContext = audioContextRef.current;
                      if (!audio) return;

                      if (previewStatus === 'playing' || previewStatus === 'loading') {
                        stopPreview();
                        return;
                      }

                      setPreviewStatus('loading');
                      try {
                        syncAudioTrimWindow(normalizeSoundEffectAudioSettings(audioSettings));
                        if (audioContext?.state === 'suspended') {
                          await audioContext.resume();
                        }
                        applyAudioSettingsToNodes(
                          normalizeSoundEffectAudioSettings(audioSettings),
                          volumePercent,
                        );
                        audio.currentTime = previewStartRef.current;
                        updatePlayheadIndicator(previewStartRef.current);
                        const promise = audio.play();
                        if (!promise || typeof (promise as Promise<void>).then !== 'function') {
                          setPreviewStatus('playing');
                          return;
                        }
                        await promise;
                        setPreviewStatus('playing');
                      } catch {
                        setPreviewStatus('idle');
                      }
                    }}
                  >
                    {previewStatus === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : previewStatus === 'playing' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    
                  </Button>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-4">
                <Accordion type="single" collapsible className="w-full rounded-2xl border border-white/10 bg-white/5 px-4">
                  <AccordionItem value="trim" className="border-none">
                    <AccordionTrigger className="py-4 text-left text-white hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-400/15 text-rose-200">
                          <Scissors className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white capitalize">Trim & waveform selection</p>
                          <p className="text-xs text-slate-300">
                            {formatSeconds(resolvedTrimWindow.startSeconds)} to {resolvedTrimWindow.endSeconds === null ? 'End' : formatSeconds(resolvedTrimWindow.endSeconds)}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
                          <p>Source duration: <span className="font-semibold text-white">{formatSeconds(audioDurationSeconds)}</span></p>
                          <p>Current cut: <span className="font-semibold text-white">{formatSeconds(resolvedTrimWindow.startSeconds)} to {resolvedTrimWindow.endSeconds === null ? 'End' : formatSeconds(resolvedTrimWindow.endSeconds)}</span></p>
                        </div>

                        <div
                          ref={trimWaveformRef}
                          className="relative h-36 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-4"
                          onClick={(event) => {
                            if (isBusy) return;
                            if (!audioDurationSeconds || audioDurationSeconds <= 0) return;
                            const bounds = event.currentTarget.getBoundingClientRect();
                            if (!bounds.width) return;
                            const ratio = (event.clientX - bounds.left) / bounds.width;
                            const currentEnd = resolvedTrimWindow.endSeconds ?? audioDurationSeconds;
                            const startDistance = Math.abs(ratio * audioDurationSeconds - resolvedTrimWindow.startSeconds);
                            const endDistance = Math.abs(ratio * audioDurationSeconds - currentEnd);
                            updateTrimFromRatio(startDistance <= endDistance ? 'start' : 'end', ratio);
                          }}
                        >
                          {hasWaveform ? (
                            <>
                              <div className="absolute inset-y-4 left-0 bg-slate-950/65" style={{ width: `${trimSelectionStartPercent}%` }} />
                              <div className="absolute inset-y-4 right-0 bg-slate-950/65" style={{ width: `${100 - trimSelectionEndPercent}%` }} />
                              <div
                                className="absolute inset-y-4 rounded-xl border border-cyan-300/70 bg-cyan-400/10"
                                style={{
                                  left: `${trimSelectionStartPercent}%`,
                                  width: `${Math.max(1, trimSelectionEndPercent - trimSelectionStartPercent)}%`,
                                }}
                              />
                              <div
                                ref={playheadIndicatorRef}
                                className="pointer-events-none absolute inset-y-3 z-20 w-0 opacity-0"
                                style={{ left: `${trimSelectionStartPercent}%` }}
                              >
                                <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.75)]" />
                                <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full border border-amber-100 bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.55)]" />
                              </div>
                              <div className="relative flex h-full items-end gap-1">
                                {waveformSamples.map((sample, index) => {
                                  const barTime = audioDurationSeconds
                                    ? (index / Math.max(1, waveformSamples.length - 1)) * audioDurationSeconds
                                    : 0;
                                  const isInsideSelection =
                                    barTime >= resolvedTrimWindow.startSeconds &&
                                    barTime <= (resolvedTrimWindow.endSeconds ?? Number.POSITIVE_INFINITY);

                                  return (
                                    <div
                                      key={`${index}-${sample}`}
                                      className={`flex-1 rounded-full transition-colors ${isInsideSelection ? 'bg-cyan-300/95' : 'bg-white/25'}`}
                                      style={{ height: `${Math.max(12, sample * 100)}%` }}
                                    />
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                className="absolute inset-y-3 z-10 w-4 -translate-x-1/2 rounded-full border border-cyan-200 bg-cyan-300/90 shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
                                style={{ left: `${trimSelectionStartPercent}%` }}
                                onPointerDown={startTrimHandleDrag('start')}
                                onClick={(event) => event.stopPropagation()}
                                disabled={isBusy}
                                aria-label="Adjust trim start"
                              />
                              <button
                                type="button"
                                className="absolute inset-y-3 z-10 w-4 -translate-x-1/2 rounded-full border border-cyan-200 bg-cyan-300/90 shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
                                style={{ left: `${trimSelectionEndPercent}%` }}
                                onPointerDown={startTrimHandleDrag('end')}
                                onClick={(event) => event.stopPropagation()}
                                disabled={isBusy}
                                aria-label="Adjust trim end"
                              />
                            </>
                          ) : (
                            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/15 text-sm text-slate-400">
                              {audioDurationSeconds ? 'Preparing waveform...' : 'Load a sound to trim it with waveform selection.'}
                            </div>
                          )}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                          <RangeField
                            label="Start"
                            value={audioSettings.trim.startSeconds}
                            min={0}
                            max={trimStartMax}
                            step={0.05}
                            suffix=" s"
                            disabled={isBusy}
                            onChange={(next) =>
                              setAudioSettings((prev) => {
                                const nextStartSeconds = Math.min(clampDuration(next), trimStartMax);
                                const remainingAfterStart = audioDurationSeconds === null
                                  ? 600
                                  : Math.max(MIN_TRIM_GAP_SECONDS, audioDurationSeconds - nextStartSeconds);
                                const nextDurationSeconds = prev.trim.durationSeconds > 0
                                  ? Math.min(prev.trim.durationSeconds, remainingAfterStart)
                                  : prev.trim.durationSeconds;

                                return {
                                  ...prev,
                                  trim: {
                                    startSeconds: nextStartSeconds,
                                    durationSeconds: nextDurationSeconds,
                                  },
                                };
                              })
                            }
                          />
                          <RangeField
                            label="Clip length"
                            value={audioSettings.trim.durationSeconds}
                            min={0}
                            max={trimDurationMax}
                            step={0.05}
                            suffix=" s"
                            displayValue={trimDurationDisplay}
                            disabled={isBusy}
                            onChange={(next) =>
                              setAudioSettings((prev) => ({
                                ...prev,
                                trim: {
                                  ...prev.trim,
                                  durationSeconds: Math.min(clampDuration(next), trimDurationMax),
                                },
                              }))
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 self-end rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
                            disabled={isBusy}
                            onClick={() =>
                              setAudioSettings((prev) => ({
                                ...prev,
                                trim: {
                                  startSeconds: 0,
                                  durationSeconds: 0,
                                },
                              }))
                            }
                          >
                            Use full sound
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <SlidersHorizontal className="h-4 w-4 text-cyan-300" />
                    Gain and EQ
                  </div>
                  <RangeField label="Volume" value={volumePercent} min={0} max={300} step={1} suffix="%" disabled={isBusy} onChange={setVolumePercent} />
                  <RangeField label="Low band" value={audioSettings.eq.lowGainDb} min={-24} max={24} step={0.5} suffix=" dB" disabled={isBusy} onChange={(next) => setAudioSettings((prev) => ({ ...prev, eq: { ...prev.eq, lowGainDb: next } }))} />
                  <RangeField label="Mid band" value={audioSettings.eq.midGainDb} min={-24} max={24} step={0.5} suffix=" dB" disabled={isBusy} onChange={(next) => setAudioSettings((prev) => ({ ...prev, eq: { ...prev.eq, midGainDb: next } }))} />
                  <RangeField label="High band" value={audioSettings.eq.highGainDb} min={-24} max={24} step={0.5} suffix=" dB" disabled={isBusy} onChange={(next) => setAudioSettings((prev) => ({ ...prev, eq: { ...prev.eq, highGainDb: next } }))} />
                  <RangeField label="Mid Q" value={audioSettings.eq.midQ} min={0.1} max={10} step={0.1} disabled={isBusy} onChange={(next) => setAudioSettings((prev) => ({ ...prev, eq: { ...prev.eq, midQ: next } }))} />
                </div>

                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Waves className="h-4 w-4 text-emerald-300" />
                    Compression
                  </div>
                  <label className="flex capitalize items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
                    Enable compressor
                    <input
                      type="checkbox"
                      checked={audioSettings.compressor.enabled}
                      onChange={(event) => setAudioSettings((prev) => ({ ...prev, compressor: { ...prev.compressor, enabled: event.target.checked } }))}
                      disabled={isBusy}
                    />
                  </label>
                  <RangeField label="Threshold" value={audioSettings.compressor.threshold} min={-100} max={0} step={1} suffix=" dB" disabled={isBusy || !audioSettings.compressor.enabled} onChange={(next) => setAudioSettings((prev) => ({ ...prev, compressor: { ...prev.compressor, threshold: next } }))} />
                  <RangeField label="Ratio" value={audioSettings.compressor.ratio} min={1} max={20} step={0.1} disabled={isBusy || !audioSettings.compressor.enabled} onChange={(next) => setAudioSettings((prev) => ({ ...prev, compressor: { ...prev.compressor, ratio: next } }))} />
                  <RangeField label="Attack" value={audioSettings.compressor.attack} min={0} max={1} step={0.001} suffix=" s" disabled={isBusy || !audioSettings.compressor.enabled} onChange={(next) => setAudioSettings((prev) => ({ ...prev, compressor: { ...prev.compressor, attack: next } }))} />
                  <RangeField label="Release" value={audioSettings.compressor.release} min={0} max={2} step={0.01} suffix=" s" disabled={isBusy || !audioSettings.compressor.enabled} onChange={(next) => setAudioSettings((prev) => ({ ...prev, compressor: { ...prev.compressor, release: next } }))} />
                </div>

                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Sparkles className="h-4 w-4 text-fuchsia-300" />
                    Reverb and Echo
                  </div>
                  <label className="flex capitalize items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
                    Enable reverb
                    <input
                      type="checkbox"
                      checked={audioSettings.reverb.enabled}
                      onChange={(event) => setAudioSettings((prev) => ({ ...prev, reverb: { ...prev.reverb, enabled: event.target.checked } }))}
                      disabled={isBusy}
                    />
                  </label>
                  <RangeField label="Reverb mix" value={audioSettings.reverb.mix} min={0} max={1} step={0.01} disabled={isBusy || !audioSettings.reverb.enabled} onChange={(next) => setAudioSettings((prev) => ({ ...prev, reverb: { ...prev.reverb, mix: next } }))} />
                  <RangeField label="Tail duration" value={audioSettings.reverb.duration} min={0.1} max={8} step={0.1} suffix=" s" disabled={isBusy || !audioSettings.reverb.enabled} onChange={(next) => setAudioSettings((prev) => ({ ...prev, reverb: { ...prev.reverb, duration: next } }))} />
                  <label className="flex capitalize items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
                    Enable echo
                    <input
                      type="checkbox"
                      checked={audioSettings.echo.enabled}
                      onChange={(event) => setAudioSettings((prev) => ({ ...prev, echo: { ...prev.echo, enabled: event.target.checked } }))}
                      disabled={isBusy}
                    />
                  </label>
                  <RangeField label="Echo mix" value={audioSettings.echo.mix} min={0} max={1} step={0.01} disabled={isBusy || !audioSettings.echo.enabled} onChange={(next) => setAudioSettings((prev) => ({ ...prev, echo: { ...prev.echo, mix: next } }))} />
                  <RangeField label="Delay" value={audioSettings.echo.delayMs} min={20} max={2000} step={10} suffix=" ms" disabled={isBusy || !audioSettings.echo.enabled} onChange={(next) => setAudioSettings((prev) => ({ ...prev, echo: { ...prev.echo, delayMs: next } }))} />
                  <RangeField label="Feedback" value={audioSettings.echo.feedback} min={0} max={0.95} step={0.01} disabled={isBusy || !audioSettings.echo.enabled} onChange={(next) => setAudioSettings((prev) => ({ ...prev, echo: { ...prev.echo, feedback: next } }))} />
                </div>

                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Music2 className="h-4 w-4 text-amber-300" />
                    Saturation
                  </div>
                  <label className="flex capitalize items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
                    Enable saturation
                    <input
                      type="checkbox"
                      checked={audioSettings.saturation.enabled}
                      onChange={(event) => setAudioSettings((prev) => ({ ...prev, saturation: { ...prev.saturation, enabled: event.target.checked } }))}
                      disabled={isBusy}
                    />
                  </label>
                  <RangeField label="Drive" value={audioSettings.saturation.drive} min={1} max={10} step={0.1} disabled={isBusy || !audioSettings.saturation.enabled} onChange={(next) => setAudioSettings((prev) => ({ ...prev, saturation: { ...prev.saturation, drive: next } }))} />
                  <RangeField label="Wet mix" value={audioSettings.saturation.mix} min={0} max={1} step={0.01} disabled={isBusy || !audioSettings.saturation.enabled} onChange={(next) => setAudioSettings((prev) => ({ ...prev, saturation: { ...prev.saturation, mix: next } }))} />
                </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 col-span-2 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">How actions behave</p>
                <div className="mt-3 space-y-2 text-sm text-slate-200">
                  <p><span className="font-semibold text-white">Apply</span> updates only this current use.</p>
                  <p><span className="font-semibold text-white">Save as new Preset</span> creates a new library sound effect.</p>
                  <p><span className="font-semibold text-white">Save</span> overwrites the current sound effect entity.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                Changes are audible immediately while preview is playing. Final render parity is being wired through the same saved settings model.
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-104 shrink-0 flex-col border-l border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 px-6 py-5">
            <h4 className="text-lg font-semibold text-slate-900">Output actions</h4>
            <p className="mt-1 text-sm text-slate-500">
              Choose whether these edits stay local, create a new preset, or replace the saved sound effect.
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                Summary
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>Volume: <span className="font-semibold text-slate-900">{Math.round(volumePercent)}%</span></p>
                <p>Trim: <span className="font-semibold text-slate-900">{formatSeconds(resolvedTrimWindow.startSeconds)} to {resolvedTrimWindow.endSeconds === null ? 'End' : formatSeconds(resolvedTrimWindow.endSeconds)}</span></p>
                <p>EQ: <span className="font-semibold text-slate-900">{audioSettings.eq.lowGainDb.toFixed(1)} / {audioSettings.eq.midGainDb.toFixed(1)} / {audioSettings.eq.highGainDb.toFixed(1)} dB</span></p>
                <p>Compressor: <span className="font-semibold text-slate-900">{audioSettings.compressor.enabled ? 'On' : 'Off'}</span></p>
                <p>Reverb: <span className="font-semibold text-slate-900">{audioSettings.reverb.enabled ? 'On' : 'Off'}</span></p>
                <p>Echo: <span className="font-semibold text-slate-900">{audioSettings.echo.enabled ? 'On' : 'Off'}</span></p>
                <p>Saturation: <span className="font-semibold text-slate-900">{audioSettings.saturation.enabled ? 'On' : 'Off'}</span></p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                onClick={() => {
                  const next = currentValues();
                  if (!next.name || !onApply) return;
                  void Promise.resolve(onApply(next));
                }}
                disabled={!canApply || !canSubmit || isBusy || !onApply}
                variant="outline"
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              >
                {isApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Apply
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const next = currentValues();
                  if (!next.name || !onSaveAsPreset) return;
                  void Promise.resolve(onSaveAsPreset(next));
                }}
                disabled={!canSubmit || isBusy || !onSaveAsPreset}
                variant="outline"
                className="h-11 rounded-xl border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              >
                {isSavingAsPreset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Save as new Preset
              </Button>
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  onClick={handleClose}
                  variant="outline"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  disabled={isBusy}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const next = currentValues();
                    if (!next.name) return;
                    void Promise.resolve(onSave(next));
                  }}
                  disabled={!canSubmit || isBusy}
                  className="h-11 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}