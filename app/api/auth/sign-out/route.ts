import { NextRequest, NextResponse } from 'next/server'
import redis from '@/utils/redis/redis'
import { verifyAppJwt } from '@/utils/auth/jwt'

const APP_SESSION_COOKIE = 'app_session'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(APP_SESSION_COOKIE)?.value
    if (!token) {
      // idempotent
      const res = NextResponse.json({ ok: true })
      res.cookies.delete(APP_SESSION_COOKIE)
      return res
    }

    let jti: string | undefined
    try {
      const payload = await verifyAppJwt(token)
      jti = payload.jti as string | undefined
    } catch {
      // malformed/expired token, still try to delete cookie
    }

    if (jti) {
      await redis.del(`session:${jti}`)
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.delete(APP_SESSION_COOKIE)
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
