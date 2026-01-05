'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconGradient: 'from-emerald-400 to-green-500',
          iconGlow: 'bg-emerald-500',
          borderGradient: 'from-emerald-500/50 to-green-500/50',
          bgGradient: 'from-emerald-50 to-green-50/50',
          buttonGradient: 'from-emerald-500 to-green-600',
          buttonHover: 'hover:from-emerald-600 hover:to-green-700',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconGradient: 'from-amber-400 to-orange-500',
          iconGlow: 'bg-amber-500',
          borderGradient: 'from-amber-500/50 to-orange-500/50',
          bgGradient: 'from-amber-50 to-orange-50/50',
          buttonGradient: 'from-amber-500 to-orange-600',
          buttonHover: 'hover:from-amber-600 hover:to-orange-700',
        };
      case 'error':
        return {
          icon: XCircle,
          iconGradient: 'from-rose-400 to-red-500',
          iconGlow: 'bg-rose-500',
          borderGradient: 'from-rose-500/50 to-red-500/50',
          bgGradient: 'from-rose-50 to-red-50/50',
          buttonGradient: 'from-rose-500 to-red-600',
          buttonHover: 'hover:from-rose-600 hover:to-red-700',
        };
      default:
        return {
          icon: Info,
          iconGradient: 'from-blue-400 to-indigo-500',
          iconGlow: 'bg-blue-500',
          borderGradient: 'from-blue-500/50 to-indigo-500/50',
          bgGradient: 'from-blue-50 to-indigo-50/50',
          buttonGradient: 'from-blue-500 to-indigo-600',
          buttonHover: 'hover:from-blue-600 hover:to-indigo-700',
        };
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop with gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md animate-in fade-in duration-200" />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-md animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient border effect */}
        <div className={`absolute inset-0 bg-linear-to-br ${styles.borderGradient} rounded-2xl blur-xl opacity-50`}></div>
        
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Gradient header background */}
          <div className={`absolute top-0 left-0 right-0 h-32 bg-linear-to-br ${styles.bgGradient} opacity-40`}></div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-600 hover:text-gray-900 hover:bg-white transition-all duration-200 hover:scale-110 shadow-sm"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="relative px-6 pt-6 pb-4">
            {/* Icon with gradient and glow */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className={`absolute inset-0 bg-linear-to-br ${styles.iconGradient} rounded-2xl blur-xl opacity-40 animate-pulse`}></div>
                <div className={`relative bg-linear-to-br ${styles.iconGradient} p-4 rounded-2xl shadow-lg`}>
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            {/* Title and message */}
            <div className="text-center space-y-2">
              {title && (
                <h3 className="text-xl font-bold bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                  {title}
                </h3>
              )}
              <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
                {message}
              </p>
            </div>
          </div>

          {/* Footer with gradient button */}
          <div className="relative px-6 py-4 bg-linear-to-br from-gray-50 to-white border-t border-gray-100">
            <button
              onClick={onClose}
              className={`w-full group relative overflow-hidden px-6 py-3 bg-linear-to-r ${styles.buttonGradient} text-white rounded-xl font-semibold shadow-lg ${styles.buttonHover} transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 hover:shadow-xl hover:scale-[1.02]`}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative">Got it</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for using the alert modal
export const useAlertModal = () => {
  const [alertState, setAlertState] = React.useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  }>({
    isOpen: false,
    message: '',
  });

  const showAlert = React.useCallback(
    (
      message: string,
      options?: {
        title?: string;
        type?: 'info' | 'success' | 'warning' | 'error';
      }
    ) => {
      setAlertState({
        isOpen: true,
        message,
        title: options?.title,
        type: options?.type || 'info',
      });
    },
    []
  );

  const closeAlert = React.useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    alertState,
    showAlert,
    closeAlert,
  };
};
