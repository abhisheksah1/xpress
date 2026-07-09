import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:5001',
        changeOrigin: true,
      },
      '/robots.txt': {
        target: process.env.VITE_API_PROXY || 'http://localhost:5001',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: process.env.VITE_API_PROXY || 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
