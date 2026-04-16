/**
 * Feature detection for client-side embedding capabilities
 * Detects WebGPU, WASM, IndexedDB, and device characteristics
 */

import type { FeatureSupport } from './types';

let cachedFeatureSupport: FeatureSupport | null = null;

/**
 * Detect WebGPU availability
 */
export async function detectWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return false;
  }

  try {
    const adapter = await (navigator as any).gpu?.requestAdapter();
    return adapter !== null;
  } catch (error) {
    console.warn('[FeatureDetection] WebGPU detection failed:', error);
    return false;
  }
}

/**
 * Detect WebAssembly availability
 */
export function detectWASM(): boolean {
  return typeof WebAssembly !== 'undefined';
}

/**
 * Detect IndexedDB availability
 */
export function detectIndexedDB(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch (error) {
    console.warn('[FeatureDetection] IndexedDB detection failed:', error);
    return false;
  }
}

/**
 * Get device memory in GB (if available)
 */
export function getDeviceMemory(): number | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }

  // @ts-ignore - deviceMemory is not in standard types
  const memory = navigator.deviceMemory;
  return typeof memory === 'number' ? memory : undefined;
}

/**
 * Detect if running on mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  // Check user agent
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  
  if (mobileKeywords.some(keyword => userAgent.includes(keyword))) {
    return true;
  }

  // Check touch support and screen size
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  return hasTouchScreen && isSmallScreen;
}

/**
 * Detect all features and return support information
 * Results are cached after first call
 */
export async function detectFeatures(): Promise<FeatureSupport> {
  // Return cached result if available
  if (cachedFeatureSupport) {
    return cachedFeatureSupport;
  }

  const [webgpu] = await Promise.all([detectWebGPU()]);

  const features: FeatureSupport = {
    webgpu,
    wasm: detectWASM(),
    indexedDB: detectIndexedDB(),
    deviceMemory: getDeviceMemory(),
    isMobile: isMobileDevice(),
  };

  // Cache the result
  cachedFeatureSupport = features;

  console.log('[FeatureDetection] Detected features:', features);

  return features;
}

/**
 * Check if Fast mode should be available based on device capabilities
 */
export async function isFastModeSupported(): Promise<boolean> {
  const features = await detectFeatures();
  
  // Fast mode requires either WebGPU or WASM
  if (!features.webgpu && !features.wasm) {
    return false;
  }

  // Disable on low-memory devices (<4GB)
  if (features.deviceMemory && features.deviceMemory < 4) {
    console.warn('[FeatureDetection] Fast mode disabled: low device memory');
    return false;
  }

  return true;
}

/**
 * Check if client-side caching should be available
 */
export async function isCachingSupported(): Promise<boolean> {
  const features = await detectFeatures();
  return features.indexedDB;
}

/**
 * Get recommended mode based on device capabilities
 */
export async function getRecommendedMode(): Promise<'fast' | 'normal' | 'thinking'> {
  const features = await detectFeatures();

  // Mobile devices: default to Normal mode
  if (features.isMobile) {
    console.log('[FeatureDetection] Mobile device detected, recommending Normal mode');
    return 'normal';
  }

  // Low memory devices: default to Normal mode
  if (features.deviceMemory && features.deviceMemory < 4) {
    console.log('[FeatureDetection] Low memory device detected, recommending Normal mode');
    return 'normal';
  }

  // Desktop with WebGPU or WASM: default to Fast mode
  if (features.webgpu || features.wasm) {
    console.log('[FeatureDetection] WebGPU/WASM available, recommending Fast mode');
    return 'fast';
  }

  // Fallback to Normal mode
  console.log('[FeatureDetection] Fallback to Normal mode');
  return 'normal';
}

/**
 * Check if a specific mode is supported on this device
 */
export async function isModeSupported(mode: 'fast' | 'normal' | 'thinking'): Promise<{
  supported: boolean;
  reason?: string;
}> {
  const features = await detectFeatures();

  switch (mode) {
    case 'fast':
      // Fast mode requires WebGPU or WASM
      if (!features.webgpu && !features.wasm) {
        return {
          supported: false,
          reason: 'WebGPU and WebAssembly are not available',
        };
      }

      // Disable on low-memory devices
      if (features.deviceMemory && features.deviceMemory < 4) {
        return {
          supported: false,
          reason: 'Insufficient device memory (< 4GB)',
        };
      }

      // Warn on mobile devices but allow
      if (features.isMobile) {
        return {
          supported: true,
          reason: 'Fast mode may consume more battery on mobile devices',
        };
      }

      return { supported: true };

    case 'thinking':
      // Thinking mode has same requirements as Fast mode for client embedding
      if (!features.webgpu && !features.wasm) {
        return {
          supported: false,
          reason: 'WebGPU and WebAssembly are not available',
        };
      }

      if (features.deviceMemory && features.deviceMemory < 4) {
        return {
          supported: false,
          reason: 'Insufficient device memory (< 4GB)',
        };
      }

      return { supported: true };

    case 'normal':
      // Normal mode is always supported (server-side processing)
      return { supported: true };

    default:
      return { supported: false, reason: 'Unknown mode' };
  }
}

/**
 * Get capability warnings for a specific mode
 */
export async function getModeCapabilityWarnings(
  mode: 'fast' | 'normal' | 'thinking'
): Promise<string[]> {
  const features = await detectFeatures();
  const warnings: string[] = [];

  if (mode === 'fast' || mode === 'thinking') {
    // Check WebGPU
    if (!features.webgpu) {
      warnings.push('WebGPU not available, will use WebAssembly (slower)');
    }

    // Check WASM
    if (!features.wasm) {
      warnings.push('WebAssembly not available, performance may be degraded');
    }

    // Check IndexedDB for caching
    if (!features.indexedDB) {
      warnings.push('IndexedDB not available, caching disabled');
    }

    // Check mobile
    if (features.isMobile) {
      warnings.push('Client-side processing may consume more battery on mobile');
    }

    // Check memory
    if (features.deviceMemory && features.deviceMemory < 4) {
      warnings.push('Low device memory may affect performance');
    }
  }

  return warnings;
}

/**
 * Clear cached feature detection results
 * Useful for testing or when device capabilities change
 */
export function clearFeatureCache(): void {
  cachedFeatureSupport = null;
}
