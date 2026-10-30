import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { partnerBridge } from './partner-bridge.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Local channel to the hotel-owner panel (InnDesk). Dev/preview only.
    partnerBridge(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'StayEasy – Hotel Booking',
        short_name: 'StayEasy',
        description: 'Clean, comfortable rooms. Same standard in every city.',
        theme_color: '#14306B',
        background_color: '#F5F7FB',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en-IN',
        categories: ['travel'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Search hotels', url: '/hotels', icons: [{ src: '/pwa-192.png', sizes: '192x192' }] },
          { name: 'My bookings', url: '/bookings', icons: [{ src: '/pwa-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__partner\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Big parts only some guests need (voucher PDF, maps) are cached when first used,
        // not downloaded by every new visitor.
        globIgnores: ['**/voucherPdf-*.js', '**/html2canvas-*.js', '**/index.es-*.js', '**/purify.es-*.js', '**/HotelMap-*.js', '**/Biz*.js', '**/biz*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: { cacheName: 'app-chunks', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
