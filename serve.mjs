// Self-hosted production server. `npm run build` then `npm run start`.
// The SQLite file DB (data/crn.db) persists here because the filesystem is real.
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import app from './dist/server/server.js'

const port = Number(process.env.PORT ?? 3000)

// Built client assets (JS/CSS plus anything copied from public/) live here.
// Serving them ourselves is what makes `npm run start` a complete server.
const CLIENT_DIR = resolve('dist/client')

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

/** Streams a file from dist/client. Returns false when there is no such asset. */
function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return false
  }
  if (decoded.includes('\0')) return false
  const filePath = normalize(join(CLIENT_DIR, decoded))
  if (filePath !== CLIENT_DIR && !filePath.startsWith(CLIENT_DIR + sep)) return false
  if (!existsSync(filePath)) return false
  const stat = statSync(filePath)
  if (!stat.isFile()) return false

  res.statusCode = 200
  res.setHeader('Content-Type', MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream')
  // Hashed assets never change; other public files get a short cache.
  res.setHeader(
    'Cache-Control',
    decoded.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  )
  res.setHeader('Content-Length', stat.size)
  if (req.method === 'HEAD') {
    res.end()
    return true
  }
  createReadStream(filePath).pipe(res)
  return true
}

// Read the whole request body and hand a buffered copy to the app. Buffering
// guarantees the incoming message is fully consumed, so keep-alive connections
// stay healthy even when a handler returns without reading the body (e.g. 401s).
async function toRequest(req) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.append(name, Array.isArray(value) ? value.join(', ') : value)
  }
  const method = req.method ?? 'GET'
  let body
  if (method !== 'GET' && method !== 'HEAD') {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    if (chunks.length) body = Buffer.concat(chunks)
  }
  return new Request(url, { method, headers, body, duplex: body ? 'half' : undefined })
}

// Refuse to start if another dev/prod server already answers on this port.
// Vite dev binds only ::1 while this server binds ::, so both can silently
// coexist and then serve mismatched builds — which breaks server-function
// calls (login, saving posts). Failing loudly here prevents that confusion.
async function alreadyServing() {
  for (const host of ['127.0.0.1', '[::1]']) {
    try {
      await fetch(`http://${host}:${port}/`, { signal: AbortSignal.timeout(800) })
      return host
    } catch {
      // Nothing there — keep checking.
    }
  }
  return null
}

const busyHost = await alreadyServing()
if (busyHost) {
  console.error(`\nPort ${port} is already serving something on ${busyHost}.`)
  console.error('You probably have another server running (e.g. `npm run dev`).')
  console.error('Stop it first, or start this one with a different PORT.\n')
  process.exit(1)
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  if (serveStatic(req, res, url.pathname)) return

  toRequest(req)
    .then((request) => app.fetch(request))
    .then(
      (response) => {
        res.statusCode = response.status
        res.statusMessage = response.statusText
        response.headers.forEach((value, name) => res.setHeader(name, value))
        if (response.body) {
          Readable.fromWeb(response.body).pipe(res)
        } else {
          res.end()
        }
      },
      (error) => {
        console.error(error)
        if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' })
        res.end('Internal Server Error')
      },
    )
}).listen(port, () => {
  console.log(`CRN SOCIETY running at http://localhost:${port}`)
})