import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const now = sql`(unixepoch() * 1000)`

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  // 'admin' | 'member'
  role: text('role').notNull().default('member'),
  avatarKey: text('avatar_key'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
})

export const sessions = sqliteTable(
  'sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tokenHash: text('token_hash').notNull().unique(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
)

export const posts = sqliteTable(
  'posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    story: text('story').notNull().default(''),
    imageKey: text('image_key'),
    // The date/time shown on the post. Admins can change it freely.
    postedAt: integer('posted_at', { mode: 'timestamp_ms' }).notNull().default(now),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (t) => [index('posts_posted_at_idx').on(t.postedAt)],
)

export const reactions = sqliteTable(
  'reactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    // 'love' | 'like' | 'laugh'
    kind: text('kind').notNull(),
    visitorId: text('visitor_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (t) => [
    uniqueIndex('reactions_unique_idx').on(t.postId, t.kind, t.visitorId),
    index('reactions_post_idx').on(t.postId),
  ],
)

