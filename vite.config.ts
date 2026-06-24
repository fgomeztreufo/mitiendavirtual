import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // Intercepta cualquier llamado local a /api y lo manda a producción de forma invisible
      '/api': {
        target: 'https://www.mitiendavirtual.cl',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Aquí agregamos la configuración para evitar la advertencia en Vercel
  build: {
    chunkSizeWarningLimit: 1000,
  },
});