import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    cors: true,
    // 允许 suncraft.site 域名及子域名与外网访问 (Vite 5 / 6 主机头白名单)
    allowedHosts: ['suncraft.site', '.suncraft.site', 'localhost', '127.0.0.1'],
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    cors: true,
    allowedHosts: ['suncraft.site', '.suncraft.site', 'localhost', '127.0.0.1'],
  },
});

