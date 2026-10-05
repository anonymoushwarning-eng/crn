import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { errorMessage, imageUrl, uploadImage } from '@/lib/client'

export function ImagePicker({
  value,
  onChange,
  onBusyChange,
  round = false,
  maxSize,
}: {
  value: string | null
  onChange: (key: string | null) => void
  onBusyChange?: (busy: boolean) => void
  round?: boolean
  maxSize?: number
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    onBusyChange?.(true)
    setError('')
    try {
      onChange(await uploadImage(file, maxSize))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
      onBusyChange?.(false)
      if (input.current) input.current.value = ''
    }
  }

  const shape = round ? 'h-24 w-24 rounded-full' : 'aspect-[4/3] w-full rounded-2xl'

  return (
    <div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={`group relative flex ${shape} items-center justify-center overflow-hidden border border-dashed border-line bg-ink-3/60 transition hover:border-ember/60`}
        >
          {value ? (
            <img src={imageUrl(value, round ? 200 : 800)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-mute group-hover:text-paper">
              <ImagePlus size={round ? 20 : 26} />
              {!round && 'Add a picture'}
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-ink/70">
              <Loader2 className="animate-spin text-ember" />
            </span>
          )}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="btn-ghost shrink-0 px-3 py-2 text-xs">
            <Trash2 size={14} /> Remove
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {error && <p className="mt-2 text-sm text-ember-soft">{error}</p>}
    </div>
  )
}
