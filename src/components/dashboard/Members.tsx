import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2, UserPlus } from 'lucide-react'
import type { Me, Member } from '@/lib/types'
import { createMember, deleteMember, listMembers, updateMember } from '@/server/dashboard.functions'
import { errorMessage } from '@/lib/client'
import { Avatar } from '../Avatar'
import { Modal } from './Modal'
import { ImagePicker } from './ImagePicker'

export function Members({ me }: { me: Me }) {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [editing, setEditing] = useState<Member | 'new' | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(() => {
    listMembers().then(setMembers).catch((e) => setError(errorMessage(e)))
  }, [])
  useEffect(refresh, [refresh])

  async function remove(m: Member) {
    if (!confirm(`Remove ${m.name}? Their ${m.postCount} post(s) will be deleted too.`)) return
    try {
      await deleteMember({ data: { id: m.id } })
      refresh()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-md text-sm text-mute">
          Add people by email and give them a password. They log in from the menu and can post
          memories.
        </p>
        <button onClick={() => setEditing('new')} className="btn-primary">
          <UserPlus size={16} /> Add member
        </button>
      </div>
      {error && <p role="alert" className="mb-4 text-sm text-ember-soft">{error}</p>}

      {!members ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-ink-2" />)}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-4 rounded-2xl border border-line bg-ink-2 p-4">
              <Avatar name={m.name} avatarKey={m.avatarKey} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {m.name} {m.id === me.id && <span className="text-xs text-mute">(you)</span>}
                </p>
                <p className="truncate text-xs text-mute">{m.email}</p>
                <p className="mt-1 text-[11px] uppercase tracking-widest text-ember">
                  {m.role} · {m.postCount} posts
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(m)} aria-label={`Edit ${m.name}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-line hover:border-paper/30">
                  <Pencil size={14} />
                </button>
                {m.id !== me.id && (
                  <button onClick={() => remove(m)} aria-label={`Remove ${m.name}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-line hover:border-ember/60 hover:text-ember">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add member' : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <MemberForm
            member={editing === 'new' ? undefined : editing}
            isSelf={editing !== 'new' && editing.id === me.id}
            onSaved={() => {
              setEditing(null)
              refresh()
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function MemberForm({
  member,
  isSelf,
  onSaved,
}: {
  member?: Member
  isSelf: boolean
  onSaved: () => void
}) {
  const [name, setName] = useState(member?.name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>(member?.role ?? 'member')
  const [avatarKey, setAvatarKey] = useState<string | null>(member?.avatarKey ?? null)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const base = { name, email, role, avatarKey }
      if (member) {
        await updateMember({ data: { ...base, id: member.id, password: password || undefined } })
      } else {
        await createMember({ data: { ...base, password } })
      }
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-4">
        <ImagePicker value={avatarKey} onChange={setAvatarKey} onBusyChange={setUploading} round maxSize={600} />
        <p className="text-sm text-mute">Profile photo shown on their posts.</p>
      </div>
      <label className="block text-sm font-medium">
        Name
        <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="field mt-2" />
      </label>
      <label className="block text-sm font-medium">
        Email
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-2" />
      </label>
      <label className="block text-sm font-medium">
        {member ? 'New password (leave empty to keep)' : 'Password'}
        <input
          type="text"
          required={!member}
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="field mt-2 font-mono"
          placeholder="At least 8 characters"
        />
      </label>
      <fieldset className="text-sm font-medium" disabled={isSelf}>
        Role
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['member', 'admin'] as const).map((r) => (
            <label key={r} className={`cursor-pointer rounded-xl border px-4 py-3 capitalize transition ${role === r ? 'border-ember/60 bg-ember/10' : 'border-line'}`}>
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-ember-soft">{error}</p>}
      <button type="submit" disabled={busy || uploading} className="btn-primary w-full py-3.5">
        {busy ? 'Saving…' : member ? 'Save member' : 'Create account'}
      </button>
    </form>
  )
}
