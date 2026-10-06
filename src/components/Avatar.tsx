import { useState } from 'react'
import { imageUrl } from '@/lib/client'

export function Avatar({
  name,
  avatarKey,
  size = 40,
}: {
  name: string
  avatarKey: string | null
  size?: number
}) {
  const [failed, setFailed] = useState(false)
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
      {avatarKey && !failed ? (
        <img
          src={imageUrl(avatarKey, size * 2)}
          onError={() => setFailed(true)}
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
