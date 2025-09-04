// app/api/auth/sync/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import redis from "@/utils/redis/redis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access_token = body?.access_token;
    
    if (!access_token) {
      return NextResponse.json({ error: "missing token" }, { status: 400 });
    }

    // 用 server client (service role key) 根据 token 获取 user
    const supabase = await createServerClient();
    const { data: userRes, error } = await supabase.auth.getUser(access_token);
    
    if (error || !userRes?.user) {
      console.error("getUser failed", error);
      return NextResponse.json({ error: "invalid token" }, { status: 401 });
    }

    const user = userRes.user;
    const cacheKey = `user:${user.id}`;
    
    // 从 profiles 表获取用户完整信息
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("Failed to get user profile:", profileError);
      return NextResponse.json({ error: "Failed to get user profile" }, { status: 500 });
    }

    const userProfile = {
      id: user.id,
      email: user.email,
      name: profile.full_name || user.user_metadata?.full_name || user.email || "",
      avatar: profile.avatar_url || user.user_metadata?.avatar_url || "",
      role: profile.role || "student"
    };

    // Redis 缓存（按你上面用的 redis client）
    await redis.set(cacheKey, JSON.stringify(userProfile), { ex: 3600 });

    // 更新 user_metadata 写入 redis_key（需要 admin 权限）
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { 
        ...(user.user_metadata || {}), 
        redis_key: cacheKey 
      }
    });

    return NextResponse.json({ ok: true, user: userProfile });
  } catch (error) {
    console.error("Unexpected error in /api/auth/sync:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
