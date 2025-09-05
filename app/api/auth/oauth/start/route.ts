
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import redis from "@/utils/redis/redis";

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}
function generateCodeChallenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export async function GET(req: NextRequest) {
  // 1. 生成 code_verifier
  const codeVerifier = generateCodeVerifier();

  // 2. 生成 code_challenge
  const codeChallenge = generateCodeChallenge(codeVerifier); // ✅ 在这里用上

  // 3. 存储 code_verifier（Redis 或 Cookie）
  const state = crypto.randomBytes(16).toString("hex");
  await redis.set(`pkce:${state}`, codeVerifier, { ex: 300 });

  // 4. 拼接授权 URL，把 code_challenge 带上
  const callbackUrl = `${req.nextUrl.origin}/api/auth/callback`;
  const authUrl = `https://${process.env.NEXT_PUBLIC_SUPABASE_PROJECT}.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
    callbackUrl
  )}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`;

  return NextResponse.redirect(authUrl);
}
