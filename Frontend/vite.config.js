import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: For Vercel SPA routing (to fix 404 on refresh), you must add a vercel.json file in your project root.
// See: https://vercel.com/docs/edge-network/rewrites#single-page-applications

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
