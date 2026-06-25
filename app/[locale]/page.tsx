import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Users, Brain, Sparkles, Video, MessageSquare, Award, Zap, TrendingUp, Shield } from "lucide-react";
import { useLocale } from "next-intl";
import { HomeHeader } from "@/components/home/home-header";
import { HomeFooter } from "@/components/home/home-footer";
import { OAuthCallbackRedirect } from "../../components/auth/oauth-callback-redirect";
import LandingPage from "@/components/home/landing-page";

export const metadata: Metadata = {
  title: "Studify - Your Tutor, Anytime. Anywhere",
  description: "AI-powered learning platform with courses, classrooms, and community. Get personalized tutoring, interactive lessons, and smart learning paths.",
};

export default function Home() {
  const locale = useLocale();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <OAuthCallbackRedirect />
      <HomeHeader />
      

      <LandingPage />
      <HomeFooter />
    </div>
  );
}

function FeatureCard({ icon, title, description, gradient }: { icon: React.ReactNode; title: string; description: string; gradient?: string }) {
  return (
    <div className="group relative bg-card/50 backdrop-blur-sm border-2 border-border rounded-3xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
      {/* Gradient background on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient || 'from-primary/10 to-primary/5'} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      <div className="relative">
        <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-orange-600 group-hover:text-white transition-all duration-300 mb-6 shadow-lg">
          {icon}
        </div>
        <div className="space-y-3">
          <h3 className="font-bold text-xl group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center group cursor-default">
      <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
        {number}
      </div>
      <div className="text-sm md:text-base text-muted-foreground font-medium">{label}</div>
    </div>
  );
}
