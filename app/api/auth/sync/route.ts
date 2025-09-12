// app/api/auth/sync/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import redis from "@/utils/redis/redis";
import { signAppJwt, generateJti } from "@/utils/auth/jwt";

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
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("Failed to get user profile:", profileError);
      
      // If profile doesn't exist, create it (for OAuth users)
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          role: 'student',
          full_name: user.user_metadata?.full_name,
          email: user.email,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0]
        })
        .select()
        .single();
      
      if (createError) {
        console.error("Failed to create user profile:", createError);
        return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
      }
      
      // Retry getting the profile
      const { data: newProfile, error: retryError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (retryError || !newProfile) {
        return NextResponse.json({ error: "Failed to get user profile after creation" }, { status: 500 });
      }
      
      profile = newProfile;
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

    // 创建 JWT session
    const jti = generateJti();
    const sessionKey = `session:${jti}`;
    
    // 在 Redis 中存储 session
    await redis.set(sessionKey, JSON.stringify({
      userId: user.id,
      role: userProfile.role,
      name: userProfile.name,
      createdAt: new Date().toISOString()
    }), { ex: 7 * 24 * 3600 }); // 7 days

    // 生成 JWT token
    const token = await signAppJwt({
      sub: user.id,
      role: userProfile.role as 'student' | 'tutor' | 'admin',
      jti: jti,
      name: userProfile.name
    }, 7 * 24 * 3600); // 7 days

    // 更新 user_metadata 写入 redis_key（需要 admin 权限）
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { 
        ...(user.user_metadata || {}), 
        redis_key: cacheKey 
      }
    });

    // 创建响应并设置 httpOnly cookie
    const response = NextResponse.json({ ok: true, user: userProfile });
    
    // 设置 app_session cookie (middleware 需要的)
    response.cookies.set('app_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600, // 7 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error("Unexpected error in /api/auth/sync:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
