"use client";

import { useState } from "react";
import OnboardingStep from "@/components/onboarding/OnboardingStep";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { useUpdateOnboarding } from "@/hooks/profile/use-profile";

export default function Step3Page() {
  const t = useTranslations("OnboardingTutorStep3Page");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [hourlyRate, setHourlyRate] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const { mutate: updateOnboarding, isPending } = useUpdateOnboarding();

  const handleNext = async (formData: FormData) => {
    updateOnboarding(
      {
        step: 3,
        locale,
        role: "tutor",
        hourlyRate,
        availability: availability.join(","),
      },
      {
        onSuccess: () => {
          router.push(`/${locale}/tutor/dashboard`);
        },
      }
    );
  };

  const handlePrevious = () => {
    router.push(`/${locale}/tutor/step2`);
  };

  const handleAvailabilityChange = (value: string, checked: boolean) => {
    setAvailability((prev) =>
      checked ? [...prev, value] : prev.filter((v) => v !== value)
    );
  };

  const disableNext = !hourlyRate || availability.length === 0;

  return (
    <OnboardingStep
      title={t("availability_title")}
      description={t("availability_description")}
      action={handleNext}
      prevAction={handlePrevious}
      isLastStep
      isLoading={isPending}
      disableNext={disableNext}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="hourlyRate">{t("hourly_rate_label")}</Label>
          <Input
            id="hourlyRate"
            name="hourlyRate"
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder={t("hourly_rate_placeholder")}
          />
        </div>
        <div>
          <Label>{t("availability_label")}</Label>
          <div className="space-y-2 mt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="weekdays"
                checked={availability.includes("weekdays")}
                onChange={(e) =>
                  handleAvailabilityChange("weekdays", e.target.checked)
                }
              />
              <Label htmlFor="weekdays">{t("weekdays_label")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="weekends"
                checked={availability.includes("weekends")}
                onChange={(e) =>
                  handleAvailabilityChange("weekends", e.target.checked)
                }
              />
              <Label htmlFor="weekends">{t("weekends_label")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="evenings"
                checked={availability.includes("evenings")}
                onChange={(e) =>
                  handleAvailabilityChange("evenings", e.target.checked)
                }
              />
              <Label htmlFor="evenings">{t("evenings_label")}</Label>
            </div>
          </div>
        </div>
      </div>
    </OnboardingStep>
  );
}
