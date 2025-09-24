import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/utils/supabase/server'
import redis from '@/utils/redis/redis'
import { signAppJwt, generateJti } from '@/utils/auth/jwt'
import { AccountStorageManager } from '@/utils/auth/account-storage'

const APP_SESSION_COOKIE = 'app_session'
const APP_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export async function POST(req: NextRequest) {
  try {
    let email: string | undefined
    let password: string | undefined
    let locale: string | undefined
    let captchaToken: string | undefined
    let mode: 'login' | 'add' | 'switch' = 'login'
    try {
      const body = await req.json()
      email = typeof body.email === 'string' ? body.email : undefined
      password = typeof body.password === 'string' ? body.password : undefined
      locale = typeof body.locale === 'string' ? body.locale : undefined
      captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : undefined
      mode = body.mode === 'add' || body.mode === 'switch' ? body.mode : 'login'
    } catch {
      const form = await req.formData().catch(() => null)
      if (form) {
        email = String(form.get('email') || '') || undefined
        password = String(form.get('password') || '') || undefined
        locale = (form.get('locale') as string) || undefined
        captchaToken = (form.get('captchaToken') as string) || undefined
        const formMode = form.get('mode') as string
        mode = formMode === 'add' || formMode === 'switch' ? formMode : 'login'
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

    // Store account information for account switcher (if mode is 'add' or successful login)
    if (mode === 'add' || mode === 'login') {
      try {
        // This will be executed client-side via the response
        const accountInfo = {
          id: data.user.id,
          email: data.user.email || '',
          display_name: profile?.display_name || name || undefined,
          avatar_url: data.user.user_metadata?.avatar_url || undefined,
          role: role,
          last_login: new Date().toISOString()
        };
        // Include account info in response for client-side storage
      } catch (storageError) {
        console.warn('Failed to prepare account storage info:', storageError);
      }
    }

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
    
    // Prepare response with account info for client-side storage
    const responseData = {
      ok: true,
      userId: data.user.id,
      role,
      name,
      mode,
      accountInfo: mode === 'add' || mode === 'login' ? {
        id: data.user.id,
        email: data.user.email || '',
        display_name: profile?.display_name || name || undefined,
        avatar_url: data.user.user_metadata?.avatar_url || undefined,
        role: role,
        last_login: new Date().toISOString()
      } : undefined
    };

    const res = isFormPost
      ? NextResponse.redirect(new URL(pathByRole[role], redirectOrigin))
      : NextResponse.json(responseData)
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
