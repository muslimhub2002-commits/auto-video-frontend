import type { PlatformItem, ScriptCategory } from './sidebar-data';
import { SidebarItemButton } from './SidebarItemButton';

type SidebarItemListProps = {
  items: readonly PlatformItem[];
  activeCategory?: ScriptCategory | null;
};

export function SidebarItemList({ items, activeCategory }: SidebarItemListProps) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <SidebarItemButton
          key={item.label}
          label={item.label}
          description={item.meta}
          badgeLabel={item.code}
          badgeClassName={`${item.accent} text-[11px] font-black tracking-[0.18em]`}
          href={item.href}
          isActive={!!activeCategory && item.category === activeCategory}
        />
      ))}
    </div>
  );
}