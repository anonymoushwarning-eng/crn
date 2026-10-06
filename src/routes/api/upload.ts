import { createFileRoute } from '@tanstack/react-router'
import { SESSION_COOKIE, parseCookie, userFromToken } from '@/server/auth.server'
import { blobEnabled, clientUploadsEnabled, saveImage } from '@/server/images.server'

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      // Lets the client know whether it should upload large files directly to
      // Vercel Blob (bypassing the serverless ~4.5 MB request-body limit).
      // `clientUpload` is the one that matters for direct browser uploads, since
      // `handleUpload` needs a static read-write token (OIDC alone can't sign
      // client tokens).
      GET: async () =>
        Response.json({ blob: blobEnabled(), clientUpload: clientUploadsEnabled() }),
      POST: async ({ request }) => {
        const user = await userFromToken(
          parseCookie(request.headers.get('cookie'), SESSION_COOKIE),
        )
        if (!user) return Response.json({ error: 'Please log in first.' }, { status: 401 })

        const contentType = (request.headers.get('content-type') ?? '').split(';')[0]
        try {
          const key = await saveImage(await request.arrayBuffer(), contentType)
          return Response.json({ key }, { status: 201 })
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 400 })
        }
      },
    },
  },
})
