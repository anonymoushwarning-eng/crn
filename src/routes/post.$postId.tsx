import { useEffect, useState } from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react'
import { getPost } from '@/server/feed.functions'
import { imageUrl, rawImageUrl } from '@/lib/client'
import { Avatar } from '@/components/Avatar'
import { LocalTime } from '@/components/LocalTime'
import { Reactions } from '@/components/Reactions'
import { ShareButton } from '@/components/ShareButton'
import type { MediaItem } from '@/lib/types'

export const Route = createFileRoute('/post/$postId')({
  loader: async ({ params }) => {
    const id = Number(params.postId)
    if (!Number.isInteger(id) || id <= 0) throw notFound()
    const post = await getPost({ data: { id } })
    if (!post) throw notFound()
    return post
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const title = loaderData.title || `A memory by ${loaderData.author.name}`
    const description =
      loaderData.story.slice(0, 160) ||
      `A memory shared by ${loaderData.author.name} on the CRN SOCIETY timeline.`
    const firstImage =
      loaderData.mediaKeys?.find((m: MediaItem) => m.type === 'image')?.key ?? loaderData.imageKey
    return {
      meta: [
        { title: `${title} · CRN SOCIETY` },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'article' },
        ...(firstImage ? [{ property: 'og:image', content: imageUrl(firstImage, 1200) }] : []),
      ],
    }
  },
  component: PostPage,
  notFoundComponent: MissingPost,
})

function PostPage() {
  const post = Route.useLoaderData()

  // Make the shareable URL absolute for crawlers and the address bar.
  useEffect(() => {
    const url = window.location.href
    const setMeta = (property: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', property)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }
    const firstImage =
      post.mediaKeys?.find((m: MediaItem) => m.type === 'image')?.key ?? post.imageKey
    setMeta('og:url', url)
    if (firstImage) setMeta('og:image', `${window.location.origin}${imageUrl(firstImage, 1200)}`)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url
  }, [post.imageKey, post.mediaKeys])

  const [currentIndex, setCurrentIndex] = useState(0)

  const mediaItems: MediaItem[] = post.mediaKeys?.length
    ? post.mediaKeys
    : post.imageKey
      ? [{ type: 'image', key: post.imageKey, order: 0 }]
      : []

  const total = mediaItems.length
  const safeIndex = Math.min(currentIndex, Math.max(0, total - 1))
  const currentMedia = mediaItems[safeIndex]
  const isVideo = currentMedia?.type === 'video'
  const canGoPrev = safeIndex > 0
  const canGoNext = safeIndex < total - 1
  const hasMultiple = total > 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrentIndex((i) => Math.max(0, i - 1))
      else if (e.key === 'ArrowRight') setCurrentIndex((i) => Math.min(total - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  return (
    <main className="mx-auto max-w-3xl px-5 pt-28 pb-24 sm:px-8">
      <Link
        to="/"
        hash="memories"
        className="inline-flex items-center gap-2 text-sm font-semibold text-paper/70 transition hover:text-paper"
      >
        <ArrowLeft size={16} /> Back to the timeline
      </Link>

      <article className="rise mt-6 overflow-hidden rounded-[28px] border border-line bg-ink-2/85 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <header className="flex items-center gap-3 p-5 pb-4">
          <Avatar name={post.author.name} avatarKey={post.author.avatarKey} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{post.author.name}</p>
            <LocalTime iso={post.postedAt} className="text-xs text-mute" />
          </div>
          <ShareButton postId={post.id} title={post.title} />
        </header>

        {total > 0 && (
          <div className="relative bg-ink-3">
            {isVideo ? (
              <video
                key={currentMedia.key}
                src={rawImageUrl(currentMedia.key)}
                controls
                playsInline
                preload="metadata"
                className="max-h-[70vh] w-full object-contain"
              />
            ) : (
              <img
                key={currentMedia.key}
                src={imageUrl(currentMedia.key, 1600)}
                alt={post.title || `Memory shared by ${post.author.name}`}
                className="max-h-[70vh] w-full object-contain"
              />
            )}

            {hasMultiple && (
              <>
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={!canGoPrev}
                  aria-label="Previous"
                  className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink/70 text-paper transition hover:bg-ember hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
                  disabled={!canGoNext}
                  aria-label="Next"
                  className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink/70 text-paper transition hover:bg-ember hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={22} />
                </button>
                <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-ink/80 px-3.5 py-1 text-xs font-medium text-paper backdrop-blur-sm">
                  {safeIndex + 1} / {total}
                </div>
              </>
            )}
          </div>
        )}

        {/* Thumbnail strip for multiple media */}
        {hasMultiple && (
          <div className="border-t border-line bg-ink-3/50 px-5 py-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {mediaItems.map((item, idx) => (
                <button
                  key={`${item.key}-${idx}`}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-20 sm:w-20 ${
                    idx === safeIndex ? 'border-ember' : 'border-line/40 hover:border-ember/60'
                  }`}
                  aria-label={`Go to media ${idx + 1}`}
                  aria-current={idx === safeIndex ? 'true' : 'false'}
                >
                  {item.type === 'image' ? (
                    <img src={imageUrl(item.key, 200)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <video src={rawImageUrl(item.key)} className="h-full w-full object-cover" muted preload="metadata" />
                  )}
                  {item.type === 'video' && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs text-paper">
                      ▶
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 p-6 sm:p-8">
          {post.title && (
            <h1 className="font-display text-2xl leading-tight font-semibold sm:text-3xl">
              {post.title}
            </h1>
          )}
          {post.story && (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-paper/80 sm:text-base">
              {post.story}
            </p>
          )}
          <div className="border-t border-line pt-5">
            <Reactions post={post} />
          </div>
        </div>
      </article>

      <div className="mt-8 flex justify-center">
        <Link to="/" hash="memories" className="btn-primary">
          <LayoutGrid size={16} /> See every memory
        </Link>
      </div>
    </main>
  )
}

function MissingPost() {
  return (
    <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <div className="mb-6 h-16 w-16 rotate-12 rounded-2xl border border-ember/50 bg-ember/10 [transform:perspective(400px)_rotateX(20deg)_rotateZ(12deg)]" />
      <h1 className="font-display text-2xl font-semibold">This memory is gone</h1>
      <p className="mt-3 text-mute">
        The link may be broken, or the post may have been removed from the timeline.
      </p>
      <Link to="/" className="btn-primary mt-8">
        <ArrowLeft size={16} /> Back to the timeline
      </Link>
    </main>
  )
}