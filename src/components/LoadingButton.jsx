/**
 * LoadingButton Component for Heliostat Cleanliness Measurement System
 *
 * Button with loading state, spinner animation, and disabled state during loading
 */

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * LoadingButton Component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {Function} props.onClick - Click handler (can be async)
 * @param {boolean} props.loading - External loading state control
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.loadingText - Text to show while loading
 * @param {React.ReactNode} props.icon - Icon component to show
 * @param {string} props.variant - Button variant: 'primary' | 'secondary' | 'ghost'
 * @param {string} props.size - Button size: 'sm' | 'md' | 'lg'
 */
export function LoadingButton({
  children,
  onClick,
  loading: externalLoading,
  disabled = false,
  className = '',
  loadingText,
  icon: Icon,
  variant = 'secondary',
  size = 'md',
  ...rest
}) {
  const [internalLoading, setInternalLoading] = useState(false);

  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;

  const handleClick = async (e) => {
    if (isLoading || disabled) return;

    if (onClick) {
      // If onClick returns a promise, handle loading state
      const result = onClick(e);
      if (result instanceof Promise) {
        setInternalLoading(true);
        try {
          await result;
        } finally {
          setInternalLoading(false);
        }
      }
    }
  };

  // Variant styles
  const variantStyles = {
    primary: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20',
    secondary: 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700',
    ghost: 'text-slate-400 hover:text-white hover:bg-slate-700'
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2'
  };

  const baseStyles = 'rounded-xl font-medium transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <>
          <RefreshCw size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="animate-spin" />
          {loadingText || children}
        </>
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
          {children}
        </>
      )}
    </button>
  );
}

/**
 * Simulate a backend request delay
 * Useful for testing loading states
 *
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise} Promise that resolves after delay
 */
export function simulateBackendDelay(ms = 1500) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default LoadingButton;
