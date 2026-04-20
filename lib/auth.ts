import api from './api';
import {
  clearClientSessionCache,
  getBackendAccessToken,
  getClientSession,
  getSessionUser,
  signOutClient,
} from './client-session';
import type { AppUser, AuthResponse, LoginData, RegisterData } from './auth-contract';

export type User = AppUser;
export type { AuthResponse, LoginData, RegisterData };

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  async getToken() {
    return getBackendAccessToken();
  },

  async getSession() {
    return getClientSession();
  },

  async getUser() {
    return getSessionUser();
  },

  async logout(options?: { redirectTo?: string }) {
    clearClientSessionCache();
    await signOutClient(options?.redirectTo ?? '/login');
  },

  async isAuthenticated() {
    return !!(await getBackendAccessToken());
  },
};

