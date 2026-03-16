'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type ImageModelOption = {
  value: string;
  label: string;
  provider?: string;
  isDefault?: boolean;
  providerKey?: ImageProviderKey;
};

export type ImageProviderKey =
  | 'leonardo'
  | 'openai'
  | 'grok'
  | 'gemini'
  | 'modelslab';

export type ImageProviderOption = {
  value: ImageProviderKey;
  label: string;
};

const PROVIDER_OPTIONS: ImageProviderOption[] = [
  { value: 'leonardo', label: 'Leonardo' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'grok', label: 'Grok' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'modelslab', label: 'ModelsLab' },
];

const FALLBACK_LEONARDO_OPTION: ImageModelOption = {
  value: 'leonardo',
  label: 'Leonardo AI - Server Default',
  provider: 'Leonardo',
  isDefault: true,
  providerKey: 'leonardo',
};

const STATIC_NON_LEONARDO_OPTIONS: ImageModelOption[] = [
  {
    value: 'grok-imagine-image',
    label: 'grok-imagine-image',
    provider: 'Grok',
    providerKey: 'grok',
  },
  {
    value: 'gpt-image-1',
    label: 'gpt-image-1',
    provider: 'OpenAI',
    providerKey: 'openai',
  },
  {
    value: 'gpt-image-1-mini',
    label: 'gpt-image-1-mini',
    provider: 'OpenAI',
    providerKey: 'openai',
  },
  {
    value: 'gpt-image-1.5',
    label: 'gpt-image-1.5',
    provider: 'OpenAI',
    providerKey: 'openai',
  },
  {
    value: 'modelslab:flux',
    label: 'Flux',
    provider: 'ModelsLab',
    providerKey: 'modelslab',
  },
  {
    value: 'modelslab:flux-2-pro',
    label: 'Flux 2 Pro',
    provider: 'ModelsLab',
    providerKey: 'modelslab',
  },
  {
    value: 'imagen-4',
    label: 'Imagen 4',
    provider: 'Gemini',
    providerKey: 'gemini',
  },
  {
    value: 'imagen-4-ultra',
    label: 'Imagen 4 Ultra',
    provider: 'Gemini',
    providerKey: 'gemini',
  },
];

type LeonardoModelApiItem = {
  id?: string;
  value?: string;
  name?: string;
  provider?: string;
  label?: string;
  isDefault?: boolean;
};

const isImageModelOption = (
  option: ImageModelOption | null,
): option is ImageModelOption => Boolean(option);

const dedupeImageModelOptions = (options: ImageModelOption[]) =>
  options.filter(
    (
      option: ImageModelOption,
      index: number,
      collection: ImageModelOption[],
    ) =>
      collection.findIndex(
        (candidate: ImageModelOption) => candidate.value === option.value,
      ) === index,
  );

const getProviderKeyForImageModel = (value: string): ImageProviderKey => {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (normalized.startsWith('leonardo')) return 'leonardo';
  if (normalized.startsWith('gpt-image-')) return 'openai';
  if (normalized === 'grok-imagine-image') return 'grok';
  if (normalized.startsWith('imagen-')) return 'gemini';
  if (normalized.startsWith('modelslab:')) return 'modelslab';

  return 'leonardo';
};

const humanizeLeonardoModelLabel = (option: ImageModelOption): string => {
  const label = String(option.label ?? '').trim();
  const provider = String(option.provider ?? '').trim();
  if (!label) return 'Leonardo model';
  if (!provider || provider.toLowerCase() === 'leonardo') {
    return label.replace(/^Leonardo\s*-\s*/i, '');
  }
  return label;
};

