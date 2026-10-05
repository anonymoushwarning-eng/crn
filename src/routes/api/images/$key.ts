import { createFileRoute } from '@tanstack/react-router'
import { readImage } from '@/server/images.server'

export const Route = createFileRoute('/api/images/$key')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const result = await readImage(params.key)
        if (!result) return new Response('Not found', { status: 404 })
        return new Response(result.data, {
          headers: {
            'Content-Type': String(result.metadata.contentType ?? 'image/jpeg'),
            // Keys are random UUIDs and never reused, so they can be cached forever.
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      },
    },
  },
})
