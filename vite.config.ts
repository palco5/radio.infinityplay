import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
      },
      includeAssets: ['logo.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'InfinityPlay Dashboard',
        short_name: 'InfinityPlay',
        description: 'Glavni deo tvoje radio stanice',
        theme_color: '#10b981',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/dashboard',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: '/',
  // Dev-only: forward /api to the live backend from the Vite server itself, so
  // the browser only ever talks to localhost. This sidesteps the CORS wall the
  // live backend puts up against localhost origins (which caused "Failed to
  // fetch" on login), and mirrors production where the frontend and /api share
  // an origin. Paired with VITE_API_URL=/api in .env.development.local.
  server: {
    proxy: {
      '/api': {
        target: 'https://radio.infinityplay.rs',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
