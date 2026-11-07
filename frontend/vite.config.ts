import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
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

const API_PROXY = Object.fromEntries(
  API_PREFIXES.map((p) => [
    p,
    { target: 'http://localhost:3000', changeOrigin: true },
  ]),
);

export default defineConfig({
  base: '/app/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: API_PROXY,
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: API_PROXY,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
