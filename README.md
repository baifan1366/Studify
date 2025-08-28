# Studify 🎓
> An AI-powered **tutoring platform** designed to make academic help more **accessible**, **personalized**, and **affordable** for students.

---

## **1. Track & Problem Statement**

### **Competition:**  
**Codenection 2025 Hackathon**  

### **Track:**  
**Student Lifestyle** → *Tutoring for Students*  

### **Problem Statement:**  
Many students struggle with academic challenges, including difficulty understanding course material, limited access to personalized help, and inefficient study habits. Traditional tutoring services are often expensive, inconvenient, or unavailable outside fixed hours, leaving students without adequate support when they need it most.  

### **Goal:**  
Develop a **tutoring platform** that provides **on-demand, affordable, and personalized academic assistance**. The platform connects students with tutors, offers interactive learning tools, and provides curated study resources to improve academic outcomes and boost student confidence.

---

## **2. Our Solution — Studify** 🚀

**Studify** is a modern **tutoring & learning platform** designed for students of all levels.  
It bridges the gap between students and tutors by offering **real-time tutoring sessions**, **AI-powered recommendations**, and **collaborative study tools** — all in one seamless experience.

---

## **3. Key Features**

| Category | Feature | Description |
|----------|--------|------------|
| **Tutoring** | **Real-time Tutoring** | One-on-one or group tutoring sessions with integrated **WebRTC video & chat** |
| **AI Support** | **AI Tutor Assistant** | Uses **LangChain + OpenAI** to answer questions, summarize notes, and generate quizzes |
| **Personalization** | **Smart Recommendations** | Suggests tutors, courses, and study resources based on progress |
| **Progress Tracking** | **Student Dashboard** | Monitors performance, goals, and completed sessions |
| **Resources** | **Study Materials** | Centralized access to notes, slides, videos, and AI-generated summaries |
| **Collaboration** | **Live Whiteboard & Shared Notes** | Real-time collaboration between students and tutors |
| **Payments** | **Stripe Integration** | Allows students to subscribe, book sessions, or buy credits |
| **Push Notifications** | **OneSignal Integration** | Sends reminders for upcoming tutoring sessions or deadlines |
| **Internationalization** | **Multi-language Support** | Powered by `next-intl` + `Intl API` for global accessibility |
| **PWA Support** | **Offline Mode** | Uses **Serwist** for seamless Progressive Web App experience |

---

## **4. Project Setup**

```bash
# Clone the repository
git clone https://github.com/<your-org>/studify.git
cd studify

# Install dependencies
npm install

# Start development server
npm dev

# Build for production
npm build

# Start production
npm start
```

---

## **5. Deployment**

Studify is deployed on **Vercel** for automatic builds and previews.  
- **Frontend & API Hosting:** [Vercel](https://vercel.com/)  
- **Database & Auth:** [Supabase](https://supabase.com/)  
- **Real-time Features:** [Upstash Redis](https://upstash.com/) & [Liveblocks](https://liveblocks.io/)  
- **Payments:** [Stripe](https://stripe.com/)  
- **Push Notifications:** [OneSignal](https://onesignal.com/)

---

## **6. Future Improvements**

- AI-powered **personalized learning plans**
- Group study rooms with collaborative tools
- Gamification features for student motivation
- Offline-first mode for unstable network environments