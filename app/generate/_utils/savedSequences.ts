import {
  cloneSoundEffectAudioSettings,
  normalizeSoundEffectAudioSettings,
} from '../_types/sound-effect-audio';
import type {
  SentenceItem,
  SentenceSoundEffectItem,
  TransitionSoundEffectItem,
} from '../_types/sentences';
import type {
  SavedSequenceDetailDto,
  SavedSequenceSceneDto,
  SavedSequenceSoundEffectDto,
  SavedSequenceTransitionSoundEffectDto,
} from '../_types/saved-sequences';
import {
  type ImageFilterPresetDto,
  type MotionEffectPresetDto,
  normalizeImageFilterSettings,
  normalizeImageMotionSettings,
  normalizeOverlaySettings,
  resolveImageMotionSpeed,
  resolveMotionEffectFromSettings,
  resolveVisualEffectFromSettings,
} from '../_components/sentences/ImageEffectPreview';
import {
  normalizeTextAnimationSettings,
  resolveTextAnimationEffectFromSettings,
  resolveTextAnimationText,
} from '../_components/sentences/TextAnimationPreview';
import { getDefaultSentenceSequenceConfig } from './defaultSentenceSceneConfig';
import {
  buildLookPresetSelectionPatch,
  buildMotionPresetSelectionPatch,
} from './imageEffectSelection';

function normalizeSettingsObject(
  value: Record<string, unknown> | null | undefined,
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value;
}

function clampPercent(value: number | null | undefined, fallback = 100) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(300, numeric));
}

function normalizeNonNegativeNumber(
  value: number | null | undefined,
  fallback = 0,
) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, numeric);
}

function resolveSceneTabFromSentence(
  sentence: Pick<SentenceItem, 'sceneTab' | 'mediaMode'>,
): NonNullable<SentenceItem['sceneTab']> {
  if (
    sentence.sceneTab === 'image' ||
    sentence.sceneTab === 'video' ||
    sentence.sceneTab === 'text' ||
    sentence.sceneTab === 'overlay'
  ) {
    return sentence.sceneTab;
  }

  return sentence.mediaMode === 'frames' ? 'video' : 'image';
}

function resolveSceneTabFromSavedScene(
  scene: SavedSequenceSceneDto | null | undefined,
): NonNullable<SentenceItem['sceneTab']> {
  const rawValue = String(scene?.scene_tab ?? scene?.sceneTab ?? '').trim();
  if (
    rawValue === 'image' ||
    rawValue === 'video' ||
    rawValue === 'text' ||
    rawValue === 'overlay'
  ) {
    return rawValue;
  }
  return 'image';
}

function resolveSavedSequenceSoundEffectId(
  item: SavedSequenceSoundEffectDto | SavedSequenceTransitionSoundEffectDto,
) {
  return String(item.sound_effect_id ?? item.soundEffectId ?? '').trim();
}

function resolveSavedSequencePresetId(value: unknown) {
  return String(value ?? '').trim();
}

function buildSavedSequenceSoundEffectSnapshots(
  items:
    | SentenceItem['soundEffects']
    | SentenceItem['textSoundEffects']
    | SentenceItem['overlaySoundEffects'],
): SavedSequenceSoundEffectDto[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => Boolean(item?.id))
    .map((item) => ({
      sound_effect_id: String(item.id),
      title: String(item.title ?? '').trim() || undefined,
      url: String(item.url ?? '').trim() || undefined,
      delay_seconds: normalizeNonNegativeNumber(item.delaySeconds, 0),
      volume_percent: clampPercent(item.volumePercent, 100),
      timing_mode:
        item.timingMode === 'afterPreviousEnds'
          ? 'after_previous_ends'
          : 'with_previous',
      audio_settings: normalizeSoundEffectAudioSettings(
        item.audioSettings ?? item.defaultAudioSettings,
      ),
      default_audio_settings: cloneSoundEffectAudioSettings(
        item.defaultAudioSettings,
      ),
      duration_seconds:
        typeof item.durationSeconds === 'number' && Number.isFinite(item.durationSeconds)
          ? Math.max(0, item.durationSeconds)
          : null,
    }));
}

function buildSavedSequenceTransitionSoundEffectSnapshots(
  items: SentenceItem['transitionSoundEffects'],
): SavedSequenceTransitionSoundEffectDto[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => Boolean(item?.id))
    .map((item) => ({
      sound_effect_id: String(item.id),
      title: String(item.title ?? '').trim() || undefined,
      url: String(item.url ?? '').trim() || undefined,
      delay_seconds: normalizeNonNegativeNumber(item.delaySeconds, 0),
      volume_percent: clampPercent(item.volumePercent, 100),
      audio_settings: normalizeSoundEffectAudioSettings(item.audioSettings),
    }));
}

