import axios, { AxiosHeaders, type AxiosInstance } from 'axios';
import { API_URL, YOUTUBE_API_URL } from './api-config';
import {
  clearClientSessionCache,
  getBackendAccessToken,
  signOutClient,
} from './client-session';

function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    withCredentials: true,
  });

  client.interceptors.request.use(async (config) => {
    const headers = AxiosHeaders.from(config.headers);
    const token = await getBackendAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      headers.delete('Content-Type');
    }

    config.headers = headers;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        const rawUrl = error.config?.url ?? '';
        const url =
          rawUrl && rawUrl.startsWith('http')
            ? new URL(rawUrl).pathname
            : rawUrl;

        const isAuthEndpoint =
          url.startsWith('/auth/login') ||
          url.startsWith('/auth/register') ||
          url.startsWith('/auth/google/exchange');

        if (!isAuthEndpoint) {
          clearClientSessionCache();
          await signOutClient('/login');
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
}

export const api = createApiClient(API_URL);
export const youtubeApi = createApiClient(YOUTUBE_API_URL);
export { API_URL, YOUTUBE_API_URL };

export default api;

