import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // 'github' anota falhas direto no job; 'html' é o que vira o artefato que o
  // CI sobe em test:e2e falho — sem ele não haveria nada em playwright-report/.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'on-first-retry' },
  webServer: [
    {
      command: 'node test/mock-tmdb/servidor.mjs',
      url: 'http://127.0.0.1:4010/genre/movie/list',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run build && npm run start',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        TMDB_READ_TOKEN: 'token-de-teste',
        TMDB_BASE_URL: 'http://127.0.0.1:4010',
        E2E: '1',
      },
    },
  ],
})
