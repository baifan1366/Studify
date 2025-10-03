"use client";

import { useState } from "react";
import OnboardingStep from "@/components/onboarding/OnboardingStep";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { useUpdateOnboarding } from "@/hooks/profile/use-profile";

export default function Step2Page() {
  const t = useTranslations("OnboardingTutorStep2Page");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [qualifications, setQualifications] = useState("");
  const [experience, setExperience] = useState("");
  const { mutate: updateOnboarding, isPending } = useUpdateOnboarding();

  const handleNext = async (formData: FormData) => {
    updateOnboarding(
      {
        step: 2,
        locale,
        role: "tutor",
        qualifications,
        experience,
      },
      {
        onSuccess: () => {
          router.push(`/${locale}/tutor/step3`);
        },
      }
    );
  };

  const handlePrevious = () => {
    router.push(`/${locale}/tutor/step1`);
  };

  const disableNext = !qualifications.trim() || !experience.trim();

  return (
    <OnboardingStep
      title={t("expertise_title")}
      description={t("expertise_description")}
      action={handleNext}
      prevAction={handlePrevious}
      isLoading={isPending}
      disableNext={disableNext}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="qualifications">{t("qualifications_label")}</Label>
          <Input
            id="qualifications"
            name="qualifications"
            value={qualifications}
            onChange={(e) => setQualifications(e.target.value)}
            placeholder={t("qualifications_placeholder")}
          />
        </div>
        <div>
          <Label htmlFor="experience">{t("experience_label")}</Label>
          <Textarea
            id="experience"
            name="experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder={t("experience_placeholder")}
          />
        </div>
      </div>
    </OnboardingStep>
  );
}
