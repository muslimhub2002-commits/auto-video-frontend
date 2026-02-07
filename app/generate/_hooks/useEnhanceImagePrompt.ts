'use client';

import { useState } from 'react';
import type { SentenceItem } from '../_types/sentences';

type UseEnhanceImagePromptArgs = {
  sentences: SentenceItem[];
  onGenerateSentenceImage: (index: number, promptOverride?: string) => void | Promise<void>;
};

export function useEnhanceImagePrompt({
  sentences,
  onGenerateSentenceImage,
}: UseEnhanceImagePromptArgs) {
  const [applyingImagePromptById, setApplyingImagePromptById] = useState<Record<string, boolean>>({});
  const [imagePromptErrorById, setImagePromptErrorById] = useState<Record<string, string | undefined>>({});

  const [enhanceImagePromptModalOpen, setEnhanceImagePromptModalOpen] = useState(false);
  const [enhanceImagePromptTargetIndex, setEnhanceImagePromptTargetIndex] = useState<number | null>(null);
  const [enhanceImagePromptTargetId, setEnhanceImagePromptTargetId] = useState<string | null>(null);
  const [enhanceImagePromptText, setEnhanceImagePromptText] = useState('');
  const [enhanceImagePromptError, setEnhanceImagePromptError] = useState<string | null>(null);

  const openEnhanceImagePromptModal = (index: number) => {
    const item = sentences[index];
    if (!item?.id) return;

    setEnhanceImagePromptError(null);
    setEnhanceImagePromptTargetIndex(index);
    setEnhanceImagePromptTargetId(item.id);
    setEnhanceImagePromptText((item.imagePrompt ?? '').trim());
    setEnhanceImagePromptModalOpen(true);
  };

  const closeEnhanceImagePromptModal = () => {
    setEnhanceImagePromptModalOpen(false);
    setEnhanceImagePromptTargetIndex(null);
    setEnhanceImagePromptTargetId(null);
  };

  const applyEnhanceImagePrompt = async () => {
    if (enhanceImagePromptTargetIndex === null || !enhanceImagePromptTargetId) return;
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

    openEnhanceImagePromptModal,
    closeEnhanceImagePromptModal,
    applyEnhanceImagePrompt,
  };
}
