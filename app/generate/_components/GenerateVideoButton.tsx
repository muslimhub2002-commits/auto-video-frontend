'use client';

import { Button } from '@/components/ui/button';
import { useMemo, useRef, useState } from 'react';
import { Loader2, Sparkles, Upload, Video } from 'lucide-react';

interface GenerateVideoButtonProps {
  isGenerating: boolean;
  videoJobStatus: string | null;
  script: string;
  voiceOver: File | null;
  onGenerate: () => void;
  onUploadVideo: (file: File) => Promise<void> | void;
  isUploadingVideo: boolean;
}

export function GenerateVideoButton({
  isGenerating,
  videoJobStatus,
  script,
  voiceOver,
  onGenerate,
  onUploadVideo,
  isUploadingVideo,
}: GenerateVideoButtonProps) {
  const MAX_UPLOAD_MB = 250;
  const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

  const isJobInProgress = !!videoJobStatus && videoJobStatus !== 'completed';
  const isDisabled =
    isGenerating ||
    isJobInProgress ||
    !script.trim() ||
    !voiceOver;

  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedVideoLabel = useMemo(() => {
    if (!selectedVideo) return null;
    const mb = selectedVideo.size / (1024 * 1024);
    const sizeLabel = Number.isFinite(mb) ? `${mb.toFixed(1)} MB` : '';
    return `${selectedVideo.name}${sizeLabel ? ` • ${sizeLabel}` : ''}`;
  }, [selectedVideo]);

  const uploadDisabled = isGenerating || isJobInProgress || isUploadingVideo;

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedVideo) return;
    await onUploadVideo(selectedVideo);
    setSelectedVideo(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="px-6 pb-6 pt-4">
      {/* Upload video */}
      <div className="mb-4 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-br from-purple-400 to-blue-500 blur-md opacity-30 rounded-xl"></div>
              <div className="relative p-2.5 bg-linear-to-br from-purple-600 to-blue-600 rounded-xl shadow-lg">
                <Upload className="h-5 w-5 text-white" />
              </div>
            </div>

            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900">Upload a video instead</h4>
              <p className="text-xs text-gray-600 mt-0.5">MP4 recommended. We’ll treat this like a generated video.</p>

              <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                <input
                  ref={inputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) {
                      setSelectedVideo(null);
                      setUploadError(null);
                      return;
                    }

                    const isVideoMime = String(file.type || '').toLowerCase().startsWith('video/');
                    if (!isVideoMime) {
                      setSelectedVideo(null);
                      setUploadError('Please choose a valid video file.');
                      if (inputRef.current) inputRef.current.value = '';
                      return;
                    }

                    if (file.size > MAX_UPLOAD_BYTES) {
                      setSelectedVideo(null);
                      setUploadError(`Video is too large. Max size is ${MAX_UPLOAD_MB} MB.`);
                      if (inputRef.current) inputRef.current.value = '';
                      return;
                    }

                    setUploadError(null);
                    setSelectedVideo(file);
                  }}
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <Video className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-gray-700 truncate">
                      {selectedVideoLabel ?? 'No video selected'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50"
                    onClick={handlePick}
                    disabled={uploadDisabled}
                  >
                    Choose
                  </Button>
                  <Button
                    type="button"
                    className="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={() => void handleUpload()}
                    disabled={uploadDisabled || !selectedVideo}
                  >
                    {isUploadingVideo ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {isJobInProgress ? (
                <p className="mt-2 text-xs text-amber-700">Upload is disabled while a video job is running.</p>
              ) : null}

              {uploadError ? (
                <p className="mt-2 text-xs text-red-600">{uploadError}</p>
              ) : (
                <p className="mt-2 text-xs text-gray-500">Max upload size: {MAX_UPLOAD_MB} MB.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute -inset-1 bg-linear-to-r from-pink-600 via-purple-600 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
        <Button
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
