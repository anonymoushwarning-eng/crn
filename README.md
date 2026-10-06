# CRN SOCIETY

A minimalist 3D memory archive for the CRN SOCIETY Discord server. The landing page is a public
timeline of pictures and stories; anyone visiting can react with ❤️ Love, 👍 Like or 😂 Haha.
Only accounts created by the admin can log in and post.

## Features

- **Public timeline** — every post shows the poster's profile photo, name, date and time, its media,
  story, and live reaction counts. Posts with several photos/videos lay them out as a 1/2/3-up or 2×2
  “+N” grid; tap any tile to open a full-screen gallery with next/prev and thumbnails. A three.js hero
  orbits the latest pictures around a glowing core.
- **Shareable memories** — the **Share** button on every card copies (or opens the native share
  sheet for) a public permalink like `/post/12` that anyone can open, no login needed. Single-post
  pages carry their own title and Open Graph tags for rich link previews.
- **Living particle background** — a three.js particle swarm (instanced tumbling tetrahedra) drifts
  behind every page, screen-blended into the ink backdrop and nudged by the scroll position for a
  parallax feel. It pauses when the tab is hidden and is skipped entirely for `prefers-reduced-motion`.
- **Top-right menu** — a three-bar button opens a panel with login, dashboard and account links.
  There is no sign-up; the landing page never shows a login form.
- **Admin panel** (`/dashboard`)
  - New post: upload up to 10 photos and videos (photos are resized in the browser), add a title and
    story, optionally pick a custom date and time. Videos can be any common format up to 400 MB.
  - Manage posts: edit or delete any post, and change any post's date and time inline.
  - Members: add people by email with a password and profile photo, edit them, reset passwords,
    promote to admin, or remove them.
  - Account: change your name, profile photo, login email and password.
- **Members** can post, edit or delete their own posts, and update their name, photo and password.

## Default admin

On the first login attempt, if no admin exists yet, an admin account is created for
`eftiislam45@gmail.com` with the password provided by the owner. Change both from
**Menu → Account** right after the first login.

## Tech

- TanStack Start (React 19, file-based routing, server functions) + Tailwind CSS 4
- **SQLite with Drizzle ORM.** Locally it's a single file (`data/crn.db`) via Node's built-in
  `node:sqlite`; in production it's a hosted **Turso** database (same SQLite dialect). Storage is
  chosen by environment variables, so local development needs no setup and the deployed site is
  durable. Tables are created automatically on first run.
- Uploaded media (photos and videos) lives in `data/images/` locally and in **Vercel Blob** when deployed.
  Photos are downscaled to WebP in the browser; videos upload as-is. Large files upload directly from the
  browser to Blob so the serverless body-size limit never applies.
- three.js — the 3D hero and the particle background

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Everything (accounts, posts, reactions, images) is persisted in
`data/` — you can copy that whole folder to carry your data with you.

## Production

Build and run your own persistent server:

```bash
npm run build
npm run start   # serves on http://localhost:3000 (PORT env to change)
```

The SQLite file remains durable here because the server has a real filesystem.

> Run **either** `npm run dev` **or** `npm run build && npm run start` — not both. Both default to
> port 3000, and if two builds answer on it at once, server-function calls (login, saving posts)
> fail. `serve.mjs` now refuses to start when the port is already serving.

## Deploying on Vercel

Vercel has no persistent disk, so the app stores its data in hosted services instead of files:

| Data | Local development | Vercel |
|------|-------------------|--------|
| Users, sessions, posts, reactions | `data/crn.db` (file) | **Turso** (hosted SQLite) |
| Uploaded media (photos, videos) | `data/images/` (files) | **Vercel Blob** (object store) |

The build target is [Nitro](https://nitro.build)'s official Vercel preset, which emits the Vercel
Build Output API (`.vercel/output`). Vite dev and the local `serve.mjs` are unaffected.

### One-time setup

1. **Turso** — create a database and an auth token:

   ```bash
   turso db create crn
   turso db tokens create crn
   ```

   The database URL is already the default in `db/index.server.ts`; override it with
   `TURSO_DATABASE_URL` if yours differs.

2. **Vercel Blob** — in the Vercel project, open **Storage → Create → Blob** and choose **Public**
   access. Connecting it to the project injects the credentials automatically — either
   `BLOB_READ_WRITE_TOKEN` or OIDC (`BLOB_STORE_ID` + `VERCEL_OIDC_TOKEN`). The app detects either.
   (Large videos need this: they're uploaded straight from the browser to Blob.)

3. **Environment variables** — in **Project → Settings → Environment Variables**, add:

   | Name | Value |
   |------|-------|
   | `TURSO_AUTH_TOKEN` | the token from step 1 |
   | `TURSO_DATABASE_URL` | optional; defaults to the CRN Turso URL |

   See `.env.example`. Only when `TURSO_AUTH_TOKEN` is set does the app use Turso; without it, a
   deploy falls back to the ephemeral `/tmp` filesystem and logs a warning.

Then deploy (Vercel dashboard, or `npx vercel`). The tables are created automatically on the first
request. Node 24 is used (`.node-version` and the `engines` field pin it).

## Database schema changes

After editing `db/schema.ts`, update the matching `CREATE TABLE` statements in
`db/index.server.ts`, then optionally `npx drizzle-kit generate --name <change_name>`. Tables are
auto-created on startup, so an existing database may need a manual `ALTER TABLE ... ADD COLUMN`
for new columns.

