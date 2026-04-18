import {
  normalizeSoundEffectAudioSettings,
  type SoundEffectAudioSettings,
} from '../_types/sound-effect-audio';

export type SoundEffectPreviewGraph = {
  audioContext: AudioContext;
  cleanup: () => Promise<void>;
  tailDurationSeconds: number;
};

const clampVolumePercent = (raw: unknown) => {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 100;
  return Math.max(0, Math.min(300, value));
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

const buildImpulseResponse = (audioContext: BaseAudioContext, duration: number, decay: number) => {
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

const getEchoTailDurationSeconds = (settings: SoundEffectAudioSettings) => {
  if (!settings.echo.enabled) return 0;

  const delaySeconds = Math.max(0, settings.echo.delayMs / 1000);
  if (delaySeconds <= 0) return 0;

  const feedback = Math.max(0, Math.min(0.95, settings.echo.feedback));
  if (feedback <= 0.001) return delaySeconds;

  const repeatCount = Math.max(
    1,
    Math.min(32, Math.ceil(Math.log(0.01) / Math.log(Math.min(0.999, feedback)))),
  );

  return delaySeconds * repeatCount;
};

export const getSoundEffectPreviewTailDurationSeconds = (settings: unknown) => {
  const normalizedSettings = normalizeSoundEffectAudioSettings(settings);

  return Math.max(
    0,
    normalizedSettings.reverb.enabled ? normalizedSettings.reverb.duration : 0,
    getEchoTailDurationSeconds(normalizedSettings),
  );
};

export const createSoundEffectPreviewGraph = (params: {
  audioElement: HTMLAudioElement;
  volumePercent: number;
  audioSettings?: unknown;
}): SoundEffectPreviewGraph | null => {
  if (typeof window === 'undefined') return null;

  const AudioContextCtor = window.AudioContext || (window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;

  if (!AudioContextCtor) {
    params.audioElement.volume = clampVolumePercent(params.volumePercent) / 100;
    return null;
  }

  const normalizedSettings = normalizeSoundEffectAudioSettings(params.audioSettings);
  const audioContext = new AudioContextCtor();
  const sourceNode = audioContext.createMediaElementSource(params.audioElement);
  const lowFilter = audioContext.createBiquadFilter();
  const midFilter = audioContext.createBiquadFilter();
  const highFilter = audioContext.createBiquadFilter();
  const compressor = audioContext.createDynamicsCompressor();
  const dryGain = audioContext.createGain();
  const saturation = audioContext.createWaveShaper();
  const saturationWetGain = audioContext.createGain();
  const delay = audioContext.createDelay(2.5);
  const delayFeedbackGain = audioContext.createGain();
  const echoWetGain = audioContext.createGain();
  const convolver = audioContext.createConvolver();
  const reverbWetGain = audioContext.createGain();
  const masterGain = audioContext.createGain();

  lowFilter.type = 'lowshelf';
  lowFilter.frequency.value = normalizedSettings.eq.lowFrequencyHz;
  lowFilter.gain.value = normalizedSettings.eq.lowGainDb;

  midFilter.type = 'peaking';
  midFilter.frequency.value = normalizedSettings.eq.midFrequencyHz;
  midFilter.gain.value = normalizedSettings.eq.midGainDb;
  midFilter.Q.value = normalizedSettings.eq.midQ;

  highFilter.type = 'highshelf';
  highFilter.frequency.value = normalizedSettings.eq.highFrequencyHz;
  highFilter.gain.value = normalizedSettings.eq.highGainDb;

  compressor.threshold.value = normalizedSettings.compressor.enabled
    ? normalizedSettings.compressor.threshold
    : 0;
  compressor.ratio.value = normalizedSettings.compressor.enabled
    ? normalizedSettings.compressor.ratio
    : 1;
  compressor.attack.value = normalizedSettings.compressor.enabled
    ? normalizedSettings.compressor.attack
    : 0;
  compressor.release.value = normalizedSettings.compressor.enabled
    ? normalizedSettings.compressor.release
    : 0.25;
  compressor.knee.value = normalizedSettings.compressor.enabled
    ? normalizedSettings.compressor.knee
    : 0;

  saturation.curve = createDistortionCurve(normalizedSettings.saturation.drive);
  saturation.oversample = '4x';
  saturationWetGain.gain.value = normalizedSettings.saturation.enabled
    ? normalizedSettings.saturation.mix
    : 0;

  delay.delayTime.value = normalizedSettings.echo.delayMs / 1000;
  delayFeedbackGain.gain.value = normalizedSettings.echo.enabled
    ? normalizedSettings.echo.feedback
    : 0;
  echoWetGain.gain.value = normalizedSettings.echo.enabled ? normalizedSettings.echo.mix : 0;

  convolver.buffer = normalizedSettings.reverb.enabled
    ? buildImpulseResponse(
      audioContext,
      normalizedSettings.reverb.duration,
      normalizedSettings.reverb.decay,
    )
    : null;
  reverbWetGain.gain.value = normalizedSettings.reverb.enabled
    ? normalizedSettings.reverb.mix
    : 0;

  dryGain.gain.value = 1;
  masterGain.gain.value = clampVolumePercent(params.volumePercent) / 100;
  params.audioElement.volume = 1;

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

  masterGain.connect(audioContext.destination);

  let isCleanedUp = false;

  return {
    audioContext,
    tailDurationSeconds: getSoundEffectPreviewTailDurationSeconds(normalizedSettings),
    cleanup: async () => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      try {
        sourceNode.disconnect();
      } catch {
        // ignore
      }
      try {
        lowFilter.disconnect();
      } catch {
        // ignore
      }
      try {
        midFilter.disconnect();
      } catch {
        // ignore
      }
      try {
        highFilter.disconnect();
      } catch {
        // ignore
      }
      try {
        compressor.disconnect();
      } catch {
        // ignore
      }
      try {
        dryGain.disconnect();
      } catch {
        // ignore
      }
      try {
        saturation.disconnect();
      } catch {
        // ignore
      }
      try {
        saturationWetGain.disconnect();
      } catch {
        // ignore
      }
      try {
        delay.disconnect();
      } catch {
        // ignore
      }
      try {
        delayFeedbackGain.disconnect();
      } catch {
        // ignore
      }
      try {
        echoWetGain.disconnect();
      } catch {
        // ignore
      }
      try {
        convolver.disconnect();
      } catch {
        // ignore
      }
      try {
        reverbWetGain.disconnect();
      } catch {
        // ignore
      }
      try {
        masterGain.disconnect();
      } catch {
        // ignore
      }

      if (audioContext.state !== 'closed') {
        await audioContext.close().catch(() => undefined);
      }
    },
  };
};