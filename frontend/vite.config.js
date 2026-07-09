import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Keep Vite proxy in sync with backend/.env PORT (avoids ECONNREFUSED on port mismatch). */
function getBackendProxyTarget() {
  if (process.env.VITE_API_PROXY) return process.env.VITE_API_PROXY;

  const envPath = resolve(__dirname, '../backend/.env');
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, 'utf8').match(/^PORT=(\d+)/m);
    if (match) return `http://127.0.0.1:${match[1]}`;
  }

  return 'http://127.0.0.1:5000';
}

const apiProxy = getBackendProxyTarget();

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: apiProxy,
        changeOrigin: true,
      },
      '/robots.txt': {
        target: apiProxy,
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: apiProxy,
        changeOrigin: true,
      },
    },
  },
});
