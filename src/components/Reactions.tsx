import { useState } from 'react'
import { REACTIONS, type FeedPost, type ReactionKind } from '@/lib/types'
import { toggleReaction } from '@/server/feed.functions'

export function Reactions({ post }: { post: FeedPost }) {
  const [counts, setCounts] = useState(post.counts)
  const [mine, setMine] = useState<ReactionKind[]>(post.mine)
  const [popped, setPopped] = useState<ReactionKind | null>(null)

  async function react(kind: ReactionKind) {
    const wasActive = mine.includes(kind)
    // Optimistic update, reconciled with the server count.
    setMine((m) => (wasActive ? m.filter((k) => k !== kind) : [...m, kind]))
    setCounts((c) => ({ ...c, [kind]: Math.max(0, c[kind] + (wasActive ? -1 : 1)) }))
    if (!wasActive) setPopped(kind)
    try {
      const res = await toggleReaction({ data: { postId: post.id, kind } })
      setCounts((c) => ({ ...c, [kind]: res.count }))
      setMine((m) => {
        const without = m.filter((k) => k !== kind)
        return res.active ? [...without, kind] : without
      })
    } catch {
      setMine((m) => (wasActive ? [...m, kind] : m.filter((k) => k !== kind)))
      setCounts((c) => ({ ...c, [kind]: Math.max(0, c[kind] + (wasActive ? 1 : -1)) }))
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {REACTIONS.map(({ kind, emoji, label }) => {
        const active = mine.includes(kind)
        return (
          <button
            key={kind}
            onClick={() => react(kind)}
            aria-pressed={active}
            aria-label={`${label} (${counts[kind]})`}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
              active
                ? 'border-ember/60 bg-ember/15 text-paper'
                : 'border-line bg-white/[0.03] text-paper/70 hover:border-paper/25 hover:text-paper'
            }`}
          >
            <span
              className={popped === kind ? 'pop inline-block' : 'inline-block'}
              onAnimationEnd={() => setPopped(null)}
            >
              {emoji}
            </span>
            <span className="tabular-nums">{counts[kind]}</span>
          </button>
        )
      })}
    </div>
  )
}
