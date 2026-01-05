'use client';

import { useEffect, useState } from 'react';

export function useVideoJob(apiBaseUrl: string) {
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [videoJobStatus, setVideoJobStatus] = useState<string | null>(null);
  const [videoJobError, setVideoJobError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoJobId) return;
    if (videoJobStatus === 'completed' || videoJobStatus === 'failed') {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/videos/${videoJobId}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          status?: string;
          error?: string | null;
          videoUrl?: string | null;
        };
        if (cancelled) return;
        if (data.status) setVideoJobStatus(data.status);
        if (data.error) setVideoJobError(data.error);
        if (data.videoUrl) {
          setVideoUrl(data.videoUrl);
        }
      } catch {
        // ignore transient errors while polling
      }
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [apiBaseUrl, videoJobId, videoJobStatus]);

  const resetJob = () => {
    setVideoJobId(null);
    setVideoJobStatus(null);
    setVideoJobError(null);
    setVideoUrl(null);
  };

  const setJobFromResponse = (id: string, status: string) => {
    setVideoJobId(id);
    setVideoJobStatus(status);
  };

  return {
    videoJobId,
    videoJobStatus,
    videoJobError,
    videoUrl,
    resetJob,
    setJobFromResponse,
    setVideoJobError,
    setVideoUrl,
  };
}
