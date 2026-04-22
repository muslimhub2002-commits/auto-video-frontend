'use client';

import { useEffect, useRef } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { SidebarProfileHeader } from '@/app/generate/_components/sidebar/SidebarProfileHeader';
import { usePathname, useSearchParams } from 'next/navigation';
import { Clapperboard, FileText, UserRound, Video } from 'lucide-react';
import type { User } from '@/lib/auth';
import { SidebarItemButton } from './sidebar/SidebarItemButton';
import { SidebarItemList } from './sidebar/SidebarItemList';
import { SidebarSection } from './sidebar/SidebarSection';
import {
  normalizeScriptCategory,
  normalizeVideoPlatform,
  scriptPlatforms,
  utilityItems,
  videoPlatforms,
} from './sidebar/sidebar-data';

interface SidebarProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function Sidebar({ user, isOpen, onClose, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const routeKey = `${pathname}?${searchParamsKey}`;
  const previousRouteKeyRef = useRef(routeKey);
  const isGenerateActive = pathname.startsWith('/generate');
  const activeScriptCategory =
    pathname === '/scripts'
      ? normalizeScriptCategory(searchParams.get('category'))
      : null;
  const activeVideoPlatform =
    pathname === '/videos'
      ? normalizeVideoPlatform(searchParams.get('platform'))
      : null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const previousRouteKey = previousRouteKeyRef.current;
    previousRouteKeyRef.current = routeKey;

    if (!isOpen || previousRouteKey === routeKey) {
      return;
    }

    onClose();
  }, [isOpen, onClose, routeKey]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const renderSidebarContent = () => (
    <div className="flex-1 space-y-4 px-4 py-4">
      <SidebarProfileHeader user={user} onLogout={onLogout} />

      <SidebarItemButton
        label="Add New Generation"
        description="Start a fresh script and video workflow"
        icon={Video}
        href="/generate"
        isActive={isGenerateActive}
        tone="primary"
        badgeClassName="border-white/20 bg-white/15 text-white"
      />

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
          <SidebarItemList
            items={videoPlatforms}
            activeCategory={activeVideoPlatform}
          />
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
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-40 lg:hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className={`absolute inset-0 bg-slate-950/24 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        />

        <aside
          className={`absolute inset-y-0 left-0 flex h-full w-80 max-w-[86vw] flex-col overflow-hidden border-r border-slate-200/80 bg-linear-to-b from-stone-100 via-white to-slate-100 shadow-[0_32px_80px_-32px_rgba(15,23,42,0.6)] transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {renderSidebarContent()}
          </div>
        </aside>
      </div>

      <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:overflow-hidden lg:border-r lg:border-slate-200/80 lg:bg-linear-to-b lg:from-stone-100 lg:via-white lg:to-slate-100">
        {renderSidebarContent()}
      </aside>
    </>
  );
}