export function useImageModelOptions(params: {
  selectedValue: string;
  onSelectedValueChange: (value: string) => void;
  enabled?: boolean;
}) {
  const { selectedValue, onSelectedValueChange, enabled = true } = params;
  const [leonardoOptions, setLeonardoOptions] = useState<ImageModelOption[]>([]);
  const [isLoadingLeonardoOptions, setIsLoadingLeonardoOptions] =
    useState(false);
  const [leonardoOptionsError, setLeonardoOptionsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isCancelled = false;

    const loadLeonardoOptions = async () => {
      setIsLoadingLeonardoOptions(true);
      setLeonardoOptionsError(null);

      try {
        const response = await api.get('/ai/leonardo-models');
        const models = Array.isArray(response?.data?.models)
          ? response.data.models
          : [];

        const nextOptionsRaw = models
          .map((raw: LeonardoModelApiItem): ImageModelOption | null => {
            const id = String(raw?.id ?? '').trim();
            const value = String(raw?.value ?? (id ? `leonardo:${id}` : '')).trim();
            const label = String(raw?.label ?? raw?.name ?? value).trim();

            if (!value || !label) {
              return null;
            }

            return {
              value,
              label: humanizeLeonardoModelLabel({
                value,
                label,
                provider: String(raw?.provider ?? 'Leonardo').trim() || 'Leonardo',
              }),
              provider: String(raw?.provider ?? 'Leonardo').trim() || 'Leonardo',
              isDefault: Boolean(raw?.isDefault),
              providerKey: 'leonardo',
            };
          })
          .filter(isImageModelOption);

        const nextOptions = dedupeImageModelOptions(nextOptionsRaw);

        if (!isCancelled) {
          setLeonardoOptions(nextOptions);
        }
      } catch (error) {
        if (!isCancelled) {
          setLeonardoOptions([]);
          setLeonardoOptionsError(
            error instanceof Error
              ? error.message
              : 'Failed to load Leonardo models',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingLeonardoOptions(false);
        }
      }
    };

    void loadLeonardoOptions();

    return () => {
      isCancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || selectedValue !== 'leonardo' || leonardoOptions.length === 0) {
      return;
    }

    const defaultLeonardoOption =
      leonardoOptions.find((option) => option.isDefault) ?? null;

    if (defaultLeonardoOption?.value) {
      onSelectedValueChange(defaultLeonardoOption.value);
    }
  }, [enabled, leonardoOptions, onSelectedValueChange, selectedValue]);

  const currentLeonardoOption: ImageModelOption[] =
    selectedValue.startsWith('leonardo:') &&
    !leonardoOptions.some((option) => option.value === selectedValue)
      ? [
          {
            value: selectedValue,
            label: 'Selected model',
            provider: 'Leonardo',
            providerKey: 'leonardo',
          },
        ]
      : [];

  const imageModelOptions = [
    ...currentLeonardoOption,
    ...(leonardoOptions.length > 0 ? leonardoOptions : [FALLBACK_LEONARDO_OPTION]),
    ...STATIC_NON_LEONARDO_OPTIONS,
  ];

  const selectedProvider = getProviderKeyForImageModel(selectedValue);
  const modelOptions = imageModelOptions.filter(
    (option) => (option.providerKey ?? getProviderKeyForImageModel(option.value)) === selectedProvider,
  );

  const selectedModelValue = modelOptions.some((option) => option.value === selectedValue)
    ? selectedValue
    : modelOptions[0]?.value ?? selectedValue;

  const handleProviderChange = (provider: ImageProviderKey) => {
    const nextOptions = imageModelOptions.filter(
      (option) => (option.providerKey ?? getProviderKeyForImageModel(option.value)) === provider,
    );
    const defaultOption =
      nextOptions.find((option) => option.isDefault) ?? nextOptions[0] ?? null;

    if (defaultOption?.value) {
      onSelectedValueChange(defaultOption.value);
    }
  };

  const handleModelChange = (value: string) => {
    onSelectedValueChange(value);
  };

  return {
    providerOptions: PROVIDER_OPTIONS,
    selectedProvider,
    selectedModelValue,
    modelOptions,
    onProviderChange: handleProviderChange,
    onModelChange: handleModelChange,
    imageModelOptions,
    isLoadingLeonardoOptions,
    leonardoOptionsError,
  };
}