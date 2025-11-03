/**
 * Platform detection utilities for Capacitor apps
 */

/**
 * Check if the app is running in Capacitor (mobile app)
 */
export function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as any).Capacitor !== undefined;
}

/**
 * Check if the app is running on Android
 */
export function isAndroid(): boolean {
  if (!isCapacitor()) return false;
  return (window as any).Capacitor?.getPlatform() === 'android';
}

/**
 * Check if the app is running on iOS
 */
export function isIOS(): boolean {
  if (!isCapacitor()) return false;
  return (window as any).Capacitor?.getPlatform() === 'ios';
}

/**
 * Check if the app is running in a web browser
 */
export function isWeb(): boolean {
  return !isCapacitor();
}

/**
 * Get the OAuth callback URL based on the platform
 */
export function getOAuthCallbackUrl(path: string = '/api/auth/callback'): string {
  if (isCapacitor()) {
    // Use custom scheme for mobile apps
    return 'studify://auth-callback';
  }
  
  // Use HTTPS for web
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                  (typeof window !== 'undefined' ? window.location.origin : '');
  return `${siteUrl}${path}`;
}
