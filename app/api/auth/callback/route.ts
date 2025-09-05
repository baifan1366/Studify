// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import redis from "@/utils/redis/redis";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // 从 Redis 或 Cookie 中取出 code_verifier
  const codeVerifier =
    (state && (await redis.get(`pkce:${state}`))) ||
    req.cookies.get("pkce_verifier")?.value;

  if (!code || !codeVerifier) {
    return NextResponse.json({ error: "Missing code or verifier" }, { status: 400 });
  }

  // 向 Supabase token 端点交换 token
  const resp = await fetch(
    `https://${process.env.NEXT_PUBLIC_SUPABASE_PROJECT}.supabase.co/auth/v1/token?grant_type=pkce`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: `${req.nextUrl.origin}/api/auth/callback`,
      }),
    }
  );

  const data = await resp.json();

  if (!resp.ok) {
    return NextResponse.json({ error: data.error_description || "Token exchange failed" }, { status: 400 });
  }

  // TODO: 这里再签发 app_session cookie
  return NextResponse.json({ session: data });
}
