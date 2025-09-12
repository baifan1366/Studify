"use client";

import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

export default function SignInWithGoogle() {
  const handleLogin = async () => {
    // Use production URL if available, fallback to current origin
    const redirectUrl = process.env.NEXT_PUBLIC_NODE_ENV === 'production' 
      ? `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`
      : `${window.location.origin}/auth/callback`;
      
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl, 
      },
    });
    if (error) {
      console.error("OAuth error:", error.message);
    }
  };

  return (
    <Button onClick={handleLogin} className="w-full">
      Sign in with Google
    </Button>
  );
}
