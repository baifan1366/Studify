"use client";

import { useState } from "react";
import OnboardingStep from "@/components/onboarding/OnboardingStep";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { useUpdateOnboarding } from "@/hooks/profile/use-profile";

export default function Step1Page() {
  const t = useTranslations("OnboardingTutorStep1Page");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [fullName, setFullName] = useState("");
  const { mutate: updateOnboarding, isPending } = useUpdateOnboarding();

  const handleNext = async (formData: FormData) => {
    updateOnboarding(
      {
        step: 1,
        locale,
        role: "tutor",
        fullName,
      },
      {
        onSuccess: () => {
          router.push(`/${locale}/tutor/step2`);
        },
      }
    );
  };

  const disableNext = !fullName.trim();

  return (
    <OnboardingStep
      title={t("welcome_title")}
      description={t("welcome_description")}
      action={handleNext}
      isFirstStep
      isLoading={isPending}
      disableNext={disableNext}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">{t("full_name_label")}</Label>
          <Input
            id="fullName"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("full_name_placeholder")}
          />
        </div>
      </div>
    </OnboardingStep>
  );
}
