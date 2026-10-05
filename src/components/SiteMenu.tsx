import { useEffect, useState } from 'react'
import { Link, useRouteContext, useRouter, useRouterState } from '@tanstack/react-router'
import { LogIn, LogOut, PenLine, Settings, Users, LayoutGrid, Sparkles, X } from 'lucide-react'
import { logout } from '@/server/auth.functions'
import { Avatar } from './Avatar'
import { CrnLogo } from './CrnLogo'

export function SiteMenu() {
  const { me } = useRouteContext({ from: '__root__' })
  const router = useRouter()
  const location = useRouterState({ select: (s) => s.location.href })
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [location])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function handleLogout() {
    await logout()
    await router.invalidate()
    router.navigate({ to: '/' })
  }

  const item =
    'group flex items-center gap-4 rounded-2xl px-4 py-3.5 text-lg text-paper/80 transition hover:bg-white/5 hover:text-paper'

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-5 sm:px-8">
        <Link
          to="/"
          aria-label="CRN SOCIETY home"
          className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-ink/50 py-1.5 pr-5 pl-1.5 backdrop-blur-md"
        >
          <CrnLogo className="h-9 w-9" />
          <span className="font-display text-[13px] leading-none font-extrabold tracking-[0.18em] sm:text-sm">
            <span className="text-chrome">CRN</span>{' '}
            <span className="text-white/90 [text-shadow:0_0_10px_rgba(255,255,255,0.45)]">SOCIETY</span>
          </span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="pointer-events-auto group flex h-12 w-12 flex-col items-center justify-center gap-[5px] rounded-full border border-white/70 bg-ink/60 shadow-[0_0_12px_rgba(255,255,255,0.3)] backdrop-blur-md transition hover:border-white hover:shadow-[0_0_18px_rgba(255,255,255,0.55)]"
        >
          <span className="h-[2px] w-5 rounded bg-paper transition group-hover:w-6 group-hover:bg-ember" />
          <span className="h-[2px] w-5 rounded bg-paper transition group-hover:bg-ember" />
          <span className="h-[2px] w-5 rounded bg-paper transition group-hover:w-3 group-hover:bg-ember" />
        </button>
      </header>

      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-line bg-ink-2/95 p-6 backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between">
          <span className="font-display text-xs tracking-[0.3em] text-mute">MENU</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line transition hover:rotate-90 hover:border-ember/60"
          >
            <X size={18} />
          </button>
        </div>

        {me && (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-line bg-ink-3/60 p-4">
            <Avatar name={me.name} avatarKey={me.avatarKey} size={44} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{me.name}</p>
              <p className="text-xs uppercase tracking-widest text-ember">{me.role}</p>
            </div>
          </div>
        )}

        <nav className="mt-6 flex flex-col gap-1">
          <Link to="/" className={item}>
            <LayoutGrid size={20} className="text-mute group-hover:text-ember" /> Memories
          </Link>
          {me ? (
            <>
              <Link to="/dashboard" search={{ tab: 'new' }} className={item}>
                <PenLine size={20} className="text-mute group-hover:text-ember" /> New post
              </Link>
              <Link to="/dashboard" search={{ tab: 'posts' }} className={item}>
                <Sparkles size={20} className="text-mute group-hover:text-ember" />
                {me.role === 'admin' ? 'Manage posts' : 'My posts'}
              </Link>
              {me.role === 'admin' && (
                <Link to="/dashboard" search={{ tab: 'members' }} className={item}>
                  <Users size={20} className="text-mute group-hover:text-ember" /> Members
                </Link>
              )}
              <Link to="/dashboard" search={{ tab: 'account' }} className={item}>
                <Settings size={20} className="text-mute group-hover:text-ember" /> Account
              </Link>
              <button onClick={handleLogout} className={`${item} text-left`}>
                <LogOut size={20} className="text-mute group-hover:text-ember" /> Log out
              </button>
            </>
          ) : (
            <Link to="/login" className={item}>
              <LogIn size={20} className="text-mute group-hover:text-ember" /> Member login
            </Link>
          )}
        </nav>

        <div className="mt-auto border-t border-line pt-6 text-sm leading-relaxed text-mute">
          <p className="font-display text-paper">CRN SOCIETY</p>
          <p className="mt-2">
            Pictures and stories from our Discord server. Everyone can react — only invited
            members can post.
          </p>
        </div>
      </aside>
    </>
  )
}
