<!-- 语言切换 | Language Switcher -->
<p align="right">
  <a href="./README.md">English</a> · <b>简体中文</b>
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

# Studify 🎓 AI 学习平台

Studify 是一个面向学生与导师的 AI 学习平台，集成了课程系统、教室系统、社区系统与 AI 能力（RAG 搜索、语义检索、学习路径、视频转写与问答、个性化推荐等），提供从学习到创作、从互动到支付的完整闭环体验。


## **1. 赛道与问题陈述**
### 比赛
Codenection 2025 Hackathon

### 赛道
Student Lifestyle → Tutoring for Students（学生辅导）

### 问题陈述
许多学生在学业上面临挑战，包括难以理解课程内容、缺乏个性化帮助以及低效的学习习惯。传统的辅导服务往往价格高、获取不便，且受限于固定时间，导致学生在最需要帮助时无法得到及时支持。

### 目标
构建一个提供**按需、可负担且个性化**学业支持的**辅导平台**。平台连接学生与导师，提供交互式学习工具，并提供精选学习资源，以提升学习效果并增强学生自信。

<p>
  <a href="#功能总览">功能</a> ·
  <a href="#技术栈">技术栈</a> ·
  <a href="#截图演示">截图</a> ·
  <a href="#模块概览">模块</a> ·
  <a href="#pwa-与-capacitor">PWA 与 Capacitor</a>
</p>

## 功能总览

- **课程系统**
  - 课程/模块/课时（video/live/document/quiz/assignment/whiteboard）
  - 报名与学习、进度追踪、笔记、测验（自动评分）、证书
  - Stripe 支付（Checkout + Webhooks），支持免费/付费课程
- **教室系统**
  - 班级创建、成员角色（拥有者/导师/学生）、班级码加入
  - 作业/提交/评分，直播与出勤
  - 白板协作、录播、学习路径集成
- **社区系统**
  - 群组（公开/私密）、帖子、评论（线程）、反应
  - 成就、签到、话题标签、推荐
- **AI 能力**
  - 双模型嵌入搜索（E5-Small + BGE-M3）、RAG 问答、学习教练
  - 视频转写（Whisper）带队列与预热
  - 个性化学习路径（Mermaid 可视化）
- **增长与参与**
  - OneSignal 推送 + DB 持久化
  - 游戏化（积分、成就、学习统计）
- **i18n 与体验**
  - next-intl 多语言、玻璃拟态 UI、深浅色主题

## 技术栈

<p>
  <img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,vercel,nodejs,supabase,postgres,redis,git,github" height="32" />
  </p>

- **前端**：Next.js 15、React 19、TypeScript、TailwindCSS、shadcn/ui、Framer Motion
- **后端**：Supabase（Auth/DB/Storage）、Upstash Redis、QStash 队列
- **AI**：LangChain、OpenRouter、HuggingFace Whisper、Mermaid 可视化
- **支付**：Stripe（Checkout、Connect、Webhook）
- **通知**：OneSignal Web Push
- **i18n**：next-intl

## 截图/演示

<p>
  <img src="./public/homepagess.png" alt="Dashboard" />
</p>

## 模块概览

- **课程**（`app/api/course/`，数据库表：`course*`、`course_lesson`、`course_enrollment`、`course_progress`、`course_quiz_*`）
  - 学生：选课学习、进度跟踪、测验、笔记、支付
  - 导师：管理课程内容、模块/课时、分析
  - 管理员：审核/风控、统计分析
- **教室**（`app/api/classroom/`，表：`classroom*`）
  - 拥有者/导师：创建班级、管理成员、作业/直播/出勤
  - 学生：班级码加入、提交作业、参加直播
- **社区**（`app/api/community/`，表：`community_*`）
  - 群组（公开/私密）、帖子、评论、反应
  - 成就、签到、话题标签、测验

> 接口访问控制：API 通过 `utils/auth/server-guard.ts` 的 `authorize('student'|'tutor'|'admin')` 进行鉴权，并在数据库层做所有权校验（RLS）。

## 功能亮点
- **AI 优先的学习体验**：±30 秒时间窗的视频问答、术语卡片、时间点跳转
- **丰富的视频互动**：观看、点赞、弹幕（限流/审核）、线程评论与评论点赞
- **双模型语义搜索**：E5-Small（384d）+ BGE-M3（1024d）混合检索与后台队列
- **稳健的后台处理**：QStash 驱动的 Whisper 转写，预热与重试
- **真实结算的支付**：Stripe Checkout + Connect，90/10 分成与定时释放
- **通知与增长**：OneSignal 推送 + DB 持久化，未读计数与用户偏好
- **国际化与体验**：next-intl、多语言、玻璃拟态、深浅色、可访问性
- **Admin 与 RBAC**：管理后台与权限控制

## 性能与安全
- **安全**：关键表启用 RLS，API 层鉴权与所有权校验，审计日志
- **可靠**：React Query 缓存、Redis 缓存、预热 + 重试、限流、索引与触发器
- **可扩展**：嵌入/转写后台处理、分页 API、混合向量搜索

## PWA 与 Capacitor

- **PWA 层（Serwist + Manifest）**
  - Service Worker：定义于 `app/sw.ts`，经 `@serwist/next` 打包为 `public/sw.js`（见 `next.config.ts`）。开发禁用，生产启用。
  - Manifest：`public/manifest.json` 提供元数据与图标。
  - OneSignal Worker：`public/OneSignalSDKWorker.js` 在 `next.config.ts` 中通过 `exclude` 排除，使用正确 Headers 提供服务。
  - 验证：本地构建后在 Chrome DevTools → Application → Service Workers 检查。
    ```bash
    npm run build && npm start
    ```
- **Capacitor 移动外壳**
  - 配置：`capacitor.config.ts`
    ```ts
    const config: CapacitorConfig = {
      appId: "com.studify.platform.vercel.app",
      appName: "Studify",
      webDir: "empty", // 使用远程服务器
      server: { url: "https://studify-platform.vercel.app", cleartext: true },
    };
    ```
  - 开发（Android/iOS）：将 `server.url` 指向本地开发服务
    - Android 模拟器：`http://10.0.2.2:3000`
    - 真机同局域网：`http://<LAN-IP>:3000`
    - 步骤：
      ```bash
      npm run dev
      npx cap sync android   # 或 npx cap sync ios
      npx cap run android    # 或 npx cap open android
      ```
    - 注意：`cleartext: true` 便于本地 http 调试；生产使用 https。
  - 生产：将 Web 部署到正式域名（如 Vercel），`server.url` 指向 https 域名后打包。

## 反馈

- **用户反馈表单**：https://forms.gle/cZSzsLVbRqysDcER9
- **问题上报表单**：https://forms.gle/8ZYapQ9e9MFZ7EC97
