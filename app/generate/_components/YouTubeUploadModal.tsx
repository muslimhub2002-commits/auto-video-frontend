'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';

interface YouTubeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  script: string;
  onSaveGeneration: () => Promise<void>;
}

export function YouTubeUploadModal({
  isOpen,
  onClose,
  videoUrl,
  script,
  onSaveGeneration,
}: YouTubeUploadModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeDescription, setYoutubeDescription] = useState('');
  const [youtubeTags, setYoutubeTags] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState<'public' | 'unlisted' | 'private'>('public');
  const [categoryId, setCategoryId] = useState<string>('24');
  const [selfDeclaredMadeForKids, setSelfDeclaredMadeForKids] = useState<boolean>(false);

  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  const [privacyBeforeScheduling, setPrivacyBeforeScheduling] = useState<
    'public' | 'unlisted' | 'private'
  >('public');
  const [scheduleHourEgypt, setScheduleHourEgypt] = useState<number>(18);
  const [scheduleDateEgypt, setScheduleDateEgypt] = useState<string>(() => {
    // Egypt is fixed at UTC+3 for this app requirement.
    const nowEgypt = new Date(Date.now() + 3 * 60 * 60 * 1000);
    return nowEgypt.toISOString().slice(0, 10);
  });
  const [isUploadingToYouTube, setIsUploadingToYouTube] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedYoutubeUrl, setUploadedYoutubeUrl] = useState<string | null>(null);
  const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Allow the element to mount before transitioning in
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    const timer = setTimeout(() => setIsRendered(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // If scheduling is enabled, YouTube requires privacyStatus=private.
  useEffect(() => {
    if (isScheduling) {
      if (privacyStatus !== 'private') {
        setPrivacyBeforeScheduling(privacyStatus);
      }
      setPrivacyStatus('private');
      return;
    }

    // Restore user preference (unless they already had private).
    setPrivacyStatus((current) => {
      if (current !== 'private') return current;
      return privacyBeforeScheduling || 'public';
    });
  }, [isScheduling, privacyBeforeScheduling, privacyStatus]);

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
      const res = await api.get('/youtube/auth-url');
      const url = (res.data as any)?.url as string | undefined;
      if (!url) throw new Error('Missing YouTube auth url');

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

      // 1) Save generation to chats/messages BEFORE uploading to YouTube (use api baseURL)
      await onSaveGeneration();

      const pad2 = (n: number) => String(n).padStart(2, '0');
      let publishAt: string | undefined;
      if (isScheduling) {
        const hour = Math.min(23, Math.max(0, Number(scheduleHourEgypt)));
        const date = (scheduleDateEgypt || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          throw new Error('Please pick a valid schedule date (Egypt time).');
        }

        // RFC3339 with explicit +03:00 offset.
        publishAt = `${date}T${pad2(hour)}:00:00+03:00`;

        // Client-side sanity: must be in the future.
        const publishMs = new Date(publishAt).getTime();
        if (!Number.isFinite(publishMs) || publishMs < Date.now() + 2 * 60 * 1000) {
          throw new Error('Scheduled time must be in the future (Egypt time).');
        }
      }

      // 2) Proceed to YouTube upload
      const res = await api.post('/youtube/upload', {
        videoUrl,
        title: youtubeTitle,
        description: youtubeDescription,
        tags,
        privacyStatus,
        categoryId,
        selfDeclaredMadeForKids,
        ...(publishAt ? { publishAt } : {}),
      });

      const videoId = (res.data as any)?.videoId as string | undefined;
      if (!videoId) throw new Error('Upload succeeded but missing videoId');

      const url = `https://www.youtube.com/watch?v=${videoId}`;
      setUploadedYoutubeUrl(url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to upload to YouTube. Please try again.';
      setUploadError(String(message));
    } finally {
      setIsUploadingToYouTube(false);
    }
  };

  if (!isRendered) return null;

  return (
    <div
      className={`fixed inset-0 bg-linear-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-100 transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Fixed */}
        <div className="relative bg-linear-to-r from-red-600 via-red-600 to-red-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg">
                <svg
                  className="h-7 w-7 text-white drop-shadow-lg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-md">Upload to YouTube</h2>
                <p className="text-red-100 text-sm mt-0.5">Share your video with the world</p>
              </div>
            </div>
            <button
              onClick={onClose}
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
          <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex gap-3">
              <div className="shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">Ready to publish?</h4>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Complete the form below to upload your AI-generated video to YouTube. All fields marked with{' '}
                  <span className="text-red-600 font-semibold">*</span> are required.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleConnectYouTube}
                    disabled={isConnectingYouTube || isUploadingToYouTube}
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
                    disabled={isGeneratingSeo || isUploadingToYouTube || !(script || '').trim()}
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
                        <a className="underline font-semibold" href={uploadedYoutubeUrl} target="_blank" rel="noreferrer">
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
                disabled={isUploadingToYouTube}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 group-focus-within:text-red-600 transition-colors">
                {youtubeTitle.length}/100
              </div>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
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
                className="w-full min-h-35 px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200 resize-none placeholder:text-gray-400 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                maxLength={5000}
                disabled={isUploadingToYouTube}
              />
              <div className="absolute right-4 bottom-3 text-xs font-medium text-gray-400 group-focus-within:text-red-600 transition-colors">
                {youtubeDescription.length}/5000
              </div>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
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
              disabled={isUploadingToYouTube}
            />
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Separate multiple tags with commas
            </p>
          </div>

          {/* Upload Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">Privacy</Label>
              <Select
                value={privacyStatus}
                onValueChange={(v) => setPrivacyStatus(v as typeof privacyStatus)}
                disabled={isScheduling}
              >
                <SelectTrigger className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200">
                  <SelectValue placeholder="Select privacy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
              {isScheduling && (
                <p className="text-xs text-gray-500">
                  Scheduling requires <span className="font-semibold">Private</span> until publish time.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">Entertainment</SelectItem>
                  <SelectItem value="22">People & Blogs</SelectItem>
                  <SelectItem value="27">Education</SelectItem>
                  <SelectItem value="28">Science & Technology</SelectItem>
                  <SelectItem value="26">Howto & Style</SelectItem>
                  <SelectItem value="10">Music</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-red-600"
                  checked={selfDeclaredMadeForKids}
                  onChange={(e) => setSelfDeclaredMadeForKids(e.target.checked)}
                  disabled={isUploadingToYouTube}
                />
                Self-declare as made for kids
              </label>
              <p className="mt-2 text-sm text-gray-500">
                Only enable this if your content is made specifically for children.
              </p>
            </div>

            <div className="md:col-span-2 border-t border-gray-200 pt-5">
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-red-600"
                  checked={isScheduling}
                  onChange={(e) => setIsScheduling(e.target.checked)}
                  disabled={isUploadingToYouTube}
                />
                Schedule publish (Egypt time UTC+3)
              </label>

              {isScheduling && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-900">Date (Egypt)</Label>
                    <Input
                      type="date"
                      value={scheduleDateEgypt}
                      onChange={(e) => setScheduleDateEgypt(e.target.value)}
                      className="w-full h-11 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200"
                      disabled={isUploadingToYouTube}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-900">Hour (Egypt)</Label>
                    <Select
                      value={String(scheduleHourEgypt)}
                      onValueChange={(v) => setScheduleHourEgypt(Number(v))}
                      disabled={isUploadingToYouTube}
                    >
                      <SelectTrigger className="w-full h-11 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200">
                        <SelectValue placeholder="Select hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }).map((_, h) => (
                          <SelectItem key={h} value={String(h)}>
                            {String(h).padStart(2, '0')}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Card */}
          <div className="bg-linear-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <h3 className="font-bold text-gray-900 text-lg">Preview</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title</p>
                <p className="text-gray-900 font-medium wrap-break-word">
                  {youtubeTitle || <span className="text-gray-400 italic">No title entered yet</span>}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</p>
                <p className="text-gray-700 text-sm wrap-break-word whitespace-pre-wrap line-clamp-3">
                  {youtubeDescription || <span className="text-gray-400 italic">No description entered yet</span>}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {youtubeTags ? (
                    youtubeTags.split(',').map(
                      (tag, idx) =>
                        tag.trim() && (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg border border-gray-200"
                          >
                            #{tag.trim()}
                          </span>
                        ),
                    )
                  ) : (
                    <span className="text-gray-400 italic text-sm">No tags entered yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer - Fixed */}
        <div className="bg-linear-to-b from-gray-50 to-white px-8 py-6 border-t-2 border-gray-100">
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 font-semibold rounded-xl transition-all duration-200"
              disabled={isUploadingToYouTube}
            >
              Cancel
            </Button>
            <Button
              onClick={handleYouTubeUpload}
              disabled={isUploadingToYouTube || !youtubeTitle.trim()}
              className="flex-1 h-12 bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white hover:text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {isUploadingToYouTube ? (
                <>
                  <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                  <span>Uploading to YouTube...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span>Upload to YouTube</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
