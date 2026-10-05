import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { dataDir } from '../src/server/dataDir.server.js'
import * as schema from './schema.js'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'

// The schema DDL is kept as discrete statements so it can run on either the
// local node:sqlite driver (exec) or a remote Turso database (batch).
const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    avatar_key TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    story TEXT NOT NULL DEFAULT '',
    image_key TEXT,
    posted_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE INDEX IF NOT EXISTS posts_posted_at_idx ON posts(posted_at)`,
  `CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS reactions_unique_idx ON reactions(post_id, kind, visitor_id)`,
  `CREATE INDEX IF NOT EXISTS reactions_post_idx ON reactions(post_id)`,
]

// Deployed sites (Vercel) have no shared disk, so they talk to a hosted Turso
// database. Set TURSO_AUTH_TOKEN (and optionally TURSO_DATABASE_URL) to enable
// it; otherwise the app uses the local data/crn.db file exactly as before.
const DEFAULT_TURSO_URL = 'libsql://crn-anonymoushwarning-eng.aws-ap-south-1.turso.io'
const tursoUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? DEFAULT_TURSO_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN
const useTurso = Boolean(tursoToken)

async function createDb(): Promise<LibSQLDatabase<typeof schema>> {
  if (useTurso) {
    const [{ createClient }, { drizzle }] = await Promise.all([
      import('@libsql/client/web'),
      import('drizzle-orm/libsql/web'),
    ])
    const client = createClient({ url: tursoUrl, authToken: tursoToken })
    try {
      await client.batch(DDL, 'write')
    } catch (error) {
      // Two cold starts can race to create the schema; if it already exists we're fine.
      const check = await client.execute(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'posts'`,
      )
      if (check.rows.length === 0) throw error
    }
    return drizzle({ client, schema }) as LibSQLDatabase<typeof schema>
  }

  if (process.env.VERCEL) {
    console.warn(
      '[crn] TURSO_AUTH_TOKEN is not set — falling back to an ephemeral /tmp database on Vercel. Data will not persist.',
    )
  }
  const [{ DatabaseSync }, { drizzle }] = await Promise.all([
    import('node:sqlite'),
    import('drizzle-orm/node-sqlite'),
  ])
  const DB_PATH = process.env.DB_PATH ?? join(dataDir(), 'crn.db')
  mkdirSync(dirname(DB_PATH), { recursive: true })
  const sqlite = new DatabaseSync(DB_PATH)
  sqlite.exec('PRAGMA foreign_keys = ON')
  sqlite.exec(DDL.join(';\n'))
  return drizzle({ client: sqlite, schema }) as unknown as LibSQLDatabase<typeof schema>
}

// Top-level await keeps every caller's `db` import synchronous and driver-agnostic.
export const db = await createDb()
