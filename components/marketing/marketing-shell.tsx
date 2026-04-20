import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

type MarketingShellProps = {
  children: React.ReactNode;
  activePath?: string;
};

export function MarketingShell({ children, activePath }: MarketingShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f8fc] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(129,140,248,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,242,255,0.96))]" />
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.06)_1px,transparent_1px)] opacity-60"
        style={{ backgroundSize: '72px 72px' }}
      />

      <div className="relative flex min-h-screen flex-col">
        <SiteHeader activePath={activePath} />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </div>
  );
}