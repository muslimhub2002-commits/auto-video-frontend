'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CircleAlert,
  Clapperboard,
  FileText,
  Link2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { User } from '@/lib/auth';
import type { AppProfileSummary } from '@/lib/auth-contract';
import { HeaderBar } from '../generate/_components/HeaderBar';
import { Sidebar } from '../generate/_components/Sidebar';
import { useAuthGuard } from '../generate/_hooks/useAuthGuard';
import { ProfilePageSkeleton } from './ProfilePageSkeleton';

function formatDate(value?: string | null) {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getApiMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: unknown } }).response !== null
  ) {
    const responseData = (error as { response?: { data?: unknown } }).response?.data;
    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'message' in responseData
    ) {
      const message = (responseData as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }

      if (Array.isArray(message)) {
        const firstMessage = message.find(
          (item): item is string => typeof item === 'string' && item.trim().length > 0,
        );
        if (firstMessage) {
          return firstMessage.trim();
        }
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

function resolveDisplayUser(user: User | null, summary: AppProfileSummary | null) {
  return summary?.user ?? user;
}

export function ProfilePageInner() {
  const { user, isLoading, handleLogout } = useAuthGuard();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [summary, setSummary] = useState<AppProfileSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    setPageError(null);

    try {
      const response = await api.get<AppProfileSummary>('/auth/profile-summary');
      setSummary(response.data);
    } catch (error) {
      setPageError(
        getApiMessage(
          error,
          'Failed to load your profile overview. Try again in a moment.',
        ),
      );
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    void loadSummary();
  }, [isLoading, loadSummary, user]);

  const displayUser = resolveDisplayUser(user, summary);

  const primaryMetrics = useMemo(
    () => [
      {
        label: 'Total scripts',
        value: summary?.workspace.totalScripts ?? 0,
        description: 'Every saved draft and published script in your workspace.',
        href: '/scripts?category=all',
        icon: FileText,
        accentClassName: 'from-amber-400 via-orange-500 to-rose-500',
      },
      {
        label: 'Draft scripts',
        value: summary?.workspace.draftScripts ?? 0,
        description: 'Scripts that still need publishing or delivery to a platform.',
        href: '/scripts?category=draft',
        icon: FileText,
        accentClassName: 'from-violet-500 via-fuchsia-500 to-pink-500',
      },
      {
        label: 'Video library',
        value: summary?.workspace.videoLibraryCount ?? 0,
        description: 'Generated videos with internal previews or published destinations.',
        href: '/videos?platform=all',
        icon: Video,
        accentClassName: 'from-sky-400 via-blue-500 to-indigo-600',
      },
      {
        label: 'Published videos',
        value: summary?.workspace.publishedVideoCount ?? 0,
        description: 'Videos already delivered to at least one external platform.',
        href: '/videos?platform=all',
        icon: Clapperboard,
        accentClassName: 'from-emerald-400 via-teal-500 to-cyan-600',
      },
    ],
    [summary],
  );

  const platformMetrics = useMemo(
    () => [
      {
        label: 'YouTube',
        value: summary?.workspace.publishedByPlatform.youtube ?? 0,
        href: '/videos?platform=youtube',
        badgeClassName: 'border-red-200 bg-red-50 text-red-700',
      },
      {
        label: 'Facebook',
        value: summary?.workspace.publishedByPlatform.facebook ?? 0,
        href: '/videos?platform=facebook',
        badgeClassName: 'border-blue-200 bg-blue-50 text-blue-700',
      },
      {
        label: 'Instagram',
        value: summary?.workspace.publishedByPlatform.instagram ?? 0,
        href: '/videos?platform=instagram',
        badgeClassName: 'border-pink-200 bg-pink-50 text-pink-700',
      },
      {
        label: 'TikTok',
        value: summary?.workspace.publishedByPlatform.tiktok ?? 0,
        href: '/videos?platform=tiktok',
        badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
      },
    ],
    [summary],
  );

  const quickLinks = [
    {
      label: 'Start a new generation',
      description: 'Jump back into the creation flow.',
      href: '/generate',
    },
    {
      label: 'Browse scripts',
      description: 'Review drafts and published scripts.',
      href: '/scripts?category=all',
    },
    {
      label: 'Open videos library',
      description: 'Inspect renders, previews, and published videos.',
      href: '/videos?platform=all',
    },
    {
      label: 'Manage social accounts',
      description: 'Check platform readiness and saved credentials.',
      href: '/social-accounts',
    },
  ];

  if (isLoading || (isLoadingSummary && !summary && !pageError)) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        user={user}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#fff7ed_100%)]">
          <HeaderBar onToggleSidebar={() => setIsSidebarOpen((current) => !current)} />

          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
            <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.55)] lg:p-8">
              <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-amber-300/25 blur-3xl" />
              <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-cyan-200/25 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Profile Overview
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                      {displayUser?.email ?? 'Your workspace profile'}
                    </h1>
                    <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                      Keep track of content output, publishing coverage, and connected distribution accounts from one workspace summary.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                      <UserRound className="h-4 w-4 text-slate-500" />
                      Roles: {displayUser?.roles?.join(', ') || 'User'}
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-2">
                      Member since {formatDate(displayUser?.created_at)}
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-2">
                      Updated {formatDate(displayUser?.updated_at)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button asChild className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800">
                      <Link href="/generate">
                        Start generation
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white">
                      <Link href="/social-accounts">
                        Review social accounts
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {pageError ? (
              <section className="rounded-[30px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-700">
                {pageError}
              </section>
            ) : null}

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.95fr)]">
              <div className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)]">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  <ShieldCheck className="h-4 w-4" />
                  Workspace Totals
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {primaryMetrics.map((metric) => {
                    const MetricIcon = metric.icon;

                    return (
                      <Link
                        key={metric.label}
                        href={metric.href}
                        className="group rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {metric.label}
                            </p>
                            <p className="mt-3 text-3xl font-black text-slate-900">
                              {metric.value}
                            </p>
                          </div>
                          <div className={`flex h-11 w-11 items-center justify-center rounded-3xl bg-linear-to-br text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.45)] ${metric.accentClassName}`}>
                            <MetricIcon className="h-5 w-5" />
                          </div>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {metric.description}
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                          Open
                          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)]">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    <Sparkles className="h-4 w-4" />
                    Recent Activity
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Latest script
                      </p>
                      {summary?.workspace.recentActivity.latestScript ? (
                        <>
                          <p className="mt-2 text-base font-semibold text-slate-900">
                            {summary.workspace.recentActivity.latestScript.title || 'Untitled script'}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Created {formatDate(summary.workspace.recentActivity.latestScript.createdAt)}
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          No scripts yet. Start a new generation to seed your workspace.
                        </p>
                      )}
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Latest published video
                      </p>
                      {summary?.workspace.recentActivity.latestPublishedVideo ? (
                        <>
                          <p className="mt-2 text-base font-semibold text-slate-900">
                            {summary.workspace.recentActivity.latestPublishedVideo.title || 'Untitled video'}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Updated {formatDate(summary.workspace.recentActivity.latestPublishedVideo.updatedAt)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {summary.workspace.recentActivity.latestPublishedVideo.publishedPlatforms.map((platform) => (
                              <span
                                key={platform}
                                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-700"
                              >
                                {platform}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          No published videos yet. Your first external upload will appear here.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)]">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                    <Link2 className="h-4 w-4" />
                    Quick Links
                  </div>

                  <div className="mt-4 space-y-3">
                    {quickLinks.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                      >
                        <div>
                          <p className="font-semibold text-white">{item.label}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-300">
                            {item.description}
                          </p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-slate-300" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)]">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  <Clapperboard className="h-4 w-4" />
                  Platform Coverage
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {platformMetrics.map((metric) => (
                    <Link
                      key={metric.label}
                      href={metric.href}
                      className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-white"
                    >
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${metric.badgeClassName}`}>
                        {metric.label}
                      </span>
                      <p className="mt-4 text-3xl font-black text-slate-900">
                        {metric.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Published videos currently linked to {metric.label}.
                      </p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)]">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  <ShieldCheck className="h-4 w-4" />
                  Social Account Health
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Saved accounts
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {summary?.socialAccounts.totalAccounts ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Providers ready
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {summary?.socialAccounts.providersConfigured ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Needs attention
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {summary?.socialAccounts.attentionCount ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {(summary?.socialAccounts.providers ?? []).map((provider) => (
                    <Link
                      key={provider.provider}
                      href="/social-accounts"
                      className="flex items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{provider.providerLabel}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {provider.total} saved account{provider.total === 1 ? '' : 's'}
                          {provider.defaultAccountId ? ' • default assigned' : ' • no default yet'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {provider.attentionCount} flagged
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                          Review
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>

                {summary?.socialAccounts.totalAccounts ? null : (
                  <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    No saved social accounts yet. Add YouTube, Meta, or TikTok credentials to unlock cleaner publishing workflows.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white/90 px-5 py-4 text-sm leading-7 text-slate-600 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.45)]">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                <CircleAlert className="h-4 w-4" />
                Scope
              </div>
              <p className="mt-3">
                This first release focuses on profile visibility rather than editing. It surfaces the counts and links you need to move into scripts, videos, and account management without duplicating those workflows here.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}