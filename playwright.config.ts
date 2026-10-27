import "dotenv/config"
import { defineConfig, devices } from "@playwright/test"
import { identityServerForE2e } from "./scripts/identityServer.mjs"

// The store runs on localhost: Auth.js builds the OIDC callback URL from
// localhost in its route handler, and the redirect_uri sent when signing in
// must match it exactly.
const identityServer = identityServerForE2e({ port: 3120, storeOrigin: "http://localhost:3118" })

// The main suite covers the demo flow without card payment; payment.spec.ts runs
// against Stripe test mode through playwright.stripe.config.ts.
export default defineConfig({
  testDir: "./e2e",
  testIgnore: "payment.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  updateSnapshots: "none",
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFilePath}/{arg}{ext}",
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3118",
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
  webServer: [identityServer.webServer, {
    command: "npm run build && npm start -- --hostname 127.0.0.1 --port 3118",
    url: "http://127.0.0.1:3118/signin",
    env: {
      TZ: "Asia/Tokyo",
      AUTH_TRUST_HOST: "true",
      AUTH_URL: "http://localhost:3118",
      // Empty values take precedence over .env, so card payment stays off here.
      STRIPE_SECRET_KEY: "",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "",
      ...identityServer.storeEnv,
    },
    reuseExistingServer: false,
    timeout: 120_000,
  }],
})
