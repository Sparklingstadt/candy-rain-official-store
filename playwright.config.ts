import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  updateSnapshots: "none",
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFilePath}/{arg}{ext}",
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3118",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm start -- --hostname 127.0.0.1 --port 3118",
    url: "http://127.0.0.1:3118/signin",
    env: {
      TZ: "Asia/Tokyo",
      AUTH_TRUST_HOST: "true",
      AUTH_URL: "http://127.0.0.1:3118",
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
