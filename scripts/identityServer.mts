// Local development and E2E tests sign in through a real Candy Rain ID
// (candy-rain-identity-server). `go run` builds this exact commit, so Go is the
// only extra requirement; bump the version here to test a newer server.
export const identityServerModule = "github.com/Sparklingstadt/candy-rain-identity-server/cmd/server@b1c868a78ef4"

export const candyRainIdClientId = "candy-rain-store"

type IdentityServerOptions = {
  issuer: string
  clientSecret: string
  storeOrigins: string[]
  databaseUrl: string
}

// Environment for the identity server, with the store registered as its only client.
export function identityServerEnv({ issuer, clientSecret, storeOrigins, databaseUrl }: IdentityServerOptions) {
  return {
    ISSUER: issuer,
    PORT: new URL(issuer).port,
    DATABASE_URL: databaseUrl,
    OIDC_CLIENT_ID: candyRainIdClientId,
    OIDC_CLIENT_SECRET: clientSecret,
    OIDC_REDIRECT_URIS: storeOrigins.map((origin) => `${origin}/api/auth/callback/candy-rain-id`).join(","),
    OIDC_POST_LOGOUT_REDIRECT_URIS: storeOrigins.map((origin) => `${origin}/signout`).join(","),
    LOGIN_HINT: "デモ: user1@mail.com / demo-password",
  }
}

// A Playwright webServer entry for the identity server, plus the store
// environment that points Auth.js at it.
export function identityServerForE2e({ port, storeOrigin }: { port: number, storeOrigin: string }) {
  const issuer = `http://127.0.0.1:${port}`
  const clientSecret = "e2e-client-secret"
  return {
    webServer: {
      command: `go run ${identityServerModule}`,
      url: `${issuer}/healthz`,
      env: identityServerEnv({
        issuer,
        clientSecret,
        storeOrigins: [storeOrigin],
        databaseUrl: process.env.DATABASE_URL ?? "",
      }),
      reuseExistingServer: false,
      // The first run downloads and compiles the server.
      timeout: 300_000,
    },
    storeEnv: {
      AUTH_CANDY_RAIN_ID_ISSUER: issuer,
      AUTH_CANDY_RAIN_ID_ID: candyRainIdClientId,
      AUTH_CANDY_RAIN_ID_SECRET: clientSecret,
    },
  }
}
