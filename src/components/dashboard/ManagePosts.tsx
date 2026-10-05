import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, Check, Pencil, Trash2 } from 'lucide-react'
import type { FeedPost, Me } from '@/lib/types'
import { deletePost, getManagedPosts, updatePost } from '@/server/dashboard.functions'
import { errorMessage, fromLocalInput, imageUrl, toLocalInput } from '@/lib/client'
import { LocalTime } from '../LocalTime'
import { Modal } from './Modal'
import { PostForm } from './PostForm'

export function ManagePosts({ me }: { me: Me }) {
  const [posts, setPosts] = useState<FeedPost[] | null>(null)
  const [editing, setEditing] = useState<FeedPost | null>(null)
  const [error, setError] = useState('')
  const isAdmin = me.role === 'admin'

  const refresh = useCallback(() => {
    getManagedPosts().then(setPosts).catch((e) => setError(errorMessage(e)))
  }, [])
  useEffect(refresh, [refresh])

  async function remove(post: FeedPost) {
    if (!confirm(`Delete "${post.title || 'this post'}"? This cannot be undone.`)) return
    try {
      await deletePost({ data: { id: post.id } })
      refresh()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  if (!posts) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-ink-2" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {error && <p role="alert" className="mb-4 text-sm text-ember-soft">{error}</p>}
      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-mute">
          No posts yet. Share the first memory from the “New post” tab.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-ink-2 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-3">
                  {post.imageKey && <img src={imageUrl(post.imageKey, 160)} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{post.title || post.story.slice(0, 60) || 'Untitled picture'}</p>
                  <p className="truncate text-xs text-mute">
                    {isAdmin && <>{post.author.name} · </>}
                    <LocalTime iso={post.postedAt} />
                    {' · '}❤️ {post.counts.love} 👍 {post.counts.like} 😂 {post.counts.laugh}
                  </p>
                  {isAdmin && <DateEditor post={post} onSaved={refresh} />}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(post)} className="btn-ghost px-4 py-2 text-xs">
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={() => remove(post)} className="btn-ghost px-4 py-2 text-xs hover:border-ember/60 hover:text-ember">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal title="Edit post" onClose={() => setEditing(null)}>
          <PostForm
            post={editing}
            isAdmin={isAdmin}
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

/** Inline admin control to move a post's date and time. */
function DateEditor({ post, onSaved }: { post: FeedPost; onSaved: () => void }) {
  const original = toLocalInput(post.postedAt)
  const [value, setValue] = useState(original)
  const [busy, setBusy] = useState(false)
  useEffect(() => setValue(toLocalInput(post.postedAt)), [post.postedAt])

  async function save() {
    setBusy(true)
    try {
      await updatePost({
        data: {
          id: post.id,
          title: post.title,
          story: post.story,
          imageKey: post.imageKey,
          postedAt: fromLocalInput(value),
        },
      })
      onSaved()
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <CalendarClock size={14} className="shrink-0 text-ember" />
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Post date and time"
        className="rounded-lg border border-line bg-ink-3 px-2 py-1 text-xs [color-scheme:dark] outline-none focus:border-ember/60"
      />
      {value && value !== original && (
        <button onClick={save} disabled={busy} className="btn-primary px-3 py-1 text-xs">
          <Check size={12} /> {busy ? 'Saving' : 'Save'}
        </button>
      )}
    </div>
  )
}
