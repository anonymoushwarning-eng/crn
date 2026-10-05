# AGENTS.md

CRN SOCIETY is a public memory timeline for a Discord server with an invite-only admin/member panel.
Built with TanStack Start; runs locally or as a self-hosted Node server, and deploys to Vercel
(Nitro) with durable storage on Turso + Vercel Blob.

## Architecture

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start, React 19, TanStack Router (file routes in `src/routes`) |
| Styling | Tailwind CSS 4 — theme tokens in `src/styles.css` (`ink`, `paper`, `ember`, `mute`, `line`) |
| Data | SQLite + Drizzle ORM (`db/schema.ts`, `db/index.server.ts`): local `node:sqlite` file `data/crn.db`, or hosted Turso when `TURSO_AUTH_TOKEN` is set |
| Files | `data/images/` on disk, or Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set (`src/server/images.server.ts`) |
| 3D | three.js, dynamically imported in `src/components/MemoryOrbit.tsx` and `src/components/ParticleField.tsx` |

## Key directories

- `src/routes/` — `index.tsx` (public feed), `post.$postId.tsx` (public single-memory permalink for sharing),
  `login.tsx`, `dashboard.tsx` (tabs via `?tab=new|posts|members|account`),
  `api/upload.ts` (raw image upload, session-protected), `api/images/$key.ts` (serves images, immutable cache).
- `src/server/*.functions.ts` — `createServerFn` RPC endpoints, safe to import from components.
- `src/server/*.server.ts` — server-only helpers (auth, sessions, image storage, post queries). Never import from client code
  except via `.functions.ts` handlers or server routes.
- `src/components/` — feed UI; `src/components/ParticleField.tsx` is the global three.js background;
  `src/components/dashboard/` — panel UI.
- `src/lib/` — shared types and browser helpers (`imageUrl`, `uploadImage`, datetime-local conversion).

## Non-obvious decisions

- **Custom auth**: there is no sign-up; admins create accounts with email + password. Passwords are
  scrypt-hashed; sessions are random tokens stored as SHA-256 hashes in `sessions`, sent as the httpOnly `crn_session` cookie.
- **Default admin seeding**: `ensureDefaultAdmin()` runs on login and inserts the owner's admin account only when no admin
  exists. Only the password hash is in source.
- **Roles**: `admin` can manage every post, members, and post dates (`postedAt`). `member` can only create/edit/delete
  their own posts and can't change dates or emails. All checks live server-side in `dashboard.functions.ts`.
- **SQLite**: `db/index.server.ts` opens `data/crn.db` with Node's built-in `node:sqlite` and creates
  the tables/indexes on startup, so there is no migration pipeline. Keep that DDL in sync with `db/schema.ts`.
  `node:sqlite` is a Node builtin, so it must never reach the browser bundle — anything touching `db`
  lives in `.server.ts` files or inside `.functions.ts` handlers, never in top-level client imports.
- **Deployment**: Vercel builds with the Nitro Vite plugin (`vite.config.ts` adds it only when
  `VERCEL` is set), which emits the Vercel Build Output API (`.vercel/output`). Locally, `dist/` and
  `serve.mjs` are used instead. Because serverless has no shared disk, production storage is chosen by
  env vars: **Turso** for the database (`TURSO_AUTH_TOKEN`, optional `TURSO_DATABASE_URL`) and
  **Vercel Blob** for images (`BLOB_READ_WRITE_TOKEN`). Without those, it falls back to the ephemeral
  `/tmp` filesystem and warns. Node 24 is required (`.node-version`, `engines`).

## Gotchas

- **Never run `npm run dev` and `npm run start` at the same time.** Both default to port 3000 and
  Vite dev binds `::1` while `serve.mjs` binds `::`, so both can answer silently, serving different
  builds; server-function IDs are per-build and calls then fail ("server function not found"), which
  looks exactly like "saving does nothing". `serve.mjs` refuses to start if the port is busy, and
  `data/crn.db` is a single shared file, so both servers would write to it too.
- **Reactions** are anonymous: an httpOnly `crn_visitor` cookie id, unique per (post, kind, visitor) so each visitor can toggle each reaction once.
- **Dates**: `posts.posted_at` (epoch ms) is what the timeline shows and sorts by. `LocalTime` renders UTC on the server
  and the visitor's timezone after hydration.
- **Images** are downscaled to WebP in the browser before upload and stored under `data/images/<uuid>` with a
  `.meta.json` sidecar for the content type. Replaced/deleted images are removed from disk.
  `imageUrl()` serves the raw route locally; set `VITE_USE_IMAGE_CDN=1` to opt back into a CDN.
- **Discord stats** come from Discord's public invite endpoint (`discord.gg/crnsociety`, no bot token) via
  `src/server/discord.functions.ts`, cached 60s per instance and fetched client-side so slow Discord responses never block SSR.
- Root `beforeLoad` loads the current user (`getMe`) into router context; call `router.invalidate()` after login/logout/account changes.

## Conventions

- Schema changes: edit `db/schema.ts` AND the `CREATE TABLE` block in `db/index.server.ts`, then optionally
  `npx drizzle-kit generate --name <verb_change>`.
- Validate server function input with zod via `.validator(...)` (the older `.inputValidator(...)` is deprecated).
- Keep the visual language: dark ink background, Unbounded display + Manrope body, single ember accent, rounded 28px cards,
  metallic-black body gradient, white neon outline buttons (`btn-primary`/`btn-ghost`), chrome wordmark (`text-chrome`).

