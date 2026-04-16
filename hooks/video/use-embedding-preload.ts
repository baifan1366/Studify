/**
 * Hook for preloading the client-side embedding model in the background
 * This ensures the model is ready when the user asks a question
 */

import { useEffect, useRef, useState } from 'react';
import { initializeModel, isModelInitialized } from '@/lib/client-embedding';

interface UseEmbeddingPreloadOptions {
  /** Whether to enable preloading (default: true) */
  enabled?: boolean;
  /** Delay before starting preload in ms (default: 2000) */
  delayMs?: number;
}

interface EmbeddingPreloadState {
  /** Whether the model is currently loading */
  isLoading: boolean;
  /** Whether the model is ready to use */
  isReady: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Loading progress (0-100) */
  progress: number;
}

/**
 * Preload the embedding model in the background when the video player mounts
 * 
 * @param options - Configuration options
 * @returns Preload state
 */
export function useEmbeddingPreload(
  options: UseEmbeddingPreloadOptions = {}
): EmbeddingPreloadState {
  const { enabled = true, delayMs = 2000 } = options;
  
  const [state, setState] = useState<EmbeddingPreloadState>({
    isLoading: false,
    isReady: false,
    error: null,
    progress: 0,
  });

  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Skip if disabled or already started
    if (!enabled || hasStartedRef.current) {
      return;
    }

    // Check if model is already initialized
    if (isModelInitialized()) {
      setState({
        isLoading: false,
        isReady: true,
        error: null,
        progress: 100,
      });
      return;
    }

    hasStartedRef.current = true;

    // Delay preload to avoid blocking initial page load
    const timeoutId = setTimeout(async () => {
      console.log('[EmbeddingPreload] Starting background model preload...');
      
      setState(prev => ({
        ...prev,
        isLoading: true,
        progress: 0,
      }));

      try {
        await initializeModel({
          enableCache: true,
          onProgress: (progress) => {
            // Update progress silently in the background
            setState(prev => ({
              ...prev,
              progress: progress.progress,
            }));

            if (progress.status === 'ready') {
              console.log('[EmbeddingPreload] Model preloaded successfully');
              setState({
                isLoading: false,
                isReady: true,
                error: null,
                progress: 100,
              });
            } else if (progress.status === 'error') {
              console.error('[EmbeddingPreload] Model preload failed:', progress.error);
              setState({
                isLoading: false,
                isReady: false,
                error: progress.error || 'Failed to load model',
                progress: 0,
              });
            }
          },
        });
      } catch (error) {
        console.error('[EmbeddingPreload] Model preload error:', error);
        setState({
          isLoading: false,
          isReady: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          progress: 0,
        });
      }
    }, delayMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [enabled, delayMs]);

  return state;
}

/**
 * Simple version that just preloads without returning state
 * Use this when you don't need to track loading state
 */
export function useEmbeddingPreloadSimple(enabled: boolean = true): void {
  useEmbeddingPreload({ enabled });
}
