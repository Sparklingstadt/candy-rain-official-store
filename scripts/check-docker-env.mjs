import "dotenv/config"

const expected = {
  hostname: new Set(["localhost", "127.0.0.1"]),
  port: process.env.POSTGRES_PORT || "5432",
  username: "user",
  password: "pass",
  database: "candyrain",
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Copy .env.example to .env.")
}

const databaseUrl = new URL(process.env.DATABASE_URL)
const actualPort = databaseUrl.port || "5432"
const actualDatabase = databaseUrl.pathname.replace(/^\//, "")

const isDockerDatabase =
  databaseUrl.protocol === "postgresql:" &&
  expected.hostname.has(databaseUrl.hostname) &&
  actualPort === expected.port &&
  databaseUrl.username === expected.username &&
  databaseUrl.password === expected.password &&
  actualDatabase === expected.database

if (!isDockerDatabase) {
  throw new Error(
    "DATABASE_URL does not point to the project Docker database. Update .env from .env.example."
  )
}

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET === "replace-with-a-random-secret") {
  throw new Error("AUTH_SECRET is missing or still uses the example value.")
}

if (!process.env.AUTH_CANDY_RAIN_ID_ISSUER || !process.env.AUTH_CANDY_RAIN_ID_ID || !process.env.AUTH_CANDY_RAIN_ID_SECRET) {
  throw new Error("AUTH_CANDY_RAIN_ID_* is missing. Copy those lines from .env.example to .env.")
}

console.log("Environment is configured for the project Docker database.")
