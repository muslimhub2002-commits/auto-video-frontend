import type { ReactNode } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { LucideIcon } from 'lucide-react';

type SidebarSectionProps = {
  value: string;
  title: string;
  icon: LucideIcon;
  iconGradient: string;
  children: ReactNode;
};

export function SidebarSection({
  value,
  title,
  icon: Icon,
  iconGradient,
  children,
}: SidebarSectionProps) {
  return (
    <AccordionItem
      value={value}
      className="overflow-hidden rounded-[28px] border border-b-0 border-white/70 bg-white/85 px-4 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur"
    >
      <AccordionTrigger className="cursor-pointer py-4 hover:no-underline">
        <div className="flex items-center gap-3 text-left">
          <div className={`rounded-2xl bg-linear-to-br p-2.5 text-white shadow-lg ${iconGradient}`}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">{title}</h3>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 pt-1">{children}</AccordionContent>
    </AccordionItem>
  );
}