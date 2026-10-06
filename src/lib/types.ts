export const REACTIONS = [
  { kind: 'love', emoji: '❤️', label: 'Love' },
  { kind: 'like', emoji: '👍', label: 'Like' },
  { kind: 'laugh', emoji: '😂', label: 'Haha' },
] as const

export type ReactionKind = (typeof REACTIONS)[number]['kind']

export type Author = {
  id: number
  name: string
  role: 'admin' | 'member'
  avatarKey: string | null
}

export type MediaItem = {
  type: 'image' | 'video'
  key: string
  order: number
  width?: number
  height?: number
  duration?: number
}

export type FeedPost = {
  id: number
  title: string
  story: string
  // Legacy single image key (for backward compatibility)
  imageKey: string | null
  // New: array of media items
  mediaKeys: MediaItem[]
  postedAt: string
  author: Author
  counts: Record<ReactionKind, number>
  mine: ReactionKind[]
}

export type Me = {
  id: number
  email: string
  name: string
  role: 'admin' | 'member'
  avatarKey: string | null
}

export type Member = Me & { createdAt: string; postCount: number }
