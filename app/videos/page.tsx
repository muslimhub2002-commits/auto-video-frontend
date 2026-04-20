import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  normalizeVideoPlatform,
  type VideoPlatformCategory,
} from '../generate/_components/sidebar/sidebar-data';
import { VideosPageInner } from './VideosPageInner';

type VideosPageProps = {
  searchParams?: Promise<{
    platform?: string | string[];
  }>;
};

export default async function VideosPage({ searchParams }: VideosPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawPlatform = Array.isArray(resolvedSearchParams?.platform)
    ? resolvedSearchParams.platform[0]
    : resolvedSearchParams?.platform;

  const initialPlatform = normalizeVideoPlatform(
    rawPlatform,
  ) as VideoPlatformCategory;

  return <VideosPageInner initialPlatform={initialPlatform} />;
}