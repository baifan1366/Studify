"use client";

import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
import { useTranslations } from 'next-intl';

export default function AuthSubmitButton() {
  const t = useTranslations('AuthSubmitButton');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending}>
      {pending ? t('signing_in') : t('sign_in')}
    </Button>
  );
}
