import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

// Los e2e usan su propio backend (:8081, base molde_test, bucket sasha-docs-test) y su propio front (:3001),
// para no escribir en la base de trabajo (molde_db) que usa `pnpm dev` en :3000.
const FRONT_PORT = 3001
const API_PORT = 8081
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${FRONT_PORT}`
const BACKEND_DIR = path.resolve(process.cwd(), '..', 'backend_sasha')
// molde_test se recrea antes de levantar el backend: si se recrea con el backend vivo, su pool queda con
// conexiones cortadas. E2E_SIN_RESET=1 lo omite.
const BACKEND_CMD = process.env.E2E_SIN_RESET ? 'go run .' : 'go run ./cmd/resetdb && go run .'

export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.PLAYWRIGHT_CHROME_CHANNEL || 'chrome',
      },
    },
  ],
  webServer: [
    {
      command: BACKEND_CMD,
      cwd: BACKEND_DIR,
      url: `http://localhost:${API_PORT}/health`,
      env: { DB_NAME: 'molde_test', SERVER_PORT: String(API_PORT), MINIO_BUCKET: 'sasha-docs-test' },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: `pnpm exec vite dev --port ${FRONT_PORT} --strictPort`,
      url: baseURL,
      env: { E2E_API_TARGET: `http://localhost:${API_PORT}` },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
