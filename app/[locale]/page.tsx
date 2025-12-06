import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Users, Brain, Sparkles, Video, MessageSquare, Award, Zap, TrendingUp, Shield } from "lucide-react";
import { useLocale } from "next-intl";
import { HomeHeader } from "@/components/home/home-header";
import { HomeFooter } from "@/components/home/home-footer";
import { OAuthCallbackRedirect } from "../../components/auth/oauth-callback-redirect";

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
      
      {/* Video Showcase Section */}
      <section className="relative overflow-hidden pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        
        <div className="container mx-auto px-6 relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-12 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 text-primary text-sm font-semibold border border-primary/20 backdrop-blur-sm">
                <Video className="w-4 h-4" />
                See Studify in Action
              </div>
              <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Experience the Future of Learning
              </h2>
            </div>
            
            {/* YouTube Video Embed */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-border bg-card/50 backdrop-blur-sm">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/gbdpsgFKaUI?si=men9gAGwhb3kgNkq"
                  title="Studify Platform Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <div className="container mx-auto px-6 relative">
          <div className="max-w-5xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 text-primary text-sm font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 animate-pulse" />
              AI-Powered Learning Platform
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight">
              Your Tutor,
              <span className="block bg-gradient-to-r from-primary via-primary to-orange-600 bg-clip-text text-transparent mt-3">
                Anytime. Anywhere.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
              Get personalized tutoring, interactive courses, and AI-powered learning assistance. 
              Join thousands of students achieving their academic goals.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Link 
                href={`/${locale}/student/sign-up`}
                className="group inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-primary/50 transition-all hover:scale-105 shadow-xl"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href={`/${locale}/sign-in`}
                className="inline-flex items-center gap-2 px-10 py-5 bg-card/80 backdrop-blur-sm text-foreground rounded-full font-bold text-lg hover:bg-accent transition-all border-2 border-border hover:border-primary/50 hover:scale-105"
              >
                Sign In
              </Link>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>Trusted by 10K+ students</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span>AI-Powered Learning</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>95% Success Rate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 md:py-40 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              Features
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Everything You Need to Excel
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A complete learning ecosystem designed for modern students
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Feature Cards */}
            <FeatureCard
              icon={<BookOpen className="w-7 h-7" />}
              title="Interactive Courses"
              description="Video lessons, quizzes, assignments, and certificates. Track your progress in real-time."
              gradient="from-blue-500/10 to-cyan-500/10"
            />
            
            <FeatureCard
              icon={<Users className="w-7 h-7" />}
              title="Live Classrooms"
              description="Join virtual classrooms with real tutors. Collaborate, submit assignments, and attend live sessions."
              gradient="from-purple-500/10 to-pink-500/10"
            />
            
            <FeatureCard
              icon={<Brain className="w-7 h-7" />}
              title="AI Learning Coach"
              description="Get personalized study plans, smart recommendations, and instant answers to your questions."
              gradient="from-primary/10 to-orange-500/10"
            />
            
            <FeatureCard
              icon={<Video className="w-7 h-7" />}
              title="Video Q&A"
              description="Ask questions about any video moment. AI analyzes content and provides timestamped answers."
              gradient="from-green-500/10 to-emerald-500/10"
            />
            
            <FeatureCard
              icon={<MessageSquare className="w-7 h-7" />}
              title="Community"
              description="Connect with peers, join study groups, share knowledge, and grow together."
              gradient="from-indigo-500/10 to-blue-500/10"
            />
            
            <FeatureCard
              icon={<Award className="w-7 h-7" />}
              title="Gamification"
              description="Earn points, unlock achievements, and track your learning streaks. Stay motivated!"
              gradient="from-yellow-500/10 to-orange-500/10"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,107,0,0.1),transparent_50%)]" />
        
        <div className="container mx-auto px-6 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 max-w-6xl mx-auto">
            <StatCard number="10K+" label="Active Students" />
            <StatCard number="500+" label="Expert Tutors" />
            <StatCard number="1000+" label="Courses" />
            <StatCard number="50K+" label="Lessons Completed" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-40">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center space-y-10 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 rounded-[2.5rem] p-12 md:p-20 border-2 border-primary/30 relative overflow-hidden shadow-2xl">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Ready to Transform Your Learning?
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Join Studify today and experience the future of education. 
                Start with our free courses and upgrade anytime.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                <Link 
                  href={`/${locale}/student/sign-up`}
                  className="group inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-primary/50 transition-all hover:scale-105 shadow-xl"
                >
                  Start Learning Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  href={`/${locale}/courses`}
                  className="inline-flex items-center gap-2 px-10 py-5 bg-card/80 backdrop-blur-sm text-foreground rounded-full font-bold text-lg hover:bg-accent transition-all border-2 border-border hover:border-primary/50 hover:scale-105"
                >
                  Browse Courses
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

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
