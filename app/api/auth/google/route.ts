// app/api/auth/google/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/utils/supabase/client"; // server-side client created with SERVICE_ROLE_KEY
import redis from "@/utils/redis/redis";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google`;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    // 1) Use Supabase client to exchange the authorization code for tokens
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error || !data) {
      console.error("Token exchange failed:", error);
      return NextResponse.json({ error: error?.message || "Token exchange failed" }, { status: 400 });
    }

    // Extract session data
    const { session, user } = data;
    const accessToken = session?.access_token;

    if (!user) {
      return NextResponse.json({ error: "No user returned from token exchange" }, { status: 500 });
    }

    // 3) 按你的流程：缓存到 Redis 并把 redis_key 写入 user_metadata（admin 更新）
    const cacheKey = `user:${user.id}`;
    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email || "",
      avatar: user.user_metadata?.avatar_url || "",
    };

    // Redis set (示例使用你的 redis 客户端)
    await redis.set(cacheKey, JSON.stringify(userProfile), { ex: 3600 });

    // 更新 Supabase user metadata（需要 admin 权限）
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        redis_key: cacheKey,
      },
    });

    // 4) 返回给前端（只返回必要信息，不暴露 service role key）
    return NextResponse.json({
      user: userProfile,
      access_token: accessToken ? accessToken : undefined,
    });

  } catch (err) {
    console.error("Unexpected error in /api/auth/google:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
