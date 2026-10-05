import { createServerFn } from '@tanstack/react-start'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/index.server.js'
import { posts, reactions } from '../../db/schema.js'
import { visitorId } from './auth.server'
import { loadPosts } from './posts.server'

export const getFeed = createServerFn({ method: 'GET' }).handler(async () => {
  return loadPosts({ visitorId: visitorId(false) })
})

/** Public single-post lookup, powering the shareable /post/<id> page. */
export const getPost = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const [post] = await loadPosts({ visitorId: visitorId(false), postId: data.id, limit: 1 })
    return post ?? null
  })

export const toggleReaction = createServerFn({ method: 'POST' })
  .validator(
    z.object({ postId: z.number().int(), kind: z.enum(['love', 'like', 'laugh']) }),
  )
  .handler(async ({ data }) => {
    const visitor = visitorId(true)!
    const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, data.postId))
    if (!post) throw new Error('Post not found.')

    const match = and(
      eq(reactions.postId, data.postId),
      eq(reactions.kind, data.kind),
      eq(reactions.visitorId, visitor),
    )
    const removed = await db.delete(reactions).where(match).returning({ id: reactions.id })
    if (removed.length === 0) {
      await db
        .insert(reactions)
        .values({ postId: data.postId, kind: data.kind, visitorId: visitor })
        .onConflictDoNothing()
    }
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reactions)
      .where(and(eq(reactions.postId, data.postId), eq(reactions.kind, data.kind)))
    return { active: removed.length === 0, count }
  })
