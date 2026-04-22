import type { SoundEffectAudioSettings } from './sound-effect-audio';

export type SentenceSoundEffectTimingMode = 'withPrevious' | 'afterPreviousEnds';

export type SentenceSoundEffectItem = {
  id: string;
  title: string;
  url: string;
  delaySeconds: number;
  volumePercent: number;
  timingMode?: SentenceSoundEffectTimingMode;
  durationSeconds?: number | null;
  audioSettings?: SoundEffectAudioSettings | null;
  defaultAudioSettings?: SoundEffectAudioSettings | null;
};

export type TransitionSoundEffectItem = {
  id: string;
  title: string;
  url: string;
  delaySeconds: number;
  volumePercent: number;
  isTransitionSound?: boolean;
  fromFavorites?: boolean;
  audioSettings?: SoundEffectAudioSettings | null;
};

export type ElevenLabsVoiceSettings = {
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  useSpeakerBoost: boolean;
};

export type SentenceItem = {
  id: string;
  text: string;
  voiceOverFile?: File | null;
  voiceOverUrl?: string | null;
  voiceOverMimeType?: string | null;
  voiceOverDurationSeconds?: number | null;
  voiceOverProvider?: 'google' | 'elevenlabs' | null;
  voiceOverVoiceId?: string | null;
  voiceOverVoiceName?: string | null;
  voiceOverStyleInstructions?: string | null;
  elevenLabsSettings?: ElevenLabsVoiceSettings | null;
  mediaMode?: 'single' | 'frames';
  sceneTab?: 'image' | 'video' | 'text' | 'overlay';
  imageEffectsMode?: 'quick' | 'detailed';
  alignSoundEffectsToSceneEnd?: boolean;
  textAnimationEffect?:
    | 'popInBounceHook'
    | 'slideCutFast'
    | 'scalePunchZoom'
    | 'maskReveal'
    | 'glitchFlashHook'
    | 'kineticTypography'
    | 'softRiseFade'
    | 'centerWipeReveal'
    | 'trackingSnapHook'
    | null;
  textAnimationText?: string | null;
  customTextAnimationId?: string | null;
  textAnimationSettings?: Record<string, unknown> | null;
  textSoundEffects?: SentenceSoundEffectItem[];
  textBackgroundImage?: File | null;
  textBackgroundImageUrl?: string | null;
  textBackgroundSavedImageId?: string | null;
  textBackgroundVideo?: File | null;
  textBackgroundVideoUrl?: string | null;
  textBackgroundSavedVideoId?: string | null;
  customOverlayId?: string | null;
  overlayFile?: File | null;
  overlayUrl?: string | null;
  overlayMimeType?: string | null;
  overlaySettings?: Record<string, unknown> | null;
  overlaySoundEffects?: SentenceSoundEffectItem[];
  imageMotionEffect?:
    | 'default'
    | 'slowZoomIn'
    | 'slowZoomOut'
    | 'diagonalDrift'
    | 'cinematicPan'
    | 'focusShift'
    | 'parallaxMotion'
    | 'shakeMicroMotion'
    | 'splitMotion'
    | 'rotationDrift'
    | null;
  customImageFilterId?: string | null;
  imageFilterSettings?: Record<string, unknown> | null;
  customMotionEffectId?: string | null;
  imageMotionSettings?: Record<string, unknown> | null;
  imageMotionSpeed?: number | null;

  soundEffects?: SentenceSoundEffectItem[];

  transitionSoundEffects?: TransitionSoundEffectItem[];

  // Non-forced mappings inferred during split (used for draft round-tripping).
  characterKeys?: string[] | null;
  locationKey?: string | null;

  // Forced override set explicitly by the user.
  forcedLocationKey?: string | null;

  videoGenerationMode?: 'frames' | 'text' | 'referenceImage';
  videoPrompt?: string | null;
  referenceImage?: File | null;
  referenceImageUrl?: string | null;
  isGeneratingReferenceImage?: boolean;

  // Optional per-sentence visual effect applied on the media itself (not transitions).
  // Null/undefined means no effect.
  visualEffect?:
    | 'none'
    | 'colorGrading'
    | 'animatedLighting'
    | 'glassSubtle'
    | 'glassReflections'
    | 'glassStrong'
    | null;

  // Optional override for the cut between this sentence and the next.
  // When null/undefined, the renderer will pick a transition automatically.
  transitionToNext?:
    | 'none'
    | 'glitch'
    | 'whip'
    | 'flash'
    | 'fade'
    | 'chromaLeak'
    | null;

  // When set, image generation will reference ONLY these canonical character key(s)
  // and will skip LLM-based character mapping.
  forcedCharacterKeys?: string[] | null;

  image?: File | null;
  imageUrl?: string | null;
  secondaryImage?: File | null;
  secondaryImageUrl?: string | null;
  secondaryImagePrompt?: string | null;
  secondarySavedImageId?: string | null;
  isGeneratingSecondaryImage?: boolean;
  hasSecondaryImageSlot?: boolean;
  video?: File | null;
  videoUrl?: string | null;
  savedVideoId?: string | null;

  // Generated video is mode-specific (frames/text/referenceImage). We keep the
  // per-mode URLs so switching modes can hide/show the appropriate output.
  framesVideoUrl?: string | null;
  framesSavedVideoId?: string | null;
  textVideoUrl?: string | null;
  textSavedVideoId?: string | null;
  referenceVideoUrl?: string | null;
  referenceSavedVideoId?: string | null;
  startImage?: File | null;
  startImageUrl?: string | null;
  startImagePrompt?: string | null;
  startSavedImageId?: string | null;
  endImage?: File | null;
  endImageUrl?: string | null;
  endImagePrompt?: string | null;
  endSavedImageId?: string | null;
  imagePrompt?: string | null;
  isGeneratingImage?: boolean;
  isGeneratingStartImage?: boolean;
  isGeneratingEndImage?: boolean;
  isSavingImage?: boolean;
  savedImageId?: string | null;
  isFromLibrary?: boolean;
  isSuspense?: boolean;
};
