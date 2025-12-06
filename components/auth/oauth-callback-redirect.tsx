"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Component to handle OAuth callback redirect from Supabase
 * Supabase may redirect to the locale root (e.g., /en) instead of /api/auth/callback
 * This component detects the OAuth code parameter and redirects to the callback API
 */
export function OAuthCallbackRedirect() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      console.log('[OAUTH REDIRECT] Detected OAuth callback code, redirecting to /api/auth/callback');
      // Build the full callback URL with all query parameters
      const params = new URLSearchParams(searchParams.toString());
      const callbackUrl = `/api/auth/callback?${params.toString()}`;
      console.log('[OAUTH REDIRECT] Redirecting to:', callbackUrl);
      window.location.href = callbackUrl;
    }
  }, [searchParams]);
  
  return null;
}
