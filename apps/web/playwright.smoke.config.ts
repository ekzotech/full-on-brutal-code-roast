import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './smoke',
  use: {
    ...devices['Pixel 7'],
    baseURL: process.env.SMOKE_URL ?? 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
  },
});
