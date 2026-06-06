'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoogleIcon } from './GoogleIcon';

type GoogleSignInButtonProps = {
  label: string;
  callbackUrl?: string;
};

export function GoogleSignInButton({
  label,
}: GoogleSignInButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full justify-center gap-3 border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
      disabled
    >
      <GoogleIcon className="h-4 w-4" />
      <span>{label}</span>
      <AlertCircle className="h-4 w-4 text-amber-500" />
    </Button>
  );
}