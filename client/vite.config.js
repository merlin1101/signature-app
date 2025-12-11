import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Detect environment
const isProduction = process.env.NODE_ENV === 'production'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: !isProduction
      ? { '/api': 'http://localhost:5000' } // ✅ local dev only
      : undefined, // ❌ disable proxy in production
  },
})
