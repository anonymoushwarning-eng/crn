import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { and, eq, gt, sql } from 'drizzle-orm'
import { getCookie, getRequestProtocol, setCookie } from '@tanstack/react-start/server'
import { db } from '../../db/index.server.js'
import { sessions, users } from '../../db/schema.js'

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

export const SESSION_COOKIE = 'crn_session'
export const VISITOR_COOKIE = 'crn_visitor'
const SESSION_DAYS = 30

/** Only mark cookies Secure on real HTTPS requests. Hardcoding it silently
 *  breaks login on plain-HTTP self-hosted origins (e.g. a LAN IP), because the
 *  browser then refuses to store the session cookie. */
function cookieSecure() {
  try {
    return getRequestProtocol({ xForwardedProto: true }) === 'https'
  } catch {
    return false
  }
}

// Seeded on first login when no admin exists yet. Only the scrypt hash of the
// default password is stored here; change it from Dashboard → Account.
const DEFAULT_ADMIN_EMAIL = 'eftiislam45@gmail.com'
const DEFAULT_ADMIN_PASSWORD_HASH =
  'scrypt$4944e93a30186d5c0b9a72046f29551b$887eedb7ab8635833e18e81dbe0e53d5cac86384c33e15ab905a744f1d862d530207f293654e66bcec09278586adb033d78d98578d752c809363757140080b63'

export type SessionUser = {
  id: number
  email: string
  name: string
  role: 'admin' | 'member'
  avatarKey: string | null
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [algo, saltHex, hashHex] = stored.split('$')
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

export async function ensureDefaultAdmin() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, 'admin'))
  if (count > 0) return
  await db
    .insert(users)
    .values({
      email: DEFAULT_ADMIN_EMAIL,
      name: 'CRN Admin',
      passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
      role: 'admin',
    })
    .onConflictDoNothing()
}

export async function startSession(userId: number) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.insert(sessions).values({ tokenHash: sha256(token), userId, expiresAt })
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function endSession() {
  const token = getCookie(SESSION_COOKIE)
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)))
  setCookie(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function userFromToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      avatarKey: users.avatarKey,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1)
  return row ? { ...row, role: row.role === 'admin' ? 'admin' : 'member' } : null
}

export function currentUser() {
  return userFromToken(getCookie(SESSION_COOKIE))
}

export async function requireUser() {
  const user = await currentUser()
  if (!user) throw new Error('Please log in first.')
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== 'admin') throw new Error('Only the admin can do that.')
  return user
}

/** Anonymous id so any visitor can react once per reaction type. */
export function visitorId(create: boolean) {
  let id = getCookie(VISITOR_COOKIE)
  if (!id && create) {
    id = randomBytes(16).toString('base64url')
    setCookie(VISITOR_COOKIE, id, {
      httpOnly: true,
      secure: cookieSecure(),
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 2,
    })
  }
  return id ?? null
}

export function parseCookie(header: string | null, name: string) {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return undefined
}
