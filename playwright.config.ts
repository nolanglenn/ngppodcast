import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run build && npm run start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: { MOCK_DATA: 'true' },
  },
  use: { baseURL: 'http://localhost:3000' },
});
