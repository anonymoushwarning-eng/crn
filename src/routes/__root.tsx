import { useEffect, useRef } from 'react'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import { getMe } from '@/server/auth.functions'
import { SiteMenu } from '@/components/SiteMenu'
import { MetallicBackground } from '@/components/MetallicBackground'
import { ParticleField } from '@/components/ParticleField'

import '../styles.css'

const siteName = 'CRN SOCIETY'
const siteDescription =
  'The memory archive of the CRN SOCIETY Discord server — pictures and stories from the crew.'

export const Route = createRootRoute({
  beforeLoad: async () => ({ me: await getMe() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: siteName },
      { name: 'description', content: siteDescription },
      { name: 'theme-color', content: '#0b0b0d' },
      { property: 'og:title', content: siteName },
      { property: 'og:description', content: siteDescription },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Unbounded:wght@400;600;800&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <div className="mb-6 h-16 w-16 rotate-12 rounded-2xl border border-ember/50 bg-ember/10 [transform:perspective(400px)_rotateX(20deg)_rotateZ(12deg)]" />
      <p className="font-display text-[11px] tracking-[0.4em] text-ember">404</p>
      <h1 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">Page not found</h1>
      <p className="mt-3 text-mute">
        That page doesn&rsquo;t exist or has moved. The memories are still on the timeline.
      </p>
      <Link to="/" className="btn-primary mt-8">
        Back to the timeline
      </Link>
    </main>
  )
}

function RootLayout() {
  return (
    <>
      {/* Layered back-to-front: metallic shader → particles → UI. */}
      <MetallicBackground />
      <ParticleField />
      {/* Content sits above the fixed background layers. */}
      <div className="relative z-10">
        <SiteMenu />
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    </>
  )
}

/**
 * Replays a smooth "pop up from below" animation each time the route path
 * changes. Keying off the pathname (not the full href) means tab changes that
 * only alter the query string, like the dashboard tabs, don't re-trigger it.
 */
function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const ref = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const animation = el.animate(
      [
        { opacity: 0, transform: 'translateY(30px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 550, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    )
    return () => animation.cancel()
  }, [pathname])

  return <div ref={ref}>{children}</div>
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="grain">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
