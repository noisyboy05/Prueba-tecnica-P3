import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@api': resolve(__dirname, 'src/api'),
      '@components': resolve(__dirname, 'src/components'),
      '@contexts': resolve(__dirname, 'src/contexts'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@router': resolve(__dirname, 'src/router'),
      '@theme': resolve(__dirname, 'src/theme'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
