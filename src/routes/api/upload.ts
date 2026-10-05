import { createFileRoute } from '@tanstack/react-router'
import { SESSION_COOKIE, parseCookie, userFromToken } from '@/server/auth.server'
import { saveImage } from '@/server/images.server'

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
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
