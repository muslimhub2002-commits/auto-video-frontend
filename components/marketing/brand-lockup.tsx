import Link from 'next/link';
import { Video } from 'lucide-react';
import { cn } from '@/lib/utils';

type BrandLockupProps = {
  href?: string;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

export function BrandLockup({
  href = '/',
  className,
  titleClassName,
  subtitleClassName,
}: BrandLockupProps) {
  return (
    <Link href={href} className={cn('flex items-center gap-3 transition hover:opacity-90', className)}>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-[0_0_0_1px_rgba(99,102,241,0.08)]">
        <Video className="h-5 w-5" />
      </span>
      <span>
        <span
          className={cn(
            'block text-sm font-semibold uppercase tracking-[0.32em] text-slate-500',
            subtitleClassName,
          )}
        >
          Auto Video Generator
        </span>
        <span className={cn('block text-base font-medium text-slate-950', titleClassName)}>
          AI creator studio
        </span>
      </span>
    </Link>
  );
}