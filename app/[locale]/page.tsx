import { Metadata } from "next";
import { useTranslations } from "next-intl";

export const metadata: Metadata = {
  title: "Studify",
  description:
    "Your personalized learning dashboard with AI-powered recommendations, progress tracking, and community features",
  keywords: [
    "learning",
    "education",
    "AI tutoring",
    "progress tracking",
    "study dashboard",
  ],
  openGraph: {
    title: "Studify",
    description: "Personalized Learning, Powered by AI and Real-time Tutoring",
    type: "website",
  },
};

export default function Page() {
  const t = useTranslations("HomePage");
  return <h1>{t("title")}</h1>;
}
