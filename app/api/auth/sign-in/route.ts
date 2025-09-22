import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/utils/supabase/server'
import redis from '@/utils/redis/redis'
import { signAppJwt, generateJti } from '@/utils/auth/jwt'

const APP_SESSION_COOKIE = 'app_session'
const APP_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export async function POST(req: NextRequest) {
  try {
    let email: string | undefined
    let password: string | undefined
    let locale: string | undefined
    let captchaToken: string | undefined
    try {
      const body = await req.json()
      email = typeof body.email === 'string' ? body.email : undefined
      password = typeof body.password === 'string' ? body.password : undefined
      locale = typeof body.locale === 'string' ? body.locale : undefined
      captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : undefined
    } catch {
      const form = await req.formData().catch(() => null)
      if (form) {
        email = String(form.get('email') || '') || undefined
        password = String(form.get('password') || '') || undefined
        locale = (form.get('locale') as string) || undefined
        captchaToken = (form.get('captchaToken') as string) || undefined
      }
    }
    if (!email || !password) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const client = await createServerClient()
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || 'Sign-in failed' }, { status: 401 })
    }

    // fetch role and display name from profiles (default student)
    const { data: profile, error: profileErr } = await client
      .from('profiles')
      .select('role, display_name')
      .eq('user_id', data.user.id)
      .single()

    const role = (profile?.role as 'student' | 'tutor' | 'admin') || 'student'
    const name =
      profile?.display_name ||
      (data.user.user_metadata?.full_name as string | undefined) ||
      (data.user.email ? data.user.email.split('@')[0] : undefined)

    // issue app JWT
    const jti = generateJti()
    const jwt = await signAppJwt({ sub: data.user.id, role, jti, name }, APP_SESSION_TTL_SECONDS)

    // store jti stub in redis
    await redis.set(`session:${jti}`, data.user.id, { ex: APP_SESSION_TTL_SECONDS })

    // set HttpOnly cookie and redirect for form posts
    const isFormPost = req.headers.get('content-type')?.includes('application/x-www-form-urlencoded') ||
      req.headers.get('content-type')?.includes('multipart/form-data')

    const targetLocale = locale || req.cookies.get('next-intl-locale')?.value || 'en'
    const pathByRole: Record<'student' | 'tutor' | 'admin', string> = {
      student: `/${targetLocale}/home`,
      tutor: `/${targetLocale}/tutor/dashboard`,
      admin: `/${targetLocale}/admin/dashboard`,
    }
    // For form posts, redirect to the appropriate dashboard
    // Use NEXT_PUBLIC_SITE_URL in production to avoid localhost issues
    let redirectOrigin = req.nextUrl.origin;
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SITE_URL) {
      redirectOrigin = process.env.NEXT_PUBLIC_SITE_URL;
    }
    
    const res = isFormPost
      ? NextResponse.redirect(new URL(pathByRole[role], redirectOrigin))
      : NextResponse.json({ ok: true, userId: data.user.id, role, name })
    res.cookies.set(APP_SESSION_COOKIE, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: APP_SESSION_TTL_SECONDS,
    })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
