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
  // `vite preview` serves the production build used by the Playwright e2e
  // suite (frontend/playwright.config.ts); it does not inherit `server.proxy`,
  // so it needs its own proxy to reach the backend the same way the dev
  // server does.
  preview: {
    port: 4173,
    strictPort: true,
    proxy: API_PROXY,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
