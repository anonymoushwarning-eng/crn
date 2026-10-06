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
        // `handleUpload` signs client tokens with a static read-write token.
        // OIDC credentials (BLOB_STORE_ID + VERCEL_OIDC_TOKEN) are not accepted
        // here, so fail with an actionable message instead of a bare 400.
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return Response.json(
            {
              error:
                'Direct uploads are not configured. Add BLOB_READ_WRITE_TOKEN from your Vercel Blob store to this project for all environments, then redeploy.',
            },
            { status: 400 },
          )
        }
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
          console.error('[crn] /api/blob-upload failed:', error)
          return Response.json({ error: (error as Error).message }, { status: 400 })
        }
      },
    },
  },
})
