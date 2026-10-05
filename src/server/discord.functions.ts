import { createServerFn } from '@tanstack/react-start'

export const DISCORD_INVITE = 'https://discord.gg/crnsociety'

export type DiscordStats = {
  name: string
  description: string | null
  iconUrl: string | null
  members: number | null
  online: number | null
}

const FALLBACK: DiscordStats = {
  name: 'CRN SOCIETY',
  description: null,
  iconUrl: null,
  members: null,
  online: null,
}

// Short per-instance cache so every page view doesn't hit Discord's rate-limited invite API.
let cached: { at: number; stats: DiscordStats } | null = null
const TTL_MS = 60_000

export const getDiscordStats = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DiscordStats> => {
    if (cached && Date.now() - cached.at < TTL_MS) return cached.stats
    try {
      const res = await fetch('https://discord.com/api/v10/invites/crnsociety?with_counts=true', {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      })
      if (!res.ok) throw new Error(`Discord responded ${res.status}`)
      const data = (await res.json()) as {
        approximate_member_count?: number
        approximate_presence_count?: number
        guild?: { id: string; name: string; description: string | null; icon: string | null }
      }
      const guild = data.guild
      const stats: DiscordStats = {
        name: guild?.name ?? FALLBACK.name,
        description: guild?.description ?? null,
        iconUrl:
          guild?.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128` : null,
        members: data.approximate_member_count ?? null,
        online: data.approximate_presence_count ?? null,
      }
      cached = { at: Date.now(), stats }
      return stats
    } catch {
      return cached?.stats ?? FALLBACK
    }
  },
)
