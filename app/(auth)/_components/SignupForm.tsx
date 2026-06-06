'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/lib/auth';
import { seedClientSession } from '@/lib/client-session';
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth';
import { GoogleSignInButton } from './GoogleSignInButton';

export function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const registerData = {
        email: data.email,
        password: data.password,
      };
      const response = await authService.register(registerData);
      seedClientSession({
        user: response.user,
        backendAccessToken: response.access_token,
        authProvider: 'credentials',
      });

      router.replace('/generate');
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error && submitError.message.trim()
          ? submitError.message
          : 'Failed to create account';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-[0_32px_90px_-55px_rgba(99,102,241,0.22)] backdrop-blur-xl sm:p-8">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-indigo-600">
          <Sparkles className="h-3.5 w-3.5" />
          New creator workspace
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Create an account that ships faster
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
          Start with a clean studio, connect Google if you want instant access, and move
          straight into production-ready short-form videos.
        </p>
      </div>

      <div className="space-y-4">
        <GoogleSignInButton label="Sign up with Google" />

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Or create with email
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
              placeholder="team@creatorstudio.com"
              autoComplete="email"
              className="h-11 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
              {...register('email')}
              disabled={isLoading}
            />
            {errors.email && <p className="text-sm text-rose-600">{errors.email.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="h-11 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && <p className="text-sm text-rose-600">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                autoComplete="new-password"
                className="h-11 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                {...register('confirmPassword')}
                disabled={isLoading}
              />
              {errors.confirmPassword && <p className="text-sm text-rose-600">{errors.confirmPassword.message}</p>}
            </div>
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
                Creating account
              </>
            ) : (
              <>
                Launch my workspace
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Already have access?{' '}
          <Link href="/login" className="font-medium text-slate-950 transition hover:text-indigo-600">
            Sign in instead
          </Link>
        </p>
        <p>
          We only use your data as described in our{' '}
          <Link href="/privacy" className="text-slate-700 transition hover:text-indigo-600">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}