import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/contratid/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ContratId',
        short_name: 'ContratId',
        description: 'Gestão de contratos eletrônicos',
        theme_color: '#063BF8',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/contratid/',
        icons: [
          { src: '/contratid/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/contratid/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
