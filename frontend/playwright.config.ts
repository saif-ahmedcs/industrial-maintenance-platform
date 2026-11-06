import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173/app/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run start:dev',
      cwd: '../backend',
      url: 'http://localhost:3000/health',
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        AUTH_REGISTER_RATE_LIMIT: '1000',
        AUTH_LOGIN_RATE_LIMIT: '1000',
        AUTH_REFRESH_RATE_LIMIT: '1000',
      },
    },
    {
      command: 'npm run build && npm run preview',
      url: 'http://localhost:4173/app/',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
