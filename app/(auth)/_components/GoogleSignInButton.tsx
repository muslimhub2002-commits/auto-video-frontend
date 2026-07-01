'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoogleIcon } from './GoogleIcon';

type GoogleSignInButtonProps = {
  label: string;
  callbackUrl?: string;
};

export function GoogleSignInButton({
  label,
  callbackUrl = '/generate',
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full justify-center gap-3 border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
      disabled={isLoading}
      onClick={async () => {
        setIsLoading(true);
        await signIn('google', { callbackUrl });
      }}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}