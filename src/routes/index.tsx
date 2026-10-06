import { useCallback, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowDown, ImagePlus } from 'lucide-react'
import { getFeed } from '@/server/feed.functions'
import type { FeedPost, MediaItem } from '@/lib/types'
import { MemoryOrbit } from '@/components/MemoryOrbit'
import { PostCard } from '@/components/PostCard'
import { Lightbox } from '@/components/Lightbox'
import { Reveal } from '@/components/Reveal'
import { DiscordSection, FloatingJoin, useDiscordStats } from '@/components/Discord'

export const Route = createFileRoute('/')({
  loader: () => getFeed(),
  component: Home,
})

function Home() {
  const posts = Route.useLoaderData()
  const { me } = Route.useRouteContext()
  const discord = useDiscordStats()
  const [viewing, setViewing] = useState<{ post: FeedPost; initialIndex?: number } | null>(null)
  const close = useCallback(() => setViewing(null), [])
  // For MemoryOrbit, use all image keys from mediaKeys
  const imageKeys = posts.flatMap((p: FeedPost) =>
    p.mediaKeys?.filter((m: MediaItem) => m.type === 'image').map((m: MediaItem) => m.key) ?? (p.imageKey ? [p.imageKey] : [])
  )

  return (
    <main>
      <section className="relative flex h-[100svh] min-h-[560px] items-end overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,91,55,0.16),transparent_60%)]" />
        <MemoryOrbit imageKeys={imageKeys} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/70 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8 sm:pb-20">
          <p className="rise font-display text-[11px] tracking-[0.45em] text-ember">
            DISCORD SERVER · MEMORY ARCHIVE
          </p>
          <h1
            className="rise mt-4 font-display text-[clamp(3rem,11vw,9.5rem)] leading-[0.88] font-extrabold tracking-tight"
            style={{ animationDelay: '120ms' }}
          >
            CRN
            <br />
            <span className="text-transparent [-webkit-text-stroke:1.5px_var(--color-paper)]">
              SOCIETY
            </span>
          </h1>
          <div
            className="rise mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
            style={{ animationDelay: '240ms' }}
          >
            <p className="max-w-md text-base leading-relaxed text-paper/70 sm:text-lg">
              Every late-night call, every inside joke, every screenshot worth keeping — pinned
              here so the crew never forgets.
            </p>
            <a
              href="#memories"
              className="group flex items-center gap-3 text-sm font-semibold text-paper/80 hover:text-paper"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line transition group-hover:border-ember group-hover:bg-ember group-hover:text-ink">
                <ArrowDown size={18} />
              </span>
              {posts.length} {posts.length === 1 ? 'memory' : 'memories'}
            </a>
          </div>
        </div>
      </section>

      <Reveal>
        <DiscordSection stats={discord} />
      </Reveal>

      <section id="memories" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-16 pb-28 sm:px-8">
        <Reveal>
          <div className="mb-10 flex items-end justify-between gap-4 border-b border-line pb-6">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">The timeline</h2>
            {me && (
              <Link to="/dashboard" search={{ tab: 'new' }} className="btn-primary">
                <ImagePlus size={16} /> New post
              </Link>
            )}
          </div>
        </Reveal>

        {posts.length === 0 ? (
          <Reveal>
            <div className="flex flex-col items-center rounded-[28px] border border-dashed border-line px-6 py-24 text-center">
              <div className="mb-6 h-16 w-16 rotate-12 rounded-2xl border border-ember/50 bg-ember/10 [transform:perspective(400px)_rotateX(20deg)_rotateZ(12deg)]" />
              <h3 className="font-display text-xl">No memories yet</h3>
              <p className="mt-2 max-w-sm text-mute">
                The first picture and story will appear here as soon as the admin or a member
                posts it.
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="columns-1 gap-6 md:columns-2 lg:columns-3">
            {posts.map((post: FeedPost, i: number) => (
              <PostCard key={post.id} post={post} index={i} onOpenMedia={(p, idx) => setViewing({ post: p, initialIndex: idx })} />
            ))}
          </div>
        )}
      </section>

      <Reveal>
        <footer className="border-t border-line pt-10 pb-28 text-center text-xs tracking-[0.3em] text-mute">
          CRN SOCIETY · EST. ON FACEBOOK
        </footer>
      </Reveal>

      <FloatingJoin stats={discord} />

      {viewing && <Lightbox post={viewing.post} onClose={close} />}
    </main>
  )
}
