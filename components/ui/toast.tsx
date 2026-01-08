'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgGradient: 'from-emerald-500 to-green-600',
          iconColor: 'text-white',
        };
      case 'error':
        return {
          icon: XCircle,
          bgGradient: 'from-rose-500 to-red-600',
          iconColor: 'text-white',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgGradient: 'from-amber-500 to-orange-600',
          iconColor: 'text-white',
        };
      default:
        return {
          icon: Info,
          bgGradient: 'from-blue-500 to-indigo-600',
          iconColor: 'text-white',
        };
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.icon;

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-gradient-to-r ${styles.bgGradient} text-white min-w-[300px] max-w-[500px]`}>
        <IconComponent className={`h-5 w-5 shrink-0 ${styles.iconColor}`} />
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [nextId, setNextId] = useState(0);

  const showToast = (message: string, type: ToastType = 'info', duration = 3000) => {
    const id = nextId;
    setNextId(id + 1);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map((toast, index) => (
        <div key={toast.id} style={{ top: `${1 + index * 5}rem` }} className="fixed right-4 z-[9999]">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </>
  );

  return {
    showToast,
    ToastContainer,
  };
};
