import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Images, MessageCircle, ShieldCheck, Users } from 'lucide-react'
import { DISCORD_INVITE, getDiscordStats, type DiscordStats } from '@/server/discord.functions'

const numberFormat = new Intl.NumberFormat('en-US')
const fmt = (n: number | null) => (n == null ? '—' : numberFormat.format(n))

/** Live Discord counts, refreshed every minute while the page is open. */
export function useDiscordStats() {
  const [stats, setStats] = useState<DiscordStats | null>(null)
  useEffect(() => {
    let alive = true
    const load = () =>
      getDiscordStats()
        .then((s) => alive && setStats(s))
        .catch(() => {})
    load()
    const timer = window.setInterval(load, 60_000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])
  return stats
}

export function DiscordIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.6 1.25a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1 0-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.8 8.18 1.8 12.07 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1 0 .13c-.6.35-1.22.65-1.87.9a.08.08 0 0 0-.04.1c.36.7.78 1.36 1.22 1.99a.08.08 0 0 0 .09.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42Z" />
    </svg>
  )
}

function OnlineDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
    </span>
  )
}

const perks = [
  {
    icon: MessageCircle,
    title: 'Late-night voice calls',
    text: 'Hop into voice any time — someone from the crew is always around to talk, game or vibe.',
  },
  {
    icon: Images,
    title: 'Memories that stick',
    text: 'The best moments from the server end up right here on the CRN SOCIETY timeline.',
  },
  {
    icon: ShieldCheck,
    title: 'Real community',
    text: 'Less talk, more action. A tight crew with good energy and zero tolerance for drama.',
  },
]

export function DiscordSection({ stats }: { stats: DiscordStats | null }) {
  const [copied, setCopied] = useState(false)

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(DISCORD_INVITE)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copy the invite link:', DISCORD_INVITE)
    }
  }

  return (
    <section id="discord" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-20 sm:px-8">
      <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-gradient-to-br from-ink-3/90 via-ink-2/90 to-ink/90 p-6 shadow-[0_0_40px_rgba(255,255,255,0.05)] sm:p-10">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/[0.06] blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="font-display text-[11px] tracking-[0.45em] text-ember">THE DISCORD SERVER</p>
            <div className="mt-5 flex items-center gap-4">
              {stats?.iconUrl ? (
                <img
                  src={stats.iconUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-2xl border border-white/20 shadow-[0_0_16px_rgba(255,255,255,0.2)]"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-[#5865F2]/20 text-white">
                  <DiscordIcon size={30} />
                </span>
              )}
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                <span className="text-chrome">CRN</span> SOCIETY
              </h2>
            </div>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-paper/70 sm:text-lg">
              {stats?.description ? (
                <span className="italic text-paper/90">“{stats.description}”</span>
              ) : null}{' '}
              Our home base on Discord — where the stories on this page actually happen. Pull up,
              say hi and become part of the next memory.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="btn-primary">
                <DiscordIcon size={18} /> Join the server
              </a>
              <button type="button" onClick={copyInvite} className="btn-ghost">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy invite link'}
              </button>
              <a href="#memories" className="btn-ghost">
                <Images size={16} /> See the memories
              </a>
            </div>
            <p className="mt-4 font-mono text-xs text-mute">discord.gg/crnsociety</p>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/15 bg-ink/60 p-5">
                <div className="flex items-center gap-2 text-xs tracking-[0.2em] text-mute uppercase">
                  <Users size={14} /> Members
                </div>
                <p className="mt-3 font-display text-3xl font-semibold text-white">{fmt(stats?.members ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-ink/60 p-5">
                <div className="flex items-center gap-2 text-xs tracking-[0.2em] text-mute uppercase">
                  <OnlineDot /> Online now
                </div>
                <p className="mt-3 font-display text-3xl font-semibold text-white">{fmt(stats?.online ?? null)}</p>
              </div>
            </div>
            {perks.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-line bg-ink/40 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-mute">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Fixed pill at the bottom of the page linking to the Discord invite with live counts. */
export function FloatingJoin({ stats }: { stats: DiscordStats | null }) {
  // Rendered through a portal so page-transition transforms never turn the
  // wrapper into the containing block for this fixed element.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <a
      href={DISCORD_INVITE}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Join our server on Discord — ${fmt(stats?.members ?? null)} members, ${fmt(stats?.online ?? null)} online`}
      className="neon-pulse fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/90 bg-ink/80 py-2 pr-5 pl-2 text-white backdrop-blur-md transition hover:scale-[1.03] active:scale-[0.98]"
    >
      {stats?.iconUrl ? (
        <img
          src={stats.iconUrl}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-full border border-white/25 object-cover shadow-[0_0_12px_rgba(255,255,255,0.25)]"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5865F2] text-white">
          <DiscordIcon size={20} />
        </span>
      )}
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[13px] font-semibold tracking-wide whitespace-nowrap [text-shadow:0_0_8px_rgba(255,255,255,0.6)]">
          Join our server
        </span>
        <span className="flex items-center gap-3 text-[11px] whitespace-nowrap text-paper/70">
          <span className="flex items-center gap-1">
            <Users size={11} /> {fmt(stats?.members ?? null)} members
          </span>
          <span className="flex items-center gap-1.5">
            <OnlineDot /> {fmt(stats?.online ?? null)} online
          </span>
        </span>
      </span>
    </a>,
    document.body,
  )
}
