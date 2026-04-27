'use client';

import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Clapperboard,
  FileText,
  Link2,
  Menu,
  UserRound,
  Video,
  type LucideIcon,
} from 'lucide-react';

interface HeaderBarProps {
  onToggleSidebar: () => void;
}

function resolveHeaderMeta(pathname: string): {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accentClassName: string;
} {
  if (pathname.startsWith('/scripts')) {
    return {
      eyebrow: 'Scripts Workspace',
      title: 'Scripts Hub',
      subtitle: 'Review drafts, playback narration, and move saved scripts back into generation.',
      icon: FileText,
      accentClassName: 'from-amber-400 via-orange-500 to-rose-500',
    };
  }

  if (pathname.startsWith('/videos')) {
    return {
      eyebrow: 'Publishing Workspace',
      title: 'Videos Library',
      subtitle: 'Track generated videos, monitor platform delivery, and manage publishing workflows.',
      icon: Clapperboard,
      accentClassName: 'from-sky-400 via-blue-500 to-indigo-600',
    };
  }

  if (pathname.startsWith('/social-accounts')) {
    return {
      eyebrow: 'Publishing Workspace',
      title: 'Social Accounts',
      subtitle: 'Manage per-platform credentials, setup guides, and account readiness before upload.',
      icon: Link2,
      accentClassName: 'from-emerald-400 via-teal-500 to-cyan-600',
    };
  }

  if (pathname.startsWith('/profile')) {
    return {
      eyebrow: 'Workspace Overview',
      title: 'Profile',
      subtitle: 'Review account details, content totals, publishing coverage, and connected platform health.',
      icon: UserRound,
      accentClassName: 'from-slate-700 via-slate-900 to-cyan-700',
    };
  }

  return {
    eyebrow: 'Generation Workspace',
    title: 'AI Video Generator',
    subtitle: 'Build scripts, voice-overs, scenes, and final renders from one production flow.',
    icon: Video,
    accentClassName: 'from-indigo-500 via-violet-500 to-fuchsia-500',
  };
}

export function HeaderBar({ onToggleSidebar }: HeaderBarProps) {
  const pathname = usePathname();
  const headerMeta = resolveHeaderMeta(pathname);
  const SectionIcon = headerMeta.icon;

  return (
    <div className="relative overflow-hidden border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_26%),radial-gradient(circle_at_right,rgba(99,102,241,0.16),transparent_28%)]" />

      <div className="relative flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200/80 bg-white/80 text-slate-900 shadow-[0_16px_32px_-24px_rgba(15,23,42,0.5)] hover:bg-white lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-4xl bg-linear-to-br text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.55)] ${headerMeta.accentClassName}`}>
            <SectionIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="mt-2 min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-[1.35rem]">
                {headerMeta.title}
              </h1>
              <p className="hidden max-w-2xl text-sm leading-6 text-slate-500 md:block">
                {headerMeta.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
