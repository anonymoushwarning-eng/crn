import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { FeedPost, MediaItem } from '@/lib/types'
import { imageUrl, rawImageUrl } from '@/lib/client'
import { LocalTime } from './LocalTime'
import { ShareButton } from './ShareButton'

export function Lightbox({
  post,
  onClose,
  initialIndex = 0,
}: {
  post: FeedPost
  onClose: () => void
  initialIndex?: number
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const mediaItems: MediaItem[] = post.mediaKeys.length > 0
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

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1))
  const goNext = () => setCurrentIndex((i) => Math.min(total - 1, i + 1))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') setCurrentIndex((i) => Math.max(0, i - 1))
      else if (e.key === 'ArrowRight') setCurrentIndex((i) => Math.min(total - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, total])

  if (total === 0) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Close */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close"
        className="absolute right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink/70 text-paper transition hover:bg-ember hover:text-ink"
      >
        <X size={18} />
      </button>

      {/* Previous / Next */}
      {total > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            disabled={!canGoPrev}
            aria-label="Previous"
            className="absolute left-3 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink/70 text-paper transition hover:bg-ember hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 sm:left-6 sm:h-14 sm:w-14"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            disabled={!canGoNext}
            aria-label="Next"
            className="absolute right-3 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink/70 text-paper transition hover:bg-ember hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 sm:right-6 sm:h-14 sm:w-14"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Media stage — click the empty space to close, the media itself does not close */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-2 pt-16 sm:px-20">
        {isVideo ? (
          <video
            key={currentMedia.key}
            src={rawImageUrl(currentMedia.key)}
            controls
            playsInline
            preload="metadata"
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
          />
        ) : (
          <img
            key={currentMedia.key}
            src={imageUrl(currentMedia.key, 1800)}
            alt={post.title || `Media ${safeIndex + 1} of ${total}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
          />
        )}
      </div>

      {/* Footer: counter, thumbnails, info */}
      <div className="shrink-0 px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        {total > 1 && (
          <p className="mb-2 text-center text-sm font-medium text-paper/70">
            {safeIndex + 1} / {total}
          </p>
        )}

        {total > 1 && (
          <div className="mx-auto mb-3 flex max-w-3xl gap-2 overflow-x-auto pb-1">
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
        )}

        <div className="mx-auto max-w-2xl text-center">
          {post.title && <p className="font-display text-lg">{post.title}</p>}
          <p className="text-sm text-mute">
            {post.author.name} · <LocalTime iso={post.postedAt} />
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
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
    </div>
  )
}