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
  const [isUploadingToYouTube, setIsUploadingToYouTube] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedYoutubeUrl, setUploadedYoutubeUrl] = useState<string | null>(null);
  const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);
  const [enableScheduling, setEnableScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledHour, setScheduledHour] = useState('12');

  const getCairoTodayISODate = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
  };

  const getTimeZoneOffsetMinutes = (timeZone: string, date: Date) => {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });

    const parts = dtf.formatToParts(date);
    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value);
    const second = Number(parts.find((p) => p.type === 'second')?.value);

    // Interpret the formatted wall-clock time as if it were UTC, then compare.
    const asUTC = Date.UTC(year, month - 1, day, hour, minute, second);
    return (asUTC - date.getTime()) / 60000;
  };

  const toRFC3339InCairo = (dateISO: string, hour24: number) => {
    const [yStr, mStr, dStr] = dateISO.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);

    // Start with a naive guess, then adjust using Cairo's offset (handles DST).
    let utcGuess = new Date(Date.UTC(y, m - 1, d, hour24, 0, 0));
    let offsetMin = getTimeZoneOffsetMinutes('Africa/Cairo', utcGuess);
    let utcInstant = new Date(utcGuess.getTime() - offsetMin * 60_000);

    // One more pass in case DST boundary changes the offset.
    offsetMin = getTimeZoneOffsetMinutes('Africa/Cairo', utcInstant);
    utcInstant = new Date(utcGuess.getTime() - offsetMin * 60_000);

    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const offH = String(Math.floor(abs / 60)).padStart(2, '0');
    const offM = String(abs % 60).padStart(2, '0');

    const hh = String(hour24).padStart(2, '0');
    return {
      publishAt: `${dateISO}T${hh}:00:00${sign}${offH}:${offM}`,
      publishAtMs: utcInstant.getTime(),
    };
  };

  const parseTagsPreserveOrder = (raw: string): string[] => {
    return (raw || '')
      // Support both comma-separated and newline-separated tags.
      .split(/[\n,]+/g)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  };

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Default scheduling date to "today" in Egypt.
      if (!scheduledDate) {
        setScheduledDate(getCairoTodayISODate());
      }
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
          Accept: 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'Failed to get YouTube auth url');
      }

      const data = await response.json();
      const url = data?.url as string | undefined;
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

    let publishAt: string | undefined;
    if (enableScheduling) {
      const date = (scheduledDate || '').trim();
      const hour = (scheduledHour || '').trim();

      if (!date) {
        setUploadError('Please select a scheduled date.');
        return;
      }

      if (hour === '' || Number.isNaN(Number(hour))) {
        setUploadError('Please select a scheduled hour.');
        return;
      }

      const hourNum = Math.max(0, Math.min(23, Number(hour)));
      const computed = toRFC3339InCairo(date, hourNum);
      publishAt = computed.publishAt;

      const publishAtMs = computed.publishAtMs;
      if (!Number.isFinite(publishAtMs)) {
        setUploadError('Invalid scheduled date/time.');
        return;
      }

      const minMs = Date.now() + 2 * 60 * 1000;
      if (publishAtMs < minMs) {
        setUploadError('Schedule time must be at least 2 minutes in the future.');
        return;
      }
    }

    setIsUploadingToYouTube(true);
    try {
      let tags = parseTagsPreserveOrder(youtubeTags);
      tags.join(',');
      const token = localStorage.getItem('token');

      // 1) Save generation to chats/messages BEFORE uploading to YouTube (use api baseURL)
      await onSaveGeneration();

      // 2) Proceed to YouTube upload
      const response = await fetch('https://auto-video-backend.vercel.app/youtube/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          videoUrl,
          title: youtubeTitle,
          description: youtubeDescription,
          tags,
          privacyStatus: enableScheduling ? 'private' : privacyStatus,
          categoryId,
          selfDeclaredMadeForKids,
          ...(publishAt ? { publishAt } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Upload failed');
      }

      const data = await response.json();
      const videoId = data?.videoId as string | undefined;
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
                    className="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white hover:text-white shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
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
              <Select value={privacyStatus} onValueChange={(v) => setPrivacyStatus(v as typeof privacyStatus)}>
                <SelectTrigger className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200">
                  <SelectValue placeholder="Select privacy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
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
          </div>

          {/* Schedule Publishing Section */}
          <div className="bg-linear-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="relative">
                <input
                  type="checkbox"
                  id="enable-scheduling"
                  className="peer h-5 w-5 rounded border-2 border-purple-300 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 cursor-pointer checked:scale-110 checked:border-purple-500"
                  checked={enableScheduling}
                  onChange={(e) => setEnableScheduling(e.target.checked)}
                  disabled={isUploadingToYouTube}
                />
                <div
                  className={`absolute inset-0 rounded bg-purple-500 opacity-0 transition-opacity duration-300 pointer-events-none ${
                    enableScheduling ? 'animate-ping' : ''
                  }`}
                  style={{ animationIterationCount: 1, animationDuration: '0.5s' }}
                ></div>
              </div>
              <div className="flex-1">
                <label htmlFor="enable-scheduling" className="text-base font-bold text-gray-900 cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Schedule Publishing
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Egypt Time (Africa/Cairo)</span>
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Set a specific date and time for your video to go public automatically
                </p>
              </div>
            </div>

            {enableScheduling && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t-2 border-purple-200/50 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="schedule-date" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Date
                  </Label>
                  <Input
                    id="schedule-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={getCairoTodayISODate()}
                    className="w-full h-12 px-4 text-base border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200"
                    disabled={isUploadingToYouTube}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule-hour" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Time
                  </Label>
                  <Select value={scheduledHour} onValueChange={setScheduledHour} disabled={isUploadingToYouTube}>
                    <SelectTrigger className="w-full h-12 px-4 text-base border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200">
                      <SelectValue placeholder="Select hour" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {`${((i + 11) % 12) + 1}:00 ${i < 12 ? 'AM' : 'PM'}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 bg-purple-100 border border-purple-300 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-purple-700 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs text-purple-900 leading-relaxed">
                      <span className="font-semibold">Note:</span> Scheduled videos will be set to "Private" until the publish time. Make sure to schedule at least 2 minutes in the future.
                    </p>
                  </div>
                </div>
              </div>
            )}
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
                    parseTagsPreserveOrder(youtubeTags).map((tag, idx) => (
                      <span
                        key={`${idx}-${tag}`}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg border border-gray-200"
                      >
                        #{tag}
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
