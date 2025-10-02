"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Home, Loader2 } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const response = await fetch("/api/auth/me");
        
        let redirectPath = "/en/sign-in";

        if (response.ok) {
          const user = await response.json();
          const role = user?.profile?.role;

          // Redirect based on user role
          if (role) {
            switch (role) {
              case "admin":
                redirectPath = "/en/admin/dashboard";
                break;
              case "tutor":
                redirectPath = "/en/tutor/dashboard";
                break;
              case "student":
                redirectPath = "/en/home";
                break;
              default:
                redirectPath = "/en/sign-in";
            }
          }
        }

        router.replace(redirectPath);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.replace("/en/sign-in");
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAndRedirect();
  }, [router]);

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-md mx-auto">
        {/* 404 Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-primary/10 backdrop-blur-sm rounded-full p-8 border border-primary/20">
              <AlertCircle className="w-24 h-24 text-primary animate-bounce" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-8xl font-bold text-primary/80 animate-fade-in">
            404
          </h1>
          <h2 className="text-3xl font-semibold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            Page Not Found
          </h2>
          <p className="text-muted-foreground text-lg">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Loading/Redirecting Status */}
        <div className="mt-8 flex items-center justify-center gap-3 text-primary">
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading your profile...</span>
            </>
          ) : (
            <>
              <Home className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-medium">Redirecting to home...</span>
            </>
          )}
        </div>

        {/* Decorative dots */}
        <div className="mt-12 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
