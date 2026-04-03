'use client';

import { useEffect } from 'react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';
import { Button } from './button';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: AlertDialogProps) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isLoading, isOpen, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: Trash2,
      iconGradient: 'from-rose-500 via-red-500 to-orange-500',
      borderGradient: 'from-rose-400/60 via-red-300/50 to-orange-300/60',
      glowColor: 'bg-rose-500/25',
      backgroundGradient: 'from-rose-50 via-white to-orange-50',
      accentBadge: 'bg-rose-100 text-rose-700 border border-rose-200',
      confirmClass:
        'bg-linear-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconGradient: 'from-amber-400 via-yellow-500 to-orange-500',
      borderGradient: 'from-amber-300/70 via-yellow-300/40 to-orange-300/60',
      glowColor: 'bg-amber-500/25',
      backgroundGradient: 'from-amber-50 via-white to-orange-50',
      accentBadge: 'bg-amber-100 text-amber-800 border border-amber-200',
      confirmClass:
        'bg-linear-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-600 hover:via-yellow-600 hover:to-orange-600 text-white',
    },
    info: {
      icon: Info,
      iconGradient: 'from-sky-400 via-blue-500 to-indigo-500',
      borderGradient: 'from-sky-300/70 via-blue-300/45 to-indigo-300/60',
      glowColor: 'bg-blue-500/25',
      backgroundGradient: 'from-sky-50 via-white to-indigo-50',
      accentBadge: 'bg-sky-100 text-sky-700 border border-sky-200',
      confirmClass:
        'bg-linear-to-r from-sky-500 via-blue-500 to-indigo-500 hover:from-sky-600 hover:via-blue-600 hover:to-indigo-600 text-white',
    },
  };

  const style = variantStyles[variant];
  const Icon = style.icon;

  return (
    <div
      className="fixed inset-0 z-70 min-h-full flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="relative w-full max-w-3xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`absolute inset-0 rounded-[2rem] bg-linear-to-br ${style.borderGradient} blur-2xl opacity-70`} />

        <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
          <div className={`absolute inset-x-0 top-0 h-44 bg-linear-to-br ${style.backgroundGradient} opacity-95`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.72),transparent_35%)]" />
          <div className={`absolute -left-12 top-10 h-36 w-36 rounded-full ${style.glowColor} blur-3xl`} />
          <div className="absolute right-0 top-0 h-28 w-40 bg-white/45 blur-2xl" />

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="absolute right-5 top-5 z-10 rounded-2xl border border-white/70 bg-white/75 p-2.5 text-slate-500 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative px-6 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="relative shrink-0 self-start">
                <div className={`absolute inset-0 rounded-[1.6rem] ${style.glowColor} blur-2xl`} />
                <div className={`relative flex h-18 w-18 items-center justify-center rounded-[1.6rem] bg-linear-to-br ${style.iconGradient} shadow-lg`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1 pr-8 sm:pr-14">
                <div className={`mb-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${style.accentBadge}`}>
                  {variant}
                </div>
                <h3 className="max-w-3xl text-2xl font-bold tracking-tight text-slate-900 sm:text-[2rem] sm:leading-[1.1]">
                  {title}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  {description}
                </p>
              </div>
            </div>
          </div>

          <div className="relative border-t border-slate-200/80 bg-linear-to-br from-slate-50 via-white to-slate-50 px-6 py-5 sm:px-8">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel ?? onClose}
                disabled={isLoading}
                className="h-auto min-h-12 w-full rounded-2xl border-slate-200 bg-white/85 px-5 py-3 text-center whitespace-normal leading-snug text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white disabled:cursor-not-allowed"
              >
                {cancelText}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onConfirm}
                disabled={isLoading}
                className={`h-auto min-h-12 w-full rounded-2xl px-5 py-3 whitespace-normal text-center leading-snug shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed ${style.confirmClass}`}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
