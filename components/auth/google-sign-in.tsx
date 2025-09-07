"use client";

import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

export default function SignInWithGoogle() {
  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`, 
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
