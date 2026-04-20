import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BrandLockup } from './brand-lockup';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

type SiteHeaderProps = {
  activePath?: string;
};

export function SiteHeader({ activePath }: SiteHeaderProps) {
  return (
    <header className="relative border-b border-slate-200/80 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <BrandLockup />

        <nav className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                activePath === link.href
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/signup">Start Free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}