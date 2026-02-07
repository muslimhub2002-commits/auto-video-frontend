'use client';

import { useEffect, useState } from 'react';
import type { SentenceItem } from '../_types/sentences';

type StreamEnhanceSentenceArgs = {
  sentence: string;
  userPrompt?: string;
  onChunk: (chunk: string) => void;
};

type UseSentenceEnhancementArgs = {
  sentences: SentenceItem[];
  apiUrl: string;
  onSentenceTextChange: (index: number, next: string) => void;
};

export function useSentenceEnhancement({
  sentences,
  apiUrl,
  onSentenceTextChange,
}: UseSentenceEnhancementArgs) {
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [enhancingById, setEnhancingById] = useState<Record<string, boolean>>({});
  const [enhanceMenuOpenById, setEnhanceMenuOpenById] = useState<Record<string, boolean>>({});

  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [promptTargetIndex, setPromptTargetIndex] = useState<number | null>(null);
  const [promptOriginalSentence, setPromptOriginalSentence] = useState('');
  const [promptEnhancedSentence, setPromptEnhancedSentence] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isApplyingPrompt, setIsApplyingPrompt] = useState(false);

  const streamEnhanceSentence = async ({ sentence, userPrompt: prompt, onChunk }: StreamEnhanceSentenceArgs) => {
    const body = {
      sentence,
      userPrompt: prompt?.trim() ? prompt.trim() : undefined,
    } as const;

    const res = await fetch(`${apiUrl}/ai/enhance-sentence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      throw new Error('Failed to start sentence enhancement');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) onChunk(chunk);
    }
  };

  const handleEnhanceSentenceWithAi = async (index: number) => {
    const item = sentences[index];
    const base = item?.text ?? '';
    if (!item?.id || !base.trim()) return;

    setEnhanceError(null);
    setEnhancingById((prev) => ({ ...prev, [item.id]: true }));
    setEnhanceMenuOpenById((prev) => ({ ...prev, [item.id]: false }));

    try {
      let nextText = '';
      let started = false;

      await streamEnhanceSentence({
        sentence: base,
        onChunk: (chunk) => {
          if (!started) {
            started = true;
            nextText = '';
            onSentenceTextChange(index, '');
          }
          nextText += chunk;
          onSentenceTextChange(index, nextText);
        },
      });
    } catch (error) {
      console.error('Enhance sentence failed', error);
      setEnhanceError('Failed to enhance sentence. Please try again.');
      onSentenceTextChange(index, item.text);
    } finally {
      setEnhancingById((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const openPromptEnhanceModal = (index: number) => {
    const item = sentences[index];
    const base = item?.text ?? '';
    setEnhanceError(null);
    setPromptTargetIndex(index);
    setPromptOriginalSentence(base);
    setPromptEnhancedSentence(base);
    setUserPrompt('');
    setPromptModalOpen(true);

    if (item?.id) {
      setEnhanceMenuOpenById((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const closePromptModal = () => {
    setPromptModalOpen(false);
    setPromptTargetIndex(null);
  };

  const applyPromptEnhancement = async () => {
    if (promptTargetIndex === null) return;
    const current = promptEnhancedSentence.trim();
    if (!current) return;

    setEnhanceError(null);
    setIsApplyingPrompt(true);

    try {
      let nextText = '';
      setPromptEnhancedSentence('');

      await streamEnhanceSentence({
        sentence: current,
        userPrompt,
        onChunk: (chunk) => {
          nextText += chunk;
          setPromptEnhancedSentence(nextText);
        },
      });
    } catch (error) {
      console.error('Enhance with prompt failed', error);
      setEnhanceError('Failed to enhance with your prompt. Please try again.');
      setPromptEnhancedSentence(current);
    } finally {
      setIsApplyingPrompt(false);
    }
  };

  const acceptPromptEnhancement = () => {
    if (promptTargetIndex === null) return;
    const finalText = promptEnhancedSentence.trim();
    if (!finalText) return;
    onSentenceTextChange(promptTargetIndex, finalText);
    closePromptModal();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-enhance-menu]') && !target.closest('[data-enhance-button]')) {
        setEnhanceMenuOpenById({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return {
    enhanceError,
    setEnhanceError,
    enhancingById,
    enhanceMenuOpenById,
    setEnhanceMenuOpenById,

    promptModalOpen,
    promptOriginalSentence,
    promptEnhancedSentence,
    setPromptEnhancedSentence,
    userPrompt,
    setUserPrompt,
    isApplyingPrompt,

    handleEnhanceSentenceWithAi,
    openPromptEnhanceModal,
    closePromptModal,
    applyPromptEnhancement,
    acceptPromptEnhancement,
  };
}
