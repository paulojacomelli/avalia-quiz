
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    appType: 'spa',
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        workbox: { importScripts: ['/custom-sw.js'] },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Avalia JW Quiz',
          short_name: 'JW Quiz',
          description: 'Aprenda e teste seus conhecimentos bíblicos com IA',
          theme_color: '#5b3c88',
          background_color: '#0d0a14',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png?v=2',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png?v=2',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ]
  };
});
