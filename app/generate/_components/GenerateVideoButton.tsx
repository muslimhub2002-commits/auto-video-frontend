'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Video } from 'lucide-react';

interface GenerateVideoButtonProps {
  isGenerating: boolean;
  videoJobStatus: string | null;
  script: string;
  voiceOver: File | null;
  onGenerate: () => void;
}

export function GenerateVideoButton({
  isGenerating,
  videoJobStatus,
  script,
  voiceOver,
  onGenerate,
}: GenerateVideoButtonProps) {
  const isJobInProgress = !!videoJobStatus && videoJobStatus !== 'completed';
  const isDisabled =
    isGenerating ||
    isJobInProgress ||
    !script.trim() ||
    !voiceOver;

  return (
    <div className="px-6 pb-6 pt-4">
      <div className="relative">
        <div className="absolute -inset-1 bg-linear-to-r from-pink-600 via-purple-600 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={isDisabled}
          className="relative w-full bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
          size="lg"
        >
          {isGenerating || isJobInProgress ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span className="font-semibold">Generating Video...</span>
            </>
          ) : (
            <>
              <Video className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Generate Video</span>
              <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
