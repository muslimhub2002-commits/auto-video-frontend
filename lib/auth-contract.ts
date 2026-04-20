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