import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import type { Me } from '@/lib/types'
import { updateAccount } from '@/server/auth.functions'
import { errorMessage } from '@/lib/client'
import { ImagePicker } from './ImagePicker'

export function Account({ me }: { me: Me }) {
  const router = useRouter()
  const isAdmin = me.role === 'admin'
  const [name, setName] = useState(me.name)
  const [email, setEmail] = useState(me.email)
  const [avatarKey, setAvatarKey] = useState<string | null>(me.avatarKey)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  const needsCurrent = (isAdmin && email.trim().toLowerCase() !== me.email) || newPassword !== ''

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (newPassword && newPassword !== confirmPassword) {
      setStatus({ ok: false, text: 'The new passwords do not match.' })
      return
    }
    setBusy(true)
    try {
      await updateAccount({
        data: {
          name,
          email: isAdmin ? email : undefined,
          avatarKey,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        },
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setStatus({ ok: true, text: 'Account updated.' })
      await router.invalidate()
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-8 md:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-3">
        <ImagePicker value={avatarKey} onChange={setAvatarKey} onBusyChange={setUploading} round maxSize={600} />
        <p className="text-xs text-mute">Profile photo</p>
      </div>

      <div className="space-y-5">
        <label className="block text-sm font-medium">
          Display name
          <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="field mt-2" />
        </label>
        <label className="block text-sm font-medium">
          Login email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isAdmin}
            className="field mt-2 disabled:opacity-60"
          />
          {!isAdmin && <span className="mt-1 block text-xs text-mute">Only the admin can change emails.</span>}
        </label>

        <div className="rounded-2xl border border-line bg-ink-3/40 p-5">
          <p className="font-semibold">Change password</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} autoComplete="new-password" className="field" placeholder="New password" />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className="field" placeholder="Repeat new password" />
          </div>
        </div>

        {needsCurrent && (
          <label className="rise block text-sm font-medium">
            Current password <span className="text-mute">(required to change email or password)</span>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" className="field mt-2" />
          </label>
        )}

        {status && (
          <p role="status" className={`text-sm ${status.ok ? 'text-emerald-400' : 'text-ember-soft'}`}>
            {status.text}
          </p>
        )}
        <button type="submit" disabled={busy || uploading} className="btn-primary px-8 py-3.5">
          {busy ? 'Saving…' : 'Save account'}
        </button>
      </div>
    </form>
  )
}
