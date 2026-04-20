'use client';

import { Accordion } from '@/components/ui/accordion';
import { usePathname, useSearchParams } from 'next/navigation';
import { Clapperboard, FileText, UserRound } from 'lucide-react';
import type { User } from '@/lib/auth';
import { SidebarFooter } from './sidebar/SidebarFooter';
import { SidebarItemButton } from './sidebar/SidebarItemButton';
import { SidebarItemList } from './sidebar/SidebarItemList';
import { SidebarSection } from './sidebar/SidebarSection';
import {
  normalizeScriptCategory,
  scriptPlatforms,
  utilityItems,
  videoPlatforms,
} from './sidebar/sidebar-data';

interface SidebarProps {
  user: User | null;
  isOpen: boolean;
  onLogout: () => void;
}

export function Sidebar({ user, isOpen, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeScriptCategory =
    pathname === '/scripts'
      ? normalizeScriptCategory(searchParams.get('category'))
      : null;

  return (
    <div
      className={`${isOpen ? 'w-72' : 'w-0'} flex flex-col overflow-hidden border-r border-slate-200/80 bg-linear-to-b from-stone-100 via-white to-slate-100 transition-all duration-300`}
    >
      <div className="flex-1 px-4 py-4">
        <Accordion type="multiple" defaultValue={[]} className="space-y-4">
          <SidebarSection
            value="scripts"
            title="Scripts"
            icon={FileText}
            iconGradient="from-amber-400 via-orange-500 to-rose-500 shadow-orange-200"
          >
            <SidebarItemList items={scriptPlatforms} activeCategory={activeScriptCategory} />
          </SidebarSection>

          <SidebarSection
            value="videos"
            title="Videos"
            icon={Clapperboard}
            iconGradient="from-sky-400 via-blue-500 to-indigo-600 shadow-sky-200"
          >
            <SidebarItemList items={videoPlatforms} />
          </SidebarSection>

          <SidebarSection
            value="workspace"
            title="Workspace"
            icon={UserRound}
            iconGradient="from-emerald-400 via-teal-500 to-cyan-600 shadow-emerald-200"
          >
            <div className="space-y-2">
              {utilityItems.map((item) => {
                return (
                  <SidebarItemButton
                    key={item.label}
                    label={item.label}
                    description={item.description}
                    icon={item.icon}
                    badgeClassName="border-slate-200 bg-white text-slate-700"
                  />
                );
              })}
            </div>
          </SidebarSection>
        </Accordion>
      </div>
      <SidebarFooter user={user} onLogout={onLogout} />
    </div>
  );
}
