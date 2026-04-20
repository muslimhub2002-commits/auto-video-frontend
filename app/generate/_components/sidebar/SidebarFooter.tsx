import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import type { User } from '@/lib/auth';

type SidebarFooterProps = {
  user: User | null;
  onLogout: () => void;
};

export function SidebarFooter({ user, onLogout }: SidebarFooterProps) {
  return (
    <div className="border-t border-slate-200/80 p-4">
      <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.55)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{user?.email}</p>
            <p className="text-xs text-slate-500">Profile access and sign-out</p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={onLogout}
          className="mt-4 w-full cursor-pointer justify-between rounded-2xl border-slate-200 bg-slate-950 text-white hover:bg-slate-800 hover:text-white"
        >
          <span>Logout</span>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}