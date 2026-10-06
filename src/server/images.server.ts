import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { dataDir } from './dataDir.server'

const IMAGES_DIR = join(dataDir(), 'images')
mkdirSync(IMAGES_DIR, { recursive: true })

const ALLOWED_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_VIDEO_BYTES = 400 * 1024 * 1024

function isVideoType(contentType: string) {
  return contentType.startsWith('video/')
}

// On Vercel the filesystem is ephemeral, so uploads go to Vercel Blob once a
// store is connected to the project. Connected stores inject either a static
// read-write token or OIDC credentials (`BLOB_STORE_ID` + `VERCEL_OIDC_TOKEN`),
// and the SDK picks up either automatically. Locally none are present, so
// images stay on disk in data/images/.
const useBlob = Boolean(
  process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID || process.env.VERCEL_OIDC_TOKEN,
)

if (process.env.VERCEL && !useBlob) {
  console.warn(
    '[crn] No Vercel Blob credentials found — uploaded images will be stored in the ephemeral /tmp filesystem and will not persist.',
  )
}

/** True when uploads are stored in Vercel Blob (static token or OIDC). */
export const blobEnabled = () => useBlob

/** Already-hosted image URL (e.g. a Vercel Blob URL) rather than a local key. */
export const isRemoteImage = (key: string) => /^https?:\/\//i.test(key)

function imageFile(key: string) {
  return join(IMAGES_DIR, key)
}

function metaFile(key: string) {
  return join(IMAGES_DIR, `${key}.meta.json`)
}

function assertAllowed(data: ArrayBuffer, contentType: string) {
  const isVideo = isVideoType(contentType)
  if (!isVideo && !ALLOWED_IMAGES.includes(contentType)) {
    throw new Error('Unsupported media type.')
  }
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (data.byteLength > maxBytes) {
    throw new Error(
      `${isVideo ? 'Video' : 'Image'} is larger than ${maxBytes / (1024 * 1024)} MB.`,
    )
  }
}

export async function saveImage(data: ArrayBuffer, contentType: string) {
  assertAllowed(data, contentType)
  const buffer = Buffer.from(data)

  if (useBlob) {
    const { put } = await import('@vercel/blob')
    const ext = contentType.split('/')[1]?.split(';')[0] || 'bin'
    const pathname = `media/${randomUUID()}.${ext}`
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    })
    // Store the absolute URL as the image key so it can be served directly.
    return blob.url
  }

  const key = randomUUID()
  // contentType is kept in a sidecar so the media can be served with the right header.
  writeFileSync(imageFile(key), buffer)
  writeFileSync(metaFile(key), JSON.stringify({ contentType }))
  return key
}

export async function readImage(key: string) {
  if (isRemoteImage(key)) {
    try {
      const res = await fetch(key)
      if (!res.ok) return null
      return {
        data: await res.arrayBuffer(),
        metadata: { contentType: res.headers.get('content-type') ?? 'image/jpeg' },
      }
    } catch {
      return null
    }
  }
  try {
    const data = readFileSync(imageFile(key))
    const meta = JSON.parse(readFileSync(metaFile(key), 'utf8')) as { contentType?: string }
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
    return { data: arrayBuffer as ArrayBuffer, metadata: { contentType: meta.contentType ?? 'image/jpeg' } }
  } catch {
    return null
  }
}

export async function deleteImage(key: string | null | undefined) {
  if (!key) return
  if (isRemoteImage(key)) {
    if (!useBlob) return
    try {
      const { del } = await import('@vercel/blob')
      await del(key)
    } catch {
      // Already gone or not ours — nothing to clean up.
    }
    return
  }
  rmSync(imageFile(key), { force: true })
  rmSync(metaFile(key), { force: true })
}
