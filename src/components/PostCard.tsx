import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'
import type { FeedPost } from '@/lib/types'
import { imageUrl, rawImageUrl } from '@/lib/client'
import { Avatar } from './Avatar'
import { LocalTime } from './LocalTime'
import { Reactions } from './Reactions'
import { ShareButton } from './ShareButton'

export function PostCard({
  post,
  index,
  onOpenImage,
}: {
  post: FeedPost
  index: number
  onOpenImage: (post: FeedPost) => void
}) {
  const ref = useRef<HTMLElement>(null)
  const [imgFallback, setImgFallback] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const long = post.story.length > 280

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

  return (
    <div className="rise mb-6 break-inside-avoid" style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}>
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
        </header>

        {post.imageKey && (
          <button
            onClick={() => onOpenImage(post)}
            className="block w-full overflow-hidden bg-ink-3"
            aria-label="View picture"
          >
            <img
              src={imgFallback ? rawImageUrl(post.imageKey) : imageUrl(post.imageKey, 900)}
              onError={() => setImgFallback(true)}
              alt={post.title || `Memory shared by ${post.author.name}`}
              loading={index < 3 ? 'eager' : 'lazy'}
              className="w-full object-cover transition duration-700 group-hover:scale-[1.03]"
            />
          </button>
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
