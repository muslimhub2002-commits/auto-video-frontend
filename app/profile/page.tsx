import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ProfilePageInner } from './ProfilePageInner';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return <ProfilePageInner />;
}