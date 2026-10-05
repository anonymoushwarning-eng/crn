import { useEffect, useState } from 'react'

/** Renders in the visitor's own timezone after hydration (UTC on the server). */
export function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const [tz, setTz] = useState<string | undefined>('UTC')
  useEffect(() => setTz(undefined), [])
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: tz,
  })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {date} · {time}
    </time>
  )
}
