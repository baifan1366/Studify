"use client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignInWithGoogle() {
  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // 回调到一个专门的前端 callback 页（不要回到 / 或被 middleware 重写的路径）
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    // supabase-js 会把浏览器重定向到 Google
  }

  return (
    <button onClick={handleGoogle}>Continue with Google</button>
  );
}
