<!-- Language Switcher -->
<p align="right">
  <b>English</b> · <a href="./README.zh-CN.md">简体中文</a>
</p>

<!-- Banner -->
<p align="center">
  <img src="./public/slogan.jpg" alt="Studify — Your Tutor, Anytime. Anywhere" style="max-width: 100%; border-radius: 12px;" />
</p>

<!-- Typing SVG -->
<p align="center">
  <a href="https://git.io/typing-svg">
    <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&pause=1000&color=FF7A45&width=700&lines=Welcome+to+Studify!;AI+powered+learning+assistant;Next.js+%2B+Supabase+%2B+LangChain;Course%2C+Classroom%2C+Community+platform" alt="Typing SVG" />
  </a>
</p>

<!-- Badges -->
<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5-black?logo=next.js" />
  <img src="https://img.shields.io/badge/Supabase-Postgres-green?logo=supabase" />
  <img src="https://img.shields.io/badge/Upstash-Redis-red?logo=redis" />
  <img src="https://img.shields.io/badge/Stripe-Payments-blue?logo=stripe" />
  <img src="https://img.shields.io/badge/AI-LangChain-orange?logo=openai" />
  <img src="https://img.shields.io/badge/OneSignal-Push%20Notifications-critical?logo=onesignal" />
  <img src="https://img.shields.io/badge/QStash-Queue-00AA88?logo=icloud" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="divider" />
</p>

# Studify 🎓 — AI Tutoring & Learning Platform

Studify is a modern, AI-powered platform that unifies Courses, Classrooms, and Community with built-in Payments, Push Notifications, and an advanced AI layer (semantic search, learning paths, video transcription + Q&A, recommendations). Built with Next.js 15, Supabase, Redis, Stripe, OneSignal, QStash, LangChain, and HuggingFace.

## **1. Track & Problem Statement**

### Competition:
**Codenection 2025 Hackathon**

### Track:
**Student Lifestyle** → *Tutoring for Students*

### Problem Statement:
Many students struggle with academic challenges, including difficulty understanding course material, limited access to personalized help, and inefficient study habits. Traditional tutoring services are often expensive, inconvenient, or unavailable outside fixed hours, leaving students without adequate support when they need it most.

### Goal:
Develop a **tutoring platform** that provides **on-demand, affordable, and personalized academic assistance**. The platform connects students with tutors, offers interactive learning tools, and provides curated study resources to improve academic outcomes and boost student confidence.

<p>
  <a href="#features">Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#screenshots--demo">Screenshots</a> ·
  <a href="#modules-overview">Modules</a> ·
  <a href="#pwa--capacitor">PWA & Capacitor</a>
</p>

## Features

- **Courses**
  - Modules and Lessons (video/live/document/quiz/assignment/whiteboard)
  - Enrollment, Progress Tracking, Notes, Quizzes (auto grading), Certificates
  - Payments with Stripe (Checkout + Webhooks), free/paid courses
- **Classrooms**
  - Class creation, member roles (owner/tutor/student), Join via code
  - Assignments + Submissions + Grading, Live sessions + Attendance
  - Whiteboard, Recordings, Learning Path integration
- **Community**
  - Groups (public/private), Posts, Comments (nested), Reactions
  - Achievements, Check-ins, Hashtags, Recommendations
- **AI Layer**
  - Dual-embedding search (E5-Small + BGE-M3), RAG Q&A, Learning Coach
  - Video transcription (Whisper) with resilient queue + warmup
  - Personalized learning paths with Mermaid visualization
- **Engagement & Growth**
  - OneSignal push notifications with DB persistence
  - Gamification (points, achievements, learning stats)
- **i18n & UX**
  - `next-intl` multi-language, glass-morphism UI, dark/light themes

## Tech Stack

<p>
  <img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,vercel,nodejs,supabase,postgres,redis,git,github" height="32" />
</p>

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, shadcn/ui, Framer Motion
- **Backend**: Supabase (Auth/DB/Storage), Upstash Redis, QStash
- **AI**: LangChain, OpenRouter, HuggingFace Whisper, Mermaid
- **Payments**: Stripe (Checkout, Connect, Webhooks)
- **Notifications**: OneSignal
- **i18n**: next-intl

## Screenshots / Demo

<p>
  <img src="./public/homepagess.png" alt="Dashboard" />
</p>

## Modules Overview

- **Course** (`app/api/course/`, `db` tables: `course*`, `course_lesson`, `course_enrollment`, `course_progress`, `course_quiz_*`)
  - Students: enroll, learn, track progress, take quizzes, write notes, pay
  - Tutors: manage course content, modules/lessons, analytics
  - Admin: approve/reject, moderation, analytics
- **Classroom** (`app/api/classroom/`, tables: `classroom*`)
  - Owner/Tutor: create class, manage members, assignments, live sessions
  - Students: join via code, submit assignments, attend live sessions
