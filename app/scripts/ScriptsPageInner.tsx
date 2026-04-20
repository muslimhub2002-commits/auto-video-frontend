'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { HeaderBar } from '../generate/_components/HeaderBar';
import { Pagination } from '../generate/_components/Pagination';
import { Sidebar } from '../generate/_components/Sidebar';
import {
    normalizeScriptCategory,
    scriptPlatforms,
    type ScriptCategory,
} from '../generate/_components/sidebar/sidebar-data';
import { useAuthGuard } from '../generate/_hooks/useAuthGuard';
import { ScriptDetailsModal } from './_components/ScriptDetailsModal';
import { ScriptFullModal } from './_components/ScriptFullModal';
import { ScriptLinksModal } from './_components/ScriptLinksModal';
import type {
    ScriptDetail,
    ScriptListItem,
    ScriptsListResponse,
} from './_components/script-types';
import {
    Calendar,
    ExternalLink,
    FileText,
    ImageIcon,
    Layers3,
    Link2,
    Loader2,
    Pause,
    Play,
    Search,
    Sparkles,
    Volume2,
} from 'lucide-react';

const PAGE_SIZE = 10;

const socialPlatforms = [
    {
        key: 'youtube_url',
        category: 'youtube',
        label: 'YouTube',
        pillClassName: 'border-red-200 bg-red-50 text-red-700',
    },
    {
        key: 'facebook_url',
        category: 'facebook',
        label: 'Facebook',
        pillClassName: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    {
        key: 'instagram_url',
        category: 'instagram',
        label: 'Instagram',
        pillClassName: 'border-pink-200 bg-pink-50 text-pink-700',
    },
    {
        key: 'tiktok_url',
        category: 'tiktok',
        label: 'TikTok',
        pillClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    },
] as const;

function getDisplayTitle(script: { title: string | null; script: string }) {
    const title = script.title?.trim();
    if (title) return title;

    const fallback = script.script
        .split(/[\n.]/)
        .map((part) => part.trim())
        .find(Boolean);

    return fallback ? fallback.slice(0, 80) : 'Untitled script';
}

function buildScriptPreview(scriptText: string) {
    const normalized = scriptText.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 240) return normalized;
    return `${normalized.slice(0, 237)}...`;
}

function isScriptPreviewTruncated(scriptText: string) {
    return scriptText.replace(/\s+/g, ' ').trim().length > 240;
}

