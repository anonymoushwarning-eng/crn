import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import type { FeedPost } from '@/lib/types'
import { createPost, updatePost } from '@/server/dashboard.functions'
import { errorMessage, fromLocalInput, toLocalInput } from '@/lib/client'
import { ImagePicker } from './ImagePicker'

export function PostForm({
  post,
  isAdmin,
  onSaved,
}: {
  post?: FeedPost
  isAdmin: boolean
  onSaved: () => void
}) {
  const [title, setTitle] = useState(post?.title ?? '')
  const [story, setStory] = useState(post?.story ?? '')
  const [imageKey, setImageKey] = useState<string | null>(post?.imageKey ?? null)
  const [customDate, setCustomDate] = useState(post ? toLocalInput(post.postedAt) : '')
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const postedAt = isAdmin && customDate ? fromLocalInput(customDate) : undefined
      const data = { title, story, imageKey, postedAt }
      if (post) await updatePost({ data: { ...data, id: post.id } })
      else await createPost({ data })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <ImagePicker value={imageKey} onChange={setImageKey} onBusyChange={setUploading} />
      <label className="block text-sm font-medium">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          className="field mt-2"
          placeholder="The night the server hit 100 members"
        />
      </label>
      <label className="block text-sm font-medium">
        Story
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={6}
          maxLength={10000}
          className="field mt-2 resize-y leading-relaxed"
          placeholder="What happened? Who was there? Why does it matter?"
        />
      </label>

      {isAdmin && (
        <div className="rounded-2xl border border-line bg-ink-3/40 p-4">
          <label className="block text-sm font-medium">
            <span className="flex items-center gap-2">
              <CalendarClock size={16} className="text-ember" /> Date &amp; time shown on the post
            </span>
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="field mt-2 [color-scheme:dark]"
            />
          </label>
          <p className="mt-2 text-xs text-mute">
            {post ? 'Change it to move the memory on the timeline.' : 'Leave empty to use the current date and time.'}
          </p>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-ember-soft">{error}</p>}
      <button type="submit" disabled={busy || uploading} className="btn-primary w-full py-3.5">
        {busy ? 'Saving…' : uploading ? 'Uploading picture…' : post ? 'Save changes' : 'Publish memory'}
      </button>
    </form>
  )
}
