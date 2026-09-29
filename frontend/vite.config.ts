import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/app': `${import.meta.dirname}/src/app`,
      '@/pages': `${import.meta.dirname}/src/pages`,
      '@/features': `${import.meta.dirname}/src/features`,
      '@/entities': `${import.meta.dirname}/src/entities`,
      '@/shared': `${import.meta.dirname}/src/shared`,
    },
  },
})
