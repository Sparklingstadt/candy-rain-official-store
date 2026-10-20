import nextEnv from '@next/env'
import { spawnSync } from 'node:child_process'
nextEnv.loadEnvConfig(process.cwd(), true)
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
run('npm', ['run', 'env:check'])
run('npm', ['run', 'db:start'])
run('node', ['node_modules/next/dist/bin/next', 'dev', ...process.argv.slice(2)])
