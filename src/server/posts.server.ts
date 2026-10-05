import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../db/index.server.js'
import { posts, reactions, users } from '../../db/schema.js'
import type { FeedPost, ReactionKind } from '@/lib/types'

export async function loadPosts(opts: {
  visitorId: string | null
  authorId?: number
  postId?: number
  limit?: number
}) {
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      story: posts.story,
      imageKey: posts.imageKey,
      postedAt: posts.postedAt,
      authorId: users.id,
      authorName: users.name,
      authorRole: users.role,
      authorAvatar: users.avatarKey,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(
      and(
        opts.authorId ? eq(posts.authorId, opts.authorId) : undefined,
        opts.postId ? eq(posts.id, opts.postId) : undefined,
      ),
    )
    .orderBy(desc(posts.postedAt), desc(posts.id))
    .limit(opts.limit ?? 300)

  const ids = rows.map((r) => r.id)
  const counts = ids.length
    ? await db
        .select({
          postId: reactions.postId,
          kind: reactions.kind,
          count: sql<number>`count(*)`,
        })
        .from(reactions)
        .where(inArray(reactions.postId, ids))
        .groupBy(reactions.postId, reactions.kind)
    : []
  const mine =
    ids.length && opts.visitorId
      ? await db
          .select({ postId: reactions.postId, kind: reactions.kind })
          .from(reactions)
          .where(and(inArray(reactions.postId, ids), eq(reactions.visitorId, opts.visitorId)))
      : []

  return rows.map<FeedPost>((r) => ({
    id: r.id,
    title: r.title,
    story: r.story,
    imageKey: r.imageKey,
    postedAt: r.postedAt.toISOString(),
    author: {
      id: r.authorId,
      name: r.authorName,
      role: r.authorRole === 'admin' ? 'admin' : 'member',
      avatarKey: r.authorAvatar,
    },
    counts: {
      love: counts.find((c) => c.postId === r.id && c.kind === 'love')?.count ?? 0,
      like: counts.find((c) => c.postId === r.id && c.kind === 'like')?.count ?? 0,
      laugh: counts.find((c) => c.postId === r.id && c.kind === 'laugh')?.count ?? 0,
    },
    mine: mine.filter((m) => m.postId === r.id).map((m) => m.kind as ReactionKind),
  }))
}
