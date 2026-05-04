import type { SentenceItem } from '../_types/sentences';

export function getDefaultSentenceSequenceConfig(): Partial<SentenceItem> {
  return {
    sceneTab: 'image',
    mediaMode: 'single',
    imageEffectsMode: 'quick',
    alignSoundEffectsToSceneEnd: false,
    textAnimationEffect: 'slideCutFast',
    textAnimationText: null,
    customTextAnimationId: null,
    textAnimationSettings: null,
    textSoundEffects: [],
    customOverlayId: null,
    overlayFile: null,
    overlayUrl: null,
    overlayMimeType: null,
    overlaySettings: null,
    overlaySoundEffects: [],
    soundEffects: [],
    transitionSoundEffects: [],
    videoGenerationMode: 'referenceImage',
    videoPrompt: null,
    transitionToNext: null,
    visualEffect: null,
    customImageFilterId: null,
    imageFilterSettings: null,
    imageMotionEffect: 'default',
    customMotionEffectId: null,
    imageMotionSettings: null,
    imageMotionSpeed: null,
    isSuspense: false,
  };
}