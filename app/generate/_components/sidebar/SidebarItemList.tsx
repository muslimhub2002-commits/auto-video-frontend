import type { PlatformItem } from './sidebar-data';
import { SidebarItemButton } from './SidebarItemButton';

type SidebarItemListProps<Category extends string = string> = {
  items: readonly PlatformItem<Category>[];
  activeCategory?: Category | null;
};

export function SidebarItemList<Category extends string = string>({
  items,
  activeCategory,
}: SidebarItemListProps<Category>) {
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