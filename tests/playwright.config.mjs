import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.mjs/,
  workers: 1, // ein gemeinsamer Emulator-Datenstand
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    bypassCSP: true, // CSP der App erlaubt den lokalen Emulator nicht; die App selbst bleibt unverändert
    viewport: { width: 1440, height: 900 },
    locale: 'de-DE',
    launchOptions: { executablePath: process.env.PW_CHROMIUM || undefined },
  },
  webServer: {
    command: 'python3 -m http.server 5173 --bind 127.0.0.1 --directory ..',
    url: 'http://127.0.0.1:5173/index.html',
    reuseExistingServer: true,
  },
});
