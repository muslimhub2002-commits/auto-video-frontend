import {
  Clapperboard,
  Link2,
  Music4,
  type LucideIcon,
} from 'lucide-react';

export type SocialAccountProvider = 'youtube' | 'meta' | 'tiktok';

export type SocialAccountGuideStep = {
  title: string;
  body: string;
};

export type SocialAccountSetupNote = {
  label: string;
  value: string;
};

export type SocialAccountFieldDefinition = {
  key: string;
  envKey: string;
  label: string;
  helperText: string;
  placeholder: string;
  secret?: boolean;
};

export type SocialAccountSection = {
  provider: SocialAccountProvider;
  label: string;
  summary: string;
  description: string;
  icon: LucideIcon;
  accentClassName: string;
  badgeClassName: string;
  requiredKeys: readonly string[];
  setupNotes: readonly SocialAccountSetupNote[];
  implementationNotes: readonly string[];
  guideSteps: readonly SocialAccountGuideStep[];
};

export type SocialAccountConfiguredField = {
  key: string;
  label: string;
  configured: boolean;
  maskedValue: string | null;
  isSecret: boolean;
};

export type SocialAccountSummaryItem = {
  id: string;
  label: string;
  isDefault: boolean;
  connectionStatus:
    | 'draft'
    | 'not_connected'
    | 'healthy'
    | 'attention'
    | 'reconnect_required'
    | 'error';
  connectedAt: string | null;
  tokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  lastValidatedAt: string | null;
  lastRefreshAttemptAt: string | null;
  lastRefreshSuccessAt: string | null;
  lastError: string | null;
  publicMetadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  configuredFieldCount: number;
  configuredFields: SocialAccountConfiguredField[];
};

export type SocialAccountProviderPayload = {
  provider: SocialAccountProvider;
  providerLabel: string;
  defaultAccountId: string | null;
  total: number;
  items: SocialAccountSummaryItem[];
};

export type SocialAccountsResponse = {
  summary: {
    totalAccounts: number;
    providersConfigured: number;
    defaultsConfigured: number;
    attentionCount: number;
  };
  providers: SocialAccountProviderPayload[];
};

export type SocialAccountDetailResponse = {
  provider: SocialAccountProvider;
  providerLabel: string;
  account: SocialAccountSummaryItem & {
    fieldValues: Record<string, string | null>;
  };
};

export type SocialAccountUpsertPayload = {
  label: string;
  fields: Record<string, string>;
  makeDefault?: boolean;
};

export const socialAccountFieldMap: Record<
  SocialAccountProvider,
  readonly SocialAccountFieldDefinition[]
> = {
  youtube: [
    {
      key: 'youtubeClientId',
      envKey: 'YOUTUBE_CLIENT_ID',
      label: 'YouTube Client ID',
      helperText: 'Paste the OAuth web application client id from Google Cloud.',
      placeholder: '1234567890-abcdefg.apps.googleusercontent.com',
    },
    {
      key: 'youtubeClientSecret',
      envKey: 'YOUTUBE_CLIENT_SECRET',
      label: 'YouTube Client Secret',
      helperText: 'Paste the client secret from the same Google OAuth application.',
      placeholder: 'GOCSPX-xxxxxxxxxxxxxxxx',
      secret: true,
    },
  ],
  meta: [
    {
      key: 'metaAppId',
      envKey: 'META_APP_ID',
      label: 'Meta App ID',
      helperText: 'Use the Meta app that will own the publishing integration.',
      placeholder: '123456789012345',
    },
    {
      key: 'metaAppSecret',
      envKey: 'META_APP_SECRET',
      label: 'Meta App Secret',
      helperText: 'Keep this paired with the Meta App ID used to mint tokens.',
      placeholder: 'Meta app secret',
      secret: true,
    },
    {
      key: 'metaFacebookPageId',
      envKey: 'META_FACEBOOK_PAGE_ID',
      label: 'Facebook Page ID',
      helperText: 'Use the page id that will receive Facebook video posts.',
      placeholder: 'Facebook page id',
    },
    {
      key: 'metaInstagramAccountId',
      envKey: 'META_INSTAGRAM_ACCOUNT_ID',
      label: 'Instagram Account ID',
      helperText: 'Use the Instagram business account id connected to the page.',
      placeholder: 'Instagram account id',
    },
    {
      key: 'metaInstagramPageAccessToken',
      envKey: 'META_INSTAGRAM_PAGE_ACCESS_TOKEN',
      label: 'Meta / Instagram Page Access Token',
      helperText: 'Keep using the current Meta refresh-token methodology. Save the token that belongs to this app and business asset pairing.',
      placeholder: 'Long-lived page access token',
      secret: true,
    },
  ],
  tiktok: [
    {
      key: 'tiktokClientKey',
      envKey: 'TIKTOK_CLIENT_KEY',
      label: 'TikTok Client Key',
      helperText: 'Paste the client key from the TikTok developer app.',
      placeholder: 'TikTok client key',
    },
    {
      key: 'tiktokClientSecret',
      envKey: 'TIKTOK_CLIENT_SECRET',
      label: 'TikTok Client Secret',
      helperText: 'Paste the client secret for the same TikTok developer app.',
      placeholder: 'TikTok client secret',
      secret: true,
    },
  ],
};

