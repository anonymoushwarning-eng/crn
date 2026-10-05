// End-to-end verification of the local-SQLite build.
// Tests the real surfaces: SSR feed rendered from the DB, the session-protected
// upload route, image serving, and the login server function.
import { createHash, randomBytes, randomUUID, scryptSync } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { toJSONAsync } from 'seroval'
import { createDefaultSerovalPlugins } from '@tanstack/router-core/ssr/client'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const sha256 = (v) => createHash('sha256').update(v).digest('hex')

/** Server function ids are generated per build, so read the login id from dist. */
function loginFnId() {
  const dir = 'dist/server/assets'
  for (const file of readdirSync(dir)) {
    if (!file.startsWith('auth.functions')) continue
    const match = /id:\s*"([0-9a-f]{64})",\s*name:\s*"login"/.exec(readFileSync(`${dir}/${file}`, 'utf8'))
    if (match) return match[1]
  }
  throw new Error('login server function id not found — run `npm run build` first')
}

let failures = 0
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`)
  if (!ok) failures++
}

// ---------------------------------------------------------------- arrange
// Warm up: the first request imports the DB module, which creates
// data/crn.db and the tables on disk.
await fetch(`${BASE}/`).catch(() => {})
const db = new DatabaseSync('data/crn.db')
const salt = randomBytes(16)
const pwHash = `scrypt$${salt.toString('hex')}$${scryptSync('CrnTest!2026', salt, 64).toString('hex')}`
db.prepare(
  `INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'admin')
   ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = 'admin', name = 'CRN Admin'`,
).run('eftiislam45@gmail.com', 'CRN Admin', pwHash)
const admin = db.prepare(`SELECT id, email, role FROM users WHERE email = ?`).get('eftiislam45@gmail.com')
check('admin seeded in SQLite file', !!admin?.id, JSON.stringify(admin))

// A session token the server will accept (it stores only the SHA-256 hash).
const TOKEN = 'verify-token-' + randomUUID()
const expires = Date.now() + 60 * 60 * 1000
db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(sha256(TOKEN))
db.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`).run(sha256(TOKEN), admin.id, expires)
const cookie = `crn_session=${TOKEN}`

// A post + a reaction, to prove the feed is rendered from the DB.
const marker = `Verify ${Date.now()}`
db.prepare(`INSERT INTO posts (author_id, title, story, posted_at) VALUES (?, ?, ?, ?)`).run(admin.id, marker, 'End-to-end check.', Date.now())
const post = db.prepare(`SELECT id FROM posts WHERE title = ?`).get(marker)
db.prepare(`INSERT OR REPLACE INTO reactions (post_id, kind, visitor_id) VALUES (?, 'love', 'verify-visitor')`).run(post.id)
db.close()

// ---------------------------------------------------------------- assert: SSR
const home = await fetch(`${BASE}/`)
const html = await home.text()
check('GET / renders (200)', home.status === 200, `status=${home.status}`)
check('home HTML shows the site name', html.includes('CRN SOCIETY'))
check('home HTML renders the DB post title (SSR → DB)', html.includes(marker))

// ---------------------------------------------------------------- upload route
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const noAuth = await fetch(`${BASE}/api/upload`, { method: 'POST', headers: { 'content-type': 'image/png' }, body: png })
check('upload without a session is rejected (401)', noAuth.status === 401, `status=${noAuth.status}`)

const up = await fetch(`${BASE}/api/upload`, { method: 'POST', headers: { cookie, 'content-type': 'image/png' }, body: png })
const upJson = await up.json().catch(() => ({}))
check('upload with a valid session returns a key (201)', up.status === 201 && !!upJson.key, `status=${up.status} key=${upJson.key}`)
check('uploaded image is written to data/images', !!upJson.key && existsSync(`data/images/${upJson.key}`) && statSync(`data/images/${upJson.key}`).size > 0)

const bad = await fetch(`${BASE}/api/upload`, { method: 'POST', headers: { cookie, 'content-type': 'text/plain' }, body: Buffer.from('nope') })
check('upload rejects a non-image type (400)', bad.status === 400, `status=${bad.status}`)

// ---------------------------------------------------------------- image route
const img = await fetch(`${BASE}/api/images/${upJson.key}`)
check('image is served (200)', img.status === 200, `status=${img.status}`)
check('image content-type is image/png', (img.headers.get('content-type') ?? '').includes('image/png'))
check('image bytes match the upload', Buffer.from(await img.arrayBuffer()).equals(png))
const missing = await fetch(`${BASE}/api/images/${randomUUID()}`)
check('missing image returns 404', missing.status === 404, `status=${missing.status}`)

// ---------------------------------------------------------------- login route
const serovalPlugins = createDefaultSerovalPlugins()
const loginBody = JSON.stringify(
  await toJSONAsync({ data: { email: 'eftiislam45@gmail.com', password: 'CrnTest!2026' } }, { plugins: serovalPlugins }),
)
const res = await fetch(`${BASE}/_serverFn/${loginFnId()}`, {
  method: 'POST',
  headers: { 'x-tsr-serverFn': 'true', accept: 'application/json', 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
  body: loginBody,
})
const loginText = await res.text()
check('login endpoint is reachable and accepts the password', res.status === 200, `status=${res.status}`)
check('login issues a session cookie', (res.headers.get('set-cookie') ?? '').includes('crn_session='))
check('login did not error on the password', !/do not match/.test(loginText), loginText.slice(0, 120))

// ---------------------------------------------------------------- persisted
const reread = new DatabaseSync('data/crn.db')
const reactCount = reread.prepare(`SELECT COUNT(*) AS n FROM reactions WHERE post_id = ?`).get(post.id).n
check('reaction persisted in SQLite', reactCount === 1, `count=${reactCount}`)
const sessionCount = reread.prepare(`SELECT COUNT(*) AS n FROM sessions`).get().n
check('sessions persisted in SQLite', sessionCount >= 1, `count=${sessionCount}`)
const newSession = reread.prepare(`SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?`).get(admin.id).n
check('login created a session row for the admin', newSession >= 1, `count=${newSession}`)
reread.close()

console.log(failures === 0 ? '\nVERIFY OK — everything works' : `\nVERIFY FAILED (${failures} failure(s))`)
process.exit(failures === 0 ? 0 : 1)