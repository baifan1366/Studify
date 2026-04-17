'use client';

import { useEffect, useState } from 'react';
import { Brain, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface ModelLoadingProgress {
  status: 'downloading' | 'loading' | 'ready' | 'error';
  progress: number;
  loaded?: number;
  total?: number;
  error?: string;
}

interface ModelLoadingIndicatorProps {
  progress: ModelLoadingProgress;
  modelName?: string;
  onCancel?: () => void;
}

export function ModelLoadingIndicator({
  progress,
  modelName = 'Xenova/multilingual-e5-small',
  onCancel,
}: ModelLoadingIndicatorProps) {
  const t = useTranslations('ai');
  const [displayProgress, setDisplayProgress] = useState(0);

  // Smooth progress animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        const diff = progress.progress - prev;
        if (Math.abs(diff) < 0.1) return progress.progress;
        return prev + diff * 0.3; // Smooth easing
      });
    }, 50);

    return () => clearInterval(interval);
  }, [progress.progress]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'downloading':
        return <Download className="w-5 h-5 animate-bounce text-blue-500" />;
      case 'loading':
        return <Brain className="w-5 h-5 animate-pulse text-purple-500" />;
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'downloading':
        return t('modelLoading.downloading');
      case 'loading':
        return t('modelLoading.initializing');
      case 'ready':
        return t('modelLoading.ready');
      case 'error':
        return t('modelLoading.error');
    }
  };

  if (progress.status === 'ready') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>
    );
  }

  if (progress.status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
        <div className="flex items-start gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {getStatusText()}
            </p>
            {progress.error && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {progress.error}
              </p>
            )}
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {t('modelLoading.errorHint')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
      <div className="flex items-start gap-3">
        {getStatusIcon()}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {getStatusText()}
            </p>
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {Math.round(displayProgress)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>

          {/* Download info */}
          {progress.loaded !== undefined && progress.total !== undefined && (
            <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
              <span>
                {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
              </span>
              <span className="font-mono">
                {modelName.split('/')[1] || modelName}
              </span>
            </div>
          )}

          {/* Hint text */}
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {progress.status === 'downloading'
              ? t('modelLoading.downloadHint')
              : t('modelLoading.initializeHint')}
          </p>

          {/* Cancel button */}
          {onCancel && progress.status === 'downloading' && (
            <button
              onClick={onCancel}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
            >
              {t('modelLoading.cancel')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for inline display
export function ModelLoadingIndicatorCompact({
  progress,
}: {
  progress: ModelLoadingProgress;
}) {
  const t = useTranslations('ai');

  if (progress.status === 'ready') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>{t('modelLoading.ready')}</span>
      </div>
    );
  }

  if (progress.status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{t('modelLoading.error')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
      {progress.status === 'downloading' ? (
        <Download className="w-3.5 h-3.5 animate-bounce" />
      ) : (
        <Brain className="w-3.5 h-3.5 animate-pulse" />
      )}
      <span>{Math.round(progress.progress)}%</span>
      <div className="w-16 h-1 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
          style={{ width: `${progress.progress}%` }}
        />
      </div>
    </div>
  );
}
