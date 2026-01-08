'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Video, Download, Play, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { YouTubeUploadModal } from './YouTubeUploadModal';

interface VideoStatusCardProps {
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

export function VideoStatusCard({
    videoJobId,
    videoJobStatus,
    videoJobError,
    videoUrl,
    script,
    onSaveGeneration,
    isSavingGeneration,
    canSaveGeneration,
    onRetry,
}: VideoStatusCardProps) {
    const [isVideoPaused, setIsVideoPaused] = useState(true);
    const [showYouTubeModal, setShowYouTubeModal] = useState(false);

    if (!videoJobId) return null;

    const isProcessing =
        videoJobStatus === 'queued' ||
        videoJobStatus === 'pending' ||
        videoJobStatus === 'processing' ||
        videoJobStatus === 'rendering';
    const isCompleted = videoJobStatus === 'completed';
    const isFailed = videoJobStatus === 'failed';

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {/* Processing State */}
            {isProcessing && !isCompleted && !isFailed && (
                <div className="relative">
                    {/* Animated gradient background */}
                    <div className="absolute inset-0 bg-linear-to-r from-purple-50 via-pink-50 to-blue-50 animate-gradient-x"></div>

                    <div className="relative p-8">
                        <div className="flex flex-col items-center text-center space-y-6">
                            {/* Animated spinner with glow */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                                <div className="relative bg-white rounded-full p-6 shadow-lg">
                                    <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
                                </div>
                            </div>

                            {/* Status text */}
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-gray-900">
                                    Creating Your Video
                                </h3>
                                <p className="text-gray-600 max-w-md">
                                    Our AI is crafting your video with the perfect timing and transitions. This usually takes 30-60 seconds.
                                </p>
                            </div>

                            {/* Progress indicator */}
                            <div className="w-full max-w-md">
                                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                    <span>Processing...</span>
                                    <span className="text-purple-600 font-medium">{videoJobStatus?.toUpperCase()}</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 rounded-full animate-progress"></div>
                                </div>
                            </div>

                            {/* Fun fact or tip */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                                <p className="text-sm text-blue-900">
                                    <span className="font-semibold">💡 Tip:</span> While you wait, your video is being rendered with AI-optimized scene transitions and audio synchronization.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Completed State */}
            {isCompleted && videoUrl && (
                <div>
                    {/* Success header */}
                    <div className="bg-linear-to-r from-green-50 via-emerald-50 to-teal-50 p-6 border-b border-green-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500 rounded-full">
                                <CheckCircle2 className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Video Ready!</h3>
                                <p className="text-sm text-gray-600">Your AI-generated video has been created successfully</p>
                            </div>
                        </div>
                    </div>

                    {/* Video player */}
                    <div className="p-6 space-y-4">
                        <div className="relative group rounded-xl overflow-hidden shadow-2xl w-1/3 mx-auto">
                            <video
                                src={videoUrl}
                                controls
                                className="w-full rounded-lg"
                                poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3C/svg%3E"
                                onPlay={() => setIsVideoPaused(false)}
                                onPause={() => setIsVideoPaused(true)}
                            />

                            {/* Play overlay hint - only show when paused */}
                            {isVideoPaused && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="p-4 bg-white/90 rounded-full shadow-lg">
                                            <Play className="h-8 w-8 text-gray-900" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3">
                            <Button
                                asChild
                                className="flex-1 bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                            >
                                <a href={videoUrl} target='_blank' download="ai-generated-video.mp4">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Video
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 min-w-35 bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white hover:text-white border-0 shadow-md hover:shadow-lg transition-all group"
                                onClick={() => setShowYouTubeModal(true)}
                            >
                                <svg
                                    className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                                Upload to YouTube
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 min-w-35 border-gray-300 hover:bg-gray-50"
                                onClick={() => {
                                    if (navigator.share && videoUrl) {
                                        navigator.share({
                                            title: 'My AI Generated Video',
                                            url: videoUrl,
                                        }).catch(() => { });
                                    }
                                }}
                            >
                                <Video className="h-4 w-4 mr-2" />
                                Share
                            </Button>
                            <Button
                                type="button"
                                onClick={onSaveGeneration}
                                disabled={isSavingGeneration || !canSaveGeneration}
                                className="flex-1 min-w-35 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                size="sm"
                            >
                                {isSavingGeneration ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span className="font-medium">Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        <span className="font-medium">Save</span>
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Video stats */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">HD</div>
                                <div className="text-xs text-gray-500">Quality</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">MP4</div>
                                <div className="text-xs text-gray-500">Format</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">✓</div>
                                <div className="text-xs text-gray-500">AI Enhanced</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <YouTubeUploadModal
                isOpen={showYouTubeModal}
                onClose={() => setShowYouTubeModal(false)}
                videoUrl={videoUrl}
                script={script}
                onSaveGeneration={onSaveGeneration}
            />

            {/* Failed State */}
            {isFailed && (
                <div className="p-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-4 bg-red-100 rounded-full">
                            <XCircle className="h-12 w-12 text-red-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-gray-900">Generation Failed</h3>
                            <p className="text-gray-600 max-w-md">
                                {videoJobError || 'Something went wrong while creating your video.'}
                            </p>
                        </div>
                        <Button
                            onClick={onRetry}
                            variant="outline"
                            className="mt-4"
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
