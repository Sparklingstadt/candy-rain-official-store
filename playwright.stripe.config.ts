import { defineConfig } from "@playwright/test"
import baseConfig from "./playwright.config"
import { identityServerForE2e } from "./scripts/identityServer.mjs"

const identityServer = identityServerForE2e({ port: 3121, storeOrigin: "http://localhost:3119" })

// Card payment E2E against Stripe test mode. Needs STRIPE_SECRET_KEY and
// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (test-mode keys) in .env.
export default defineConfig({
  ...baseConfig,
  testIgnore: undefined,
  testMatch: "payment.spec.ts",
  timeout: 60_000,
  use: { ...baseConfig.use, baseURL: "http://localhost:3119" },
  webServer: [identityServer.webServer, {
    command: "npm run build && npm start -- --hostname 127.0.0.1 --port 3119",
    url: "http://127.0.0.1:3119/signin",
    env: {
      TZ: "Asia/Tokyo",
      AUTH_TRUST_HOST: "true",
      AUTH_URL: "http://localhost:3119",
      ...identityServer.storeEnv,
    },
    reuseExistingServer: false,
    timeout: 120_000,
  }],
})
