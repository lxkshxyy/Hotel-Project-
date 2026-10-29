import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// TripDesk (travel-agent panel) reuses StayEasy's hotel data, price rules and hotel photos,
// so agents always see the same inventory and the same rules the server applies.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@stayeasy': fileURLToPath(new URL('../stayeasy/src', import.meta.url)) } },
  publicDir: '../stayeasy/public',
  server: { port: 5175, strictPort: true, fs: { allow: ['..'] } },
  preview: { port: 5175, strictPort: true },
})
