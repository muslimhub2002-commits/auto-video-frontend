'use client';

import { useCallback, useState } from 'react';
import type { SentenceItem } from '../_types/sentences';

type TransitionType = NonNullable<SentenceItem['transitionToNext']>;
type VisualEffectType = NonNullable<SentenceItem['visualEffect']>;
type ImageMotionEffectType = NonNullable<SentenceItem['imageMotionEffect']>;

function normalizeImageMotionSpeedValue(value: number | null | undefined) {
  const numeric = Number(value ?? 1);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(2.5, Math.max(0.5, numeric));
}

function createClientId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mergeSentenceText(targetText: string, sourceText: string) {
  const parts = [targetText, sourceText]
    .map((t) => (t ?? '').trim())
    .filter(Boolean);
  return parts.join(' ');
}

function clearSentenceVoiceOverState(sentence: SentenceItem): SentenceItem {
  return {
    ...sentence,
    voiceOverFile: null,
    voiceOverUrl: null,
    voiceOverMimeType: null,
    voiceOverDurationSeconds: null,
    voiceOverProvider: null,
    voiceOverVoiceId: null,
    voiceOverVoiceName: null,
    voiceOverStyleInstructions: null,
  };
}

export function useSentencesEditor(initialSentences: SentenceItem[] = []) {
  const [sentences, setSentences] = useState<SentenceItem[]>(initialSentences);

  const updateSentenceById = useCallback(
    (
      sentenceId: string,
      updater: (sentence: SentenceItem) => SentenceItem,
    ) => {
      setSentences((prev) => {
        let didUpdate = false;

        const next = prev.map((sentence) => {
          if (sentence.id !== sentenceId) return sentence;
          didUpdate = true;
          return updater(sentence);
        });

        return didUpdate ? next : prev;
      });
    },
    [],
  );

  const handleSentencePatchById = useCallback(
    (sentenceId: string, patch: Partial<SentenceItem>) => {
      updateSentenceById(sentenceId, (sentence) => ({
        ...sentence,
        ...patch,
      }));
    },
    [updateSentenceById],
  );

  const handleSentencePatch = useCallback(
    (index: number, patch: Partial<SentenceItem>) => {
      const sentenceId = sentences[index]?.id;
      if (!sentenceId) return;
      handleSentencePatchById(sentenceId, patch);
    },
    [handleSentencePatchById, sentences],
  );

  const handleTransitionToNextChangeById = useCallback(
    (sentenceId: string, value: TransitionType | null) => {
      updateSentenceById(sentenceId, (sentence) => ({
        ...sentence,
        transitionToNext: value,
      }));
    },
    [updateSentenceById],
  );

  const handleTransitionToNextChange = useCallback(
    (index: number, value: TransitionType | null) => {
      const sentenceId = sentences[index]?.id;
      if (!sentenceId) return;
      handleTransitionToNextChangeById(sentenceId, value);
    },
    [handleTransitionToNextChangeById, sentences],
  );

  const handleSentenceForcedCharacterKeysChangeById = useCallback(
    (sentenceId: string, next: string[] | null) => {
      updateSentenceById(sentenceId, (sentence) => ({
        ...sentence,
        forcedCharacterKeys: Array.isArray(next)
          ? Array.from(new Set(next.filter(Boolean)))
          : null,
      }));
    },
    [updateSentenceById],
  );

  const handleSentenceForcedCharacterKeysChange = useCallback(
    (index: number, next: string[] | null) => {
      const sentenceId = sentences[index]?.id;
      if (!sentenceId) return;
      handleSentenceForcedCharacterKeysChangeById(sentenceId, next);
    },
    [handleSentenceForcedCharacterKeysChangeById, sentences],
  );

  const handleSentenceForcedLocationKeyChangeById = useCallback(
    (sentenceId: string, next: string | null) => {
      updateSentenceById(sentenceId, (sentence) => ({
        ...sentence,
        forcedLocationKey: next === null ? null : String(next).trim(),
      }));
    },
    [updateSentenceById],
  );

  const handleSentenceForcedLocationKeyChange = useCallback(
    (index: number, next: string | null) => {
      const sentenceId = sentences[index]?.id;
      if (!sentenceId) return;
      handleSentenceForcedLocationKeyChangeById(sentenceId, next);
    },
    [handleSentenceForcedLocationKeyChangeById, sentences],
  );

  const handleSentenceVisualEffectChangeById = useCallback(
    (sentenceId: string, value: VisualEffectType | null) => {
      updateSentenceById(sentenceId, (sentence) => ({
        ...sentence,
        visualEffect: value,
      }));
    },
    [updateSentenceById],
  );

  const handleSentenceVisualEffectChange = useCallback(
    (index: number, value: VisualEffectType | null) => {
      const sentenceId = sentences[index]?.id;
      if (!sentenceId) return;
      handleSentenceVisualEffectChangeById(sentenceId, value);
    },
    [handleSentenceVisualEffectChangeById, sentences],
  );

  const handleSentenceImageMotionEffectChangeById = useCallback(
    (sentenceId: string, value: ImageMotionEffectType | null) => {
      updateSentenceById(sentenceId, (sentence) => ({
        ...sentence,
        imageMotionEffect: value ?? 'default',
      }));
    },
    [updateSentenceById],
  );

  const handleSentenceImageMotionEffectChange = useCallback(
    (index: number, value: ImageMotionEffectType | null) => {
      const sentenceId = sentences[index]?.id;
      if (!sentenceId) return;
      handleSentenceImageMotionEffectChangeById(sentenceId, value);
    },
    [handleSentenceImageMotionEffectChangeById, sentences],
  );

  const handleSentenceImageMotionSpeedChangeById = useCallback(
    (sentenceId: string, value: number) => {
      const normalized = normalizeImageMotionSpeedValue(value);

      updateSentenceById(sentenceId, (sentence) => ({
        ...sentence,
        imageMotionSpeed: normalized,
      }));
    },
    [updateSentenceById],
  );

  const handleSentenceImageMotionSpeedChange = useCallback(
    (index: number, value: number) => {
      const sentenceId = sentences[index]?.id;
      if (!sentenceId) return;
      handleSentenceImageMotionSpeedChangeById(sentenceId, value);
    },
    [handleSentenceImageMotionSpeedChangeById, sentences],
  );

  const handleSentenceTextChangeById = useCallback(
    (sentenceId: string, text: string) => {
      updateSentenceById(sentenceId, (sentence) => {
        if (sentence.text === text) return sentence;
        return {
          ...clearSentenceVoiceOverState(sentence),
          text,
        };
      });
    },
    [updateSentenceById],
  );

  const handleSentenceTextChange = useCallback((index: number, text: string) => {
    const sentenceId = sentences[index]?.id;
    if (!sentenceId) return;
    handleSentenceTextChangeById(sentenceId, text);
  }, [handleSentenceTextChangeById, sentences]);

  const handleMergeSentenceIntoPreviousById = useCallback((sentenceId: string) => {
    setSentences((prev) => {
      const index = prev.findIndex((sentence) => sentence.id === sentenceId);
      if (index <= 0) return prev;

      const targetIndex = index - 1;
      const target = prev[targetIndex];
      const source = prev[index];
      if (!target || !source) return prev;

      const next = prev.map((item, itemIndex) =>
        itemIndex === targetIndex
          ? {
              ...clearSentenceVoiceOverState(item),
              text: mergeSentenceText(item.text, source.text),
            }
          : item,
      );
      next.splice(index, 1);
      return next;
    });
  }, []);

  const handleMergeSentenceIntoPrevious = useCallback((index: number) => {
    const sentenceId = sentences[index]?.id;
    if (!sentenceId) return;
    handleMergeSentenceIntoPreviousById(sentenceId);
  }, [handleMergeSentenceIntoPreviousById, sentences]);

  const handleMergeSentenceIntoNextById = useCallback((sentenceId: string) => {
    setSentences((prev) => {
      const index = prev.findIndex((sentence) => sentence.id === sentenceId);
      if (index < 0 || index >= prev.length - 1) return prev;

      const targetIndex = index + 1;
      const target = prev[targetIndex];
      const source = prev[index];
      if (!target || !source) return prev;

      const next = prev.map((item, itemIndex) =>
        itemIndex === targetIndex
          ? {
              ...clearSentenceVoiceOverState(item),
              text: mergeSentenceText(item.text, source.text),
            }
          : item,
      );
      next.splice(index, 1);
      return next;
    });
  }, []);

  const handleMergeSentenceIntoNext = useCallback((index: number) => {
    const sentenceId = sentences[index]?.id;
    if (!sentenceId) return;
    handleMergeSentenceIntoNextById(sentenceId);
  }, [handleMergeSentenceIntoNextById, sentences]);

  const handleDeleteSentenceById = useCallback((sentenceId: string) => {
    setSentences((prev) => {
      const index = prev.findIndex((sentence) => sentence.id === sentenceId);
      if (index < 0) return prev;
      return prev.filter((sentence) => sentence.id !== sentenceId);
    });
  }, []);

  const handleDeleteSentence = useCallback((index: number) => {
    const sentenceId = sentences[index]?.id;
    if (!sentenceId) return;
    handleDeleteSentenceById(sentenceId);
  }, [handleDeleteSentenceById, sentences]);

  const handleInsertEmptySentenceAfterId = useCallback((sentenceId: string): string => {
    const newId = createClientId('sentence');

    setSentences((prev) => {
      const index = prev.findIndex((sentence) => sentence.id === sentenceId);
      if (index < 0) return prev;

      const empty: SentenceItem = {
        id: newId,
        text: '',
        sceneTab: 'image',
        mediaMode: 'single',
        textAnimationEffect: 'popInBounceHook',
        textAnimationText: null,
        customTextAnimationId: null,
        textAnimationSettings: null,
        textBackgroundImage: null,
        textBackgroundImageUrl: null,
        textBackgroundSavedImageId: null,
        textBackgroundVideo: null,
        textBackgroundVideoUrl: null,
        textBackgroundSavedVideoId: null,
        soundEffects: [],
        transitionSoundEffects: [],
        characterKeys: null,
        locationKey: null,
        forcedLocationKey: null,
        videoGenerationMode: 'referenceImage',
        videoPrompt: null,
        referenceImage: null,
        referenceImageUrl: null,
        isGeneratingReferenceImage: false,
        forcedCharacterKeys: null,
        transitionToNext: null,
        imageEffectsMode: 'quick',
        visualEffect: null,
        customImageFilterId: null,
        imageFilterSettings: null,
        imageMotionEffect: 'default',
        customMotionEffectId: null,
        imageMotionSettings: null,
        imageMotionSpeed: null,
        image: null,
        imageUrl: null,
        imagePrompt: null,
        savedImageId: null,
        startImage: null,
        startImageUrl: null,
        startImagePrompt: null,
        startSavedImageId: null,
        endImage: null,
        endImageUrl: null,
        endImagePrompt: null,
        endSavedImageId: null,
        video: null,
        videoUrl: null,
        savedVideoId: null,
        framesVideoUrl: null,
        framesSavedVideoId: null,
        textVideoUrl: null,
        textSavedVideoId: null,
        referenceVideoUrl: null,
        referenceSavedVideoId: null,
        isGeneratingImage: false,
        isGeneratingStartImage: false,
        isGeneratingEndImage: false,
        isSavingImage: false,
        isFromLibrary: false,
        isSuspense: false,
      };

      const next = [...prev];
      next.splice(index + 1, 0, empty);
      return next;
    });

    return newId;
  }, []);

  const handleInsertEmptySentenceAfter = useCallback((index: number): string => {
    const sentenceId = sentences[index]?.id;
    if (!sentenceId) return createClientId('sentence');
    return handleInsertEmptySentenceAfterId(sentenceId);
  }, [handleInsertEmptySentenceAfterId, sentences]);

  const handleAddSuspenseSceneById = useCallback((sentenceId: string) => {
    setSentences((prev) => {
      const source = prev.find((sentence) => sentence.id === sentenceId);
      if (!source) return prev;

      const newId = createClientId('suspense');

      const copy: SentenceItem = {
        ...source,
        id: newId,
        isSuspense: true,
        isGeneratingImage: false,
        isSavingImage: false,
        savedImageId: source.savedImageId ?? null,
      };

      const withoutExistingSuspense = prev.filter((sentence) => !sentence.isSuspense);
      return [copy, ...withoutExistingSuspense];
    });
  }, []);

  const handleAddSuspenseScene = useCallback((sourceIndex: number) => {
    const sentenceId = sentences[sourceIndex]?.id;
    if (!sentenceId) return;
    handleAddSuspenseSceneById(sentenceId);
  }, [handleAddSuspenseSceneById, sentences]);

  return {
    sentences,
    setSentences,
    updateSentenceById,
    handleSentencePatchById,
    handleSentencePatch,
    handleTransitionToNextChangeById,
    handleSentenceForcedCharacterKeysChange,
    handleSentenceForcedCharacterKeysChangeById,
    handleSentenceForcedLocationKeyChange,
    handleSentenceForcedLocationKeyChangeById,
    handleSentenceVisualEffectChange,
    handleSentenceVisualEffectChangeById,
    handleSentenceImageMotionEffectChange,
    handleSentenceImageMotionEffectChangeById,
    handleSentenceImageMotionSpeedChange,
    handleSentenceImageMotionSpeedChangeById,
    handleTransitionToNextChange,
    handleSentenceTextChange,
    handleSentenceTextChangeById,
    handleMergeSentenceIntoPrevious,
    handleMergeSentenceIntoPreviousById,
    handleMergeSentenceIntoNext,
    handleMergeSentenceIntoNextById,
    handleDeleteSentence,
    handleDeleteSentenceById,
    handleInsertEmptySentenceAfter,
    handleInsertEmptySentenceAfterId,
    handleAddSuspenseScene,
    handleAddSuspenseSceneById,
  };
}
