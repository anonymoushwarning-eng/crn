import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ShieldCheck, Play } from 'lucide-react'
import type { FeedPost, MediaItem } from '@/lib/types'
import { imageUrl, rawImageUrl } from '@/lib/client'
import { Avatar } from './Avatar'
import { LocalTime } from './LocalTime'
import { Reactions } from './Reactions'
import { ShareButton } from './ShareButton'
import { useReveal } from './Reveal'

interface PostCardProps {
  post: FeedPost
  index: number
  onOpenMedia: (post: FeedPost, initialIndex?: number) => void
}

function getMediaItems(post: FeedPost): MediaItem[] {
  if (post.mediaKeys.length > 0) return post.mediaKeys
  if (post.imageKey) return [{ type: 'image' as const, key: post.imageKey, order: 0 }]
  return []
}

export function PostCard({ post, index, onOpenMedia }: PostCardProps) {
  const ref = useRef<HTMLElement>(null)
  const reveal = useReveal<HTMLDivElement>()
  const [expanded, setExpanded] = useState(false)
  const long = post.story.length > 280
  const mediaItems = getMediaItems(post)
  const mediaCount = mediaItems.length

  function onMove(e: React.PointerEvent) {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.transform = `perspective(1100px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 9}deg) translateZ(0)`
    el.style.setProperty('--gx', `${x * 100}%`)
    el.style.setProperty('--gy', `${y * 100}%`)
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = ''
  }

  function tile(item: MediaItem, idx: number, opts: { main?: boolean; more?: number } = {}) {
    const isVideo = item.type === 'video'
    return (
      <button
        key={item.key}
        onClick={(e) => {
          e.stopPropagation()
          onOpenMedia(post, idx)
        }}
        className="relative h-full w-full overflow-hidden bg-ink-3"
        aria-label={isVideo ? `Play video ${idx + 1}` : `View picture ${idx + 1} of ${mediaCount}`}
      >
        {isVideo ? (
          <video src={rawImageUrl(item.key)} className="h-full w-full object-cover" muted preload="metadata" playsInline />
        ) : (
          <img
            src={imageUrl(item.key, opts.main ? 900 : 500)}
            alt={post.title || `Memory ${idx + 1} shared by ${post.author.name}`}
            loading={index < 3 && idx === 0 ? 'eager' : 'lazy'}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
          />
        )}
        {isVideo && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-paper backdrop-blur-sm transition group-hover:scale-110">
              <Play size={22} className="ml-0.5" />
            </span>
          </span>
        )}
        {opts.more ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-bold text-paper">
            +{opts.more}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <div
      ref={reveal.ref}
      className={`${reveal.className} mb-6 break-inside-avoid`}
      style={{ transitionDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      <article
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="tilt group relative overflow-hidden rounded-[28px] border border-line bg-ink-2 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] hover:shadow-[0_40px_80px_-30px_rgba(255,91,55,0.25)]"
      >
        <div className="tilt-glare pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <header className="flex items-center gap-3 p-5 pb-4" style={{ transform: 'translateZ(30px)' }}>
          <Avatar name={post.author.name} avatarKey={post.author.avatarKey} size={40} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-semibold">
              {post.author.name}
              {post.author.role === 'admin' && (
                <ShieldCheck size={15} className="shrink-0 text-ember" aria-label="Admin" />
              )}
            </p>
            <LocalTime iso={post.postedAt} className="text-xs text-mute" />
          </div>
          {mediaCount > 0 && (
            <span className="rounded-full border border-line bg-ink-3/70 px-2.5 py-1 text-[11px] font-semibold text-mute">
              {mediaCount} {mediaCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </header>

        {mediaCount > 0 && (
          <div className="relative">
            {mediaCount === 1 && (
              <div className="aspect-[4/3] w-full overflow-hidden">{tile(mediaItems[0], 0, { main: true })}</div>
            )}

            {mediaCount === 2 && (
              <div className="grid aspect-[2/1] w-full grid-cols-2 grid-rows-1 gap-0.5 overflow-hidden">
                {mediaItems.map((item, i) => (
                  <div key={item.key} className="relative h-full w-full overflow-hidden">
                    {tile(item, i)}
                  </div>
                ))}
              </div>
            )}

            {mediaCount === 3 && (
              <div className="grid aspect-[3/2] w-full grid-cols-3 grid-rows-2 gap-0.5 overflow-hidden">
                <div className="relative col-span-2 row-span-2 overflow-hidden">
                  {tile(mediaItems[0], 0, { main: true })}
                </div>
                <div className="relative col-span-1 row-span-1 overflow-hidden">{tile(mediaItems[1], 1)}</div>
                <div className="relative col-span-1 row-span-1 overflow-hidden">{tile(mediaItems[2], 2)}</div>
              </div>
            )}

            {mediaCount >= 4 && (
              <div className="grid aspect-square w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden">
                {mediaItems.slice(0, 4).map((item, i) => (
                  <div key={item.key} className="relative h-full w-full overflow-hidden">
                    {tile(item, i, { more: i === 3 && mediaCount > 4 ? mediaCount - 4 : undefined })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 p-5" style={{ transform: 'translateZ(20px)' }}>
          {post.title && (
            <Link
              to="/post/$postId"
              params={{ postId: String(post.id) }}
              className="block font-display text-lg leading-snug font-semibold transition hover:text-ember"
            >
              {post.title}
            </Link>
          )}
          {post.story && (
            <p className={`whitespace-pre-line text-[15px] leading-relaxed text-paper/75 ${!expanded && long ? 'line-clamp-5' : ''}`}>
              {post.story}
            </p>
          )}
          {long && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-sm font-semibold text-ember hover:text-ember-soft"
            >
              {expanded ? 'Show less' : 'Read the full story'}
            </button>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <Reactions post={post} />
            <ShareButton postId={post.id} title={post.title} />
          </div>
        </div>
      </article>
    </div>
  )
}