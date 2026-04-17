'use client';

import { useState, useEffect } from 'react';
import {
  getRecommendedMode,
  isModeSupported,
  getModeCapabilityWarnings,
  type FeatureSupport,
  detectFeatures,
} from '@/lib/client-embedding';

export type AIMode = 'fast' | 'normal' | 'thinking';

export interface ModeSupport {
  supported: boolean;
  reason?: string;
  warnings: string[];
}

export interface AdaptiveModeState {
  currentMode: AIMode;
  recommendedMode: AIMode;
  features: FeatureSupport | null;
  modeSupport: Record<AIMode, ModeSupport>;
  isLoading: boolean;
}

export function useAdaptiveMode(initialMode?: AIMode) {
  const [state, setState] = useState<AdaptiveModeState>({
    currentMode: initialMode || 'fast',
    recommendedMode: 'fast',
    features: null,
    modeSupport: {
      fast: { supported: true, warnings: [] },
      normal: { supported: true, warnings: [] },
      thinking: { supported: true, warnings: [] },
    },
    isLoading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function detectCapabilities() {
      try {
        // Detect features
        const features = await detectFeatures();

        // Get recommended mode
        const recommendedMode = await getRecommendedMode();

        // Check support for each mode
        const [fastSupport, normalSupport, thinkingSupport] = await Promise.all([
          isModeSupported('fast'),
          isModeSupported('normal'),
          isModeSupported('thinking'),
        ]);

        // Get warnings for each mode
        const [fastWarnings, normalWarnings, thinkingWarnings] = await Promise.all([
          getModeCapabilityWarnings('fast'),
          getModeCapabilityWarnings('normal'),
          getModeCapabilityWarnings('thinking'),
        ]);

        if (!mounted) return;

        const modeSupport: Record<AIMode, ModeSupport> = {
          fast: {
            supported: fastSupport.supported,
            reason: fastSupport.reason,
            warnings: fastWarnings,
          },
          normal: {
            supported: normalSupport.supported,
            reason: normalSupport.reason,
            warnings: normalWarnings,
          },
          thinking: {
            supported: thinkingSupport.supported,
            reason: thinkingSupport.reason,
            warnings: thinkingWarnings,
          },
        };

        // If initial mode is not supported, use recommended mode
        const finalMode = initialMode
          ? modeSupport[initialMode].supported
            ? initialMode
            : recommendedMode
          : recommendedMode;

        setState({
          currentMode: finalMode,
          recommendedMode,
          features,
          modeSupport,
          isLoading: false,
        });
      } catch (error) {
        console.error('[useAdaptiveMode] Failed to detect capabilities:', error);

        if (!mounted) return;

        // Fallback to safe defaults
        setState({
          currentMode: 'normal',
          recommendedMode: 'normal',
          features: null,
          modeSupport: {
            fast: { supported: false, reason: 'Detection failed', warnings: [] },
            normal: { supported: true, warnings: [] },
            thinking: { supported: false, reason: 'Detection failed', warnings: [] },
          },
          isLoading: false,
        });
      }
    }

    detectCapabilities();

    return () => {
      mounted = false;
    };
  }, [initialMode]);

  const setMode = (mode: AIMode) => {
    if (!state.modeSupport[mode].supported) {
      console.warn(`[useAdaptiveMode] Mode ${mode} is not supported:`, state.modeSupport[mode].reason);
      return false;
    }

    setState((prev) => ({
      ...prev,
      currentMode: mode,
    }));

    return true;
  };

  const canUseMode = (mode: AIMode): boolean => {
    return state.modeSupport[mode].supported;
  };

  const getModeWarnings = (mode: AIMode): string[] => {
    return state.modeSupport[mode].warnings;
  };

  const isRecommendedMode = (mode: AIMode): boolean => {
    return mode === state.recommendedMode;
  };

  return {
    ...state,
    setMode,
    canUseMode,
    getModeWarnings,
    isRecommendedMode,
  };
}
