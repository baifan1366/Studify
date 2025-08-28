# Studify Tech Stack

> **Studify** is a modern tutoring and learning platform that combines **AI**, **real-time collaboration**, **multi-language support**, **payments**, and **push notifications** to provide an interactive and seamless experience for students and instructors.

---

## **1. Overview**

This document provides an overview of the technologies, frameworks, and tools used to build **Studify**.

---

## **2. Tech Stack Summary**

| Category | Technology | Purpose | Notes |
|----------|-----------|--------|-------|
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Strongly typed JavaScript | Better maintainability |
| **Frontend Framework** | [Next.js 15](https://nextjs.org/) | React-based full-stack framework | Supports SSR, ISR, CSR, App Router |
| **UI Framework** | [TailwindCSS 4](https://tailwindcss.com/) | Utility-first CSS framework | Fast, responsive styling |
| **UI Components** | [Shadcn/UI](https://ui.shadcn.com/) | Customizable component library | Based on Radix primitives |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) | High-performance animations | Smooth page & component transitions |
| **Backend-as-a-Service** | [Supabase](https://supabase.com/) | Database, auth, storage, edge functions | Core backend |
| **Authentication** | Supabase Auth, Google OAuth, Local | Multi-method authentication | Email, OAuth, and local login |
| **Database Search** | PostgreSQL + TSVECTOR | Full-text search | Optimized for resources, posts, courses |
| **Caching / Queue** | [Upstash Redis](https://upstash.com/) | Serverless Redis database | Session, rate limiting, real-time data |
| **AI Agent** | [LangChain](https://www.langchain.com/) | AI agent framework | RAG, Q&A, and knowledge search |
| **Payments** | [Stripe](https://stripe.com/) | Payment gateway & subscriptions | Handles payments, plans, invoices |
| **Push Notifications** | [OneSignal](https://onesignal.com/) | Web push notifications | Boost user engagement |
| **PWA Support** | [Serwist](https://serwist.pages.dev/) | Progressive Web App service worker | Offline support & faster load times |
| **Internationalization** | [next-intl](https://next-intl-docs.vercel.app/) | Multi-language support | Integrated with Intl API |
| **Date & Time Formatting** | Intl API | Timezone & locale formatting | Works with next-intl |
| **Form Validation** | [Zod](https://zod.dev/) | Type-safe schema validation | Used in forms and API validation |
| **State & Data Fetching** | [React Query](https://tanstack.com/query/v5) | Server-state management | Improves caching & user experience |
| **Real-time Collaboration** | [Liveblocks](https://liveblocks.io/) | Collaborative editing & presence | Whiteboards, classroom sync |
| **Deployment** | [Vercel](https://vercel.com/) | Hosting & CI/CD | Native Next.js support |
| **Icons** | [Lucide React](https://lucide.dev/) | Icon library | Lightweight & modern |
| **UI Effects** | Aceternity | Glowing border & visual effects | Enhances UI interactivity |

---

## **3. Frontend**

### **Core Technologies**
- **Next.js 15** → Provides SSR, ISR, App Router, and API routes
- **React 19** → Component-based UI development
- **TypeScript** → Type safety and better scalability
- **TailwindCSS 4** → Atomic CSS for responsive designs
- **Shadcn/UI** → Modern and fully customizable UI components
- **Framer Motion** → Page transitions & smooth animations

---

## **4. Backend & Services**

### **Database**
- **PostgreSQL (via Supabase)** → Relational DB for structured data
- **TSVECTOR** → Full-text search support for courses, posts, and resources
- **Supabase Storage** → Stores images, PDFs, videos, and static files

### **Authentication**
- **Supabase Auth** → Handles email, magic links, and OAuth
- **Google Sign-In** → Third-party authentication
- **Local Sign-Up** → Email + password login flow

### **Caching & Realtime**
- **Upstash Redis** → Serverless caching for sessions, notifications, and queues
- **Liveblocks** → Enables real-time collaboration and multi-user presence

---

## **5. AI & Search**

| Technology | Purpose |
|-----------|---------|
| **LangChain** | AI agent for conversational queries and content generation |
| **Vector Embedding** | Semantic search for courses, lectures, and documents |

---

## **6. Internationalization**

| Technology | Usage |
|-----------|-------|
| **next-intl** | Manages translations and locale-based routing |
| **Intl API** | Formats time, dates, currencies, and numbers |
| **Multi-Language UI** | Supports dynamic language switching and timezone adaptation |

---

## **7. Payments & Subscriptions**

| Technology | Purpose |
|-----------|---------|
| **Stripe** | Subscription management, one-time payments, and invoicing |
| **Stripe Webhooks** | Real-time payment status updates |
| **Supabase Functions** | Trigger credits and unlocks after successful payments |

---

## **8. PWA & Notifications**

| Technology | Purpose |
|-----------|---------|
| **Serwist** | Adds PWA support, offline capabilities, and better caching |
| **OneSignal** | Sends push notifications to increase engagement |

---

## **9. Deployment & DevOps**

| Tool | Usage |
|------|-------|
| **Vercel** | Automatic deployments and previews |
| **Upstash Redis** | Queue processing & real-time sync |
| **Serwist** | Performance optimization for PWA mode |

---

## **10. Project Setup**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm build

# Start production server
npm start
```

**Deployment:**  
Studify is deployed on **Vercel** with automatic GitHub integration and environment variables configured in `.env`.
