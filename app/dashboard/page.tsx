import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import DashboardPageClient from './DashboardPageClient';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return <DashboardPageClient />;
}