export function normalizeSavedSequenceSoundEffects(
  items: unknown,
): SentenceSoundEffectItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const normalizedItems: Array<SentenceSoundEffectItem | null> = items.map((rawItem) => {
      if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
        return null;
      }

      const item = rawItem as SavedSequenceSoundEffectDto;
      const id = resolveSavedSequenceSoundEffectId(item);
      if (!id) {
        return null;
      }

      const timingModeRaw = item.timing_mode ?? item.timingMode ?? 'with_previous';

      return {
        id,
        title: String(item.title ?? '').trim() || 'Sound effect',
        url: String(item.url ?? '').trim(),
        delaySeconds: normalizeNonNegativeNumber(
          Number(item.delay_seconds ?? item.delaySeconds ?? 0),
          0,
        ),
        volumePercent: clampPercent(
          Number(item.volume_percent ?? item.volumePercent ?? 100),
          100,
        ),
        timingMode:
          timingModeRaw === 'after_previous_ends' ||
          timingModeRaw === 'afterPreviousEnds'
            ? 'afterPreviousEnds'
            : 'withPrevious',
        audioSettings: cloneSoundEffectAudioSettings(
          item.audio_settings ??
            item.audioSettings ??
            item.audio_settings_override ??
            item.audioSettingsOverride ??
            item.default_audio_settings ??
            item.defaultAudioSettings,
        ),
        defaultAudioSettings: cloneSoundEffectAudioSettings(
          item.default_audio_settings ?? item.defaultAudioSettings,
        ),
        durationSeconds:
          typeof item.duration_seconds === 'number' &&
          Number.isFinite(item.duration_seconds)
            ? Math.max(0, item.duration_seconds)
            : typeof item.durationSeconds === 'number' &&
                Number.isFinite(item.durationSeconds)
              ? Math.max(0, item.durationSeconds)
              : null,
      } satisfies SentenceSoundEffectItem;
    });

  return normalizedItems.filter(
    (item): item is SentenceSoundEffectItem => item !== null,
  );
}

export function normalizeSavedSequenceTransitionSoundEffects(
  items: unknown,
): TransitionSoundEffectItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const normalizedItems: Array<TransitionSoundEffectItem | null> = items.map((rawItem) => {
      if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
        return null;
      }

      const item = rawItem as SavedSequenceTransitionSoundEffectDto;
      const id = resolveSavedSequenceSoundEffectId(item);
      if (!id) {
        return null;
      }

      return {
        id,
        title: String(item.title ?? '').trim() || 'Transition sound',
        url: String(item.url ?? '').trim(),
        delaySeconds: normalizeNonNegativeNumber(
          Number(item.delay_seconds ?? item.delaySeconds ?? 0),
          0,
        ),
        volumePercent: clampPercent(
          Number(item.volume_percent ?? item.volumePercent ?? 100),
          100,
        ),
        audioSettings: cloneSoundEffectAudioSettings(
          item.audio_settings ?? item.audioSettings,
        ),
      } satisfies TransitionSoundEffectItem;
    });

  return normalizedItems.filter(
    (item): item is TransitionSoundEffectItem => item !== null,
  );
}

function buildLookSnapshot(
  sentence: SentenceItem,
  isShortVideo: boolean,
  includeMotion: boolean,
) {
  const resolvedVisualEffect = resolveVisualEffectFromSettings(
    sentence.imageFilterSettings,
    sentence.visualEffect ?? null,
  );
  const visualEffect = resolvedVisualEffect === 'none' ? null : resolvedVisualEffect;
  const lookPatch: SavedSequenceSceneDto = {
    visual_effect: visualEffect,
    custom_image_filter_id: resolveSavedSequencePresetId(
      sentence.customImageFilterId,
    ) || null,
    image_filter_settings: normalizeSettingsObject(
      normalizeImageFilterSettings(sentence.imageFilterSettings, visualEffect),
    ),
  };

  if (!includeMotion) {
    return lookPatch;
  }

  const imageMotionEffect = resolveMotionEffectFromSettings(
    sentence.imageMotionSettings,
    sentence.imageMotionEffect ?? 'default',
  );
  const imageMotionSpeed = resolveImageMotionSpeed(
    sentence.imageMotionSpeed,
    sentence.imageMotionSettings,
    isShortVideo,
  );

  return {
    ...lookPatch,
    image_motion_effect: imageMotionEffect,
    custom_motion_effect_id: resolveSavedSequencePresetId(
      sentence.customMotionEffectId,
    ) || null,
    image_motion_settings: normalizeSettingsObject(
      normalizeImageMotionSettings(
        sentence.imageMotionSettings,
        imageMotionEffect,
        imageMotionSpeed,
        isShortVideo,
      ),
    ),
    image_motion_speed: imageMotionSpeed,
  };
}

