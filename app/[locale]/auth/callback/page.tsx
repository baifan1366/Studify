// app/auth/callback/page.tsx
"use client";
import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner"; // 按规则使用 Sonner

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      try {
        // 解析 URL 并完成 PKCE/code exchange（supabase-js 做这件事）
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          toast.error("No authorization code found");
          window.location.href = "/en/sign-in";
          return;
        }
        
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error("OAuth callback error");
          console.error("getSessionFromUrl error", error);
          // 重定向到登录页面
          window.location.href = "/en/sign-in";
          return;
        }
        
        const accessToken = data?.session?.access_token;
        if (!accessToken) {
          toast.error("No access token");
          // 重定向到登录页面
          window.location.href = "/en/sign-in";
          return;
        }

        // 发给后端同步缓存 /api/auth/sync（后端用 service role key 校验并写 Redis/metadata）
        const resp = await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken })
        });

        if (!resp.ok) {
          const err = await resp.json();
          toast.error("Server sync failed");
          console.error("sync error", err);
          // 重定向到登录页面
          window.location.href = "/en/sign-in";
          return;
        }

        const result = await resp.json();
        toast.success("Login successful");
        
        // 根据用户角色跳转到对应页面
        const role = result.user?.role || "student";
        const pathByRole: Record<string, string> = {
          student: "/en/home",
          tutor: "/en/tutor/dashboard",
          admin: "/en/admin/dashboard",
        };
        
        window.location.href = pathByRole[role] || "/en/home";
      } catch (error) {
        console.error("Unexpected error in auth callback:", error);
        toast.error("Authentication failed");
        window.location.href = "/en/sign-in";
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Processing login...</p>
      </div>
    </div>
  );
}
