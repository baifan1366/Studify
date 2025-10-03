import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/utils/supabase/server'
import redis from '@/utils/redis/redis'
import { signAppJwt, generateJti } from '@/utils/auth/jwt'

const APP_SESSION_COOKIE = 'app_session'
const APP_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export async function POST(req: NextRequest) {
  try {
    // Accept JSON or form submissions
    let email: string | undefined
    let password: string | undefined
    let fullName: string | undefined
    let locale: string | undefined
    let captchaToken: string | undefined
    try {
      const body = await req.json()
      email = typeof body.email === 'string' ? body.email : undefined
      password = typeof body.password === 'string' ? body.password : undefined
      fullName = typeof body.fullName === 'string' ? body.fullName : undefined
      locale = typeof body.locale === 'string' ? body.locale : undefined
      captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : undefined
    } catch {
      const form = await req.formData().catch(() => null)
      if (form) {
        email = String(form.get('email') || '') || undefined
        password = String(form.get('password') || '') || undefined
        fullName = (form.get('fullName') as string) || undefined
        locale = (form.get('locale') as string) || undefined
        captchaToken = (form.get('captchaToken') as string) || undefined
      }
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const client = await createServerClient()
    
    // Get redirect URL for email confirmation using NEXT_PUBLIC_SITE_URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const targetLocale = locale || req.cookies.get('next-intl-locale')?.value || 'en'
    
    // Determine requested role to set proper redirect after confirmation
    const roleParam = req.nextUrl.searchParams.get('role') as 'student' | 'tutor' | 'admin' | null
    const role = roleParam || 'student'
    
    // Set redirect path based on role
    const roleRedirectPath = role === 'tutor' 
      ? `/${targetLocale}/onboarding/tutor/step1`
      : role === 'admin'
      ? `/${targetLocale}/admin/dashboard`
      : `/${targetLocale}/onboarding/student/step1`
    
    const emailRedirectTo = `${siteUrl}/api/auth/callback?next=${encodeURIComponent(roleRedirectPath)}&type=signup`
    
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        ...(captchaToken ? { captchaToken } : {}),
        emailRedirectTo,
      },
    })

    if (error || !data.user) {
      // For email confirmation setups, supabase may not return session
      return NextResponse.json({ error: error?.message || 'Sign-up failed' }, { status: 400 })
    }

    const name = fullName || data.user.email?.split('@')[0] || undefined

    // Manually create profile since we removed the database trigger
    const { error: profileError } = await client
      .from('profiles')
      .insert({
        user_id: data.user.id,
        role: role,
        full_name: fullName,
        email: data.user.email,
        display_name: fullName || data.user.email?.split('@')[0]
      })
      .select()
      .single()

    if (profileError) {
      console.error('Failed to create profile:', profileError)
      // Don't fail the signup, just log the error
    }

    // If email confirmation is required, Supabase will not create a session
    // In that case, do NOT set cookie; instruct client to show verify-email screen
    if (!data.session) {
      return NextResponse.json({ ok: true, requiresConfirmation: true, userId: data.user.id, role, name })
    }

    // issue app JWT (immediate session case)
    const jti = generateJti()
    const jwt = await signAppJwt({ sub: data.user.id, role, jti, name }, APP_SESSION_TTL_SECONDS)

    // store jti stub in redis
    await redis.set(`session:${jti}`, data.user.id, { ex: APP_SESSION_TTL_SECONDS })

    // Prepare response: redirect for form submissions; JSON for API clients
    const isFormPost = req.headers.get('content-type')?.includes('application/x-www-form-urlencoded') ||
      req.headers.get('content-type')?.includes('multipart/form-data')
    
    // Use NEXT_PUBLIC_SITE_URL in production to avoid localhost issues
    let redirectOrigin = req.nextUrl.origin;
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SITE_URL) {
      redirectOrigin = process.env.NEXT_PUBLIC_SITE_URL;
    }
    
    const redirectUrl = new URL(`/${targetLocale}/home`, redirectOrigin)
    const res = isFormPost
      ? NextResponse.redirect(redirectUrl)
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