function formatDate(value?: string) {
    if (!value) return 'Unknown date';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown date';

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function hasPublishedSocialLink(
    script: ScriptListItem | ScriptDetail,
    category?: (typeof socialPlatforms)[number]['category'],
) {
    if (!category) {
        return socialPlatforms.some((platform) => {
            const rawUrl = script[platform.key];
            return typeof rawUrl === 'string' && rawUrl.trim().length > 0;
        });
    }

    const platform = socialPlatforms.find((item) => item.category === category);
    if (!platform) return false;

    const rawUrl = script[platform.key];
    return typeof rawUrl === 'string' && rawUrl.trim().length > 0;
}

function doesScriptMatchCategory(
    script: ScriptListItem | ScriptDetail,
    category: ScriptCategory,
) {
    if (category === 'all') {
        return true;
    }

    if (category === 'draft') {
        return !hasPublishedSocialLink(script);
    }

    return hasPublishedSocialLink(script, category);
}

function getPublishedLinks(script: ScriptListItem | ScriptDetail) {
    return socialPlatforms.flatMap((platform) => {
        const rawUrl = script[platform.key];
        const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';

        if (!url) return [];

        return [
            {
                ...platform,
                url,
            },
        ];
    });
}

function resolveVoiceoverUrls(script: ScriptDetail) {
    const chunkUrls = [...(script.voice_over_chunks ?? [])]
        .sort((left, right) => left.index - right.index)
        .map((chunk) => String(chunk.url ?? '').trim())
        .filter(Boolean);

    if (chunkUrls.length > 0) {
        return chunkUrls;
    }

    return [...(script.sentences ?? [])]
        .sort((left, right) => left.index - right.index)
        .map((sentence) => String(sentence.voice_over_url ?? '').trim())
        .filter(Boolean);
}

export function ScriptsPageInner() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, isLoading, handleLogout } = useAuthGuard();
    const { showToast, ToastContainer } = useToast();

    const activeCategory = normalizeScriptCategory(searchParams.get('category'));
    const activeCategoryItem =
        scriptPlatforms.find((item) => item.category === activeCategory) ??
        scriptPlatforms[0];

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [scripts, setScripts] = useState<ScriptListItem[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [debouncedSearchText, setDebouncedSearchText] = useState('');
    const [isLoadingScripts, setIsLoadingScripts] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [selectedScript, setSelectedScript] = useState<ScriptListItem | null>(null);
    const [selectedScriptDetail, setSelectedScriptDetail] =
        useState<ScriptDetail | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [detailLoadScriptId, setDetailLoadScriptId] = useState<string | null>(null);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [playingScriptId, setPlayingScriptId] = useState<string | null>(null);
    const [voiceLoadScriptId, setVoiceLoadScriptId] = useState<string | null>(null);
    const [linksModalScript, setLinksModalScript] = useState<ScriptListItem | null>(null);
    const [fullScriptModalScript, setFullScriptModalScript] =
        useState<ScriptListItem | null>(null);
    const [isSavingLinks, setIsSavingLinks] = useState(false);

    const pendingListResetRef = useRef(true);
    const detailCacheRef = useRef<Map<string, ScriptDetail>>(new Map());
    const detailRequestRef = useRef<string | null>(null);
    const playbackQueueRef = useRef<{
        scriptId: string;
        urls: string[];
        index: number;
    } | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const totalPages = total > 0 ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
    const voiceReadyCount = scripts.filter(
        (script) =>
            script.voice_over_chunks_count > 0 || script.voice_over_sentences_count > 0,
    ).length;
    const publishedCount = scripts.filter(
        (script) => getPublishedLinks(script).length > 0,
    ).length;

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearchText(searchText.trim());
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [searchText]);

    useEffect(() => {
        pendingListResetRef.current = true;
        setPage(1);
    }, [activeCategory, debouncedSearchText]);

    useEffect(() => {
        if (pendingListResetRef.current && page !== 1) {
            return;
        }

        pendingListResetRef.current = false;

        async function fetchScripts() {
            setIsLoadingScripts(true);
            setListError(null);

            try {
                const response = await api.get<ScriptsListResponse>('/scripts', {
                    params: {
                        page,
                        limit: PAGE_SIZE,
                        category: activeCategory,
                        ...(debouncedSearchText ? { title: debouncedSearchText } : {}),
                    },
                });

                setScripts(response.data.items ?? []);
                setTotal(response.data.total ?? 0);
            } catch (error) {
                console.error('Failed to load scripts page:', error);
                setListError('Failed to load your scripts. Try again in a moment.');
            } finally {
                setIsLoadingScripts(false);
            }
        }

        void fetchScripts();
    }, [activeCategory, debouncedSearchText, page]);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;
        const audio = audioElement;

        function stopPlayback() {
            playbackQueueRef.current = null;
            setPlayingScriptId(null);
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        }

        function playQueueItem(scriptId: string, urls: string[], index: number) {
            const nextUrl = urls[index];
            if (!nextUrl) {
                stopPlayback();
                return;
            }

            playbackQueueRef.current = { scriptId, urls, index };
            setPlayingScriptId(scriptId);
            audio.src = nextUrl;
            audio.currentTime = 0;

            void audio.play().catch((error) => {
                console.error('Voice-over playback failed:', error);
                showToast('The browser blocked audio playback for this script.', 'warning');
                stopPlayback();
            });
        }

        function handleEnded() {
            const queue = playbackQueueRef.current;
            if (!queue) return;

            const nextIndex = queue.index + 1;
            if (nextIndex >= queue.urls.length) {
                stopPlayback();
                return;
            }

            playQueueItem(queue.scriptId, queue.urls, nextIndex);
        }

        function handleError() {
            showToast('One of the voice-over segments could not be played.', 'warning');
            stopPlayback();
        }

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
            stopPlayback();
        };
    }, [showToast]);

    async function loadScriptDetail(scriptId: string) {
        const cachedDetail = detailCacheRef.current.get(scriptId);
        if (cachedDetail) {
            return cachedDetail;
        }

        const response = await api.get<ScriptDetail>(
            `/scripts/${encodeURIComponent(scriptId)}`,
        );

        detailCacheRef.current.set(scriptId, response.data);
        return response.data;
    }

    function stopPlayback() {
        const audio = audioRef.current;
        playbackQueueRef.current = null;
        setPlayingScriptId(null);

        if (!audio) return;

        audio.pause();
        audio.removeAttribute('src');
        audio.load();
    }

    function startPlayback(scriptId: string, urls: string[]) {
        const audio = audioRef.current;
        if (!audio || urls.length === 0) return;

        playbackQueueRef.current = { scriptId, urls, index: 0 };
        setPlayingScriptId(scriptId);
        audio.src = urls[0];
        audio.currentTime = 0;

        void audio.play().catch((error) => {
            console.error('Voice-over playback failed:', error);
            showToast('The browser blocked audio playback for this script.', 'warning');
            stopPlayback();
        });
    }

    function handleCategoryChange(category: ScriptCategory) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('category', category);
        router.push(`${pathname}?${params.toString()}`);
    }

    function applyScriptDetailUpdate(detail: ScriptDetail) {
        const nextLinkFields = {
            youtube_url: detail.youtube_url ?? null,
            facebook_url: detail.facebook_url ?? null,
            instagram_url: detail.instagram_url ?? null,
            tiktok_url: detail.tiktok_url ?? null,
        };

        detailCacheRef.current.set(detail.id, detail);
        const isCurrentlyVisible = scripts.some((script) => script.id === detail.id);
        const shouldRemainVisible = doesScriptMatchCategory(detail, activeCategory);
        const shouldMoveToPreviousPage =
            isCurrentlyVisible && !shouldRemainVisible && scripts.length === 1 && page > 1;

        if (isCurrentlyVisible && !shouldRemainVisible) {
            setScripts((current) => current.filter((script) => script.id !== detail.id));
            setTotal((current) => Math.max(0, current - 1));

            if (shouldMoveToPreviousPage) {
                setPage((current) => Math.max(1, current - 1));
            }
        } else {
            setScripts((current) =>
                current.map((script) =>
                    script.id === detail.id
                        ? {
                            ...script,
                            ...nextLinkFields,
                        }
                        : script,
                ),
            );
        }

        setSelectedScript((current) =>
            current && current.id === detail.id
                ? {
                    ...current,
                    ...nextLinkFields,
                }
                : current,
        );
        setSelectedScriptDetail((current) =>
            current && current.id === detail.id ? detail : current,
        );
        setLinksModalScript((current) =>
            current && current.id === detail.id
                ? {
                    ...current,
                    ...nextLinkFields,
                }
                : current,
        );
        setFullScriptModalScript((current) =>
            current && current.id === detail.id
                ? {
                    ...current,
                    ...nextLinkFields,
                }
                : current,
        );
    }

    async function handleOpenDetails(script: ScriptListItem) {
        detailRequestRef.current = script.id;
        setSelectedScript(script);
        setSelectedScriptDetail(detailCacheRef.current.get(script.id) ?? null);
        setDetailError(null);
        setIsDetailsOpen(true);

        if (detailCacheRef.current.has(script.id)) {
            setIsLoadingDetails(false);
            setDetailLoadScriptId(null);
            return;
        }

        setIsLoadingDetails(true);
        setDetailLoadScriptId(script.id);

        try {
            const detail = await loadScriptDetail(script.id);
            if (detailRequestRef.current !== script.id) return;
            setSelectedScriptDetail(detail);
        } catch (error) {
            console.error('Failed to load script detail modal:', error);
            if (detailRequestRef.current === script.id) {
                setDetailError('Failed to load sentence details for this script.');
            }
        } finally {
            if (detailRequestRef.current === script.id) {
                setIsLoadingDetails(false);
                setDetailLoadScriptId(null);
            }
        }
    }

    function handleCloseDetails() {
        detailRequestRef.current = null;
        setIsDetailsOpen(false);
        setDetailError(null);
        setIsLoadingDetails(false);
        setDetailLoadScriptId(null);
    }

    function handleOpenFullScript(script: ScriptListItem) {
        setFullScriptModalScript(script);
    }

    function handleCloseFullScript() {
        setFullScriptModalScript(null);
    }

    function handleOpenLinks(script: ScriptListItem) {
        setLinksModalScript(script);
    }

    function handleCloseLinksModal() {
        if (isSavingLinks) return;
        setLinksModalScript(null);
    }

    async function handleSaveLinks(payload: {
        youtube_url?: string;
        facebook_url?: string;
        tiktok_url?: string;
    }) {
        if (!linksModalScript) {
            throw new Error('No script selected for link updates.');
        }

        setIsSavingLinks(true);

        try {
            const response = await api.patch<ScriptDetail>(
                `/scripts/${encodeURIComponent(linksModalScript.id)}`,
                payload,
            );

            applyScriptDetailUpdate(response.data);
            setLinksModalScript(null);
            showToast('Links added to the script.', 'success');
        } catch (error) {
            console.error('Failed to save script links:', error);
            throw new Error('Failed to save the script links.');
        } finally {
            setIsSavingLinks(false);
        }
    }

    async function handlePlayVoiceover(script: ScriptListItem) {
        if (playingScriptId === script.id) {
            stopPlayback();
            return;
        }

        setVoiceLoadScriptId(script.id);

        try {
            const detail = await loadScriptDetail(script.id);
            const urls = resolveVoiceoverUrls(detail);

            if (urls.length === 0) {
                showToast('No voice-over is available for this script yet.', 'warning');
                return;
            }

            startPlayback(script.id, urls);
        } catch (error) {
            console.error('Failed to load voice-over for script:', error);
            showToast('Failed to load the script voice-over.', 'error');
        } finally {
            setVoiceLoadScriptId(null);
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-100">
            <Sidebar user={user} isOpen={isSidebarOpen} onLogout={handleLogout} />

            <div className="flex min-w-0 flex-1 flex-col">
                <HeaderBar onToggleSidebar={() => setIsSidebarOpen((current) => !current)} />

                <main className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
                    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
                        <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.55)] lg:p-8">
                            <div className="absolute -left-20 top-0 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
                            <div className="absolute right-0 top-10 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl" />

                            <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Scripts Hub
                                    </div>
                                    <div className="space-y-3">
                                        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                            {activeCategoryItem.label}
                                        </h1>
                                        <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                                            Filter by title or script body, inspect sentence-level media composition, and preview the saved narration path without jumping back into the generator.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-105 w-2/3">
                                    <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            Visible scripts
                                        </p>
                                        <p className="mt-3 text-3xl font-black text-slate-900">{total}</p>
                                    </div>
                                    <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            Voice ready
                                        </p>
                                        <p className="mt-3 text-3xl font-black text-slate-900">
                                            {voiceReadyCount}
                                        </p>
                                    </div>
                                    <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            Published links
                                        </p>
                                        <p className="mt-3 text-3xl font-black text-slate-900">
                                            {publishedCount}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[32px] border border-white/80 bg-white/90 p-4 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)] sm:p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex-1 space-y-2">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={searchText}
                                            onChange={(event) => setSearchText(event.target.value)}
                                            placeholder="Search script titles and body text"
                                            className="h-12 rounded-2xl border-slate-200 bg-white pl-11 text-sm shadow-none"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Search scans both the saved title and the script text itself.
                                    </p>
                                </div>

                            </div>

                            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                                {scriptPlatforms.map((item) => {
                                    const isActive = item.category === activeCategory;

                                    return (
                                        <button
                                            key={item.label}
                                            type="button"
                                            onClick={() => handleCategoryChange(item.category ?? 'all')}
                                            className={`min-w-45 cursor-pointer rounded-[24px] border px-4 py-3 text-left transition ${isActive
                                                    ? `${item.accent} shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)]`
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="text-[11px] font-black uppercase tracking-[0.18em]">
                                                {item.code}
                                            </div>
                                            <div className="mt-2 text-sm font-semibold">{item.label}</div>
                                            <div className="mt-1 text-xs opacity-80">{item.meta}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="space-y-4">
                            {listError ? (
                                <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-8 text-sm text-rose-700">
                                    {listError}
                                </div>
                            ) : isLoadingScripts ? (
                                <div className="space-y-4">
                                    {[0, 1, 2].map((index) => (
                                        <div
                                            key={index}
                                            className="animate-pulse rounded-[32px] border border-slate-200/80 bg-white/90 p-5"
                                        >
                                            <div className="h-4 w-28 rounded-full bg-slate-200" />
                                            <div className="mt-4 h-7 w-2/5 rounded-full bg-slate-200" />
                                            <div className="mt-4 space-y-2">
                                                <div className="h-3 rounded-full bg-slate-200" />
                                                <div className="h-3 w-11/12 rounded-full bg-slate-200" />
                                                <div className="h-3 w-8/12 rounded-full bg-slate-200" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : scripts.length === 0 ? (
                                <div className="rounded-[32px] border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center shadow-[0_24px_50px_-40px_rgba(15,23,42,0.45)]">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-500">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <h2 className="mt-4 text-2xl font-black text-slate-900">
                                        No scripts found
                                    </h2>
                                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
                                        {debouncedSearchText
                                            ? `Nothing in ${activeCategoryItem.label.toLowerCase()} matched your current search.`
                                            : `There are no scripts in ${activeCategoryItem.label.toLowerCase()} yet.`}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {scripts.map((script) => {
                                        const publishedLinks = getPublishedLinks(script);
                                        const hasVoiceover =
                                            script.voice_over_chunks_count > 0 ||
                                            script.voice_over_sentences_count > 0;
                                        const hasAllRequestedLinks = Boolean(
                                            String(script.youtube_url ?? '').trim() &&
                                            String(script.facebook_url ?? '').trim() &&
                                            String(script.tiktok_url ?? '').trim(),
                                        );
                                        const isScriptTruncated = isScriptPreviewTruncated(script.script);
                                        const isPlaying = playingScriptId === script.id;
                                        const isVoiceLoading = voiceLoadScriptId === script.id;
                                        const isDetailLoading = detailLoadScriptId === script.id;

                                        return (
                                            <article
                                                key={script.id}
                                                className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.6)] lg:p-6"
                                            >
                                                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                                    <div className="min-w-0 flex-1 space-y-4">
                                                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                                                {script.language || 'Language N/A'}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                {formatDate(script.created_at)}
                                                            </span>
                                                            <span
                                                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${hasVoiceover
                                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                        : 'border-slate-200 bg-slate-50 text-slate-500'
                                                                    }`}
                                                            >
                                                                <Volume2 className="h-3.5 w-3.5" />
                                                                {script.voice_over_chunks_count > 0
                                                                    ? `${script.voice_over_chunks_count} narration chunks`
                                                                    : script.voice_over_sentences_count > 0
                                                                        ? `${script.voice_over_sentences_count} sentence clips`
                                                                        : 'No voice-over'}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                                                {getDisplayTitle(script)}
                                                            </h2>
                                                            <p className="text-sm leading-7 text-slate-600">
                                                                {buildScriptPreview(script.script)}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                                                <FileText className="h-4 w-4" />
                                                                {script.sentences_count} sentences
                                                            </span>
                                                            <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                                                <ImageIcon className="h-4 w-4" />
                                                                {script.images_count} image scenes
                                                            </span>
                                                            <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                                                <Layers3 className="h-4 w-4" />
                                                                {publishedLinks.length > 0
                                                                    ? `${publishedLinks.length} published links`
                                                                    : 'Draft script'}
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            {publishedLinks.length > 0 ? (
                                                                publishedLinks.map((link) => (
                                                                    <a
                                                                        key={`${script.id}-${link.label}`}
                                                                        href={link.url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition hover:brightness-95 ${link.pillClassName}`}
                                                                    >
                                                                        {link.label}
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </a>
                                                                ))
                                                            ) : (
                                                                <span className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">
                                                                    Draft only
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="w-full space-y-3 xl:w-70">
                                                        {isScriptTruncated ? (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => handleOpenFullScript(script)}
                                                                className="w-full cursor-pointer justify-between rounded-2xl border-slate-200 bg-white py-6 text-slate-900 hover:bg-slate-50"
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <FileText className="h-4 w-4" />
                                                                    Full script
                                                                </span>
                                                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                                    Open modal
                                                                </span>
                                                            </Button>
                                                        ) : null}

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => handleOpenDetails(script)}
                                                            className="w-full cursor-pointer justify-between rounded-2xl border-slate-200 bg-white py-6 text-slate-900 hover:bg-slate-50"
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                {isDetailLoading ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Layers3 className="h-4 w-4" />
                                                                )}
                                                                Sentence details
                                                            </span>
                                                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                                Open modal
                                                            </span>
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            onClick={() => void handlePlayVoiceover(script)}
                                                            disabled={!hasVoiceover || isVoiceLoading}
                                                            className="w-full cursor-pointer justify-between rounded-2xl bg-slate-950 py-6 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                {isVoiceLoading ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : isPlaying ? (
                                                                    <Pause className="h-4 w-4" />
                                                                ) : (
                                                                    <Play className="h-4 w-4" />
                                                                )}
                                                                {isPlaying ? 'Stop voice-over' : 'Play voice-over'}
                                                            </span>
                                                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                                                                {script.voice_over_chunks_count > 0
                                                                    ? 'Full narration'
                                                                    : script.voice_over_sentences_count > 0
                                                                        ? 'Sentence clips'
                                                                        : 'Unavailable'}
                                                            </span>
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => handleOpenLinks(script)}
                                                            className="w-full cursor-pointer justify-between rounded-2xl border-slate-200 bg-white py-6 text-slate-900 hover:bg-slate-50"
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <Link2 className="h-4 w-4" />
                                                                Add links
                                                            </span>
                                                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                                {hasAllRequestedLinks ? 'All saved' : 'Open modal'}
                                                            </span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}

                                    <div className="pt-2">
                                        <Pagination
                                            currentPage={page}
                                            totalPages={totalPages}
                                            onPageChange={setPage}
                                        />
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                </main>
            </div>

            <audio ref={audioRef} className="hidden" />

            <ScriptFullModal
                isOpen={!!fullScriptModalScript}
                script={fullScriptModalScript}
                onClose={handleCloseFullScript}
            />
            <ScriptDetailsModal
                isOpen={isDetailsOpen}
                scriptSummary={selectedScript}
                scriptDetail={selectedScriptDetail}
                isLoading={isLoadingDetails}
                error={detailError}
                onClose={handleCloseDetails}
            />
            <ScriptLinksModal
                isOpen={!!linksModalScript}
                script={linksModalScript}
                isSaving={isSavingLinks}
                onClose={handleCloseLinksModal}
                onSave={handleSaveLinks}
            />
            <ToastContainer />
        </div>
    );
}