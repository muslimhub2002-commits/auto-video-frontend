import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { SignupForm } from '../_components/SignupForm';

export const metadata = {
  title: 'Sign Up | Auto Video Generator',
  description: 'Create your Auto Video Generator workspace.',
};

export default async function SignupPage() {
  const session = await auth();

  if (session?.user) {
    redirect('/generate');
  }

  return <SignupForm />;
}

