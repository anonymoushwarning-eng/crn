import { join } from 'node:path'

/**
 * Writable data root for the local database file and uploaded images.
 * - Locally this is `<project>/data`.
 * - On Vercel (serverless) the project filesystem is read-only, so we fall back
 *   to the per-instance `/tmp` directory. Note: /tmp is ephemeral there.
 */
export function dataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR
  if (process.env.VERCEL) return join('/tmp', 'crn-society')
  return join(process.cwd(), 'data')
}
