'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { GoogleSignInButton } from './GoogleSignInButton';

const readSignInError = (result: unknown) => {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const code = 'code' in result && typeof result.code === 'string' ? result.code.trim() : '';
  if (code) {
    return decodeURIComponent(code);
  }

  const error = 'error' in result && typeof result.error === 'string' ? result.error.trim() : '';
  return error || null;
};

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl: '/generate',
      });

      if (!result?.ok) {
        setError(readSignInError(result) ?? 'Invalid email or password');
        return;
      }

      router.replace('/generate');
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error && submitError.message.trim()
          ? submitError.message
          : 'Unable to sign in right now';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-[0_32px_90px_-55px_rgba(99,102,241,0.22)] backdrop-blur-xl sm:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-indigo-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure access
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Welcome back to your studio
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
            Pick up where you left off and move straight into scripts, visuals, voice, and
            render orchestration.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <GoogleSignInButton label="Continue with Google" />

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Or use email
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="creator@brand.com"
              autoComplete="email"
              className="h-11 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
              {...register('email')}
              disabled={isLoading}
            />
            {errors.email && <p className="text-sm text-rose-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password" className="text-slate-700">
                Password
              </Label>
              <span className="text-xs text-slate-400">Minimum 6 characters</span>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-11 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
              {...register('password')}
              disabled={isLoading}
            />
            {errors.password && <p className="text-sm text-rose-600">{errors.password.message}</p>}
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="h-11 w-full justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in
              </>
            ) : (
              <>
                Enter workspace
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          New here?{' '}
          <Link href="/signup" className="font-medium text-slate-950 transition hover:text-indigo-600">
            Create your account
          </Link>
        </p>
        <p>
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-slate-700 transition hover:text-indigo-600">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-slate-700 transition hover:text-indigo-600">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}