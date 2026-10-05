import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { login } from '@/server/auth.functions'
import { errorMessage } from '@/lib/client'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.me) throw redirect({ to: '/dashboard', search: { tab: 'posts' } })
  },
  head: () => ({ meta: [{ title: 'Member login · CRN SOCIETY' }] }),
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login({ data: { email, password } })
      await router.invalidate()
      await router.navigate({ to: '/dashboard', search: { tab: 'posts' } })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-5 py-28">
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember/10 blur-[120px]" />
      <div className="rise relative w-full max-w-md [perspective:1200px]">
        <form
          onSubmit={onSubmit}
          className="rounded-[32px] border border-line bg-ink-2/80 p-8 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl [transform:rotateX(4deg)] sm:p-10"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ember/40 bg-ember/10 text-ember">
            <LockKeyhole size={20} />
          </span>
          <h1 className="mt-6 font-display text-2xl font-semibold">Member login</h1>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            Accounts are created by the admin. Ask them for access if you want to post.
          </p>

          <label className="mt-8 block text-sm font-medium">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field mt-2"
              placeholder="you@example.com"
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field mt-2"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember-soft">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full py-3.5">
            {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </main>
  )
}
