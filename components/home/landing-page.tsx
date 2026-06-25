"use client";

import Link from "next/link";
import { useRef } from "react";
import { useLocale } from "next-intl";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers3,
  MessageSquare,
  Play,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeHeader } from "@/components/home/home-header";
import { OAuthCallbackRedirect } from "@/components/auth/oauth-callback-redirect";
import { ModuleShowcase } from "@/components/home/module-showcase";

gsap.registerPlugin(useGSAP);

const features = [
  {
    icon: Brain,
    title: "AI learning coach",
    description: "Ask questions, generate plans, and get feedback that adapts to your pace.",
    color: "text-primary",
    tint: "bg-primary/10",
  },
  {
    icon: Video,
    title: "Video Q&A",
    description: "Jump from a question to the exact lesson moment with timestamped answers.",
    color: "text-blue-500",
    tint: "bg-blue-500/10",
  },
  {
    icon: Users,
    title: "Live classrooms",
    description: "Work with tutors and classmates in focused spaces built for real learning.",
    color: "text-emerald-500",
    tint: "bg-emerald-500/10",
  },
  {
    icon: Award,
    title: "Progress loops",
    description: "Turn streaks, achievements, and reports into momentum you can see.",
    color: "text-violet-500",
    tint: "bg-violet-500/10",
  },
];

const stats = [
  { value: "10K+", label: "active students" },
  { value: "500+", label: "expert tutors" },
  { value: "1K+", label: "courses" },
  { value: "50K+", label: "lessons completed" },
];

const flow = [
  {
    icon: Sparkles,
    title: "Diagnose",
    copy: "Studify reads goals, course context, and recent activity.",
  },
  {
    icon: Layers3,
    title: "Build",
    copy: "Your dashboard becomes a live path of videos, quizzes, and tutoring.",
  },
  {
    icon: TrendingUp,
    title: "Accelerate",
    copy: "Progress reports and community signals keep the next step obvious.",
  },
];

