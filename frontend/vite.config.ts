import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    // Разрешаем доступ через ngrok и другие туннели
    allowedHosts: [
      'marietta-gumptious-decurrently.ngrok-free.dev',
      '.ngrok-free.dev',
      '.ngrok.io',
      '.loca.lt'
    ],
    // Прокси для backend API
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
