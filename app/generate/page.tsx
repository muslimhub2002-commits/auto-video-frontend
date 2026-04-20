import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import GeneratePageClient from './GeneratePageClient';

export default async function GeneratePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return <GeneratePageClient />;
}

