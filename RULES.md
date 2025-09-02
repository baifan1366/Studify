# 📝 项目开发规则

本项目的所有开发必须遵循以下规则，以确保 **SEO 友好**、**UI 一致性**、**代码可维护性** 和 **后端安全性**。  
请所有开发者在提交 PR 前，确保严格遵守以下规范。

---

## **1. 必须在每个 `page.tsx` 文件中配置 Metadata**
- 所有页面都必须添加 **SEO Metadata**。
- Metadata 不允许使用 `'use client'`。
- 推荐写法：
```ts
// app/(student)/dashboard/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Studify",
  description: "Manage your courses and schedule with Studify",
  keywords: "dashboard, learning, tutor, education, study",
  openGraph: {
    title: "Dashboard | Studify",
    description: "Manage your courses and schedule with Studify",
    type: 'website',
  },
};

export default function DashboardPage() {
  return <div>Student Dashboard</div>;
}
```

---

## **2. 必须支持 Light & Dark Theme**
- UI 必须兼容 **深色模式**和**浅色模式**。
- 样式建议使用：
```css
.dark {
  background-color: #111;
  color: #fff;
}
```

---

## **3. 文件命名规则：使用 `kebab-case`**
- 不允许使用 `camelCase` 或 `PascalCase`。
- 正确示例：
```
student-dashboard.tsx ✅
student_profile.tsx ❌
StudentDashboard.tsx ❌
```

---

## **4. 所有 `loading.tsx` 必须使用 Skeleton/Spinner**
- 所有需要加载的页面，必须实现 Loading UI。
- 示例：
```tsx
// app/(student)/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <Skeleton className="h-6 w-full" />;
}
```

---

## **5. Toast 系统：统一使用 Sonner**
- 所有提示信息必须使用 [Sonner](https://sonner.emilkowal.ski/)。
- 示例：
```tsx
import { toast } from "sonner";

toast.success("操作成功！");
toast.error("出错了，请稍后重试！");
```

---

## **6. 必须实现响应式设计 (Responsive Design)**
- 所有页面必须适配：
  - **Mobile (≤768px)**
  - **Tablet (768px ~ 1024px)**
  - **Desktop (≥1024px)**
- 推荐使用 **Tailwind**：
```tsx
<div className="p-4 md:p-8 lg:p-12">内容</div>
```

---

## **7. API 路由代码禁止写在前端**
- 所有 API 相关逻辑必须写在 `app/api/...`。
- 不允许在页面组件中直接写 API 路由。

**✅ 正确：**
```
app/api/user/route.ts    ← 后端 API
app/(student)/profile/page.tsx ← 前端调用 API
```

---

## **8. API 请求流程规范**
**步骤：**
1. 在 **`lib/api.js`** 中集中管理 API URL。
2. 在 **`hooks/`** 里封装对应的请求逻辑。
3. 在 **组件**中只调用 Hook，不直接写 `fetch()`。

**示例：**
```ts
// lib/api.js
export const filesApi = "/api/files";

// hooks/use-files.ts
import useSWR from "swr";
import { filesApi } from "@/lib/api";

export const useFiles = () => {
  return useSWR(filesApi, (url) => fetch(url).then((res) => res.json()));
};

// components/files-list.tsx
import { useFiles } from "@/hooks/use-files";

export default function FilesList() {
  const { data, isLoading } = useFiles();
  return <div>{isLoading ? "加载中..." : JSON.stringify(data)}</div>;
}
```

---

## **9. Supabase 只能在后端 API 中使用**
- **禁止**在前端直接调用 `supabase`。
- **只能在** `app/api/.../route.ts` 内导入 `supabase`。

**✅ 正确：**
```ts
// app/api/user/route.ts
import { supabase } from "@/lib/supabase";

export async function GET() {
  return NextResponse.json({ users: await supabase.from("users").select("*") });
}
```

---

## **10. 使用 `( )` 包裹分组文件夹**
- 在 `@/app/...` 内的文件夹结构，**必须用括号包裹**分组：
```
app
├── (student)
│   └── dashboard/page.tsx
├── (tutor)
│   └── courses/page.tsx
└── (admin)
    └── users/page.tsx
```

---

## **11. 必须使用 `api-config.ts`**
- 所有 API 相关的默认配置（如 Headers、Base URL、超时等）必须统一写在 **`lib/api-config.ts`**。

---

## **12. 在 Hooks 中必须导入 `@/interface`**
- 所有 Hooks 请求返回的数据类型必须从 `@/interface` 导入。
- 示例：
```ts
import { User } from "@/interface/user";

export const useUser = (): User => {
  // ...
};
```

---

## **13. 文件必须按角色分组**
- 必须严格分为：
  - `student`
  - `tutor`
  - `admin`
- 示例：
```
app
├── (student)/dashboard/page.tsx
├── (tutor)/courses/page.tsx
└── (admin)/users/page.tsx
```

---

## **14. 用户验证：前端用 `use-user`，后端用 `server-guard`**
- **前端**：在 Hook 中通过 `use-user` 获取当前用户。
- **后端**：使用 `server-guard` 进行权限校验。

---

## **15. 禁止在前端调用 `supabase.auth.getUser()` 或 `getSession()`**
- 所有用户身份和会话相关操作必须在 **后端**完成。
- 前端只通过 Hooks 调用后端 API。

---

# ✅ 总结
| 规则 | 重点 | 必须遵循 |
|------|------|-----------|
1 | Metadata | 每个页面必须有 SEO Metadata |
2 | UI | 支持深浅色主题 |
3 | 命名 | 全部使用 kebab-case |
4 | Loading | 用 Skeleton 或 Spinner |
5 | Toast | 必须用 Sonner |
6 | 响应式 | 支持 Mobile、Tablet、Desktop |
7 | API | 所有路由必须写在 app/api/... |
8 | 请求 | API → Hooks → Components |
9 | Supabase | 只能在后端用 |
10 | 分组 | app/(student)/(tutor)/(admin) |
11 | 配置 | 必须用 api-config.ts |
12 | 类型 | 必须用 @/interface |
13 | 文件 | 按角色分组 |
14 | 鉴权 | use-user & server-guard |
15 | 禁止 | 前端不能直接 supabase.auth |
