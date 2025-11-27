import { Metadata } from "next";
import Link from "next/link";
import { useLocale } from "next-intl";
import { HomeHeader } from "@/components/home/home-header";
import { HomeFooter } from "@/components/home/home-footer";
import { Target, Users, Lightbulb, Heart, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us - Studify",
  description: "Learn about Studify's mission to revolutionize education through AI-powered learning.",
};

export default function AboutPage() {
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <HomeHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              About <span className="bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">Studify</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
              We're on a mission to make quality education accessible to everyone, everywhere.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  Our Mission
                </div>
                <h2 className="text-4xl md:text-5xl font-bold">
                  Empowering Learners Worldwide
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Studify was founded with a simple belief: everyone deserves access to world-class education. 
                  We combine cutting-edge AI technology with expert tutoring to create personalized learning 
                  experiences that adapt to each student's unique needs.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Our platform serves over 10,000 students worldwide, helping them achieve their academic 
                  goals through interactive courses, live classrooms, and AI-powered assistance.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <ValueCard
                  icon={<Target className="w-6 h-6" />}
                  title="Goal-Oriented"
                  description="Focused on student success"
                />
                <ValueCard
                  icon={<Users className="w-6 h-6" />}
                  title="Community"
                  description="Learn together, grow together"
                />
                <ValueCard
                  icon={<Lightbulb className="w-6 h-6" />}
                  title="Innovation"
                  description="AI-powered learning"
                />
                <ValueCard
                  icon={<Heart className="w-6 h-6" />}
                  title="Passion"
                  description="We love education"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Impact</h2>
              <p className="text-lg text-muted-foreground">
                Making a difference in education, one student at a time
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <ImpactStat number="10K+" label="Active Students" />
              <ImpactStat number="500+" label="Expert Tutors" />
              <ImpactStat number="1000+" label="Courses" />
              <ImpactStat number="95%" label="Success Rate" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 rounded-3xl p-12 md:p-16 border-2 border-primary/30">
            <h2 className="text-3xl md:text-5xl font-bold">
              Join Our Learning Community
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Start your learning journey today and experience the future of education.
            </p>
            <Link 
              href={`/${locale}/student/sign-up`}
              className="group inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-primary/50 transition-all hover:scale-105 shadow-xl"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card/50 backdrop-blur-sm border-2 border-border rounded-2xl p-6 hover:border-primary/50 transition-all hover:shadow-lg">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ImpactStat({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent mb-2">
        {number}
      </div>
      <div className="text-sm md:text-base text-muted-foreground font-medium">{label}</div>
    </div>
  );
}
