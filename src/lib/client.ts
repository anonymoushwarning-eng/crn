/** Optimized image URL. Local images are already WebP in the browser, so we
 *  serve them straight from `/api/images/<key>`. Images stored as absolute URLs
 *  (e.g. Vercel Blob) are returned as-is. On a deploy you can opt into the
 *  image CDN by setting `VITE_USE_IMAGE_CDN=1`. */
export function imageUrl(key: string, width: number) {
  if (/^https?:\/\//i.test(key)) return key
  if (import.meta.env.VITE_USE_IMAGE_CDN === '1') {
    return `/.netlify/images?url=${encodeURIComponent(`/api/images/${key}`)}&w=${width}&fm=webp&q=80`
  }
  return rawImageUrl(key)
}

export const rawImageUrl = (key: string) =>
  /^https?:\/\//i.test(key) ? key : `/api/images/${key}`

/** Public, shareable path for a single memory. */
export const postPath = (id: number) => `/post/${id}`

/** Absolute, shareable URL for a single memory (empty origin during SSR). */
export function postUrl(id: number) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}${postPath(id)}`
}

/** Shrinks big photos in the browser before upload so posts stay fast. */
async function compress(file: File, maxSize: number): Promise<Blob> {
  if (file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.86))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

export async function uploadImage(file: File, maxSize = 2000): Promise<string> {
  const body = await compress(file, maxSize)
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': body.type || file.type },
    body,
  })
  const json = (await res.json().catch(() => ({}))) as { key?: string; error?: string }
  if (!res.ok || !json.key) throw new Error(json.error ?? 'Upload failed.')
  return json.key
}

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO string → value for <input type="datetime-local"> in the viewer's timezone. */
export function toLocalInput(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const fromLocalInput = (value: string) => new Date(value).toISOString()

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.'
}
