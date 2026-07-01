import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { LoginForm } from '../_components/LoginForm';

export const metadata = {
  title: 'Login | Auto Video Generator',
  description: 'Sign in to your Auto Video Generator studio workspace.',
};

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect('/generate');
  }

  return <LoginForm />;
}

