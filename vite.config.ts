import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/logo.png', 'assets/logo_192.png', 'assets/logo_512.png'],
      manifest: {
        name: 'Kasamatik',
        short_name: 'Kasamatik',
        description: 'Gemini & Supabase Destekli Akıllı Bahis Takibi',
        theme_color: '#292c30',
        background_color: '#292c30',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'assets/logo_192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/logo_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
