/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API_PREFIXES = [
  '/auth',
  '/plants',
  '/locations',
  '/asset-types',
  '/assets',
  '/maintenance-plans',
  '/work-orders',
  '/spare-parts',
  '/notifications',
  '/audit',
  '/health',
];

export default defineConfig({
  base: '/app/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      API_PREFIXES.map((p) => [
        p,
        { target: 'http://localhost:3000', changeOrigin: true },
      ]),
    ),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
