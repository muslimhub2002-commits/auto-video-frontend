export interface AppUser {
  id: string;
  email: string;
  roles: string[];
  number_of_videos_generated: number;
  number_of_images_generated: number;
  number_of_voices_generated: number;
  created_at: string;
  updated_at: string;
}

export type ProfilePublishedPlatform =
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'tiktok';

export type ProfileSocialProvider = 'youtube' | 'meta' | 'tiktok';

export interface AppProfileSummary {
  user: AppUser;
  generation: {
    videosGenerated: number;
    imagesGenerated: number;
    voicesGenerated: number;
  };
  workspace: {
    totalScripts: number;
    draftScripts: number;
    videoLibraryCount: number;
    publishedVideoCount: number;
    publishedByPlatform: Record<ProfilePublishedPlatform, number>;
    recentActivity: {
      latestScript: {
        id: string;
        title: string | null;
        createdAt: string;
        updatedAt: string;
      } | null;
      latestPublishedVideo: {
        id: string;
        title: string | null;
        updatedAt: string;
        publishedPlatforms: ProfilePublishedPlatform[];
      } | null;
    };
  };
  socialAccounts: {
    totalAccounts: number;
    providersConfigured: number;
    defaultsConfigured: number;
    attentionCount: number;
    providers: Array<{
      provider: ProfileSocialProvider;
      providerLabel: string;
      total: number;
      defaultAccountId: string | null;
      attentionCount: number;
    }>;
  };
}

export interface AuthResponse {
  access_token: string;
  user: AppUser;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}