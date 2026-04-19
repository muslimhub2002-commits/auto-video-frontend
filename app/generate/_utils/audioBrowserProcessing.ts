import {
	normalizeSoundEffectAudioSettings,
	resolveSoundEffectTrimWindow,
} from '../_types/sound-effect-audio';

export type EditedAudioMaterializationValues = {
	name?: string | null;
	volumePercent?: number;
	audioSettings?: unknown;
};

export const clampAudioVolumePercent = (raw: unknown) => {
	const value = Number(raw);
	if (!Number.isFinite(value)) return 100;
	return Math.max(0, Math.min(300, value));
};

export const decodeAudioBufferCompat = async (
	audioContext: AudioContext,
	data: ArrayBuffer,
) => {
	const maybePromise = (audioContext as AudioContext & {
		decodeAudioData(audioData: ArrayBuffer): Promise<AudioBuffer>;
	}).decodeAudioData(data.slice(0));

	if (maybePromise && typeof maybePromise.then === 'function') {
		return await maybePromise;
	}

	return await new Promise<AudioBuffer>((resolve, reject) => {
		audioContext.decodeAudioData(data.slice(0), resolve, reject);
	});
};

export const createAudioDistortionCurve = (drive: number) => {
	const amount = Math.max(1, Math.min(10, drive)) * 60;
	const sampleCount = 44100;
	const curve = new Float32Array(sampleCount);

	for (let index = 0; index < sampleCount; index += 1) {
		const x = (index * 2) / sampleCount - 1;
		curve[index] =
			((3 + amount) * x * 20 * (Math.PI / 180)) /
			(Math.PI + amount * Math.abs(x));
	}

	return curve;
};

export const buildAudioImpulseResponse = (
	audioContext: BaseAudioContext,
	duration: number,
	decay: number,
) => {
	const safeDuration = Math.max(0.1, Math.min(8, duration));
	const safeDecay = Math.max(0.1, Math.min(8, decay));
	const length = Math.max(1, Math.floor(audioContext.sampleRate * safeDuration));
	const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);

	for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
		const samples = impulse.getChannelData(channel);
		for (let index = 0; index < length; index += 1) {
			const progress = 1 - index / length;
			samples[index] =
				(Math.random() * 2 - 1) * Math.pow(progress, safeDecay);
		}
	}

	return impulse;
};

export const audioBufferToWav = (audioBuffer: AudioBuffer) => {
	const channelCount = audioBuffer.numberOfChannels;
	const sampleRate = audioBuffer.sampleRate;
	const format = 1;
	const bitDepth = 16;
	const bytesPerSample = bitDepth / 8;
	const frameCount = audioBuffer.length;
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
	view.setUint16(20, format, true);
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
			view.setInt16(
				offset,
				clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
				true,
			);
			offset += 2;
		}
	}

	return wavBuffer;
};

export const stripFileExtension = (value: string) =>
	String(value ?? '').trim().replace(/\.[^.]+$/u, '').trim();

