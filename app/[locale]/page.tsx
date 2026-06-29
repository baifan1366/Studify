import { Metadata } from "next";
import { HomeFooter } from "@/components/home/home-footer";
import LandingPage from "@/components/home/landing-page";

export const metadata: Metadata = {
  title: "Studify - Your Tutor, Anytime. Anywhere",
  description: "AI-powered learning platform with courses, classrooms, and community. Get personalized tutoring, interactive lessons, and smart learning paths.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fffdf8] via-[#fffaf2] to-[#f6f8f3] text-slate-950 transition-colors dark:from-[#071712] dark:via-[#0a1d17] dark:to-[#0d241c] dark:text-slate-50">
      <LandingPage />
      <HomeFooter />
    </div>
  );
}
