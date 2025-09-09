import OnboardingStep from "@/components/onboarding/OnboardingStep";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTranslations } from "next-intl/server";

export default async function Step1Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("OnboardingTutorStep1Page");

  return (
    <OnboardingStep
      title={t("welcome_title")}
      description={t("welcome_description")}
      isFirstStep
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">{t("full_name_label")}</Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder={t("full_name_placeholder")}
          />
        </div>
      </div>
    </OnboardingStep>
  );
}
