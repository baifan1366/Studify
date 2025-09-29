"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from 'next-intl';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const t = useTranslations('AuthGuard');
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin"); // redirect guest to signin
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        {t('loading')}
      </div>
    );
  }

  return <>{children}</>;
}
