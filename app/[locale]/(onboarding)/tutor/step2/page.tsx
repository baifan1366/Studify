import OnboardingStep from "@/components/onboarding/OnboardingStep";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getTranslations } from "next-intl/server";

export default async function Step2Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("OnboardingTutorStep2Page");

  return (
    <OnboardingStep
      title={t("expertise_title")}
      description={t("expertise_description")}
      prevAction={() => window.history.back()}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="qualifications">{t("qualifications_label")}</Label>
          <Input
            id="qualifications"
            name="qualifications"
            placeholder={t("qualifications_placeholder")}
          />
        </div>
        <div>
          <Label htmlFor="experience">{t("experience_label")}</Label>
          <Textarea
            id="experience"
            name="experience"
            placeholder={t("experience_placeholder")}
          />
        </div>
      </div>
    </OnboardingStep>
  );
}
