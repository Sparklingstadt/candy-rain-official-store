// pg currently treats sslmode=prefer/require/verify-ca as verify-full and warns that the next major version
// will switch to the weaker libpq meaning. Spelling out verify-full keeps today's certificate checks and
// silences the warning. A URL that opted into libpq semantics (uselibpqcompat=true) is left as written.
// The query is edited as text so the rest of the URL, including an encoded password, is never re-serialized.
export function withExplicitSslMode(url: string): string {
  if (/[?&]uselibpqcompat=true(?:&|$)/.test(url)) return url
  return url.replace(/([?&]sslmode=)(?:prefer|require|verify-ca)(?=&|$)/, "$1verify-full")
}
