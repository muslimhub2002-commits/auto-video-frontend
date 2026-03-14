'use client';

import { useState } from 'react';
import { API_URL } from '@/lib/api';

type UseAiSearchTermArgs = {
  medium: 'image' | 'video';
  scriptContext?: string | null;
  sentenceContext?: string | null;
};

const condenseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'this',
  'to',
  'was',
  'with',
]);

const truncateScriptContext = (value: string, maxLength = 2400) => {
  if (value.length <= maxLength) return value;

  const headLength = Math.floor(maxLength * 0.65);
  const tailLength = Math.max(0, maxLength - headLength - 20);
  return `${value.slice(0, headLength).trim()} ... ${value.slice(-tailLength).trim()}`;
};

const normalizeSearchTerm = (value: string) => condenseWhitespace(String(value ?? ''));

export function useAiSearchTerm({ medium, scriptContext, sentenceContext }: UseAiSearchTermArgs) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSearchTerm = async () => {
    const sentence = condenseWhitespace(String(sentenceContext ?? ''));
    const script = condenseWhitespace(String(scriptContext ?? ''));

    if (!sentence) {
      const message = 'No active sentence is available for AI search.';
      setError(message);
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/ai/generate-media-search-term`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medium,
          sentence,
          script: truncateScriptContext(script || sentence),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI search term');
      }

      const data = (await response.json()) as { searchTerm?: string };
      const searchTerm = normalizeSearchTerm(data?.searchTerm ?? '');
      if (!searchTerm) {
        throw new Error('AI returned an empty search term');
      }

      return searchTerm;
    } catch (requestError) {
      console.error(`Failed to generate AI ${medium} search term:`, requestError);
      setError('Failed to generate a search term. Please try again.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    error,
    setError,
    generateSearchTerm,
  };
}