- **Community** (`app/api/community/`, tables: `community_*`)
  - Groups (public/private), posts, comments, reactions
  - Achievements, check-ins, hashtags, quizzes

> Role-based access is enforced in APIs via `utils/auth/server-guard.ts` using `authorize('student'|'tutor'|'admin')` and DB-level ownership checks.

## Highlights
  - **AI-first learning experience**
    - Time-aware video Q&A with ±30s window, terminology cards, and jump-to-timestamp
    - Components and APIs: `app/api/video/qa`, `components/ai-coach/*`, `components/ai/*`, `documentation/ai/AI_LEARNING_COACH_SYSTEM.md`
  - **Rich video interactions**
    - Endpoints: `app/api/video/views`, `app/api/video/likes`, `app/api/video/danmaku`, `app/api/video/comments`, `app/api/video/comments/[id]/likes`
    - Player: `components/video/bilibili-video-player.tsx`
  - **Dual-embedding semantic search**
    - E5-Small (384d) + BGE-M3 (1024d) hybrid search, background queue, admin controls
    - Key files: `db/migrations/20250905_embedding_system.sql`, `lib/langChain/embedding.ts`, `lib/langChain/vectorstore.ts`, `app/api/embeddings/*`
  - **Background processing with resilience**
    - QStash-powered pipelines with warmup and retry for Whisper transcription
    - Transcription step: `app/api/video-processing/steps/transcribe/route.ts`
  - **Payments and real payouts**
    - Stripe Checkout + Connect with 90/10 split, scheduled earnings release
    - Endpoints: `app/api/course/webhook`, `app/api/tutor/stripe-connect`, `app/api/tutor/earnings`, `app/api/tutor/earnings/release`
  - **Notifications and growth**
    - OneSignal push + DB persistence, unread counts, user preferences
    - Worker: `public/OneSignalSDKWorker.js`, hooks/components under `components/` and `hooks/`
  - **Internationalization and UX**
    - `next-intl` multi-language, glass-morphism design, dark/light themes, accessibility
  - **Admin and RBAC**
    - Admin dashboards and APIs: `app/api/admin/*`, `components/admin/*`, `hooks/admin/*`

## Performance and Security
  
  - **Security**: RLS policies on all sensitive tables, API-level `authorize(...)`, ownership checks, audit logs
  - **Reliability**: React Query caching, Redis caching, warmup + retries, rate limits (e.g., danmaku), DB indexes and triggers
  - **Scalability**: Background processors for embeddings/transcriptions, paginated APIs, hybrid vector search


## PWA & Capacitor

- **PWA layer (Serwist + Manifest)**
  - Service Worker: defined in `app/sw.ts`, bundled via `@serwist/next` as `public/sw.js` (see `next.config.ts`). It is disabled in development and enabled only in production.
  - Manifest: `public/manifest.json` provides PWA metadata and icons. Ensure icons match your branding and sizes.
  - OneSignal worker: `public/OneSignalSDKWorker.js` is intentionally excluded from Serwist (see `exclude` in `next.config.ts`) and served with proper headers.
  - Verify: build and run locally, then check Chrome DevTools → Application → Service Workers.
    ```bash
    npm run build && npm start
    ```

- **Capacitor mobile shell**
  - Config: `capacitor.config.ts`
    ```ts
    const config: CapacitorConfig = {
      appId: "com.studify.platform.vercel.app",
      appName: "Studify",
      webDir: "empty", // using remote server
      server: { url: "https://studify-platform.vercel.app", cleartext: true },
    };
    ```
  - Development (Android/iOS): point `server.url` to your dev host
    - Android emulator: `http://10.0.2.2:3000`
    - Real device (same LAN): `http://<LAN-IP>:3000`
    - Steps:
      ```bash
      # 1) Start Next.js
      npm run dev

      # 2) Sync native project
      npx cap sync android   # or: npx cap sync ios

      # 3) Run the app
      npx cap run android    # or open with Android Studio: npx cap open android
      ```
    - Note: `cleartext: true` allows http during local testing; use https in production.
    - Deploy the web (e.g., to Vercel) and set `server.url` to the https domain (already set in this repo).
    - Then package the app:
      ```bash
      npx cap sync android && npx cap open android   # build/sign in Android Studio
      npx cap sync ios && npx cap open ios           # archive/sign in Xcode
      ```
    - Alternative (advanced): set `webDir` to a static export (e.g., `out`) if your app is purely static. SSR/App Router pages generally should keep `server.url` instead.
  - Push notifications on mobile
    - Web push continues to use `public/OneSignalSDKWorker.js`.
    - If moving to native push, integrate the respective Capacitor plugin and platform setup; this repo currently focuses on web push (OneSignal) with correct SW headers in `next.config.ts`.

## Feedback

- **User Feedback Form**: https://forms.gle/cZSzsLVbRqysDcER9
- **Issue Reporting Form**: https://forms.gle/8ZYapQ9e9MFZ7EC97