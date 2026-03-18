'use client';

import { memo, useEffect, useRef } from 'react';

type SentenceTextEditorProps = {
  text: string;
  onCommit: (next: string) => void;
  className?: string;
  rows?: number;
  placeholder?: string;
};

function SentenceTextEditorComponent({
  text,
  onCommit,
  className,
  rows = 3,
  placeholder,
}: SentenceTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftTextRef = useRef<string>(String(text ?? ''));
  const isComposingRef = useRef(false);

  const commitText = (next: string) => {
    onCommit(next);
  };

  useEffect(() => {
    const next = String(text ?? '');
    draftTextRef.current = next;

    const element = textareaRef.current;
    if (!element) return;

    const isFocused = typeof document !== 'undefined' && document.activeElement === element;
    if (isFocused) return;
    if (element.value === next) return;
    element.value = next;
  }, [text]);

  return (
    <textarea
      ref={textareaRef}
      defaultValue={text}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={(event) => {
        isComposingRef.current = false;
        const next = event.currentTarget.value;
        draftTextRef.current = next;
        commitText(next);
      }}
      onChange={(event) => {
        const next = event.target.value;
        draftTextRef.current = next;
        if (isComposingRef.current) return;
        commitText(next);
      }}
      onBlur={(event) => {
        commitText(event.currentTarget.value);
      }}
      className={className}
      rows={rows}
      placeholder={placeholder}
    />
  );
}

export const SentenceTextEditor = memo(
  SentenceTextEditorComponent,
  (prev, next) =>
    prev.text === next.text &&
    prev.className === next.className &&
    prev.rows === next.rows &&
    prev.placeholder === next.placeholder,
);