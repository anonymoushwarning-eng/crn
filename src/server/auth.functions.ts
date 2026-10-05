import { createServerFn } from '@tanstack/react-start'
import { and, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/index.server.js'
import { users } from '../../db/schema.js'
import {
  currentUser,
  endSession,
  ensureDefaultAdmin,
  hashPassword,
  requireUser,
  startSession,
  verifyPassword,
} from './auth.server'
import { deleteImage } from './images.server'
import type { Me } from '@/lib/types'

export const getMe = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Me | null> => currentUser(),
)

export const login = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.string().trim().toLowerCase(), password: z.string() }))
  .handler(async ({ data }) => {
    await ensureDefaultAdmin()
    const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1)
    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      throw new Error('That email and password do not match.')
    }
    await startSession(user.id)
    return { ok: true }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  await endSession()
  return { ok: true }
})

export const updateAccount = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().trim().min(1).max(60),
      email: z.string().trim().toLowerCase().email().optional(),
      avatarKey: z.union([z.string().uuid(), z.string().url()]).nullable().optional(),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8).max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const me = await requireUser()
    const [row] = await db.select().from(users).where(eq(users.id, me.id))
    const changes: Partial<typeof users.$inferInsert> = { name: data.name }

    const emailChanged = data.email && data.email !== row.email
    if (emailChanged && me.role !== 'admin') {
      throw new Error('Ask the admin to change your email.')
    }
    if (emailChanged || data.newPassword) {
      if (!data.currentPassword || !(await verifyPassword(data.currentPassword, row.passwordHash))) {
        throw new Error('Your current password is incorrect.')
      }
    }
    if (emailChanged) {
      const [taken] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, data.email!), ne(users.id, me.id)))
      if (taken) throw new Error('Another account already uses that email.')
      changes.email = data.email
    }
    if (data.newPassword) changes.passwordHash = await hashPassword(data.newPassword)
    if (data.avatarKey !== undefined && data.avatarKey !== row.avatarKey) {
      changes.avatarKey = data.avatarKey
      await deleteImage(row.avatarKey)
    }

    await db.update(users).set(changes).where(eq(users.id, me.id))
    return { ok: true }
  })
