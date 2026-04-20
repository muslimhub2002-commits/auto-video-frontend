import {
  Link2,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export type ScriptCategory =
  | 'all'
  | 'draft'
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'tiktok';

export type VideoPlatformCategory =
  | 'all'
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'tiktok';

export type PlatformItem<Category extends string = string> = {
  label: string;
  code: string;
  meta: string;
  accent: string;
  href?: string;
  category?: Category;
};

export type UtilityItem = {
  label: string;
  description: string;
  icon: LucideIcon;
};

export function normalizeScriptCategory(value?: string | null): ScriptCategory {
  const normalized = String(value ?? '').trim().toLowerCase();

  switch (normalized) {
    case 'draft':
    case 'youtube':
    case 'facebook':
    case 'instagram':
    case 'tiktok':
      return normalized;
    default:
      return 'all';
  }
}

export function normalizeVideoPlatform(
  value?: string | null,
): VideoPlatformCategory {
  const normalized = String(value ?? '').trim().toLowerCase();

  switch (normalized) {
    case 'youtube':
    case 'facebook':
    case 'instagram':
    case 'tiktok':
      return normalized;
    default:
      return 'all';
  }
}

export const scriptPlatforms: readonly PlatformItem<ScriptCategory>[] = [
  {
    label: 'All Scripts',
    code: 'ALL',
    meta: 'Browse every saved script in one place',
    accent: 'border-amber-200 bg-amber-50 text-amber-700',
    category: 'all',
    href: '/scripts?category=all',
  },
  {
    label: 'Draft Scripts',
    code: 'DRF',
    meta: 'Keep track of unfinished and in-progress drafts',
    accent: 'border-violet-200 bg-violet-50 text-violet-700',
    category: 'draft',
    href: '/scripts?category=draft',
  },
  {
    label: 'YouTube',
    code: 'YT',
    meta: 'Shorts, long-form, and title drafts',
    accent: 'border-red-200 bg-red-50 text-red-700',
    category: 'youtube',
    href: '/scripts?category=youtube',
  },
  {
    label: 'Facebook',
    code: 'FB',
    meta: 'Feed-ready scripts and hook variants',
    accent: 'border-blue-200 bg-blue-50 text-blue-700',
    category: 'facebook',
    href: '/scripts?category=facebook',
  },
  {
    label: 'Instagram',
    code: 'IG',
    meta: 'Reels scripts and caption ideas',
    accent: 'border-pink-200 bg-pink-50 text-pink-700',
    category: 'instagram',
    href: '/scripts?category=instagram',
  },
  {
    label: 'TikTok',
    code: 'TT',
    meta: 'Fast-cut concepts and punchy openings',
    accent: 'border-slate-200 bg-slate-100 text-slate-700',
    category: 'tiktok',
    href: '/scripts?category=tiktok',
  },
] as const;

export const videoPlatforms: readonly PlatformItem<VideoPlatformCategory>[] = [
  {
    label: 'All Videos',
    code: 'ALL',
    meta: 'Internal previews, publishing state, and platform health',
    accent: 'border-sky-200 bg-sky-50 text-sky-700',
    category: 'all',
    href: '/videos?platform=all',
  },
  {
    label: 'YouTube',
    code: 'YT',
    meta: 'Exports, thumbnails, and publishing flow',
    accent: 'border-red-200 bg-red-50 text-red-700',
    category: 'youtube',
    href: '/videos?platform=youtube',
  },
  {
    label: 'Facebook',
    code: 'FB',
    meta: 'Feed and page-ready video outputs',
    accent: 'border-blue-200 bg-blue-50 text-blue-700',
    category: 'facebook',
    href: '/videos?platform=facebook',
  },
  {
    label: 'Instagram',
    code: 'IG',
    meta: 'Reels formatting and preview states',
    accent: 'border-pink-200 bg-pink-50 text-pink-700',
    category: 'instagram',
    href: '/videos?platform=instagram',
  },
  {
    label: 'TikTok',
    code: 'TT',
    meta: 'Vertical exports and post-ready cuts',
    accent: 'border-slate-200 bg-slate-100 text-slate-700',
    category: 'tiktok',
    href: '/videos?platform=tiktok',
  },
] as const;

export const utilityItems: readonly UtilityItem[] = [
  {
    label: 'Profile',
    description: 'Personal details and workspace settings',
    icon: UserRound,
  },
  {
    label: 'Social Accounts',
    description: 'Connected platforms and publishing access',
    icon: Link2,
  },
] as const;