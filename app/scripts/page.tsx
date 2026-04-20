import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScriptsPageInner } from './ScriptsPageInner';

export default async function ScriptsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return <ScriptsPageInner />;
}