"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";

interface OAuthHandlerProps {
  locale: string;
}

export function OAuthHandler({ locale }: OAuthHandlerProps) {
  const t = useTranslations('OAuthHandler');
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check if we have callback parameters
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const type = searchParams.get("type");

      if (error) {
        console.error("OAuth error:", error);
        const errorDetails = searchParams.get("details");
        toast({
          title: "Authentication Error",
          description: errorDetails || error,
          variant: "destructive",
        });
        return;
      }

      // All code exchanges are now handled by the server-side callback route
      // This component only handles errors and displays loading states
    };

    handleOAuthCallback();
  }, [searchParams, toast]);

  // This component now only displays errors
  // All OAuth processing is handled server-side
  return null;
}
