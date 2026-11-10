import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './src/tests/unit',
  fullyParallel: true,
  reporter: 'list',
  timeout: 10_000,
})