export const renderEditedAudioFile = async (params: {
	sourceFile?: File | null;
	sourceUrl?: string | null;
	values: EditedAudioMaterializationValues;
	fallbackName: string;
}) => {
	if (typeof window === 'undefined') {
		throw new Error('Audio rendering is only available in the browser.');
	}

	const sourceFile = params.sourceFile ?? null;
	const sourceUrl = String(params.sourceUrl ?? '').trim();
	const normalizedSettings = normalizeSoundEffectAudioSettings(
		params.values.audioSettings,
	);
	const trimmedName = stripFileExtension(
		String(params.values.name ?? '').trim() ||
			stripFileExtension(params.fallbackName),
	);

	let audioData: ArrayBuffer;
	if (sourceFile) {
		audioData = await sourceFile.arrayBuffer();
	} else if (sourceUrl) {
		const response = await fetch(sourceUrl);
		if (!response.ok) throw new Error('Failed to load the source audio.');
		audioData = await response.arrayBuffer();
	} else {
		throw new Error('No source audio available.');
	}

	const AudioContextCtor =
		window.AudioContext ||
		(window as typeof window & {
			webkitAudioContext?: typeof AudioContext;
		}).webkitAudioContext;
	const OfflineAudioContextCtor =
		window.OfflineAudioContext ||
		(window as typeof window & {
			webkitOfflineAudioContext?: typeof OfflineAudioContext;
		}).webkitOfflineAudioContext;

	if (!AudioContextCtor || !OfflineAudioContextCtor) {
		throw new Error('Web Audio is not supported in this browser.');
	}

	const decodeContext = new AudioContextCtor();

	try {
		const decodedBuffer = await decodeAudioBufferCompat(decodeContext, audioData);
		const trimWindow = resolveSoundEffectTrimWindow(
			normalizedSettings,
			decodedBuffer.duration,
		);
		const durationSeconds =
			trimWindow.effectiveDurationSeconds ?? Math.max(0.05, decodedBuffer.duration);
		const channelCount = Math.max(1, decodedBuffer.numberOfChannels);
		const frameCount = Math.max(
			1,
			Math.ceil(durationSeconds * decodedBuffer.sampleRate),
		);
		const offlineContext = new OfflineAudioContextCtor(
			channelCount,
			frameCount,
			decodedBuffer.sampleRate,
		);

		const sourceNode = offlineContext.createBufferSource();
		sourceNode.buffer = decodedBuffer;

		const lowFilter = offlineContext.createBiquadFilter();
		const midFilter = offlineContext.createBiquadFilter();
		const highFilter = offlineContext.createBiquadFilter();
		const compressor = offlineContext.createDynamicsCompressor();
		const dryGain = offlineContext.createGain();
		const saturation = offlineContext.createWaveShaper();
		const saturationWetGain = offlineContext.createGain();
		const delay = offlineContext.createDelay(2.5);
		const delayFeedbackGain = offlineContext.createGain();
		const echoWetGain = offlineContext.createGain();
		const convolver = offlineContext.createConvolver();
		const reverbWetGain = offlineContext.createGain();
		const masterGain = offlineContext.createGain();

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

		saturation.curve = createAudioDistortionCurve(
			normalizedSettings.saturation.drive,
		);
		saturation.oversample = '4x';
		saturationWetGain.gain.value = normalizedSettings.saturation.enabled
			? normalizedSettings.saturation.mix
			: 0;

		delay.delayTime.value = normalizedSettings.echo.delayMs / 1000;
		delayFeedbackGain.gain.value = normalizedSettings.echo.enabled
			? normalizedSettings.echo.feedback
			: 0;
		echoWetGain.gain.value = normalizedSettings.echo.enabled
			? normalizedSettings.echo.mix
			: 0;

		convolver.buffer = normalizedSettings.reverb.enabled
			? buildAudioImpulseResponse(
					offlineContext,
					normalizedSettings.reverb.duration,
					normalizedSettings.reverb.decay,
				)
			: null;
		reverbWetGain.gain.value = normalizedSettings.reverb.enabled
			? normalizedSettings.reverb.mix
			: 0;
		dryGain.gain.value = 1;
		masterGain.gain.value = clampAudioVolumePercent(params.values.volumePercent) / 100;

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

		masterGain.connect(offlineContext.destination);

		sourceNode.start(0, trimWindow.startSeconds, durationSeconds);
		const renderedBuffer = await offlineContext.startRendering();
		const wavBuffer = audioBufferToWav(renderedBuffer);
		const fileName = `${trimmedName || 'audio'}-enhanced.wav`;

		return {
			file: new File([wavBuffer], fileName, { type: 'audio/wav' }),
			durationSeconds: renderedBuffer.duration,
		};
	} finally {
		await decodeContext.close().catch(() => undefined);
	}
};
