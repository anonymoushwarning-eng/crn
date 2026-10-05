import { useEffect, useRef, useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { postUrl } from '@/lib/client'

/**
 * Shares a memory's public permalink. Uses the native share sheet where the
 * browser has one, otherwise copies the direct link. If even the clipboard is
 * unavailable, falls back to a selectable field so the link is never lost.
 */
export function ShareButton({
  postId,
  title,
  label = 'Share',
  className = '',
}: {
  postId: number
  title?: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!manual) return
    const input = inputRef.current
    if (input) {
      input.focus()
      input.select()
    }
  }, [manual])

  async function onShare() {
    const url = postUrl(postId)
    setManual(false)
    const shareTitle = title?.trim() || 'A memory from CRN SOCIETY'

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareTitle, url })
        return
      } catch (error) {
        // The user dismissed the sheet — don't fall through to a surprise copy.
        if ((error as Error)?.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setManual(true)
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={onShare}
        aria-label="Share this memory"
        className={`btn-ghost px-3 py-1.5 text-xs ${className}`}
      >
        {copied ? <Check size={14} /> : <Share2 size={14} />}
        {copied ? 'Link copied' : label}
      </button>

      {manual && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-line bg-ink-2 p-2 text-left shadow-2xl">
          <input
            ref={inputRef}
            readOnly
            value={postUrl(postId)}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-lg border border-line bg-ink-3 px-2 py-1.5 text-xs text-paper outline-none focus:border-ember/60"
          />
          <p className="mt-1.5 px-1 text-[10px] tracking-wide text-mute">
            Press Ctrl/Cmd + C to copy the link
          </p>
        </div>
      )}
    </div>
  )
}
