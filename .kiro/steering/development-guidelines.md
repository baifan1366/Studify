# Studify 项目开发总则

本文档定义了在 Studify 项目中添加新功能时必须遵守的核心开发规范。所有开发者必须严格遵循这些原则，以确保代码质量、可维护性和一致性。

---

## 目录

1. [架构分层原则](#1-架构分层原则)
2. [API 调用规范](#2-api-调用规范)
3. [国际化 (i18n) 规范](#3-国际化-i18n-规范)
4. [样式与主题规范](#4-样式与主题规范)
5. [组件开发规范](#5-组件开发规范)
6. [状态管理规范](#6-状态管理规范)
7. [错误处理与通知规范](#7-错误处理与通知规范)
8. [TypeScript 类型规范](#8-typescript-类型规范)
9. [文件组织规范](#9-文件组织规范)
10. [性能优化规范](#10-性能优化规范)

---

## 1. 架构分层原则

### ⚠️ 核心原则：严格的三层架构

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (组件层)                      │
│    - 展示逻辑、用户交互                                    │
│    - 调用 React Query Hooks                               │
│    - ❌ 禁止直接调用 Supabase                              │
│    - ❌ 禁止硬编码文本                                      │
└────────────────────┬────────────────────────────────────┘
                     │ useQuery / useMutation
                     ▼
┌─────────────────────────────────────────────────────────┐
│                Data Layer (Hooks 层)                      │
│    - React Query Hooks (useQuery, useMutation)           │
│    - 数据获取和缓存逻辑                                    │
│    - 调用 API 辅助函数 (apiGet, apiSend)                  │
│    - 管理缓存失效 (invalidateQueries)                     │
└────────────────────┬────────────────────────────────────┘
                     │ fetch('/api/...')
                     ▼
┌─────────────────────────────────────────────────────────┐
│              API Layer (Next.js Route Handlers)          │
│    - 服务端验证和权限检查                                  │
│    - 调用 Supabase 客户端                                 │
│    - 数据转换和业务逻辑                                    │
│    - 返回 JSON 响应                                       │
└─────────────────────────────────────────────────────────┘
```

### ✅ 正确示例

```typescript
// ❌ 错误：UI 层直接调用 Supabase
export function CourseList() {
  const [courses, setCourses] = useState([]);
  
  useEffect(() => {
    // ❌ 禁止这样做！
    supabase.from('courses.course').select('*').then(...)
  }, []);
}

// ✅ 正确：UI 层通过 React Query Hooks 调用
export function CourseList() {
  const { data: courses, isLoading } = useCourses(); // ✅ 使用 hook
  
  if (isLoading) return <Loading />;
  return <div>{courses?.map(...)}</div>;
}

// ✅ 正确：Hook 层
// hooks/course/use-courses.ts
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => apiGet<Course[]>(coursesApi.list), // ✅ 调用 API
  });
}

// ✅ 正确：API 层
// app/api/courses/route.ts
export async function GET() {
  const client = await createServerClient(); // ✅ 服务端调用 Supabase
  const { data } = await client.from('courses.course').select('*');
  return NextResponse.json({ data });
}
```

---

## 2. API 调用规范

### 2.1 使用 React Query 进行数据获取

**必须使用 React Query**，不允许使用 useEffect + fetch 模式。

```typescript
// ✅ 正确：使用 React Query
export function useCourses(ownerId?: number) {
  return useQuery({
    queryKey: ['courses', ownerId],
    queryFn: () => {
      const url = ownerId 
        ? coursesApi.listByOwnerId(ownerId) 
        : coursesApi.list;
      return apiGet<Course[]>(url);
    },
    enabled: Boolean(ownerId), // 条件查询
  });
}

// ✅ 正确：使用 React Query Mutation
export function useCreateCourse() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateCourseInput) =>
      apiPost<Course>(coursesApi.create, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}
```

### 2.2 使用集中式 API 端点定义

所有 API 端点必须在 `lib/api.ts` 中定义：

```typescript
// lib/api.ts
export const coursesApi = {
  list: "/api/courses",
  getById: (courseId: number) => `/api/courses/${courseId}`,
  create: "/api/courses",
  update: (courseId: number) => `/api/courses/${courseId}`,
  delete: (courseId: number) => `/api/courses/${courseId}`,
} as const;

// ✅ 在 hooks 中使用
import { coursesApi } from '@/lib/api';
```

### 2.3 使用 API 辅助函数

使用 `lib/api-config.ts` 中的辅助函数，而非直接 fetch：

```typescript
// ✅ 正确
import { apiGet, apiPost, apiPatch } from '@/lib/api-config';

// GET 请求
const courses = await apiGet<Course[]>('/api/courses');

// POST 请求
const newCourse = await apiPost<Course>('/api/courses', { title: '...' });

// PATCH 请求
const updated = await apiPatch<Course>('/api/courses/1', { title: '...' });
```

### 2.4 React Query 配置

```typescript
// components/providers/react-query-provider.tsx
const [queryClient] = useState(() => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,        // 1 分钟
      gcTime: 1000 * 60 * 5,       // 5 分钟
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
}));
```

---

## 3. 国际化 (i18n) 规范

### 3.1 禁止硬编码文本

**所有用户可见文本必须使用 i18n keys**，不允许硬编码。

```typescript
// ❌ 错误：硬编码文本
<Button>Create Course</Button>
<p>Welcome to Studify!</p>

// ✅ 正确：使用 i18n
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('CoursePage');
  
  return (
    <>
      <Button>{t('create_course')}</Button>
      <p>{t('welcome_message')}</p>
    </>
  );
}
```

### 3.2 翻译文件结构

翻译文件位于 `messages/en.json`, `messages/zh.json`, `messages/ms.json`：

```json
// messages/en.json
{
  "CoursePage": {
    "title": "My Courses",
    "create_course": "Create Course",
    "welcome_message": "Welcome to Studify!",
    "enrolled": "Enrolled: {count} students",
    "errors": {
      "not_found": "Course not found",
      "enrollment_failed": "Failed to enroll in course"
    }
  }
}
```

### 3.3 带参数的翻译

```typescript
// ✅ 使用参数
t('enrolled', { count: 25 })

// ✅ 使用嵌套翻译
t('errors.not_found')
```

### 3.4 服务端 vs 客户端使用

```typescript
// ✅ 服务端组件
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('CoursePage');
  return { title: t('metadata_title') };
}

// ✅ 客户端组件
'use client';
import { useTranslations } from 'next-intl';

export function CourseCard() {
  const t = useTranslations('CoursePage');
  return <h1>{t('title')}</h1>;
}
```

---

## 4. 样式与主题规范

### 4.1 Dark Mode 是强制性的

**所有组件必须支持 Dark Mode**，使用 `dark:` 变体。

```typescript
// ❌ 错误：缺少 dark mode
<div className="bg-white text-gray-900">

// ✅ 正确：包含 dark mode
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">

// ✅ 正确：使用 CSS 变量（推荐）
<div className="bg-background text-foreground border-border">
```

### 4.2 使用 CSS 变量

优先使用全局 CSS 变量，而非硬编码颜色：

```css
/* app/globals.css - 已定义的变量 */
:root {
  --background: #FAFAFA;
  --foreground: #1A1A1A;
  --primary: #FF6B00;        /* 品牌橙色 */
  --card: #FFFFFF;
  --border: #E5E5E5;
  /* ...更多变量 */
}

.dark {
  --background: #0D1F1A;
  --foreground: #F1F5F9;
  --primary: #FF6B00;
  --card: #1F2937;
  --border: #1F2937;
  /* ...更多变量 */
}
```

```typescript
// ✅ 使用 Tailwind 映射的 CSS 变量
<div className="bg-background text-foreground">
<div className="border-border">
<div className="bg-primary text-primary-foreground">
```

### 4.3 使用 CVA 定义组件变体

对于可复用组件，使用 `class-variance-authority`：

```typescript
// components/ui/button.tsx (参考现有实现)
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80",
        destructive: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700",
        outline: "border border-input bg-background hover:bg-accent dark:hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
```

### 4.4 品牌颜色

使用项目品牌颜色：

| 用途 | 颜色 | 使用场景 |
|------|------|----------|
| Primary | `#FF6B00` | 主要按钮、强调元素 |
| Secondary | `#064E3B` | 次要元素、链接 |
| Accent | `#FDF5E6` / `#FFF7ED` | 高亮背景 |
| Success | `#10B981` | 成功状态 |
| Error | `#EF4444` | 错误状态 |
| Warning | `#F59E0B` | 警告状态 |

---

## 5. 组件开发规范

### 5.1 组件命名约定

| 组件类型 | 命名格式 | 示例 |
|----------|----------|------|
| 页面组件 | `page.tsx` | `app/[locale]/courses/page.tsx` |
| 布局组件 | `layout.tsx` | `app/[locale]/layout.tsx` |
| 功能组件 | `[功能名].tsx` | `course-card.tsx` |
| 列表组件 | `[功能名]-list.tsx` | `course-list.tsx` |
| 表单组件 | `[功能名]-form.tsx` | `create-course-form.tsx` |
| 对话框组件 | `[功能名]-dialog.tsx` | `enroll-dialog.tsx` |
| Provider | `[功能名]-provider.tsx` | `auth-provider.tsx` |

### 5.2 组件结构

```typescript
// ✅ 正确的组件结构
import { useTranslations } from 'next-intl';
import { useCourses } from '@/hooks/course/use-courses';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/styles';

export interface CourseCardProps {
  course: Course;
  onEnroll?: () => void;
  className?: string;
}

export function CourseCard({ course, onEnroll, className }: CourseCardProps) {
  const t = useTranslations('CourseCard');
  const { isLoading, mutate: enroll } = useEnrollCourse();
  
  return (
    <Card className={cn("p-4 bg-card dark:bg-card", className)}>
      <h3 className="text-foreground">{course.title}</h3>
      <p className="text-muted-foreground">{course.description}</p>
      <Button 
        onClick={() => enroll({ courseId: course.id })}
        disabled={isLoading}
      >
        {t('enroll')}
      </Button>
    </Card>
  );
}
```

### 5.3 使用 Radix UI 原语

对于复杂交互组件，封装 Radix UI：

```typescript
// components/ui/dialog.tsx
"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/utils/styles"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 dark:bg-black/70" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
        "bg-background p-6 shadow-lg rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
```

### 5.4 支持 asChild 模式

```typescript
// ✅ 允许组合其他组件
<Button asChild>
  <Link href="/courses">View Courses</Link>
</Button>
```

---

## 6. 状态管理规范

### 6.1 选择正确的状态管理方式

| 状态类型 | 管理方式 | 示例 |
|----------|----------|------|
| 服务端状态 | React Query | 课程列表、用户数据 |
| 全局客户端状态 | React Context | 认证状态、主题、用户偏好 |
| 局部 UI 状态 | useState/useReducer | 表单状态、Modal 开关 |
| 实时状态 | Supabase Realtime | 在线状态、实时通知 |

### 6.2 React Query 使用模式

```typescript
// hooks/course/use-courses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-config';
import { coursesApi } from '@/lib/api';

// ✅ Query Hook
export function useCourses(ownerId?: number) {
  return useQuery({
    queryKey: ['courses', ownerId],
    queryFn: () => {
      const url = ownerId 
        ? coursesApi.listByOwnerId(ownerId) 
        : coursesApi.list;
      return apiGet<Course[]>(url);
    },
    enabled: Boolean(ownerId),
  });
}

// ✅ Mutation Hook
export function useCreateCourse() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateCourseInput) =>
      apiPost(coursesApi.create, data),
    onSuccess: () => {
      // 失效相关缓存
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

// ✅ 在组件中使用
export function CourseList() {
  const { data: courses, isLoading, error } = useCourses();
  const { mutate: create, isPending } = useCreateCourse();
  
  // ...
}
```

### 6.3 Context 使用模式

```typescript
// components/providers/auth-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初始化
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // 监听变化
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
```

---

## 7. 错误处理与通知规范

### 7.1 使用 Sonner 进行 Toast 通知

```typescript
import { toast } from 'sonner';

// ✅ 成功通知
toast.success('Course created successfully! 🎉');

// ✅ 错误通知
toast.error('Failed to create course');

// ✅ 带描述的通知
toast.success('Video uploaded!', {
  description: 'Starting background AI processing...'
});

// ✅ 在 mutation 中使用
const createCourse = useMutation({
  mutationFn: createCourseApi,
  onSuccess: () => {
    toast.success('Course created successfully! 🎉');
    router.push('/courses');
  },
  onError: (error: any) => {
    toast.error(error?.message || 'Failed to create course');
  },
});
```

### 7.2 API 路由错误处理

```typescript
// app/api/courses/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  try {
    const client = await createServerClient();
    
    const { data, error } = await client
      .from('courses.course')
      .select('*');
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Internal error' },
      { status: 500 }
    );
  }
}
```

### 7.3 全局错误处理

React Query Provider 已配置全局 mutation 错误处理：

```typescript
// components/providers/react-query-provider.tsx
const [queryClient] = useState(() => new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error: any) => {
        import('sonner').then(({ toast }) => {
          toast.error(error?.message || 'An error occurred');
        });
      },
    },
  },
}));
```

---

## 8. TypeScript 类型规范

### 8.1 类型定义位置

```
interface/
├── courses/
│   ├── course-interface.ts
│   ├── enrollment-interface.ts
│   └── lesson-interface.ts
├── classroom/
│   ├── assignment-interface.ts
│   └── quiz-interface.ts
├── user/
│   ├── profile-interface.ts
│   └── tutor-profile-interface.ts
└── index.ts  # 统一导出
```

### 8.2 类型定义模式

```typescript
// interface/courses/course-interface.ts
export interface Course {
  id: number;
  public_id: string;
  title: string;
  description?: string;
  visibility: 'public' | 'private';
  status: 'active' | 'inactive' | 'draft';
  owner_id: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// ✅ 创建输入类型
export interface CreateCourseInput {
  title: string;
  description?: string;
  visibility: 'public' | 'private';
}

// ✅ 更新输入类型
export type UpdateCourseInput = Partial<Omit<Course, 'id' | 'created_at'>>;
```

### 8.3 组件 Props 类型

```typescript
// ✅ 使用 VariantProps 获取变体类型
import { cva, type VariantProps } from 'class-variance-authority';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// ✅ 功能组件 Props
export interface CourseCardProps {
  course: Course;
  onEnroll?: (courseId: number) => void;
  className?: string;
  showProgress?: boolean;
}
```

---

## 9. 文件组织规范

### 9.1 目录结构

```
app/
├── api/                    # API Routes
│   ├── courses/           # 课程 API
│   │   ├── route.ts       # GET, POST
│   │   └── [id]/route.ts  # GET, PATCH, DELETE
│   └── ...
├── [locale]/              # 国际化路由
│   ├── (student)/         # 学生端页面
│   ├── (tutor)/           # 导师端页面
│   ├── (admin)/           # 管理员端页面
│   └── (auth)/            # 认证页面

components/
├── ui/                    # 基础 UI 组件
├── admin/                 # 管理员组件
├── auth/                  # 认证组件
├── providers/             # Context Providers
└── [feature]/             # 功能模块组件

hooks/
├── course/               # 课程相关 hooks
├── auth/                 # 认证相关 hooks
└── [feature]/            # 功能模块 hooks

lib/
├── api.ts                # API 端点定义
├── api-config.ts         # API 配置和辅助函数
└── utils.ts              # 工具函数

interface/                # TypeScript 类型定义
messages/                 # 国际化翻译文件
├── en.json
├── zh.json
└── ms.json
```

### 9.2 文件命名约定

| 文件类型 | 命名格式 | 示例 |
|----------|----------|------|
| 组件文件 | kebab-case | `course-card.tsx` |
| Hook 文件 | kebab-case | `use-courses.ts` |
| 类型文件 | kebab-case | `course-interface.ts` |
| API 路由 | `route.ts` | `app/api/courses/route.ts` |
| 页面文件 | `page.tsx` | `app/[locale]/courses/page.tsx` |

---

## 10. 性能优化规范

### 10.1 React Query 优化

```typescript
// ✅ 合理设置缓存时间
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => apiGet<Course[]>(coursesApi.list),
    staleTime: 1000 * 60,      // 1 分钟内数据视为新鲜
    gcTime: 1000 * 60 * 5,     // 5 分钟后垃圾回收
  });
}

// ✅ 使用 enabled 进行条件查询
export function useCourse(id?: number) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => apiGet<Course>(coursesApi.getById(id!)),
    enabled: Boolean(id),  // 只有 id 存在时才执行
  });
}
```

### 10.2 组件懒加载

```typescript
// ✅ 使用 dynamic import
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(
  () => import('@/components/video/video-player'),
  { 
    loading: () => <Loading />,
    ssr: false  // 如果不需要 SSR
  }
);
```

### 10.3 图片优化

```typescript
// ✅ 使用 Next.js Image
import Image from 'next/image';

<Image
  src={course.thumbnail_url}
  alt={course.title}
  width={320}
  height={180}
  loading="lazy"
/>
```

---

## 检查清单

在提交代码前，请确认：

- [ ] **架构分层**：UI 层没有直接调用 Supabase
- [ ] **API 调用**：使用了 React Query 和 API 辅助函数
- [ ] **国际化**：所有文本使用了 `useTranslations`
- [ ] **Dark Mode**：所有样式包含了 `dark:` 变体
- [ ] **类型安全**：定义了完整的 TypeScript 类型
- [ ] **错误处理**：使用了 toast 通知和 try-catch
- [ ] **文件命名**：遵循了命名约定
- [ ] **组件封装**：使用了 Radix UI 原语和 CVA

---

## 示例：完整功能实现流程

### 1. 定义类型

```typescript
// interface/feature/feature-interface.ts
export interface Feature {
  id: number;
  name: string;
  description?: string;
}
```

### 2. 添加翻译

```json
// messages/en.json
{
  "FeaturePage": {
    "title": "Features",
    "create": "Create Feature",
    "name": "Name",
    "description": "Description"
  }
}
```

### 3. 定义 API 端点

```typescript
// lib/api.ts
export const featureApi = {
  list: "/api/features",
  getById: (id: number) => `/api/features/${id}`,
  create: "/api/features",
  update: (id: number) => `/api/features/${id}`,
} as const;
```

### 4. 创建 API 路由

```typescript
// app/api/features/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const client = await createServerClient();
    const { data, error } = await client.from('features').select('*');
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
```

### 5. 创建 React Query Hook

```typescript
// hooks/feature/use-features.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-config';
import { featureApi } from '@/lib/api';

export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: () => apiGet<Feature[]>(featureApi.list),
  });
}

export function useCreateFeature() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateFeatureInput) =>
      apiPost(featureApi.create, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features'] });
    },
  });
}
```

### 6. 创建组件

```typescript
// components/feature/feature-list.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useFeatures, useCreateFeature } from '@/hooks/feature/use-features';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export function FeatureList() {
  const t = useTranslations('FeaturePage');
  const { data: features, isLoading } = useFeatures();
  const { mutate: create, isPending } = useCreateFeature();
  
  if (isLoading) return <Loading />;
  
  return (
    <div className="bg-background text-foreground">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      
      <div className="grid gap-4">
        {features?.map((feature) => (
          <Card key={feature.id} className="p-4 bg-card dark:bg-card">
            <h3 className="text-foreground">{feature.name}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </Card>
        ))}
      </div>
      
      <Button
        onClick={() => create({ name: 'New Feature' })}
        disabled={isPending}
      >
        {t('create')}
      </Button>
    </div>
  );
}
```

---

遵循以上规范，确保代码质量和项目一致性。如有疑问，请参考现有代码实现或向团队负责人咨询。
