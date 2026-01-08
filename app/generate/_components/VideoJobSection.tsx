'use client';

import { VideoStatusCard } from './VideoStatusCard';

interface VideoJobSectionProps {
  videoJobId: string | null;
  videoJobStatus: string | null;
  videoJobError: string | null;
  videoUrl: string | null;
  script: string;
  onSaveGeneration: () => Promise<void>;
  isSavingGeneration: boolean;
  canSaveGeneration: boolean;
  onRetry?: () => void;
}

export function VideoJobSection({
  videoJobId,
  videoJobStatus,
  videoJobError,
  videoUrl,
  script,
  onSaveGeneration,
  isSavingGeneration,
  canSaveGeneration,
  onRetry,
}: VideoJobSectionProps) {
  return (
    <>
      {/* Skeleton while job exists but status not yet loaded */}
      {videoJobId && !videoJobStatus && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden animate-pulse">
          <div className="p-8">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="space-y-3 w-full max-w-md">
                <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto"></div>
              </div>
              <div className="w-full max-w-md h-2 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      <VideoStatusCard
        videoJobId={videoJobId}
        videoJobStatus={videoJobStatus}
        videoJobError={videoJobError}
        videoUrl={videoUrl}
        script={script}
        onSaveGeneration={onSaveGeneration}
        isSavingGeneration={isSavingGeneration}
        canSaveGeneration={canSaveGeneration}
        onRetry={onRetry}
      />
    </>
  );
}
