'use client';

import { Images } from 'lucide-react';

export function EmptyScenesState() {
  return (
    <div className="text-center py-20 bg-linear-to-br from-gray-50 to-gray-100/50 rounded-2xl border-2 border-dashed border-gray-300">
      <div className="flex flex-col items-center gap-4">
        <div className="p-5 bg-white rounded-2xl shadow-md">
          <Images className="h-10 w-10 text-gray-400" />
        </div>
        <div>
          <p className="text-base font-bold text-gray-700 mb-1.5">No scenes yet</p>
          <p className="text-sm text-gray-500">
            Write a script and click &quot;Split into Sentences&quot; to get started
          </p>
        </div>
      </div>
    </div>
  );
}