function buildLookPatchFromScene(
  scene: SavedSequenceSceneDto,
  isShortVideo: boolean,
  includeMotion: boolean,
  imageFilterPresets: ImageFilterPresetDto[],
  motionEffectPresets: MotionEffectPresetDto[],
): Partial<SentenceItem> {
  const rawVisualEffect =
    scene.visual_effect ?? scene.visualEffect ?? null;
  const customImageFilterId = resolveSavedSequencePresetId(
    scene.custom_image_filter_id ?? scene.customImageFilterId,
  );
  const rawImageFilterSettings =
    scene.image_filter_settings ?? scene.imageFilterSettings ?? null;
  const presetLookPatch = customImageFilterId
    ? buildLookPresetSelectionPatch({
        value: `custom:${customImageFilterId}`,
        sentence: {
          visualEffect: rawVisualEffect,
          imageFilterSettings: rawImageFilterSettings,
        },
        imageFilterPresets,
      })
    : null;
  const resolvedVisualEffect = resolveVisualEffectFromSettings(
    rawImageFilterSettings,
    rawVisualEffect,
  );
  const visualEffect = resolvedVisualEffect === 'none' ? null : resolvedVisualEffect;
  const lookPatch: Partial<SentenceItem> =
    presetLookPatch ?? {
      visualEffect,
      customImageFilterId: null,
      imageFilterSettings: normalizeImageFilterSettings(
        rawImageFilterSettings,
        visualEffect,
      ),
    };

  if (!includeMotion) {
    return lookPatch;
  }

  const rawImageMotionEffect =
    scene.image_motion_effect ?? scene.imageMotionEffect ?? 'default';
  const customMotionEffectId = resolveSavedSequencePresetId(
    scene.custom_motion_effect_id ?? scene.customMotionEffectId,
  );
  const rawImageMotionSettings =
    scene.image_motion_settings ?? scene.imageMotionSettings ?? null;
  const rawImageMotionSpeed =
    scene.image_motion_speed ?? scene.imageMotionSpeed ?? null;
  const presetMotionPatch = customMotionEffectId
    ? buildMotionPresetSelectionPatch({
        value: `custom:${customMotionEffectId}`,
        sentence: {
          imageMotionEffect: rawImageMotionEffect,
          imageMotionSettings: rawImageMotionSettings,
          imageMotionSpeed: rawImageMotionSpeed,
        },
        motionEffectPresets,
        isShortVideo,
      })
    : null;
  const imageMotionEffect = resolveMotionEffectFromSettings(
    rawImageMotionSettings,
    rawImageMotionEffect,
  );
  const imageMotionSpeed = resolveImageMotionSpeed(
    rawImageMotionSpeed,
    rawImageMotionSettings,
    isShortVideo,
  );

  return {
    ...lookPatch,
    ...(presetMotionPatch ?? {
      imageMotionEffect,
      customMotionEffectId: null,
      imageMotionSettings: normalizeImageMotionSettings(
        rawImageMotionSettings,
        imageMotionEffect,
        imageMotionSpeed,
        isShortVideo,
      ),
      imageMotionSpeed,
    }),
  };
}

export function hasUnsavedOverlaySequenceAsset(sentence: SentenceItem) {
  return (
    resolveSceneTabFromSentence(sentence) === 'overlay' &&
    Boolean(sentence.overlayFile) &&
    !String(sentence.overlayUrl ?? '').trim()
  );
}

