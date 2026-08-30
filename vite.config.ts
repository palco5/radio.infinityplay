import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' + skipWaiting:false => novi SW se instalira ali ČEKA; ne preuzima
      // otvorene kartice, pa deploy ne prekida korisnike koji slušaju. Nova verzija
      // se aktivira pri sledećem potpunom zatvaranju/otvaranju aplikacije.
      registerType: 'prompt',
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
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
  // Dev-only: forward /api to a backend from the Vite server itself, so the
  // browser only ever talks to localhost. This sidesteps the CORS wall the live
  // backend puts up against localhost origins, and mirrors production where the
  // frontend and /api share an origin. Paired with VITE_API_URL=/api.
  //
  // Default target is the LIVE backend. To test against the LOCAL PHP server
  // (which serves the `api/` folder as its root, so it has no `/api` prefix),
  // start it with:  php -S 127.0.0.1:8787 -t api
  // then run Vite with:  VITE_PROXY_TARGET=http://127.0.0.1:8787 npm run dev
  // The `/api` prefix is stripped only for the local target.
  server: (() => {
    const target = process.env.VITE_PROXY_TARGET || 'https://radio.infinityplay.rs';
    const isLocal = /localhost|127\.0\.0\.1/.test(target);
    return {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: !isLocal,
          // Local PHP is rooted at api/, so /api/auth.php -> /auth.php.
          rewrite: isLocal ? (path: string) => path.replace(/^\/api/, '') : undefined,
        },
      },
    };
  })(),
});
