import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

// On Vercel we build with Nitro, which emits the Vercel Build Output API
// (`.vercel/output`) and handles all routing/path handling correctly. Local
// builds skip Nitro so `dist/` and the self-hosted `serve.mjs` keep working.
const useNitro = Boolean(process.env.VERCEL)

const config = defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    ...(useNitro ? [nitro({ preset: 'vercel' })] : []),
    viteReact(),
  ],
  // Never watch generated build output; on Windows a dev server holding these
  // files open makes a concurrent Vercel build fail with EPERM.
  server: {
    watch: {
      ignored: ['**/.vercel/**', '**/.output/**', '**/dist/**'],
    },
  },
})

export default config
