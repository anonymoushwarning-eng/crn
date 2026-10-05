import { useEffect } from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft, LayoutGrid } from 'lucide-react'
import { getPost } from '@/server/feed.functions'
import { imageUrl } from '@/lib/client'
import { Avatar } from '@/components/Avatar'
import { LocalTime } from '@/components/LocalTime'
import { Reactions } from '@/components/Reactions'
import { ShareButton } from '@/components/ShareButton'

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
    return {
      meta: [
        { title: `${title} · CRN SOCIETY` },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'article' },
        ...(loaderData.imageKey
          ? [{ property: 'og:image', content: imageUrl(loaderData.imageKey, 1200) }]
          : []),
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
    setMeta('og:url', url)
    if (post.imageKey) setMeta('og:image', `${window.location.origin}${imageUrl(post.imageKey, 1200)}`)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url
  }, [post.imageKey])

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

        {post.imageKey && (
          <div className="bg-ink-3">
            <img
              src={imageUrl(post.imageKey, 1600)}
              alt={post.title || `Memory shared by ${post.author.name}`}
              className="w-full object-cover"
            />
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
