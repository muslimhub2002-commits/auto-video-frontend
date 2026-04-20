import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import type { User } from '@/lib/auth';

type SidebarProfileHeaderProps = {
  user: User | null;
  onLogout: () => void;
};

export function SidebarProfileHeader({ user, onLogout }: SidebarProfileHeaderProps) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.55)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
          {user?.email?.charAt(0).toUpperCase() || '?'}
        </div>
        <p className="truncate text-sm font-semibold text-slate-900">{user?.email || 'Unknown user'}</p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onLogout}
          className="cursor-pointer rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}