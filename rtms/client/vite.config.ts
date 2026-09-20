import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // The signing tablet is a second device, so it needs the LAN address.
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
