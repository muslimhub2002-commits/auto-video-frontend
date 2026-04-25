import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { SocialAccountsPageInner } from './SocialAccountsPageInner';

export default async function SocialAccountsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return <SocialAccountsPageInner />;
}