"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from 'next-intl';

export default function AuthPageSignOutButton() {
  const t = useTranslations('AuthSignOutButton');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  async function signOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Button onClick={signOut} disabled={isSigningOut}>
      <div className="flex items-center">
        <Spinner
          variant="primary"
          isLoading={isSigningOut}
          className="mr-[8px]"
        />
        {isSigningOut ? t('signing_out') : t('sign_out')}
      </div>
    </Button>
  );
}
