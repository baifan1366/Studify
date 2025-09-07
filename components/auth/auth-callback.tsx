"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { Spinner } from "@/components/ui/spinner";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let didRedirect = false;

    const handleAuthCallback = async () => {
      try {
        // Step 1: check URL error
        const urlParams = new URLSearchParams(window.location.search);
        const error_param = urlParams.get("error");
        if (error_param) {
          setError(`OAuth error: ${error_param}`);
          return;
        }

        // Step 2: listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log("Auth state change:", event, session);

            if (event === "SIGNED_IN" && session && !didRedirect) {
              didRedirect = true;
              await syncAndRedirect(session);
            } else if (event === "SIGNED_OUT") {
              setError("Authentication was cancelled");
            }
          }
        );
        unsub = () => subscription.unsubscribe();

        // Step 3: check existing session
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session error:", error);
          setError(error.message);
          return;
        }
        if (data?.session && !didRedirect) {
          didRedirect = true;
          await syncAndRedirect(data.session);
        }

        // Step 4: timeout fallback
        setTimeout(() => {
          if (!didRedirect) {
            setError("Authentication timeout - please try again");
          }
        }, 10000);

      } catch (err) {
        console.error("Auth callback error:", err);
        setError("Authentication failed");
      }
    };

    const syncAndRedirect = async (session: any) => {
      try {
        const syncResponse = await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: session.access_token }),
        });

        if (!syncResponse.ok) {
          const syncError = await syncResponse.json();
          setError(syncError.error || "Failed to sync authentication");
          return;
        }

        router.replace("/en/home");
      } catch (err) {
        console.error("Sync error:", err);
        setError("Failed to sync authentication");
      } finally {
        if (unsub) unsub(); // 确保只在最后清理
      }
    };

    handleAuthCallback();

    return () => {
      if (unsub) unsub();
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/en/auth/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Spinner className="mx-auto mb-4" />
        <p className="text-gray-600">Processing your authentication...</p>
      </div>
    </div>
  );
}
