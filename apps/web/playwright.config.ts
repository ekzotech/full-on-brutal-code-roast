import { defineConfig } from '@playwright/test';

const database = process.env.BROWSER_DATABASE_URL;
if (!database || !new URL(database).pathname.endsWith('_browser')) {
  throw new Error('Set BROWSER_DATABASE_URL to a dedicated _browser database');
}

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4200', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'node apps/api/dist/migrate.js && node apps/api/dist/main.js',
      cwd: '../..',
      url: 'http://127.0.0.1:3000/api/health',
      env: { DATABASE_URL: database, PORT: '3000' },
      timeout: 60000,
    },
    {
      command: 'npm run dev:web',
      cwd: '../..',
      url: 'http://127.0.0.1:4200',
      timeout: 90000,
    },
  ],
});
