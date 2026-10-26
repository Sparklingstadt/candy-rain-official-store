import assert from "node:assert/strict"
import { test } from "node:test"
import { withExplicitSslMode } from "./databaseUrl"

const base = "postgresql://user:p%40ss@db.example.com:5432/candyrain"

test("sslmode の require・prefer・verify-ca は今の挙動どおり verify-full と明示する", () => {
  for (const mode of ["require", "prefer", "verify-ca"]) {
    assert.equal(withExplicitSslMode(`${base}?sslmode=${mode}`), `${base}?sslmode=verify-full`, mode)
  }
})

test("ほかのパラメーターとパスワードはそのまま残す", () => {
  assert.equal(
    withExplicitSslMode(`${base}?connect_timeout=10&sslmode=require&application_name=web`),
    `${base}?connect_timeout=10&sslmode=verify-full&application_name=web`,
  )
})

test("sslmode がない・disable・verify-full の場合は変えない", () => {
  for (const url of [base, `${base}?sslmode=disable`, `${base}?sslmode=verify-full`, "postgresql://user:pass@localhost:55440/candyrain"]) {
    assert.equal(withExplicitSslMode(url), url)
  }
})

test("libpq 互換を選んでいる場合は変えない", () => {
  const url = `${base}?uselibpqcompat=true&sslmode=require`
  assert.equal(withExplicitSslMode(url), url)
})
