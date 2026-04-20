import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';

type SidebarItemButtonProps = {
  label: string;
  description: string;
  badgeClassName: string;
  badgeLabel?: string;
  icon?: LucideIcon;
  href?: string;
  isActive?: boolean;
};

export function SidebarItemButton({
  label,
  description,
  badgeClassName,
  badgeLabel,
  icon: Icon,
  href,
  isActive = false,
}: SidebarItemButtonProps) {
  const className = `group flex w-full cursor-pointer items-center justify-between rounded-2xl border px-3 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md ${
    isActive
      ? 'border-slate-900/80 bg-white shadow-[0_18px_30px_-24px_rgba(15,23,42,0.7)]'
      : 'border-slate-200/70 bg-slate-50/80 hover:border-slate-300'
  }`;

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${badgeClassName}`}>
          {Icon ? (
            <Icon className="h-4 w-4" />
          ) : (
            <span className="text-[11px] font-black tracking-[0.18em]">{badgeLabel}</span>
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
          <p className="truncate text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <ChevronRight className={`h-4 w-4 shrink-0 transition ${isActive ? 'text-slate-600' : 'text-slate-300 group-hover:text-slate-500'}`} />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
    >
      {content}
    </button>
  );
}