import nextEnv from '@next/env'
import { spawn, spawnSync } from 'node:child_process'
import { identityServerEnv, identityServerModule } from './identityServer.mts'
nextEnv.loadEnvConfig(process.cwd(), true)
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
run('npm', ['run', 'env:check'])
run('npm', ['run', 'db:start'])

// Sign-in goes through Candy Rain ID, so start a local one alongside Next.js
// unless .env points at an identity server elsewhere.
const issuer = process.env.AUTH_CANDY_RAIN_ID_ISSUER ?? ''
let identityServer
if (['localhost', '127.0.0.1'].includes(new URL(issuer).hostname)) {
  identityServer = spawn('go', ['run', identityServerModule], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...identityServerEnv({
        issuer,
        clientSecret: process.env.AUTH_CANDY_RAIN_ID_SECRET ?? '',
        storeOrigins: ['http://localhost:3000'],
        databaseUrl: process.env.DATABASE_URL ?? '',
      }),
    },
  })
  identityServer.on('error', () => {
    console.error('Could not start Candy Rain ID. Install Go 1.26 or later: https://go.dev/dl/')
    process.exit(1)
  })
}
try {
  run('node', ['node_modules/next/dist/bin/next', 'dev', ...process.argv.slice(2)])
} finally {
  identityServer?.kill()
}