export function buildSavedSequenceSceneSnapshot(
  sentence: SentenceItem,
  isShortVideo: boolean,
): SavedSequenceSceneDto {
  const sceneTab = resolveSceneTabFromSentence(sentence);
  const common: SavedSequenceSceneDto = {
    scene_tab: sceneTab,
    image_effects_mode: sentence.imageEffectsMode ?? 'quick',
    align_sound_effects_to_scene_end:
      sentence.alignSoundEffectsToSceneEnd === true,
    sound_effects: buildSavedSequenceSoundEffectSnapshots(sentence.soundEffects),
    transition_to_next: sentence.transitionToNext ?? null,
    transition_sound_effects: buildSavedSequenceTransitionSoundEffectSnapshots(
      sentence.transitionSoundEffects,
    ),
    is_suspense: sentence.isSuspense === true,
  };

  if (sceneTab === 'image') {
    return {
      ...common,
      ...buildLookSnapshot(sentence, isShortVideo, true),
    };
  }

  if (sceneTab === 'video') {
    return {
      ...common,
      video_generation_mode: sentence.videoGenerationMode ?? 'referenceImage',
      ...buildLookSnapshot(sentence, isShortVideo, false),
    };
  }

  if (sceneTab === 'text') {
    const textAnimationEffect = resolveTextAnimationEffectFromSettings(
      sentence.textAnimationSettings,
      sentence.textAnimationEffect ?? null,
    );
    const explicitTextAnimationText =
      String(sentence.textAnimationText ?? '').trim() || null;
    const resolvedTextAnimationText = resolveTextAnimationText(
      sentence.textAnimationText,
      sentence.text,
    );
    const textAnimationSettings = normalizeTextAnimationSettings(
      sentence.textAnimationSettings,
      textAnimationEffect,
      isShortVideo,
      resolvedTextAnimationText,
    );
    const backgroundMode = textAnimationSettings.backgroundMode ?? 'inheritImage';

    return {
      ...common,
      text_animation_effect: textAnimationEffect,
      text_animation_text: explicitTextAnimationText,
      text_animation_settings: normalizeSettingsObject(textAnimationSettings),
      text_animation_sound_effects: buildSavedSequenceSoundEffectSnapshots(
        sentence.textSoundEffects,
      ),
      ...(backgroundMode === 'inheritImage' || backgroundMode === 'image'
        ? buildLookSnapshot(sentence, isShortVideo, true)
        : backgroundMode === 'inheritVideo' || backgroundMode === 'video'
          ? buildLookSnapshot(sentence, isShortVideo, false)
          : {}),
    };
  }

  const overlaySettings = normalizeOverlaySettings(sentence.overlaySettings, 'image');
  const backgroundMode = overlaySettings.backgroundMode ?? 'image';

  return {
    ...common,
    overlay_url: String(sentence.overlayUrl ?? '').trim() || null,
    overlay_mime_type: String(sentence.overlayMimeType ?? '').trim() || null,
    overlay_settings: normalizeSettingsObject(overlaySettings),
    overlay_sound_effects: buildSavedSequenceSoundEffectSnapshots(
      sentence.overlaySoundEffects,
    ),
    ...(backgroundMode === 'image'
      ? buildLookSnapshot(sentence, isShortVideo, true)
      : backgroundMode === 'video'
        ? buildLookSnapshot(sentence, isShortVideo, false)
        : {}),
  };
}

