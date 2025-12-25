/**
 * Toast Notification System for Heliostat Cleanliness Measurement System
 *
 * Provides a global toast notification context and components
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';

// Toast Context
const ToastContext = createContext(null);

/**
 * Toast types and their corresponding styles
 */
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    bgClass: 'bg-emerald-500/10 border-emerald-500/30',
    iconClass: 'text-emerald-400',
    textClass: 'text-emerald-300'
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-amber-500/10 border-amber-500/30',
    iconClass: 'text-amber-400',
    textClass: 'text-amber-300'
  },
  error: {
    icon: AlertCircle,
    bgClass: 'bg-rose-500/10 border-rose-500/30',
    iconClass: 'text-rose-400',
    textClass: 'text-rose-300'
  },
  info: {
    icon: Info,
    bgClass: 'bg-blue-500/10 border-blue-500/30',
    iconClass: 'text-blue-400',
    textClass: 'text-blue-300'
  }
};

/**
 * Individual Toast Component
 */
function ToastItem({ id, type, message, onClose }) {
  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg ${config.bgClass} animate-slide-in`}
      role="alert"
    >
      <Icon size={20} className={config.iconClass} />
      <span className={`flex-1 text-sm font-medium ${config.textClass}`}>
        {message}
      </span>
      <button
        onClick={() => onClose(id)}
        className="text-slate-500 hover:text-white transition-colors p-1"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * Toast Container Component - renders all active toasts
 */
function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          {...toast}
          onClose={removeToast}
        />
      ))}
    </div>
  );
}

/**
 * Toast Provider Component
 * Wrap your app with this to enable toast notifications
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = Date.now() + Math.random();

    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message, duration) => addToast('success', message, duration),
    warning: (message, duration) => addToast('warning', message, duration),
    error: (message, duration) => addToast('error', message, duration),
    info: (message, duration) => addToast('info', message, duration)
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast functions
 * @returns {Object} Toast functions: success, warning, error, info
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
