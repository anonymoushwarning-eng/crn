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
async function compressImage(file: File, maxSize: number): Promise<Blob> {
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

const EXT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  flv: 'video/x-flv',
  wmv: 'video/x-ms-wmv',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  mpg: 'video/mpeg',
  mpeg: 'video/mpeg',
  ogv: 'video/ogg',
  ts: 'video/mp2t',
  m2ts: 'video/mp2t',
}

const fileExt = (name: string) => name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? ''

/** Browsers sometimes omit `file.type` (e.g. .mkv), so fall back to the extension. */
function resolveType(file: File) {
  return file.type || EXT_TYPES[fileExt(file.name)] || 'application/octet-stream'
}

/** Whether a picked file should be treated as a video (type or extension). */
export function isVideoFile(file: File) {
  return resolveType(file).startsWith('video/')
}

// Serverless functions reject large request bodies (Vercel caps them around
// 4.5 MB), so anything above this goes straight from the browser to Vercel Blob.
const INLINE_LIMIT = 3.5 * 1024 * 1024

let blobMode: Promise<boolean> | null = null
function blobUploadsAvailable(): Promise<boolean> {
  if (!blobMode) {
    blobMode = fetch('/api/upload')
      .then((r) => (r.ok ? r.json() : { blob: false }))
      .then((j) => Boolean((j as { blob?: boolean }).blob))
      .catch(() => false)
  }
  return blobMode
}

export async function uploadMedia(
  file: File,
  maxSize = 2000,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const declaredType = resolveType(file)
  const isVideo = declaredType.startsWith('video/')
  const imageFile = file.type ? file : new File([file], file.name, { type: declaredType })
  const body: Blob = isVideo ? file : await compressImage(imageFile, maxSize)
  const contentType = body.type || declaredType

  if ((isVideo || body.size > INLINE_LIMIT) && (await blobUploadsAvailable())) {
    try {
      const { upload } = await import('@vercel/blob/client')
      const ext = fileExt(file.name) || (isVideo ? 'mp4' : 'bin')
      const pathname = `media/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`
      const blob = await upload(pathname, body, {
        access: 'public',
        handleUploadUrl: '/api/blob-upload',
        contentType,
        multipart: isVideo,
        onUploadProgress: (event) => onProgress?.(Math.round(event.percentage)),
      })
      return blob.url
    } catch {
      // Fall back to the server route below (works locally and for small files).
    }
  }

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  })
  const json = (await res.json().catch(() => ({}))) as { key?: string; error?: string }
  if (!res.ok || !json.key) throw new Error(json.error ?? 'Upload failed.')
  return json.key
}

// Backward compatibility
export async function uploadImage(file: File, maxSize = 2000): Promise<string> {
  return uploadMedia(file, maxSize)
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
