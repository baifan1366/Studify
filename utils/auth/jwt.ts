import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

// App JWT payload
export interface AppJwtPayload extends JWTPayload {
  sub: string // user id
  role: 'student' | 'tutor' | 'admin'
  jti: string
  name?: string
}

function getJwtSecret() {
  const secret = process.env.APP_JWT_SECRET
  if (!secret) throw new Error('APP_JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export function generateJti() {
  // Prefer Web Crypto API to be compatible with Edge Runtime
  if (typeof globalThis !== 'undefined' && globalThis.crypto && 'randomUUID' in globalThis.crypto) {
    return (globalThis.crypto as Crypto).randomUUID()
  }
  // Fallback: generate a UUID-like string using getRandomValues
  if (typeof globalThis !== 'undefined' && globalThis.crypto && 'getRandomValues' in globalThis.crypto) {
    const bytes = new Uint8Array(16)
    globalThis.crypto.getRandomValues(bytes)
    // RFC4122 v4 formatting
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const toHex = (n: number) => n.toString(16).padStart(2, '0')
    const hex = Array.from(bytes, toHex).join('')
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`
  }
  // Last resort: timestamp + random
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function signAppJwt(payload: Omit<AppJwtPayload, 'exp'>, expiresInSeconds: number) {
  const secret = getJwtSecret()
  const now = Math.floor(Date.now() / 1000)
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(secret)
}

export async function verifyAppJwt(token: string) {
  const secret = getJwtSecret()
  const { payload } = await jwtVerify<AppJwtPayload>(token, secret, {
    algorithms: ['HS256'],
  })
  return payload
}
