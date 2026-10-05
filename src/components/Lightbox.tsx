import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import type { FeedPost } from '@/lib/types'
import { imageUrl } from '@/lib/client'
import { LocalTime } from './LocalTime'
import { ShareButton } from './ShareButton'

export function Lightbox({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!post.imageKey) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink/60"
      >
        <X size={18} />
      </button>
      <img
        src={imageUrl(post.imageKey, 1800)}
        alt={post.title}
        className="rise max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="mt-4 text-center">
        {post.title && <p className="font-display">{post.title}</p>}
        <p className="text-sm text-mute">
          {post.author.name} · <LocalTime iso={post.postedAt} />
        </p>
        <div className="mt-4 flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
          <Link
            to="/post/$postId"
            params={{ postId: String(post.id) }}
            className="btn-ghost px-3 py-1.5 text-xs"
            onClick={onClose}
          >
            Open post
          </Link>
          <ShareButton postId={post.id} title={post.title} />
        </div>
      </div>
    </div>
  )
}
