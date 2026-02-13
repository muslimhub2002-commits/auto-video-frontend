'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type LlmModelSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function LlmModelSelect({
  value,
  onValueChange,
  label = 'Model',
  disabled,
  placeholder,
}: LlmModelSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4.5</SelectItem>
        <SelectItem value="claude-sonnet-4-0">Claude Sonnet 4.0</SelectItem>

        <SelectItem value="claude-opus-4-5">Claude Opus 4.5</SelectItem>
        <SelectItem value="claude-opus-4-0">Claude Opus 4.0</SelectItem>

        <SelectItem value="claude-haiku-4-5">Claude Haiku 4.5</SelectItem>
        <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>

        <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
        <SelectItem value="gpt-4.1-mini">GPT-4.1 mini</SelectItem>
        <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
        <SelectItem value="gpt-5">GPT-5</SelectItem>
        <SelectItem value="gpt-5.1">GPT-5.1</SelectItem>
        <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
      </SelectContent>
    </Select>
  );
}
