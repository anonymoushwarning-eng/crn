import { useState } from 'react'
import { imageUrl, rawImageUrl } from '@/lib/client'

export function Avatar({
  name,
  avatarKey,
  size = 40,
}: {
  name: string
  avatarKey: string | null
  size?: number
}) {
  const [fallback, setFallback] = useState(false)
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-ember to-[#7a1d0c] font-display text-ink ring-2 ring-ink ring-offset-2 ring-offset-ember/40"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {avatarKey ? (
        <img
          src={fallback ? rawImageUrl(avatarKey) : imageUrl(avatarKey, size * 2)}
          onError={() => setFallback(true)}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        initials || '?'
      )}
    </span>
  )
}
