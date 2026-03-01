import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'jsdom', // Simulates a browser environment for React components
    setupFiles: ['./src/setupTests.js'], // Runs standard setup before tests
    globals: true, // Allows us to use describe, it, expect without importing them everywhere
  },
})
