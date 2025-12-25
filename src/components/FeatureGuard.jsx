/**
 * FeatureGuard Component for Heliostat Cleanliness Measurement System
 *
 * Wraps buttons/features that require backend API or MODBUS connection
 * Displays "Function not ready" toast when feature is unavailable
 */

import React from 'react';
import { useToast } from './Toast';

/**
 * FeatureGuard HOC - wraps a button component to handle unavailable features
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {boolean} props.isReady - Whether the feature is ready (backend connected)
 * @param {string} props.featureName - Name of the feature for the toast message
 * @param {Function} props.onReady - Callback when feature is ready and clicked
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Additional disabled state
 * @param {Object} props.rest - Other props to pass to button
 */
export function FeatureGuard({
  children,
  isReady = false,
  featureName = 'This feature',
  onReady,
  className = '',
  disabled = false,
  ...rest
}) {
  const toast = useToast();

  const handleClick = (e) => {
    e.preventDefault();

    if (!isReady) {
      toast.warning(`${featureName}: Function not ready, please wait!`);
      return;
    }

    if (onReady) {
      onReady(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * Creates a feature-guarded version of any button component
 * Use this to wrap existing button components
 *
 * @param {Function} onClick - Original onClick handler
 * @param {Object} options - Guard options
 * @param {boolean} options.isReady - Whether feature is ready
 * @param {string} options.featureName - Feature name for message
 * @param {Function} options.toast - Toast function from useToast
 */
export function createGuardedHandler(onClick, { isReady, featureName, toast }) {
  return (e) => {
    if (!isReady) {
      toast.warning(`${featureName}: Function not ready, please wait!`);
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };
}

/**
 * Hook to create guarded click handlers easily
 * @returns {Function} guardHandler function
 */
export function useFeatureGuard() {
  const toast = useToast();

  const guardHandler = (onClick, featureName = 'This feature', isReady = false) => {
    return (e) => {
      if (!isReady) {
        toast.warning(`${featureName}: Function not ready, please wait!`);
        return;
      }
      if (onClick) {
        onClick(e);
      }
    };
  };

  return guardHandler;
}

export default FeatureGuard;
