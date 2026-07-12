import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import { volcTtsPlugin } from './plugins/volc-tts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Expose Volc credentials to the TTS middleware (never to the client bundle)
  for (const key of ['VOLC_APP_ID', 'VOLC_ACCESS_TOKEN', 'VOLC_CLUSTER', 'VOLC_VOICE_TYPE', 'VOLC_RESOURCE_ID'] as const) {
    const value = env[key]
    if (value) process.env[key] = value
  }

  return {
    base: './',
    plugins: [react(), volcTtsPlugin()],
    server: {
      port: 3000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})