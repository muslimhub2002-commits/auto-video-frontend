'use client';

import { useCallback, useState } from 'react';
import type { SentenceItem } from '../_types/sentences';

type TransitionType = NonNullable<SentenceItem['transitionToNext']>;
type VisualEffectType = NonNullable<SentenceItem['visualEffect']>;

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

export function useSentencesEditor(initialSentences: SentenceItem[] = []) {
  const [sentences, setSentences] = useState<SentenceItem[]>(initialSentences);

  const handleTransitionToNextChange = useCallback(
    (index: number, value: TransitionType | null) => {
      setSentences((prev) =>
        prev.map((s, i) =>
          i === index
            ? {
                ...s,
                transitionToNext: value,
              }
            : s,
        ),
      );
    },
    [],
  );

  const handleSentenceForcedCharacterKeysChange = useCallback(
    (index: number, next: string[] | null) => {
      setSentences((prev) =>
        prev.map((s, i) =>
          i === index
            ? {
                ...s,
                forcedCharacterKeys:
                  Array.isArray(next)
                    ? Array.from(new Set(next.filter(Boolean)))
                    : null,
              }
            : s,
        ),
      );
    },
    [],
  );

  const handleSentenceForcedEraKeyChange = useCallback(
    (index: number, next: string | null) => {
      setSentences((prev) =>
        prev.map((s, i) =>
          i === index
            ? {
                ...s,
                forcedEraKey: next === null ? null : String(next).trim(),
              }
            : s,
        ),
      );
    },
    [],
  );

  const handleSentenceVisualEffectChange = useCallback(
    (index: number, value: VisualEffectType | null) => {
      setSentences((prev) =>
        prev.map((s, i) =>
          i === index
            ? {
                ...s,
                visualEffect: value,
              }
            : s,
        ),
      );
    },
    [],
  );

  const handleSentenceTextChange = useCallback((index: number, text: string) => {
    setSentences((prev) => {
      const current = prev[index];
      if (!current) return prev;
      if (current.text === text) return prev;

      const next = [...prev];
      next[index] = { ...current, text };
      return next;
    });
  }, []);

  const handleMergeSentenceIntoPrevious = useCallback((index: number) => {
    setSentences((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const targetIndex = index - 1;
      const target = prev[targetIndex];
      const source = prev[index];
      if (!target || !source) return prev;

      const next = prev.map((item, i) =>
        i === targetIndex
          ? { ...item, text: mergeSentenceText(item.text, source.text) }
          : item,
      );
      next.splice(index, 1);
      return next;
    });
  }, []);

  const handleMergeSentenceIntoNext = useCallback((index: number) => {
    setSentences((prev) => {
      if (index < 0 || index >= prev.length - 1) return prev;
      const targetIndex = index + 1;
      const target = prev[targetIndex];
      const source = prev[index];
      if (!target || !source) return prev;

      const next = prev.map((item, i) =>
        i === targetIndex
          ? { ...item, text: mergeSentenceText(item.text, source.text) }
          : item,
      );
      next.splice(index, 1);
      return next;
    });
  }, []);

  const handleDeleteSentence = useCallback((index: number) => {
    setSentences((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleInsertEmptySentenceAfter = useCallback((index: number): string => {
    const newId = createClientId('sentence');

    setSentences((prev) => {
      if (index < 0 || index >= prev.length) return prev;

      const empty: SentenceItem = {
        id: newId,
        text: '',
        sceneTab: 'image',
        mediaMode: 'single',
        soundEffects: [],
        transitionSoundEffects: [],
        characterKeys: null,
        eraKey: null,
        forcedEraKey: null,
        videoGenerationMode: 'referenceImage',
        videoPrompt: null,
        referenceImage: null,
        referenceImageUrl: null,
        isGeneratingReferenceImage: false,
        forcedCharacterKeys: null,
        transitionToNext: null,
        visualEffect: null,
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

  const handleAddSuspenseScene = useCallback((sourceIndex: number) => {
    setSentences((prev) => {
      const source = prev[sourceIndex];
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

      const withoutExistingSuspense = prev.filter((s) => !s.isSuspense);
      return [copy, ...withoutExistingSuspense];
    });
  }, []);

  return {
    sentences,
    setSentences,
    handleSentenceForcedCharacterKeysChange,
    handleSentenceForcedEraKeyChange,
    handleSentenceVisualEffectChange,
    handleTransitionToNextChange,
    handleSentenceTextChange,
    handleMergeSentenceIntoPrevious,
    handleMergeSentenceIntoNext,
    handleDeleteSentence,
    handleInsertEmptySentenceAfter,
    handleAddSuspenseScene,
  };
}
