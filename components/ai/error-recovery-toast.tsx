'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, X, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface AIError {
  type: 'model_load' | 'embedding' | 'search' | 'server' | 'network';
  message: string;
  canRetry: boolean;
  canSwitchMode: boolean;
  consecutiveFailures?: number;
}

interface ErrorRecoveryToastProps {
  error: AIError;
  currentMode: 'fast' | 'normal' | 'thinking';
  onRetry?: () => void;
  onSwitchMode?: (mode: 'fast' | 'normal' | 'thinking') => void;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function ErrorRecoveryToast({
  error,
  currentMode,
  onRetry,
  onSwitchMode,
  onDismiss,
  autoHide = false,
  autoHideDelay = 5000,
}: ErrorRecoveryToastProps) {
  const t = useTranslations('ai.errors');
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (autoHide && !error.canRetry) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, error.canRetry]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  };

  const handleRetry = () => {
    handleDismiss();
    onRetry?.();
  };

  const handleSwitchToNormal = () => {
    handleDismiss();
    onSwitchMode?.('normal');
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'model_load':
        return t('modelLoadFailed');
      case 'embedding':
        return t('embeddingFailed');
      case 'search':
        return t('searchFailed');
      case 'server':
        return t('serverError');
      case 'network':
        return t('networkError');
      default:
        return 'Error';
    }
  };

  const getSuggestedMode = () => {
    if (currentMode === 'fast') return 'normal';
    if (currentMode === 'thinking') return 'normal';
    return 'fast';
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-md transition-all duration-300 ${
        isExiting
          ? 'opacity-0 translate-y-2'
          : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
              {getErrorTitle()}
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {error.message}
            </p>

            {/* Consecutive failures warning */}
            {error.consecutiveFailures && error.consecutiveFailures >= 3 && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                {t('consecutiveFailuresHint')}
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          {/* Retry button */}
          {error.canRetry && onRetry && (
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              {t('retry')}
            </button>
          )}

          {/* Switch mode button */}
          {error.canSwitchMode && onSwitchMode && currentMode !== 'normal' && (
            <button
              onClick={handleSwitchToNormal}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Zap className="w-4 h-4" />
              {t('switchToNormalMode')}
            </button>
          )}

          {/* Refresh page button (for consecutive failures) */}
          {error.consecutiveFailures && error.consecutiveFailures >= 3 && (
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              {t('refresh')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for managing error recovery state
export function useErrorRecovery() {
  const [error, setError] = useState<AIError | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const recordError = (errorType: AIError['type'], message: string) => {
    const newFailureCount = consecutiveFailures + 1;
    setConsecutiveFailures(newFailureCount);

    setError({
      type: errorType,
      message,
      canRetry: errorType !== 'model_load',
      canSwitchMode: errorType === 'model_load' || errorType === 'embedding',
      consecutiveFailures: newFailureCount,
    });
  };

  const recordSuccess = () => {
    setConsecutiveFailures(0);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  return {
    error,
    consecutiveFailures,
    recordError,
    recordSuccess,
    clearError,
  };
}
