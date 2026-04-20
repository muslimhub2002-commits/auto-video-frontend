import axios, { AxiosHeaders, type AxiosInstance } from 'axios';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
export const YOUTUBE_API_URL = 'https://auto-video-backend.vercel.app';

function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    const headers = AxiosHeaders.from(config.headers);
    const token = localStorage.getItem('token');
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
    (error) => {
      if (error.response?.status === 401) {
        const rawUrl = error.config?.url ?? '';
        const url =
          rawUrl && rawUrl.startsWith('http')
            ? new URL(rawUrl).pathname
            : rawUrl;

        const isAuthEndpoint =
          url.startsWith('/auth/login') || url.startsWith('/auth/register');

        if (!isAuthEndpoint) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
}

export const api = createApiClient(API_URL);
export const youtubeApi = createApiClient(YOUTUBE_API_URL);

export default api;