export const socialAccountSections: readonly SocialAccountSection[] = [
  {
    provider: 'youtube',
    label: 'YouTube',
    summary: 'Connect channel-specific Google apps so uploads and analytics stay isolated per saved account.',
    description:
      'Each YouTube account will store its own client credentials, refresh tokens, upload status, and reconnect timeline under the signed-in user.',
    icon: Clapperboard,
    accentClassName: 'from-red-500 via-rose-500 to-orange-400',
    badgeClassName: 'border-red-200 bg-red-50 text-red-700',
    requiredKeys: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
    setupNotes: [
      {
        label: 'Authorized origin',
        value: 'https://auto-video-backend.vercel.app',
      },
      {
        label: 'Redirect URI',
        value: 'https://auto-video-backend.vercel.app/youtube/oauth2callback',
      },
    ],
    implementationNotes: [
      'Use one Google Cloud OAuth client per saved YouTube account when you need separate ownership or quota boundaries.',
      'The upload flow will preselect the default saved YouTube account once persistence is wired.',
    ],
    guideSteps: [
      {
        title: 'Create a Google Cloud project for the channel',
        body: 'Open Google Cloud Console, create or choose a project for the channel owner, and enable the YouTube Data API before you create OAuth credentials.',
      },
      {
        title: 'Create an OAuth web application',
        body: 'Inside APIs & Services > Credentials, create OAuth Client ID credentials for a web application so the account can authorize uploads and analytics scopes.',
      },
      {
        title: 'Register the backend origin and callback exactly',
        body: 'Add https://auto-video-backend.vercel.app as an authorized JavaScript origin and add https://auto-video-backend.vercel.app/youtube/oauth2callback as the redirect URI. Both values must match exactly.',
      },
      {
        title: 'Copy the client credentials into Social Accounts',
        body: 'Paste the generated YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET into the YouTube account form for the correct saved account label.',
      },
      {
        title: 'Run the OAuth connection from the product',
        body: 'After saving the account, use the in-app reconnect flow to generate the upload and analytics tokens that belong to that saved YouTube account.',
      },
    ],
  },
  {
    provider: 'meta',
    label: 'Meta',
    summary: 'Store app, page, and Instagram publishing credentials per saved Meta account instead of using one shared workspace token.',
    description:
      'Each Meta account will keep its own app identifiers, publish targets, token lifecycle dates, refresh status, and reconnect state under the signed-in user.',
    icon: Link2,
    accentClassName: 'from-blue-500 via-sky-500 to-cyan-400',
    badgeClassName: 'border-blue-200 bg-blue-50 text-blue-700',
    requiredKeys: [
      'META_APP_ID',
      'META_APP_SECRET',
      'META_FACEBOOK_PAGE_ID',
      'META_INSTAGRAM_ACCOUNT_ID',
      'META_INSTAGRAM_PAGE_ACCESS_TOKEN',
    ],
    setupNotes: [
      {
        label: 'Refresh policy',
        value: 'Keep the current Meta refresh-token methodology exactly as implemented now, but scope it to each saved account.',
      },
      {
        label: 'Publish targets',
        value: 'The Facebook page id and Instagram account id must belong to the same business setup you plan to publish through.',
      },
    ],
    implementationNotes: [
      'This rollout replaces the current shared workspace credentials with per-user, per-account storage.',
      'The Meta account detail view will expose refresh health, reconnect timing, and last token error per saved account.',
    ],
    guideSteps: [
      {
        title: 'Create or open the Meta app used for publishing',
        body: 'Use Meta for Developers to create the app that will own your publishing credentials, then copy the app id and app secret that belong to that app.',
      },
      {
        title: 'Find the publishing targets',
        body: 'Collect the Facebook Page ID and the connected Instagram Account ID for the exact business assets you want this saved account to control.',
      },
      {
        title: 'Generate the long-lived publishing token',
        body: 'Use the same token exchange and refresh process that the current product already relies on. The new Social Accounts page keeps that methodology, but each saved account stores its own refresh lifecycle.',
      },
      {
        title: 'Paste the Meta values into the saved account form',
        body: 'Store META_APP_ID, META_APP_SECRET, META_FACEBOOK_PAGE_ID, META_INSTAGRAM_ACCOUNT_ID, and META_INSTAGRAM_PAGE_ACCESS_TOKEN together under one account label so uploads resolve the correct business assets.',
      },
      {
        title: 'Validate refresh health before publishing',
        body: 'The account card should show reconnect requirements, next refresh window, and the last refresh error before the user starts an upload.',
      },
    ],
  },
  {
    provider: 'tiktok',
    label: 'TikTok',
    summary: 'Use separate TikTok developer credentials per saved account so direct posting and creator options stay isolated.',
    description:
      'Each TikTok account will keep its own client key, client secret, PKCE state, refresh tokens, creator profile metadata, and upload readiness under the signed-in user.',
    icon: Music4,
    accentClassName: 'from-slate-900 via-slate-700 to-cyan-500',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    requiredKeys: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
    setupNotes: [
      {
        label: 'Redirect URI',
        value: 'https://auto-video-backend.vercel.app/tiktok/oauth2callback',
      },
      {
        label: 'Posting flow',
        value: 'Creator privacy options and commercial-content flags are fetched after the saved account completes OAuth.',
      },
    ],
    implementationNotes: [
      'The selected saved TikTok account will drive creator-info loading, privacy options, and direct-post publishing.',
      'Upload modals will block submission until at least one TikTok account is saved and connected.',
    ],
    guideSteps: [
      {
        title: 'Create the TikTok developer app',
        body: 'Open the TikTok developer console, create or choose the app for the creator account, and enable the scopes required for direct publishing.',
      },
      {
        title: 'Register the callback URL exactly',
        body: 'Set the redirect URI to https://auto-video-backend.vercel.app/tiktok/oauth2callback so the backend can complete the PKCE OAuth flow for the saved account.',
      },
      {
        title: 'Copy the client key and client secret',
        body: 'Paste TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET into the saved account form for the correct TikTok account label.',
      },
      {
        title: 'Complete OAuth from inside the product',
        body: 'After the account is saved, run the connect flow so the backend stores account-specific access and refresh tokens together with creator metadata.',
      },
      {
        title: 'Verify creator options in the upload modal',
        body: 'The TikTok upload modal should load privacy and policy options from the selected saved account before it allows posting.',
      },
    ],
  },
] as const;

export const socialAccountSectionMap: Record<
  SocialAccountProvider,
  SocialAccountSection
> = socialAccountSections.reduce(
  (map, section) => {
    map[section.provider] = section;
    return map;
  },
  {} as Record<SocialAccountProvider, SocialAccountSection>,
);

export function normalizeSocialAccountProvider(
  value?: string | null,
): SocialAccountProvider | null {
  const normalized = String(value ?? '').trim().toLowerCase();

  switch (normalized) {
    case 'youtube':
    case 'meta':
    case 'tiktok':
      return normalized;
    default:
      return null;
  }
}

export function getSocialAccountGuideHref(provider: SocialAccountProvider) {
  return `/social-accounts/guides/${provider}`;
}