export function buildSentencePatchFromSavedSequenceScene(
  scene: SavedSequenceSceneDto,
  currentSentenceText: string | null | undefined,
  isShortVideo: boolean,
  imageFilterPresets: ImageFilterPresetDto[],
  motionEffectPresets: MotionEffectPresetDto[],
): Partial<SentenceItem> {
  const sceneTab = resolveSceneTabFromSavedScene(scene);
  const commonPatch: Partial<SentenceItem> = {
    ...getDefaultSentenceSequenceConfig(),
    sceneTab,
    mediaMode: sceneTab === 'video' ? 'frames' : 'single',
    imageEffectsMode:
      scene.image_effects_mode === 'detailed' || scene.imageEffectsMode === 'detailed'
        ? 'detailed'
        : 'quick',
    alignSoundEffectsToSceneEnd:
      scene.align_sound_effects_to_scene_end === true ||
      scene.alignSoundEffectsToSceneEnd === true,
    soundEffects: normalizeSavedSequenceSoundEffects(
      scene.sound_effects ?? scene.soundEffects,
    ),
    transitionToNext:
      scene.transition_to_next ?? scene.transitionToNext ?? null,
    transitionSoundEffects: normalizeSavedSequenceTransitionSoundEffects(
      scene.transition_sound_effects ?? scene.transitionSoundEffects,
    ),
    isSuspense: scene.is_suspense === true || scene.isSuspense === true,
  };

  if (sceneTab === 'image') {
    return {
      ...commonPatch,
      ...buildLookPatchFromScene(
        scene,
        isShortVideo,
        true,
        imageFilterPresets,
        motionEffectPresets,
      ),
    };
  }

  if (sceneTab === 'video') {
    const videoGenerationMode =
      scene.video_generation_mode ?? scene.videoGenerationMode;

    return {
      ...commonPatch,
      ...buildLookPatchFromScene(
        scene,
        isShortVideo,
        false,
        imageFilterPresets,
        motionEffectPresets,
      ),
      videoGenerationMode:
        videoGenerationMode === 'frames' ||
        videoGenerationMode === 'text' ||
        videoGenerationMode === 'referenceImage'
          ? videoGenerationMode
          : 'referenceImage',
    };
  }

  if (sceneTab === 'text') {
    const rawTextAnimationEffect =
      scene.text_animation_effect ?? scene.textAnimationEffect ?? null;
    const rawTextAnimationText =
      scene.text_animation_text ?? scene.textAnimationText ?? null;
    const rawTextAnimationSettings =
      scene.text_animation_settings ?? scene.textAnimationSettings ?? null;
    const textAnimationEffect = resolveTextAnimationEffectFromSettings(
      rawTextAnimationSettings,
      rawTextAnimationEffect,
    );
    const textAnimationText =
      typeof rawTextAnimationText === 'string'
        ? rawTextAnimationText.trim() || null
        : null;
    const resolvedTextAnimationText = resolveTextAnimationText(
      textAnimationText,
      currentSentenceText,
    );
    const textAnimationSettings = normalizeTextAnimationSettings(
      rawTextAnimationSettings,
      textAnimationEffect,
      isShortVideo,
      resolvedTextAnimationText,
    );
    const backgroundMode = textAnimationSettings.backgroundMode ?? 'inheritImage';

    return {
      ...commonPatch,
      textAnimationEffect,
      textAnimationText,
      customTextAnimationId: null,
      textAnimationSettings,
      textSoundEffects: normalizeSavedSequenceSoundEffects(
        scene.text_animation_sound_effects ?? scene.textAnimationSoundEffects,
      ),
      ...(backgroundMode === 'inheritImage' || backgroundMode === 'image'
        ? buildLookPatchFromScene(
            scene,
            isShortVideo,
            true,
            imageFilterPresets,
            motionEffectPresets,
          )
        : backgroundMode === 'inheritVideo' || backgroundMode === 'video'
          ? buildLookPatchFromScene(
              scene,
              isShortVideo,
              false,
              imageFilterPresets,
              motionEffectPresets,
            )
          : {}),
    };
  }

  const overlaySettings = normalizeOverlaySettings(
    scene.overlay_settings ?? scene.overlaySettings,
    'image',
  );
  const backgroundMode = overlaySettings.backgroundMode ?? 'image';

  return {
    ...commonPatch,
    customOverlayId: null,
    overlayFile: null,
    overlayUrl: String(scene.overlay_url ?? scene.overlayUrl ?? '').trim() || null,
    overlayMimeType:
      String(scene.overlay_mime_type ?? scene.overlayMimeType ?? '').trim() || null,
    overlaySettings,
    overlaySoundEffects: normalizeSavedSequenceSoundEffects(
      scene.overlay_sound_effects ?? scene.overlaySoundEffects,
    ),
    ...(backgroundMode === 'image'
      ? buildLookPatchFromScene(
          scene,
          isShortVideo,
          true,
          imageFilterPresets,
          motionEffectPresets,
        )
      : backgroundMode === 'video'
        ? buildLookPatchFromScene(
            scene,
            isShortVideo,
            false,
            imageFilterPresets,
            motionEffectPresets,
          )
        : {}),
  };
}

export function applySavedSequenceToSentences(params: {
  sentences: SentenceItem[];
  sequence: SavedSequenceDetailDto;
  isShortVideo: boolean;
  imageFilterPresets?: ImageFilterPresetDto[];
  motionEffectPresets?: MotionEffectPresetDto[];
}) {
  const savedScenes = Array.isArray(params.sequence?.scenes)
    ? params.sequence.scenes
    : [];
  const imageFilterPresets = Array.isArray(params.imageFilterPresets)
    ? params.imageFilterPresets
    : [];
  const motionEffectPresets = Array.isArray(params.motionEffectPresets)
    ? params.motionEffectPresets
    : [];
  const sharedCount = Math.min(params.sentences.length, savedScenes.length);
  const ignoredCount = Math.max(0, savedScenes.length - params.sentences.length);
  const resetCount = Math.max(0, params.sentences.length - sharedCount);

  return {
    sentences: params.sentences.map((sentence, index) => {
      if (index < sharedCount) {
        return {
          ...sentence,
          ...buildSentencePatchFromSavedSequenceScene(
            savedScenes[index] ?? {},
            sentence.text,
            params.isShortVideo,
            imageFilterPresets,
            motionEffectPresets,
          ),
        };
      }

      return {
        ...sentence,
        ...getDefaultSentenceSequenceConfig(),
      };
    }),
    appliedCount: sharedCount,
    resetCount,
    ignoredCount,
  };
}