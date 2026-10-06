import { createFileRoute } from '@tanstack/react-router'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { SESSION_COOKIE, parseCookie, userFromToken } from '@/server/auth.server'
import { MAX_VIDEO_BYTES } from '@/server/images.server'

/**
 * Issues short-lived client tokens so the browser can upload media straight to
 * Vercel Blob. This is what makes large videos possible in production: a
 * serverless function cannot receive a 400 MB request body, but the browser can
 * PUT the file directly to Blob. Used only when Blob is configured.
 */
export const Route = createFileRoute('/api/blob-upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as HandleUploadBody
        try {
          const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async () => {
              const user = await userFromToken(
                parseCookie(request.headers.get('cookie'), SESSION_COOKIE),
              )
              if (!user) throw new Error('Please log in first.')
              return {
                allowedContentTypes: ['image/*', 'video/*'],
                maximumSizeInBytes: MAX_VIDEO_BYTES,
                addRandomSuffix: false,
                cacheControlMaxAge: 31536000,
              }
            },
          })
          return Response.json(jsonResponse)
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 400 })
        }
      },
    },
  },
})
