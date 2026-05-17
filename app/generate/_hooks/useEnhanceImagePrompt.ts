'use client';

import { useEffect, useRef, useState } from 'react';
import type { SentenceItem } from '../_types/sentences';

type UseEnhanceImagePromptArgs = {
  sentences: SentenceItem[];
  apiUrl: string;
  onGenerateSentenceImage: (index: number, promptOverride?: string) => void | Promise<void>;
};

export function useEnhanceImagePrompt({
  sentences,
  apiUrl,
  onGenerateSentenceImage,
}: UseEnhanceImagePromptArgs) {
  const [applyingImagePromptById, setApplyingImagePromptById] = useState<Record<string, boolean>>({});
  const [imagePromptErrorById, setImagePromptErrorById] = useState<Record<string, string | undefined>>({});

  const [enhanceImagePromptModalOpen, setEnhanceImagePromptModalOpen] = useState(false);
  const [enhanceImagePromptTargetIndex, setEnhanceImagePromptTargetIndex] = useState<number | null>(null);
  const [enhanceImagePromptTargetId, setEnhanceImagePromptTargetId] = useState<string | null>(null);
  const [enhanceImagePromptText, setEnhanceImagePromptText] = useState('');
  const [enhanceImagePromptError, setEnhanceImagePromptError] = useState<string | null>(null);
  const [isEnhancingImagePromptText, setIsEnhancingImagePromptText] = useState(false);

  const enhanceImagePromptAbortRef = useRef<AbortController | null>(null);

  const streamEnhanceImagePrompt = async (params: {
    prompt: string;
    signal?: AbortSignal;
    onChunk: (chunk: string) => void;
  }) => {
    const res = await fetch(`${apiUrl}/ai/enhance-image-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: params.signal,
      body: JSON.stringify({
        prompt: params.prompt,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error('Failed to start image prompt enhancement');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) params.onChunk(chunk);
    }
  };

  const openEnhanceImagePromptModal = (index: number) => {
    const item = sentences[index];
    if (!item?.id) return;

    enhanceImagePromptAbortRef.current?.abort();
    enhanceImagePromptAbortRef.current = null;
    setIsEnhancingImagePromptText(false);
    setEnhanceImagePromptError(null);
    setEnhanceImagePromptTargetIndex(index);
    setEnhanceImagePromptTargetId(item.id);
    setEnhanceImagePromptText((item.imagePrompt ?? '').trim());
    setEnhanceImagePromptModalOpen(true);
  };

  const closeEnhanceImagePromptModal = () => {
    enhanceImagePromptAbortRef.current?.abort();
    enhanceImagePromptAbortRef.current = null;
    setIsEnhancingImagePromptText(false);
    setEnhanceImagePromptModalOpen(false);
    setEnhanceImagePromptTargetIndex(null);
    setEnhanceImagePromptTargetId(null);
  };

  const makeImagePromptMoreDescriptive = async () => {
    const currentPrompt = enhanceImagePromptText.trim();
    if (!currentPrompt) return;

    setEnhanceImagePromptError(null);
    enhanceImagePromptAbortRef.current?.abort();

    const controller = new AbortController();
    enhanceImagePromptAbortRef.current = controller;
    setIsEnhancingImagePromptText(true);

    let nextText = '';
    setEnhanceImagePromptText('');

    try {
      await streamEnhanceImagePrompt({
        prompt: currentPrompt,
        signal: controller.signal,
        onChunk: (chunk) => {
          nextText += chunk;
          setEnhanceImagePromptText(nextText);
        },
      });

      if (!nextText.trim()) {
        setEnhanceImagePromptText(currentPrompt);
      }
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      if (!aborted) {
        console.error('Enhance image prompt text failed', error);
        setEnhanceImagePromptError(
          'Failed to make the prompt more descriptive. Please try again.',
        );
        setEnhanceImagePromptText(currentPrompt);
      }
    } finally {
      if (enhanceImagePromptAbortRef.current === controller) {
        enhanceImagePromptAbortRef.current = null;
      }
      setIsEnhancingImagePromptText(false);
    }
  };

  const applyEnhanceImagePrompt = async () => {
    if (enhanceImagePromptTargetIndex === null || !enhanceImagePromptTargetId) return;
    if (isEnhancingImagePromptText) return;

    const prompt = enhanceImagePromptText.trim();
    if (!prompt) return;

    setEnhanceImagePromptError(null);
    setImagePromptErrorById((prev) => ({ ...prev, [enhanceImagePromptTargetId]: undefined }));
    setApplyingImagePromptById((prev) => ({ ...prev, [enhanceImagePromptTargetId]: true }));

    try {
      await Promise.resolve(onGenerateSentenceImage(enhanceImagePromptTargetIndex, prompt));
      closeEnhanceImagePromptModal();
    } catch (error) {
      console.error('Enhance image prompt failed', error);
      const message = 'Failed to regenerate image with your prompt. Please try again.';
      setEnhanceImagePromptError(message);
      setImagePromptErrorById((prev) => ({ ...prev, [enhanceImagePromptTargetId]: message }));
    } finally {
      setApplyingImagePromptById((prev) => ({ ...prev, [enhanceImagePromptTargetId]: false }));
    }
  };

  useEffect(() => {
    return () => {
      enhanceImagePromptAbortRef.current?.abort();
    };
  }, []);

  return {
    applyingImagePromptById,
    imagePromptErrorById,

    enhanceImagePromptModalOpen,
    setEnhanceImagePromptModalOpen,
    enhanceImagePromptTargetIndex,
    setEnhanceImagePromptTargetIndex,
    enhanceImagePromptTargetId,
    setEnhanceImagePromptTargetId,
    enhanceImagePromptText,
    setEnhanceImagePromptText,
    enhanceImagePromptError,
    setEnhanceImagePromptError,
    isEnhancingImagePromptText,

    openEnhanceImagePromptModal,
    closeEnhanceImagePromptModal,
    makeImagePromptMoreDescriptive,
    applyEnhanceImagePrompt,
  };
}