const tracks = [
  "Ask AI about any lesson",
  "Save answers as notes",
  "Join live sessions",
  "Practice with quizzes",
  "Track learning streaks",
  "Share wins with groups",
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const locale = useLocale();
  const scope = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useGSAP(
    () => {
      if (shouldReduceMotion) return;

      gsap.to(".gsap-scan", {
        xPercent: 120,
        duration: 3.4,
        repeat: -1,
        ease: "power1.inOut",
        yoyo: true,
      });

      gsap.to(".gsap-float", {
        y: (index) => [-10, 12, -6][index % 3],
        rotate: (index) => [-1.5, 1.2, -0.8][index % 3],
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.18,
      });

      gsap.to(".gsap-rail", {
        backgroundPositionX: "220%",
        duration: 6,
        repeat: -1,
        ease: "none",
        stagger: 0.22,
      });
    },
    { scope, dependencies: [shouldReduceMotion] }
  );

  const studentSignUpHref = `/${locale}/student/sign-up`;
  const signInHref = `/${locale}/sign-in`;
  const coursesHref = `/${locale}/courses`;

  return (
    <div ref={scope} className="min-h-screen bg-background text-foreground">
      <OAuthCallbackRedirect />
      <motion.div
        className="fixed left-0 top-0 z-[60] h-1 origin-left bg-primary"
        style={{ scaleX: progressScale, width: "100%" }}
      />
      <HomeHeader />

      <main className="overflow-hidden">
        <section
          className="relative min-h-[92vh] overflow-hidden pt-28 md:pt-32"
          onPointerMove={(event) => {
            const target = event.currentTarget;
            const rect = target.getBoundingClientRect();
            target.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
            target.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--mx,50%)_var(--my,35%),rgba(255,107,0,0.18),transparent_34%),linear-gradient(135deg,rgba(255,107,0,0.10),transparent_32%),linear-gradient(180deg,transparent,rgba(13,31,26,0.08))]" />
          <div className="absolute inset-0 opacity-[0.18] dark:opacity-[0.22] bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:56px_56px] text-foreground" />

          <div className="absolute inset-x-0 top-28 hidden h-80 md:block">
            {[0, 1, 2, 3, 4].map((line) => (
              <div
                key={line}
                className="gsap-rail absolute left-[-10%] h-px w-[120%] bg-[linear-gradient(90deg,transparent,rgba(255,107,0,0.15),rgba(59,130,246,0.42),transparent)] bg-[length:45%_100%]"
                style={{
                  top: `${line * 58}px`,
                  transform: `rotate(${line % 2 === 0 ? "-4deg" : "3deg"})`,
                }}
              />
            ))}
          </div>

          <div className="container relative mx-auto grid min-h-[78vh] items-center gap-12 px-6 pb-16 lg:grid-cols-[1.02fr_0.98fr]">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-3xl"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                AI-powered learning platform
              </div>

              <h1 className="max-w-4xl text-6xl font-bold leading-[0.92] tracking-tight md:text-8xl lg:text-9xl">
                Studify
                <span className="mt-3 block bg-gradient-to-r from-primary via-orange-500 to-amber-400 bg-clip-text text-transparent">
                  learns with you.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
                A sharper learning home for courses, classrooms, community, and AI tutoring that knows where you are in the lesson.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={studentSignUpHref}
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25 transition hover:-translate-y-0.5 hover:bg-primary/90"
                >
                  Start free
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </Link>
                <Link
                  href={signInHref}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card/80 px-6 py-4 text-base font-bold text-foreground backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/50"
                >
                  Sign in
                </Link>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                {[
                  { icon: ShieldCheck, text: "Secure learning spaces" },
                  { icon: Zap, text: "Instant AI guidance" },
                  { icon: Clock, text: "Study anytime" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.text} className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span>{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.8, ease: "easeOut" }}
              className="relative mx-auto w-full max-w-xl"
            >
              <div className="gsap-scan absolute left-[-35%] top-10 z-20 h-[82%] w-28 rotate-12 bg-gradient-to-r from-transparent via-primary/25 to-transparent blur-xl" />
              <div className="relative overflow-hidden rounded-lg border border-border bg-card/85 p-4 shadow-2xl shadow-primary/10 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">Learning cockpit</div>
                      <div className="text-xs text-muted-foreground">Live lesson intelligence</div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">
                    Online
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="gsap-float rounded-lg border border-border bg-background/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Current focus
                      </span>
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">Calculus sprint</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      AI found three weak points and queued a 22 minute recovery plan.
                    </p>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: "18%" }}
                        animate={{ width: "72%" }}
                        transition={{ duration: 1.4, delay: 0.5 }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="gsap-float rounded-lg border border-border bg-background/70 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Video className="h-4 w-4 text-blue-500" />
                        Video Q&A
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Jump to 14:32 and explain the proof.</p>
                    </div>
                    <div className="gsap-float rounded-lg border border-border bg-background/70 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Users className="h-4 w-4 text-emerald-500" />
                        Live room
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">8 classmates working on the same module.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  {tracks.slice(0, 4).map((track) => (
                    <div key={track} className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      {track}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="relative border-y border-border bg-card/45 py-8">
          <div className="container mx-auto grid grid-cols-2 gap-4 px-6 md:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: index * 0.06 }}
                className="text-center"
              >
                <div className="text-3xl font-black text-primary md:text-5xl">{stat.value}</div>
                <div className="mt-2 text-sm font-medium text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container mx-auto px-6">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-3xl text-center"
            >
              <div className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-primary">One workspace</div>
              <h2 className="text-4xl font-bold tracking-tight md:text-6xl">Everything moves around your next best lesson.</h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                Studify connects tutoring, video learning, classroom work, and community feedback into one guided flow.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.article
                    key={feature.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ delay: index * 0.08 }}
                    whileHover={{ y: -8 }}
                    className="group rounded-lg border border-border bg-card p-6 shadow-sm transition hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
                  >
                    <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-lg ${feature.tint} ${feature.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="mt-3 leading-7 text-muted-foreground">{feature.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <ModuleShowcase />

        <section className="relative overflow-hidden bg-muted/30 py-20 md:py-28">
          <div className="absolute inset-0 opacity-30 bg-[linear-gradient(120deg,transparent_0%,rgba(255,107,0,0.12)_45%,transparent_70%)]" />
          <div className="container relative mx-auto grid items-center gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-primary">Watch the flow</div>
              <h2 className="text-4xl font-bold tracking-tight md:text-6xl">From confusion to action in three steps.</h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                The cool part is not just that AI answers. It keeps the whole learning loop moving.
              </p>
              <Link
                href={coursesHref}
                className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-3 font-bold transition hover:border-primary/50 hover:text-primary"
              >
                Browse courses
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <div className="grid gap-4">
              {flow.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, x: 34 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.45 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative rounded-lg border border-border bg-background/85 p-5 shadow-lg backdrop-blur"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">0{index + 1}</div>
                        <h3 className="mt-1 text-2xl font-bold">{step.title}</h3>
                        <p className="mt-2 leading-7 text-muted-foreground">{step.copy}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6 }}
              className="overflow-hidden rounded-lg border border-primary/25 bg-[linear-gradient(135deg,rgba(255,107,0,0.16),rgba(59,130,246,0.08),rgba(16,185,129,0.08))] p-8 md:p-12"
            >
              <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-background/70 px-3 py-2 text-sm font-bold text-primary">
                    <MessageSquare className="h-4 w-4" />
                    Ready when you are
                  </div>
                  <h2 className="text-4xl font-bold tracking-tight md:text-6xl">Build your study rhythm today.</h2>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                    Start with a course, ask AI where you get stuck, then turn every answer into the next action.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Link
                    href={studentSignUpHref}
                    className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-4 font-bold text-primary-foreground shadow-xl shadow-primary/20 transition hover:-translate-y-0.5"
                  >
                    Get started
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href={coursesHref}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background/80 px-6 py-4 font-bold transition hover:border-primary/50"
                  >
                    <BookOpen className="h-5 w-5" />
                    Explore courses
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
