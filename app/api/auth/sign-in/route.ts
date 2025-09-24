import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/utils/supabase/server'
import redis from '@/utils/redis/redis'
import { signAppJwt, generateJti } from '@/utils/auth/jwt'
import { AccountStorageManager } from '@/utils/auth/account-storage'
import { authenticator } from 'otplib'

const APP_SESSION_COOKIE = 'app_session'
const APP_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export async function POST(req: NextRequest) {
  try {
    let email: string | undefined
    let password: string | undefined
    let locale: string | undefined
    let captchaToken: string | undefined
    let totpCode: string | undefined
    let isBackupCode: boolean = false
    let mode: 'login' | 'add' | 'switch' = 'login'
    try {
      const body = await req.json()
      email = typeof body.email === 'string' ? body.email : undefined
      password = typeof body.password === 'string' ? body.password : undefined
      locale = typeof body.locale === 'string' ? body.locale : undefined
      captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : undefined
      totpCode = typeof body.totpCode === 'string' ? body.totpCode : undefined
      isBackupCode = Boolean(body.isBackupCode)
      mode = body.mode === 'add' || body.mode === 'switch' ? body.mode : 'login'
    } catch {
      const form = await req.formData().catch(() => null)
      if (form) {
        email = String(form.get('email') || '') || undefined
        password = String(form.get('password') || '') || undefined
        locale = (form.get('locale') as string) || undefined
        captchaToken = (form.get('captchaToken') as string) || undefined
        totpCode = String(form.get('totpCode') || '') || undefined
        isBackupCode = Boolean(form.get('isBackupCode'))
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

    // Check if user has MFA enabled
    const adminClient = await createAdminClient()
    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .select('role, display_name, two_factor_enabled, totp_secret, totp_backup_codes')
      .eq('user_id', data.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // If user has MFA enabled but no TOTP code provided, request MFA
    if (profileData.two_factor_enabled && !totpCode) {
      return NextResponse.json({ 
        requiresMFA: true,
        message: 'Two-factor authentication required'
      }, { status: 200 })
    }

    // If MFA is enabled and TOTP code is provided, verify it
    if (profileData.two_factor_enabled && totpCode) {
      let mfaValid = false
      
      if (isBackupCode) {
        // Verify backup code
        const backupCodes = profileData.totp_backup_codes || []
        if (backupCodes.includes(totpCode.toUpperCase())) {
          mfaValid = true
          // Remove used backup code
          const updatedCodes = backupCodes.filter((code: string) => code !== totpCode.toUpperCase())
          await adminClient
            .from('profiles')
            .update({ totp_backup_codes: updatedCodes })
            .eq('user_id', data.user.id)
        }
      } else {
        // Verify TOTP code
        if (profileData.totp_secret) {
          mfaValid = authenticator.check(totpCode, profileData.totp_secret)
        }
      }
      
      if (!mfaValid) {
        return NextResponse.json({ 
          error: 'Invalid verification code',
          requiresMFA: true 
        }, { status: 401 })
      }
    }

    // Use the profile data we already fetched
    const profile = profileData
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
