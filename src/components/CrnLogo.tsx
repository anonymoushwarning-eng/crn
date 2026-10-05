import { useId } from 'react'

/** CRN SOCIETY crest: a chrome hexagon with a neon "CRN" monogram. */
export function CrnLogo({ className = 'h-9 w-9' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="CRN SOCIETY logo">
      <defs>
        <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5f5f7" />
          <stop offset="0.45" stopColor="#8a8b92" />
          <stop offset="0.55" stopColor="#d9dadf" />
          <stop offset="1" stopColor="#4a4b52" />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24252b" />
          <stop offset="1" stopColor="#08080a" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M32 3 57 17.5v29L32 61 7 46.5v-29z"
        fill={`url(#${id}-face)`}
        stroke={`url(#${id}-chrome)`}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 9.5 51.5 20.75v22.5L32 54.5 12.5 43.25v-22.5z"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="1"
      />
      <text
        x="32"
        y="37.5"
        textAnchor="middle"
        fontFamily="Unbounded, ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize="15"
        letterSpacing="0.5"
        fill="#ffffff"
        filter={`url(#${id}-glow)`}
      >
        CRN
      </text>
      <rect x="22" y="42" width="20" height="1.6" rx="0.8" fill="#ff5b37" />
    </svg>
  )
}
