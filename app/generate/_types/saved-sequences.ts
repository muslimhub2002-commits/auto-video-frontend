import type { SentenceItem } from './sentences';

export type SavedSequenceSoundEffectDto = {
  sound_effect_id?: string | null;
  soundEffectId?: string | null;
  title?: string | null;
  url?: string | null;
  delay_seconds?: number | null;
  delaySeconds?: number | null;
  volume_percent?: number | null;
  volumePercent?: number | null;
  timing_mode?: 'with_previous' | 'after_previous_ends' | null;
  timingMode?:
    | 'with_previous'
    | 'after_previous_ends'
    | 'withPrevious'
    | 'afterPreviousEnds'
    | null;
  audio_settings?: Record<string, unknown> | null;
  audioSettings?: Record<string, unknown> | null;
  audio_settings_override?: Record<string, unknown> | null;
  audioSettingsOverride?: Record<string, unknown> | null;
  default_audio_settings?: Record<string, unknown> | null;
  defaultAudioSettings?: Record<string, unknown> | null;
  duration_seconds?: number | null;
  durationSeconds?: number | null;
};

export type SavedSequenceTransitionSoundEffectDto = {
  sound_effect_id?: string | null;
  soundEffectId?: string | null;
  title?: string | null;
  url?: string | null;
  delay_seconds?: number | null;
  delaySeconds?: number | null;
  volume_percent?: number | null;
  volumePercent?: number | null;
  audio_settings?: Record<string, unknown> | null;
  audioSettings?: Record<string, unknown> | null;
};

export type SavedSequenceSceneDto = {
  scene_tab?: SentenceItem['sceneTab'] | null;
  sceneTab?: SentenceItem['sceneTab'] | null;
  image_effects_mode?: SentenceItem['imageEffectsMode'] | null;
  imageEffectsMode?: SentenceItem['imageEffectsMode'] | null;
  align_sound_effects_to_scene_end?: boolean | null;
  alignSoundEffectsToSceneEnd?: boolean | null;
  visual_effect?: SentenceItem['visualEffect'] | null;
  visualEffect?: SentenceItem['visualEffect'] | null;
  custom_image_filter_id?: string | null;
  customImageFilterId?: string | null;
  image_filter_settings?: Record<string, unknown> | null;
  imageFilterSettings?: Record<string, unknown> | null;
  image_motion_effect?: NonNullable<SentenceItem['imageMotionEffect']> | null;
  imageMotionEffect?: NonNullable<SentenceItem['imageMotionEffect']> | null;
  custom_motion_effect_id?: string | null;
  customMotionEffectId?: string | null;
  image_motion_settings?: Record<string, unknown> | null;
  imageMotionSettings?: Record<string, unknown> | null;
  image_motion_speed?: number | null;
  imageMotionSpeed?: number | null;
  video_generation_mode?: NonNullable<SentenceItem['videoGenerationMode']> | null;
  videoGenerationMode?: NonNullable<SentenceItem['videoGenerationMode']> | null;
  text_animation_effect?: SentenceItem['textAnimationEffect'] | null;
  textAnimationEffect?: SentenceItem['textAnimationEffect'] | null;
  text_animation_settings?: Record<string, unknown> | null;
  textAnimationSettings?: Record<string, unknown> | null;
  text_animation_sound_effects?: SavedSequenceSoundEffectDto[] | null;
  textAnimationSoundEffects?: SavedSequenceSoundEffectDto[] | null;
  overlay_url?: string | null;
  overlayUrl?: string | null;
  overlay_mime_type?: string | null;
  overlayMimeType?: string | null;
  overlay_settings?: Record<string, unknown> | null;
  overlaySettings?: Record<string, unknown> | null;
  overlay_sound_effects?: SavedSequenceSoundEffectDto[] | null;
  overlaySoundEffects?: SavedSequenceSoundEffectDto[] | null;
  sound_effects?: SavedSequenceSoundEffectDto[] | null;
  soundEffects?: SavedSequenceSoundEffectDto[] | null;
  transition_to_next?: SentenceItem['transitionToNext'] | null;
  transitionToNext?: SentenceItem['transitionToNext'] | null;
  transition_sound_effects?: SavedSequenceTransitionSoundEffectDto[] | null;
  transitionSoundEffects?: SavedSequenceTransitionSoundEffectDto[] | null;
  is_suspense?: boolean | null;
  isSuspense?: boolean | null;
};

export type SavedSequenceSummaryDto = {
  id: string;
  title: string;
  scene_count?: number | null;
  sceneCount?: number | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

export type SavedSequenceDetailDto = SavedSequenceSummaryDto & {
  user_id?: string | null;
  userId?: string | null;
  scenes?: SavedSequenceSceneDto[] | null;
};