import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { PenLine, Settings, Sparkles, Users } from 'lucide-react'
import { z } from 'zod'
import type { Me } from '@/lib/types'
import { PostForm } from '@/components/dashboard/PostForm'
import { ManagePosts } from '@/components/dashboard/ManagePosts'
import { Members } from '@/components/dashboard/Members'
import { Account } from '@/components/dashboard/Account'

const search = z.object({
  tab: z.enum(['new', 'posts', 'members', 'account']).catch('posts'),
})

export const Route = createFileRoute('/dashboard')({
  validateSearch: search,
  beforeLoad: ({ context }) => {
    if (!context.me) throw redirect({ to: '/login' })
    return { me: context.me as Me }
  },
  head: () => ({ meta: [{ title: 'Dashboard · CRN SOCIETY' }] }),
  component: Dashboard,
})

function Dashboard() {
  const { me } = Route.useRouteContext()
  const { tab: requested } = Route.useSearch()
  const navigate = useNavigate()
  const isAdmin = me.role === 'admin'
  const tab = requested === 'members' && !isAdmin ? 'posts' : requested

  type Tab = z.infer<typeof search>['tab']
  const tabs: { id: Tab; label: string; icon: typeof PenLine }[] = [
    { id: 'new', label: 'New post', icon: PenLine },
    { id: 'posts', label: isAdmin ? 'All posts' : 'My posts', icon: Sparkles },
    ...(isAdmin ? [{ id: 'members' as const, label: 'Members', icon: Users }] : []),
    { id: 'account', label: 'Account', icon: Settings },
  ]

  const headings: Record<Tab, [string, string]> = {
    new: ['Share a memory', 'Upload a picture and tell the story behind it.'],
    posts: [
      isAdmin ? 'Manage posts' : 'Your posts',
      isAdmin
        ? 'Edit, delete or move any post to a different date and time.'
        : 'Edit or delete the memories you shared.',
    ],
    members: ['Members', 'Everyone who can log in and post.'],
    account: ['Your account', isAdmin ? 'Change your profile, login email and password.' : 'Change your profile and password.'],
  }

  return (
    <main className="mx-auto max-w-5xl px-5 pt-28 pb-24 sm:px-8">
      <p className="font-display text-[11px] tracking-[0.4em] text-ember">
        {isAdmin ? 'ADMIN PANEL' : 'MEMBER PANEL'}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{headings[tab][0]}</h1>
      <p className="mt-2 text-mute">{headings[tab][1]}</p>

      <nav className="mt-8 flex gap-2 overflow-x-auto border-b border-line pb-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            to="/dashboard"
            search={{ tab: id }}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === id ? 'bg-paper text-ink' : 'text-paper/70 hover:bg-white/5 hover:text-paper'
            }`}
          >
            <Icon size={15} /> {label}
          </Link>
        ))}
      </nav>

      <div className="mt-8" key={tab}>
        {tab === 'new' && (
          <div className="max-w-xl">
            <PostForm
              isAdmin={isAdmin}
              onSaved={() => navigate({ to: '/', hash: 'memories' })}
            />
          </div>
        )}
        {tab === 'posts' && <ManagePosts me={me} />}
        {tab === 'members' && isAdmin && <Members me={me} />}
        {tab === 'account' && <Account me={me} />}
      </div>
    </main>
  )
}
