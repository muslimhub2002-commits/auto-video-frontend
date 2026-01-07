'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Video, Download, Play, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

interface VideoStatusCardProps {
    videoJobId: string | null;
    videoJobStatus: string | null;
    videoJobError: string | null;
    videoUrl: string | null;
    script: string;
    onSaveGeneration: () => void;
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
    const [youtubeTitle, setYoutubeTitle] = useState('');
    const [youtubeDescription, setYoutubeDescription] = useState('');
    const [youtubeTags, setYoutubeTags] = useState('');
    const [isUploadingToYouTube, setIsUploadingToYouTube] = useState(false);
    const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
    const [seoError, setSeoError] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadedYoutubeUrl, setUploadedYoutubeUrl] = useState<string | null>(null);
    const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);

    const handleGenerateSeo = async () => {
        setSeoError(null);
        const trimmed = (script || '').trim();
        if (!trimmed) {
            setSeoError('No script available to generate SEO metadata.');
            return;
        }

        setIsGeneratingSeo(true);
        try {
            const res = await api.post('/ai/youtube-seo', { script: trimmed });
            const data = res.data as { title?: string; description?: string; tags?: string[] };

            if (data?.title) setYoutubeTitle(data.title);
            if (typeof data?.description === 'string') setYoutubeDescription(data.description);
            if (Array.isArray(data?.tags)) setYoutubeTags(data.tags.join(', '));
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to generate SEO metadata.';
            setSeoError(String(message));
        } finally {
            setIsGeneratingSeo(false);
        }
    };

    const handleConnectYouTube = async () => {
        setUploadError(null);
        setUploadedYoutubeUrl(null);
        setIsConnectingYouTube(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://auto-video-backend.vercel.app/youtube/auth-url', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                credentials: 'include',
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.message || 'Failed to get YouTube auth url');
            }
            const data = await response.json();
            const url = data?.url as string | undefined;
            if (!url) {
                throw new Error('Missing YouTube auth url');
            }
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to start YouTube connection.';
            setUploadError(String(message));
        } finally {
            setIsConnectingYouTube(false);
        }
    };

    const handleYouTubeUpload = async () => {
        setUploadError(null);
        setUploadedYoutubeUrl(null);

        if (!videoUrl) {
            setUploadError('Missing video URL. Generate the video first.');
            return;
        }

        if (!youtubeTitle.trim()) {
            setUploadError('Please enter a title for your YouTube video.');
            return;
        }

        setIsUploadingToYouTube(true);
        try {
            const tags = youtubeTags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);

            const token = localStorage.getItem('token');

            // 1) Save generation to chats/messages BEFORE uploading to YouTube (use api baseURL)
            await api.post('/messages/save-generation', {
                script,
                video_url: videoUrl,
            });

            // 2) Proceed to YouTube upload
            const response = await fetch('https://auto-video-backend.vercel.app/youtube/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    videoUrl,
                    title: youtubeTitle,
                    description: youtubeDescription,
                    tags,
                    privacyStatus: 'unlisted',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Upload failed');
            }

            const data = await response.json();
            const videoId = data?.videoId as string | undefined;
            if (!videoId) {
                throw new Error('Upload succeeded but missing videoId');
            }

            const url = `https://www.youtube.com/watch?v=${videoId}`;
            setUploadedYoutubeUrl(url);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                'Failed to upload to YouTube. Please try again.';
            setUploadError(String(message));

            // If the user hasn't connected YouTube yet, prompt them to connect.
            // Backend returns 400 for this precondition.
            if (String(message).toLowerCase().includes('youtube is not connected')) {
                // no-op: message already shown; user can click "Connect YouTube".
            }
        } finally {
            setIsUploadingToYouTube(false);
        }
    };

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
                                className="flex-1 min-w-[140px] bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white hover:text-white border-0 shadow-md hover:shadow-lg transition-all group"
                                onClick={() => setShowYouTubeModal(true)}
                            >
                                <svg 
                                    className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" 
                                    viewBox="0 0 24 24" 
                                    fill="currentColor"
                                >
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                                Upload to YouTube
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 min-w-[140px] border-gray-300 hover:bg-gray-50"
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
                                className="flex-1 min-w-[140px] bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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

            {/* YouTube Upload Modal */}
            {showYouTubeModal && (
                <div 
                    className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300" 
                    onClick={() => setShowYouTubeModal(false)}
                >
                    <div 
                        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full animate-in zoom-in-95 duration-300 overflow-hidden border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header - Fixed */}
                        <div className="relative bg-gradient-to-r from-red-600 via-red-600 to-red-700 px-8 py-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg">
                                        <svg className="h-7 w-7 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white drop-shadow-md">Upload to YouTube</h2>
                                        <p className="text-red-100 text-sm mt-0.5">Share your video with the world</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowYouTubeModal(false)}
                                    className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 group"
                                    aria-label="Close modal"
                                >
                                    <X className="h-5 w-5 text-white group-hover:rotate-90 transition-transform duration-200" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body - Scrollable with custom scrollbar */}
                        <div className="px-8 py-8 max-h-[calc(90vh-220px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 space-y-7">
                            
                            {/* Intro Message */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-blue-900 mb-1">Ready to publish?</h4>
                                        <p className="text-sm text-blue-700 leading-relaxed">
                                            Complete the form below to upload your AI-generated video to YouTube. All fields marked with <span className="text-red-600 font-semibold">*</span> are required.
                                        </p>

                                        <div className="mt-4 flex flex-wrap items-center gap-3">
                                            <Button
                                                type="button"
                                                onClick={handleConnectYouTube}
                                                disabled={isConnectingYouTube}
                                                variant="outline"
                                                className="border-2 border-blue-200 hover:border-blue-300 hover:bg-white text-blue-900"
                                                size="sm"
                                            >
                                                {isConnectingYouTube ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Connecting...
                                                    </>
                                                ) : (
                                                    <>Connect YouTube</>
                                                )}
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={handleGenerateSeo}
                                                disabled={isGeneratingSeo || !(script || '').trim()}
                                                className="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white hover:text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                size="sm"
                                            >
                                                {isGeneratingSeo ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Generating SEO...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="mr-2 h-4 w-4" />
                                                        Generate SEO with AI
                                                    </>
                                                )}
                                            </Button>

                                            {seoError && (
                                                <span className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                                                    {seoError}
                                                </span>
                                            )}
                                        </div>

                                        {(uploadError || uploadedYoutubeUrl) && (
                                            <div className="mt-4 space-y-2">
                                                {uploadError && (
                                                    <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                                        {uploadError}
                                                    </div>
                                                )}
                                                {uploadedYoutubeUrl && (
                                                    <div className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                                                        Uploaded successfully.{' '}
                                                        <a
                                                            className="underline font-semibold"
                                                            href={uploadedYoutubeUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            Open on YouTube
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Title Field */}
                            <div className="space-y-3">
                                <Label htmlFor="youtube-title" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                    Video Title <span className="text-red-600">*</span>
                                </Label>
                                <div className="relative group">
                                    <Input
                                        id="youtube-title"
                                        type="text"
                                        placeholder="e.g., How I Built an AI Video Generator"
                                        value={youtubeTitle}
                                        onChange={(e) => setYoutubeTitle(e.target.value)}
                                        className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200 placeholder:text-gray-400"
                                        maxLength={100}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 group-focus-within:text-red-600 transition-colors">
                                        {youtubeTitle.length}/100
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Choose a catchy title that accurately describes your video
                                </p>
                            </div>

                            {/* Description Field */}
                            <div className="space-y-3">
                                <Label htmlFor="youtube-description" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                    Description
                                    <span className="text-xs font-normal text-gray-500">(Optional)</span>
                                </Label>
                                <div className="relative group">
                                    <Textarea
                                        id="youtube-description"
                                        placeholder="Tell viewers what your video is about. Include relevant keywords to help people find your content..."
                                        value={youtubeDescription}
                                        onChange={(e) => setYoutubeDescription(e.target.value)}
                                        className="w-full min-h-[140px] px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200 resize-none placeholder:text-gray-400 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                                        maxLength={5000}
                                    />
                                    <div className="absolute right-4 bottom-3 text-xs font-medium text-gray-400 group-focus-within:text-red-600 transition-colors">
                                        {youtubeDescription.length}/5000
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Add timestamps, links, and relevant information
                                </p>
                            </div>

                            {/* Tags Field */}
                            <div className="space-y-3">
                                <Label htmlFor="youtube-tags" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                    Tags
                                    <span className="text-xs font-normal text-gray-500">(Optional)</span>
                                </Label>
                                <Input
                                    id="youtube-tags"
                                    type="text"
                                    placeholder="AI, artificial intelligence, video generator, automation"
                                    value={youtubeTags}
                                    onChange={(e) => setYoutubeTags(e.target.value)}
                                    className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200 placeholder:text-gray-400"
                                />
                                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    Separate multiple tags with commas
                                </p>
                            </div>

                            {/* Preview Card */}
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <h3 className="font-bold text-gray-900 text-lg">Preview</h3>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title</p>
                                        <p className="text-gray-900 font-medium break-words">{youtubeTitle || <span className="text-gray-400 italic">No title entered yet</span>}</p>
                                    </div>
                                    
                                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</p>
                                        <p className="text-gray-700 text-sm break-words whitespace-pre-wrap line-clamp-3">{youtubeDescription || <span className="text-gray-400 italic">No description entered yet</span>}</p>
                                    </div>
                                    
                                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tags</p>
                                        <div className="flex flex-wrap gap-2">
                                            {youtubeTags ? (
                                                youtubeTags.split(',').map((tag, idx) => tag.trim() && (
                                                    <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg border border-gray-200">
                                                        #{tag.trim()}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 italic text-sm">No tags entered yet</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer - Fixed */}
                        <div className="bg-gradient-to-b from-gray-50 to-white px-8 py-6 border-t-2 border-gray-100">
                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowYouTubeModal(false)}
                                    className="flex-1 h-12 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 font-semibold rounded-xl transition-all duration-200"
                                    disabled={isUploadingToYouTube}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleYouTubeUpload}
                                    disabled={isUploadingToYouTube || !youtubeTitle.trim()}
                                    className="flex-1 h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white hover:text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                                >
                                    {isUploadingToYouTube ? (
                                        <>
                                            <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                                            <span>Uploading to YouTube...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-5 w-5 mr-2.5" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                            </svg>
                                            <span>Upload to YouTube</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
