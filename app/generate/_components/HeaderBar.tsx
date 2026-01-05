'use client';

import { Button } from '@/components/ui/button';
import { Menu, Video } from 'lucide-react';

interface HeaderBarProps {
  onToggleSidebar: () => void;
}

export function HeaderBar({ onToggleSidebar }: HeaderBarProps) {
  return (
    <div className="border-b border-gray-200 p-4 flex items-center gap-4 bg-white">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="text-gray-900 hover:bg-gray-100"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">AI Video Generator</h1>
      </div>
    </div>
  );
}
