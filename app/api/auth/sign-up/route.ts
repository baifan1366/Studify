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
    try {
      const body = await req.json()
      email = typeof body.email === 'string' ? body.email : undefined
      password = typeof body.password === 'string' ? body.password : undefined
      fullName = typeof body.fullName === 'string' ? body.fullName : undefined
      locale = typeof body.locale === 'string' ? body.locale : undefined
    } catch {
      const form = await req.formData().catch(() => null)
      if (form) {
        email = String(form.get('email') || '') || undefined
        password = String(form.get('password') || '') || undefined
        fullName = (form.get('fullName') as string) || undefined
        locale = (form.get('locale') as string) || undefined
      }
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const client = await createServerClient()
    const { data, error } = await client.auth.signUp({
      email,
      password,
    })

    if (error || !data.user) {
      // For email confirmation setups, supabase may not return session
      return NextResponse.json({ error: error?.message || 'Sign-up failed' }, { status: 400 })
    }

    // Determine requested role: query param overrides (student|tutor|admin)
    const roleParam = req.nextUrl.searchParams.get('role') as 'student' | 'tutor' | 'admin' | null

    // Create or update profile (handle case where database trigger already created it)
    const profileData = {
      user_id: data.user.id,
      role: roleParam || 'student',
      display_name: fullName || null,
      status: 'active',
      points: 0,
      onboarded: false,
      is_deleted: false
    }

    console.log('Creating/updating profile:', {
      userId: data.user.id,
      profileData,
      timestamp: new Date().toISOString()
    })

    const { error: profileError } = await client
      .from('profiles')
      .upsert(profileData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })

    if (profileError) {
      console.error('Profile upsert error:', {
        error: profileError,
        errorCode: profileError.code,
        errorDetails: profileError.details,
        errorMessage: profileError.message,
        userId: data.user.id,
        profileData,
        role: roleParam || 'student',
        fullName,
        timestamp: new Date().toISOString(),
        requestUrl: req.url,
        userAgent: req.headers.get('user-agent')
      })
      return NextResponse.json({ error: 'Database error saving new user' }, { status: 400 })
    }

    console.log('Profile upsert successful:', {
      userId: data.user.id,
      role: roleParam || 'student',
      displayName: fullName,
      timestamp: new Date().toISOString()
    })

    // fetch role and display name from profiles (default student)
    const { data: profile } = await client
      .from('profiles')
      .select('role, display_name')
      .eq('user_id', data.user.id)
      .single()

    const role = (profile?.role as 'student' | 'tutor' | 'admin') || 'student'
    const name = profile?.display_name || fullName || undefined

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

    const targetLocale = locale || req.cookies.get('next-intl-locale')?.value || 'en'
    const redirectUrl = new URL(`/${targetLocale}/home`, req.nextUrl.origin)
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
