import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, Video, GripVertical } from 'lucide-react'
import type { MediaItem } from '@/lib/types'
import { errorMessage, imageUrl, isVideoFile, rawImageUrl, uploadMedia } from '@/lib/client'

export function MediaPicker({
  value,
  onChange,
  onBusyChange,
  maxSize,
  maxVideoSize,
}: {
  value: MediaItem[]
  onChange: (items: MediaItem[]) => void
  onBusyChange?: (busy: boolean) => void
  maxSize?: number
  maxVideoSize?: number
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function pickFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const newFiles = Array.from(files)
    if (value.length + newFiles.length > 10) {
      setError('Maximum 10 media items per post.')
      return
    }
    setBusy(true)
    onBusyChange?.(true)
    setError('')

    try {
      const uploadedItems: MediaItem[] = []
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i]
        const isVideo = isVideoFile(file)
        const sizeLimit = isVideo ? maxVideoSize : maxSize
        setProgress(0)
        const key = await uploadMedia(file, sizeLimit, setProgress)
        uploadedItems.push({
          type: isVideo ? 'video' : 'image',
          key,
          order: value.length + i,
        })
      }
      // Append new items to existing ones
      const updated = [...value, ...uploadedItems].map((item, idx) => ({ ...item, order: idx }))
      onChange(updated)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
      setProgress(null)
      onBusyChange?.(false)
      if (input.current) input.current.value = ''
    }
  }

  function removeItem(index: number) {
    const updated = value.filter((_, i) => i !== index).map((item, idx) => ({ ...item, order: idx }))
    onChange(updated)
  }

  function moveItem(fromIndex: number, toIndex: number) {
    const updated = [...value]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    onChange(updated.map((item, idx) => ({ ...item, order: idx })))
  }

  const maxItems = 10
  const canAddMore = value.length < maxItems

  return (
    <div>
      {canAddMore && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="group relative aspect-[4/3] w-full flex items-center justify-center overflow-hidden border border-dashed border-line bg-ink-3/60 transition hover:border-ember/60 rounded-2xl"
        >
          <span className="flex flex-col items-center gap-2 text-sm text-mute group-hover:text-paper">
            <ImagePlus size={26} />
            <span>Add media</span>
            <span className="text-xs text-mute/70">{value.length}/{maxItems} items</span>
          </span>
          {busy && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/70 text-ember">
              <Loader2 className="animate-spin" />
              {progress !== null && progress > 0 && (
                <span className="text-xs font-semibold text-paper">{progress}%</span>
              )}
            </span>
          )}
        </button>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => pickFiles(e.target.files)}
      />

      {value.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {value.map((item, index) => (
            <div
              key={`${item.key}-${item.order}`}
              className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-line bg-ink-3/60"
            >
              {item.type === 'image' ? (
                <img
                  src={imageUrl(item.key, 500)}
                  alt={`Media ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  src={rawImageUrl(item.key)}
                  className="h-full w-full object-cover"
                  muted
                  preload="metadata"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-3xl text-paper">{item.type === 'video' ? '▶' : '🔍'}</span>
              </div>
              {item.type === 'video' && (
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-black/70 text-paper rounded">
                  <Video size={10} className="inline mr-0.5" /> Video
                </span>
              )}
              <div className="absolute top-1 left-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => index > 0 && moveItem(index, index - 1)}
                  disabled={index === 0}
                  className="p-1 rounded-full bg-ink/80 text-paper hover:bg-ember opacity-0 group-hover:opacity-100 transition disabled:opacity-30"
                  aria-label="Move up"
                >
                  <GripVertical size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => index < value.length - 1 && moveItem(index, index + 1)}
                  disabled={index === value.length - 1}
                  className="p-1 rounded-full bg-ink/80 text-paper hover:bg-ember opacity-0 group-hover:opacity-100 transition disabled:opacity-30"
                  aria-label="Move down"
                >
                  <GripVertical size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="absolute top-1 right-1 p-1 rounded-full bg-ink/80 text-paper hover:bg-ember hover:text-ember opacity-0 group-hover:opacity-100 transition"
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
              <div className="absolute bottom-1 left-1 text-xs text-paper/80 bg-ink/80 px-1.5 py-0.5 rounded">
                {index + 1} of {value.length}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-ember-soft">{error}</p>}
    </div>
  )
}