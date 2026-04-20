import Link from 'next/link';
import { BrandLockup } from './brand-lockup';

export function SiteFooter() {
  return (
    <footer className="relative border-t border-slate-200/80 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-3">
          <BrandLockup titleClassName="text-slate-900" />
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            A production-grade workspace for AI scripts, scenes, voice-overs, rendering, and
            distribution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/privacy" className="transition hover:text-indigo-700">
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition hover:text-indigo-700">
            Terms of Service
          </Link>
          <Link href="/login" className="transition hover:text-indigo-700">
            Login
          </Link>
          <Link href="/signup" className="transition hover:text-indigo-700">
            Sign Up
          </Link>
        </div>
      </div>
    </footer>
  );
}