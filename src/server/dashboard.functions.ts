import { createServerFn } from '@tanstack/react-start'
import { and, count, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/index.server.js'
import { posts, sessions, users } from '../../db/schema.js'
import { hashPassword, requireAdmin, requireUser, visitorId } from './auth.server'
import { deleteImage } from './images.server'
import { loadPosts } from './posts.server'
import type { Member, MediaItem } from '@/lib/types'

const isoDate = z.string().datetime({ offset: true })

// A stored image is either a local UUID key or an absolute URL (Vercel Blob).
const imageRef = z.union([z.string().uuid(), z.string().url()]).nullable()

// Media item: { type: 'image'|'video', key: string, order: number, width?, height?, duration? }
const mediaItem = z.object({
  type: z.enum(['image', 'video']),
  key: z.union([z.string().uuid(), z.string().url()]),
  order: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
})

const mediaArray = z.array(mediaItem).max(10).default([])

/** Normalize a stored media column (array, JSON text, or legacy double-encoded text). */
function mediaList(raw: unknown): MediaItem[] {
  let value: unknown = raw
  for (let i = 0; i < 2 && typeof value === 'string'; i++) {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  return Array.isArray(value) ? (value as MediaItem[]) : []
}

/** Admins manage every post; members manage their own. */
export const getManagedPosts = createServerFn({ method: 'GET' }).handler(async () => {
  const me = await requireUser()
  return loadPosts({
    visitorId: visitorId(false),
    authorId: me.role === 'admin' ? undefined : me.id,
  })
})

export const createPost = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      title: z.string().trim().max(140),
      story: z.string().trim().max(10000),
      mediaKeys: mediaArray,
      // Legacy: single imageKey for backward compat
      imageKey: imageRef,
      postedAt: isoDate.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const me = await requireUser()
    // Backward compat: if no mediaKeys but imageKey provided, convert
    const mediaKeys = data.mediaKeys.length > 0
      ? data.mediaKeys
      : data.imageKey
        ? [{ type: 'image' as const, key: data.imageKey, order: 0 }]
        : []
    if (!data.title && !data.story && mediaKeys.length === 0) {
      throw new Error('Add a picture, a video, a title or a story.')
    }
    const [post] = await db
      .insert(posts)
      .values({
        authorId: me.id,
        title: data.title,
        story: data.story,
        mediaKeys,
        // Only the admin may choose a custom date/time.
        postedAt: me.role === 'admin' && data.postedAt ? new Date(data.postedAt) : new Date(),
      })
      .returning({ id: posts.id })
    return post
  })

async function ownedPost(postId: number) {
  const me = await requireUser()
  const [post] = await db.select().from(posts).where(eq(posts.id, postId))
  if (!post) throw new Error('Post not found.')
  if (me.role !== 'admin' && post.authorId !== me.id) {
    throw new Error('You can only change your own posts.')
  }
  return { me, post }
}

export const updatePost = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.number().int(),
      title: z.string().trim().max(140),
      story: z.string().trim().max(10000),
      mediaKeys: mediaArray,
      // Legacy: single imageKey for backward compat
      imageKey: imageRef,
      postedAt: isoDate.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { me, post } = await ownedPost(data.id)
    // Backward compat: if no mediaKeys but imageKey provided, convert
    const mediaKeys = data.mediaKeys.length > 0
      ? data.mediaKeys
      : data.imageKey
        ? [{ type: 'image' as const, key: data.imageKey, order: 0 }]
        : []
    const changes: Partial<typeof posts.$inferInsert> = {
      title: data.title,
      story: data.story,
      mediaKeys,
    }
    if (data.postedAt) {
      if (me.role !== 'admin') throw new Error('Only the admin can change the date and time.')
      changes.postedAt = new Date(data.postedAt)
    }
    await db.update(posts).set(changes).where(eq(posts.id, data.id))
    // Delete old media that is no longer referenced.
    const oldMediaKeys = mediaList(post.mediaKeys)
    const oldKeys = oldMediaKeys.length
      ? oldMediaKeys.map((m) => m.key)
      : post.imageKey
        ? [post.imageKey]
        : []
    const newKeys = mediaKeys.map((m) => m.key)
    const toDelete = oldKeys.filter((k) => !newKeys.includes(k))
    await Promise.all(toDelete.map(deleteImage))
    return { ok: true }
  })

export const deletePost = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const { post } = await ownedPost(data.id)
    await db.delete(posts).where(eq(posts.id, data.id))
    // Delete all media associated with the post.
    const mediaKeys = mediaList(post.mediaKeys)
    const keys = mediaKeys.length ? mediaKeys.map((m) => m.key) : post.imageKey ? [post.imageKey] : []
    await Promise.all(keys.map(deleteImage))
    return { ok: true }
  })

export const listMembers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Member[]> => {
    await requireAdmin()
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        avatarKey: users.avatarKey,
        createdAt: users.createdAt,
        postCount: count(posts.id),
      })
      .from(users)
      .leftJoin(posts, eq(posts.authorId, users.id))
      .groupBy(users.id)
      .orderBy(users.createdAt)
    return rows.map((r) => ({
      ...r,
      role: r.role === 'admin' ? 'admin' : 'member',
      createdAt: r.createdAt.toISOString(),
    }))
  },
)

const memberInput = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['admin', 'member']),
  avatarKey: imageRef,
})

export const createMember = createServerFn({ method: 'POST' })
  .validator(memberInput.extend({ password: z.string().min(8).max(200) }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email))
    if (taken) throw new Error('An account with that email already exists.')
    await db.insert(users).values({
      name: data.name,
      email: data.email,
      role: data.role,
      avatarKey: data.avatarKey,
      passwordHash: await hashPassword(data.password),
    })
    return { ok: true }
  })

export const updateMember = createServerFn({ method: 'POST' })
  .validator(
    memberInput.extend({
      id: z.number().int(),
      password: z.string().min(8).max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    if (data.id === me.id && data.role !== 'admin') {
      throw new Error('You cannot remove your own admin access.')
    }
    const [target] = await db.select().from(users).where(eq(users.id, data.id))
    if (!target) throw new Error('Member not found.')
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, data.email), ne(users.id, data.id)))
    if (taken) throw new Error('Another account already uses that email.')

    const changes: Partial<typeof users.$inferInsert> = {
      name: data.name,
      email: data.email,
      role: data.role,
      avatarKey: data.avatarKey,
    }
    if (data.password) changes.passwordHash = await hashPassword(data.password)
    await db.update(users).set(changes).where(eq(users.id, data.id))
    if (data.password) await db.delete(sessions).where(eq(sessions.userId, data.id))
    if (target.avatarKey !== data.avatarKey) await deleteImage(target.avatarKey)
    return { ok: true }
  })

export const deleteMember = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    if (data.id === me.id) throw new Error('You cannot delete your own account.')
    const [target] = await db.select().from(users).where(eq(users.id, data.id))
    if (!target) throw new Error('Member not found.')
    const theirPosts = await db
      .select({ imageKey: posts.imageKey, mediaKeys: posts.mediaKeys })
      .from(posts)
      .where(eq(posts.authorId, data.id))
    // Posts, sessions and reactions cascade with the user row.
    await db.delete(users).where(eq(users.id, data.id))
    const allKeys = [
      target.avatarKey,
      ...theirPosts.flatMap((p) => {
        const media = mediaList(p.mediaKeys)
        return media.length ? media.map((m) => m.key) : p.imageKey ? [p.imageKey] : []
      }),
    ].filter(Boolean)
    await Promise.all(allKeys.map(deleteImage))
    return { ok: true }
  })
