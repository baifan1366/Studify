"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Component to handle OAuth callback redirect from Supabase
 * Supabase may redirect to the locale root (e.g., /en) instead of /api/auth/callback
 * This component detects the OAuth code parameter and redirects to the callback API.
 * Guards against redirect loops when the sign-in page itself receives error params.
 */
export function OAuthCallbackRedirect() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const code = searchParams.get('code');
    // If there's an error param, it means the callback already ran and failed - don't retry
    const hasError = searchParams.get('error');
    if (code && !hasError) {
      console.log('[OAUTH REDIRECT] Detected OAuth callback code, redirecting to /api/auth/callback');
      // Build the full callback URL with all query parameters
      const params = new URLSearchParams(searchParams.toString());
      const callbackUrl = `/api/auth/callback?${params.toString()}`;
      console.log('[OAUTH REDIRECT] Redirecting to:', callbackUrl);
      window.location.replace(callbackUrl);
    }
  }, [searchParams]);
  
  return null;
}
