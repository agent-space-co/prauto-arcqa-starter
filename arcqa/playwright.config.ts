import { defineConfig, devices } from '@playwright/test'

/**
 * ArcQA — Playwright configuration.
 *
 * Edit BASE_URL to point at your app's dev/staging URL.
 * Auth: if your app uses a cookie-based session, configure auth.setup.ts.
 * If your app has no auth, remove the 'setup' project and storageState references.
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
  },

  projects: [
    {
      name: 'setup',
      testMatch: '**/fixtures/auth.setup.ts',
      use: { storageState: undefined },
    },
    {
      name: 'chromium-smoke',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      testMatch: '**/smoke/*.spec.ts',
      dependencies: ['setup'],
    },
  ],

  outputDir: 'test-results/artifacts',
})
