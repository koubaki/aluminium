import { createHash, randomBytes } from 'node:crypto'

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

const db = await open({
  filename: 'tokens.db',
  driver: sqlite3.Database,
})

// Create database

await db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_agent TEXT NOT NULL,
    ip TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    failed BOOLEAN DEFAULT 0,
    rate_limit INTEGER NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME DEFAULT NULL,
    expires_at DATETIME NOT NULL,

    challenge_seed TEXT UNIQUE NOT NULL,
    difficulty INTEGER NOT NULL,
    solved_nonce TEXT DEFAULT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tokens_challenge ON tokens (challenge_seed);
  CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens (user_agent, token, rate_limit, failed, verified_at, expires_at);
  CREATE INDEX IF NOT EXISTS idx_tokens_cleanup ON tokens (failed, expires_at);
  CREATE INDEX IF NOT EXISTS idx_tokens_ip_rate ON tokens (ip, created_at);
`)

setInterval(async () => {
  try {
    const result = await db.run(
      `DELETE FROM tokens WHERE expires_at < CURRENT_TIMESTAMP`
    );
    console.log(`Cleaned up ${result.changes} failed or expired PoW tokens.`);
  } catch (err) {
    console.error(`Failed to run token database cleanup: ${err}`);
  }
}, 15 * 60 * 1000)

const validateToken = async (userAgent: string, token: string) => {
  return await db.get(
    `SELECT * FROM tokens WHERE user_agent = ? AND token = ? AND rate_limit > 0 AND verified_at IS NOT NULL AND expires_at > CURRENT_TIMESTAMP`,
    userAgent, token
  )
}

const decreaseRateLimit = async (token: string) => {
  const result = await db.run(
    `UPDATE tokens SET rate_limit = rate_limit - 1 WHERE token = ? AND rate_limit > 0 AND failed = 0 AND verified_at IS NOT NULL AND expires_at > CURRENT_TIMESTAMP`,
    token
  )
  return (result.changes ?? 0) > 0
}

const createToken = async (userAgent: string, ip: string) => {
  // Get the number of tokens created by this IP in the last 3 days

  const recentTokens = await db.get(
    `SELECT COUNT(*) as count FROM tokens WHERE ip = ? AND created_at > DATETIME('now', '-3 days')`,
    ip
  )

  if (recentTokens && recentTokens.count >= (process.env.CREATION_LIMIT ? Number(process.env.CREATION_LIMIT) : 5)) {
    return false
  }

  const challengeSeed = randomBytes(16).toString('hex')
  const difficulty = process.env.NONCE_DIFFICULTY ? Number(process.env.NONCE_DIFFICULTY) : 5

  const expiresAt = new Date(Date.now() + (process.env.EXPIRATION_MILISECONDS ? Number(process.env.EXPIRATION_MILISECONDS) : 604800000)).toISOString() // Token expires in 1 week

  const token = randomBytes(32).toString('hex')

  await db.run(
    `INSERT INTO tokens (user_agent, ip, token, rate_limit, expires_at, challenge_seed, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    userAgent, ip, token, process.env.RATE_LIMIT ? Number(process.env.RATE_LIMIT) : 30000, expiresAt, challengeSeed, difficulty
  )

  return { challengeSeed, difficulty }
}

const verifyChallenge = async (userAgent: string, challengeSeed: string, nonce: string) => {
  const tokenEntry = await db.get(
    `SELECT * FROM tokens WHERE user_agent = ? AND challenge_seed = ? AND failed = 0 AND verified_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
    userAgent, challengeSeed
  )

  if (!tokenEntry) {
    return null
  }

  const hash = createHash('sha256').update(challengeSeed + nonce).digest('hex')

  if (hash.startsWith('0'.repeat(tokenEntry.difficulty))) {
    await db.run(
      `UPDATE tokens SET verified_at = CURRENT_TIMESTAMP, solved_nonce = ? WHERE id = ?`,
      nonce, tokenEntry.id
    )

    return tokenEntry.token as string
  }

  await db.run(
    `UPDATE tokens SET failed = 1 WHERE id = ?`,
    tokenEntry.id
  )

  return false
}

export { validateToken, decreaseRateLimit, createToken, verifyChallenge }